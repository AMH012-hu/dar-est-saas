import { COOKIE_NAME } from "@shared/const";
import { Buffer } from "node:buffer";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, ownerProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createManualPaymentRequest, listManualPaymentRequestsForUser, listManualPaymentRequestsForOwner, listInvoicesForUser, getCustomerSubscription, getUserSubscription, listSubscriptionsForOwner, cancelSubscriptionForOwner, extendSubscriptionForOwner, approveManualPaymentRequest, rejectManualPaymentRequest, attachPaymentProof, fulfillSubscription, redeemActivationKey, createActivationKeysForOwner, listActivationKeysForOwner, getOwnerStats, listAuditLogsForOwner, recordAuditLog, getAuditFilterPreferences, saveAuditFilterPreferences, createCompanyInvitation, listCompanyInvitations, revokeCompanyInvitation, acceptCompanyInvitation, listCompanyActivity, getCompanyResourceSnapshot, listPropertiesForCompany, createPropertyForCompany, updatePropertyForCompany, deletePropertyForCompany, listClientsForCompany, createClientForCompany, updateClientForCompany, deleteClientForCompany, listTasksForCompany, createTaskForCompany, updateTaskForCompany, deleteTaskForCompany, getLegacyOperationalSnapshot, listPortfolioHierarchyForCompany, createPortfolioForCompany, createBuildingForCompany, createUnitForCompany, updateUnitStatusForCompany, deleteUnitForCompany, listUnifiedPropertyForBuilding, createBuildingFloor, createBuildingRoom, createBuildingAmenity, getLeasingCenterForCompany, createLeaseForCompany, updateLeaseLifecycleForCompany, getLeaseCollectionsForCompany, createLeaseCollectionPeriod, recordLeasePayment, reverseLeasePayment, listTenantsForCompany, createTenantForCompany, updateTenantForCompany, deleteTenantForCompany, listMaintenanceForCompany, createMaintenanceForCompany, updateMaintenanceForCompany, deleteMaintenanceForCompany, listContractsForCompany, createContractForCompany, updateContractForCompany, deleteContractForCompany, listOperationalPaymentsForCompany, createOperationalPaymentForCompany, updateOperationalPaymentForCompany, deleteOperationalPaymentForCompany, listAttendanceForCompany, createAttendanceForCompany, updateAttendanceForCompany, deleteAttendanceForCompany, getFinanceCenterForCompany, createRecurringChargeForCompany, createExpenseForCompany, getOperationsCenterForCompany, createVendorForCompany, createWorkOrderForCompany, updateWorkOrderForCompany, getDocumentsCenterForCompany, createDocumentMetadataForCompany, updateDocumentMetadataForCompany, replaceDocumentFileForCompany, removeDocumentForCompany, getDocumentFileForCompany, getTenantPortalForEmail, listOwnerAdminUsers, setOwnerAdminRole, listSalesCenterForCompany, importSalesBatchForCompany, deleteSalesImportBatchForCompany, updateSalesPropertyForCompany, updateSalesClientForCompany, createSalesContractForCompany, getCompanyNotificationsForUser, markCompanyNotificationsRead } from "./db";
import { hasPermission, requirePermission, requireRole } from "./permissions";
import { storageGetSignedUrl, storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { transcribeAudio } from "./_core/voiceTranscription";
import { assistantIsFollowUpMessage, extractFollowUpIntentViaOllama, generatePropertyAdvisorAnswerViaOllama, mergeFollowUpFilters } from "./ollamaCloud";
import { PLAN_CODES, getPlan } from "../shared/subscriptionPlans";
import { hasActiveSubscription } from "./subscriptionAccess";
import { createPublicPropertyInquiry, listCompanyResourceRevisions, listPublishedSalesProperties, updateSalesPropertyPublicSettingsForCompany } from "./db";
import { addCompanyMember, createCompanyForUser, getCompanyForUser, listCompanyMembers, removeCompanyMember, updateCompanyMemberRole, createLocalUser, getUserByEmail, verifyLocalPassword } from "./db";
import { hasCompanyPermission, requireCompanyPermission, type CompanyRole } from "./companyPermissions";
import { acceptSalesTeamInvitationForUser, createSalesAssignmentForCompany, createSalesCallInventoryForCompany, createSalesDailyTaskForCompany, createSalesMessageForCompany, createSalesTeamInvitationForCompany, getSalesOperationsForCompany, getSalesTeamAccess, listSalesCallInventoryForClient, recordSalesAttendanceForUser, revokeSalesTeamInvitationForCompany, updateSalesDailyTaskForCompany, updateSalesTeamMemberForCompany, listCrmClientsForCompany, getCrmClientForCompany, updateCrmClientForCompany, createCrmActivityForCompany, linkCrmPropertyToClient, getCrmPipelineSummaryForCompany } from "./db";

const assistantLanguageName: Record<"ar" | "en" | "he" | "ru" | "uk", string> = {
  ar: "Arabic",
  en: "English",
  he: "Hebrew",
  ru: "Russian",
  uk: "Ukrainian",
};

type AssistantLanguage = keyof typeof assistantLanguageName;
type AssistantSalesProperty = {
  id: number;
  name: string;
  address: string | null;
  propertyType: string | null;
  status: "available" | "reserved" | "sold" | "inactive";
  areaSqm: number | null;
  listPriceIls: number | null;
  attributesJson: string | null;
};
type AssistantFilters = {
  budget?: number;
  region?: string;
  bedrooms?: number;
  availability?: "available" | "reserved" | "sold" | "inactive";
  minAreaSqm?: number;
  maxAreaSqm?: number;
};
type AssistantPropertyResult = {
  id: number;
  name: string;
  address: string | null;
  propertyType: string | null;
  status: AssistantSalesProperty["status"];
  areaSqm: number | null;
  listPriceIls: number | null;
  bedrooms: number | null;
};

function assistantInventoryCounts(properties: AssistantSalesProperty[]) {
  return properties.reduce((counts, property) => {
    counts[property.status] += 1;
    return counts;
  }, { available: 0, reserved: 0, sold: 0, inactive: 0 });
}

function assistantCountQuestionKind(message: string) {
  const normalized = message.toLowerCase().replace(/\s+/g, " ").trim();
  const asksForCount = /(how many|number of|count|total|كم|عدد|إجمالي|כמה|количеств|скільки|кількість)/i.test(normalized);
  if (!asksForCount) return null;
  if (/(property|properties|unit|units|listing|listings|inventory|عقار|عقارات|وحدة|وحدات|مخزون|נכס|נכסים|דירה|דירות|объект|объектов|недвиж|нерух|об['’]єкт)/i.test(normalized)) return "properties" as const;
  if (/(client|clients|lead|leads|customer|customers|عميل|عملاء|زبون|زبائن|לקוח|לקוחות|клиент|клієнт)/i.test(normalized)) return "clients" as const;
  return null;
}

function assistantOperationalAnswer(input: { language: AssistantLanguage; message: string; properties: AssistantSalesProperty[]; clientCount: number }) {
  const kind = assistantCountQuestionKind(input.message);
  if (!kind) return null;
  if (kind === "clients") {
    if (input.language === "ar") return `يوجد ${input.clientCount} عملاء مسجلين داخل بيانات شركتك المصرح بها. أحافظ على خصوصيتهم ولا أعرض بيانات الاتصال أو الهوية هنا.`;
    return `Your authorized company data contains ${input.clientCount} clients. To protect privacy, I do not expose their contact or identity details here.`;
  }
  const counts = assistantInventoryCounts(input.properties);
  if (input.language === "ar") return `لديك ${input.properties.length} عقاراً مسجلاً في مخزون شركتك المصرح به: ${counts.available} متاح، ${counts.reserved} محجوز، ${counts.sold} مباع، و${counts.inactive} غير نشط. يمكنني الآن ترشيح الوحدات المتاحة وفق الميزانية والمنطقة وعدد الغرف.`;
  if (input.language === "he") return `במלאי המורשה של החברה יש ${input.properties.length} נכסים: ${counts.available} זמינים, ${counts.reserved} שמורים, ${counts.sold} נמכרו ו-${counts.inactive} אינם פעילים.`;
  if (input.language === "ru") return `В подтверждённом инвентаре компании ${input.properties.length} объектов: ${counts.available} доступно, ${counts.reserved} зарезервировано, ${counts.sold} продано и ${counts.inactive} неактивно.`;
  if (input.language === "uk") return `У підтвердженому переліку компанії ${input.properties.length} об’єктів: ${counts.available} доступно, ${counts.reserved} зарезервовано, ${counts.sold} продано та ${counts.inactive} неактивно.`;
  return `Your authorized company inventory contains ${input.properties.length} properties: ${counts.available} available, ${counts.reserved} reserved, ${counts.sold} sold, and ${counts.inactive} inactive. I can now narrow available options by budget, area, and bedrooms.`;
}

function assistantPropertyAttributes(raw: string | null) {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      .slice(0, 40)
      .map(([key, value]) => [String(key).trim().slice(0, 80), typeof value === "string" ? value.trim().slice(0, 180) : value]));
  } catch {
    return {};
  }
}

function assistantKey(key: string) {
  return key.trim().toLocaleLowerCase().replace(/[\s_./-]+/g, " ").replace(/\s+/g, " ");
}

function assistantNumericValue(value: unknown) {
  const normalized = String(value ?? "").replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[,٬]/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  const number = match ? Number(match[0]) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function assistantAttributeNumber(property: AssistantSalesProperty, aliases: RegExp[]) {
  const entry = Object.entries(assistantPropertyAttributes(property.attributesJson)).find(([key, value]) => aliases.some(alias => alias.test(assistantKey(key))) && assistantNumericValue(value) !== null);
  return entry ? assistantNumericValue(entry[1]) : null;
}

function assistantBedroomCount(property: AssistantSalesProperty) {
  return assistantAttributeNumber(property, [/\bbed ?rooms?\b/i, /\brooms?\b/i, /\bnum(?:ber)? of rooms?\b/i, /غرف|غرفة/i, /חדרים?|спал(?:ен|ьн)|кімнат/i]);
}

function assistantAreaSqm(property: AssistantSalesProperty) {
  return property.areaSqm != null && property.areaSqm > 0
    ? property.areaSqm
    : assistantAttributeNumber(property, [/\btotal area\b/i, /\bliving area\b/i, /\bunit area\b/i, /\barea\b/i, /\bsqm\b/i, /\bsquare meters?\b/i, /مساح|متر ?مربع/i, /שטח|מ״ר|מטרים רבועים/i, /площад|м²|кв ?м/i]);
}

function assistantListPriceIls(property: AssistantSalesProperty) {
  return property.listPriceIls != null && property.listPriceIls > 0
    ? property.listPriceIls
    : assistantAttributeNumber(property, [/\blist price\b/i, /\basking price\b/i, /\bsale price\b/i, /\bprice\b/i, /سعر|ثمن/i, /מחיר/i, /цен|вартість/i]);
}

function assistantPropertySearchText(property: AssistantSalesProperty) {
  return [property.name, property.address, property.propertyType, JSON.stringify(assistantPropertyAttributes(property.attributesJson))].filter(Boolean).join(" ").toLocaleLowerCase();
}

function assistantNormalizeDigits(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit))).replace(/[٬,]/g, "");
}

function assistantBudgetFromMessage(message: string) {
  const normalized = assistantNormalizeDigits(message.toLocaleLowerCase());
  const million = normalized.match(/(?:حتى|تحت|اقل\s*من|بحد\s*اقصى|ميزاني(?:ة|تك)|up\s*to|under|below|budget)\s*(?:ال\s*)?(\d+(?:\.\d+)?)\s*(?:مليون|ملايين|million|mn|m\b)/i);
  if (million) {
    const value = Number(million[1]) * 1_000_000;
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
  }
  const egp = normalized.match(/(?:حتى|تحت|اقل\s*من|بحد\s*اقصى|ميزاني(?:ة|تك)|up\s*to|under|below|budget)\s*(?:ال\s*)?(\d{4,10})\s*(?:EGP|جنيه(?:\s*مصري)?|ج\.م)/i);
  if (!egp) return undefined;
  const value = Number(egp[1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function assistantBedroomsFromMessage(message: string) {
  const normalized = assistantNormalizeDigits(message.toLocaleLowerCase());
  if (/(غرفتين|غرفتان|غرفتي|two\s+bedrooms?|2\s*(?:bedrooms?|rooms?)|2\s*غرف|חדריים|две\s+комнат|2\s*кімнат)/i.test(normalized)) return 2;
  if (/(ثلاث غرف|ثلاثة غرف|غرف ثلاث|three\s+bedrooms?|3\s*(?:bedrooms?|rooms?)|3\s*غرف|שלושה\s+חדרים|три\s+комнат|3\s*кімнат)/i.test(normalized)) return 3;
  if (/(أربع غرف|اربعة غرف|أربعة غرف|four\s+bedrooms?|4\s*(?:bedrooms?|rooms?)|4\s*غرف|ארבעה\s+חדרים|четыре\s+комнат|4\s*кімнат)/i.test(normalized)) return 4;
  const numeric = normalized.match(/(?:^|\s)([0-9]{1,2})\s*(?:غرف(?:ة|تين|تان)?|rooms?|bedrooms?|חדרים?|комнат|кімнат)/i);
  return numeric ? Number(numeric[1]) : undefined;
}

function assistantFiltersFromMessage(message: string): Pick<AssistantFilters, "availability" | "budget" | "bedrooms" | "minAreaSqm" | "maxAreaSqm"> {
  const normalized = assistantNormalizeDigits(message);
  const bedrooms = assistantBedroomsFromMessage(normalized);
  const wantsAvailable = /(available|vacant|open|متاح|متاحة|موجود|موجودة|شاغر|شاغرة)/i.test(normalized);
  const mentionsArea = /(area|sq\.?\s*m|sqm|square\s*meter|مساح|مساخ|متر\s*(مربع|م²)?)/i.test(normalized);
  const range = normalized.match(/(?:من|بين|from|between)\s*(\d{2,6})\s*(?:متر\s*(?:مربع|م²)?\s*)?(?:إلى|الى|ل|to|and|و|-)\s*(\d{2,6})\s*(?:متر\s*(?:مربع|م²)?)?/i);
  const budget = assistantBudgetFromMessage(normalized);
  const base = {
    ...(wantsAvailable ? { availability: "available" as const } : {}),
    ...(budget !== undefined ? { budget } : {}),
    ...(bedrooms !== undefined && bedrooms >= 0 && bedrooms <= 50 ? { bedrooms } : {}),
  };
  if (!range || !mentionsArea) return base;
  const first = Number(range[1]);
  const second = Number(range[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return base;
  return {
    ...base,
    minAreaSqm: Math.min(first, second),
    maxAreaSqm: Math.max(first, second),
  };
}

function effectiveAssistantFilters(filters: AssistantFilters, message: string): AssistantFilters {
  const inferred = assistantFiltersFromMessage(message);
  const budget = filters.budget ?? inferred.budget;
  const minAreaSqm = filters.minAreaSqm ?? inferred.minAreaSqm;
  const maxAreaSqm = filters.maxAreaSqm ?? inferred.maxAreaSqm;
  const bedrooms = filters.bedrooms ?? inferred.bedrooms;
  return {
    ...filters,
    ...(budget !== undefined ? { budget } : {}),
    availability: filters.availability ?? inferred.availability,
    ...(minAreaSqm !== undefined ? { minAreaSqm } : {}),
    ...(maxAreaSqm !== undefined ? { maxAreaSqm } : {}),
    ...(bedrooms !== undefined ? { bedrooms } : {}),
  };
}

function assistantPropertyResults(properties: AssistantSalesProperty[]): AssistantPropertyResult[] {
  return properties
    .slice()
    .sort((first, second) => {
      const availabilityOrder = Number(first.status !== "available") - Number(second.status !== "available");
      if (availabilityOrder) return availabilityOrder;
      const priceOrder = (first.listPriceIls ?? Number.MAX_SAFE_INTEGER) - (second.listPriceIls ?? Number.MAX_SAFE_INTEGER);
      if (priceOrder) return priceOrder;
      return first.name.localeCompare(second.name);
    })
    .slice(0, 3)
    .map(property => ({
      id: property.id,
      name: property.name,
      address: property.address,
      propertyType: property.propertyType,
      status: property.status,
      areaSqm: assistantAreaSqm(property),
      listPriceIls: assistantListPriceIls(property),
      bedrooms: assistantBedroomCount(property),
    }));
}

function assistantMarketingIntent(message: string) {
  return /(marketing|market|ad copy|listing description|promotional|sell|advertise|تسويق|تسويقية|تسويقي|اعلان|إعلان|وصف تسويقي|رسالة تسويقية|بيع)/i.test(message);
}
function assistantMarketingAnswer(language: AssistantLanguage, property: AssistantSalesProperty | null) {
  if (!property) {
    if (language === "ar") return "لا توجد حالياً وحدة متاحة مؤكدة في مخزون شركتك لإنشاء رسالة تسويقية. راجع حالة الوحدات أو أضف بيانات الوحدة أولاً.";
    if (language === "he") return "אין כרגע יחידה זמינה ומאומתת במלאי החברה ליצירת הודעה שיווקית. בדקו את סטטוס היחידות או הוסיפו נתוני יחידה.";
    if (language === "ru") return "В подтверждённом инвентаре компании сейчас нет доступного объекта для маркетингового текста. Проверьте статус или добавьте данные объекта.";
    if (language === "uk") return "У підтвердженому інвентарі компанії зараз немає доступного об’єкта для маркетингового тексту. Перевірте статус або додайте дані об’єкта.";
    return "There is no verified available unit in your company inventory for a marketing message right now. Check unit status or add the unit data first.";
  }
  const result = assistantPropertyResults([property])[0];
  const details = [result.areaSqm !== null ? `${result.areaSqm.toLocaleString()} m²` : null, result.bedrooms !== null ? `${result.bedrooms} rooms` : null, result.listPriceIls !== null ? `EGP${result.listPriceIls.toLocaleString()}` : null].filter(Boolean).join(" · ");
  if (language === "ar") return `رسالة تسويقية جاهزة:\n${result.name} — وحدة متاحة في ${result.address || "موقع مسجل لدى الشركة"}. ${details ? `تتميز بـ ${details}. ` : ""}للتفاصيل والحجز، تواصل مع فريق المبيعات. البيانات المذكورة مأخوذة من سجل الشركة فقط.`;
  if (language === "he") return `הודעה שיווקית מוכנה:\n${result.name} — יחידה זמינה ב${result.address || "מיקום הרשום בחברה"}. ${details ? `כוללת ${details}. ` : ""}לפרטים ולתיאום, פנו לצוות המכירות. הנתונים מבוססים רק על רשומת החברה.`;
  if (language === "ru") return `Готовый маркетинговый текст:\n${result.name} — доступный объект по адресу ${result.address || "из записи компании"}. ${details ? `Параметры: ${details}. ` : ""}За подробностями и бронированием обратитесь в отдел продаж. Указаны только данные компании.`;
  if (language === "uk") return `Готовий маркетинговий текст:\n${result.name} — доступний об’єкт за адресою ${result.address || "із запису компанії"}. ${details ? `Параметри: ${details}. ` : ""}Для деталей і бронювання зверніться до відділу продажів. Вказано лише дані компанії.`;
  return `Ready-to-use marketing copy:\n${result.name} — an available unit at ${result.address || "the location recorded by your company"}. ${details ? `Key details: ${details}. ` : ""}Contact the sales team for availability and booking. All stated facts come from your company record.`;
}
function assistantSearchIntent(message: string) {
  return /(recommend|recommendation|best|find|show|match|option|property|properties|unit|units|listing|عقار|عقارات|وحدة|وحدات|رشح|ترشيح|افضل|أفضل|مناسب|مناسبة|ابحث|اعرض|أعرض|موجود|متاح|مساح|مساخ|غرف|سعر|ميزاني)/i.test(message);
}

function assistantCriteriaSummary(filters: AssistantFilters, language: AssistantLanguage) {
  const labels = language === "ar"
    ? { budget: "حتى", bedrooms: "غرف", area: "م²" }
    : language === "he"
      ? { budget: "עד", bedrooms: "חדרים", area: "מ״ר" }
      : language === "ru"
        ? { budget: "до", bedrooms: "комнат", area: "м²" }
        : language === "uk"
          ? { budget: "до", bedrooms: "кімнат", area: "м²" }
          : { budget: "up to", bedrooms: "rooms", area: "m²" };
  return [
    filters.budget !== undefined ? `${labels.budget} ${filters.budget.toLocaleString()} EGP` : null,
    filters.region ? filters.region : null,
    filters.bedrooms !== undefined ? `${filters.bedrooms} ${labels.bedrooms}` : null,
    filters.minAreaSqm !== undefined || filters.maxAreaSqm !== undefined ? `${filters.minAreaSqm ?? 0}–${filters.maxAreaSqm ?? "∞"} ${labels.area}` : null,
  ].filter(Boolean).join(" • ");
}

function assistantHasSpecificCriteria(filters: AssistantFilters) {
  return filters.budget !== undefined || Boolean(filters.region?.trim()) || filters.bedrooms !== undefined || filters.minAreaSqm !== undefined || filters.maxAreaSqm !== undefined;
}

function assistantPropertyLine(match: AssistantPropertyResult, index: number, language: AssistantLanguage) {
  const details = [
    match.listPriceIls !== null ? `EGP${match.listPriceIls.toLocaleString()}` : null,
    match.areaSqm !== null ? `${match.areaSqm} m²` : null,
    match.bedrooms !== null ? `${match.bedrooms} rooms` : null,
    match.status !== "available" ? match.status : null,
  ].filter(Boolean).join(" · ");
  const address = match.address ? ` — ${match.address}` : "";
  const prefix = language === "ar" ? `${index + 1}) الوحدة` : `${index + 1}) Unit`;
  return `${prefix} ${match.name}${address}${details ? ` | ${details}` : ""}`;
}

function assistantClarificationAnswer(language: AssistantLanguage) {
  if (language === "ar") return "أستطيع ترشيح وحدات حقيقية من مخزون شركتك، لكن لا أريد افتراض مدينة أو ميزانية من عندي. أرسل أي معيار متوفر لديك: الميزانية القصوى بالجنيه المصري، المنطقة أو اسم المشروع، عدد الغرف، أو نطاق المساحة. إذا لم تسجل قاعدة البيانات أحد هذه الحقول فسأذكر ذلك صراحة ولن أخمّن.";
  if (language === "he") return "אני יכול להמליץ רק על יחידות אמיתיות ממלאי החברה, בלי להניח עיר או תקציב. ציינו כל פרט זמין: תקציב מרבי, אזור או פרויקט, מספר חדרים או טווח שטח. נתון שאינו רשום יסומן במפורש ולא ינוחש.";
  if (language === "ru") return "Я могу рекомендовать только реальные объекты из инвентаря компании и не буду придумывать город или бюджет. Укажите доступный критерий: максимальный бюджет, район или проект, число комнат или диапазон площади. Отсутствующие данные будут отмечены, а не угаданы.";
  if (language === "uk") return "Я можу рекомендувати лише реальні об’єкти з інвентарю компанії й не вигадуватиму місто чи бюджет. Вкажіть доступний критерій: максимальний бюджет, район або проєкт, кількість кімнат чи діапазон площі. Відсутні дані буде позначено, а не вгадано.";
  return "I can recommend only real units from your company inventory, without assuming a city or budget. Share any available criterion: maximum EGP budget, area or project, bedroom count, or an area range. Missing fields will be stated clearly rather than guessed.";
}

function assistantRepeatedRequestAnswer(language: AssistantLanguage) {
  if (language === "ar") return "أجبت عن هذا الطلب قبل قليل. إذا أردت نتيجة أدق، أرسل الميزانية والمنطقة وعدد الغرف أو المساحة المطلوبة وسأعيد الترشيح وفق هذه المعايير.";
  if (language === "he") return "כבר עניתי על הבקשה הזו. לקבלת תוצאה מדויקת יותר, הוסיפו תקציב, אזור ומספר חדרים או שטח רצוי.";
  if (language === "ru") return "На этот запрос уже был дан ответ. Для более точного подбора укажите бюджет, район и количество комнат или площадь.";
  if (language === "uk") return "На цей запит уже була відповідь. Для точнішого підбору вкажіть бюджет, район і кількість кімнат або площу.";
  return "I already answered this request. For a more precise match, add your budget, preferred area, and bedroom count or desired area.";
}

function assistantMatchSummary(language: AssistantLanguage, count: number, filters: AssistantFilters, matches: AssistantPropertyResult[] = []) {
  const criteria = assistantCriteriaSummary(filters, language);
  const ranked = matches.slice(0, 3).map((match, index) => assistantPropertyLine(match, index, language)).join("; ");
  if (language === "ar") return `وجدت ${count} وحدة مطابقة${criteria ? ` وفق ${criteria}` : ""}. هذه أفضل 3 ترشيحات مرتبة من البيانات المسجلة: ${ranked || "لا توجد بيانات كافية لعرض وحدات محددة"}. افتح البطاقة لمراجعة التفاصيل، وسأوضح لك أي معلومة غير مسجلة بدلاً من تخمينها.`;
  if (language === "he") return `נמצאו ${count} יחידות תואמות${criteria ? ` לפי ${criteria}` : ""}. אלו עד 3 ההמלצות המובילות לפי הנתונים הרשומים: ${ranked || "אין מספיק נתונים להצגת יחידות ספציפיות"}. פתחו כרטיס לפרטים; נתון חסר יסומן ולא ינוחש.`;
  return `I found ${count} matching units${criteria ? ` for ${criteria}` : ""}. These are the top three recommendations from recorded data: ${ranked || "there is not enough data to name specific units"}. Open a card for details; missing facts are marked rather than guessed.`;
}

function filterAssistantProperties(properties: AssistantSalesProperty[], filters: AssistantFilters) {
  const normalizedRegion = filters.region?.trim().toLocaleLowerCase();
  return properties.filter(property => {
    const areaSqm = assistantAreaSqm(property);
    const listPriceIls = assistantListPriceIls(property);
    if (filters.budget !== undefined && (listPriceIls === null || listPriceIls > filters.budget)) return false;
    if (normalizedRegion && !assistantPropertySearchText(property).includes(normalizedRegion)) return false;
    if (filters.bedrooms !== undefined && assistantBedroomCount(property) !== filters.bedrooms) return false;
    if (filters.availability && property.status !== filters.availability) return false;
    if (filters.minAreaSqm !== undefined && (areaSqm === null || areaSqm < filters.minAreaSqm)) return false;
    if (filters.maxAreaSqm !== undefined && (areaSqm === null || areaSqm > filters.maxAreaSqm)) return false;
    return true;
  });
}

function assistantPropertiesFromPreviousResults(properties: AssistantSalesProperty[], resultIds: number[]) {
  const ids = new Set(resultIds);
  return properties.filter(property => ids.has(property.id));
}

function assistantAreaComparisonAnswer(language: AssistantLanguage, previousResults: AssistantSalesProperty[]) {
  const knownAreas = previousResults.flatMap(property => { const area = assistantAreaSqm(property); return area === null ? [] : [area]; });
  if (knownAreas.length !== previousResults.length || knownAreas.length === 0) {
    return language === "ar"
      ? "لا يمكن تأكيد مقارنة المساحات لأن مساحة واحدة أو أكثر غير مسجلة في النتائج السابقة."
      : "I cannot confirm an area comparison because one or more previous results have no recorded area.";
  }
  const minimum = Math.min(...knownAreas);
  const maximum = Math.max(...knownAreas);
  if (minimum === maximum) {
    return language === "ar"
      ? `نعم. النتائج السابقة لها المساحة المسجلة نفسها: ${minimum.toLocaleString()} م².`
      : `Yes. The previous results have the same recorded area: ${minimum.toLocaleString()} sqm.`;
  }
  return language === "ar"
    ? `ليست المساحة متطابقة تماماً؛ النتائج السابقة تتراوح مساحاتها المسجلة بين ${minimum.toLocaleString()} و${maximum.toLocaleString()} م².`
    : `Their recorded areas are not identical; the previous results range from ${minimum.toLocaleString()} to ${maximum.toLocaleString()} sqm.`;
}

function assistantPreviousResultsAnswer(language: AssistantLanguage, count: number) {
  return language === "ar"
    ? `أعيد عرض ${count} نتائج السابقة نفسها. يمكنك الآن طلب تضييق واضح مثل الميزانية أو عدد الغرف أو نطاق المساحة.`
    : `I am showing the same ${count} previous results. You can now narrow them by budget, bedrooms, or an area range.`;
}

function assistantFallbackAnswer(language: AssistantLanguage, properties: AssistantSalesProperty[], matchingCount: number) {
  const counts = assistantInventoryCounts(properties);
  if (language === "ar") return `بناءً على مخزون شركتك المصرح به، يوجد ${properties.length} عقاراً، منها ${counts.available} متاح. أستطيع تضييق الترشيح فوراً إذا حدّدت الميزانية والمنطقة وعدد الغرف، أو أعيد صياغة وصف تسويقي للوحدات المتاحة.`;
  return `Your authorized company inventory has ${properties.length} properties, including ${counts.available} available units. I can narrow the ${matchingCount} current matches by budget, region, and bedrooms, or prepare a concise marketing description for an available unit.`;
}

function assistantNoMatchAnswer(language: AssistantLanguage, filters: AssistantFilters) {
  const criteria = [
    filters.availability === "available" ? "متاحة" : null,
    filters.minAreaSqm !== undefined || filters.maxAreaSqm !== undefined ? `${filters.minAreaSqm ?? 0}–${filters.maxAreaSqm ?? "∞"} م²` : null,
    filters.budget !== undefined ? `حتى ${filters.budget.toLocaleString()} EGP` : null,
    filters.region ? `في ${filters.region}` : null,
    filters.bedrooms !== undefined ? `${filters.bedrooms} غرف` : null,
  ].filter(Boolean).join(" • ");
  if (language === "ar") {
    const nextStep = filters.budget !== undefined ? "ارفع الحد الأقصى للسعر فقط إذا أردت توسيع النتيجة." : filters.minAreaSqm !== undefined || filters.maxAreaSqm !== undefined ? "وسّع نطاق المساحة فقط إذا أردت بدائل أكثر." : "أضف معياراً واحداً فقط لأبدأ مطابقة دقيقة.";
    return `النتيجة: 0 وحدة مؤكدة مطابقة لـ ${criteria || "المعايير المطلوبة"} داخل مخزون شركتك. ${nextStep}`;
  }
  return `Result: 0 verified units match ${criteria || "the requested criteria"} in your company inventory. Adjust one criterion and I will recheck the records.`;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  notifications: router({
    inbox: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { items: [], unreadCount: 0 };
      requireCompanyPermission(membership.member.role, "workspace.read");
      return getCompanyNotificationsForUser({ companyId: membership.company.id, userId: ctx.user.id });
    }),
    markRead: protectedProcedure
      .input(z.object({ notificationKeys: z.array(z.string().trim().min(1).max(160)).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "workspace.read");
        return markCompanyNotificationsRead({ companyId: membership.company.id, userId: ctx.user.id, notificationKeys: input.notificationKeys });
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "workspace.read");
      return markCompanyNotificationsRead({ companyId: membership.company.id, userId: ctx.user.id, markAll: true });
    }),
  }),
  portfolio: router({
    hierarchy: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { portfolios: [], buildings: [], units: [] };
      requireCompanyPermission(membership.member.role, "portfolio.read");
      return listPortfolioHierarchyForCompany(membership.company.id);
    }),
    createPortfolio: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(180), description: z.string().trim().max(4000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return createPortfolioForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    createBuilding: protectedProcedure
      .input(z.object({ portfolioId: z.number().int().positive(), propertyId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(2).max(180), address: z.string().trim().max(255).optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return createBuildingForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    createUnit: protectedProcedure
      .input(z.object({ buildingId: z.number().int().positive(), label: z.string().trim().min(1).max(80), floor: z.string().trim().max(40).optional(), bedrooms: z.number().int().min(0).max(50).optional(), areaSqm: z.number().int().min(0).nullable().optional(), status: z.enum(["vacant", "occupied", "reserved", "maintenance"]).optional(), askingRentIls: z.number().int().min(0).max(100000000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return createUnitForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    updateUnitStatus: protectedProcedure
      .input(z.object({ unitId: z.number().int().positive(), status: z.enum(["vacant", "occupied", "reserved", "maintenance"]), askingRentIls: z.number().int().min(0).max(100000000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return updateUnitStatusForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    deleteUnit: protectedProcedure
      .input(z.object({ unitId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return deleteUnitForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    unifiedProperty: protectedProcedure
      .input(z.object({ buildingId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.read");
        return listUnifiedPropertyForBuilding(membership.company.id, input.buildingId);
      }),
    createFloor: protectedProcedure
      .input(z.object({ buildingId: z.number().int().positive(), label: z.string().trim().min(1).max(80), floorNumber: z.number().int().min(-20).max(500).nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return createBuildingFloor({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    createRoom: protectedProcedure
      .input(z.object({ buildingId: z.number().int().positive(), floorId: z.number().int().positive().nullable().optional(), label: z.string().trim().min(1).max(120), roomType: z.enum(["common", "storage", "parking", "amenity", "office", "retail", "other"]).optional(), areaSqm: z.number().int().min(0).max(1000000).nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return createBuildingRoom({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    createAmenity: protectedProcedure
      .input(z.object({ buildingId: z.number().int().positive(), name: z.string().trim().min(1).max(120), category: z.enum(["security", "utilities", "recreation", "accessibility", "services", "other"]).optional(), status: z.enum(["active", "maintenance", "inactive"]).optional(), notes: z.string().trim().max(4000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "portfolio.write");
        return createBuildingAmenity({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    leasingCenter: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { leases: [], summary: { totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, expiringSoon: 0, monthlyCommittedIls: 0 } };
      requireCompanyPermission(membership.member.role, "leasing.read");
      return getLeasingCenterForCompany(membership.company.id);
    }),
    activateLease: protectedProcedure
      .input(z.object({ unitId: z.number().int().positive(), tenantId: z.number().int().positive(), reference: z.string().trim().min(2).max(80), startAt: z.coerce.date(), endAt: z.coerce.date(), monthlyRentIls: z.number().int().positive().max(100000000), securityDepositIls: z.number().int().min(0).max(100000000).optional(), paymentDueDay: z.number().int().min(1).max(28).optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "leasing.write");
        return createLeaseForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    updateLeaseLifecycle: protectedProcedure
      .input(z.object({ leaseId: z.number().int().positive(), renewalDecision: z.enum(["not_requested", "offered", "accepted", "declined"]).optional(), moveInStatus: z.enum(["pending", "ready", "completed"]).optional(), moveOutStatus: z.enum(["not_started", "scheduled", "completed"]).optional(), depositReturnedIls: z.number().int().min(0).max(100000000).optional(), handoverNotes: z.string().max(4000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "leasing.write");
        return updateLeaseLifecycleForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    collections: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { collections: [], summary: { totalDueIls: 0, totalReceivedIls: 0, outstandingIls: 0, arrearsRiskIls: 0, overdueCount: 0 } };
      requireCompanyPermission(membership.member.role, "collections.read");
      return getLeaseCollectionsForCompany(membership.company.id, ctx.user.id);
    }),
    createCollectionPeriod: protectedProcedure
      .input(z.object({ leaseId: z.number().int().positive(), periodLabel: z.string().trim().min(1).max(80), dueAt: z.coerce.date(), amountDueIls: z.number().int().positive().max(100000000), notes: z.string().max(4000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "collections.write");
        return createLeaseCollectionPeriod({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    recordPayment: protectedProcedure
      .input(z.object({ collectionId: z.number().int().positive(), amountIls: z.number().int().positive().max(100000000), paymentMethod: z.enum(["cash", "bank", "card", "transfer", "other"]), receivedAt: z.coerce.date().optional(), notes: z.string().max(4000).nullable().optional(), idempotencyKey: z.string().uuid().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "collections.write");
        return recordLeasePayment({ companyId: membership.company.id, userId: ctx.user.id, requestId: ctx.requestId, ...input });
      }),
    reversePayment: protectedProcedure
      .input(z.object({ paymentEventId: z.number().int().positive(), reason: z.string().trim().min(3).max(1000), idempotencyKey: z.string().uuid(), reversedAt: z.coerce.date().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "collections.write");
        return reverseLeasePayment({ companyId: membership.company.id, userId: ctx.user.id, requestId: ctx.requestId, ...input });
      }),
  }),

  publicProperties: router({
    list: publicProcedure.query(() => listPublishedSalesProperties()),
    submitInquiry: publicProcedure
      .input(z.object({ salesPropertyId: z.number().int().positive(), name: z.string().trim().min(2).max(180), phone: z.string().trim().min(5).max(48), email: z.string().trim().email().max(320).optional().or(z.literal("")), message: z.string().trim().min(5).max(4000) }))
      .mutation(({ input }) => createPublicPropertyInquiry({ ...input, email: input.email || null })),
  }),

  sales: router({
    center: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create or join a company before opening the sales center." });
      requireCompanyPermission(membership.member.role, "workspace.read");
      return listSalesCenterForCompany(membership.company.id, ctx.user.id);
    }),
    importBatch: protectedProcedure
      .input(z.object({
        kind: z.enum(["properties", "clients"]),
        fileName: z.string().trim().min(1).max(220),
        contentType: z.string().trim().max(160).optional(),
        base64Content: z.string().min(4).max(12_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "workspace.write");
        const salesAccess = await getSalesTeamAccess(membership.company.id, ctx.user.id);
        if (!salesAccess.canManage) throw new TRPCError({ code: "FORBIDDEN", message: "SALES_MANAGE_REQUIRED" });
        return importSalesBatchForCompany({
          companyId: membership.company.id,
          userId: ctx.user.id,
          ...input,
          contentType: input.contentType || "application/octet-stream",
        });
      }),
    deleteImportBatch: protectedProcedure
      .input(z.object({ batchId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "workspace.write");
        const salesAccess = await getSalesTeamAccess(membership.company.id, ctx.user.id);
        if (!salesAccess.canManage) throw new TRPCError({ code: "FORBIDDEN", message: "SALES_MANAGE_REQUIRED" });
        return deleteSalesImportBatchForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    updateProperty: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(220), address: z.string().trim().max(500).nullable().optional(), ownerName: z.string().trim().max(220).nullable().optional(), propertyType: z.string().trim().max(120).nullable().optional(), status: z.enum(["available", "reserved", "sold", "inactive"]), areaSqm: z.number().int().min(0).max(10_000_000).nullable().optional(), listPriceIls: z.number().int().min(0).max(1_000_000_000).nullable().optional(), attributesJson: z.string().max(100_000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "workspace.write");
        const salesAccess = await getSalesTeamAccess(membership.company.id, ctx.user.id);
        if (!salesAccess.canManage) throw new TRPCError({ code: "FORBIDDEN", message: "SALES_MANAGE_REQUIRED" });
        return updateSalesPropertyForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    updatePublicProperty: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isPublished: z.boolean(), publicDescription: z.string().trim().max(12_000).nullable().optional(), publicImagesJson: z.string().max(20_000).nullable().optional(), paymentPlanJson: z.string().max(12_000).nullable().optional(), publicVideoUrl: z.string().url().max(2_000).nullable().optional(), publicTourUrl: z.string().url().max(2_000).nullable().optional(), publicFloorPlanUrl: z.string().url().max(2_000).nullable().optional(), publicLatitude: z.string().regex(/^-?\d{1,3}(?:\.\d+)?$/).max(32).nullable().optional(), publicLongitude: z.string().regex(/^-?\d{1,3}(?:\.\d+)?$/).max(32).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "workspace.write");
        const salesAccess = await getSalesTeamAccess(membership.company.id, ctx.user.id);
        if (!salesAccess.canManage) throw new TRPCError({ code: "FORBIDDEN", message: "SALES_MANAGE_REQUIRED" });
        return updateSalesPropertyPublicSettingsForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    updateClient: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(220), email: z.string().email().nullable().optional(), phone: z.string().trim().max(80).nullable().optional(), identityNumber: z.string().trim().max(100).nullable().optional(), attributesJson: z.string().max(100_000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "workspace.write");
        const salesAccess = await getSalesTeamAccess(membership.company.id, ctx.user.id);
        if (!salesAccess.canManage) throw new TRPCError({ code: "FORBIDDEN", message: "SALES_MANAGE_REQUIRED" });
        return updateSalesClientForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    crmClients: protectedProcedure.input(z.object({ search: z.string().trim().max(220).optional(), stage: z.enum(["new", "contacted", "qualified", "viewing", "negotiation", "won", "lost"]).optional(), assignedSalesTeamMemberId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return listCrmClientsForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    crmClient: protectedProcedure.input(z.object({ salesClientId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return getCrmClientForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    crmPipelineSummary: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return getCrmPipelineSummaryForCompany({ companyId: membership.company.id, userId: ctx.user.id });
    }),
    updateCrmClient: protectedProcedure.input(z.object({
      salesClientId: z.number().int().positive(),
      name: z.string().trim().min(1).max(220).optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().trim().max(80).nullable().optional(),
      leadSource: z.string().trim().max(100).nullable().optional(),
      pipelineStage: z.enum(["new", "contacted", "qualified", "viewing", "negotiation", "won", "lost"]).optional(),
      budgetMinIls: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
      budgetMaxIls: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
      preferredPropertyType: z.string().trim().max(120).nullable().optional(),
      preferredLocation: z.string().trim().max(180).nullable().optional(),
      nextFollowUpAt: z.coerce.date().nullable().optional(),
      lostReason: z.string().trim().max(4000).nullable().optional(),
      assignedSalesTeamMemberId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return updateCrmClientForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createCrmActivity: protectedProcedure.input(z.object({
      salesClientId: z.number().int().positive(),
      type: z.enum(["call", "whatsapp", "meeting", "viewing", "email", "note", "other"]),
      subject: z.string().trim().min(1).max(180),
      outcome: z.string().trim().max(4000).nullable().optional(),
      scheduledAt: z.coerce.date().nullable().optional(),
      completedAt: z.coerce.date().nullable().optional(),
      notes: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return createCrmActivityForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    linkCrmProperty: protectedProcedure.input(z.object({
      salesClientId: z.number().int().positive(),
      salesPropertyId: z.number().int().positive(),
      interestLevel: z.enum(["low", "medium", "high"]),
      notes: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return linkCrmPropertyToClient({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createContract: protectedProcedure
      .input(z.object({ salesPropertyId: z.number().int().positive(), salesClientId: z.number().int().positive(), contractNumber: z.string().trim().min(1).max(80), status: z.enum(["draft", "active", "completed", "cancelled"]).optional(), listPriceIls: z.number().int().positive().max(1_000_000_000), discountKind: z.enum(["none", "fixed", "percentage"]), discountValue: z.number().int().min(0).max(1_000_000_000), depositIls: z.number().int().min(0).max(1_000_000_000), paymentFrequency: z.enum(["quarterly", "semiannual", "annual"]), termYears: z.number().int().min(1).max(5), firstInstallmentAt: z.coerce.date().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
        requireCompanyPermission(membership.member.role, "workspace.write");
        const salesAccess = await getSalesTeamAccess(membership.company.id, ctx.user.id);
        if (!salesAccess.canManage) throw new TRPCError({ code: "FORBIDDEN", message: "SALES_MANAGE_REQUIRED" });
        return createSalesContractForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
      }),
    operations: protectedProcedure.input(z.object({ taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })).query(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return getSalesOperationsForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createCallInventory: protectedProcedure.input(z.object({
      salesClientId: z.number().int().positive(),
      callType: z.enum(["inbound", "outbound", "meeting", "whatsapp", "other"]),
      outcome: z.string().trim().min(1).max(4000),
      interestLevel: z.enum(["not_interested", "low", "medium", "high", "very_high"]),
      interestSubject: z.string().trim().max(500).nullable().optional(),
      nextCallAt: z.coerce.date().nullable().optional(),
      notes: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return createSalesCallInventoryForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    listCallInventory: protectedProcedure.input(z.object({ salesClientId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return [];
      return listSalesCallInventoryForClient({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createTeamInvitation: protectedProcedure.input(z.object({ email: z.string().trim().email().max(320), role: z.enum(["manager", "supervisor", "representative"]) })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      return createSalesTeamInvitationForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    revokeTeamInvitation: protectedProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      return revokeSalesTeamInvitationForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    acceptTeamInvitation: protectedProcedure.input(z.object({ token: z.string().trim().min(32).max(256) })).mutation(async ({ ctx, input }) => acceptSalesTeamInvitationForUser({ userId: ctx.user.id, ...input })),
    updateTeamMember: protectedProcedure.input(z.object({ salesTeamMemberId: z.number().int().positive(), role: z.enum(["manager", "supervisor", "representative"]), status: z.enum(["active", "inactive"]) })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      return updateSalesTeamMemberForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createAssignment: protectedProcedure.input(z.object({ salesTeamMemberId: z.number().int().positive(), salesPropertyId: z.number().int().positive().nullable().optional(), salesClientId: z.number().int().positive().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      return createSalesAssignmentForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createDailyTask: protectedProcedure.input(z.object({ salesTeamMemberId: z.number().int().positive(), title: z.string().trim().min(2).max(180), taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), targetContacts: z.number().int().min(0).max(10000), salesPropertyId: z.number().int().positive().nullable().optional(), salesClientId: z.number().int().positive().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      return createSalesDailyTaskForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    updateDailyTask: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["todo", "in_progress", "done", "cancelled"]), completedContacts: z.number().int().min(0).max(10000), notes: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return updateSalesDailyTaskForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    recordAttendance: protectedProcedure.input(z.object({ action: z.enum(["check_in", "check_out"]) })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return recordSalesAttendanceForUser({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    sendMessage: protectedProcedure.input(z.object({ scope: z.enum(["team", "direct"]), recipientUserId: z.number().int().positive().nullable().optional(), body: z.string().trim().min(1).max(4000) })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      return createSalesMessageForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    propertyAssistant: protectedProcedure.input(z.object({
      language: z.enum(["ar", "en", "he", "ru", "uk"]),
      message: z.string().trim().min(1).max(4000),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).max(10).default([]),
      previousMatchIds: z.array(z.number().int().positive()).max(3).default([]),
      filters: z.object({
        budget: z.number().int().positive().max(100_000_000).optional(),
        region: z.string().trim().min(1).max(160).optional(),
        bedrooms: z.number().int().min(0).max(50).optional(),
        availability: z.enum(["available", "reserved", "sold", "inactive"]).optional(),
        minAreaSqm: z.number().int().min(0).max(10_000_000).optional(),
        maxAreaSqm: z.number().int().min(0).max(10_000_000).optional(),
      }).default({}),
    })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });

      const sales = await getSalesOperationsForCompany({ companyId: membership.company.id, userId: ctx.user.id });
      const properties: AssistantSalesProperty[] = sales.properties;
      const normalizedMessage = input.message.toLocaleLowerCase().replace(/\s+/g, " ").trim();
      const repeatedRequest = input.history.some(item => item.role === "user" && item.content.toLocaleLowerCase().replace(/\s+/g, " ").trim() === normalizedMessage);
      if (repeatedRequest) return { answer: assistantRepeatedRequestAnswer(input.language), inventoryCount: properties.length, matchingCount: 0, matches: [], responseType: "follow_up" as const, provider: "deterministic_fallback" as const };
            const operationalAnswer = assistantOperationalAnswer({ language: input.language, message: input.message, properties, clientCount: sales.clients.length });
      if (operationalAnswer) return { answer: operationalAnswer, inventoryCount: properties.length, matchingCount: properties.length, matches: [], responseType: "operational" as const };
      if (assistantMarketingIntent(input.message)) {
        const availableProperty = properties.find(property => property.status === "available") ?? null;
        const marketingMatches = availableProperty ? assistantPropertyResults([availableProperty]) : [];
        return { answer: assistantMarketingAnswer(input.language, availableProperty), inventoryCount: properties.length, matchingCount: marketingMatches.length, matches: marketingMatches, responseType: "marketing" as const, provider: "deterministic_fallback" as const };
      }
      const deterministicFilters = effectiveAssistantFilters(input.filters, input.message);
      const previousResults = assistantPropertiesFromPreviousResults(properties, input.previousMatchIds);
      const isFollowUp = input.history.length > 0 && assistantIsFollowUpMessage(input.message);
      let followUpIntent: Awaited<ReturnType<typeof extractFollowUpIntentViaOllama>> | null = null;
      if (isFollowUp) {
        try {
          followUpIntent = await extractFollowUpIntentViaOllama({ message: input.message, history: input.history, currentFilters: deterministicFilters });
        } catch (error) {
          console.warn("[sales.propertyAssistant.followUp] Ollama Cloud unavailable; using deterministic fallback.", error instanceof Error ? error.message : "unknown error");
        }
      }
      const filters = followUpIntent?.action === "refine_filters"
        ? mergeFollowUpFilters(deterministicFilters, followUpIntent.filters)
        : deterministicFilters;
      const hasFilters = Object.values(filters).some(value => value !== undefined && value !== "");
      const matchingProperties = filterAssistantProperties(properties, filters);
      const areaComparisonFallback = isFollowUp && /(مساح|متر|area|sqm|same\s+(?:area|range))/i.test(input.message);
      if (previousResults.length && (followUpIntent?.action === "compare_area" || areaComparisonFallback)) return {
        answer: assistantAreaComparisonAnswer(input.language, previousResults),
        inventoryCount: properties.length,
        matchingCount: previousResults.length,
        matches: assistantPropertyResults(previousResults),
        responseType: "follow_up" as const,
        provider: "deterministic_fallback" as const,
      };
      if (previousResults.length && followUpIntent?.action === "reuse_results") return {
        answer: assistantPreviousResultsAnswer(input.language, previousResults.length),
        inventoryCount: properties.length,
        matchingCount: previousResults.length,
        matches: assistantPropertyResults(previousResults),
        responseType: "follow_up" as const,
        provider: "deterministic_fallback" as const,
      };
      const isSearchRequest = assistantSearchIntent(input.message) || followUpIntent?.action === "refine_filters";
      if (isSearchRequest && !assistantHasSpecificCriteria(filters) && !previousResults.length) return {
        answer: assistantClarificationAnswer(input.language),
        inventoryCount: properties.length,
        matchingCount: properties.length,
        matches: [],
        responseType: "clarification" as const,
        provider: "deterministic_fallback" as const,
      };
      const shouldPresentMatches = hasFilters || isSearchRequest;
      if (shouldPresentMatches && matchingProperties.length === 0) return { answer: assistantNoMatchAnswer(input.language, filters), inventoryCount: properties.length, matchingCount: 0, matches: [], responseType: "operational" as const, provider: "deterministic_fallback" as const };
      if (shouldPresentMatches) return {
        answer: assistantMatchSummary(input.language, matchingProperties.length, filters, assistantPropertyResults(matchingProperties)),
        inventoryCount: properties.length,
        matchingCount: matchingProperties.length,
        matches: assistantPropertyResults(matchingProperties),
        responseType: "match" as const,
        provider: "deterministic_fallback" as const,
      };

      const cloudSnapshot = {
        inventoryCount: properties.length,
        matchingCount: matchingProperties.length,
        filters,
        properties: matchingProperties.slice(0, 60).map(property => ({
          name: property.name,
          address: property.address,
          propertyType: property.propertyType,
          status: property.status,
          areaSqm: assistantAreaSqm(property),
          listPriceIls: assistantListPriceIls(property),
          bedrooms: assistantBedroomCount(property),
          attributes: assistantPropertyAttributes(property.attributesJson) as Record<string, string | number | boolean>,
        })),
      };
      try {
        const answer = await generatePropertyAdvisorAnswerViaOllama({
          language: input.language,
          message: input.message,
          history: input.history,
          snapshot: cloudSnapshot,
        });
        const responseMatches = shouldPresentMatches || previousResults.length ? assistantPropertyResults(matchingProperties) : [];
        return { answer, inventoryCount: properties.length, matchingCount: matchingProperties.length, matches: responseMatches, responseType: "ai" as const, provider: "ollama_cloud" as const };
      } catch (error) {
        console.warn("[sales.propertyAssistant] Ollama Cloud unavailable; using deterministic fallback.", error instanceof Error ? error.message : "unknown error");
        const responseMatches = shouldPresentMatches || previousResults.length ? assistantPropertyResults(matchingProperties) : [];
        return { answer: assistantFallbackAnswer(input.language, properties, matchingProperties.length), inventoryCount: properties.length, matchingCount: matchingProperties.length, matches: responseMatches, responseType: "fallback" as const, provider: "deterministic_fallback" as const };
      }
    }),
    transcribeAssistantAudio: protectedProcedure.input(z.object({
      language: z.enum(["ar", "en", "he", "ru", "uk"]),
      fileName: z.string().trim().min(1).max(160),
      contentType: z.enum(["audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a"]),
      base64Content: z.string().min(16).max(11_200_000),
    })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Join a company sales team first." });
      await getSalesOperationsForCompany({ companyId: membership.company.id, userId: ctx.user.id });
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64Content)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid audio encoding." });
      const audio = Buffer.from(input.base64Content, "base64");
      if (audio.length < 128 || audio.length > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Audio must be between 128 bytes and 8 MB." });
      const extension = input.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webm";
      try {
        const stored = await storagePut(`assistant-audio/${membership.company.id}/${crypto.randomUUID()}.${extension}`, audio, input.contentType);
        const transcription = await transcribeAudio({
          audioUrl: await storageGetSignedUrl(stored.key),
          language: input.language,
          prompt: "Transcribe the real-estate sales question accurately. Preserve names, locations, and numbers.",
        });
        if ("error" in transcription) throw new TRPCError({ code: "BAD_REQUEST", message: transcription.error });
        const transcript = transcription.text.trim();
        if (!transcript) throw new TRPCError({ code: "BAD_REQUEST", message: "No intelligible speech was detected." });
        return { transcript };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[sales.transcribeAssistantAudio]", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Voice transcription is temporarily unavailable. Please try again." });
      }
    }),
  }),

  portal: router({
    me: protectedProcedure.query(async ({ ctx }) => getTenantPortalForEmail((ctx.user.email ?? "").toLowerCase())),
  }),

  documents: router({
    center: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { documents: [], summary: { total: 0, expiringSoon: 0, categories: 0 } };
      requireCompanyPermission(membership.member.role, "documents.read");
      return getDocumentsCenterForCompany(membership.company.id);
    }),
    register: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(255), category: z.string().trim().min(2).max(100), fileKey: z.string().trim().min(3).max(500), fileUrl: z.string().trim().min(3).max(700), mimeType: z.string().trim().min(3).max(120), propertyId: z.number().int().positive().nullable().optional(), unitId: z.number().int().positive().nullable().optional(), expiresAt: z.coerce.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "documents.write");
      return createDocumentMetadataForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    upload: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(255), category: z.string().trim().min(2).max(100), fileName: z.string().trim().min(1).max(180), mimeType: z.string().trim().min(3).max(120), base64: z.string().min(4).max(14_000_000), propertyId: z.number().int().positive().nullable().optional(), unitId: z.number().int().positive().nullable().optional(), expiresAt: z.coerce.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "documents.write");
      const bytes = Buffer.from(input.base64, "base64");
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Document must be between 1 byte and 10 MB." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "").slice(0, 180) || "document";
      const stored = await storagePut(`${membership.company.id}/documents/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
      const created = await createDocumentMetadataForCompany({ companyId: membership.company.id, userId: ctx.user.id, title: input.title, category: input.category, fileKey: stored.key, fileUrl: stored.url, mimeType: input.mimeType, propertyId: input.propertyId, unitId: input.unitId, expiresAt: input.expiresAt });
      return created;
    }),
    update: protectedProcedure.input(z.object({ documentId: z.number().int().positive(), title: z.string().trim().min(2).max(255), category: z.string().trim().min(2).max(100), propertyId: z.number().int().positive().nullable().optional(), unitId: z.number().int().positive().nullable().optional(), expiresAt: z.coerce.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
      requireCompanyPermission(membership.member.role, "documents.write");
      return updateDocumentMetadataForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    replace: protectedProcedure.input(z.object({ documentId: z.number().int().positive(), fileName: z.string().trim().min(1).max(180), mimeType: z.string().trim().min(3).max(120), base64: z.string().min(4).max(14_000_000) })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
      requireCompanyPermission(membership.member.role, "documents.write");
      const bytes = Buffer.from(input.base64, "base64");
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Document must be between 1 byte and 10 MB." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "").slice(0, 180) || "document";
      const stored = await storagePut(`${membership.company.id}/documents/${ctx.user.id}/${Date.now()}-v-${safeName}`, bytes, input.mimeType);
      return replaceDocumentFileForCompany({ companyId: membership.company.id, userId: ctx.user.id, documentId: input.documentId, fileKey: stored.key, fileUrl: stored.url, mimeType: input.mimeType });
    }),
    remove: protectedProcedure.input(z.object({ documentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
      requireCompanyPermission(membership.member.role, "documents.write");
      return removeDocumentForCompany({ companyId: membership.company.id, userId: ctx.user.id, documentId: input.documentId });
    }),
    open: protectedProcedure.input(z.object({ documentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
      requireCompanyPermission(membership.member.role, "documents.read");
      const document = await getDocumentFileForCompany({ companyId: membership.company.id, documentId: input.documentId });
      return { url: await storageGetSignedUrl(document.fileKey), title: document.title };
    }),
  }),

  operations: router({
    center: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { vendors: [], workOrders: [], summary: { open: 0, urgent: 0, overdue: 0, activeVendors: 0 } };
      requireCompanyPermission(membership.member.role, "operations.read");
      return getOperationsCenterForCompany(membership.company.id);
    }),
    createVendor: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), phone: z.string().trim().max(40).optional(), email: z.string().email().optional(), specialty: z.string().trim().max(120).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "operations.write");
      return createVendorForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createWorkOrder: protectedProcedure.input(z.object({ buildingId: z.number().int().positive().nullable().optional(), unitId: z.number().int().positive().nullable().optional(), tenantId: z.number().int().positive().nullable().optional(), vendorId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(2).max(255), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), slaHours: z.number().int().min(1).max(720).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "operations.write");
      return createWorkOrderForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    updateWorkOrder: protectedProcedure.input(z.object({ workOrderId: z.number().int().positive(), status: z.enum(["open", "assigned", "in_progress", "resolved", "closed"]).optional(), vendorId: z.number().int().positive().nullable().optional(), estimatedCostIls: z.number().int().min(0).max(100000000).nullable().optional(), actualCostIls: z.number().int().min(0).max(100000000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "operations.write");
      return updateWorkOrderForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
  }),

  finance: router({
    center: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { recurringCharges: [], expenses: [], collections: [], summary: { monthlyExpectedIls: 0, expensesThisMonthIls: 0, approvedExpensesIls: 0, arrearsRiskIls: 0 } };
      requireCompanyPermission(membership.member.role, "finance.read");
      return getFinanceCenterForCompany(membership.company.id);
    }),
    createCharge: protectedProcedure.input(z.object({ unitId: z.number().int().positive().nullable().optional(), tenantId: z.number().int().positive().nullable().optional(), description: z.string().trim().min(2).max(255), amountIls: z.number().int().positive().max(100000000), dueDay: z.number().int().min(1).max(28).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "finance.write");
      return createRecurringChargeForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createExpense: protectedProcedure.input(z.object({ buildingId: z.number().int().positive().nullable().optional(), category: z.string().trim().min(2).max(100), description: z.string().trim().min(2).max(255), amountIls: z.number().int().positive().max(100000000), expenseDate: z.coerce.date(), status: z.enum(["planned", "approved", "paid"]).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." });
      requireCompanyPermission(membership.member.role, "finance.write");
      return createExpenseForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), password: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      if (await getUserByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "Email is already registered" });
      const user = await createLocalUser({ ...input, email });
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
      return user;
    }),
    login: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email.toLowerCase());
      if (!user || !verifyLocalPassword(input.password, user.passwordHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  account: router({
    access: protectedProcedure.query(async ({ ctx }) => {
      const [subscription, membership] = await Promise.all([
        getUserSubscription(ctx.user.id),
        getCompanyForUser(ctx.user.id),
      ]);
      const active = hasActiveSubscription(subscription);
      const salesAccess = membership ? await getSalesTeamAccess(membership.company.id, ctx.user.id) : null;
      const isSalesUser = Boolean(salesAccess?.salesMember);
      return {
        active,
        status: subscription?.status ?? "none",
        endsAt: subscription?.endsAt ?? null,
        company: membership ? { id: membership.company.id, slug: membership.company.slug, name: membership.company.name, role: membership.member.role } : null,
        destination: active ? (isSalesUser ? "/sales" : "/workspace") : "/plans",
      } as const;
    }),
    subscription: protectedProcedure
      .input(z.object({ page: z.number().int().min(1).max(100000).optional(), pageSize: z.number().int().min(1).max(50).optional() }).optional())
      .query(({ ctx, input }) => getCustomerSubscription(ctx.user.id, input ?? {})),
    redeemKey: protectedProcedure
      .input(z.object({ planCode: z.enum(PLAN_CODES), key: z.string().trim().min(56).max(56) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await redeemActivationKey({ userId: ctx.user.id, ...input });
          await recordAuditLog({ actorUserId: ctx.user.id, action: "activation_key.redeem", resourceType: "activation_key", targetUserId: ctx.user.id, success: true, requestId: ctx.requestId, metadata: { planCode: input.planCode } });
          return result;
        } catch (error) {
          await recordAuditLog({ actorUserId: ctx.user.id, action: "activation_key.redeem", resourceType: "activation_key", targetUserId: ctx.user.id, success: false, errorCode: error instanceof Error ? error.message.slice(0, 120) : "REDEEM_FAILED", requestId: ctx.requestId, metadata: { planCode: input.planCode } });
          throw error;
        }
      }),
  }),

  company: router({
    current: protectedProcedure.query(({ ctx }) => getCompanyForUser(ctx.user.id)),
    members: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { company: null, members: [] };
      if (!hasCompanyPermission(membership.member.role, "members.read")) return { company: membership.company, members: [] };
      return { company: membership.company, members: await listCompanyMembers(membership.company.id) };
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(160) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createCompanyForUser(ctx.user.id, input.name);
        } catch (error) {
          if (error instanceof Error && error.message === "ACTIVE_SUBSCRIPTION_REQUIRED") throw new TRPCError({ code: "FORBIDDEN", message: "An active subscription is required before creating a company." });
          throw error;
        }
      }),
    addMember: protectedProcedure
      .input(z.object({ email: z.string().email(), role: z.enum(["admin", "manager", "member", "viewer"]).default("member") }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create or join a company first." });
        requireCompanyPermission(membership.member.role, "members.write");
        return addCompanyMember(membership.company.id, input.email, input.role as CompanyRole);
      }),
    invitations: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { company: null, invitations: [] };
      if (!hasCompanyPermission(membership.member.role, "members.read")) return { company: membership.company, invitations: [] };
      return { company: membership.company, invitations: await listCompanyInvitations(membership.company.id) };
    }),
    invite: protectedProcedure
      .input(z.object({ email: z.string().email(), role: z.enum(["admin", "manager", "member", "viewer"]).default("member") }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
        requireCompanyPermission(membership.member.role, "members.write");
        const result = await createCompanyInvitation({ companyId: membership.company.id, invitedByUserId: ctx.user.id, email: input.email, role: input.role });
        return { ...result, inviteUrl: `/invite/${result.token}` };
      }),
    revokeInvitation: protectedProcedure
      .input(z.object({ invitationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
        requireCompanyPermission(membership.member.role, "members.write");
        return revokeCompanyInvitation({ companyId: membership.company.id, invitationId: input.invitationId, actorUserId: ctx.user.id });
      }),
    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string().trim().min(32).max(128) }))
      .mutation(({ ctx, input }) => acceptCompanyInvitation({ token: input.token, userId: ctx.user.id, email: ctx.user.email })),
    activity: protectedProcedure
      .input(z.object({ search: z.string().trim().max(120).optional(), page: z.number().int().min(1).max(10000).optional(), pageSize: z.number().int().min(1).max(50).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) return { items: [], total: 0, page: input?.page ?? 1, pageSize: input?.pageSize ?? 25 };
        if (!hasCompanyPermission(membership.member.role, "audit.read")) return { items: [], total: 0, page: input?.page ?? 1, pageSize: input?.pageSize ?? 25 };
        return listCompanyActivity(membership.company.id, input ?? {});
      }),
    revisions: protectedProcedure
      .input(z.object({ resourceType: z.enum(["unit", "lease", "document"]), resourceId: z.number().int().positive(), limit: z.number().int().min(1).max(100).optional() }))
      .query(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership || !hasCompanyPermission(membership.member.role, "audit.read")) return [];
        return listCompanyResourceRevisions({ companyId: membership.company.id, ...input });
      }),
    updateMemberRole: protectedProcedure
      .input(z.object({ memberId: z.number().int().positive(), role: z.enum(["admin", "manager", "member", "viewer"]) }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
        requireCompanyPermission(membership.member.role, "members.write");
        return updateCompanyMemberRole(input.memberId, input.role as CompanyRole);
      }),
    removeMember: protectedProcedure
      .input(z.object({ memberId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getCompanyForUser(ctx.user.id);
        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
        requireCompanyPermission(membership.member.role, "members.write");
        return removeCompanyMember(input.memberId);
      }),
  }),

  resources: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return { company: null, usage: { properties: 0, clients: 0, tasks: 0 }, limits: { properties: 0, clients: 0, tasks: 0, members: 0 }, planCode: null };
      requireCompanyPermission(membership.member.role, "workspace.read");
      return { company: membership.company, ...(await getCompanyResourceSnapshot(membership.company.id, ctx.user.id)) };
    }),
    properties: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return [];
      requireCompanyPermission(membership.member.role, "workspace.read");
      return listPropertiesForCompany(membership.company.id);
    }),
    clients: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return [];
      requireCompanyPermission(membership.member.role, "workspace.read");
      return listClientsForCompany(membership.company.id);
    }),
    tasks: protectedProcedure.query(async ({ ctx }) => {
      const membership = await getCompanyForUser(ctx.user.id);
      if (!membership) return [];
      requireCompanyPermission(membership.member.role, "workspace.read");
      return listTasksForCompany(membership.company.id);
    }),
    createProperty: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), address: z.string().trim().max(255).optional(), status: z.enum(["active", "vacant", "maintenance"]).optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return createPropertyForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    updateProperty: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(180), address: z.string().trim().max(255).optional(), status: z.enum(["active", "vacant", "maintenance"]), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return updatePropertyForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    deleteProperty: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return deletePropertyForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createClient: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().max(40).optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return createClientForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    updateClient: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(180), email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().max(40).optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return updateClientForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    deleteClient: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return deleteClientForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    createTask: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().max(4000).optional(), status: z.enum(["todo", "in_progress", "done"]).optional(), dueAt: z.coerce.date().nullable().optional(), assignedToUserId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Create a company first." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return createTaskForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    updateTask: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(2).max(180), description: z.string().trim().max(4000).optional(), status: z.enum(["todo", "in_progress", "done"]), dueAt: z.coerce.date().nullable().optional(), assignedToUserId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return updateTaskForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
    deleteTask: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write");
      return deleteTaskForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input });
    }),
  }),

  legacy: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); return getLegacyOperationalSnapshot(membership.company.id, ctx.user.id); }),
    tenants: protectedProcedure.query(async ({ ctx }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) return []; return listTenantsForCompany(membership.company.id, ctx.user.id); }),
    createTenant: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), email: z.string().email().optional(), phone: z.string().trim().max(40).optional(), propertyId: z.number().int().positive().nullable().optional(), status: z.enum(["active", "late", "ended"]).optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return createTenantForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    updateTenant: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(180), email: z.string().email().optional(), phone: z.string().trim().max(40).optional(), propertyId: z.number().int().positive().nullable().optional(), status: z.enum(["active", "late", "ended"]), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return updateTenantForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    deleteTenant: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return deleteTenantForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    maintenance: protectedProcedure.query(async ({ ctx }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) return []; return listMaintenanceForCompany(membership.company.id, ctx.user.id); }),
    createMaintenance: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().max(4000).optional(), propertyId: z.number().int().positive().nullable().optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(), scheduledAt: z.coerce.date().nullable().optional(), costIls: z.number().int().min(0).max(100000000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return createMaintenanceForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    updateMaintenance: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(2).max(180), description: z.string().trim().max(4000).optional(), propertyId: z.number().int().positive().nullable().optional(), priority: z.enum(["low", "medium", "high", "urgent"]), status: z.enum(["open", "in_progress", "completed", "cancelled"]), scheduledAt: z.coerce.date().nullable().optional(), costIls: z.number().int().min(0).max(100000000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return updateMaintenanceForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    deleteMaintenance: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return deleteMaintenanceForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    contracts: protectedProcedure.query(async ({ ctx }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) return []; return listContractsForCompany(membership.company.id, ctx.user.id); }),
    createContract: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(180), tenantId: z.number().int().positive().nullable().optional(), propertyId: z.number().int().positive().nullable().optional(), startAt: z.coerce.date(), endAt: z.coerce.date(), rentAmountIls: z.number().int().min(0).max(100000000).optional(), status: z.enum(["active", "expired", "terminated"]).optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return createContractForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    updateContract: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(2).max(180), tenantId: z.number().int().positive().nullable().optional(), propertyId: z.number().int().positive().nullable().optional(), startAt: z.coerce.date(), endAt: z.coerce.date(), rentAmountIls: z.number().int().min(0).max(100000000).optional(), status: z.enum(["active", "expired", "terminated"]), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return updateContractForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    deleteContract: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return deleteContractForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    operationalPayments: protectedProcedure.query(async ({ ctx }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) return []; return listOperationalPaymentsForCompany(membership.company.id, ctx.user.id); }),
    createOperationalPayment: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().nullable().optional(), contractId: z.number().int().positive().nullable().optional(), amountIls: z.number().int().min(1).max(100000000), method: z.enum(["cash", "bank", "card", "transfer"]).optional(), status: z.enum(["paid", "pending", "overdue"]).optional(), paidAt: z.coerce.date().nullable().optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return createOperationalPaymentForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    updateOperationalPayment: protectedProcedure.input(z.object({ id: z.number().int().positive(), tenantId: z.number().int().positive().nullable().optional(), contractId: z.number().int().positive().nullable().optional(), amountIls: z.number().int().min(1).max(100000000), method: z.enum(["cash", "bank", "card", "transfer"]), status: z.enum(["paid", "pending", "overdue"]), paidAt: z.coerce.date().nullable().optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return updateOperationalPaymentForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    deleteOperationalPayment: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return deleteOperationalPaymentForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    attendance: protectedProcedure.input(z.object({ attendanceDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional() }).optional()).query(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) return []; requireCompanyPermission(membership.member.role, "workspace.read"); return listAttendanceForCompany(membership.company.id, ctx.user.id, input?.attendanceDate); }),
    createAttendance: protectedProcedure.input(z.object({ attendanceUserId: z.number().int().positive(), attendanceDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/), status: z.enum(["present", "absent", "late", "leave"]), checkIn: z.string().regex(/^$|^\\d{2}:\\d{2}$/).optional(), checkOut: z.string().regex(/^$|^\\d{2}:\\d{2}$/).optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return createAttendanceForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    updateAttendance: protectedProcedure.input(z.object({ id: z.number().int().positive(), attendanceUserId: z.number().int().positive(), attendanceDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/), status: z.enum(["present", "absent", "late", "leave"]), checkIn: z.string().regex(/^$|^\\d{2}:\\d{2}$/).optional(), checkOut: z.string().regex(/^$|^\\d{2}:\\d{2}$/).optional(), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return updateAttendanceForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
    deleteAttendance: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const membership = await getCompanyForUser(ctx.user.id); if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." }); requireCompanyPermission(membership.member.role, "workspace.write"); return deleteAttendanceForCompany({ companyId: membership.company.id, userId: ctx.user.id, ...input }); }),
  }),

  owner: router({
    stats: ownerProcedure.query(({ ctx }) => { requirePermission(ctx, "dashboard.read"); return getOwnerStats(); }),
    administrators: ownerProcedure.query(({ ctx }) => {
      requireRole(ctx, ["admin"]);
      return listOwnerAdminUsers();
    }),
    setAdministratorRole: ownerProcedure
      .input(z.object({
        email: z.string().trim().email().max(320),
        role: z.enum(["admin", "manager", "support", "analyst", "user"]),
      }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx, ["admin"]);
        try {
          const updated = await setOwnerAdminRole({
            actorUserId: ctx.user.id,
            email: input.email,
            role: input.role,
          });
          await recordAuditLog({
            actorUserId: ctx.user.id,
            action: "administrator.role.updated",
            resourceType: "user",
            resourceId: updated.id,
            targetUserId: updated.id,
            requestId: ctx.requestId,
            metadata: { email: updated.email, role: updated.role },
          });
          return updated;
        } catch (error) {
          const reason = error instanceof Error ? error.message : "ROLE_UPDATE_FAILED";
          if (reason === "USER_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "No registered user exists for this email." });
          }
          if (reason === "SELF_ROLE_REVOKE_NOT_ALLOWED" || reason === "LAST_ADMIN_ROLE_REVOKE_NOT_ALLOWED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "This role change would leave the Owner dashboard without a safe administrator." });
          }
          throw error;
        }
      }),
    activationKeys: protectedProcedure.query(({ ctx }) => { requirePermission(ctx, "keys.read"); return listActivationKeysForOwner(); }),
    auditLogs: protectedProcedure
      .input(z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        action: z.string().trim().max(120).optional(),
        actor: z.string().trim().max(160).optional(),
        search: z.string().trim().max(160).optional(),
      }).optional())
      .query(({ ctx, input }) => {
        requirePermission(ctx, "audit.read");
        return listAuditLogsForOwner({
          from: input?.from ? new Date(`${input.from}T00:00:00.000Z`) : undefined,
          to: input?.to ? new Date(`${input.to}T23:59:59.999Z`) : undefined,
          action: input?.action || undefined,
          actor: input?.actor || undefined,
          search: input?.search || undefined,
        });
      }),
    auditFilterPreferences: protectedProcedure.query(({ ctx }) => {
      requirePermission(ctx, "audit.read");
      return getAuditFilterPreferences(ctx.user.id);
    }),
    saveAuditFilterPreferences: protectedProcedure
      .input(z.object({
        fromDate: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
        toDate: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
        action: z.string().trim().max(120),
        actor: z.string().trim().max(160),
        search: z.string().trim().max(160),
        range: z.string().trim().max(16),
      }))
      .mutation(({ ctx, input }) => {
        requirePermission(ctx, "audit.read");
        return saveAuditFilterPreferences(ctx.user.id, input);
      }),
    createActivationKeys: protectedProcedure
      .input(z.object({ planCode: z.enum(PLAN_CODES), quantity: z.number().int().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx, "keys.write");
        const result = await createActivationKeysForOwner({ ownerUserId: ctx.user.id, ...input });
        await recordAuditLog({ actorUserId: ctx.user.id, action: "activation_keys.create", resourceType: "activation_key_batch", resourceId: `${input.planCode}:${Date.now()}`, requestId: ctx.requestId, metadata: { planCode: input.planCode, quantity: input.quantity } });
        return result;
      }),
    exportActivationKeyHints: protectedProcedure.query(({ ctx }) => {
      requirePermission(ctx, "exports.read");
      return listActivationKeysForOwner().then(rows => rows.map(({ activation, user }) => ({ id: activation.id, keyHint: activation.keyHint, planCode: activation.planCode, status: activation.status, createdAt: activation.createdAt, redeemedAt: activation.redeemedAt, redeemedBy: user?.email ?? user?.name ?? null })));
    }),
  }),

  payments: router({
    createManualRequest: protectedProcedure
      .input(z.object({
        planCode: z.enum(PLAN_CODES),
        provider: z.enum(["bit", "paypal"]),
        reference: z.string().trim().min(4).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createManualPaymentRequest({ userId: ctx.user.id, ...input });
        try {
          await notifyOwner({
            title: "DAR.EST — طلب دفع جديد",
            content: `طلب ${input.provider} جديد من ${ctx.user.name ?? ctx.user.email ?? `المستخدم ${ctx.user.id}`} للخطة ${input.planCode} بمبلغ ${result.invoice?.amountIls ?? "غير محدد"} EGP، المرجع ${input.reference}. راجع الإثبات قبل الاعتماد.`,
          });
        } catch (error) {
          console.warn("[Notification] New payment request notification failed:", error);
        }
        return result;
      }),
    myManualRequests: protectedProcedure.query(({ ctx }) => listManualPaymentRequestsForUser(ctx.user.id)),
    myInvoices: protectedProcedure.query(({ ctx }) => listInvoicesForUser(ctx.user.id)),
    uploadProof: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        fileName: z.string().trim().min(1).max(120),
        contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
        dataBase64: z.string().min(1).max(7_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const raw = input.dataBase64.replace(/^data:[^;]+;base64,/, "");
        const data = Buffer.from(raw, "base64");
        if (data.length === 0 || data.length > 5 * 1024 * 1024) {
          throw new Error("Proof file must be between 1 byte and 5 MB.");
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await storagePut(`payment-proofs/${ctx.user.id}/${input.requestId}-${safeName}`, data, input.contentType);
        return attachPaymentProof({ userId: ctx.user.id, requestId: input.requestId, proofUrl: uploaded.url });
      }),
    ownerManualRequests: ownerProcedure.query(({ ctx }) => {
      requirePermission(ctx, "subscriptions.read");
      return listManualPaymentRequestsForOwner();
    }),
    ownerSubscriptions: ownerProcedure.query(({ ctx }) => { requirePermission(ctx, "subscriptions.read"); return listSubscriptionsForOwner(); }),
    cancelSubscription: ownerProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx, "subscriptions.write");
        await cancelSubscriptionForOwner(input.userId);
        await recordAuditLog({ actorUserId: ctx.user.id, action: "subscription.cancel", resourceType: "subscription", targetUserId: input.userId, requestId: ctx.requestId });
        return { success: true } as const;
      }),
    extendSubscription: ownerProcedure
      .input(z.object({ userId: z.number().int().positive(), days: z.number().int().min(1).max(3650) }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx, "subscriptions.write");
        await extendSubscriptionForOwner(input.userId, input.days);
        await recordAuditLog({ actorUserId: ctx.user.id, action: "subscription.extend", resourceType: "subscription", targetUserId: input.userId, requestId: ctx.requestId, metadata: { days: input.days } });
        return { success: true } as const;
      }),
    ownerTestPurchase: ownerProcedure
      .input(z.object({ planCode: z.enum(PLAN_CODES) }))
      .mutation(async ({ ctx, input }) => {
        const result = await fulfillSubscription({
          eventId: `owner-test:${ctx.user.id}:${input.planCode}:${Date.now()}`,
          source: "owner_test",
          eventType: "owner_test_purchase",
          userId: ctx.user.id,
          planCode: input.planCode,
          isTest: true,
          paymentProvider: "owner_test",
        });
        try {
          await notifyOwner({
            title: "DAR.EST — وضع الاختبار",
            content: `تم إنشاء اشتراك اختباري للعميل ${ctx.user.name ?? ctx.user.email ?? `المستخدم ${ctx.user.id}`} للخطة ${input.planCode} بمبلغ ${getPlan(input.planCode).priceIls} EGP. لم يتم تحصيل أي دفعة حقيقية، والمفتاح الناتج للاختبار فقط.`,
          });
        } catch (error) {
          console.warn("[Notification] Owner test purchase notification failed:", error);
        }
        return { ...result, isTest: true };
      }),
    approveManualRequest: ownerProcedure
      .input(z.object({ requestId: z.number().int().positive(), ownerNote: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx, "subscriptions.write");
        const result = await approveManualPaymentRequest(input.requestId, input.ownerNote);
        await recordAuditLog({ actorUserId: ctx.user.id, action: "manual_payment.approve", resourceType: "manual_payment_request", resourceId: String(input.requestId), targetUserId: result.subscription?.userId, requestId: ctx.requestId, metadata: { planCode: result.planCode, amountIls: result.amountIls } });
        try {
          await notifyOwner({
            title: "DAR.EST — اشتراك معتمد",
            content: `تم اعتماد طلب الدفع رقم ${input.requestId} للعميل ${result.customerName ?? result.customerEmail ?? "غير معروف"} (${result.customerEmail ?? "لا يوجد بريد"})، الخطة ${result.planCode} بمبلغ ${result.amountIls} EGP، وتم إصدار الاشتراك ومفتاح الترخيص.`,
          });
        } catch (error) {
          console.warn("[Notification] Approved payment notification failed:", error);
        }
        return result;
      }),
    rejectManualRequest: ownerProcedure
      .input(z.object({ requestId: z.number().int().positive(), ownerNote: z.string().trim().min(3).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx, "subscriptions.write");
        await rejectManualPaymentRequest(input.requestId, input.ownerNote);
        await recordAuditLog({ actorUserId: ctx.user.id, action: "manual_payment.reject", resourceType: "manual_payment_request", resourceId: String(input.requestId), requestId: ctx.requestId, metadata: { ownerNote: input.ownerNote } });
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
