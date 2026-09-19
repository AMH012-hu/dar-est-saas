import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  History,
  KeyRound,
  LayoutDashboard,
  Wallet,
  Wrench,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import WorkspaceModuleOperations from "@/components/WorkspaceModuleOperations";

type ModuleId = "portfolio" | "collections" | "work-orders" | "insights" | "leases" | "operating-log";
type Locale = "ar" | "en" | "he" | "ru" | "uk";

const moduleIds: ModuleId[] = ["portfolio", "collections", "work-orders", "insights", "leases", "operating-log"];

const moduleCopy: Record<ModuleId, Record<Locale, { title: string; eyebrow: string; description: string; icon: typeof Building2 }>> = {
  portfolio: {
    ar: { title: "المحفظة والإشغال", eyebrow: "إدارة الأصول", description: "عرض هيكل المحفظة، المباني، الوحدات وحالة الإشغال من بيانات شركتك الحالية.", icon: Building2 },
    en: { title: "Portfolio & occupancy", eyebrow: "Asset operations", description: "Review your portfolio structure, buildings, units, and occupancy from current company data.", icon: Building2 },
    he: { title: "תיק נכסים ותפוסה", eyebrow: "תפעול נכסים", description: "סקירת תיק הנכסים, הבניינים, היחידות ומצב התפוסה מתוך נתוני החברה.", icon: Building2 },
    ru: { title: "Портфель и занятость", eyebrow: "Операции с активами", description: "Просматривайте портфель, здания, объекты и занятость на основе данных компании.", icon: Building2 },
    uk: { title: "Портфель і заповненість", eyebrow: "Операції з активами", description: "Переглядайте портфель, будівлі, об’єкти й заповненість за даними компанії.", icon: Building2 },
  },
  collections: {
    ar: { title: "التحصيل والتدفق", eyebrow: "المالية التشغيلية", description: "راجع دفتر التحصيل والتدفق النقدي والمؤشرات المالية دون مغادرة مساحة العمل.", icon: Wallet },
    en: { title: "Collections & cash flow", eyebrow: "Operating finance", description: "Review the collection ledger, cash flow, and financial indicators without leaving the workspace.", icon: Wallet },
    he: { title: "גבייה ותזרים", eyebrow: "כספים תפעוליים", description: "סקירת ספר הגבייה, תזרים המזומנים והמדדים הפיננסיים של החברה.", icon: Wallet },
    ru: { title: "Сбор и денежный поток", eyebrow: "Операционные финансы", description: "Проверяйте реестр сборов, денежный поток и финансовые показатели компании.", icon: Wallet },
    uk: { title: "Збір і грошовий потік", eyebrow: "Операційні фінанси", description: "Переглядайте реєстр збору коштів, грошовий потік і фінансові показники компанії.", icon: Wallet },
  },
  "work-orders": {
    ar: { title: "أوامر العمل", eyebrow: "تشغيل وصيانة", description: "تابع أوامر الصيانة والأولويات والتزامات الخدمة من السجلات التشغيلية الفعلية.", icon: Wrench },
    en: { title: "Work orders", eyebrow: "Operations & maintenance", description: "Follow maintenance work orders, priorities, and service commitments from live operational records.", icon: Wrench },
    he: { title: "פקודות עבודה", eyebrow: "תפעול ותחזוקה", description: "מעקב אחר פקודות תחזוקה, עדיפויות והתחייבויות שירות מהרשומות התפעוליות.", icon: Wrench },
    ru: { title: "Рабочие заказы", eyebrow: "Операции и обслуживание", description: "Отслеживайте заказы на обслуживание, приоритеты и обязательства по сервису.", icon: Wrench },
    uk: { title: "Робочі замовлення", eyebrow: "Операції й обслуговування", description: "Відстежуйте заявки на обслуговування, пріоритети та сервісні зобов’язання.", icon: Wrench },
  },
  insights: {
    ar: { title: "مؤشرات القرار", eyebrow: "ذكاء تشغيلي", description: "اجمع مؤشرات الإشغال والتحصيل والصيانة والوثائق في صفحة قرار واحدة.", icon: BarChart3 },
    en: { title: "Decision insights", eyebrow: "Operational intelligence", description: "Bring occupancy, collections, maintenance, and document signals into one decision page.", icon: BarChart3 },
    he: { title: "תובנות החלטה", eyebrow: "מודיעין תפעולי", description: "איסוף מדדי תפוסה, גבייה, תחזוקה ומסמכים בעמוד החלטה אחד.", icon: BarChart3 },
    ru: { title: "Аналитика решений", eyebrow: "Операционный интеллект", description: "Соберите сигналы занятости, сборов, обслуживания и документов на одной странице.", icon: BarChart3 },
    uk: { title: "Аналітика рішень", eyebrow: "Операційна аналітика", description: "Зберіть сигнали заповненості, збору, обслуговування й документів на одній сторінці.", icon: BarChart3 },
  },
  leases: {
    ar: { title: "العقود والمستأجرون", eyebrow: "دورة الإيجار", description: "راجع العقود والمستأجرين وإشارات التجديد من بيانات التأجير المتاحة للشركة.", icon: KeyRound },
    en: { title: "Leases & tenants", eyebrow: "Leasing lifecycle", description: "Review contracts, tenants, and renewal signals from the company’s available leasing data.", icon: KeyRound },
    he: { title: "חוזים ושוכרים", eyebrow: "מחזור השכרה", description: "סקירת חוזים, שוכרים ואיתותי חידוש מנתוני ההשכרה של החברה.", icon: KeyRound },
    ru: { title: "Договоры и арендаторы", eyebrow: "Жизненный цикл аренды", description: "Просматривайте договоры, арендаторов и сигналы продления по данным компании.", icon: KeyRound },
    uk: { title: "Договори й орендарі", eyebrow: "Життєвий цикл оренди", description: "Переглядайте договори, орендарів і сигнали продовження за даними компанії.", icon: KeyRound },
  },
  "operating-log": {
    ar: { title: "سجل التشغيل", eyebrow: "الحوكمة", description: "راجع النشاطات المسجلة داخل الشركة لتتبع تغييرات التشغيل الأخيرة بوضوح.", icon: History },
    en: { title: "Operating log", eyebrow: "Governance", description: "Review recorded company activity to trace recent operational changes clearly.", icon: History },
    he: { title: "יומן תפעולי", eyebrow: "ממשל", description: "סקירת פעילות החברה שנרשמה לצורך מעקב ברור אחר שינויים תפעוליים אחרונים.", icon: History },
    ru: { title: "Операционный журнал", eyebrow: "Управление", description: "Просматривайте журнал компании для отслеживания последних операционных изменений.", icon: History },
    uk: { title: "Операційний журнал", eyebrow: "Управління", description: "Переглядайте журнал компанії для відстеження останніх операційних змін.", icon: History },
  },
};

const nav: Array<{ id: ModuleId; href: string }> = [
  { id: "portfolio", href: "/workspace/portfolio" },
  { id: "collections", href: "/workspace/collections" },
  { id: "work-orders", href: "/workspace/work-orders" },
  { id: "insights", href: "/workspace/insights" },
  { id: "leases", href: "/workspace/leases" },
  { id: "operating-log", href: "/workspace/operating-log" },
];

const moduleTools: Record<ModuleId, {
  actionHref: string;
  actionAr: string;
  actionEn: string;
  filters: Array<{ value: string; ar: string; en: string; terms: string[] }>;
  features: Array<{ ar: string; en: string; detailAr: string; detailEn: string }>;
}> = {
  portfolio: {
    actionHref: "/sales/properties", actionAr: "فتح سجل العقارات", actionEn: "Open property register",
    filters: [{ value: "all", ar: "كل الحالات", en: "All statuses", terms: [] }, { value: "available", ar: "متاح", en: "Available", terms: ["available", "vacant", "unsold", "متاح", "شاغر"] }, { value: "occupied", ar: "مشغول أو مبيع", en: "Occupied or sold", terms: ["occupied", "sold", "rented", "مبيع", "مشغول", "مؤجر"] }],
    features: [{ ar: "حالة الوحدات", en: "Unit status", detailAr: "فلترة الوحدات حسب التوفر أو الإشغال من السجل المصرح به.", detailEn: "Filter authorized units by availability or occupancy." }, { ar: "سجل العقار", en: "Property register", detailAr: "الانتقال مباشرة إلى سجل العقارات وتفاصيل كل وحدة.", detailEn: "Open the property register and each unit’s details." }, { ar: "بحث سريع", en: "Quick search", detailAr: "البحث بالاسم أو المشروع أو أي حقل ظاهر في السجل.", detailEn: "Search by name, project, or a visible record field." }],
  },
  collections: {
    actionHref: "/sales/contracts", actionAr: "فتح العقود وخطط الدفع", actionEn: "Open contracts & payment plans",
    filters: [{ value: "all", ar: "كل الدفعات", en: "All payments", terms: [] }, { value: "pending", ar: "بانتظار التحصيل", en: "Pending", terms: ["pending", "waiting", "معلق", "بانتظار"] }, { value: "overdue", ar: "متأخر", en: "Overdue", terms: ["overdue", "late", "متأخر"] }, { value: "paid", ar: "مدفوع", en: "Paid", terms: ["paid", "settled", "مدفوع", "مسدد"] }],
    features: [{ ar: "طابور المتابعة", en: "Follow-up queue", detailAr: "عرض الدفعات المعلقة أو المتأخرة فوراً دون حسابات تقديرية.", detailEn: "Show pending or overdue payments without estimated balances." }, { ar: "حالة التحصيل", en: "Collection status", detailAr: "فلترة السجل حسب مدفوع، معلق، أو متأخر.", detailEn: "Filter the ledger by paid, pending, or overdue." }, { ar: "ربط العقد", en: "Contract link", detailAr: "فتح العقود وخطط الدفع من مركز المبيعات للتحقق من المصدر.", detailEn: "Open contracts and payment plans in Sales Center for the source record." }],
  },
  "work-orders": {
    actionHref: "/sales/team", actionAr: "فتح مهام الفريق", actionEn: "Open team tasks",
    filters: [{ value: "all", ar: "كل الأوامر", en: "All work orders", terms: [] }, { value: "open", ar: "مفتوح", en: "Open", terms: ["open", "in_progress", "مفتوح", "قيد التنفيذ"] }, { value: "urgent", ar: "عاجل", en: "Urgent", terms: ["urgent", "high", "عاجل", "مرتفع"] }, { value: "completed", ar: "مكتمل", en: "Completed", terms: ["completed", "done", "مكتمل", "منجز"] }],
    features: [{ ar: "فرز الأولوية", en: "Priority triage", detailAr: "عزل الأوامر العاجلة وعالية الأولوية من سجلات الصيانة الحالية.", detailEn: "Isolate urgent and high-priority work from current maintenance records." }, { ar: "حالة التنفيذ", en: "Execution status", detailAr: "تتبع المفتوح وقيد التنفيذ والمكتمل.", detailEn: "Track open, in-progress, and completed work." }, { ar: "تنسيق الفريق", en: "Team coordination", detailAr: "الانتقال إلى مهام الفريق لتوزيع العمل وفق الصلاحيات.", detailEn: "Move to team tasks to coordinate work under existing permissions." }],
  },
  insights: {
    actionHref: "/workspace", actionAr: "فتح لوحة التحكم", actionEn: "Open control dashboard",
    filters: [{ value: "all", ar: "كل الإشارات", en: "All signals", terms: [] }, { value: "attention", ar: "تحتاج متابعة", en: "Needs attention", terms: ["pending", "overdue", "late", "open", "معلق", "متأخر", "مفتوح"] }],
    features: [{ ar: "مؤشرات موحدة", en: "Unified indicators", detailAr: "قراءة متزامنة لإشارات المالية والتأجير والتشغيل والمستندات.", detailEn: "Read finance, leasing, operations, and document signals together." }, { ar: "متابعة الاستثناءات", en: "Exception follow-up", detailAr: "إظهار السجلات التي تحمل إشارات متابعة قابلة للبحث.", detailEn: "Surface records carrying searchable follow-up signals." }, { ar: "العودة للملخص", en: "Return to overview", detailAr: "العودة إلى لوحة التحكم لمراجعة السياق العام للشركة.", detailEn: "Return to the dashboard for company-wide context." }],
  },
  leases: {
    actionHref: "/sales/contracts", actionAr: "فتح سجل العقود", actionEn: "Open contract register",
    filters: [{ value: "all", ar: "كل العقود", en: "All contracts", terms: [] }, { value: "active", ar: "نشط", en: "Active", terms: ["active", "نشط", "ساري"] }, { value: "expired", ar: "منتهٍ", en: "Expired", terms: ["expired", "ended", "terminated", "منتهي", "ملغى"] }, { value: "late", ar: "متأخر", en: "Late", terms: ["late", "overdue", "متأخر"] }],
    features: [{ ar: "دورة العقد", en: "Contract lifecycle", detailAr: "فلترة العقود النشطة والمنتهية وإشارات المتابعة.", detailEn: "Filter active, expired, and follow-up contract signals." }, { ar: "المستأجر أو العميل", en: "Tenant or client", detailAr: "بحث مباشر في سجلات المستأجرين والعملاء المصرح بها.", detailEn: "Search authorized tenant and client records directly." }, { ar: "خطة الدفع", en: "Payment plan", detailAr: "الانتقال إلى العقود وخطط الدفع لمراجعة الشروط المسجلة.", detailEn: "Open contracts and payment plans to review recorded terms." }],
  },
  "operating-log": {
    actionHref: "/workspace", actionAr: "العودة إلى لوحة التحكم", actionEn: "Return to dashboard",
    filters: [{ value: "all", ar: "كل النشاط", en: "All activity", terms: [] }, { value: "created", ar: "إضافات", en: "Created", terms: ["create", "added", "new", "إضافة", "إنشاء"] }, { value: "updated", ar: "تعديلات", en: "Updated", terms: ["update", "edit", "changed", "تعديل", "تحديث"] }, { value: "deleted", ar: "حذف", en: "Deleted", terms: ["delete", "removed", "حذف"] }],
    features: [{ ar: "فلترة الحدث", en: "Event filter", detailAr: "تصفية نشاط الإضافة والتعديل والحذف من السجل المصرح به.", detailEn: "Filter authorized creation, update, and deletion activity." }, { ar: "بحث بالمستخدم", en: "Actor search", detailAr: "البحث باسم المستخدم أو الإجراء أو الكيان المسجل.", detailEn: "Search by user, action, or recorded entity." }, { ar: "سياق السجل", en: "Record context", detailAr: "عرض الحقول المتاحة لتتبع السياق دون كشف بيانات خارج الشركة.", detailEn: "Review available fields for context without exposing cross-company data." }],
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === "object" && item !== null) as Record<string, unknown>[];
  const source = asRecord(value);
  const nested = Object.values(source).find(item => Array.isArray(item));
  return Array.isArray(nested) ? nested.filter(item => typeof item === "object" && item !== null) as Record<string, unknown>[] : [];
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  return "—";
}

function sourceRows(source: unknown): Record<string, unknown>[] {
  return asRows(source);
}

function Stat({ label, value }: { label: string; value: unknown }) {
  return <div className="border-s border-white/10 ps-4 first:border-s-0 first:ps-0"><p className="text-xs uppercase tracking-[.12em] text-white/42">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{display(value)}</p></div>;
}

export default function WorkspaceModule() {
  const params = useParams<{ module: string }>();
  const moduleId = moduleIds.includes(params.module as ModuleId) ? params.module as ModuleId : "portfolio";
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const { dir, lang } = useLocale();
  const access = trpc.account.access.useQuery(undefined, { enabled: Boolean(user) });
  const active = Boolean(access.data?.active);
  const company = trpc.company.current.useQuery(undefined, { enabled: Boolean(user && active) });
  const enabled = Boolean(user && active && company.data?.company);
  const needsPortfolio = ["portfolio", "collections", "work-orders"].includes(moduleId);
  const needsLeasing = ["collections", "insights", "leases"].includes(moduleId);
  const needsFinance = ["collections", "insights"].includes(moduleId);
  const needsCollections = moduleId === "collections";
  const needsOperations = ["work-orders", "insights"].includes(moduleId);
  const needsDocuments = moduleId === "insights";
  const needsActivity = moduleId === "operating-log";
  const needsTenants = ["collections", "work-orders", "leases"].includes(moduleId);
  const needsContracts = ["collections", "leases"].includes(moduleId);
  const needsMaintenance = moduleId === "work-orders";
  const needsPayments = moduleId === "collections";
  const portfolio = trpc.portfolio.hierarchy.useQuery(undefined, { enabled: enabled && needsPortfolio });
  const leasing = trpc.portfolio.leasingCenter.useQuery(undefined, { enabled: enabled && needsLeasing });
  const finance = trpc.finance.center.useQuery(undefined, { enabled: enabled && needsFinance });
  const collections = trpc.portfolio.collections.useQuery(undefined, { enabled: enabled && needsCollections });
  const operations = trpc.operations.center.useQuery(undefined, { enabled: enabled && needsOperations });
  const documents = trpc.documents.center.useQuery(undefined, { enabled: enabled && needsDocuments });
  const activity = trpc.company.activity.useQuery({ page: 1, pageSize: 24 }, { enabled: enabled && needsActivity });
  const tenants = trpc.legacy.tenants.useQuery(undefined, { enabled: enabled && needsTenants });
  const contracts = trpc.legacy.contracts.useQuery(undefined, { enabled: enabled && needsContracts });
  const maintenance = trpc.legacy.maintenance.useQuery(undefined, { enabled: enabled && needsMaintenance });
  const payments = trpc.legacy.operationalPayments.useQuery(undefined, { enabled: enabled && needsPayments });

  const spec = moduleCopy[moduleId][lang as Locale] ?? moduleCopy[moduleId].en;
  const Icon = spec.icon;
  const tools = moduleTools[moduleId];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const selectedFilter = tools.filters.find(item => item.value === filter) ?? tools.filters[0];
  const metrics = moduleId === "portfolio" ? [{ label: "Portfolios", value: asRows(asRecord(portfolio.data).portfolios).length }, { label: "Buildings", value: asRows(asRecord(portfolio.data).buildings).length }, { label: "Units", value: asRows(asRecord(portfolio.data).units).length }]
    : moduleId === "collections" ? [{ label: "Collections", value: asRows(asRecord(collections.data).collections).length }, { label: "Payments", value: asRows(payments.data).length }, { label: "Leases", value: asRows(asRecord(leasing.data).leases).length }]
    : moduleId === "work-orders" ? [{ label: "Work orders", value: asRows(asRecord(operations.data).workOrders).length }, { label: "Maintenance", value: asRows(maintenance.data).length }, { label: "Vendors", value: asRows(asRecord(operations.data).vendors).length }]
    : moduleId === "leases" ? [{ label: "Leases", value: asRows(asRecord(leasing.data).leases).length }, { label: "Contracts", value: asRows(contracts.data).length }, { label: "Tenants", value: asRows(tenants.data).length }]
    : moduleId === "operating-log" ? [{ label: "Activity", value: asRows(asRecord(activity.data).items).length }, { label: "Page", value: asRecord(activity.data).page ?? 1 }, { label: "Total", value: asRecord(activity.data).total ?? 0 }]
    : [{ label: "Finance", value: asRows(asRecord(finance.data).collections).length }, { label: "Leasing", value: asRows(asRecord(leasing.data).leases).length }, { label: "Operations", value: asRows(asRecord(operations.data).workOrders).length }];
  const isLoading = loading || access.isLoading || company.isLoading;
  const portfolioFailureCopy = {
    ar: { title: "تعذر تحميل بيانات المحفظة", description: "لم نتمكن من جلب بيانات العقارات المصرح بها حالياً. حاول مجدداً.", retry: "إعادة المحاولة" },
    en: { title: "Portfolio data could not be loaded", description: "We could not retrieve your authorized property data right now. Please try again.", retry: "Try again" },
    he: { title: "לא ניתן לטעון את נתוני הנכסים", description: "לא הצלחנו לאחזר כעת את נתוני הנכסים המורשים שלך. נסו שוב.", retry: "נסה שוב" },
    ru: { title: "Не удалось загрузить данные портфеля", description: "Сейчас не удалось получить разрешённые данные об объектах. Повторите попытку.", retry: "Повторить" },
    uk: { title: "Не вдалося завантажити дані портфеля", description: "Зараз не вдалося отримати дозволені дані про об’єкти. Спробуйте ще раз.", retry: "Спробувати знову" },
  } as const;
  const portfolioFailure = portfolioFailureCopy[lang as keyof typeof portfolioFailureCopy] ?? portfolioFailureCopy.en;

  if (isLoading) return <main className="grid min-h-screen place-items-center bg-[#061725] text-white"><div className="text-center"><div className="mx-auto h-12 w-12 animate-pulse rounded-2xl border border-[#d8b26b]/40 bg-[#d8b26b]/10" /><p className="mt-4 text-sm text-white/55">DAR.EST</p></div></main>;
  if (!active) return <main className="grid min-h-screen place-items-center bg-[#061725] px-6 text-center text-white"><div><p className="text-xl font-semibold">{lang === "ar" ? "فعّل الاشتراك للوصول إلى مساحة العمل" : "Activate your subscription to access the workspace"}</p><Link href="/account" className="mt-5 inline-flex rounded-full bg-[#d8b26b] px-5 py-3 font-semibold text-[#071a27]">{lang === "ar" ? "الحساب والاشتراك" : "Account & subscription"}</Link></div></main>;
  if (needsPortfolio && portfolio.isError) return <main dir={dir} className="grid min-h-screen place-items-center bg-[#061725] px-6 text-center text-white"><div className="max-w-md"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-rose-300/30 bg-rose-400/10 text-rose-100"><Building2 size={22} /></div><h1 className="mt-5 text-xl font-semibold">{portfolioFailure.title}</h1><p className="mt-3 text-sm leading-6 text-white/60">{portfolioFailure.description}</p><button type="button" onClick={() => void portfolio.refetch()} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#d8b26b] px-5 py-2.5 text-sm font-semibold text-[#071a27] transition active:scale-[.97]">{portfolioFailure.retry}</button></div></main>;

  return <main dir={dir} className="min-h-screen bg-[#061725] text-white">
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <aside className="hidden w-72 shrink-0 flex-col border-e border-white/10 bg-[#071b2a] px-5 py-7 lg:flex">
        <Link href="/workspace" className="flex items-center gap-3 border-b border-white/10 pb-6"><span className="grid h-10 w-10 place-items-center rounded-2xl border border-[#d8b26b]/30 bg-[#d8b26b]/10 text-[#e6c67d]"><Building2 size={20} /></span><span><b className="block tracking-[.16em] text-[#e6c67d]">DAR.EST</b><small className="text-white/40">Property OS</small></span></Link>
        <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pe-1">
          <Link href="/workspace" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/55 hover:bg-white/[.06] hover:text-white"><LayoutDashboard size={18} />{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</Link>
          {nav.map(item => { const EntryIcon = moduleCopy[item.id][lang as Locale]?.icon ?? moduleCopy[item.id].en.icon; return <Link key={item.id} href={item.href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${item.id === moduleId ? "bg-[#d8b26b]/15 text-[#f3d98d]" : "text-white/55 hover:bg-white/[.06] hover:text-white"}`}><EntryIcon size={18} />{(moduleCopy[item.id][lang as Locale] ?? moduleCopy[item.id].en).title}</Link>; })}
          <Link href="/workspace/reports" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/55 hover:bg-white/[.06] hover:text-white"><BarChart3 size={18} />{lang === "ar" ? "مركز التقارير" : lang === "he" ? "מרכז דוחות" : lang === "ru" ? "Центр отчётов" : lang === "uk" ? "Центр звітів" : "Reports center"}</Link>
          <Link href="/sales" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/55 hover:bg-white/[.06] hover:text-white"><Wallet size={18} />{lang === "ar" ? "مركز المبيعات" : "Sales Center"}</Link>
          <Link href="/sales/team" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/55 hover:bg-white/[.06] hover:text-white"><ClipboardList size={18} />{lang === "ar" ? "فريق المبيعات" : "Sales team"}</Link>
        </nav>
        <div className="mt-5 shrink-0 border-t border-white/10 pt-4"><LocaleSwitcher /></div>
      </aside>
      <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <div className="fixed end-4 top-4 z-50 lg:hidden"><LocaleSwitcher compact /></div>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-7 pe-14 lg:pe-0">
          <div><p className="text-xs font-semibold uppercase tracking-[.26em] text-[#d8b26b]">{spec.eyebrow}</p><div className="mt-3 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#d8b26b]/30 bg-[#d8b26b]/10 text-[#e6c67d]"><Icon size={23} /></span><div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{spec.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{spec.description}</p></div></div></div>
          <Link href="/workspace" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/75 transition hover:border-[#d8b26b]/60 hover:text-[#f3d98d]"><ArrowLeft size={16} />{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</Link>
        </header>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">{metrics.map(metric => <Stat key={metric.label} {...metric} />)}</div>
        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">{lang === "ar" ? "بحث" : "Search"}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={lang === "ar" ? "ابحث في سجلات هذه الصفحة" : "Search this page’s records"} className="h-11 w-full rounded-xl border border-white/15 bg-white/[.03] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d8b26b]/70" /></label><label><span className="sr-only">{lang === "ar" ? "تصفية" : "Filter"}</span><select value={selectedFilter.value} onChange={event => setFilter(event.target.value)} className="h-11 min-w-48 rounded-xl border border-white/15 bg-[#0a2030] px-3 text-sm text-white outline-none focus:border-[#d8b26b]/70">{tools.filters.map(option => <option key={option.value} value={option.value}>{lang === "ar" ? option.ar : option.en}</option>)}</select></label></div>
        <WorkspaceModuleOperations moduleId={moduleId} lang={lang} query={query} filter={selectedFilter} hierarchy={portfolio.data} leasing={leasing.data} collections={collections.data} finance={finance.data} operations={operations.data} documents={documents.data} activity={activity.data} tenants={tenants.data} contracts={contracts.data} maintenance={maintenance.data} payments={payments.data} />
        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/38"><FileText className="me-2 inline-block" size={14} />{lang === "ar" ? "تعرض هذه الصفحة بيانات التشغيل المصرح بها لشركتك فقط." : "This page shows only operational data authorized for your company."}</footer>
      </section>
    </div>
  </main>;
}
