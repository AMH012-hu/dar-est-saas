import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  KeyRound,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Users,
  FlaskConical,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ownerCopy } from "@/lib/ownerCopy";
import { planNames } from "@/lib/checkoutCopy";
import { PLAN_CODES } from "../../../shared/subscriptionPlans";

const ROLE_LABELS = {
  admin: "Owner",
  manager: "Subscription manager",
  support: "Support reviewer",
  analyst: "Reporting viewer",
} as const;
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "dashboard.read",
    "subscriptions.read",
    "subscriptions.write",
    "keys.read",
    "keys.write",
    "audit.read",
    "exports.read",
  ],
  manager: [
    "dashboard.read",
    "subscriptions.read",
    "subscriptions.write",
    "keys.read",
    "keys.write",
    "audit.read",
    "exports.read",
  ],
  support: ["dashboard.read", "subscriptions.read", "keys.read", "audit.read"],
  analyst: [
    "dashboard.read",
    "subscriptions.read",
    "keys.read",
    "audit.read",
    "exports.read",
  ],
};
const MANAGED_ADMIN_ROLES = ["admin", "manager", "support", "analyst", "user"] as const;
type ManagedAdminRole = (typeof MANAGED_ADMIN_ROLES)[number];

const labels = {
  ar: {
    stats: "الإحصائيات",
    users: "المستخدمون",
    active: "اشتراكات نشطة",
    available: "مفاتيح متاحة",
    redeemed: "مفاتيح مفعلة",
    keys: "مخزون مفاتيح التفعيل",
    generate: "إنشاء مفاتيح",
    quantity: "الكمية",
    create: "إنشاء آمن",
    created: "المفاتيح الجديدة — احفظها الآن",
    inventory: "سجل المفاتيح",
    audit: "سجل التدقيق",
    export: "تصدير CSV",
    role: "الدور",
    action: "العملية",
    result: "النتيجة",
    success: "ناجحة",
    failed: "فاشلة",
    availableStatus: "متاح",
    redeemedStatus: "مستخدم",
    revokedStatus: "ملغى",
    noKeys: "لا توجد مفاتيح بعد.",
    noAudit: "لا توجد عمليات مسجلة.",
    copy: "انسخ المفاتيح واحفظها في مكان آمن.",
    whatsapp: "رقم شراء المفاتيح: +201501805674",
    from: "من تاريخ",
    to: "إلى تاريخ",
    actionFilter: "نوع العملية",
    actorFilter: "اسم المسؤول",
    applyFilters: "تطبيق",
    search: "بحث سريع في العملية أو المستخدم",
    searchPlaceholder: "مثال: activation أو البريد أو رقم المورد",
    clearFilters: "مسح",
    auditRange: "النطاق الزمني",
    last7: "آخر 7 أيام",
    last30: "آخر 30 يوماً",
    last90: "آخر 90 يوماً",
    customRange: "مخصص",
    exportAudit: "تصدير سجل التدقيق",
    exportAuditPdf: "تصدير PDF",
    clearAllFilters: "مسح جميع المرشحات",
    pdfAction: "العملية",
    pdfActor: "المسؤول",
    pdfResource: "المورد",
    pdfResult: "النتيجة",
    pdfDate: "التاريخ",
    summary: "ملخص التقرير",
    total: "إجمالي السجلات",
    filters: "المرشحات المطبقة",
    all: "جميع السجلات",
    page: "صفحة",
    generated: "تم الإنشاء",
    accountIdentity: "الحساب الحالي",
    adminManagement: "إدارة المدراء",
    adminManagementDescription: "أضف مديراً مسجلاً أو غيّر دوره. اختيار مستخدم يسحب صلاحيات لوحة المالك فقط ولا يحذف الحساب.",
    administratorEmail: "البريد الإلكتروني للمستخدم المسجل",
    lastSignIn: "آخر تسجيل دخول",
    changeRole: "تغيير الدور",
    saveRole: "حفظ الدور",
    addOrUpdate: "إضافة أو تحديث مدير",
    removeAdmin: "إزالة صلاحيات المالك",
    roleChangePending: "جارٍ تحديث الصلاحية…",
    roleChangeConfirmation: "هل تريد تغيير صلاحيات هذا المستخدم؟ سيُسجَّل التغيير في سجل التدقيق.",
    noAdministrators: "لا توجد حسابات إدارية لعرضها.",
  },
  en: {
    stats: "Analytics",
    users: "Users",
    active: "Active subscriptions",
    available: "Available keys",
    redeemed: "Redeemed keys",
    keys: "Activation key inventory",
    generate: "Generate keys",
    quantity: "Quantity",
    create: "Generate securely",
    created: "New keys — save them now",
    inventory: "Key ledger",
    audit: "Audit trail",
    export: "Export CSV",
    role: "Role",
    action: "Action",
    result: "Result",
    success: "Success",
    failed: "Failed",
    availableStatus: "Available",
    redeemedStatus: "Redeemed",
    revokedStatus: "Revoked",
    noKeys: "No keys yet.",
    noAudit: "No recorded operations.",
    copy: "Copy the keys and store them securely.",
    whatsapp: "Key sales WhatsApp: +201501805674",
    from: "From date",
    to: "To date",
    actionFilter: "Action type",
    actorFilter: "Admin name",
    applyFilters: "Apply",
    search: "Quick search by action or user",
    searchPlaceholder: "e.g. activation, email, or resource ID",
    clearFilters: "Clear",
    auditRange: "Time range",
    last7: "Last 7 days",
    last30: "Last 30 days",
    last90: "Last 90 days",
    customRange: "Custom",
    exportAudit: "Export audit trail",
    exportAuditPdf: "Export PDF",
    clearAllFilters: "Clear all filters",
    pdfAction: "Action",
    pdfActor: "Admin",
    pdfResource: "Resource",
    pdfResult: "Result",
    pdfDate: "Date",
    summary: "Report summary",
    total: "Total records",
    filters: "Applied filters",
    all: "All records",
    page: "Page",
    generated: "Generated",
    accountIdentity: "Current account",
    adminManagement: "Administrator management",
    adminManagementDescription: "Add a registered user or change a role. Selecting user removes Owner access only; it never deletes the account.",
    administratorEmail: "Registered user email",
    lastSignIn: "Last sign-in",
    changeRole: "Change role",
    saveRole: "Save role",
    addOrUpdate: "Add or update administrator",
    removeAdmin: "Remove Owner access",
    roleChangePending: "Updating access…",
    roleChangeConfirmation: "Change this user's access? The change will be recorded in the audit trail.",
    noAdministrators: "No administrator accounts to show.",
  },
  he: {
    stats: "נתונים",
    users: "משתמשים",
    active: "מנויים פעילים",
    available: "מפתחות זמינים",
    redeemed: "מפתחות שמומשו",
    keys: "מלאי מפתחות הפעלה",
    generate: "יצירת מפתחות",
    quantity: "כמות",
    create: "יצירה מאובטחת",
    created: "מפתחות חדשים — שמרו אותם כעת",
    inventory: "יומן מפתחות",
    audit: "יומן ביקורת",
    export: "ייצוא CSV",
    role: "תפקיד",
    action: "פעולה",
    result: "תוצאה",
    success: "הצלחה",
    failed: "נכשלה",
    availableStatus: "זמין",
    redeemedStatus: "מומש",
    revokedStatus: "בוטל",
    noKeys: "אין עדיין מפתחות.",
    noAudit: "אין פעולות מתועדות.",
    copy: "העתיקו את המפתחות ושמרו אותם במקום מאובטח.",
    whatsapp: "WhatsApp לרכישת מפתחות: +201501805674",
    from: "מתאריך",
    to: "עד תאריך",
    actionFilter: "סוג פעולה",
    actorFilter: "שם מנהל",
    applyFilters: "החל",
    search: "חיפוש מהיר לפי פעולה או משתמש",
    searchPlaceholder: "למשל activation, דוא״ל או מזהה משאב",
    clearFilters: "נקה",
    auditRange: "טווח זמן",
    last7: "7 הימים האחרונים",
    last30: "30 הימים האחרונים",
    last90: "90 הימים האחרונים",
    customRange: "מותאם אישית",
    exportAudit: "ייצוא יומן ביקורת",
    exportAuditPdf: "ייצוא PDF",
    clearAllFilters: "נקה את כל המסננים",
    pdfAction: "פעולה",
    pdfActor: "מנהל",
    pdfResource: "משאב",
    pdfResult: "תוצאה",
    pdfDate: "תאריך",
    summary: "סיכום הדוח",
    total: "סה״כ רשומות",
    filters: "מסננים שהוחלו",
    all: "כל הרשומות",
    page: "עמוד",
    generated: "נוצר",
    accountIdentity: "החשבון הנוכחי",
    adminManagement: "ניהול מנהלים",
    adminManagementDescription: "הוסיפו משתמש רשום או שנו תפקיד. בחירה במשתמש מסירה גישת בעלים בלבד ואינה מוחקת חשבון.",
    administratorEmail: "כתובת הדוא״ל של המשתמש הרשום",
    lastSignIn: "כניסה אחרונה",
    changeRole: "שינוי תפקיד",
    saveRole: "שמירת תפקיד",
    addOrUpdate: "הוספה או עדכון מנהל",
    removeAdmin: "הסרת גישת בעלים",
    roleChangePending: "מעדכן גישה…",
    roleChangeConfirmation: "לשנות את הגישה של משתמש זה? השינוי יתועד ביומן הביקורת.",
    noAdministrators: "אין חשבונות ניהול להצגה.",
  },
  ru: {
    stats: "Статистика",
    users: "Пользователи",
    active: "Активные подписки",
    available: "Доступные ключи",
    redeemed: "Использованные ключи",
    keys: "Хранилище ключей",
    generate: "Создать ключи",
    quantity: "Количество",
    create: "Безопасно создать",
    created: "Новые ключи — сохраните их сейчас",
    inventory: "Журнал ключей",
    audit: "Аудит действий",
    export: "Экспорт CSV",
    role: "Роль",
    action: "Действие",
    result: "Результат",
    success: "Успех",
    failed: "Ошибка",
    availableStatus: "Доступен",
    redeemedStatus: "Использован",
    revokedStatus: "Отозван",
    noKeys: "Ключей пока нет.",
    noAudit: "Нет записанных операций.",
    copy: "Скопируйте ключи и храните их безопасно.",
    whatsapp: "WhatsApp для покупки ключей: +201501805674",
    from: "С даты",
    to: "По дату",
    actionFilter: "Тип действия",
    actorFilter: "Имя администратора",
    applyFilters: "Применить",
    search: "Быстрый поиск по действию или пользователю",
    searchPlaceholder: "например: activation, email или ID ресурса",
    clearFilters: "Очистить",
    auditRange: "Период",
    last7: "Последние 7 дней",
    last30: "Последние 30 дней",
    last90: "Последние 90 дней",
    customRange: "Вручную",
    exportAudit: "Экспорт аудита",
    exportAuditPdf: "Экспорт PDF",
    clearAllFilters: "Очистить все фильтры",
    pdfAction: "Действие",
    pdfActor: "Администратор",
    pdfResource: "Ресурс",
    pdfResult: "Результат",
    pdfDate: "Дата",
    summary: "Сводка отчёта",
    total: "Всего записей",
    filters: "Применённые фильтры",
    all: "Все записи",
    page: "Страница",
    generated: "Создано",
    accountIdentity: "Текущая учётная запись",
    adminManagement: "Управление администраторами",
    adminManagementDescription: "Добавьте зарегистрированного пользователя или измените роль. Выбор пользователя снимает только доступ владельца и не удаляет учётную запись.",
    administratorEmail: "Email зарегистрированного пользователя",
    lastSignIn: "Последний вход",
    changeRole: "Изменить роль",
    saveRole: "Сохранить роль",
    addOrUpdate: "Добавить или обновить администратора",
    removeAdmin: "Убрать доступ владельца",
    roleChangePending: "Обновление доступа…",
    roleChangeConfirmation: "Изменить права этого пользователя? Изменение будет занесено в аудит.",
    noAdministrators: "Нет учётных записей администраторов для показа.",
  },
  uk: {
    stats: "Статистика",
    users: "Користувачі",
    active: "Активні підписки",
    available: "Доступні ключі",
    redeemed: "Активовані ключі",
    keys: "Сховище ключів",
    generate: "Створити ключі",
    quantity: "Кількість",
    create: "Безпечне створення",
    created: "Нові ключі — збережіть їх зараз",
    inventory: "Журнал ключів",
    audit: "Журнал аудиту",
    export: "Експорт CSV",
    role: "Роль",
    action: "Дія",
    result: "Результат",
    success: "Успіх",
    failed: "Помилка",
    availableStatus: "Доступний",
    redeemedStatus: "Активований",
    revokedStatus: "Відкликаний",
    noKeys: "Ключів ще немає.",
    noAudit: "Немає записаних операцій.",
    copy: "Скопіюйте ключі та зберігайте їх безпечно.",
    whatsapp: "WhatsApp для покупки ключів: +201501805674",
    from: "Від дати",
    to: "До дати",
    actionFilter: "Тип дії",
    actorFilter: "Ім’я адміністратора",
    applyFilters: "Застосувати",
    search: "Швидкий пошук за дією або користувачем",
    searchPlaceholder: "наприклад: activation, email або ID ресурсу",
    clearFilters: "Очистити",
    auditRange: "Період",
    last7: "Останні 7 днів",
    last30: "Останні 30 днів",
    last90: "Останні 90 днів",
    customRange: "Власний",
    exportAudit: "Експорт журналу аудиту",
    exportAuditPdf: "Експорт PDF",
    clearAllFilters: "Очистити всі фільтри",
    pdfAction: "Дія",
    pdfActor: "Адміністратор",
    pdfResource: "Ресурс",
    pdfResult: "Результат",
    pdfDate: "Дата",
    summary: "Підсумок звіту",
    total: "Усього записів",
    filters: "Застосовані фільтри",
    all: "Усі записи",
    page: "Сторінка",
    generated: "Створено",
    accountIdentity: "Поточний обліковий запис",
    adminManagement: "Керування адміністраторами",
    adminManagementDescription: "Додайте зареєстрованого користувача або змініть роль. Вибір користувача прибирає лише доступ власника та не видаляє обліковий запис.",
    administratorEmail: "Email зареєстрованого користувача",
    lastSignIn: "Останній вхід",
    changeRole: "Змінити роль",
    saveRole: "Зберегти роль",
    addOrUpdate: "Додати або оновити адміністратора",
    removeAdmin: "Забрати доступ власника",
    roleChangePending: "Оновлення доступу…",
    roleChangeConfirmation: "Змінити права цього користувача? Зміну буде записано в аудиті.",
    noAdministrators: "Немає облікових записів адміністраторів для показу.",
  },
} as const;

const ownerStateCopy = {
  ar: { retry: "إعادة المحاولة", loading: "جارٍ تحميل البيانات…", proofRequired: "لا يمكن الاعتماد قبل رفع إثبات دفع.", pendingReviews: "طلبات بانتظار المراجعة", showAll: "عرض كل الطلبات", showLess: "عرض عدد أقل" },
  en: { retry: "Try again", loading: "Loading data…", proofRequired: "Approval requires an uploaded payment proof.", pendingReviews: "Requests awaiting review", showAll: "Show all requests", showLess: "Show fewer" },
  he: { retry: "נסו שוב", loading: "הנתונים נטענים…", proofRequired: "נדרשת הוכחת תשלום שהועלתה לפני אישור.", pendingReviews: "בקשות הממתינות לבדיקה", showAll: "הצג את כל הבקשות", showLess: "הצג פחות" },
  ru: { retry: "Повторить", loading: "Загрузка данных…", proofRequired: "Перед одобрением необходимо загрузить подтверждение оплаты.", pendingReviews: "Запросы, ожидающие проверки", showAll: "Показать все запросы", showLess: "Показать меньше" },
  uk: { retry: "Спробувати ще раз", loading: "Дані завантажуються…", proofRequired: "Перед схваленням потрібно завантажити підтвердження оплати.", pendingReviews: "Запити, що очікують перевірки", showAll: "Показати всі запити", showLess: "Показати менше" },
} as const;

function downloadCsv(rows: Array<Record<string, unknown>>, filename: string) {
  const headers = Object.keys(
    rows[0] ?? {
      id: "",
      keyHint: "",
      planCode: "",
      status: "",
      createdAt: "",
      redeemedBy: "",
    }
  );
  const escape = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = `\ufeff${[headers, ...rows.map(row => headers.map(header => row[header]))].map(line => line.map(escape).join(",")).join("\n")}`;
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadAuditPdf(
  rows: Array<{
    audit: {
      action: string;
      resourceType: string;
      resourceId: string | null;
      success: boolean;
      createdAt: Date | string;
    };
    actor?: { name: string | null; email: string | null } | null;
  }>,
  title: string,
  labels: {
    action: string;
    actor: string;
    resource: string;
    result: string;
    date: string;
    success: string;
    failed: string;
    summary: string;
    total: string;
    filters: string;
    all: string;
    page: string;
    generated: string;
  },
  filters: {
    from: string;
    to: string;
    action: string;
    actor: string;
    search: string;
    range: string;
  }
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  let y = 18;
  doc.setFillColor(7, 26, 39);
  doc.roundedRect(margin, 10, 18, 18, 3, 3, "F");
  doc.setDrawColor(229, 196, 124);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, 10, 18, 18, 3, 3, "S");
  doc.setTextColor(229, 196, 124);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("D", margin + 6.2, 22.5);
  doc.setTextColor(35, 45, 55);
  doc.setFontSize(18);
  doc.text("DAR.EST", margin + 24, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, margin + 24, 25);
  y = 36;
  doc.setDrawColor(210, 190, 125);
  doc.line(margin, y, 194, y);
  y += 8;
  doc.setFillColor(247, 244, 235);
  doc.roundedRect(margin, y, 178, 30, 3, 3, "F");
  doc.setTextColor(35, 45, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(labels.summary, margin + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${labels.total}: ${rows.length}`, margin + 5, y + 14);
  const activeFilters =
    [
      filters.from && `${labels.date}: ${filters.from}`,
      filters.to && `${labels.date}: ${filters.to}`,
      filters.action && `${labels.action}: ${filters.action}`,
      filters.actor && `${labels.actor}: ${filters.actor}`,
      filters.search && `${labels.resource}: ${filters.search}`,
    ]
      .filter(Boolean)
      .join(" · ") || labels.all;
  doc.text(`${labels.filters}: ${activeFilters}`, margin + 5, y + 22, {
    maxWidth: 168,
  });
  y += 38;
  doc.setTextColor(35, 45, 55);
  doc.setFontSize(9);
  rows.forEach((row, index) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    const actor = row.actor?.email ?? row.actor?.name ?? "—";
    const result = row.audit.success ? labels.success : labels.failed;
    const line = `${index + 1}. ${labels.action}: ${row.audit.action} | ${labels.actor}: ${actor} | ${labels.resource}: ${row.audit.resourceType} #${row.audit.resourceId ?? "—"} | ${labels.result}: ${result}`;
    const wrapped = doc.splitTextToSize(line, 178) as string[];
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5 + 3;
    doc.setTextColor(110, 120, 130);
    doc.text(
      `${labels.date}: ${new Date(row.audit.createdAt).toLocaleString()}`,
      margin + 4,
      y
    );
    y += 7;
    doc.setTextColor(35, 45, 55);
  });
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 282, 194, 282);
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 130);
    doc.text(
      `DAR.EST · ${labels.generated}: ${new Date().toLocaleString()}`,
      margin,
      288
    );
    doc.text(`${labels.page} ${page} / ${totalPages}`, 194, 288, {
      align: "right",
    });
  }
  doc.save("dar-est-audit-report.pdf");
}

export default function Owner() {
  const { user, loading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const { dir, lang } = useLocale();
  const copy = ownerCopy[lang];
  const ui = labels[lang];
  const stateCopy = ownerStateCopy[lang];
  const role = user?.role ?? "user";
  const can = (permission: string) =>
    ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  const [plan, setPlan] = useState<(typeof PLAN_CODES)[number]>(PLAN_CODES[0]);
  const [quantity, setQuantity] = useState(1);
  const [newKeys, setNewKeys] = useState<string[]>([]);
  const [testPurchaseResult, setTestPurchaseResult] = useState<{
    key: string;
    planCode: string;
    endsAt?: string;
  } | null>(null);
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditActor, setAuditActor] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditRange, setAuditRange] = useState("custom");
  const [auditPrefsLoaded, setAuditPrefsLoaded] = useState(false);
  const [administratorEmail, setAdministratorEmail] = useState("");
  const [administratorRole, setAdministratorRoleSelection] = useState<ManagedAdminRole>("manager");
  const [roleDrafts, setRoleDrafts] = useState<Record<number, ManagedAdminRole>>({});
  const [showAllManualReviews, setShowAllManualReviews] = useState(false);
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("all");
  const clearAuditFilters = () => {
    setAuditFrom("");
    setAuditTo("");
    setAuditAction("");
    setAuditActor("");
    setAuditSearch("");
    setAuditRange("custom");
  };
  const applyAuditRange = (range: string) => {
    setAuditRange(range);
    if (range === "custom") return;
    const end = new Date();
    const start = new Date(end);
    const days = range === "7" ? 7 : range === "30" ? 30 : 90;
    start.setDate(start.getDate() - (days - 1));
    const toDate = (date: Date) => date.toISOString().slice(0, 10);
    setAuditFrom(toDate(start));
    setAuditTo(toDate(end));
  };
  const auditPrefs = trpc.owner.auditFilterPreferences.useQuery(undefined, {
    enabled: can("audit.read"),
  });
  const saveAuditPrefs = trpc.owner.saveAuditFilterPreferences.useMutation();
  useEffect(() => {
    if (!can("audit.read") || auditPrefs.isPending || auditPrefsLoaded) return;
    const saved = auditPrefs.data;
    if (saved) {
      setAuditFrom(saved.fromDate);
      setAuditTo(saved.toDate);
      setAuditAction(saved.action);
      setAuditActor(saved.actor);
      setAuditSearch(saved.search);
      setAuditRange(saved.range);
    }
    setAuditPrefsLoaded(true);
  }, [auditPrefs.data, auditPrefs.isPending, auditPrefsLoaded, role]);
  useEffect(() => {
    if (!auditPrefsLoaded || !can("audit.read")) return;
    const timer = window.setTimeout(
      () =>
        saveAuditPrefs.mutate({
          fromDate: auditFrom,
          toDate: auditTo,
          action: auditAction,
          actor: auditActor,
          search: auditSearch,
          range: auditRange,
        }),
      350
    );
    return () => window.clearTimeout(timer);
  }, [
    auditPrefsLoaded,
    auditFrom,
    auditTo,
    auditAction,
    auditActor,
    auditSearch,
    auditRange,
    role,
  ]);
  const auditInput = useMemo(
    () => ({
      from: auditFrom || undefined,
      to: auditTo || undefined,
      action: auditAction || undefined,
      actor: auditActor || undefined,
      search: auditSearch || undefined,
    }),
    [auditFrom, auditTo, auditAction, auditActor, auditSearch]
  );
  const stats = trpc.owner.stats.useQuery(undefined, {
    enabled: can("dashboard.read"),
  });
  const administrators = trpc.owner.administrators.useQuery(undefined, {
    enabled: role === "admin",
  });
  const keys = trpc.owner.activationKeys.useQuery(undefined, {
    enabled: can("keys.read"),
  });
  const audits = trpc.owner.auditLogs.useQuery(auditInput, {
    enabled: can("audit.read") && auditPrefsLoaded,
  });
  const exportHints = trpc.owner.exportActivationKeyHints.useQuery(undefined, {
    enabled: false,
  });
  const subscriptions = trpc.payments.ownerSubscriptions.useQuery(undefined, {
    enabled: can("subscriptions.read"),
  });
  const manualRequests = trpc.payments.ownerManualRequests.useQuery(undefined, {
    enabled: can("subscriptions.read"),
  });
  const reviewRequests = (manualRequests.data ?? []).filter(
    row => row.request.status === "pending" || row.request.status === "pending_manual_verification"
  );
  const normalizedSubscriptionSearch = subscriptionSearch.trim().toLocaleLowerCase();
  const filteredSubscriptions = (subscriptions.data ?? []).filter(row => {
    const identity = `${row.user.name ?? ""} ${row.user.email ?? ""}`.toLocaleLowerCase();
    return (subscriptionStatus === "all" || row.subscription.status === subscriptionStatus)
      && (!normalizedSubscriptionSearch || identity.includes(normalizedSubscriptionSearch));
  });
  const utils = trpc.useUtils();
  const generate = trpc.owner.createActivationKeys.useMutation({
    onSuccess: result => {
      setNewKeys(result.map(item => item.key));
      downloadCsv(
        result.map((item, index) => ({
          index: index + 1,
          key: item.key,
          keyHint: item.keyHint,
          planCode: item.planCode,
        })),
        `dar-est-${plan}-keys.csv`
      );
      utils.owner.activationKeys.invalidate();
      utils.owner.stats.invalidate();
      utils.owner.auditLogs.invalidate();
    },
  });
  const cancel = trpc.payments.cancelSubscription.useMutation({
    onSuccess: () => {
      utils.payments.ownerSubscriptions.invalidate();
      utils.owner.stats.invalidate();
      utils.owner.auditLogs.invalidate();
    },
  });
  const extend = trpc.payments.extendSubscription.useMutation({
    onSuccess: () => {
      utils.payments.ownerSubscriptions.invalidate();
      utils.owner.auditLogs.invalidate();
    },
  });
  const approveManualRequest = trpc.payments.approveManualRequest.useMutation({
    onSuccess: () => {
      utils.payments.ownerManualRequests.invalidate();
      utils.payments.ownerSubscriptions.invalidate();
      utils.owner.stats.invalidate();
      utils.owner.auditLogs.invalidate();
    },
  });
  const rejectManualRequest = trpc.payments.rejectManualRequest.useMutation({
    onSuccess: () => {
      utils.payments.ownerManualRequests.invalidate();
      utils.owner.auditLogs.invalidate();
    },
  });
  const testPurchase = trpc.payments.ownerTestPurchase.useMutation({
    onSuccess: result => {
      const key = result.licenseKey?.keyValue;
      if (key)
        setTestPurchaseResult({
          key,
          planCode: result.subscription?.planCode ?? plan,
          endsAt: result.subscription?.endsAt
            ? new Date(result.subscription.endsAt).toISOString()
            : undefined,
        });
      utils.payments.ownerSubscriptions.invalidate();
      utils.owner.stats.invalidate();
      utils.owner.auditLogs.invalidate();
    },
  });
  const updateAdministratorRole = trpc.owner.setAdministratorRole.useMutation({
    onSuccess: () => {
      setAdministratorEmail("");
      setRoleDrafts({});
      utils.owner.administrators.invalidate();
      utils.owner.auditLogs.invalidate();
    },
  });
  const requestRoleChange = (email: string, nextRole: ManagedAdminRole) => {
    if (!window.confirm(ui.roleChangeConfirmation)) return;
    updateAdministratorRole.mutate({ email, role: nextRole });
  };

  if (loading || !user) return <main className="min-h-screen bg-[#071a27]" />;
  if (!can("dashboard.read"))
    return (
      <main
        dir={dir}
        className="flex min-h-screen items-center justify-center bg-[#071a27] px-6 text-white"
      >
        <div className="rounded-[2rem] border border-red-300/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-semibold">{copy.denied}</h1>
          <Link href="/" className="mt-5 inline-block text-[#e5c47c]">
            {copy.home}
          </Link>
        </div>
      </main>
    );
  const roleLabel = ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
  return (
    <main
      dir={dir}
      className="min-h-screen overflow-x-hidden bg-[#061725] px-4 py-8 text-white sm:px-8"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_82%_4%,rgba(216,178,107,.13),transparent_28%),radial-gradient(circle_at_8%_30%,rgba(26,101,122,.2),transparent_34%)]" />
      <div className="mx-auto min-w-0 max-w-6xl">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4 border border-white/10 bg-[#092233]/80 p-5 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-[.22em] text-[#e5c47c]">
              DAR.EST / CONTROL
            </p>
            <h1 className="mt-3 text-3xl font-semibold">{ui.stats}</h1>
            <p className="mt-2 text-white/50">{ui.whatsapp}</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#d9bd78]/25 bg-[#d9bd78]/10 px-3 py-1 text-xs text-[#f2d995]">
              <ShieldCheck size={14} />
              {ui.role}: {roleLabel}
            </p>
            <p className="mt-2 text-sm text-white/60">
              {ui.accountIdentity}: <span className="text-white">{user.email ?? user.name ?? "—"}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link href="/" className="text-sm text-white/60 hover:text-white">
              {copy.home}
            </Link>
          </div>
        </header>
        <nav aria-label="Owner administration sections" className="mb-6 flex gap-2 overflow-x-auto border-y border-white/10 bg-[#071b2a]/75 p-2 text-sm whitespace-nowrap">
          {[
            ["#overview", ui.stats],
            ["#subscription-review", copy.review],
            ["#subscriptions", copy.subscriptions],
            ["#key-management", ui.keys],
            ["#audit-trail", ui.audit],
          ].map(([href, label]) => (
            <a key={href} href={href} className="border border-white/10 bg-white/[.035] px-3 py-2 text-white/65 transition hover:border-[#d9bd78]/40 hover:bg-[#d9bd78]/10 hover:text-[#f2d995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9bd78]">
              {label}
            </a>
          ))}
        </nav>
        {stats.isError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/25 bg-red-400/[.08] p-4 text-sm text-red-100">
            <span>{stats.error.message}</span>
            <button type="button" onClick={() => stats.refetch()} className="inline-flex items-center gap-2 rounded-full border border-red-200/35 px-3 py-1.5"><RefreshCw size={14} />{stateCopy.retry}</button>
          </div>
        )}
        <section id="overview" className="mb-6 grid gap-3 scroll-mt-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Users, title: ui.users, value: stats.data?.users ?? 0 },
            {
              Icon: ShieldCheck,
              title: ui.active,
              value: stats.data?.activeSubscriptions ?? 0,
            },
            {
              Icon: KeyRound,
              title: ui.available,
              value: stats.data?.availableKeys ?? 0,
            },
            {
              Icon: BarChart3,
              title: ui.redeemed,
              value: stats.data?.redeemedKeys ?? 0,
            },
          ].map(({ Icon, title, value }) => (
            <article
              key={title}
              className="border border-white/10 bg-[#0a2333]/85 p-5 shadow-[0_14px_42px_rgba(0,0,0,.14)] backdrop-blur-xl"
            >
              <Icon size={18} className="text-[#e5c47c]" />
              <p className="mt-4 text-sm text-white/50">{title}</p>
              <p className="mt-1 text-3xl font-semibold">{stats.isLoading ? "—" : value}</p>
            </article>
          ))}
        </section>
        {role === "admin" && (
          <section className="mb-6 border border-[#d9bd78]/25 bg-[#0a2333]/90 p-5 shadow-[0_14px_42px_rgba(0,0,0,.14)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{ui.adminManagement}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-white/55">{ui.adminManagementDescription}</p>
              </div>
              <span className="rounded-full border border-[#d9bd78]/30 bg-[#071a27]/60 px-3 py-1 text-xs text-[#f2d995]">{roleLabel}</span>
            </div>
            <form
              className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_auto]"
              onSubmit={event => {
                event.preventDefault();
                requestRoleChange(administratorEmail, administratorRole);
              }}
            >
              <label className="text-sm text-white/65">
                {ui.administratorEmail}
                <input
                  required
                  type="email"
                  value={administratorEmail}
                  onChange={event => setAdministratorEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 block w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2.5 text-sm text-white outline-none ring-[#d9bd78]/60 focus:ring-2"
                />
              </label>
              <label className="text-sm text-white/65">
                {ui.role}
                <select
                  value={administratorRole}
                  onChange={event => setAdministratorRoleSelection(event.target.value as ManagedAdminRole)}
                  className="mt-2 block w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2.5 text-sm text-white outline-none ring-[#d9bd78]/60 focus:ring-2"
                >
                  {MANAGED_ADMIN_ROLES.filter(value => value !== "user").map(value => (
                    <option key={value} value={value}>{ROLE_LABELS[value]}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={updateAdministratorRole.isPending}
                className="self-end rounded-full bg-[#d9bd78] px-5 py-2.5 text-sm font-semibold text-[#071a27] transition active:scale-[.97] disabled:opacity-50"
              >
                {updateAdministratorRole.isPending ? ui.roleChangePending : ui.addOrUpdate}
              </button>
            </form>
            {updateAdministratorRole.error && <p className="mt-3 text-sm text-red-200">{updateAdministratorRole.error.message}</p>}
            <div className="mt-5 grid gap-3">
              {administrators.data?.length ? administrators.data.map(administrator => {
                const draft = roleDrafts[administrator.id] ?? (administrator.role as ManagedAdminRole);
                const isRemoval = draft === "user";
                return (
                  <article key={administrator.id} className="grid gap-3 border border-white/10 bg-[#061b2a]/90 p-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{administrator.name ?? administrator.email ?? "—"}</p>
                      <p className="mt-1 truncate text-sm text-[#f2d995]">{administrator.email ?? "—"}</p>
                      <p className="mt-2 text-xs text-white/45">{ui.lastSignIn}: {new Date(administrator.lastSignedIn).toLocaleString()}</p>
                    </div>
                    <label className="text-sm text-white/60">
                      {ui.changeRole}
                      <select
                        value={draft}
                        onChange={event => setRoleDrafts(current => ({ ...current, [administrator.id]: event.target.value as ManagedAdminRole }))}
                        className="mt-2 block w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white outline-none ring-[#d9bd78]/60 focus:ring-2"
                      >
                        {MANAGED_ADMIN_ROLES.map(value => (
                          <option key={value} value={value}>{value === "user" ? ui.removeAdmin : ROLE_LABELS[value]}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={updateAdministratorRole.isPending || draft === administrator.role}
                      onClick={() => administrator.email && requestRoleChange(administrator.email, draft)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[.97] disabled:opacity-40 ${isRemoval ? "border border-red-300/30 bg-red-400/10 text-red-100" : "bg-[#d9bd78] text-[#071a27]"}`}
                    >
                      {updateAdministratorRole.isPending ? ui.roleChangePending : isRemoval ? ui.removeAdmin : ui.saveRole}
                    </button>
                  </article>
                );
              }) : (
                <p className="text-sm text-white/45">{ui.noAdministrators}</p>
              )}
            </div>
          </section>
        )}
        {can("subscriptions.read") && (
          <section id="subscription-review" className="mb-6 scroll-mt-5 border border-[#d9bd78]/25 bg-[#0a2333]/90 p-5 shadow-[0_14px_42px_rgba(0,0,0,.14)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold"><ReceiptText size={20} className="text-[#e5c47c]" />{copy.review}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-white/55">{copy.intro}</p>
              </div>
              <span className="rounded-full border border-[#d9bd78]/30 bg-[#071a27]/60 px-3 py-1 text-xs text-[#f2d995]">{stateCopy.pendingReviews}: {reviewRequests.length}</span>
            </div>
            {manualRequests.isLoading ? <p className="mt-5 text-sm text-white/55">{stateCopy.loading}</p> : manualRequests.isError ? (
              <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/25 bg-red-400/[.08] p-4 text-sm text-red-100"><span>{manualRequests.error.message}</span><button type="button" onClick={() => manualRequests.refetch()} className="inline-flex items-center gap-2 rounded-full border border-red-200/35 px-3 py-1.5"><RefreshCw size={14} />{stateCopy.retry}</button></div>
            ) : reviewRequests.length ? (
              <div className="mt-5 grid gap-3">
                {reviewRequests.slice(0, showAllManualReviews ? reviewRequests.length : 8).map(row => {
                  const hasProof = Boolean(row.invoice?.proofUrl);
                  return <article key={row.request.id} className="grid gap-4 border border-white/10 bg-[#061b2a]/90 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{copy.request} #{row.request.id} · {row.user.name ?? row.user.email ?? `#${row.user.id}`}</p><span className="rounded-full border border-[#d9bd78]/30 px-2 py-0.5 text-xs text-[#f2d995]">{copy.statuses[row.request.status] ?? row.request.status}</span></div>
                      <div className="mt-3 grid gap-2 text-sm text-white/60 sm:grid-cols-2 xl:grid-cols-4"><span>{copy.plan}: <strong className="text-white">{planNames[lang][row.request.planCode] ?? row.request.planCode}</strong></span><span>{copy.invoice}: <strong className="text-white">EGP{row.invoice?.amountIls ?? "—"}</strong></span><span>{copy.reference}: <strong className="break-all text-white">{row.request.reference}</strong></span><span><Clock3 size={13} className="me-1 inline text-[#e5c47c]" />{new Date(row.request.createdAt).toLocaleString()}</span></div>
                      <p className={`mt-3 text-xs ${hasProof ? "text-emerald-100" : "text-amber-100"}`}>{hasProof ? copy.proofUploaded : stateCopy.proofRequired}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hasProof && <a href={row.invoice?.proofUrl ?? "#"} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/80">{copy.openProof}</a>}
                      {can("subscriptions.write") && <><button type="button" disabled={!hasProof || approveManualRequest.isPending} onClick={() => approveManualRequest.mutate({ requestId: row.request.id })} className="rounded-full bg-[#d9bd78] px-3 py-2 text-xs font-semibold text-[#071a27] disabled:cursor-not-allowed disabled:opacity-40">{approveManualRequest.isPending ? "…" : copy.approve}</button><button type="button" disabled={rejectManualRequest.isPending} onClick={() => { const note = window.prompt(copy.rejectionReason, ""); if (note?.trim() && note.trim().length >= 3) rejectManualRequest.mutate({ requestId: row.request.id, ownerNote: note.trim() }); }} className="rounded-full border border-red-300/30 px-3 py-2 text-xs text-red-100 disabled:opacity-40">{copy.reject}</button></>}
                    </div>
                  </article>;
                })}
                {reviewRequests.length > 8 && <button type="button" onClick={() => setShowAllManualReviews(current => !current)} className="justify-self-start rounded-full border border-[#d9bd78]/35 px-4 py-2 text-sm font-medium text-[#f2d995]">{showAllManualReviews ? stateCopy.showLess : `${stateCopy.showAll} (${reviewRequests.length})`}</button>}
              </div>
            ) : <p className="mt-5 text-sm text-white/45">{copy.noRequests}</p>}
            {(approveManualRequest.error || rejectManualRequest.error) && <p role="alert" className="mt-3 text-sm text-red-200">{approveManualRequest.error?.message ?? rejectManualRequest.error?.message}</p>}
          </section>
        )}
        {can("keys.write") && (
          <section id="key-management" className="mb-6 scroll-mt-5 border border-[#d9bd78]/25 bg-[#0a2333]/90 p-5 shadow-[0_14px_42px_rgba(0,0,0,.14)]">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <p className="text-xs uppercase tracking-[.18em] text-[#e5c47c]">
                  {ui.generate}
                </p>
                <select
                  value={plan}
                  onChange={event =>
                    setPlan(event.target.value as (typeof PLAN_CODES)[number])
                  }
                  className="mt-2 w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white"
                >
                  {PLAN_CODES.map(code => (
                    <option key={code} value={code}>
                      {planNames[lang][code]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="text-sm text-white/60">
                {ui.quantity}
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={event =>
                    setQuantity(
                      Math.max(1, Math.min(100, Number(event.target.value)))
                    )
                  }
                  className="mt-2 block w-24 rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-white"
                />
              </label>
              <button
                type="button"
                disabled={generate.isPending}
                onClick={() => {
                  setNewKeys([]);
                  generate.mutate({ planCode: plan, quantity });
                }}
                className="rounded-full bg-[#d9bd78] px-5 py-2.5 font-semibold text-[#071a27] transition hover:scale-[1.02] disabled:opacity-50"
              >
                {generate.isPending ? "…" : ui.create}
              </button>
            </div>
            {newKeys.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#d9bd78]/30 bg-[#071a27]/70 p-4">
                <p className="font-semibold text-[#e5c47c]">{ui.created}</p>
                <p className="mt-1 text-xs text-white/50">{ui.copy}</p>
                <textarea
                  readOnly
                  value={newKeys.join("\n")}
                  className="mt-3 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      newKeys.map((key, index) => ({
                        index: index + 1,
                        key,
                        plan,
                      })),
                      `dar-est-${plan}-keys.csv`
                    )
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d9bd78]/40 px-4 py-2 text-sm text-[#f2d995]"
                >
                  <Download size={15} />
                  {ui.export}
                </button>
              </div>
            )}
          </section>
        )}
        {can("keys.read") && (
          <section className="mb-6 border border-white/10 bg-[#0a2333]/85 p-5 shadow-[0_14px_42px_rgba(0,0,0,.14)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{ui.inventory}</h2>
              {can("exports.read") && (
                <button
                  type="button"
                  onClick={async () => {
                    const result = await exportHints.refetch();
                    if (result.data?.length)
                      downloadCsv(
                        result.data,
                        "dar-est-activation-key-inventory.csv"
                      );
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white"
                >
                  <Download size={14} />
                  {ui.export}
                </button>
              )}
            </div>
            {keys.data?.length ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {keys.data.map(row => (
                  <div
                    key={row.activation.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#071a27]/50 p-3 text-sm"
                  >
                    <span className="font-mono text-[#e5c47c]">
                      {row.activation.keyHint}
                    </span>
                    <span className="text-white/55">
                      {row.activation.status === "available"
                        ? ui.availableStatus
                        : row.activation.status === "redeemed"
                          ? ui.redeemedStatus
                          : ui.revokedStatus}{" "}
                      ·{" "}
                      {planNames[lang][row.activation.planCode] ??
                        row.activation.planCode}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/45">{ui.noKeys}</p>
            )}
          </section>
        )}
        {can("audit.read") && (
          <section id="audit-trail" className="mb-6 scroll-mt-5 border border-white/10 bg-[#0a2333]/85 p-5 shadow-[0_14px_42px_rgba(0,0,0,.14)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{ui.audit}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!audits.data?.length}
                  onClick={() => {
                    if (!audits.data?.length) return;
                    downloadCsv(
                      audits.data.map(row => ({
                        action: row.audit.action,
                        resourceType: row.audit.resourceType,
                        resourceId: row.audit.resourceId,
                        actor:
                          row.actor?.email ??
                          row.actor?.name ??
                          row.audit.actorUserId,
                        success: row.audit.success ? ui.success : ui.failed,
                        createdAt: new Date(row.audit.createdAt).toISOString(),
                      })),
                      "dar-est-audit-log.csv"
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d9bd78]/40 px-3 py-2 text-xs text-[#f2d995] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={14} />
                  {ui.exportAudit}
                </button>
                <button
                  type="button"
                  disabled={!audits.data?.length}
                  onClick={() => {
                    if (!audits.data?.length) return;
                    downloadAuditPdf(
                      audits.data,
                      ui.audit,
                      {
                        action: ui.pdfAction,
                        actor: ui.pdfActor,
                        resource: ui.pdfResource,
                        result: ui.pdfResult,
                        date: ui.pdfDate,
                        success: ui.success,
                        failed: ui.failed,
                        summary: ui.summary,
                        total: ui.total,
                        filters: ui.filters,
                        all: ui.all,
                        page: ui.page,
                        generated: ui.generated,
                      },
                      {
                        from: auditFrom,
                        to: auditTo,
                        action: auditAction,
                        actor: auditActor,
                        search: auditSearch,
                        range: auditRange,
                      }
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d9bd78]/40 px-3 py-2 text-xs text-[#f2d995] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={14} />
                  {ui.exportAuditPdf}
                </button>
                <button
                  type="button"
                  onClick={clearAuditFilters}
                  className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white"
                >
                  {ui.clearAllFilters}
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {" "}
              <label className="text-xs text-white/55">
                {ui.auditRange}
                <select
                  value={auditRange}
                  onChange={event => applyAuditRange(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9bd78]/30 bg-[#071a27] px-3 py-2 text-sm text-white"
                >
                  <option value="custom">{ui.customRange}</option>
                  <option value="7">{ui.last7}</option>
                  <option value="30">{ui.last30}</option>
                  <option value="90">{ui.last90}</option>
                </select>
              </label>
              <label className="text-xs text-white/55">
                {ui.search}
                <input
                  value={auditSearch}
                  onChange={event => setAuditSearch(event.target.value)}
                  placeholder={ui.searchPlaceholder}
                  className="mt-1 w-full rounded-xl border border-[#d9bd78]/30 bg-[#071a27] px-3 py-2 text-sm text-white placeholder:text-white/25"
                />
              </label>
              <label className="text-xs text-white/55">
                {ui.from}
                <input
                  type="date"
                  value={auditFrom}
                  onChange={event => setAuditFrom(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-white/55">
                {ui.to}
                <input
                  type="date"
                  value={auditTo}
                  onChange={event => setAuditTo(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-white/55">
                {ui.actionFilter}
                <input
                  value={auditAction}
                  onChange={event => setAuditAction(event.target.value)}
                  placeholder="activation_key.redeem"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white placeholder:text-white/25"
                />
              </label>
              <label className="text-xs text-white/55">
                {ui.actorFilter}
                <input
                  value={auditActor}
                  onChange={event => setAuditActor(event.target.value)}
                  placeholder="name@email.com"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white placeholder:text-white/25"
                />
              </label>
            </div>
            {audits.data?.length ? (
              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[620px] divide-y divide-white/10">
                  {audits.data.map(row => (
                    <div
                      key={row.audit.id}
                      className="grid grid-cols-[1.2fr_1fr_1fr_100px] gap-3 py-3 text-sm"
                    >
                      <span>{row.audit.action}</span>
                      <span className="text-white/55">
                        {row.actor?.email ??
                          row.actor?.name ??
                          `#${row.audit.actorUserId}`}
                      </span>
                      <span className="text-white/45">
                        {new Date(row.audit.createdAt).toLocaleString()}
                      </span>
                      <span
                        className={
                          row.audit.success
                            ? "text-emerald-200"
                            : "text-red-200"
                        }
                      >
                        {row.audit.success ? (
                          <>
                            <CheckCircle2 className="mr-1 inline" size={14} />
                            {ui.success}
                          </>
                        ) : (
                          ui.failed
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/45">{ui.noAudit}</p>
            )}
          </section>
        )}
        {can("subscriptions.write") && (
          <section className="rounded-[1.5rem] border border-[#d9bd78]/30 bg-[#d9bd78]/[.06] p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <FlaskConical size={20} className="text-[#e5c47c]" />
                  Admin test purchase
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-white/55">
                  Create a marked test subscription for your own account. It
                  does not charge a payment provider.
                </p>
              </div>
              <span className="rounded-full border border-[#d9bd78]/30 px-3 py-1 text-xs text-[#f2d995]">
                TEST ONLY
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="min-w-[210px] text-xs text-white/55">
                Plan
                <select
                  value={plan}
                  onChange={event =>
                    setPlan(event.target.value as (typeof PLAN_CODES)[number])
                  }
                  className="mt-1 w-full rounded-xl border border-[#d9bd78]/30 bg-[#071a27] px-3 py-2 text-sm text-white"
                >
                  {PLAN_CODES.map(code => (
                    <option key={code} value={code}>
                      {planNames[lang][code] ?? code}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={testPurchase.isPending}
                onClick={() => {
                  setTestPurchaseResult(null);
                  testPurchase.mutate({ planCode: plan });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#e5c47c] px-4 py-2.5 text-sm font-semibold text-[#071a27] disabled:opacity-50"
              >
                <KeyRound size={15} />
                {testPurchase.isPending ? "Creating…" : "Create test key"}
              </button>
            </div>
            {testPurchase.error && (
              <p className="mt-3 text-sm text-red-200">
                {testPurchase.error.message}
              </p>
            )}
            {testPurchaseResult && (
              <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/[.08] p-4">
                <p className="text-sm font-semibold text-emerald-100">
                  Test subscription created ·{" "}
                  {planNames[lang][testPurchaseResult.planCode] ??
                    testPurchaseResult.planCode}
                </p>
                <div className="mt-2 grid gap-2 text-xs text-white/65 sm:grid-cols-3">
                  <span>
                    Plan:{" "}
                    <strong className="text-white">
                      {planNames[lang][testPurchaseResult.planCode] ??
                        testPurchaseResult.planCode}
                    </strong>
                  </span>
                  <span>
                    Status:{" "}
                    <strong className="text-emerald-100">Active (TEST)</strong>
                  </span>
                  <span>
                    Ends:{" "}
                    <strong className="text-white">
                      {testPurchaseResult.endsAt
                        ? new Date(
                            testPurchaseResult.endsAt
                          ).toLocaleDateString()
                        : "—"}
                    </strong>
                  </span>
                </div>
                <p className="mt-2 break-all font-mono text-sm tracking-[.12em] text-[#f2d995]">
                  {testPurchaseResult.key}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard?.writeText(testPurchaseResult.key)
                    }
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80"
                  >
                    Copy key
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        [
                          {
                            key: testPurchaseResult.key,
                            planCode: testPurchaseResult.planCode,
                            type: "TEST",
                          },
                        ],
                        `darest-test-${testPurchaseResult.planCode}.csv`
                      )
                    }
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80"
                  >
                    <Download size={13} className="mr-1 inline" />
                    Download CSV
                  </button>
                </div>
                <p className="mt-3 text-xs text-white/50">
                  The key is for controlled testing only and should not be sold
                  to customers.
                </p>
              </div>
            )}
          </section>
        )}
        {can("subscriptions.read") && (
          <section id="subscriptions" className="scroll-mt-5 rounded-[1.5rem] border border-white/10 bg-white/[.045] p-5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{copy.subscriptions}</h2>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{filteredSubscriptions.length}/{subscriptions.data?.length ?? 0}</span>
            </div>
            {subscriptions.isLoading ? <p className="mt-4 text-sm text-white/55">{stateCopy.loading}</p> : subscriptions.isError ? (
              <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/25 bg-red-400/[.08] p-4 text-sm text-red-100"><span>{subscriptions.error.message}</span><button type="button" onClick={() => subscriptions.refetch()} className="inline-flex items-center gap-2 rounded-full border border-red-200/35 px-3 py-1.5"><RefreshCw size={14} />{stateCopy.retry}</button></div>
            ) : subscriptions.data?.length ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
                  <label className="text-xs text-white/55">{copy.subscriptionSearch}<input value={subscriptionSearch} onChange={event => setSubscriptionSearch(event.target.value)} placeholder={copy.subscriptionSearch} className="mt-1 block w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white placeholder:text-white/25" /></label>
                  <label className="text-xs text-white/55">{copy.filterByStatus}<select value={subscriptionStatus} onChange={event => setSubscriptionStatus(event.target.value)} className="mt-1 block w-full rounded-xl border border-white/15 bg-[#071a27] px-3 py-2 text-sm text-white">{(["all", "active", "expired", "canceled"] as const).map(status => <option key={status} value={status}>{copy.statuses[status]}</option>)}</select></label>
                  <button type="button" onClick={() => { setSubscriptionSearch(""); setSubscriptionStatus("all"); }} disabled={!subscriptionSearch && subscriptionStatus === "all"} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-40">{copy.clearFilters}</button>
                </div>
                {filteredSubscriptions.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">
                {filteredSubscriptions.map(row => (
                  <article key={row.subscription.id} className="rounded-2xl border border-white/10 bg-[#071a27]/60 p-4">
                    <p className="font-medium">{copy.customer}: {row.user.name ?? row.user.email ?? `#${row.user.id}`}</p>
                    {row.user.email && <p className="mt-1 break-all text-xs text-white/45">{row.user.email}</p>}
                    <p className="mt-2 text-sm text-white/60">{copy.plan}: {planNames[lang][row.subscription.planCode] ?? row.subscription.planCode} · {copy.status}: {copy.statuses[row.subscription.status] ?? row.subscription.status}</p>
                    <p className="mt-1 text-sm text-white/60">{copy.ends}: {new Date(row.subscription.endsAt).toLocaleDateString()}</p>
                    {can("subscriptions.write") && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={cancel.isPending || extend.isPending} onClick={() => { if (window.confirm(copy.confirmCancel)) cancel.mutate({ userId: row.subscription.userId }); }} className="rounded-full border border-red-300/25 px-3 py-1.5 text-xs text-red-100 disabled:cursor-not-allowed disabled:opacity-40">{copy.cancel}</button>
                        <button type="button" disabled={cancel.isPending || extend.isPending} onClick={() => { const days = Number(window.prompt(copy.extendDays, "30")); if (Number.isInteger(days) && days > 0) extend.mutate({ userId: row.subscription.userId, days }); }} className="rounded-full border border-[#d9bd78]/40 px-3 py-1.5 text-xs text-[#e5c47c] disabled:cursor-not-allowed disabled:opacity-40">{copy.extend}</button>
                      </div>
                    )}
                  </article>
                ))}
                </div> : <p className="mt-4 text-sm text-white/45">{copy.noMatchingSubscriptions}</p>}
              </>
            ) : <p className="mt-3 text-sm text-white/45">{copy.noSubscriptions}</p>}
            {(cancel.error || extend.error) && <p role="alert" className="mt-3 text-sm text-red-200">{cancel.error?.message ?? extend.error?.message}</p>}
          </section>
        )}
      </div>
    </main>
  );
}
