import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Download,
  FileDown,
  FileBarChart2,
  FileText,
  History,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Pencil,
  PieChart,
  Plus,
  Receipt,
  Settings2,
  Trash2,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import { translate } from "@/lib/i18n";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { jsPDF } from "jspdf";

type PlanCode = "monthly" | "quarterly" | "semiannual" | "annual";
type ResourceKey = "properties" | "clients" | "tasks";
type PropertyStatus = "active" | "vacant" | "maintenance";
type TaskStatus = "todo" | "in_progress" | "done";

const planLabels = {
  monthly: "Basic",
  quarterly: "Plus",
  semiannual: "Pro",
  annual: "VIP",
} as const;
const planBenefits = {
  ar: "مزايا خطتك",
  en: "Included in your subscription",
  he: "יתרונות המנוי",
  ru: "Преимущества подписки",
  uk: "Переваги підписки",
} as const;
const planStatus = {
  ar: "مفعّلة ضمن اشتراكك",
  en: "Included in your subscription",
  he: "כלול במנוי שלך",
  ru: "Включено в вашу подписку",
  uk: "Включено у вашу підписку",
} as const;
const copy = {
  ar: {
    title: "لوحة التحكم",
    subtitle: "منصة عملية لإدارة شركات العقارات وبياناتها بأمان",
    overview: "نظرة عامة",
    dashboard: "لوحة التحكم",
    properties: "العقارات",
    clients: "العملاء",
    tasks: "المهام",
    payments: "المدفوعات",
    maintenance: "الصيانة",
    reports: "التقارير",
    tenants: "المستأجرون",
    attendance: "الحضور",
    company: "إدارة الشركة",
    activity: "النشاط",
    billing: "المدفوعات والفواتير",
    contracts: "العقود",
    activeCompany: "الشركة النشطة",
    noCompany: "لا توجد شركة مرتبطة بهذا الحساب بعد.",
    members: "الأعضاء",
    active: "نشطة",
    noItems: "لا توجد بيانات بعد",
    add: "إضافة",
    save: "حفظ",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    name: "الاسم",
    address: "العنوان",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    notes: "ملاحظات",
    titleField: "العنوان",
    description: "الوصف",
    due: "تاريخ الاستحقاق",
    usage: "الاستخدام",
    limit: "الحد",
    unlimited: "غير محدود",
    activeProperties: "العقارات النشطة",
    workingTasks: "المهام قيد التنفيذ",
    totalClients: "إجمالي العملاء",
    plan: "الخطة الحالية",
    propertyStatus: { active: "نشطة", vacant: "شاغرة", maintenance: "صيانة" },
    taskStatus: {
      todo: "قيد الانتظار",
      in_progress: "قيد التنفيذ",
      done: "مكتملة",
    },
    required: "أنشئ شركة وفعّل اشتراكاً لاستخدام مساحة العمل.",
    moduleReady:
      "هذا القسم ظاهر في لوحة التحكم وسيتم ربطه بالبيانات الخاصة به عند تفعيل وحدته.",
    account: "الحساب والاشتراك",
    notifications: "التنبيهات",
    noNotifications: "لا توجد تنبيهات جديدة",
    notificationsLoading: "جارٍ تحميل التنبيهات…",
    notificationsUnavailable: "تعذر تحميل التنبيهات حالياً.",
    retryNotifications: "إعادة المحاولة",
    overdueTask: "مهمة متأخرة",
    openMaintenance: "طلب صيانة مفتوح",
    recentActivity: "نشاط حديث",
    markRead: "تمت القراءة",
    kpiHint: "بيانات محدثة من سجلات الشركة التشغيلية",
    period: "الفترة",
    currentPeriod: "الفترة الحالية",
    previousPeriod: "الفترة السابقة",
    days7: "7 أيام",
    days30: "30 يوماً",
    days90: "90 يوماً",
    year1: "12 شهراً",
    markAllRead: "تحديد الكل كمقروء",
    priority: "الأهمية",
    allPriorities: "كل التنبيهات",
    highPriority: "عالية",
    mediumPriority: "متوسطة",
    lowPriority: "منخفضة",
    exportCsv: "تصدير CSV",
    exportPdf: "تصدير PDF",
    compare: "مقارنة الأداء",
  },
  en: {
    title: "Control dashboard",
    subtitle:
      "A practical workspace for managing property companies and their data securely",
    overview: "Overview",
    dashboard: "Dashboard",
    properties: "Properties",
    clients: "Clients",
    tasks: "Tasks",
    payments: "Payments",
    maintenance: "Maintenance",
    reports: "Reports",
    tenants: "Tenants",
    attendance: "Attendance",
    company: "Company management",
    activity: "Activity",
    billing: "Payments & invoices",
    contracts: "Contracts",
    activeCompany: "Active company",
    noCompany: "No company is linked to this account yet.",
    members: "Members",
    active: "Active",
    noItems: "No data yet",
    add: "Add",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    name: "Name",
    address: "Address",
    email: "Email",
    phone: "Phone",
    notes: "Notes",
    titleField: "Title",
    description: "Description",
    due: "Due date",
    usage: "Usage",
    limit: "Limit",
    unlimited: "Unlimited",
    activeProperties: "Active properties",
    workingTasks: "Tasks in progress",
    totalClients: "Total clients",
    plan: "Current plan",
    propertyStatus: {
      active: "Active",
      vacant: "Vacant",
      maintenance: "Maintenance",
    },
    taskStatus: { todo: "To do", in_progress: "In progress", done: "Done" },
    required:
      "Create a company and activate a subscription to use the workspace.",
    moduleReady:
      "This section is visible in the dashboard and will connect to its dedicated data when the module is activated.",
    account: "Account & subscription",
    notifications: "Notifications",
    noNotifications: "No new notifications",
    notificationsLoading: "Loading notifications…",
    notificationsUnavailable: "Notifications could not be loaded right now.",
    retryNotifications: "Retry",
    overdueTask: "Overdue task",
    openMaintenance: "Open maintenance request",
    recentActivity: "Recent activity",
    markRead: "Mark as read",
    kpiHint: "Updated from the company’s operational records",
    period: "Period",
    currentPeriod: "Current period",
    previousPeriod: "Previous period",
    days7: "7 days",
    days30: "30 days",
    days90: "90 days",
    year1: "12 months",
    markAllRead: "Mark all as read",
    priority: "Priority",
    allPriorities: "All alerts",
    highPriority: "High",
    mediumPriority: "Medium",
    lowPriority: "Low",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF",
    compare: "Performance comparison",
  },
  he: {
    title: "לוח הבקרה",
    subtitle: "סביבת עבודה מעשית לניהול חברות נדל״ן והנתונים שלהן בבטחה",
    overview: "סקירה כללית",
    dashboard: "לוח הבקרה",
    properties: "נכסים",
    clients: "לקוחות",
    tasks: "משימות",
    payments: "תשלומים",
    maintenance: "תחזוקה",
    reports: "דוחות",
    tenants: "שוכרים",
    attendance: "נוכחות",
    company: "ניהול החברה",
    activity: "פעילות",
    billing: "תשלומים וחשבוניות",
    contracts: "חוזים",
    activeCompany: "החברה הפעילה",
    noCompany: "עדיין לא משויכת חברה לחשבון זה.",
    members: "חברים",
    active: "פעיל",
    noItems: "אין נתונים עדיין",
    add: "הוספה",
    save: "שמירה",
    cancel: "ביטול",
    edit: "עריכה",
    delete: "מחיקה",
    name: "שם",
    address: "כתובת",
    email: "דוא״ל",
    phone: "טלפון",
    notes: "הערות",
    titleField: "כותרת",
    description: "תיאור",
    due: "תאריך יעד",
    usage: "שימוש",
    limit: "מגבלה",
    unlimited: "ללא הגבלה",
    activeProperties: "נכסים פעילים",
    workingTasks: "משימות בתהליך",
    totalClients: "סה״כ לקוחות",
    plan: "המנוי הנוכחי",
    propertyStatus: { active: "פעיל", vacant: "פנוי", maintenance: "תחזוקה" },
    taskStatus: { todo: "לביצוע", in_progress: "בתהליך", done: "הושלם" },
    required: "צור חברה והפעל מנוי כדי להשתמש בסביבת העבודה.",
    moduleReady:
      "החלק הזה מוצג בלוח הבקרה ויחובר לנתונים הייעודיים שלו בעת הפעלת המודול.",
    account: "חשבון ומנוי",
    notifications: "התראות",
    noNotifications: "אין התראות חדשות",
    notificationsLoading: "טוען התראות…",
    notificationsUnavailable: "לא ניתן לטעון התראות כעת.",
    retryNotifications: "נסה שוב",
    overdueTask: "משימה באיחור",
    openMaintenance: "בקשת תחזוקה פתוחה",
    recentActivity: "פעילות אחרונה",
    markRead: "סומן כנקרא",
    kpiHint: "נתונים מעודכנים מרשומות החברה",
    period: "תקופה",
    currentPeriod: "התקופה הנוכחית",
    previousPeriod: "התקופה הקודמת",
    days7: "7 ימים",
    days30: "90 ימים",
    days90: "90 ימים",
    year1: "12 חודשים",
    markAllRead: "סמן הכל כנקרא",
    priority: "חשיבות",
    allPriorities: "כל ההתראות",
    highPriority: "גבוהה",
    mediumPriority: "בינונית",
    lowPriority: "נמוכה",
    exportCsv: "ייצוא CSV",
    exportPdf: "ייצוא PDF",
    compare: "השוואת ביצועים",
  },
  ru: {
    title: "Панель управления",
    subtitle:
      "Практическая среда для безопасного управления компаниями недвижимости",
    overview: "Обзор",
    dashboard: "Панель управления",
    properties: "Объекты",
    clients: "Клиенты",
    tasks: "Задачи",
    payments: "Платежи",
    maintenance: "Обслуживание",
    reports: "Отчёты",
    tenants: "Арендаторы",
    attendance: "Посещаемость",
    company: "Компания",
    activity: "Активность",
    billing: "Платежи и счета",
    contracts: "Договоры",
    activeCompany: "Активная компания",
    noCompany: "Компания ещё не привязана.",
    members: "Участники",
    active: "Активна",
    noItems: "Данных пока нет",
    add: "Добавить",
    save: "Сохранить",
    cancel: "Отмена",
    edit: "Изменить",
    delete: "Удалить",
    name: "Название",
    address: "Адрес",
    email: "Почта",
    phone: "Телефон",
    notes: "Заметки",
    titleField: "Заголовок",
    description: "Описание",
    due: "Срок",
    usage: "Использование",
    limit: "Лимит",
    unlimited: "Без лимита",
    activeProperties: "Активные объекты",
    workingTasks: "Задачи в работе",
    totalClients: "Всего клиентов",
    plan: "Текущий тариф",
    propertyStatus: {
      active: "Активен",
      vacant: "Свободен",
      maintenance: "Обслуживание",
    },
    taskStatus: {
      todo: "К выполнению",
      in_progress: "В работе",
      done: "Готово",
    },
    required: "Создайте компанию и активируйте подписку.",
    moduleReady:
      "Раздел уже отображается в панели и будет подключён к своим данным после активации модуля.",
    account: "Аккаунт и подписка",
    notifications: "Уведомления",
    noNotifications: "Новых уведомлений нет",
    notificationsLoading: "Загрузка уведомлений…",
    notificationsUnavailable: "Сейчас не удалось загрузить уведомления.",
    retryNotifications: "Повторить",
    overdueTask: "Просроченная задача",
    openMaintenance: "Открытая заявка на обслуживание",
    recentActivity: "Последняя активность",
    markRead: "Прочитано",
    kpiHint: "Обновлено по операционным данным компании",
    period: "Период",
    currentPeriod: "Текущий период",
    previousPeriod: "Предыдущий период",
    days7: "7 дней",
    days30: "30 дней",
    days90: "90 дней",
    year1: "12 месяцев",
    markAllRead: "Отметить всё прочитанным",
    priority: "Важность",
    allPriorities: "Все уведомления",
    highPriority: "Высокая",
    mediumPriority: "Средняя",
    lowPriority: "Низкая",
    exportCsv: "Экспорт CSV",
    exportPdf: "Экспорт PDF",
    compare: "Сравнение показателей",
  },
  uk: {
    title: "Панель керування",
    subtitle:
      "Практичне середовище для безпечного керування компаніями нерухомості",
    overview: "Огляд",
    dashboard: "Панель керування",
    properties: "Об'єкти",
    clients: "Клієнти",
    tasks: "Завдання",
    payments: "Платежі",
    maintenance: "Обслуговування",
    reports: "Звіти",
    tenants: "Орендарі",
    attendance: "Відвідуваність",
    company: "Компанія",
    activity: "Активність",
    billing: "Платежі та рахунки",
    contracts: "Договори",
    activeCompany: "Активна компанія",
    noCompany: "Компанію ще не прив’язано.",
    members: "Учасники",
    active: "Активна",
    noItems: "Даних ще немає",
    add: "Додати",
    save: "Зберегти",
    cancel: "Скасувати",
    edit: "Змінити",
    delete: "Видалити",
    name: "Назва",
    address: "Адреса",
    email: "Пошта",
    phone: "Телефон",
    notes: "Нотатки",
    titleField: "Заголовок",
    description: "Опис",
    due: "Термін",
    usage: "Використання",
    limit: "Ліміт",
    unlimited: "Без обмежень",
    activeProperties: "Активні об'єкти",
    workingTasks: "Завдання в роботі",
    totalClients: "Усього клієнтів",
    plan: "Поточний план",
    propertyStatus: {
      active: "Активний",
      vacant: "Вільний",
      maintenance: "Обслуговування",
    },
    taskStatus: {
      todo: "До виконання",
      in_progress: "У роботі",
      done: "Готово",
    },
    required: "Створіть компанію та активуйте підписку.",
    moduleReady:
      "Розділ уже відображається на панелі та буде підключений до власних даних після активації модуля.",
    account: "Обліковий запис і підписка",
    notifications: "Сповіщення",
    noNotifications: "Нових сповіщень немає",
    notificationsLoading: "Завантаження сповіщень…",
    notificationsUnavailable: "Не вдалося завантажити сповіщення.",
    retryNotifications: "Повторити",
    overdueTask: "Прострочене завдання",
    openMaintenance: "Відкрита заявка на обслуговування",
    recentActivity: "Остання активність",
    markRead: "Позначено як прочитане",
    kpiHint: "Оновлено з операційних даних компанії",
    period: "Період",
    currentPeriod: "Поточний період",
    previousPeriod: "Попередній період",
    days7: "7 днів",
    days30: "30 днів",
    days90: "90 днів",
    year1: "12 місяців",
    markAllRead: "Позначити все як прочитане",
    priority: "Важливість",
    allPriorities: "Усі сповіщення",
    highPriority: "Висока",
    mediumPriority: "Середня",
    lowPriority: "Низька",
    exportCsv: "Експорт CSV",
    exportPdf: "Експорт PDF",
    compare: "Порівняння показників",
  },
} as const;

const migrationDashboardCopy = {
  ar: { overline: "خارطة التحول", title: "رحلة DAR.EST Property OS", source: "مبني على تدقيق الحالة الحالي وخارطة الهجرة", roadmap: "خارطة الطريق", foundation: "الأساس المؤسسي", finance: "تشغيل التحصيل", property: "الملكية الموحدة", intelligence: "الذكاء التشغيلي", completed: "مكتمل", active: "قيد التنفيذ", planned: "مخطط", debt: "الدين التقني", critical: "حرج", high: "مرتفع", medium: "متوسط", note: "الأرقام تعرض نتائج التدقيق الحالي وتُستخدم لتحديد أولويات التحول المحافظ دون تغيير البيانات القائمة." },
  en: { overline: "Transformation roadmap", title: "DAR.EST Property OS journey", source: "Based on the current-state audit and migration roadmap", roadmap: "Roadmap", foundation: "Enterprise foundation", finance: "Collections operations", property: "Unified property", intelligence: "Operational intelligence", completed: "Complete", active: "In progress", planned: "Planned", debt: "Technical debt", critical: "Critical", high: "High", medium: "Medium", note: "Counts reflect the current audit and prioritize conservative evolution without changing existing data." },
  he: { overline: "מפת מעבר", title: "מסע DAR.EST Property OS", source: "מבוסס על ביקורת המצב הנוכחי ומפת ההגירה", roadmap: "מפת הדרך", foundation: "תשתית ארגונית", finance: "תפעול גבייה", property: "נכס מאוחד", intelligence: "מודיעין תפעולי", completed: "הושלם", active: "בביצוע", planned: "מתוכנן", debt: "חוב טכני", critical: "קריטי", high: "גבוה", medium: "בינוני", note: "המספרים משקפים את הביקורת הנוכחית ומעדפים התפתחות זהירה בלי לשנות נתונים קיימים." },
  ru: { overline: "План трансформации", title: "Путь DAR.EST Property OS", source: "На основе аудита текущего состояния и плана миграции", roadmap: "Дорожная карта", foundation: "Корпоративная основа", finance: "Операции по сбору платежей", property: "Единый объект", intelligence: "Операционная аналитика", completed: "Готово", active: "В работе", planned: "Запланировано", debt: "Технический долг", critical: "Критический", high: "Высокий", medium: "Средний", note: "Показатели отражают текущий аудит и задают приоритеты осторожного развития без изменения существующих данных." },
  uk: { overline: "План трансформації", title: "Шлях DAR.EST Property OS", source: "На основі аудиту поточного стану та плану міграції", roadmap: "Дорожня карта", foundation: "Корпоративна основа", finance: "Операції зі збору платежів", property: "Єдиний об'єкт", intelligence: "Операційна аналітика", completed: "Готово", active: "У роботі", planned: "Заплановано", debt: "Технічний борг", critical: "Критичний", high: "Високий", medium: "Середній", note: "Показники відображають поточний аудит і визначають пріоритети обережного розвитку без зміни наявних даних." },
} as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#e5c47c]/60";

const systemReportCopy = {
  ar: { csv: "تقرير الحالة CSV", pdf: "تقرير الحالة PDF", generated: "تم الإنشاء", source: "المصدر", audit: "تدقيق DAR.EST التشغيلي", status: "حالة النظام" },
  en: { csv: "Status CSV", pdf: "Status PDF", generated: "Generated", source: "Source", audit: "DAR.EST operational audit", status: "System status" },
  he: { csv: "CSV מצב מערכת", pdf: "PDF מצב מערכת", generated: "נוצר", source: "מקור", audit: "ביקורת תפעולית של DAR.EST", status: "מצב המערכת" },
  ru: { csv: "CSV статуса", pdf: "PDF статуса", generated: "Создано", source: "Источник", audit: "операционный аудит DAR.EST", status: "Статус системы" },
  uk: { csv: "CSV стану", pdf: "PDF стану", generated: "Створено", source: "Джерело", audit: "операційний аудит DAR.EST", status: "Стан системи" },
} as const;

export default function Workspace() {
  const { user, loading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const { dir, lang } = useLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
  const c = copy[lang];
  const systemReport = systemReportCopy[lang];
  const utils = trpc.useUtils();
  const access = trpc.account.access.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const active = Boolean(access.data?.active);
  const subscription = trpc.account.subscription.useQuery(
    { page: 1, pageSize: 1 },
    { enabled: Boolean(user && active) }
  );
  const company = trpc.company.current.useQuery(undefined, {
    enabled: Boolean(user && active),
  });
  const members = trpc.company.members.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const activity = trpc.company.activity.useQuery(
    { page: 1, pageSize: 5 },
    {
      enabled: Boolean(user && active && company.data?.company),
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
    }
  );
  const invoices = trpc.payments.myInvoices.useQuery(undefined, {
    enabled: Boolean(user && active),
  });
  const snapshot = trpc.resources.snapshot.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const portfolioHierarchy = trpc.portfolio.hierarchy.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const leasingCenter = trpc.portfolio.leasingCenter.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const financeCenter = trpc.finance.center.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const collectionLedger = trpc.portfolio.collections.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const operationsCenter = trpc.operations.center.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const documentsCenter = trpc.documents.center.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const companyNotifications = trpc.notifications.inbox.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const properties = trpc.resources.properties.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const clients = trpc.resources.clients.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const tasks = trpc.resources.tasks.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const legacySnapshot = trpc.legacy.snapshot.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const tenants = trpc.legacy.tenants.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const maintenance = trpc.legacy.maintenance.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const contracts = trpc.legacy.contracts.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const operationalPayments = trpc.legacy.operationalPayments.useQuery(
    undefined,
    { enabled: Boolean(user && active && company.data?.company) }
  );
  const attendance = trpc.legacy.attendance.useQuery(undefined, {
    enabled: Boolean(user && active && company.data?.company),
  });
  const [editing, setEditing] = useState<{
    kind: ResourceKey;
    id: number;
  } | null>(null);
  const [openForm, setOpenForm] = useState<ResourceKey | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [workOrderForm, setWorkOrderForm] = useState({ title: "", unitId: "", tenantId: "", vendorId: "", priority: "medium", slaHours: "48" });
  const [workOrderMessage, setWorkOrderMessage] = useState("");
  const [resolutionCosts, setResolutionCosts] = useState<Record<number, string>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationPriority, setNotificationPriority] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [performancePeriod, setPerformancePeriod] = useState<7 | 30 | 90 | 365>(
    30
  );
  const currentPlan = (subscription.data?.subscription?.planCode ??
    "monthly") as PlanCode;
  const planCode = currentPlan;
  const usage = snapshot.data?.usage ?? { properties: 0, clients: 0, tasks: 0 };
  const limits = snapshot.data?.limits ?? {
    properties: 0,
    clients: 0,
    tasks: 0,
    members: 0,
  };
  const memberTotal = members.data?.members?.length ?? 0;
  const propertyItems = (properties.data ?? []) as Array<
    Record<string, unknown>
  >;
  const clientItems = (clients.data ?? []) as Array<Record<string, unknown>>;
  const taskItems = (tasks.data ?? []) as Array<Record<string, unknown>>;
  const tenantItems = (tenants.data ?? []) as Array<Record<string, unknown>>;
  const maintenanceItems = (maintenance.data ?? []) as Array<
    Record<string, unknown>
  >;
  const contractItems = (contracts.data ?? []) as Array<
    Record<string, unknown>
  >;
  const operationalPaymentItems = (operationalPayments.data ?? []) as Array<
    Record<string, unknown>
  >;
  const attendanceItems = (attendance.data ?? []) as Array<
    Record<string, unknown>
  >;
  const portfolioItems = portfolioHierarchy.data?.portfolios ?? [];
  const buildingItems = portfolioHierarchy.data?.buildings ?? [];
  const unitItems = portfolioHierarchy.data?.units ?? [];
  const hierarchyLabels = {
    ar: { title: "هيكل المحفظة", portfolios: "محافظ", buildings: "مبانٍ", units: "وحدات", occupancy: "الإشغال", vacant: "شاغرة", occupied: "مؤجرة", empty: "لا توجد محافظ بعد" },
    en: { title: "Portfolio hierarchy", portfolios: "Portfolios", buildings: "Buildings", units: "Units", occupancy: "Occupancy", vacant: "Vacant", occupied: "Occupied", empty: "No portfolios yet" },
    he: { title: "היררכיית תיק הנכסים", portfolios: "תיקים", buildings: "בניינים", units: "יחידות", occupancy: "תפוסה", vacant: "פנויות", occupied: "מאוכלסות", empty: "אין תיקים עדיין" },
    ru: { title: "Иерархия портфеля", portfolios: "Портфели", buildings: "Здания", units: "Объекты", occupancy: "Заполняемость", vacant: "Свободно", occupied: "Занято", empty: "Портфелей пока нет" },
    uk: { title: "Ієрархія портфеля", portfolios: "Портфелі", buildings: "Будинки", units: "Одиниці", occupancy: "Заповненість", vacant: "Вільні", occupied: "Зайняті", empty: "Портфелів ще немає" },
  }[lang];
  const occupiedUnits = unitItems.filter(unit => unit.status === "occupied").length;
  const vacantUnits = unitItems.filter(unit => unit.status === "vacant").length;
  const leaseSummary = leasingCenter.data?.summary ?? { totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, expiringSoon: 0, monthlyCommittedIls: 0 };
  const documentsLabels = {
    ar: { title: "مركز المستندات", total: "إجمالي الملفات", expiring: "تنتهي خلال 30 يوماً", categories: "التصنيفات" },
    en: { title: "Document center", total: "Total files", expiring: "Expiring within 30 days", categories: "Categories" },
    he: { title: "מרכז מסמכים", total: "סה״כ קבצים", expiring: "פג תוקף בתוך 30 יום", categories: "קטגוריות" },
    ru: { title: "Центр документов", total: "Всего файлов", expiring: "Истекают за 30 дней", categories: "Категории" },
    uk: { title: "Центр документів", total: "Усього файлів", expiring: "Закінчуються за 30 днів", categories: "Категорії" },
  }[lang];
  const operationsLabels = {
    ar: { title: "مركز العمليات وأوامر العمل", open: "أعمال مفتوحة", urgent: "عاجلة", overdue: "متأخرة", vendors: "موردون نشطون" },
    en: { title: "Operations & work orders", open: "Open work", urgent: "Urgent", overdue: "Overdue", vendors: "Active vendors" },
    he: { title: "מרכז תפעול ופקודות עבודה", open: "עבודות פתוחות", urgent: "דחופות", overdue: "באיחור", vendors: "ספקים פעילים" },
    ru: { title: "Операции и рабочие заявки", open: "Открытые работы", urgent: "Срочные", overdue: "Просроченные", vendors: "Активные подрядчики" },
    uk: { title: "Операції та робочі заявки", open: "Відкриті роботи", urgent: "Термінові", overdue: "Прострочені", vendors: "Активні підрядники" },
  }[lang];
  const financeLabels = {
    ar: { title: "مركز المالية والتحصيل", expected: "التحصيل الشهري المتوقع", expenses: "مصروفات هذا الشهر", approved: "مصروفات معتمدة", risk: "مخاطر المتأخرات" },
    en: { title: "Finance & collections center", expected: "Expected monthly collection", expenses: "Expenses this month", approved: "Approved expenses", risk: "Arrears risk" },
    he: { title: "מרכז כספים וגבייה", expected: "גבייה חודשית צפויה", expenses: "הוצאות החודש", approved: "הוצאות מאושרות", risk: "סיכון פיגורים" },
    ru: { title: "Финансы и сбор платежей", expected: "Ожидаемый сбор за месяц", expenses: "Расходы за месяц", approved: "Утверждённые расходы", risk: "Риск задолженности" },
    uk: { title: "Фінанси та збір платежів", expected: "Очікуваний збір за місяць", expenses: "Витрати за місяць", approved: "Затверджені витрати", risk: "Ризик заборгованості" },
  }[lang];
  const notificationKindLabels = {
    ar: { task_overdue: "مهمة متأخرة", collection_overdue: "تحصيل متأخر", lease_expiring: "عقد ينتهي قريباً", work_order_overdue: "أمر عمل متأخر", work_order_urgent: "أمر عمل عاجل", document_expiring: "مستند ينتهي قريباً" },
    en: { task_overdue: "Overdue task", collection_overdue: "Overdue collection", lease_expiring: "Lease expiring soon", work_order_overdue: "Overdue work order", work_order_urgent: "Urgent work order", document_expiring: "Document expiring soon" },
    he: { task_overdue: "משימה באיחור", collection_overdue: "גבייה באיחור", lease_expiring: "חוזה עומד להסתיים", work_order_overdue: "פקודת עבודה באיחור", work_order_urgent: "פקודת עבודה דחופה", document_expiring: "מסמך עומד לפוג" },
    ru: { task_overdue: "Просроченная задача", collection_overdue: "Просроченный платёж", lease_expiring: "Договор скоро истекает", work_order_overdue: "Просроченная рабочая заявка", work_order_urgent: "Срочная рабочая заявка", document_expiring: "Скоро истекает документ" },
    uk: { task_overdue: "Прострочене завдання", collection_overdue: "Прострочене надходження", lease_expiring: "Договір скоро закінчується", work_order_overdue: "Прострочене робоче замовлення", work_order_urgent: "Термінове робоче замовлення", document_expiring: "Термін дії документа спливає" },
  }[lang];
  const markNotificationsRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.inbox.invalidate();
    },
    onError: error => setFormError(error.message),
  });
  const markAllNotificationsRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.inbox.invalidate();
    },
    onError: error => setFormError(error.message),
  });
  const createWorkOrder = trpc.operations.createWorkOrder.useMutation({
    onSuccess: () => {
      utils.operations.center.invalidate();
      utils.company.activity.invalidate();
      setWorkOrderForm({ title: "", unitId: "", tenantId: "", vendorId: "", priority: "medium", slaHours: "48" });
      setWorkOrderMessage(lang === "he" ? "פקודת העבודה נפתחה והועברה למרכז התפעול." : lang === "ar" ? "تم فتح أمر العمل وإرساله إلى مركز العمليات." : "Work order created and sent to Operations.");
    },
    onError: error => setWorkOrderMessage(error.message),
  });
  const updateWorkOrder = trpc.operations.updateWorkOrder.useMutation({
    onSuccess: () => {
      utils.operations.center.invalidate();
      setWorkOrderMessage(lang === "he" ? "פקודת העבודה עודכנה והעלות נשמרה." : lang === "ar" ? "تم تحديث أمر العمل وحفظ التكلفة." : "Work order updated and cost saved.");
    },
    onError: error => setWorkOrderMessage(error.message),
  });
  const createProperty = trpc.resources.createProperty.useMutation({
    onSuccess: () => {
      utils.resources.properties.invalidate();
      utils.resources.snapshot.invalidate();
      utils.company.activity.invalidate();
      resetForm();
    },
    onError: e => setFormError(e.message),
  });
  const updateProperty = trpc.resources.updateProperty.useMutation({
    onSuccess: () => {
      utils.resources.properties.invalidate();
      utils.company.activity.invalidate();
      resetForm();
    },
    onError: e => setFormError(e.message),
  });
  const deleteProperty = trpc.resources.deleteProperty.useMutation({
    onSuccess: () => {
      utils.resources.properties.invalidate();
      utils.resources.snapshot.invalidate();
      utils.company.activity.invalidate();
    },
    onError: e => setFormError(e.message),
  });
  const createClient = trpc.resources.createClient.useMutation({
    onSuccess: () => {
      utils.resources.clients.invalidate();
      utils.resources.snapshot.invalidate();
      utils.company.activity.invalidate();
      resetForm();
    },
    onError: e => setFormError(e.message),
  });
  const updateClient = trpc.resources.updateClient.useMutation({
    onSuccess: () => {
      utils.resources.clients.invalidate();
      utils.company.activity.invalidate();
      resetForm();
    },
    onError: e => setFormError(e.message),
  });
  const deleteClient = trpc.resources.deleteClient.useMutation({
    onSuccess: () => {
      utils.resources.clients.invalidate();
      utils.resources.snapshot.invalidate();
      utils.company.activity.invalidate();
    },
    onError: e => setFormError(e.message),
  });
  const createTask = trpc.resources.createTask.useMutation({
    onSuccess: () => {
      utils.resources.tasks.invalidate();
      utils.resources.snapshot.invalidate();
      utils.company.activity.invalidate();
      resetForm();
    },
    onError: e => setFormError(e.message),
  });
  const updateTask = trpc.resources.updateTask.useMutation({
    onSuccess: () => {
      utils.resources.tasks.invalidate();
      utils.company.activity.invalidate();
      resetForm();
    },
    onError: e => setFormError(e.message),
  });
  const deleteTask = trpc.resources.deleteTask.useMutation({
    onSuccess: () => {
      utils.resources.tasks.invalidate();
      utils.resources.snapshot.invalidate();
      utils.company.activity.invalidate();
    },
    onError: e => setFormError(e.message),
  });
  const createAttendance = trpc.legacy.createAttendance.useMutation({
    onSuccess: () => {
      utils.legacy.attendance.invalidate();
      utils.company.activity.invalidate();
    },
    onError: e => setFormError(e.message),
  });
  const updateAttendance = trpc.legacy.updateAttendance.useMutation({
    onSuccess: () => {
      utils.legacy.attendance.invalidate();
      utils.company.activity.invalidate();
    },
    onError: e => setFormError(e.message),
  });
  const deleteAttendance = trpc.legacy.deleteAttendance.useMutation({
    onSuccess: () => {
      utils.legacy.attendance.invalidate();
      utils.company.activity.invalidate();
    },
    onError: e => setFormError(e.message),
  });
  const busy =
    createProperty.isPending ||
    updateProperty.isPending ||
    createClient.isPending ||
    updateClient.isPending ||
    createTask.isPending ||
    updateTask.isPending;
  function resetForm() {
    setOpenForm(null);
    setEditing(null);
    setForm({});
    setFormError("");
  }
  function startCreate(kind: ResourceKey) {
    setEditing(null);
    setForm({});
    setFormError("");
    setOpenForm(kind);
  }
  function startEdit(kind: ResourceKey, item: Record<string, unknown>) {
    setEditing({ kind, id: Number(item.id) });
    setForm(
      Object.fromEntries(
        Object.entries(item).map(([key, value]) => [
          key,
          value == null
            ? ""
            : key === "dueAt"
              ? new Date(String(value)).toISOString().slice(0, 10)
              : String(value),
        ])
      )
    );
    setFormError("");
    setOpenForm(kind);
  }
  function submit(kind: ResourceKey) {
    setFormError("");
    if (kind !== "tasks" && !form.name)
      return setFormError(`${c.name} is required`);
    if (kind === "tasks" && !form.title)
      return setFormError(`${c.titleField} is required`);
    if (kind === "properties") {
      const base = {
        name: form.name ?? "",
        address: form.address || undefined,
        status: (form.status || "active") as PropertyStatus,
        notes: form.notes || undefined,
      };
      editing
        ? updateProperty.mutate({ id: editing.id, ...base })
        : createProperty.mutate(base);
    }
    if (kind === "clients") {
      const base = {
        name: form.name ?? "",
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      };
      editing
        ? updateClient.mutate({ id: editing.id, ...base })
        : createClient.mutate(base);
    }
    if (kind === "tasks") {
      const base = {
        title: form.title ?? "",
        description: form.description || undefined,
        status: (form.status || "todo") as TaskStatus,
        dueAt: form.dueAt ? new Date(`${form.dueAt}T00:00:00.000Z`) : null,
      };
      editing
        ? updateTask.mutate({ id: editing.id, ...base })
        : createTask.mutate(base);
    }
  }
  if (loading || !user || access.isLoading)
    return (
      <main
        dir={dir}
        className="grid min-h-screen place-items-center bg-[#061725] px-6 text-white"
      >
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-[#d8b26b]/30 bg-[#d8b26b]/10 text-[#e6c67d] animate-pulse">
            <Building2 size={28} />
          </div>
          <p className="mt-6 text-sm font-semibold tracking-[.18em] text-[#e6c67d]">
            DAR.EST
          </p>
          <p className="mt-2 text-xs text-white/45">{c.subtitle}</p>
          <div className="mx-auto mt-5 h-1 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#d8b26b]" />
          </div>
        </div>
      </main>
    );
  if (!active)
    return (
      <main
        dir={dir}
        className="grid min-h-screen place-items-center bg-[#071a27] px-5 text-white"
      >
        <section className="max-w-lg rounded-[2rem] border border-white/10 bg-white/[.05] p-10 text-center backdrop-blur-2xl">
          <h1 className="text-3xl font-semibold">{t("pendingActivation")}</h1>
          <p className="mt-4 text-white/55">{c.required}</p>
          <Link
            href="/account"
            className="mt-7 inline-flex rounded-full bg-[#d8b26b] px-6 py-3 font-semibold text-[#071a27]"
          >
            {c.account}
          </Link>
        </section>
      </main>
    );
  const operatingNav = {
    ar: { portfolio: "المحفظة والإشغال", collection: "التحصيل والتدفق", work: "أوامر العمل", insights: "مؤشرات القرار", leases: "العقود والمستأجرون", activity: "سجل التشغيل", salesCenter: "مركز المبيعات", salesTeam: "فريق المبيعات" },
    en: { portfolio: "Portfolio & occupancy", collection: "Collection & cash flow", work: "Work orders", insights: "Decision insights", leases: "Leases & tenants", activity: "Operating log", salesCenter: "Sales Center", salesTeam: "Sales team" },
    he: { portfolio: "תיק נכסים ותפוסה", collection: "גבייה ותזרים", work: "פקודות עבודה", insights: "תובנות החלטה", leases: "חוזים ושוכרים", activity: "יומן תפעולי", salesCenter: "מרכז מכירות", salesTeam: "צוות המכירות" },
    ru: { portfolio: "Портфель и занятость", collection: "Сбор и денежный поток", work: "Рабочие заказы", insights: "Аналитика решений", leases: "Договоры и арендаторы", activity: "Операционный журнал", salesCenter: "Центр продаж", salesTeam: "Команда продаж" },
    uk: { portfolio: "Портфель і заповненість", collection: "Збір і грошовий потік", work: "Робочі замовлення", insights: "Аналітика рішень", leases: "Договори й орендарі", activity: "Операційний журнал", salesCenter: "Центр продажів", salesTeam: "Команда продажів" },
  }[lang];
  const navigationCopy = lang === "ar"
    ? { workspace: "مساحة العمل", operations: "التشغيل", commercial: "المبيعات والفريق" }
    : lang === "he"
      ? { workspace: "סביבת עבודה", operations: "תפעול", commercial: "מכירות וצוות" }
      : { workspace: "Workspace", operations: "Operations", commercial: "Sales & team" };
  const navGroups = [
    {
      id: "workspace",
      label: navigationCopy.workspace,
      items: [
        { id: "overview", label: c.dashboard, icon: LayoutDashboard, href: "/workspace" },
        { id: "action-center", label: lang === "ar" ? "مركز العمل" : lang === "he" ? "מרכז עבודה" : "Action center", icon: ListChecks, href: "/workspace/action-center" },
        { id: "insights", label: operatingNav.insights, icon: PieChart, href: "/workspace/insights" },
        { id: "reports", label: c.reports, icon: FileBarChart2, href: "/workspace/reports" },
      ],
    },
    {
      id: "operations",
      label: navigationCopy.operations,
      items: [
        { id: "properties", label: operatingNav.portfolio, icon: Building2, href: "/workspace/portfolio" },
        { id: "tenants", label: operatingNav.leases, icon: KeyRound, href: "/workspace/leases" },
        { id: "payments", label: operatingNav.collection, icon: Wallet, href: "/workspace/collections" },
        { id: "maintenance", label: operatingNav.work, icon: Wrench, href: "/workspace/work-orders" },
        { id: "activity", label: operatingNav.activity, icon: History, href: "/workspace/operating-log" },
      ],
    },
    {
      id: "commercial",
      label: navigationCopy.commercial,
      items: [
        { id: "sales", label: operatingNav.salesCenter, icon: CircleDollarSign, href: "/sales" },
        { id: "sales-team", label: operatingNav.salesTeam, icon: Users, href: "/sales/team" },
      ],
    },
  ];
  const currentPath = typeof window === "undefined" ? "/workspace" : window.location.pathname;
	  const totalProperties = propertyItems.length;
  const activeProperties = propertyItems.filter(
    item => item.status === "active"
  ).length;
  const openMaintenance =
    legacySnapshot.data?.openMaintenance ??
    maintenanceItems.filter(item => String(item.status) !== "completed").length;
  const collectedPayments = legacySnapshot.data?.paymentsCollectedIls ?? 0;
  const dashboardKpis = [
    { label: operatingNav.portfolio, value: leaseSummary.totalUnits, icon: Building2, accent: "text-[#ff6b8e]" },
    { label: operatingNav.leases, value: leaseSummary.occupiedUnits, icon: PieChart, accent: "text-[#a88cff]" },
    { label: operatingNav.collection, value: `EGP${leaseSummary.monthlyCommittedIls.toLocaleString()}`, icon: CircleDollarSign, accent: "text-[#40cbed]" },
    { label: operatingNav.work, value: openMaintenance, icon: Wrench, accent: "text-[#ff9f70]" },
  ];
  const recentProperties = propertyItems.slice(0, 4);
  const statCards = [
    { label: c.properties, value: usage.properties, icon: Building2 },
    {
      label: c.activeProperties,
      value: propertyItems.filter(item => item.status === "active").length,
      icon: Building2,
    },
    {
      label: c.workingTasks,
      value: taskItems.filter(item => item.status === "in_progress").length,
      icon: CheckCircle2,
    },
    { label: c.totalClients, value: usage.clients, icon: Users },
    {
      label: c.tenants,
      value:
        legacySnapshot.data?.activeTenants ??
        tenantItems.filter(item => item.status === "active").length,
      icon: KeyRound,
    },
  ];
  const resourceSection = (
    kind: ResourceKey,
    title: string,
    icon: React.ReactNode,
    items: Array<Record<string, unknown>>
  ) => {
    const limit = limits[kind];
    const reached = limit !== null && usage[kind] >= limit;
    return (
      <section
        id={kind}
        className="rounded-[1.6rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_22px_48px_rgba(5,7,26,.2)] backdrop-blur-xl sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[#62d8f1]">{icon}</span>
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#a88cff]/35 bg-[#a88cff]/10 px-3 py-1 text-xs text-[#e0d7ff]">
              {c.usage}: {usage[kind]} / {limit === null ? c.unlimited : limit}
            </span>
            <button
              onClick={() => !reached && startCreate(kind)}
              disabled={reached}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-3 py-1.5 text-xs font-semibold text-[#10152f] shadow-[0_8px_22px_rgba(168,140,255,.24)] disabled:opacity-40"
            >
              <Plus size={14} />
              {c.add}
            </button>
          </div>
        </div>
        {openForm === kind && (
          <ResourceForm
            kind={kind}
            form={form}
            setForm={setForm}
            copy={c}
            editing={Boolean(editing)}
            onSubmit={() => submit(kind)}
            onCancel={resetForm}
            error={formError}
            busy={busy}
          />
        )}
        {items.length === 0 && openForm !== kind && (
          <p className="mt-6 text-sm text-white/45">{c.noItems}</p>
        )}
        <div className="mt-4 space-y-2">
          {items.map(item => (
            <div
              key={Number(item.id)}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"
            >
              <div>
                <p className="font-medium">{String(item.name ?? item.title)}</p>
                <p className="text-xs text-white/45">
                  {String(
                    item.address ??
                      item.email ??
                      item.phone ??
                      item.description ??
                      ""
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#d9bd78]">
                  {kind === "properties"
                    ? c.propertyStatus[String(item.status) as PropertyStatus]
                    : kind === "tasks"
                      ? c.taskStatus[String(item.status) as TaskStatus]
                      : ""}
                </span>
                <button
                  onClick={() => startEdit(kind, item)}
                  className="rounded-lg border border-white/10 p-2 text-white/55"
                  aria-label={c.edit}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`${c.delete}?`)) {
                      if (kind === "properties")
                        deleteProperty.mutate({ id: Number(item.id) });
                      if (kind === "clients")
                        deleteClient.mutate({ id: Number(item.id) });
                      if (kind === "tasks")
                        deleteTask.mutate({ id: Number(item.id) });
                    }
                  }}
                  className="rounded-lg border border-rose-300/10 p-2 text-rose-200/70"
                  aria-label={c.delete}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };
  const periodLabel =
    performancePeriod === 7
      ? c.days7
      : performancePeriod === 30
        ? c.days30
        : performancePeriod === 90
          ? c.days90
          : c.year1;
  const getItemDate = (item: Record<string, unknown>) => {
    const value = item.createdAt ?? item.updatedAt ?? item.dueAt;
    const date = value ? new Date(String(value)).getTime() : 0;
    return Number.isFinite(date) ? date : 0;
  };
  const countInWindow = (
    items: Array<Record<string, unknown>>,
    start: number,
    end: number
  ) =>
    items.filter(item => {
      const timestamp = getItemDate(item);
      return timestamp >= start && timestamp < end;
    }).length;
  const now = Date.now();
  const currentStart = now - performancePeriod * 24 * 60 * 60 * 1000;
  const previousStart = currentStart - performancePeriod * 24 * 60 * 60 * 1000;
  const performanceRows = [
    { label: c.properties, items: propertyItems },
    { label: c.clients, items: clientItems },
    { label: c.tasks, items: taskItems },
    { label: c.tenants, items: tenantItems },
    { label: c.contracts, items: contractItems },
    { label: c.maintenance, items: maintenanceItems },
    { label: c.payments, items: operationalPaymentItems },
  ];
  const performanceData = performanceRows.map(row => ({
    label: row.label,
    current: countInWindow(row.items, currentStart, now),
    previous: countInWindow(row.items, previousStart, currentStart),
    value: countInWindow(row.items, currentStart, now),
  }));
  const exportPerformanceCsv = () => {
    const rows = [
      [c.reports, c.currentPeriod, c.previousPeriod],
      ...performanceData.map(row => [row.label, row.current, row.previous]),
    ];
    const csv = rows
      .map(row =>
        row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `darest-kpi-${performancePeriod}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPerformancePdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("DAR.EST - KPI", 18, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${periodLabel}`, 18, 27);
    performanceData.forEach((row, index) => {
      doc.text(
        `${row.label} | current: ${row.current} | previous: ${row.previous}`,
        18,
        40 + index * 8
      );
    });
    doc.save(`darest-kpi-${performancePeriod}d.pdf`);
  };
  const systemStatusRows = [
    ["Report", "DAR.EST Property OS system status"],
    ["Audit as of", "2026-08-18"],
    ["Architecture", "React 19, Express, tRPC, Drizzle, MySQL/TiDB modular monolith"],
    ["Operations", "Portfolio, leasing, collections, finance, work orders, documents, tenant portal"],
    ["Migration progress", "Foundation hardening and collection payment-event ledger completed"],
    ["Technical debt", "Dependency remediation, isolated integration database, domain module split, background outbox/worker"],
    ["Verification", "The current release is validated with the project test suite, TypeScript checks, and a production build."],
    ["Data policy", "No customer records or payment amounts are included in this system-status export"],
  ];
  const exportSystemStatusCsv = () => {
    const rows = [
      [systemReport.status, systemReport.generated, new Date().toLocaleString()],
      [systemReport.source, systemReport.audit],
      [],
      ...systemStatusRows,
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "darest-property-os-system-status-2026-08-20.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportSystemStatusPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("DAR.EST Property OS", 18, 18);
    doc.setFontSize(11);
    doc.text("System status report — audit source: 2026-08-18", 18, 27);
    let y = 40;
    systemStatusRows.forEach(([label, value]) => {
      const lines = doc.splitTextToSize(`${label}: ${value}`, 170);
      if (y + lines.length * 6 > 275) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.text(lines, 18, y);
      y += lines.length * 6 + 5;
    });
    doc.setFontSize(8);
    doc.text("Prepared for team review. This report contains no customer records.", 18, 286);
    doc.save("darest-property-os-system-status-2026-08-20.pdf");
  };
  const notifications = companyNotifications.data?.items ?? [];
  const unreadNotificationCount = companyNotifications.data?.unreadCount ?? 0;
  const filteredNotifications =
    notificationPriority === "all"
      ? notifications
      : notifications.filter(item => item.priority === notificationPriority);
  const decisionCopy = lang === "he"
    ? { title: "מרכז החלטות", subtitle: "פעולות שדורשות תשומת לב עכשיו", vacant: "יחידות פנויות ממתינות לאכלוס", renew: "חוזים מתקרבים לחידוש", arrears: "סיכון פיגור דורש בדיקה", maintenance: "פקודות עבודה חרגו מהיעד", documents: "מסמכים מתקרבים לתפוגה", review: "עברו למסך הפעולה" }
    : lang === "ar"
      ? { title: "مركز القرارات", subtitle: "إجراءات تحتاج انتباهك الآن", vacant: "وحدات شاغرة تنتظر الإشغال", renew: "عقود تقترب من التجديد", arrears: "مخاطر متأخرات تحتاج مراجعة", maintenance: "أوامر صيانة تجاوزت الهدف", documents: "مستندات تقترب من الانتهاء", review: "الانتقال للإجراء" }
      : { title: "Decision centre", subtitle: "Actions needing attention now", vacant: "Vacant units awaiting occupancy", renew: "Leases approaching renewal", arrears: "Arrears risk needs review", maintenance: "Work orders passed their target", documents: "Documents approaching expiry", review: "Open action" };
  const operatingDecisions = [
    leaseSummary.vacantUnits > 0 ? { id: "vacant", count: leaseSummary.vacantUnits, label: decisionCopy.vacant, href: "#properties", tone: "gold" } : null,
    leaseSummary.expiringSoon > 0 ? { id: "renew", count: leaseSummary.expiringSoon, label: decisionCopy.renew, href: "#properties", tone: "amber" } : null,
    (financeCenter.data?.summary.arrearsRiskIls ?? 0) > 0 ? { id: "arrears", count: `EGP${financeCenter.data?.summary.arrearsRiskIls ?? 0}`, label: decisionCopy.arrears, href: "#payments", tone: "rose" } : null,
    (operationsCenter.data?.summary.overdue ?? 0) > 0 ? { id: "maintenance", count: operationsCenter.data?.summary.overdue ?? 0, label: decisionCopy.maintenance, href: "#maintenance", tone: "amber" } : null,
    (documentsCenter.data?.summary.expiringSoon ?? 0) > 0 ? { id: "documents", count: documentsCenter.data?.summary.expiringSoon ?? 0, label: decisionCopy.documents, href: "#documents", tone: "gold" } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const sidebar = (
    <aside
      className={
        mobileOpen
          ? "workspace-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh w-[288px] flex-col translate-x-0 overflow-hidden border-r border-white/14 bg-[linear-gradient(180deg,rgba(31,34,78,.94)_0%,rgba(18,22,55,.96)_52%,rgba(13,17,42,.98)_100%)] px-5 py-6 shadow-[18px_0_60px_rgba(4,5,22,.42)] backdrop-blur-2xl transition-transform duration-200 lg:static lg:translate-x-0"
          : "workspace-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh w-[288px] flex-col -translate-x-full overflow-hidden border-r border-white/14 bg-[linear-gradient(180deg,rgba(31,34,78,.94)_0%,rgba(18,22,55,.96)_52%,rgba(13,17,42,.98)_100%)] px-5 py-6 shadow-[18px_0_60px_rgba(4,5,22,.42)] backdrop-blur-2xl transition-transform duration-200 lg:static lg:translate-x-0"
      }
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#a88cff]/45 bg-[#a88cff]/14 text-[#d9d0ff] shadow-[0_0_28px_rgba(168,140,255,.16)]">
            <Building2 size={22} />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-[.18em] text-white">
              DAR.EST
            </p>
            <p className="text-[10px] uppercase tracking-[.2em] text-white/40">
              Property OS
            </p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-xl border border-white/10 p-2 text-white/60 lg:hidden"
          aria-label="Close menu"
        >
          <Menu size={18} />
        </button>
      </div>
      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[.055] p-3 backdrop-blur-xl">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#ff6b8e] via-[#a88cff] to-[#40cbed] text-sm font-semibold text-[#121630]">
          {(user.name ?? user.email ?? "D").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {user.name ?? user.email}
          </p>
          <p className="truncate text-xs text-white/40">
            {company.data?.company?.name ?? c.activeCompany}
          </p>
        </div>
      </div>
      <nav className="mt-8 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pe-1" aria-label={c.dashboard}>
        {navGroups.map((group) => (
          <section key={group.id} className="space-y-1.5">
            <p className="px-4 text-[10px] font-semibold uppercase tracking-[.18em] text-white/35">{group.label}</p>
            {group.items.map(({ id, label, icon: Icon, href }) => {
              const active = href === "/workspace" ? currentPath === href : currentPath === href || currentPath.startsWith(`${href}/`);
              return <a
                key={id}
                href={href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition " +
                  (active
                    ? "border border-[#a88cff]/40 bg-[linear-gradient(90deg,rgba(168,140,255,.24),rgba(64,203,237,.08))] text-white shadow-[0_8px_25px_rgba(88,70,180,.16)]"
                    : "border border-transparent text-white/55 hover:border-white/12 hover:bg-white/[.075] hover:text-white")
                }
              >
                <Icon size={18} />
                <span>{label}</span>
                <ChevronLeft className="ms-auto opacity-35 transition group-hover:opacity-80" size={15} />
              </a>;
            })}
          </section>
        ))}
      </nav>
      <div className="mt-5 shrink-0 border-t border-white/10 pt-5">
        <div className="mb-3 flex items-center justify-between text-xs text-white/45">
          <span>{c.members}</span>
          <span>
            {memberTotal} /{" "}
            {limits.members === null ? c.unlimited : limits.members}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed]"
            style={{
              width:
                limits.members === null
                  ? "38%"
                  : Math.min(
                      100,
                      (memberTotal / Math.max(1, limits.members)) * 100
                    ) + "%",
            }}
          />
        </div>
        <LocaleSwitcher />
        <button
          onClick={() => logout()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/15 bg-rose-400/[.08] px-4 py-3 text-sm text-rose-200"
        >
          <LogOut size={16} />
          {t("logout")}
        </button>
      </div>
    </aside>
  );
  return (
    <main
      dir={dir}
      className="workspace-shell min-h-screen overflow-x-hidden bg-[#414766] text-white"
    >
      <div className="workspace-stage pointer-events-none fixed inset-0 -z-0 bg-[linear-gradient(135deg,#424867_0%,#3b4162_45%,#323957_100%)]" />
      <div className="workspace-orb-one pointer-events-none fixed -right-44 -top-40 -z-0 h-[38rem] w-[38rem] rounded-full border-[5rem] border-[#b04459]/85" />
      <div className="workspace-orb-two pointer-events-none fixed -bottom-44 -left-32 -z-0 h-[31rem] w-[31rem] rounded-full border-[3.5rem] border-[#7160a8]/75" />
      <div className="pointer-events-none fixed bottom-20 left-[13%] -z-0 h-32 w-32 rounded-full bg-[#293154]/70 blur-[1px]" />
      <div className="workspace-frame relative z-10 mx-auto flex min-h-screen max-w-[1536px] overflow-hidden border-2 border-white/75 bg-[#151a3c]/88 shadow-[0_34px_110px_rgba(10,10,36,.46)] backdrop-blur-2xl sm:my-10 sm:min-h-[calc(100vh-5rem)] sm:rounded-[2.45rem] sm:mx-6 xl:mx-14">
        <div className="lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed left-4 top-4 z-30 rounded-2xl border border-white/15 bg-[#242852]/90 p-3 text-[#d9d0ff] backdrop-blur-xl"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close overlay"
          />
        )}
        {sidebar}
        <section className="min-w-0 flex-1 px-4 py-4 sm:px-7 lg:px-10 lg:py-7">
          <header className="relative mb-7 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[1.7rem] border border-white/14 bg-white/[.055] px-4 pb-4 pt-16 shadow-[0_16px_40px_rgba(7,7,27,.18)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-[#ff6b8e] before:via-[#a88cff] before:to-[#40cbed] sm:px-6 sm:py-4">
            <div className="min-w-0 ps-14 pe-16 lg:ps-0 lg:pe-0">
              <p className="text-xs font-semibold uppercase tracking-[.28em] text-[#a88cff]">
                {c.overview}
              </p>
	              <h1 className="mt-2 break-words text-[1.75rem] font-semibold leading-tight tracking-[-.02em] sm:text-4xl">
	                {c.title}
	              </h1>
	              <p className="mt-2 text-sm text-white/45">{c.subtitle}</p>
	            </div>
            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <div className="fixed end-4 top-4 z-50">
                  <LocaleSwitcher compact />
                </div>
              </div>
              <a
                href="/sales"
                className="hidden items-center gap-2 rounded-2xl border border-[#a88cff]/35 bg-[#a88cff]/12 px-4 py-3 text-sm font-medium text-[#e4dcff] transition hover:bg-[#a88cff]/22 sm:inline-flex"
              >
                <CircleDollarSign size={17} />
                {operatingNav.salesCenter}
              </a>
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(value => !value)}
                  className="relative rounded-2xl border border-white/12 bg-white/[.055] p-3 text-white/70 transition hover:-translate-y-0.5 hover:border-[#40cbed]/45 hover:text-[#8ae8f8]"
                  aria-label={c.notifications}
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={18} />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-bold text-[#071725]">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute end-0 top-14 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#092437]/95 p-3 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">
                      <p className="text-sm font-semibold">{c.notifications}</p>
                      <span className="text-xs text-white/40">
                        {companyNotifications.isLoading ? "…" : filteredNotifications.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-2 py-3">
                      <span className="text-[10px] text-white/40">
                        {c.priority}
                      </span>
                      {(
                        [
                          ["all", c.allPriorities],
                          ["high", c.highPriority],
                          ["medium", c.mediumPriority],
                          ["low", c.lowPriority],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setNotificationPriority(value)}
                          className={`rounded-full px-2 py-1 text-[10px] ${notificationPriority === value ? "bg-[#d8b26b]/20 text-[#e6c67d]" : "text-white/45 hover:text-white"}`}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={unreadNotificationCount === 0 || markAllNotificationsRead.isPending}
                        onClick={() => markAllNotificationsRead.mutate()}
                        className="ms-auto text-[10px] text-[#e6c67d] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {c.markAllRead}
                      </button>
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pt-2">
                      {companyNotifications.isLoading && (
                        <div className="space-y-2 px-2 py-1" role="status" aria-live="polite">
                          <span className="sr-only">{c.notificationsLoading}</span>
                          {[0, 1, 2].map(index => (
                            <div key={index} className="h-[74px] animate-pulse rounded-xl bg-white/[.06]" />
                          ))}
                        </div>
                      )}
                      {companyNotifications.isError && !companyNotifications.isLoading && (
                        <div className="px-2 py-6 text-center" role="alert">
                          <p className="text-xs leading-5 text-rose-200">{c.notificationsUnavailable}</p>
                          <button
                            type="button"
                            onClick={() => void companyNotifications.refetch()}
                            className="mt-3 rounded-lg border border-[#d8b26b]/35 px-3 py-1.5 text-[11px] font-semibold text-[#e6c67d] transition hover:border-[#e6c67d] hover:text-white"
                          >
                            {c.retryNotifications}
                          </button>
                        </div>
                      )}
                      {!companyNotifications.isLoading && !companyNotifications.isError && filteredNotifications.map(item => (
                        <div
                          key={item.key}
                          className={`flex items-start gap-3 rounded-xl border p-3 ${item.readAt ? "border-white/[.06] bg-white/[.02]" : "border-white/10 bg-white/[.035]"}`}
                        >
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.priority === "high" ? "bg-rose-300" : item.priority === "medium" ? "bg-amber-300" : "bg-[#e6c67d]"}`}
                          />
                          <a
                            href={item.href}
                            onClick={() => {
                              setNotificationsOpen(false);
                              if (!item.readAt) markNotificationsRead.mutate({ notificationKeys: [item.key] });
                            }}
                            className="min-w-0 flex-1 text-start"
                          >
                            <p className={`text-xs font-semibold ${item.readAt ? "text-white/55" : "text-white/85"}`}>
                              {notificationKindLabels[item.kind]}
                            </p>
                            <p className="mt-1 truncate text-xs text-white/45" title={item.subject}>
                              {item.subject}
                            </p>
                            {(item.amountIls !== null || item.dueAt) && <p className="mt-1 text-[10px] text-white/35">{item.amountIls !== null ? `EGP${item.amountIls.toLocaleString()}` : ""}{item.amountIls !== null && item.dueAt ? " · " : ""}{item.dueAt ? new Date(item.dueAt).toLocaleDateString(lang) : ""}</p>}
                          </a>
                          {!item.readAt && <button
                            type="button"
                            disabled={markNotificationsRead.isPending}
                            onClick={() => markNotificationsRead.mutate({ notificationKeys: [item.key] })}
                            className="shrink-0 text-[10px] text-[#e6c67d] hover:text-white disabled:opacity-40"
                          >
                            {c.markRead}
                          </button>}
                        </div>
                      ))}
                      {!companyNotifications.isLoading && !companyNotifications.isError && filteredNotifications.length === 0 && (
                        <p className="px-2 py-5 text-center text-xs text-white/40">
                          {c.noNotifications}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Link
                href="/account"
                className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm text-white/70"
              >
                {c.account}
              </Link>
            </div>
          </header>
	          <section
	            id="overview"
	            className="relative overflow-hidden rounded-[2rem] border border-white/16 bg-white/[.065] px-6 py-6 shadow-[0_24px_64px_rgba(7,7,28,.24)] backdrop-blur-xl sm:px-8 sm:py-7"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_92%_18%,rgba(64,203,237,.18),transparent_27%),radial-gradient(circle_at_62%_106%,rgba(168,140,255,.24),transparent_44%)]" />
	            <div className="relative flex min-h-[170px] items-end justify-between gap-8">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#40cbed]/30 bg-[#40cbed]/10 px-3 py-1 text-xs text-[#a9effb]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  {c.active}
                </span>
	                <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                  {company.data?.company?.name ?? c.activeCompany}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
                  {c.subtitle}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="/sales"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-4 py-2.5 text-sm font-semibold text-[#11152f] shadow-[0_12px_28px_rgba(168,140,255,.25)] transition hover:brightness-110"
                  >
                    <CircleDollarSign size={17} />
                    {operatingNav.salesCenter}
                  </a>
                  <Link
                    href="/sales"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/[.055] px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:border-[#a88cff]/50 hover:text-[#e4dcff]"
                  >
                    <Users size={17} />
                    {operatingNav.salesTeam}
                  </Link>
                </div>
              </div>
              <div className="hidden rounded-3xl border border-white/16 bg-white/[.055] p-5 shadow-[0_18px_38px_rgba(7,7,28,.15)] backdrop-blur-xl md:block">
                <Building2 size={50} className="text-[#62d8f1]" />
                <p className="mt-3 text-xs text-white/45">
                  {c.plan} ·{" "}
                  <span className="text-[#d9d0ff]">{planLabels[planCode]}</span>
                </p>
              </div>
            </div>
          </section>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {statCards.map(({ label, value, icon: Icon }) => (
              <article
                key={label}
                title={c.kpiHint}
                className="group relative rounded-3xl border border-white/14 bg-white/[.065] px-5 py-5 shadow-[0_14px_34px_rgba(7,7,28,.16)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-[#a88cff]/48 hover:bg-white/[.09] focus-within:-translate-y-1"
              >
                <div className="flex items-center justify-between text-white/45">
                  <span className="text-xs">{label}</span>
                  <span className="pointer-events-none absolute mt-16 hidden rounded-lg border border-white/10 bg-[#092437] px-2 py-1 text-[10px] text-white/65 shadow-xl group-hover:block">
                    {c.kpiHint}
                  </span>
                  <Icon size={18} className="text-[#62d8f1]" />
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-tight">
                  {value}
                </p>
                <div className="mt-3 h-1 w-10 rounded-full bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed]" />
              </article>
            ))}
          </section>
	          <section className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
	              <div>
	                <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">{decisionCopy.title}</p>
                <p className="mt-2 text-sm text-white/55">{decisionCopy.subtitle}</p>
              </div>
	              <span className="rounded-full border border-[#40cbed]/30 bg-[#40cbed]/10 px-3 py-1 text-xs text-[#a9effb]">{operatingDecisions.length}</span>
            </div>
	            {operatingDecisions.length > 0 ? <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{operatingDecisions.map(item => <a key={item.id} href={item.href} className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.055] p-4 hover:border-[#a88cff]/48 hover:bg-white/[.085]"><div><p className="text-lg font-semibold text-[#a9effb]">{item.count}</p><p className="mt-1 text-sm text-white/70">{item.label}</p></div><span className="text-xs text-white/45 group-hover:text-[#a9effb]">{decisionCopy.review} ←</span></a>)}</div> : <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 px-4 py-5 text-sm text-emerald-200">{lang === "he" ? "אין פעולות דחופות כרגע. המערכת ממשיכה לנטר אכלוס, גבייה, תחזוקה ומסמכים." : lang === "ar" ? "لا توجد إجراءات عاجلة الآن. يواصل النظام مراقبة الإشغال والتحصيل والصيانة والمستندات." : "No urgent actions right now. The system continues monitoring occupancy, collection, maintenance and documents."}</div>}
          </section>
	          <div className="mt-6 grid gap-6 xl:grid-cols-2">
	          <section className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl xl:col-span-2 sm:p-6">
	            <div className="flex flex-wrap items-center justify-between gap-4">
	              <div><p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">{financeLabels.title}</p><p className="mt-2 text-sm text-white/55">{financeLabels.expected}</p></div>
	              <p className="text-2xl font-semibold text-[#a9effb]">EGP{financeCenter.data?.summary.monthlyExpectedIls ?? 0}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
	              {[[financeLabels.expenses, financeCenter.data?.summary.expensesThisMonthIls ?? 0], [financeLabels.approved, financeCenter.data?.summary.approvedExpensesIls ?? 0], [financeLabels.risk, financeCenter.data?.summary.arrearsRiskIls ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.055] p-3"><p className="text-base font-semibold">EGP{value}</p><p className="mt-1 text-[10px] text-white/45">{label}</p></div>)}
	              <div className="rounded-2xl border border-[#40cbed]/20 bg-[#40cbed]/[.08] p-3"><p className="text-base font-semibold text-[#a9effb]">{financeCenter.data?.recurringCharges.length ?? 0}</p><p className="mt-1 text-[10px] text-white/45">{lang === "he" ? "חיובים פעילים" : lang === "ar" ? "مطالبات نشطة" : "Active charges"}</p></div>
            </div>
          </section>
	          <section id="documents" className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
	              <div><p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">{documentsLabels.title}</p><p className="mt-2 text-sm text-white/55">{documentsLabels.total}</p></div>
	              <div className="flex items-center gap-3"><p className="text-2xl font-semibold text-[#a9effb]">{documentsCenter.data?.summary.total ?? 0}</p><Link href="/workspace/documents" className="rounded-xl border border-[#40cbed]/35 bg-[#40cbed]/10 px-3 py-2 text-xs font-medium text-[#a9effb] hover:bg-[#40cbed]/20">{lang === "ar" ? "إدارة المستندات" : lang === "he" ? "ניהול מסמכים" : "Manage documents"}</Link></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
	              {[[documentsLabels.expiring, documentsCenter.data?.summary.expiringSoon ?? 0], [documentsLabels.categories, documentsCenter.data?.summary.categories ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.055] p-3"><p className="text-base font-semibold">{value}</p><p className="mt-1 text-[10px] text-white/45">{label}</p></div>)}
            </div>
          </section>
	          <section className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-6">
	            <div className="flex flex-wrap items-center justify-between gap-4">
	              <div><p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">{operationsLabels.title}</p><p className="mt-2 text-sm text-white/55">{operationsLabels.open}</p></div>
	              <p className="text-2xl font-semibold text-[#a9effb]">{operationsCenter.data?.summary.open ?? 0}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
	              {[[operationsLabels.urgent, operationsCenter.data?.summary.urgent ?? 0], [operationsLabels.overdue, operationsCenter.data?.summary.overdue ?? 0], [operationsLabels.vendors, operationsCenter.data?.summary.activeVendors ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.055] p-3"><p className="text-base font-semibold">{value}</p><p className="mt-1 text-[10px] text-white/45">{label}</p></div>)}
            </div>
	          </section>
	          </div>
	          <section className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-6">
	            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
	                <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">{lang === "he" ? "מסלול תחזוקה" : lang === "ar" ? "مسار صيانة تشغيلي" : "Operational maintenance"}</p>
                <h2 className="mt-2 text-xl font-semibold">{lang === "he" ? "פתחו קריאה מתוך יחידה מאוכלסת" : lang === "ar" ? "افتح طلباً من داخل وحدة ومستأجر" : "Open a request from a unit and tenant"}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{lang === "he" ? "הקריאה מתועדת מול היחידה והדייר, עם עדיפות, SLA ומעקב ביצוע." : lang === "ar" ? "يسجل الطلب على الوحدة والمستأجر، مع أولوية ووقت استجابة ومتابعة تنفيذ." : "Each request is linked to its unit and tenant, with priority, SLA, and execution tracking."}</p>
              </div>
	              <span className="rounded-full border border-[#40cbed]/30 bg-[#40cbed]/10 px-3 py-1 text-xs text-[#a9effb]">{operationsCenter.data?.summary.open ?? 0} {operationsLabels.open}</span>
            </div>
            <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={event => { event.preventDefault(); setWorkOrderMessage(""); createWorkOrder.mutate({ title: workOrderForm.title, unitId: Number(workOrderForm.unitId), tenantId: workOrderForm.tenantId ? Number(workOrderForm.tenantId) : undefined, vendorId: workOrderForm.vendorId ? Number(workOrderForm.vendorId) : undefined, priority: workOrderForm.priority as "low" | "medium" | "high" | "urgent", slaHours: Number(workOrderForm.slaHours) || 48 }); }}>
              <label className="xl:col-span-3"><span className="mb-1 block text-xs text-white/50">{lang === "he" ? "מה נדרש?" : lang === "ar" ? "ما المطلوب؟" : "What needs attention?"}</span><input required minLength={2} value={workOrderForm.title} onChange={event => setWorkOrderForm(current => ({ ...current, title: event.target.value }))} placeholder={lang === "he" ? "לדוגמה: נזילה במטבח" : lang === "ar" ? "مثال: تسرب مياه في المطبخ" : "Example: kitchen water leak"} className={inputClass} /></label>
              <label><span className="mb-1 block text-xs text-white/50">{lang === "he" ? "יחידה" : lang === "ar" ? "الوحدة" : "Unit"}</span><select required value={workOrderForm.unitId} onChange={event => setWorkOrderForm(current => ({ ...current, unitId: event.target.value }))} className={inputClass}><option value="">{lang === "he" ? "בחרו יחידה" : lang === "ar" ? "اختر الوحدة" : "Select unit"}</option>{unitItems.map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label>
              <label><span className="mb-1 block text-xs text-white/50">{lang === "he" ? "דייר (אופציונלי)" : lang === "ar" ? "المستأجر (اختياري)" : "Tenant (optional)"}</span><select value={workOrderForm.tenantId} onChange={event => setWorkOrderForm(current => ({ ...current, tenantId: event.target.value }))} className={inputClass}><option value="">{lang === "he" ? "ללא דייר" : lang === "ar" ? "بدون مستأجر" : "No tenant"}</option>{tenantItems.map(tenant => <option key={String(tenant.id)} value={String(tenant.id)}>{String(tenant.name ?? tenant.email ?? `#${tenant.id}`)}</option>)}</select></label>
              <label><span className="mb-1 block text-xs text-white/50">{lang === "he" ? "ספק (אופציונלי)" : lang === "ar" ? "المورد (اختياري)" : "Vendor (optional)"}</span><select value={workOrderForm.vendorId} onChange={event => setWorkOrderForm(current => ({ ...current, vendorId: event.target.value }))} className={inputClass}><option value="">{lang === "he" ? "הקצו בהמשך" : lang === "ar" ? "تعيين لاحقاً" : "Assign later"}</option>{(operationsCenter.data?.vendors ?? []).map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}{vendor.specialty ? ` — ${vendor.specialty}` : ""}</option>)}</select></label>
              <label><span className="mb-1 block text-xs text-white/50">{lang === "he" ? "עדיפות" : lang === "ar" ? "الأولوية" : "Priority"}</span><select value={workOrderForm.priority} onChange={event => setWorkOrderForm(current => ({ ...current, priority: event.target.value }))} className={inputClass}><option value="low">{lang === "he" ? "נמוכה" : lang === "ar" ? "منخفضة" : "Low"}</option><option value="medium">{lang === "he" ? "רגילה" : lang === "ar" ? "متوسطة" : "Medium"}</option><option value="high">{lang === "he" ? "גבוהה" : lang === "ar" ? "عالية" : "High"}</option><option value="urgent">{lang === "he" ? "דחופה" : lang === "ar" ? "عاجلة" : "Urgent"}</option></select></label>
              <label><span className="mb-1 block text-xs text-white/50">SLA</span><select value={workOrderForm.slaHours} onChange={event => setWorkOrderForm(current => ({ ...current, slaHours: event.target.value }))} className={inputClass}><option value="24">24h</option><option value="48">48h</option><option value="72">72h</option><option value="168">7d</option></select></label>
	              <div className="flex items-end"><button disabled={createWorkOrder.isPending || unitItems.length === 0} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-5 text-sm font-semibold text-[#11152f] disabled:cursor-not-allowed disabled:opacity-50" type="submit">{createWorkOrder.isPending ? (lang === "he" ? "פותח…" : lang === "ar" ? "جارٍ الفتح…" : "Opening…") : (lang === "he" ? "פתחו פקודת עבודה" : lang === "ar" ? "فتح أمر عمل" : "Open work order")}</button></div>
            </form>
	            {unitItems.length === 0 && <p className="mt-3 text-sm text-[#a9effb]">{lang === "he" ? "תחילה צרו תיק, בניין ויחידה — ואז פתחו קריאה בהקשר הנכון." : lang === "ar" ? "أنشئ محفظة ومبنى ووحدة أولاً، ثم افتح الطلب في سياقه الصحيح." : "Create a portfolio, building, and unit first, then open the request in the right context."}</p>}
	            {workOrderMessage && <p role="status" className="mt-3 text-sm text-[#a9effb]">{workOrderMessage}</p>}
	            {(operationsCenter.data?.workOrders?.length ?? 0) > 0 && <div className="mt-6 border-t border-white/10 pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">{lang === "he" ? "מעקב ביצוע" : lang === "ar" ? "متابعة التنفيذ" : "Execution tracking"}</h3><span className="text-xs text-white/45">{operationsCenter.data?.workOrders.length} {lang === "he" ? "פקודות" : lang === "ar" ? "أوامر" : "orders"}</span></div><div className="space-y-2">{operationsCenter.data?.workOrders.slice(0, 6).map(order => { const isDone = order.status === "resolved" || order.status === "closed"; return <div key={order.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/[.055] p-3 lg:grid-cols-[1fr_auto_auto]"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{order.title}</p><span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#a9effb]">{order.priority}</span><span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">{order.status}</span></div><p className="mt-1 text-xs text-white/45">{order.dueAt ? `${lang === "he" ? "יעד" : lang === "ar" ? "الموعد" : "Due"}: ${new Date(order.dueAt).toLocaleDateString()}` : ""}{order.actualCostIls !== null && order.actualCostIls !== undefined ? ` · EGP${order.actualCostIls}` : ""}</p></div>{!isDone && <input type="number" min="0" inputMode="numeric" value={resolutionCosts[order.id] ?? ""} onChange={event => setResolutionCosts(current => ({ ...current, [order.id]: event.target.value }))} placeholder={lang === "he" ? "עלות סופית EGP" : lang === "ar" ? "تكلفة الحل EGP" : "Resolution cost EGP"} className="min-h-10 rounded-lg border border-white/10 bg-white/[.055] px-3 text-sm outline-none focus:border-[#a88cff]/70" />}{!isDone && <button type="button" disabled={updateWorkOrder.isPending} onClick={() => updateWorkOrder.mutate({ workOrderId: order.id, status: "resolved", actualCostIls: resolutionCosts[order.id] ? Number(resolutionCosts[order.id]) : undefined })} className="min-h-10 rounded-lg border border-[#40cbed]/35 px-3 text-sm text-[#a9effb] disabled:opacity-50">{lang === "he" ? "סמנו כטופל" : lang === "ar" ? "تم الحل" : "Mark resolved"}</button>}{isDone && <span className="self-center text-sm text-emerald-300">{lang === "he" ? "הושלם" : lang === "ar" ? "مكتمل" : "Completed"}</span>}</div>; })}</div></div>}
          </section>
	          <section className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
	                <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">{hierarchyLabels.title}</p>
                <h2 className="mt-2 text-xl font-semibold">{company.data?.company?.name ?? c.activeCompany}</h2>
                <p className="mt-1 text-xs text-white/45">{hierarchyLabels.occupancy}: {unitItems.length ? Math.round((occupiedUnits / unitItems.length) * 100) : 0}%</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {[
                  [hierarchyLabels.portfolios, portfolioItems.length],
                  [hierarchyLabels.buildings, buildingItems.length],
                  [hierarchyLabels.units, unitItems.length],
                  [hierarchyLabels.occupied, occupiedUnits],
                ].map(([label, value]) => (
                  <div key={String(label)} className="min-w-[78px] rounded-2xl border border-white/10 bg-white/[.04] px-3 py-3">
	                    <p className="text-lg font-semibold text-[#a9effb]">{value}</p>
                    <p className="mt-1 text-[10px] text-white/45">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {portfolioItems.slice(0, 3).map(portfolio => {
                const portfolioBuildings = buildingItems.filter(building => building.portfolioId === portfolio.id);
                const portfolioUnits = unitItems.filter(unit => portfolioBuildings.some(building => building.id === unit.buildingId));
	                return <div key={portfolio.id} className="border-s border-[#a88cff]/40 ps-4"><p className="text-sm font-semibold">{portfolio.name}</p><p className="mt-1 text-xs text-white/45">{portfolioBuildings.length} {hierarchyLabels.buildings} · {portfolioUnits.length} {hierarchyLabels.units}</p></div>;
              })}
              {portfolioItems.length === 0 && <p className="text-sm text-white/45">{hierarchyLabels.empty}</p>}
            </div>
          </section>
          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
	            <article className="min-w-0 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
	                  <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">
                    {c.reports}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {c.usage} · {c.properties}, {c.clients}, {c.tasks}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-white/45">{c.period}</label>
                  <select
                    value={performancePeriod}
                    onChange={event =>
                      setPerformancePeriod(
                        Number(event.target.value) as 7 | 30 | 90 | 365
                      )
                    }
	                    className="rounded-full border border-white/10 bg-white/[.055] px-3 py-1 text-xs text-white/70"
                  >
                    <option value={7}>{c.days7}</option>
                    <option value={30}>{c.days30}</option>
                    <option value={90}>{c.days90}</option>
                    <option value={365}>{c.year1}</option>
                  </select>
                  <button
                    onClick={exportPerformanceCsv}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#40cbed]/40 hover:text-[#a9effb]"
                  >
                    <Download size={13} />
                    {c.exportCsv}
                  </button>
                  <button
                    onClick={exportPerformancePdf}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#40cbed]/40 hover:text-[#a9effb]"
                  >
                    <FileDown size={13} />
                    {c.exportPdf}
                  </button>
                  <button
                    onClick={exportSystemStatusCsv}
                    className="inline-flex items-center gap-1 rounded-full border border-[#40cbed]/30 px-3 py-1 text-xs text-[#a9effb] hover:border-[#40cbed]/70"
                  >
                    <FileBarChart2 size={13} />
                    {systemReport.csv}
                  </button>
                  <button
                    onClick={exportSystemStatusPdf}
                    className="inline-flex items-center gap-1 rounded-full border border-[#40cbed]/30 px-3 py-1 text-xs text-[#a9effb] hover:border-[#40cbed]/70"
                  >
                    <FileDown size={13} />
                    {systemReport.pdf}
                  </button>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
                    {c.plan}: {planLabels[planCode]}
                  </span>
                </div>
              </div>
              <div className="mt-5 h-[230px] min-h-[230px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={230}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient
                        id="workspaceFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#40cbed"
                          stopOpacity={0.42}
                        />
                        <stop
                          offset="100%"
                          stopColor="#40cbed"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#ffffff88", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
	                        background: "#242852",
                        border: "1px solid #ffffff1a",
                        borderRadius: 14,
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="current"
                      name={c.currentPeriod}
	                      stroke="#a9effb"
                      strokeWidth={3}
                      fill="url(#workspaceFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="previous"
                      name={c.previousPeriod}
                      stroke="#7aa9bd"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mb-2 text-xs text-white/40">
                {c.compare}: {c.currentPeriod} / {c.previousPeriod} ·{" "}
                {periodLabel}
              </p>
              <p className="text-xs text-white/35">
                {c.usage}: {usage.properties} /{" "}
                {limits.properties === null ? c.unlimited : limits.properties} ·{" "}
                {usage.clients} /{" "}
                {limits.clients === null ? c.unlimited : limits.clients} ·{" "}
                {usage.tasks} /{" "}
                {limits.tasks === null ? c.unlimited : limits.tasks}
              </p>
            </article>
	            <article className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
	                  <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">
                    {planBenefits[lang]}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {planLabels[planCode]}
                  </h2>
                </div>
	                <PieChart className="text-[#40cbed]" size={24} />
              </div>
              <div className="mt-7 space-y-4">
                {[
                  {
                    key: "properties",
                    value: usage.properties,
                    limit: limits.properties,
                    label: c.properties,
                  },
                  {
                    key: "clients",
                    value: usage.clients,
                    limit: limits.clients,
                    label: c.clients,
                  },
                  {
                    key: "tasks",
                    value: usage.tasks,
                    limit: limits.tasks,
                    label: c.tasks,
                  },
                ].map(item => (
                  <div key={item.key}>
                    <div className="mb-2 flex justify-between text-xs text-white/50">
                      <span>{item.label}</span>
                      <span>
                        {item.value} /{" "}
                        {item.limit === null ? c.unlimited : item.limit}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
	                        className="h-full rounded-full bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed]"
                        style={{
                          width:
                            item.limit === null
                              ? "34%"
                              : Math.min(
                                  100,
                                  (item.value / Math.max(1, item.limit)) * 100
                                ) + "%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/50">
                {planStatus[lang]}
              </div>
            </article>
          </section>
          <MigrationRoadmapPanel lang={lang} />
          <PortfolioOperatingCenter
            lang={lang}
            portfolios={portfolioItems}
            buildings={buildingItems}
            units={unitItems}
            tenants={tenantItems}
            leases={leasingCenter.data?.leases ?? []}
            summary={leaseSummary}
          />
          <UnifiedPropertyPanel lang={lang} buildings={buildingItems} />
          <CollectionLedger
            lang={lang}
            collections={collectionLedger.data?.collections ?? []}
            leases={leasingCenter.data?.leases ?? []}
            summary={collectionLedger.data?.summary ?? { totalDueIls: 0, totalReceivedIls: 0, outstandingIls: 0, arrearsRiskIls: 0, overdueCount: 0 }}
          />
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
	            <article className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
	                  <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">
                    {c.billing}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{c.payments}</h2>
                </div>
	                <Receipt className="text-[#40cbed]" size={22} />
              </div>
              <div className="mt-5 space-y-3">
                {(invoices.data ?? []).slice(0, 4).map(invoice => (
                  <div
                    key={invoice.id}
                    className="flex justify-between border-t border-white/10 pt-3 text-sm"
                  >
                    <span>{invoice.invoiceNumber}</span>
	                    <span className="text-[#a9effb]">
                      {invoice.amountIls} EGP
                    </span>
                  </div>
                ))}
                {!invoices.data?.length && (
                  <p className="text-sm text-white/40">{c.noItems}</p>
                )}
              </div>
            </article>
            <article
              id="activity"
              className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">
                    {c.activity}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{c.activity}</h2>
                </div>
                <History className="text-[#40cbed]" size={22} />
              </div>
              <div className="mt-5 space-y-3">
                {(activity.data?.items ?? []).map(item => (
                  <div
                    key={item.activity.id}
                    className="border-t border-white/10 pt-3 text-sm text-white/55"
                  >
                    {item.activity.action}
                  </div>
                ))}
                {!activity.data?.total && (
                  <p className="text-sm text-white/40">{c.noItems}</p>
                )}
              </div>
            </article>
          </section>
          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <article
              id="maintenance"
              className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="text-[#40cbed]" size={21} />
                  <h2 className="text-lg font-semibold">{c.maintenance}</h2>
                </div>
                <span className="text-sm text-amber-200">
                  {openMaintenance}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {maintenanceItems.slice(0, 4).map(item => (
                  <div
                    key={Number(item.id)}
                    className="border-t border-white/10 pt-3"
                  >
                    <p className="text-sm font-medium">{String(item.title)}</p>
                    <p className="text-xs text-white/40">
                      {String(item.status)} · {Number(item.costIls ?? 0)} EGP
                    </p>
                  </div>
                ))}
                {maintenanceItems.length === 0 && (
                  <p className="text-sm text-white/45">{c.noItems}</p>
                )}
              </div>
            </article>
            <article
              id="reports"
              className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="text-[#40cbed]" size={21} />
                <h2 className="text-lg font-semibold">{c.reports}</h2>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="border-s border-white/10 px-3">
                  <span className="text-xs text-white/40">{c.contracts}</span>
                  <strong className="mt-2 block text-2xl text-[#a9effb]">
                    {legacySnapshot.data?.activeContracts ??
                      contractItems.length}
                  </strong>
                </div>
                <div className="border-s border-white/10 px-3">
                  <span className="text-xs text-white/40">{c.payments}</span>
                  <strong className="mt-2 block text-2xl text-[#a9effb]">
                    {collectedPayments} EGP
                  </strong>
                </div>
              </div>
            </article>
            <article
              id="tenants"
              className="rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="text-[#40cbed]" size={21} />
                <h2 className="text-lg font-semibold">{c.tenants}</h2>
              </div>
              <div className="mt-4 space-y-3">
                {tenantItems.slice(0, 4).map(item => (
                  <div
                    key={Number(item.id)}
                    className="flex justify-between border-t border-white/10 pt-3 text-sm"
                  >
                    <span>{String(item.name)}</span>
                    <span className="text-xs text-[#a9effb]">
                      {String(item.status)}
                    </span>
                  </div>
                ))}
                {tenantItems.length === 0 && (
                  <p className="text-sm text-white/45">{c.noItems}</p>
                )}
              </div>
            </article>
          </section>
	          <section className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
              <div>
	                <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">
                  {lang === "he" ? "שיטת עבודה" : lang === "ar" ? "طريقة التشغيل" : "Operating model"}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {lang === "he" ? "כל פעולה נשארת בהקשר של יחידה וחוזה" : lang === "ar" ? "كل إجراء يبقى في سياق وحدة وعقد" : "Every action stays in the context of a unit and a lease"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                  {lang === "he" ? "בנו תיק ובניין, הגדירו יחידה, אכלסו אותה בחוזה, ו-DAR.EST יוצר חיוב חוזר ומציג את התחזוקה וההחלטות לפי אותה יחידה." : lang === "ar" ? "أنشئ محفظة ومبنى ووحدة، ثم أسكن الوحدة بعقد. ينشئ DAR.EST المطالبة المتكررة ويعرض الصيانة والقرارات في سياق الوحدة نفسها." : "Create a portfolio, building and unit, then place a tenant on a lease. DAR.EST creates recurring collection and keeps maintenance and decisions in that same unit context."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ["01", operatingNav.portfolio, "#properties"],
                  ["02", operatingNav.collection, "#payments"],
                  ["03", operatingNav.work, "#maintenance"],
                ].map(([step, label, href]) => (
	                  <a key={step} href={href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.055] px-4 py-3 text-sm text-white/70 hover:border-[#a88cff]/35 hover:text-white">
	                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] text-xs font-bold text-[#11152f]">{step}</span>
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function MigrationRoadmapPanel({ lang }: { lang: keyof typeof migrationDashboardCopy }) {
  const t = migrationDashboardCopy[lang];
  const phases = [
    { title: t.foundation, detail: t.completed, tone: "text-emerald-300 bg-emerald-400/10 border-emerald-300/20" },
    { title: t.finance, detail: t.completed, tone: "text-emerald-300 bg-emerald-400/10 border-emerald-300/20" },
	    { title: t.property, detail: t.active, tone: "text-[#a9effb] bg-[#40cbed]/10 border-[#40cbed]/25" },
    { title: t.intelligence, detail: t.planned, tone: "text-white/55 bg-white/[.045] border-white/10" },
  ];
  const debts = [
    { label: t.critical, value: "1", tone: "text-rose-300 bg-rose-400/10 border-rose-300/20" },
    { label: t.high, value: "21", tone: "text-amber-300 bg-amber-400/10 border-amber-300/20" },
    { label: t.medium, value: "49", tone: "text-sky-300 bg-sky-400/10 border-sky-300/20" },
  ];

  return (
	    <section className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-6 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
	          <p className="text-xs uppercase tracking-[.2em] text-[#a88cff]">{t.overline}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{t.title}</h2>
          <p className="mt-2 text-sm text-white/55">{t.source}</p>
        </div>
	        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#a88cff]/25 bg-[#a88cff]/10 px-3 py-1.5 text-xs text-[#d6ccff]">
          <History size={14} />
          {t.roadmap}
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">{t.roadmap}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {phases.map((phase, index) => (
              <div key={phase.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
	                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[.055] text-xs font-semibold text-[#a9effb]">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{phase.title}</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] ${phase.tone}`}>{phase.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <p className="text-sm font-medium text-white/70">{t.debt}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {debts.map(debt => (
              <div key={debt.label} className={`rounded-xl border px-3 py-3 text-center ${debt.tone}`}>
                <p className="text-xl font-semibold">{debt.value}</p>
                <p className="mt-1 text-[10px]">{debt.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-5 text-xs leading-5 text-white/40">{t.note}</p>
    </section>
  );
}

function PortfolioOperatingCenter({
  lang,
  portfolios,
  buildings,
  units,
  tenants,
  leases,
  summary,
}: {
  lang: keyof typeof copy;
  portfolios: Array<any>;
  buildings: Array<any>;
  units: Array<any>;
  tenants: Array<any>;
  leases: Array<any>;
  summary: { totalUnits: number; occupiedUnits: number; vacantUnits: number; expiringSoon: number; monthlyCommittedIls: number };
}) {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"structure" | "lease">("structure");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<Record<string, string>>({ status: "vacant", dueDay: "1" });
  const [historyTarget, setHistoryTarget] = useState<{ type: "unit" | "lease"; id: number; label: string } | null>(null);
  const l = {
    ar: { overline: "تشغيل المحفظة", title: "ابدأ من المبنى والوحدة، لا من سجل عقار منفصل", structure: "إضافة بنية", lease: "تسكين وحدة بعقد", portfolio: "اسم المحفظة / المشروع", building: "اسم المبنى", address: "موقع المبنى", unit: "رقم الوحدة", rent: "الإيجار الشهري EGP", tenant: "اسم المستأجر", email: "بريد المستأجر", phone: "هاتف المستأجر", start: "بداية العقد", end: "نهاية العقد", deposit: "التأمين EGP", create: "إنشاء البنية", activate: "تفعيل العقد والتحصيل", vacant: "وحدات متاحة", occupied: "وحدات مشغولة", renew: "عقود قريبة للتجديد", committed: "دخل شهري متعاقد عليه", empty: "أضف مشروعاً ومبنى ووحدة أولاً؛ بعدها تستطيع تسكين الوحدة بعقد وتحصل تلقائي." },
    en: { overline: "Portfolio operations", title: "Start with buildings and units—not a disconnected property record", structure: "Build structure", lease: "Place tenant on a lease", portfolio: "Portfolio / project", building: "Building name", address: "Building location", unit: "Unit number", rent: "Monthly rent EGP", tenant: "Tenant name", email: "Tenant email", phone: "Tenant phone", start: "Lease start", end: "Lease end", deposit: "Deposit EGP", create: "Create structure", activate: "Activate lease & collection", vacant: "Available units", occupied: "Occupied units", renew: "Renewals soon", committed: "Committed monthly income", empty: "Create a project, building and unit first. Then place a tenant on a lease and collection is created automatically." },
    he: { overline: "תפעול תיק נכסים", title: "מתחילים בבניין וביחידה — לא ברישום נכס מנותק", structure: "בניית המבנה", lease: "אכלוס יחידה בחוזה", portfolio: "שם התיק / הפרויקט", building: "שם הבניין", address: "מיקום הבניין", unit: "מספר יחידה", rent: "שכירות חודשית EGP", tenant: "שם השוכר", email: "דוא״ל שוכר", phone: "טלפון שוכר", start: "תחילת חוזה", end: "סיום חוזה", deposit: "פיקדון EGP", create: "יצירת מבנה", activate: "הפעלת חוזה וגבייה", vacant: "יחידות פנויות", occupied: "יחידות מאוכלסות", renew: "חידושים בקרוב", committed: "הכנסה חודשית חתומה", empty: "צרו פרויקט, בניין ויחידה תחילה. לאחר מכן אכלסו את היחידה בחוזה וגבייה נוצרת אוטומטית." },
    ru: { overline: "Операции портфеля", title: "Начните со здания и объекта, а не с отдельной записи", structure: "Создать структуру", lease: "Заселить по договору", portfolio: "Портфель / проект", building: "Название здания", address: "Адрес здания", unit: "Номер объекта", rent: "Месячная аренда EGP", tenant: "Имя арендатора", email: "Email арендатора", phone: "Телефон арендатора", start: "Начало договора", end: "Окончание договора", deposit: "Депозит EGP", create: "Создать структуру", activate: "Активировать договор и сбор", vacant: "Свободные объекты", occupied: "Занятые объекты", renew: "Скоро продление", committed: "Подписанный месячный доход", empty: "Сначала создайте проект, здание и объект. Затем заселите объект — сбор будет создан автоматически." },
    uk: { overline: "Операції портфеля", title: "Починайте з будинку й одиниці, а не окремого запису", structure: "Створити структуру", lease: "Заселити за договором", portfolio: "Портфель / проєкт", building: "Назва будинку", address: "Адреса будинку", unit: "Номер одиниці", rent: "Щомісячна оренда EGP", tenant: "Ім’я орендаря", email: "Email орендаря", phone: "Телефон орендаря", start: "Початок договору", end: "Завершення договору", deposit: "Депозит EGP", create: "Створити структуру", activate: "Активувати договір і збір", vacant: "Вільні одиниці", occupied: "Зайняті одиниці", renew: "Скоро поновлення", committed: "Підписаний місячний дохід", empty: "Спочатку створіть проєкт, будинок і одиницю. Потім заселіть одиницю — збір буде створено автоматично." },
  }[lang];
  const createPortfolio = trpc.portfolio.createPortfolio.useMutation();
  const createBuilding = trpc.portfolio.createBuilding.useMutation();
  const createUnit = trpc.portfolio.createUnit.useMutation();
  const createTenant = trpc.legacy.createTenant.useMutation();
  const activateLease = trpc.portfolio.activateLease.useMutation();
  const updateLeaseLifecycle = trpc.portfolio.updateLeaseLifecycle.useMutation();
  const revisionHistory = trpc.company.revisions.useQuery({ resourceType: historyTarget?.type ?? "unit", resourceId: historyTarget?.id ?? 1 }, { enabled: Boolean(historyTarget) });
  const pending = [createPortfolio, createBuilding, createUnit, createTenant, activateLease, updateLeaseLifecycle].some(m => m.isPending);
  const revisionsCopy = {
    ar: { title: "سجل الإصدارات", unit: "إصدارات الوحدة", lease: "إصدارات العقد", loading: "جارٍ تحميل السجل…", unavailable: "تعذر تحميل سجل الإصدارات.", retry: "إعادة المحاولة", empty: "لا توجد مراجعات محفوظة بعد.", revision: "إصدار", close: "إغلاق" },
    en: { title: "Revision history", unit: "Unit revisions", lease: "Lease revisions", loading: "Loading history…", unavailable: "Revision history could not be loaded.", retry: "Try again", empty: "No revisions recorded yet.", revision: "Revision", close: "Close" },
    he: { title: "היסטוריית גרסאות", unit: "גרסאות יחידה", lease: "גרסאות חוזה", loading: "טוען היסטוריה…", unavailable: "לא ניתן לטעון את היסטוריית הגרסאות.", retry: "ניסיון חוזר", empty: "עדיין לא נשמרו גרסאות.", revision: "גרסה", close: "סגירה" },
    ru: { title: "История версий", unit: "Версии объекта", lease: "Версии договора", loading: "Загрузка истории…", unavailable: "Не удалось загрузить историю версий.", retry: "Повторить", empty: "Версии пока не сохранены.", revision: "Версия", close: "Закрыть" },
    uk: { title: "Історія версій", unit: "Версії одиниці", lease: "Версії договору", loading: "Завантаження історії…", unavailable: "Не вдалося завантажити історію версій.", retry: "Спробувати знову", empty: "Версії ще не збережені.", revision: "Версія", close: "Закрити" },
  }[lang];
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const refresh = async () => {
    await Promise.all([utils.portfolio.hierarchy.invalidate(), utils.portfolio.leasingCenter.invalidate(), utils.finance.center.invalidate(), utils.legacy.tenants.invalidate(), utils.company.activity.invalidate()]);
  };
  const buildStructure = async () => {
    setError(""); setNotice("");
    if (!form.portfolio?.trim() || !form.building?.trim() || !form.unit?.trim()) return setError(l.empty);
    try {
      const portfolio = await createPortfolio.mutateAsync({ name: form.portfolio.trim() });
      const building = await createBuilding.mutateAsync({ portfolioId: portfolio.id, name: form.building.trim(), address: form.address?.trim() || undefined });
      await createUnit.mutateAsync({ buildingId: building.id, label: form.unit.trim(), status: "vacant", askingRentIls: form.rent ? Number(form.rent) : undefined });
      await refresh(); setNotice(l.create); setForm({ status: "vacant", dueDay: "1" });
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create structure"); }
  };
  const activate = async () => {
    setError(""); setNotice("");
    const unitId = Number(form.unitId);
    if (!unitId || !form.tenant?.trim() || !form.start || !form.end || !form.rent) return setError(l.empty);
    try {
      const tenant = await createTenant.mutateAsync({ name: form.tenant.trim(), email: form.email?.trim() || undefined, phone: form.phone?.trim() || undefined, status: "active" });
      const unit = units.find(item => Number(item.id) === unitId);
      await activateLease.mutateAsync({ unitId, tenantId: tenant.id, reference: `LEASE-${unit?.label ?? unitId}-${Date.now().toString().slice(-6)}`, startAt: new Date(`${form.start}T00:00:00.000Z`), endAt: new Date(`${form.end}T00:00:00.000Z`), monthlyRentIls: Number(form.rent), securityDepositIls: Number(form.deposit || 0), paymentDueDay: Number(form.dueDay || 1) });
      await refresh(); setNotice(l.activate); setForm({ dueDay: "1" });
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to activate lease"); }
  };
  const updateLifecycle = async (leaseId: number, update: Record<string, unknown>, success: string) => {
    setError(""); setNotice("");
    try {
      await updateLeaseLifecycle.mutateAsync({ leaseId, ...update } as any);
      await refresh(); setNotice(success);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update lease lifecycle"); }
  };
  const lifecycle = lang === "he"
    ? { title: "מחזור חיי חוזה", offer: "להציע חידוש", ready: "מוכן לכניסה", schedule: "לתאם מסירה", complete: "להשלים יציאה", deposit: "סכום פיקדון להחזרה", return: "לרשום החזר", ended: "החוזה נסגר והיחידה חזרה לפנוי" }
    : lang === "ar"
      ? { title: "دورة العقد", offer: "عرض تجديد", ready: "جاهز للدخول", schedule: "جدولة التسليم", complete: "إتمام الخروج", deposit: "مبلغ التأمين المسترد", return: "تسجيل الاسترداد", ended: "تم إنهاء العقد وأصبحت الوحدة شاغرة" }
      : lang === "ru"
        ? { title: "Цикл договора", offer: "Предложить продление", ready: "Готово к въезду", schedule: "Назначить передачу", complete: "Завершить выезд", deposit: "Возврат депозита", return: "Записать возврат", ended: "Договор закрыт, объект свободен" }
        : lang === "uk"
          ? { title: "Цикл договору", offer: "Запропонувати поновлення", ready: "Готово до заїзду", schedule: "Запланувати передачу", complete: "Завершити виїзд", deposit: "Повернення депозиту", return: "Зафіксувати повернення", ended: "Договір закрито, одиниця вільна" }
          : { title: "Lease lifecycle", offer: "Offer renewal", ready: "Ready for move-in", schedule: "Schedule handover", complete: "Complete move-out", deposit: "Deposit to return", return: "Record return", ended: "Lease ended and unit returned to vacant" };
  const field = (key: string, label: string, type = "text") => <label className="block"><span className="mb-1 block text-[11px] text-white/45">{label}</span><input type={type} value={form[key] ?? ""} onChange={e => set(key, e.target.value)} className={inputClass} /></label>;
  return <section id="properties" className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.22em] text-[#a88cff]">{l.overline}</p><h2 className="mt-2 text-2xl font-semibold">{l.title}</h2></div><div className="flex rounded-2xl border border-white/10 bg-white/[.055] p-1">{(["structure", "lease"] as const).map(value => <button key={value} onClick={() => { setMode(value); setError(""); setNotice(""); }} className={`rounded-xl px-4 py-2 text-xs font-semibold ${mode === value ? "bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] text-[#11152f]" : "text-white/55"}`}>{value === "structure" ? l.structure : l.lease}</button>)}</div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[l.occupied, summary.occupiedUnits], [l.vacant, summary.vacantUnits], [l.renew, summary.expiringSoon], [l.committed, `EGP${summary.monthlyCommittedIls.toLocaleString()}`]].map(([label, value]) => <div key={String(label)} className="border-t border-white/10 pt-3"><p className="text-xl font-semibold text-[#a9effb]">{value}</p><p className="mt-1 text-[11px] text-white/45">{label}</p></div>)}</div>
    {mode === "structure" ? <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-4 sm:grid-cols-2 xl:grid-cols-4">{field("portfolio", l.portfolio)}{field("building", l.building)}{field("address", l.address)}{field("unit", l.unit)}{field("rent", l.rent, "number")}<div className="flex items-end"><button onClick={buildStructure} disabled={pending} className="w-full rounded-xl bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-4 py-3 text-sm font-bold text-[#11152f] disabled:opacity-50">{l.create}</button></div></div> : <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-4 sm:grid-cols-2 xl:grid-cols-4"><label className="block"><span className="mb-1 block text-[11px] text-white/45">{l.unit}</span><select value={form.unitId ?? ""} onChange={e => set("unitId", e.target.value)} className={inputClass}><option value="">—</option>{units.filter(unit => unit.status === "vacant").map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label>{field("tenant", l.tenant)}{field("email", l.email, "email")}{field("phone", l.phone)}{field("rent", l.rent, "number")}{field("deposit", l.deposit, "number")}{field("start", l.start, "date")}{field("end", l.end, "date")}<div className="flex items-end"><button onClick={activate} disabled={pending || units.filter(unit => unit.status === "vacant").length === 0} className="w-full rounded-xl bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-4 py-3 text-sm font-bold text-[#11152f] disabled:opacity-50">{l.activate}</button></div></div>}
    {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}{notice && <p className="mt-3 text-xs text-emerald-300">{notice}</p>}
    <div className="mt-6 grid gap-3 md:grid-cols-2">{units.slice(0, 4).map(unit => <div key={unit.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-4 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-white/80">{unit.label}</p><p className="mt-1 text-[11px] text-white/45">{unit.status} · EGP{Number(unit.askingRentIls ?? 0).toLocaleString()}</p></div><button type="button" onClick={() => setHistoryTarget({ type: "unit", id: Number(unit.id), label: unit.label })} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-[11px] text-white/65"><History size={13} />{revisionsCopy.unit}</button></div>)}</div>
    <div className="mt-6 grid gap-3 md:grid-cols-2">{leases.slice(0, 4).map(lease => {
      const depositKey = `deposit-${lease.id}`;
      const isEnded = lease.status === "ended";
      return <div key={lease.id} className="rounded-2xl border border-white/10 bg-white/[.055] p-4 text-sm">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white/80">{lease.reference}</p><p className="mt-1 text-[11px] text-white/45">{lifecycle.title} · {lease.status} · {new Date(lease.endAt).toLocaleDateString()}</p></div><div className="flex shrink-0 flex-col items-end gap-2"><span className="text-[#a9effb]">EGP{lease.monthlyRentIls.toLocaleString()}</span><button type="button" onClick={() => setHistoryTarget({ type: "lease", id: Number(lease.id), label: lease.reference })} className="inline-flex items-center gap-1 text-[10px] text-white/55"><History size={12} />{revisionsCopy.lease}</button></div></div>
        {!isEnded && <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => updateLifecycle(Number(lease.id), { renewalDecision: "offered" }, lifecycle.offer)} disabled={pending} className="rounded-lg border border-[#40cbed]/30 px-3 py-2 text-[11px] text-[#a9effb] disabled:opacity-50">{lifecycle.offer}</button>
          <button onClick={() => updateLifecycle(Number(lease.id), { moveInStatus: "ready" }, lifecycle.ready)} disabled={pending} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] text-white/65 disabled:opacity-50">{lifecycle.ready}</button>
          <button onClick={() => updateLifecycle(Number(lease.id), { moveOutStatus: "scheduled" }, lifecycle.schedule)} disabled={pending} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] text-white/65 disabled:opacity-50">{lifecycle.schedule}</button>
        </div>}
        {!isEnded && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-36 flex-1"><span className="mb-1 block text-[10px] text-white/45">{lifecycle.deposit}</span><input type="number" min="0" max={lease.securityDepositIls} value={form[depositKey] ?? ""} onChange={e => set(depositKey, e.target.value)} className={inputClass} /></label><button onClick={() => updateLifecycle(Number(lease.id), { depositReturnedIls: Number(form[depositKey] || 0) }, lifecycle.return)} disabled={pending} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] text-white/65 disabled:opacity-50">{lifecycle.return}</button><button onClick={() => updateLifecycle(Number(lease.id), { moveOutStatus: "completed", depositReturnedIls: Number(form[depositKey] || 0) }, lifecycle.ended)} disabled={pending} className="rounded-lg bg-rose-400/15 px-3 py-2 text-[11px] text-rose-200 disabled:opacity-50">{lifecycle.complete}</button></div>}
        {isEnded && <p className="mt-3 text-xs text-emerald-300">{lifecycle.ended}</p>}
      </div>;
    })}{leases.length === 0 && <p className="text-sm text-white/45">{l.empty}</p>}</div>
    {historyTarget && <div className="mt-5 rounded-2xl border border-white/14 bg-white/[.055] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-[#a88cff]">{revisionsCopy.title}</p><h3 className="mt-1 text-sm font-semibold text-white">{historyTarget.label}</h3></div><button type="button" onClick={() => setHistoryTarget(null)} className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-white/65">{revisionsCopy.close}</button></div><div className="mt-4 space-y-2">{revisionHistory.isLoading && <p className="text-xs text-white/45">{revisionsCopy.loading}</p>}{revisionHistory.isError && <div className="flex flex-wrap items-center gap-3"><p className="text-xs text-rose-300">{revisionsCopy.unavailable}</p><button type="button" onClick={() => revisionHistory.refetch()} className="rounded-lg border border-rose-300/35 px-3 py-1.5 text-[11px] text-rose-100">{revisionsCopy.retry}</button></div>}{!revisionHistory.isLoading && !revisionHistory.isError && (revisionHistory.data?.length ?? 0) === 0 && <p className="text-xs text-white/45">{revisionsCopy.empty}</p>}{revisionHistory.data?.map(item => <div key={item.revision.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs"><div><span className="font-semibold text-[#a9effb]">{revisionsCopy.revision} {item.revision.revisionNumber}</span><span className="mx-2 text-white/25">·</span><span className="text-white/70">{item.revision.summary}</span></div><span className="text-white/40">{item.actor?.name ?? item.actor?.email ?? "—"} · {new Date(item.revision.createdAt).toLocaleString()}</span></div>)}</div></div>}
  </section>;
}

function UnifiedPropertyPanel({ lang, buildings }: { lang: keyof typeof copy; buildings: Array<any> }) {
  const utils = trpc.useUtils();
  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [floorForm, setFloorForm] = useState({ label: "", floorNumber: "", notes: "" });
  const [roomForm, setRoomForm] = useState({ label: "", floorId: "", roomType: "common", areaSqm: "", notes: "" });
  const [amenityForm, setAmenityForm] = useState({ name: "", category: "other", status: "active", notes: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const words = {
    ar: { overline: "الملكية الموحدة", title: "هيكل المبنى: طوابق وغرف ومرافق", select: "اختر مبنى لبدء الإدارة", floor: "طابق", floors: "الطوابق", room: "غرفة", rooms: "الغرف", amenity: "مرفق", amenities: "المرافق", label: "الاسم / الرمز", number: "رقم الطابق", type: "النوع", area: "المساحة م²", category: "الفئة", status: "الحالة", notes: "ملاحظات تشغيلية", addFloor: "إضافة طابق", addRoom: "إضافة غرفة", addAmenity: "إضافة مرفق", noFloors: "لم تُسجل طوابق بعد.", noRooms: "لم تُسجل غرف أو مساحات مشتركة بعد.", noAmenities: "لم تُسجل مرافق بعد.", chooseFloor: "بدون ربط بطابق", ready: "تم حفظ التحديث ضمن المبنى.", details: "اختر مبنى قائماً لإضافة تفاصيل تشغيلية دون إنشاء سجل منفصل.", common: "مشتركة", storage: "تخزين", parking: "مواقف", amenityType: "مساحة مرفق", office: "مكتب", retail: "تجاري", other: "أخرى", security: "أمن", utilities: "خدمات", recreation: "ترفيه", accessibility: "وصول", services: "خدمات مقيمة", active: "نشط", maintenance: "صيانة", inactive: "غير نشط" },
    en: { overline: "Unified property", title: "Building structure: floors, rooms and amenities", select: "Select a building to begin managing", floor: "Floor", floors: "Floors", room: "Room", rooms: "Rooms", amenity: "Amenity", amenities: "Amenities", label: "Name / reference", number: "Floor number", type: "Type", area: "Area m²", category: "Category", status: "Status", notes: "Operational notes", addFloor: "Add floor", addRoom: "Add room", addAmenity: "Add amenity", noFloors: "No floors recorded yet.", noRooms: "No rooms or common spaces recorded yet.", noAmenities: "No amenities recorded yet.", chooseFloor: "Not linked to a floor", ready: "Update saved within the building.", details: "Choose an existing building to add operating details without creating a disconnected record.", common: "Common", storage: "Storage", parking: "Parking", amenityType: "Amenity space", office: "Office", retail: "Retail", other: "Other", security: "Security", utilities: "Utilities", recreation: "Recreation", accessibility: "Accessibility", services: "Resident services", active: "Active", maintenance: "Maintenance", inactive: "Inactive" },
    he: { overline: "נכס מאוחד", title: "מבנה הבניין: קומות, חדרים ומתקנים", select: "בחרו בניין כדי להתחיל בניהול", floor: "קומה", floors: "קומות", room: "חדר", rooms: "חדרים", amenity: "מתקן", amenities: "מתקנים", label: "שם / סימוכין", number: "מספר קומה", type: "סוג", area: "שטח מ״ר", category: "קטגוריה", status: "מצב", notes: "הערות תפעול", addFloor: "הוספת קומה", addRoom: "הוספת חדר", addAmenity: "הוספת מתקן", noFloors: "טרם הוגדרו קומות.", noRooms: "טרם הוגדרו חדרים או שטחים משותפים.", noAmenities: "טרם הוגדרו מתקנים.", chooseFloor: "ללא שיוך לקומה", ready: "העדכון נשמר בבניין.", details: "בחרו בניין קיים כדי להוסיף פרטי תפעול בלי ליצור רשומה מנותקת.", common: "משותף", storage: "אחסון", parking: "חניה", amenityType: "שטח מתקן", office: "משרד", retail: "מסחרי", other: "אחר", security: "אבטחה", utilities: "תשתיות", recreation: "פנאי", accessibility: "נגישות", services: "שירותי דיירים", active: "פעיל", maintenance: "בתחזוקה", inactive: "לא פעיל" },
    ru: { overline: "Единый объект", title: "Структура здания: этажи, помещения и удобства", select: "Выберите здание для управления", floor: "Этаж", floors: "Этажи", room: "Помещение", rooms: "Помещения", amenity: "Удобство", amenities: "Удобства", label: "Название / ссылка", number: "Номер этажа", type: "Тип", area: "Площадь м²", category: "Категория", status: "Статус", notes: "Операционные заметки", addFloor: "Добавить этаж", addRoom: "Добавить помещение", addAmenity: "Добавить удобство", noFloors: "Этажи ещё не добавлены.", noRooms: "Помещения или общие зоны ещё не добавлены.", noAmenities: "Удобства ещё не добавлены.", chooseFloor: "Без привязки к этажу", ready: "Изменение сохранено в здании.", details: "Выберите существующее здание, чтобы добавить рабочие детали без отдельной записи.", common: "Общее", storage: "Хранение", parking: "Парковка", amenityType: "Зона удобства", office: "Офис", retail: "Торговое", other: "Другое", security: "Безопасность", utilities: "Коммунальные услуги", recreation: "Отдых", accessibility: "Доступность", services: "Услуги жильцам", active: "Активно", maintenance: "Обслуживание", inactive: "Неактивно" },
    uk: { overline: "Єдиний об'єкт", title: "Структура будинку: поверхи, приміщення та зручності", select: "Оберіть будинок для керування", floor: "Поверх", floors: "Поверхи", room: "Приміщення", rooms: "Приміщення", amenity: "Зручність", amenities: "Зручності", label: "Назва / посилання", number: "Номер поверху", type: "Тип", area: "Площа м²", category: "Категорія", status: "Статус", notes: "Операційні нотатки", addFloor: "Додати поверх", addRoom: "Додати приміщення", addAmenity: "Додати зручність", noFloors: "Поверхів ще немає.", noRooms: "Приміщення або спільні зони ще не додані.", noAmenities: "Зручності ще не додані.", chooseFloor: "Без прив’язки до поверху", ready: "Зміну збережено в будинку.", details: "Оберіть наявний будинок, щоб додати операційні деталі без окремого запису.", common: "Спільне", storage: "Зберігання", parking: "Паркування", amenityType: "Зона зручностей", office: "Офіс", retail: "Торгівля", other: "Інше", security: "Безпека", utilities: "Комунальні послуги", recreation: "Відпочинок", accessibility: "Доступність", services: "Послуги мешканцям", active: "Активно", maintenance: "Обслуговування", inactive: "Неактивно" },
  }[lang];
  const property = trpc.portfolio.unifiedProperty.useQuery({ buildingId: buildingId ?? 1 }, { enabled: buildingId !== null });
  const createFloor = trpc.portfolio.createFloor.useMutation();
  const createRoom = trpc.portfolio.createRoom.useMutation();
  const createAmenity = trpc.portfolio.createAmenity.useMutation();
  const busy = createFloor.isPending || createRoom.isPending || createAmenity.isPending;
  const selectedBuilding = buildings.find(building => Number(building.id) === buildingId);
  const refresh = async () => {
    if (buildingId === null) return;
    await Promise.all([utils.portfolio.unifiedProperty.invalidate({ buildingId }), utils.company.activity.invalidate()]);
  };
  const reportError = (cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to save property details");
  const addFloor = async () => {
    if (buildingId === null || !floorForm.label.trim()) return;
    setError(""); setNotice("");
    try {
      await createFloor.mutateAsync({ buildingId, label: floorForm.label.trim(), floorNumber: floorForm.floorNumber.trim() ? Number(floorForm.floorNumber) : null, notes: floorForm.notes.trim() || null });
      await refresh(); setFloorForm({ label: "", floorNumber: "", notes: "" }); setNotice(words.ready);
    } catch (cause) { reportError(cause); }
  };
  const addRoom = async () => {
    if (buildingId === null || !roomForm.label.trim()) return;
    setError(""); setNotice("");
    try {
      await createRoom.mutateAsync({ buildingId, label: roomForm.label.trim(), floorId: roomForm.floorId ? Number(roomForm.floorId) : null, roomType: roomForm.roomType as any, areaSqm: roomForm.areaSqm.trim() ? Number(roomForm.areaSqm) : null, notes: roomForm.notes.trim() || null });
      await refresh(); setRoomForm({ label: "", floorId: "", roomType: "common", areaSqm: "", notes: "" }); setNotice(words.ready);
    } catch (cause) { reportError(cause); }
  };
  const addAmenity = async () => {
    if (buildingId === null || !amenityForm.name.trim()) return;
    setError(""); setNotice("");
    try {
      await createAmenity.mutateAsync({ buildingId, name: amenityForm.name.trim(), category: amenityForm.category as any, status: amenityForm.status as any, notes: amenityForm.notes.trim() || null });
      await refresh(); setAmenityForm({ name: "", category: "other", status: "active", notes: "" }); setNotice(words.ready);
    } catch (cause) { reportError(cause); }
  };
  const labelForRoom = (value: string) => ({ common: words.common, storage: words.storage, parking: words.parking, amenity: words.amenityType, office: words.office, retail: words.retail, other: words.other } as Record<string, string>)[value] ?? value;
  const labelForCategory = (value: string) => ({ security: words.security, utilities: words.utilities, recreation: words.recreation, accessibility: words.accessibility, services: words.services, other: words.other } as Record<string, string>)[value] ?? value;
  const labelForStatus = (value: string) => ({ active: words.active, maintenance: words.maintenance, inactive: words.inactive } as Record<string, string>)[value] ?? value;
  return <section className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-7">
    <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs uppercase tracking-[.22em] text-[#a88cff]">{words.overline}</p><h2 className="mt-2 text-2xl font-semibold">{words.title}</h2><p className="mt-2 text-sm text-white/50">{words.details}</p></div><label className="w-full max-w-sm"><span className="mb-1 block text-[11px] text-white/45">{words.select}</span><select value={buildingId ?? ""} onChange={event => { setBuildingId(event.target.value ? Number(event.target.value) : null); setError(""); setNotice(""); }} className={inputClass}><option value="">—</option>{buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label></div>
    {!selectedBuilding ? <div className="py-10 text-center text-sm text-white/45">{buildings.length === 0 ? words.details : words.select}</div> : <>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full border border-[#40cbed]/25 bg-[#40cbed]/10 px-3 py-1 text-[#a9effb]">{selectedBuilding.name}</span><span className="text-white/40">{property.isFetching ? "…" : `${property.data?.floors.length ?? 0} ${words.floors} · ${property.data?.rooms.length ?? 0} ${words.rooms} · ${property.data?.amenities.length ?? 0} ${words.amenities}`}</span></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <article className="border-t border-white/10 pt-4"><h3 className="text-sm font-semibold text-white">{words.floors}</h3><div className="mt-3 grid gap-2">{property.data?.floors.map(floor => <div key={floor.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.055] px-3 py-2"><span className="text-sm text-white/80">{floor.label}</span><span className="text-xs text-[#a9effb]">{floor.floorNumber ?? "—"}</span></div>)}{!property.isLoading && property.data?.floors.length === 0 && <p className="text-xs text-white/40">{words.noFloors}</p>}</div><div className="mt-4 grid gap-2"><input value={floorForm.label} onChange={event => setFloorForm(current => ({ ...current, label: event.target.value }))} placeholder={words.label} className={inputClass} /><input type="number" value={floorForm.floorNumber} onChange={event => setFloorForm(current => ({ ...current, floorNumber: event.target.value }))} placeholder={words.number} className={inputClass} /><input value={floorForm.notes} onChange={event => setFloorForm(current => ({ ...current, notes: event.target.value }))} placeholder={words.notes} className={inputClass} /><button onClick={addFloor} disabled={busy} className="rounded-xl bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-4 py-2.5 text-sm font-semibold text-[#11152f] disabled:opacity-50">{words.addFloor}</button></div></article>
        <article className="border-t border-white/10 pt-4"><h3 className="text-sm font-semibold text-white">{words.rooms}</h3><div className="mt-3 grid gap-2">{property.data?.rooms.map(room => <div key={room.id} className="rounded-xl border border-white/10 bg-white/[.055] px-3 py-2"><p className="text-sm text-white/80">{room.label}</p><p className="mt-1 text-[11px] text-white/45">{labelForRoom(room.roomType)}{room.areaSqm != null ? ` · ${room.areaSqm} m²` : ""}</p></div>)}{!property.isLoading && property.data?.rooms.length === 0 && <p className="text-xs text-white/40">{words.noRooms}</p>}</div><div className="mt-4 grid gap-2"><input value={roomForm.label} onChange={event => setRoomForm(current => ({ ...current, label: event.target.value }))} placeholder={words.label} className={inputClass} /><select value={roomForm.floorId} onChange={event => setRoomForm(current => ({ ...current, floorId: event.target.value }))} className={inputClass}><option value="">{words.chooseFloor}</option>{property.data?.floors.map(floor => <option key={floor.id} value={floor.id}>{floor.label}</option>)}</select><div className="grid grid-cols-2 gap-2"><select value={roomForm.roomType} onChange={event => setRoomForm(current => ({ ...current, roomType: event.target.value }))} className={inputClass}>{["common", "storage", "parking", "amenity", "office", "retail", "other"].map(value => <option key={value} value={value}>{labelForRoom(value)}</option>)}</select><input type="number" min="0" value={roomForm.areaSqm} onChange={event => setRoomForm(current => ({ ...current, areaSqm: event.target.value }))} placeholder={words.area} className={inputClass} /></div><input value={roomForm.notes} onChange={event => setRoomForm(current => ({ ...current, notes: event.target.value }))} placeholder={words.notes} className={inputClass} /><button onClick={addRoom} disabled={busy} className="rounded-xl border border-[#40cbed]/35 bg-[#40cbed]/10 px-4 py-2.5 text-sm font-semibold text-[#a9effb] disabled:opacity-50">{words.addRoom}</button></div></article>
        <article className="border-t border-white/10 pt-4"><h3 className="text-sm font-semibold text-white">{words.amenities}</h3><div className="mt-3 grid gap-2">{property.data?.amenities.map(amenity => <div key={amenity.id} className="rounded-xl border border-white/10 bg-white/[.055] px-3 py-2"><div className="flex justify-between gap-2"><p className="text-sm text-white/80">{amenity.name}</p><span className={amenity.status === "active" ? "text-[11px] text-emerald-300" : amenity.status === "maintenance" ? "text-[11px] text-amber-300" : "text-[11px] text-white/40"}>{labelForStatus(amenity.status)}</span></div><p className="mt-1 text-[11px] text-white/45">{labelForCategory(amenity.category)}</p></div>)}{!property.isLoading && property.data?.amenities.length === 0 && <p className="text-xs text-white/40">{words.noAmenities}</p>}</div><div className="mt-4 grid gap-2"><input value={amenityForm.name} onChange={event => setAmenityForm(current => ({ ...current, name: event.target.value }))} placeholder={words.label} className={inputClass} /><div className="grid grid-cols-2 gap-2"><select value={amenityForm.category} onChange={event => setAmenityForm(current => ({ ...current, category: event.target.value }))} className={inputClass}>{["security", "utilities", "recreation", "accessibility", "services", "other"].map(value => <option key={value} value={value}>{labelForCategory(value)}</option>)}</select><select value={amenityForm.status} onChange={event => setAmenityForm(current => ({ ...current, status: event.target.value }))} className={inputClass}>{["active", "maintenance", "inactive"].map(value => <option key={value} value={value}>{labelForStatus(value)}</option>)}</select></div><input value={amenityForm.notes} onChange={event => setAmenityForm(current => ({ ...current, notes: event.target.value }))} placeholder={words.notes} className={inputClass} /><button onClick={addAmenity} disabled={busy} className="rounded-xl border border-[#40cbed]/35 bg-[#40cbed]/10 px-4 py-2.5 text-sm font-semibold text-[#a9effb] disabled:opacity-50">{words.addAmenity}</button></div></article>
      </div>
      {error && <p className="mt-4 text-xs text-rose-300">{error}</p>}{notice && <p className="mt-4 text-xs text-emerald-300">{notice}</p>}
    </>}
  </section>;
}

function CollectionLedger({
  lang,
  collections,
  leases,
  summary,
}: {
  lang: keyof typeof copy;
  collections: Array<any>;
  leases: Array<any>;
  summary: { totalDueIls: number; totalReceivedIls: number; outstandingIls: number; arrearsRiskIls: number; overdueCount: number };
}) {
  const utils = trpc.useUtils();
  const [paymentAmounts, setPaymentAmounts] = useState<Record<number, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<number, "cash" | "bank" | "card" | "transfer" | "other">>({});
  const [paymentIdempotencyKeys, setPaymentIdempotencyKeys] = useState<Record<number, string>>({});
  const [periodForm, setPeriodForm] = useState({ leaseId: "", periodLabel: "", dueAt: "", amountDueIls: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const words = {
    ar: { overline: "دفتر تحصيل الإيجارات", title: "تابع كل استحقاق ضمن سياق العقد والوحدة", due: "المستحق", received: "المستلم", outstanding: "المتبقي", overdue: "متأخر", period: "الفترة", method: "طريقة الدفع", record: "تسجيل دفعة", add: "إضافة فترة تحصيل", lease: "العقد", amount: "المبلغ EGP", dueAt: "تاريخ الاستحقاق", empty: "ستظهر فترات التحصيل هنا بعد تفعيل عقد إيجار.", success: "تم تسجيل الدفعة وتحديث حالة التحصيل.", periodSuccess: "تمت إضافة فترة التحصيل إلى العقد.", balance: "الرصيد", lastPayment: "آخر دفعة موثقة", invalidPayment: "أدخل مبلغاً صحيحاً ضمن الرصيد المتبقي.", completePeriod: "أكمل بيانات فترة التحصيل أولاً.", cash: "نقداً", bank: "بنك", card: "بطاقة", transfer: "تحويل", other: "أخرى" },
    en: { overline: "Lease collection ledger", title: "Track every due period in the context of its lease and unit", due: "Due", received: "Received", outstanding: "Outstanding", overdue: "Overdue", period: "Period", method: "Payment method", record: "Record payment", add: "Add collection period", lease: "Lease", amount: "Amount EGP", dueAt: "Due date", empty: "Collection periods will appear here once a lease is active.", success: "Payment recorded and collection status updated.", periodSuccess: "Collection period added to the lease.", balance: "Balance", lastPayment: "Latest recorded payment", invalidPayment: "Enter a valid amount within the remaining balance.", completePeriod: "Complete the collection period details first.", cash: "Cash", bank: "Bank", card: "Card", transfer: "Transfer", other: "Other" },
    he: { overline: "פנקס גביית שכירות", title: "כל מועד תשלום נשאר בהקשר של החוזה והיחידה", due: "לחיוב", received: "התקבל", outstanding: "יתרה", overdue: "באיחור", period: "תקופה", method: "אמצעי תשלום", record: "רישום תשלום", add: "הוספת תקופת גבייה", lease: "חוזה", amount: "סכום EGP", dueAt: "מועד תשלום", empty: "תקופות הגבייה יוצגו כאן לאחר הפעלת חוזה שכירות.", success: "התשלום נרשם ומצב הגבייה עודכן.", periodSuccess: "תקופת גבייה נוספה לחוזה.", balance: "יתרה", lastPayment: "תשלום מתועד אחרון", invalidPayment: "יש להזין סכום תקין במסגרת היתרה.", completePeriod: "יש להשלים תחילה את פרטי תקופת הגבייה.", cash: "מזומן", bank: "בנק", card: "כרטיס", transfer: "העברה", other: "אחר" },
    ru: { overline: "Реестр арендных платежей", title: "Каждый срок оплаты остаётся в контексте договора и объекта", due: "К оплате", received: "Получено", outstanding: "Остаток", overdue: "Просрочено", period: "Период", method: "Способ оплаты", record: "Записать платёж", add: "Добавить период", lease: "Договор", amount: "Сумма EGP", dueAt: "Срок оплаты", empty: "Периоды оплаты появятся здесь после активации договора.", success: "Платёж записан, статус обновлён.", periodSuccess: "Период оплаты добавлен к договору.", balance: "Остаток", lastPayment: "Последний зарегистрированный платёж", invalidPayment: "Введите корректную сумму в пределах остатка.", completePeriod: "Сначала заполните данные периода оплаты.", cash: "Наличные", bank: "Банк", card: "Карта", transfer: "Перевод", other: "Другое" },
    uk: { overline: "Реєстр орендних платежів", title: "Кожен строк платежу залишається в контексті договору й одиниці", due: "До сплати", received: "Отримано", outstanding: "Залишок", overdue: "Прострочено", period: "Період", method: "Спосіб оплати", record: "Записати платіж", add: "Додати період", lease: "Договір", amount: "Сума EGP", dueAt: "Строк оплати", empty: "Періоди оплат з’являться тут після активації договору.", success: "Платіж записано, статус оновлено.", periodSuccess: "Період оплати додано до договору.", balance: "Залишок", lastPayment: "Останній зафіксований платіж", invalidPayment: "Введіть коректну суму в межах залишку.", completePeriod: "Спочатку заповніть дані періоду оплати.", cash: "Готівка", bank: "Банк", card: "Картка", transfer: "Переказ", other: "Інше" },
  }[lang];
  const refresh = async () => {
    await Promise.all([utils.portfolio.collections.invalidate(), utils.finance.center.invalidate(), utils.company.activity.invalidate()]);
  };
  const recordPayment = trpc.portfolio.recordPayment.useMutation({
    onSuccess: async () => { await refresh(); setNotice(words.success); setError(""); },
    onError: cause => setError(cause.message),
  });
  const createPeriod = trpc.portfolio.createCollectionPeriod.useMutation({
    onSuccess: async () => { await refresh(); setNotice(words.periodSuccess); setError(""); setPeriodForm({ leaseId: "", periodLabel: "", dueAt: "", amountDueIls: "" }); },
    onError: cause => setError(cause.message),
  });
  const busy = recordPayment.isPending || createPeriod.isPending;
  const record = (collection: any) => {
    const balance = collection.amountDueIls - collection.amountReceivedIls;
    const amountIls = Number(paymentAmounts[collection.id] ?? balance);
    setError(""); setNotice("");
    if (!Number.isInteger(amountIls) || amountIls <= 0 || amountIls > balance) return setError(words.invalidPayment);
    const idempotencyKey = paymentIdempotencyKeys[collection.id] ?? crypto.randomUUID();
    if (!paymentIdempotencyKeys[collection.id]) setPaymentIdempotencyKeys(prev => ({ ...prev, [collection.id]: idempotencyKey }));
    recordPayment.mutate({ collectionId: Number(collection.id), amountIls, paymentMethod: paymentMethods[collection.id] ?? "transfer", idempotencyKey });
  };
  const create = () => {
    setError(""); setNotice("");
    if (!periodForm.leaseId || !periodForm.periodLabel.trim() || !periodForm.dueAt || !periodForm.amountDueIls) return setError(words.completePeriod);
    createPeriod.mutate({ leaseId: Number(periodForm.leaseId), periodLabel: periodForm.periodLabel.trim(), dueAt: new Date(`${periodForm.dueAt}T00:00:00.000Z`), amountDueIls: Number(periodForm.amountDueIls) });
  };
  const activeLeases = leases.filter(lease => lease.status === "active" || lease.status === "notice");
  return <section id="payments" className="mt-6 rounded-[1.7rem] border border-white/14 bg-white/[.055] p-5 shadow-[0_16px_42px_rgba(7,7,28,.18)] backdrop-blur-xl sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.22em] text-[#a88cff]">{words.overline}</p><h2 className="mt-2 text-2xl font-semibold">{words.title}</h2></div><div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:flex sm:gap-5"><span><b className="text-[#a9effb]">EGP{summary.totalDueIls.toLocaleString()}</b> {words.due}</span><span><b className="text-emerald-300">EGP{summary.totalReceivedIls.toLocaleString()}</b> {words.received}</span><span><b className="text-rose-300">EGP{summary.arrearsRiskIls.toLocaleString()}</b> {words.overdue}</span><span><b className="text-white">EGP{summary.outstandingIls.toLocaleString()}</b> {words.outstanding}</span></div></div>
    <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-4 sm:grid-cols-2 xl:grid-cols-5"><label><span className="mb-1 block text-[11px] text-white/45">{words.lease}</span><select value={periodForm.leaseId} onChange={event => setPeriodForm(prev => ({ ...prev, leaseId: event.target.value }))} className={inputClass}><option value="">—</option>{activeLeases.map(lease => <option key={lease.id} value={lease.id}>{lease.reference}</option>)}</select></label><label><span className="mb-1 block text-[11px] text-white/45">{words.period}</span><input value={periodForm.periodLabel} onChange={event => setPeriodForm(prev => ({ ...prev, periodLabel: event.target.value }))} placeholder="2026-09" className={inputClass} /></label><label><span className="mb-1 block text-[11px] text-white/45">{words.dueAt}</span><input type="date" value={periodForm.dueAt} onChange={event => setPeriodForm(prev => ({ ...prev, dueAt: event.target.value }))} className={inputClass} /></label><label><span className="mb-1 block text-[11px] text-white/45">{words.amount}</span><input type="number" min="1" value={periodForm.amountDueIls} onChange={event => setPeriodForm(prev => ({ ...prev, amountDueIls: event.target.value }))} className={inputClass} /></label><div className="flex items-end"><button onClick={create} disabled={busy || activeLeases.length === 0} className="w-full rounded-xl border border-[#40cbed]/35 bg-[#40cbed]/10 px-4 py-3 text-sm font-semibold text-[#a9effb] disabled:opacity-50">{words.add}</button></div></div>
    {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}{notice && <p className="mt-3 text-xs text-emerald-300">{notice}</p>}
    <div className="mt-5 space-y-3">{collections.slice(0, 12).map(collection => {
      const balance = Math.max(0, collection.amountDueIls - collection.amountReceivedIls);
      const settled = ["paid", "waived"].includes(collection.status);
      const overdue = collection.status === "overdue";
      const latestEvent = collection.latestPaymentEvent;
      return <article key={collection.id} className={`rounded-2xl border p-4 ${overdue ? "border-rose-300/30 bg-rose-300/[.06]" : "border-white/10 bg-white/[.055]"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-white/85">{collection.leaseReference} · {collection.unitLabel}</p><p className="mt-1 text-xs text-white/45">{collection.tenantName} · {words.period}: {collection.periodLabel} · {new Date(collection.dueAt).toLocaleDateString()}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${overdue ? "bg-rose-300/15 text-rose-200" : settled ? "bg-emerald-300/15 text-emerald-200" : "bg-[#40cbed]/10 text-[#a9effb]"}`}>{collection.status}</span></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><span>{words.due}: <b className="text-white">EGP{collection.amountDueIls.toLocaleString()}</b></span><span>{words.received}: <b className="text-emerald-200">EGP{collection.amountReceivedIls.toLocaleString()}</b></span><span>{words.balance}: <b className={overdue ? "text-rose-200" : "text-[#a9effb]"}>EGP{balance.toLocaleString()}</b></span></div>{latestEvent && <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/55">{words.lastPayment}: <b className="text-emerald-200">EGP{latestEvent.amountIls.toLocaleString()}</b> · {latestEvent.paymentMethod ? words[latestEvent.paymentMethod as "cash" | "bank" | "card" | "transfer" | "other"] : words.other} · {new Date(latestEvent.effectiveAt).toLocaleDateString()}</p>}{!settled && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_auto]"><input aria-label={words.amount} type="number" min="1" max={balance} value={paymentAmounts[collection.id] ?? String(balance)} onChange={event => setPaymentAmounts(prev => ({ ...prev, [collection.id]: event.target.value }))} className={inputClass} /><select aria-label={words.method} value={paymentMethods[collection.id] ?? "transfer"} onChange={event => setPaymentMethods(prev => ({ ...prev, [collection.id]: event.target.value as "cash" | "bank" | "card" | "transfer" | "other" }))} className={inputClass}>{(["cash", "bank", "card", "transfer", "other"] as const).map(method => <option key={method} value={method}>{words[method]}</option>)}</select><button onClick={() => record(collection)} disabled={busy || balance <= 0} className="rounded-xl bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-4 py-2 text-sm font-bold text-[#11152f] disabled:opacity-50">{words.record}</button></div>}</article>;
    })}{collections.length === 0 && <p className="py-4 text-sm text-white/45">{words.empty}</p>}</div>
  </section>;
}

function ResourceForm({
  kind,
  form,
  setForm,
  copy: c,
  editing,
  onSubmit,
  onCancel,
  error,
  busy,
}: {
  kind: ResourceKey;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  copy: (typeof copy)[keyof typeof copy];
  editing: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  error: string;
  busy: boolean;
}) {
  const field = (key: string, placeholder: string, type = "text") => (
    <input
      className={inputClass}
      type={type}
      value={form[key] ?? ""}
      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
      placeholder={placeholder}
    />
  );
  return (
    <div className="mt-4 rounded-2xl border border-white/14 bg-white/[.055] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {kind === "tasks" ? (
          <>
            {field("title", c.titleField)}
            {field("dueAt", c.due, "date")}
            <textarea
              className={`${inputClass} sm:col-span-2`}
              value={form.description ?? ""}
              onChange={e =>
                setForm(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder={c.description}
              rows={2}
            />
            <select
              className={inputClass}
              value={form.status ?? "todo"}
              onChange={e =>
                setForm(prev => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="todo">{c.taskStatus.todo}</option>
              <option value="in_progress">{c.taskStatus.in_progress}</option>
              <option value="done">{c.taskStatus.done}</option>
            </select>
          </>
        ) : (
          <>
            {field("name", c.name)}
            {kind === "properties" ? (
              <>
                {field("address", c.address)}
                <select
                  className={inputClass}
                  value={form.status ?? "active"}
                  onChange={e =>
                    setForm(prev => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="active">{c.propertyStatus.active}</option>
                  <option value="vacant">{c.propertyStatus.vacant}</option>
                  <option value="maintenance">
                    {c.propertyStatus.maintenance}
                  </option>
                </select>
              </>
            ) : (
              <>
                {field("email", c.email, "email")}
                {field("phone", c.phone)}
              </>
            )}
            <textarea
              className={`${inputClass} sm:col-span-2`}
              value={form.notes ?? ""}
              onChange={e =>
                setForm(prev => ({ ...prev, notes: e.target.value }))
              }
              placeholder={c.notes}
              rows={2}
            />
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onSubmit}
          disabled={busy}
          className="rounded-xl bg-gradient-to-r from-[#ff6b8e] via-[#a88cff] to-[#40cbed] px-4 py-2 text-sm font-semibold text-[#11152f] disabled:opacity-50"
        >
          {editing ? c.save : c.add}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65"
        >
          {c.cancel}
        </button>
      </div>
    </div>
  );
}

type LegacyKind = "tenants" | "maintenance" | "contracts" | "payments";
function LegacyCrudPanel({
  kind,
  title,
  items,
  copy: c,
}: {
  kind: LegacyKind;
  title: string;
  items: Array<Record<string, unknown>>;
  copy: (typeof copy)[keyof typeof copy];
}) {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const refresh = () => {
    utils.legacy.tenants.invalidate();
    utils.legacy.maintenance.invalidate();
    utils.legacy.contracts.invalidate();
    utils.legacy.operationalPayments.invalidate();
    utils.legacy.snapshot.invalidate();
    setOpen(false);
    setEditingId(null);
    setForm({});
    setError("");
  };
  const onError = (e: { message: string }) => setError(e.message);
  const tenantCreate = trpc.legacy.createTenant.useMutation({
    onSuccess: refresh,
    onError,
  });
  const tenantUpdate = trpc.legacy.updateTenant.useMutation({
    onSuccess: refresh,
    onError,
  });
  const tenantDelete = trpc.legacy.deleteTenant.useMutation({
    onSuccess: refresh,
    onError,
  });
  const maintenanceCreate = trpc.legacy.createMaintenance.useMutation({
    onSuccess: refresh,
    onError,
  });
  const maintenanceUpdate = trpc.legacy.updateMaintenance.useMutation({
    onSuccess: refresh,
    onError,
  });
  const maintenanceDelete = trpc.legacy.deleteMaintenance.useMutation({
    onSuccess: refresh,
    onError,
  });
  const contractCreate = trpc.legacy.createContract.useMutation({
    onSuccess: refresh,
    onError,
  });
  const contractUpdate = trpc.legacy.updateContract.useMutation({
    onSuccess: refresh,
    onError,
  });
  const contractDelete = trpc.legacy.deleteContract.useMutation({
    onSuccess: refresh,
    onError,
  });
  const paymentCreate = trpc.legacy.createOperationalPayment.useMutation({
    onSuccess: refresh,
    onError,
  });
  const paymentUpdate = trpc.legacy.updateOperationalPayment.useMutation({
    onSuccess: refresh,
    onError,
  });
  const paymentDelete = trpc.legacy.deleteOperationalPayment.useMutation({
    onSuccess: refresh,
    onError,
  });
  const busy = [
    tenantCreate,
    tenantUpdate,
    tenantDelete,
    maintenanceCreate,
    maintenanceUpdate,
    maintenanceDelete,
    contractCreate,
    contractUpdate,
    contractDelete,
    paymentCreate,
    paymentUpdate,
    paymentDelete,
  ].some(m => m.isPending);
  const begin = (item?: Record<string, unknown>) => {
    setError("");
    setEditingId(item ? Number(item.id) : null);
    setForm(
      item
        ? Object.fromEntries(
            Object.entries(item).map(([k, v]) => [
              k,
              v == null
                ? ""
                : ["startAt", "endAt", "scheduledAt", "paidAt"].includes(k)
                  ? new Date(String(v)).toISOString().slice(0, 10)
                  : String(v),
            ])
          )
        : {}
    );
    setOpen(true);
  };
  const submit = () => {
    if (kind === "tenants") {
      const input = {
        name: form.name ?? "",
        email: form.email || undefined,
        phone: form.phone || undefined,
        propertyId: form.propertyId ? Number(form.propertyId) : null,
        status: (form.status || "active") as "active" | "late" | "ended",
        notes: form.notes || undefined,
      };
      editingId
        ? tenantUpdate.mutate({ id: editingId, ...input })
        : tenantCreate.mutate(input);
    } else if (kind === "maintenance") {
      const input = {
        title: form.title ?? "",
        description: form.description || undefined,
        propertyId: form.propertyId ? Number(form.propertyId) : null,
        priority: (form.priority || "medium") as
          | "low"
          | "medium"
          | "high"
          | "urgent",
        status: (form.status || "open") as
          | "open"
          | "in_progress"
          | "completed"
          | "cancelled",
        scheduledAt: form.scheduledAt
          ? new Date(`${form.scheduledAt}T00:00:00.000Z`)
          : null,
        costIls: Number(form.costIls || 0),
      };
      editingId
        ? maintenanceUpdate.mutate({ id: editingId, ...input })
        : maintenanceCreate.mutate(input);
    } else if (kind === "contracts") {
      const input = {
        title: form.title ?? "",
        tenantId: form.tenantId ? Number(form.tenantId) : null,
        propertyId: form.propertyId ? Number(form.propertyId) : null,
        startAt: new Date(`${form.startAt}T00:00:00.000Z`),
        endAt: new Date(`${form.endAt}T00:00:00.000Z`),
        rentAmountIls: Number(form.rentAmountIls || 0),
        status: (form.status || "active") as
          | "active"
          | "expired"
          | "terminated",
        notes: form.notes || undefined,
      };
      editingId
        ? contractUpdate.mutate({ id: editingId, ...input })
        : contractCreate.mutate(input);
    } else {
      const input = {
        tenantId: form.tenantId ? Number(form.tenantId) : null,
        contractId: form.contractId ? Number(form.contractId) : null,
        amountIls: Number(form.amountIls || 0),
        method: (form.method || "bank") as
          | "cash"
          | "bank"
          | "card"
          | "transfer",
        status: (form.status || "pending") as "paid" | "pending" | "overdue",
        paidAt: form.paidAt ? new Date(`${form.paidAt}T00:00:00.000Z`) : null,
        notes: form.notes || undefined,
      };
      editingId
        ? paymentUpdate.mutate({ id: editingId, ...input })
        : paymentCreate.mutate(input);
    }
  };
  const remove = (id: number) => {
    if (!window.confirm(`${c.delete}?`)) return;
    if (kind === "tenants") tenantDelete.mutate({ id });
    if (kind === "maintenance") maintenanceDelete.mutate({ id });
    if (kind === "contracts") contractDelete.mutate({ id });
    if (kind === "payments") paymentDelete.mutate({ id });
  };
  const field = (key: string, label: string, type = "text") => (
    <input
      className={inputClass}
      type={type}
      value={form[key] ?? ""}
      onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))}
      placeholder={label}
    />
  );
  const select = (key: string, options: Array<[string, string]>) => (
    <select
      className={inputClass}
      value={form[key] ?? options[0][0]}
      onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))}
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[.045] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          onClick={() => begin()}
          className="inline-flex items-center gap-1 rounded-full bg-[#d8b26b] px-3 py-1.5 text-xs font-semibold text-[#071a27]"
        >
          <Plus size={14} />
          {c.add}
        </button>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {kind === "tenants" && (
            <>
              {field("name", c.name)}
              {field("email", c.email, "email")}
              {field("phone", c.phone)}
              {select("status", [
                ["active", c.active],
                ["late", c.taskStatus.in_progress],
                ["ended", c.taskStatus.done],
              ])}
            </>
          )}
          {kind === "maintenance" && (
            <>
              {field("title", c.titleField)}
              {field("scheduledAt", c.due, "date")}
              {field("costIls", "EGP", "number")}
              {select("priority", [
                ["low", "Low"],
                ["medium", "Medium"],
                ["high", "High"],
                ["urgent", "Urgent"],
              ])}
              {select("status", [
                ["open", "Open"],
                ["in_progress", c.taskStatus.in_progress],
                ["completed", c.taskStatus.done],
                ["cancelled", c.cancel],
              ])}
            </>
          )}
          {kind === "contracts" && (
            <>
              {field("title", c.titleField)}
              {field("startAt", "Start", "date")}
              {field("endAt", "End", "date")}
              {field("rentAmountIls", "EGP", "number")}
              {select("status", [
                ["active", c.active],
                ["expired", "Expired"],
                ["terminated", "Terminated"],
              ])}
            </>
          )}
          {kind === "payments" && (
            <>
              {field("amountIls", "EGP", "number")}
              {field("paidAt", c.due, "date")}
              {select("method", [
                ["bank", "Bank"],
                ["cash", "Cash"],
                ["card", "Card"],
                ["transfer", "Transfer"],
              ])}
              {select("status", [
                ["pending", c.taskStatus.todo],
                ["paid", c.taskStatus.done],
                ["overdue", "Overdue"],
              ])}
            </>
          )}
          {
            <textarea
              className="sm:col-span-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white outline-none"
              value={form.notes ?? form.description ?? ""}
              onChange={e =>
                setForm(v => ({
                  ...v,
                  [kind === "maintenance" ? "description" : "notes"]:
                    e.target.value,
                }))
              }
              placeholder={c.notes}
              rows={2}
            />
          }
          {error && (
            <p className="sm:col-span-2 text-xs text-rose-300">{error}</p>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-xl bg-[#d8b26b] px-4 py-2 text-sm font-semibold text-[#071a27] disabled:opacity-50"
            >
              {editingId ? c.save : c.add}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65"
            >
              {c.cancel}
            </button>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {items.slice(0, 8).map(item => (
          <div
            key={Number(item.id)}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"
          >
            <div>
              <p className="text-sm font-medium">
                {String(item.name ?? item.title ?? `${item.amountIls ?? 0} EGP`)}
              </p>
              <p className="text-xs text-white/45">
                {String(item.status ?? item.priority ?? "")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => begin(item)}
                className="rounded-lg border border-white/10 p-2 text-white/55"
                aria-label={c.edit}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => remove(Number(item.id))}
                className="rounded-lg border border-rose-300/10 p-2 text-rose-200/70"
                aria-label={c.delete}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-white/45">{c.noItems}</p>
        )}
      </div>
    </article>
  );
}

type SalesImportSummary = {
  sourceColumnCount: number;
  mappedColumns: string[];
  retainedColumns: string[];
  missingClientContactRows: number;
  missingContractPriceRows: number;
  parsedRowCount: number;
  importedRowCount: number;
  skippedBlankRows: number;
  skippedMissingNameRows: number;
};

export function SalesCenterPanel({ lang }: { lang: keyof typeof copy }) {
  const isRtl = lang === "ar" || lang === "he";
  const t = {
    ar: { overline: "مركز المبيعات", title: "العقارات والعملاء وعقود البيع", intro: "استيراد جداول كاملة، تعديل أي سجل، وإنشاء عقود بخطة أقساط محسوبة.", batches: "دفعات الاستيراد", properties: "عقارات للبيع", clients: "العملاء", contracts: "عقود البيع", propertyFile: "رفع ملف العقارات", clientFile: "رفع ملف العملاء", support: "Excel أو CSV · حتى 8MB و5000 صف", delete: "حذف الدفعة", confirmDelete: "حذف الدفعة كاملة؟ لا يمكن الاسترجاع. الدفعة المرتبطة بعقد لا يمكن حذفها.", open: "فتح الملف", rows: "صف", emptyBatches: "لم يتم رفع أي دفعة.", emptyProperties: "ارفع ملف عقارات لبدء إدارة الوحدات.", emptyClients: "ارفع ملف عملاء لبدء العقود.", emptyContracts: "لا توجد عقود بيع بعد.", create: "إنشاء عقد بيع", property: "اختر العقار", client: "اختر العميل", contractNo: "رقم العقد", name: "الاسم", address: "العنوان", type: "النوع", status: "الحالة", area: "المساحة م²", price: "سعر العرض EGP", email: "البريد الإلكتروني", phone: "الهاتف", identity: "رقم الهوية", extra: "بيانات إضافية (JSON)", save: "حفظ", edit: "تعديل", cancel: "إلغاء", available: "متاح", reserved: "محجوز", sold: "مباع", inactive: "غير نشط", discount: "الخصم", noDiscount: "بدون خصم", fixed: "مبلغ ثابت", percent: "نسبة مئوية", deposit: "مقدم EGP", frequency: "دورية القسط", quarterly: "ربع سنوي", semiannual: "نصف سنوي", annual: "سنوي", years: "سنوات", firstDate: "تاريخ أول قسط", notes: "ملاحظات", preview: "معاينة الخطة", net: "الصافي", balance: "المتبقي", count: "عدد الأقساط", installment: "القسط التقريبي", schedule: "جدول الاستحقاقات", successImport: "تم استيراد الملف بنجاح.", successContract: "تم إنشاء العقد وجدول الأقساط.", required: "اختر عقاراً وعميلًا وأدخل رقم العقد والسعر، وأدخل تاريخ أول قسط عندما يكون هناك رصيد." },
    en: { overline: "Sales Center", title: "Sales properties, clients & contracts", intro: "Import complete sheets, edit any record, and create sale contracts with a calculated payment plan.", batches: "Import batches", properties: "Sales properties", clients: "Clients", contracts: "Sale contracts", propertyFile: "Upload property sheet", clientFile: "Upload client sheet", support: "Excel or CSV · up to 8MB and 5,000 rows", delete: "Delete batch", confirmDelete: "Delete the complete batch? It cannot be recovered. A batch linked to a contract cannot be deleted.", open: "Open file", rows: "rows", emptyBatches: "No import batch has been uploaded.", emptyProperties: "Upload a property sheet to start managing listings.", emptyClients: "Upload a client sheet to start contracts.", emptyContracts: "No sale contracts yet.", create: "Create sale contract", property: "Select property", client: "Select client", contractNo: "Contract number", name: "Name", address: "Address", type: "Type", status: "Status", area: "Area m²", price: "List price EGP", email: "Email", phone: "Phone", identity: "Identity number", extra: "Additional data (JSON)", save: "Save", edit: "Edit", cancel: "Cancel", available: "Available", reserved: "Reserved", sold: "Sold", inactive: "Inactive", discount: "Discount", noDiscount: "No discount", fixed: "Fixed amount", percent: "Percentage", deposit: "Deposit EGP", frequency: "Installment frequency", quarterly: "Quarterly", semiannual: "Semiannual", annual: "Annual", years: "years", firstDate: "First installment date", notes: "Notes", preview: "Plan preview", net: "Net price", balance: "Balance", count: "Installments", installment: "Estimated installment", schedule: "Due schedule", successImport: "File imported successfully.", successContract: "Contract and installment schedule created.", required: "Select a property and client, enter a contract number and price, and set the first installment date when a balance remains." },
    he: { overline: "מרכז מכירות", title: "נכסים, לקוחות וחוזי מכירה", intro: "ייבוא גיליונות מלאים, עריכת כל רשומה ויצירת חוזי מכירה עם תוכנית תשלומים מחושבת.", batches: "אצוות ייבוא", properties: "נכסים למכירה", clients: "לקוחות", contracts: "חוזי מכירה", propertyFile: "העלאת גיליון נכסים", clientFile: "העלאת גיליון לקוחות", support: "Excel או CSV · עד 8MB ו־5,000 שורות", delete: "מחיקת אצווה", confirmDelete: "למחוק את כל האצווה? לא ניתן לשחזר אותה. אי אפשר למחוק אצווה המקושרת לחוזה.", open: "פתיחת קובץ", rows: "שורות", emptyBatches: "טרם הועלתה אצוות ייבוא.", emptyProperties: "העלו גיליון נכסים כדי לנהל הצעות.", emptyClients: "העלו גיליון לקוחות כדי להתחיל חוזים.", emptyContracts: "עדיין אין חוזי מכירה.", create: "יצירת חוזה מכירה", property: "בחירת נכס", client: "בחירת לקוח", contractNo: "מספר חוזה", name: "שם", address: "כתובת", type: "סוג", status: "סטטוס", area: "שטח מ״ר", price: "מחיר מחירון EGP", email: "דוא״ל", phone: "טלפון", identity: "מספר זהות", extra: "נתונים נוספים (JSON)", save: "שמירה", edit: "עריכה", cancel: "ביטול", available: "זמין", reserved: "שמור", sold: "נמכר", inactive: "לא פעיל", discount: "הנחה", noDiscount: "ללא הנחה", fixed: "סכום קבוע", percent: "אחוז", deposit: "מקדמה EGP", frequency: "תדירות תשלום", quarterly: "רבעוני", semiannual: "חצי שנתי", annual: "שנתי", years: "שנים", firstDate: "תאריך תשלום ראשון", notes: "הערות", preview: "תצוגה מקדימה", net: "מחיר נטו", balance: "יתרה", count: "תשלומים", installment: "תשלום משוער", schedule: "לוח מועדים", successImport: "הקובץ יובא בהצלחה.", successContract: "החוזה ולוח התשלומים נוצרו.", required: "בחרו נכס ולקוח, הזינו מספר חוזה ומחיר, וקבעו תאריך תשלום ראשון כשנותרה יתרה." },
    ru: { overline: "Центр продаж", title: "Объекты, клиенты и договоры", intro: "Импортируйте таблицы, редактируйте записи и создавайте договоры с рассчитанным графиком платежей.", batches: "Пакеты импорта", properties: "Объекты продажи", clients: "Клиенты", contracts: "Договоры продажи", propertyFile: "Загрузить объекты", clientFile: "Загрузить клиентов", support: "Excel или CSV · до 8 МБ и 5 000 строк", delete: "Удалить пакет", confirmDelete: "Удалить весь пакет? Восстановить записи нельзя. Пакет с договором удалить нельзя.", open: "Открыть файл", rows: "строк", emptyBatches: "Пакеты ещё не загружены.", emptyProperties: "Загрузите таблицу объектов для начала работы.", emptyClients: "Загрузите таблицу клиентов для договоров.", emptyContracts: "Договоров продажи ещё нет.", create: "Создать договор", property: "Выберите объект", client: "Выберите клиента", contractNo: "Номер договора", name: "Имя", address: "Адрес", type: "Тип", status: "Статус", area: "Площадь м²", price: "Цена EGP", email: "Email", phone: "Телефон", identity: "Номер документа", extra: "Дополнительные данные (JSON)", save: "Сохранить", edit: "Изменить", cancel: "Отмена", available: "Доступен", reserved: "Зарезервирован", sold: "Продан", inactive: "Неактивен", discount: "Скидка", noDiscount: "Без скидки", fixed: "Фиксированная сумма", percent: "Процент", deposit: "Первый взнос EGP", frequency: "Частота платежа", quarterly: "Ежеквартально", semiannual: "Раз в полгода", annual: "Ежегодно", years: "лет", firstDate: "Дата первого платежа", notes: "Примечания", preview: "Предварительный расчёт", net: "Нетто", balance: "Остаток", count: "Платежи", installment: "Примерный платёж", schedule: "График платежей", successImport: "Файл успешно импортирован.", successContract: "Договор и график платежей созданы.", required: "Выберите объект и клиента, укажите номер договора и цену, а также дату первого платежа при наличии остатка." },
    uk: { overline: "Центр продажів", title: "Об’єкти, клієнти та договори", intro: "Імпортуйте таблиці, редагуйте записи та створюйте договори з розрахованим графіком платежів.", batches: "Пакети імпорту", properties: "Об’єкти продажу", clients: "Клієнти", contracts: "Договори продажу", propertyFile: "Завантажити об’єкти", clientFile: "Завантажити клієнтів", support: "Excel або CSV · до 8 МБ і 5 000 рядків", delete: "Видалити пакет", confirmDelete: "Видалити весь пакет? Записи неможливо відновити. Пакет з договором видалити не можна.", open: "Відкрити файл", rows: "рядків", emptyBatches: "Пакети ще не завантажено.", emptyProperties: "Завантажте таблицю об’єктів для початку роботи.", emptyClients: "Завантажте таблицю клієнтів для договорів.", emptyContracts: "Договорів продажу ще немає.", create: "Створити договір", property: "Оберіть об’єкт", client: "Оберіть клієнта", contractNo: "Номер договору", name: "Ім’я", address: "Адреса", type: "Тип", status: "Статус", area: "Площа м²", price: "Ціна EGP", email: "Email", phone: "Телефон", identity: "Номер документа", extra: "Додаткові дані (JSON)", save: "Зберегти", edit: "Редагувати", cancel: "Скасувати", available: "Доступний", reserved: "Заброньований", sold: "Проданий", inactive: "Неактивний", discount: "Знижка", noDiscount: "Без знижки", fixed: "Фіксована сума", percent: "Відсоток", deposit: "Перший внесок EGP", frequency: "Частота платежу", quarterly: "Щоквартально", semiannual: "Раз на пів року", annual: "Щорічно", years: "років", firstDate: "Дата першого платежу", notes: "Примітки", preview: "Попередній розрахунок", net: "Нетто", balance: "Залишок", count: "Платежі", installment: "Орієнтовний платіж", schedule: "Графік платежів", successImport: "Файл успішно імпортовано.", successContract: "Договір і графік платежів створено.", required: "Оберіть об’єкт і клієнта, введіть номер договору і ціну та дату першого платежу за наявності залишку." },
  }[lang];
  const summaryText = {
    ar: { title: "ملخص الاستيراد", columns: "عمودًا مكتشفًا", mapped: "حقول معرّفة", retained: "أعمدة محفوظة", none: "لا يوجد", missingContact: "صفوف عملاء بلا بريد أو هاتف", missingPrice: "عقارات بلا سعر؛ يجب إدخال السعر قبل إنشاء عقد", imported: "صفوف مستوردة", skippedBlank: "صفوف فارغة تم تخطيها", skippedMissingName: "صفوف تم تخطيها لعدم وجود اسم" },
    en: { title: "Import summary", columns: "source columns", mapped: "Mapped fields", retained: "Retained columns", none: "None", missingContact: "Client rows without email or phone", missingPrice: "Properties without a price; add one before creating a contract", imported: "Imported rows", skippedBlank: "Blank rows skipped", skippedMissingName: "Rows skipped because a name is missing" },
    he: { title: "סיכום ייבוא", columns: "עמודות שזוהו", mapped: "שדות שמופו", retained: "עמודות שנשמרו", none: "אין", missingContact: "שורות לקוח ללא דוא״ל או טלפון", missingPrice: "נכסים ללא מחיר; יש להזין מחיר לפני יצירת חוזה", imported: "שורות שיובאו", skippedBlank: "שורות ריקות שדולגו", skippedMissingName: "שורות שדולגו כי חסר שם" },
    ru: { title: "Сводка импорта", columns: "исходных столбцов", mapped: "Сопоставленные поля", retained: "Сохранённые столбцы", none: "Нет", missingContact: "Клиенты без email или телефона", missingPrice: "Объекты без цены: укажите цену до создания договора", imported: "Импортировано строк", skippedBlank: "Пустых строк пропущено", skippedMissingName: "Строк пропущено без имени" },
    uk: { title: "Підсумок імпорту", columns: "вихідних стовпців", mapped: "Зіставлені поля", retained: "Збережені стовпці", none: "Немає", missingContact: "Клієнти без email або телефону", missingPrice: "Об’єкти без ціни: вкажіть ціну перед створенням договору", imported: "Імпортовано рядків", skippedBlank: "Порожніх рядків пропущено", skippedMissingName: "Рядків пропущено без імені" },
  }[lang];
  const importErrorText = {
    ar: { noProperties: "لا توجد صفوف عقارات صالحة للاستيراد. أضف اسم العقار أو رقم الوحدة في صف واحد على الأقل.", noClients: "لا توجد صفوف عملاء صالحة للاستيراد. أضف اسم العميل في صف واحد على الأقل.", read: "تعذر قراءة الملف. تأكد من أنه ملف Excel أو CSV صالح.", generic: "تعذر استيراد الملف. راجع محتوى الجدول وحاول مرة أخرى." },
    en: { noProperties: "No valid property rows were found. Add a property name or unit number to at least one row.", noClients: "No valid client rows were found. Add a client name to at least one row.", read: "The file could not be read. Make sure it is a valid Excel or CSV file.", generic: "The file could not be imported. Review the sheet and try again." },
    he: { noProperties: "לא נמצאו שורות נכסים תקינות. הוסיפו שם נכס או מספר יחידה לפחות בשורה אחת.", noClients: "לא נמצאו שורות לקוחות תקינות. הוסיפו שם לקוח לפחות בשורה אחת.", read: "לא ניתן לקרוא את הקובץ. ודאו שזה קובץ Excel או CSV תקין.", generic: "לא ניתן לייבא את הקובץ. בדקו את הגיליון ונסו שוב." },
    ru: { noProperties: "Не найдено допустимых строк объектов. Добавьте название объекта или номер квартиры хотя бы в одну строку.", noClients: "Не найдено допустимых строк клиентов. Добавьте имя клиента хотя бы в одну строку.", read: "Не удалось прочитать файл. Убедитесь, что это корректный Excel или CSV.", generic: "Не удалось импортировать файл. Проверьте таблицу и повторите попытку." },
    uk: { noProperties: "Не знайдено коректних рядків об’єктів. Додайте назву об’єкта або номер квартири хоча б в один рядок.", noClients: "Не знайдено коректних рядків клієнтів. Додайте ім’я клієнта хоча б в один рядок.", read: "Не вдалося прочитати файл. Переконайтеся, що це коректний Excel або CSV.", generic: "Не вдалося імпортувати файл. Перевірте таблицю та спробуйте ще раз." },
  }[lang];
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importSummary, setImportSummary] = useState<SalesImportSummary | null>(null);
  const [editingProperty, setEditingProperty] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [propertyCurrency, setPropertyCurrency] = useState<"EGP" | "USD">("EGP");
  const [propertyPriceBand, setPropertyPriceBand] = useState("all");
  const [propertyDraft, setPropertyDraft] = useState<Record<string, string>>({});
  const [clientDraft, setClientDraft] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ propertyId: "", clientId: "", contractNumber: `SALE-${Date.now()}`, price: "", discountKind: "none", discount: "0", deposit: "0", frequency: "quarterly", years: "1", firstDate: "", notes: "" });
  const center = trpc.sales.center.useQuery();
  const importBatch = trpc.sales.importBatch.useMutation({ onSuccess: result => { setError(""); setNotice(`${t.successImport} ${result.rowCount} ${t.rows}.`); setImportSummary(result.importSummary); utils.sales.center.invalidate(); utils.company.activity.invalidate(); }, onError: failure => { const code = failure.message; setError(code === "IMPORT_NO_VALID_PROPERTY_ROWS" ? importErrorText.noProperties : code === "IMPORT_NO_VALID_CLIENT_ROWS" ? importErrorText.noClients : code === "FILE_READ_FAILED" ? importErrorText.read : importErrorText.generic); } });
  const deleteBatch = trpc.sales.deleteImportBatch.useMutation({ onSuccess: () => { setError(""); setNotice(t.delete); utils.sales.center.invalidate(); }, onError: failure => setError(failure.message) });
  const updateProperty = trpc.sales.updateProperty.useMutation({ onSuccess: () => { setError(""); setNotice(t.save); setEditingProperty(null); utils.sales.center.invalidate(); }, onError: failure => setError(failure.message) });
  const updateClient = trpc.sales.updateClient.useMutation({ onSuccess: () => { setError(""); setNotice(t.save); setEditingClient(null); utils.sales.center.invalidate(); }, onError: failure => setError(failure.message) });
  const createContract = trpc.sales.createContract.useMutation({ onSuccess: () => { setError(""); setNotice(t.successContract); setForm(v => ({ ...v, propertyId: "", clientId: "", contractNumber: `SALE-${Date.now()}`, price: "", discount: "0", deposit: "0", firstDate: "", notes: "" })); utils.sales.center.invalidate(); utils.company.activity.invalidate(); }, onError: failure => setError(failure.message) });
  const data = center.data ?? { batches: [], properties: [], clients: [], contracts: [], installments: [] };
  const money = (value: number | null | undefined) => propertyCurrency === "USD" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value ?? 0) / 50) : `${Number(value ?? 0).toLocaleString("en-EG")} EGP`;
  const propertyFilterCopy = lang === "ar" ? { all: "كل الأسعار", under1m: "أقل من مليون جنيه", oneTo3m: "من مليون إلى 3 ملايين", threeTo5m: "من 3 إلى 5 ملايين", over5m: "أكثر من 5 ملايين", currency: "العملة", egp: "جنيه مصري", usd: "دولار أمريكي", noResults: "لا توجد عقارات ضمن هذا النطاق" } : { all: "All prices", under1m: "Under EGP 1M", oneTo3m: "EGP 1M–3M", threeTo5m: "EGP 3M–5M", over5m: "Over EGP 5M", currency: "Currency", egp: "Egyptian pound", usd: "US dollar", noResults: "No properties match this price range" };
  const filteredProperties = data.properties.filter(item => { const price = Number(item.listPriceIls ?? 0); return propertyPriceBand === "under1m" ? price > 0 && price < 1_000_000 : propertyPriceBand === "oneTo3m" ? price >= 1_000_000 && price <= 3_000_000 : propertyPriceBand === "threeTo5m" ? price > 3_000_000 && price <= 5_000_000 : propertyPriceBand === "over5m" ? price > 5_000_000 : true; });
  const num = (value: string) => Math.max(0, Math.round(Number(value) || 0));
  const listPrice = num(form.price);
  const discountValue = num(form.discount);
  const discountAmount = form.discountKind === "fixed" ? discountValue : form.discountKind === "percentage" ? Math.round((listPrice * Math.min(discountValue, 100)) / 100) : 0;
  const net = Math.max(0, listPrice - Math.min(listPrice, discountAmount));
  const deposit = Math.min(net, num(form.deposit));
  const balance = net - deposit;
  const periods = form.frequency === "quarterly" ? 4 : form.frequency === "semiannual" ? 2 : 1;
  const installments = balance ? periods * Math.max(1, Math.min(5, Number(form.years) || 1)) : 0;
  const perInstallment = installments ? Math.floor(balance / installments) : 0;
  const propertyStatus = (status: string) => status === "reserved" ? t.reserved : status === "sold" ? t.sold : status === "inactive" ? t.inactive : t.available;
  const frequency = (value: string) => value === "semiannual" ? t.semiannual : value === "annual" ? t.annual : t.quarterly;
  const readImport = async (kind: "properties" | "clients", file?: File) => {
    if (!file) return;
    setError(""); setNotice(""); setImportSummary(null);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 8 * 1024 * 1024) { setError(t.support); return; }
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",").slice(1).join(",")); reader.onerror = () => reject(new Error("FILE_READ_FAILED")); reader.readAsDataURL(file); });
      importBatch.mutate({ kind, fileName: file.name, contentType: file.type || "application/octet-stream", base64Content: base64 });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "FILE_READ_FAILED"); }
  };
  const saveProperty = () => {
    if (!editingProperty || !propertyDraft.name?.trim()) return;
    updateProperty.mutate({ id: editingProperty, name: propertyDraft.name.trim(), address: propertyDraft.address?.trim() || null, propertyType: propertyDraft.propertyType?.trim() || null, status: (propertyDraft.status || "available") as "available" | "reserved" | "sold" | "inactive", areaSqm: propertyDraft.areaSqm?.trim() === "" ? null : num(propertyDraft.areaSqm ?? "0"), listPriceIls: propertyDraft.listPriceIls?.trim() === "" ? null : num(propertyDraft.listPriceIls ?? "0"), attributesJson: propertyDraft.attributesJson?.trim() || null });
  };
  const saveClient = () => { if (editingClient && clientDraft.name?.trim()) updateClient.mutate({ id: editingClient, name: clientDraft.name.trim(), email: clientDraft.email?.trim() || null, phone: clientDraft.phone?.trim() || null, identityNumber: clientDraft.identityNumber?.trim() || null, attributesJson: clientDraft.attributesJson?.trim() || null }); };
  const submitContract = () => {
    const propertyId = Number(form.propertyId); const clientId = Number(form.clientId);
    if (!propertyId || !clientId || !form.contractNumber.trim() || listPrice <= 0 || (balance > 0 && !form.firstDate)) { setError(t.required); return; }
    createContract.mutate({ salesPropertyId: propertyId, salesClientId: clientId, contractNumber: form.contractNumber.trim(), listPriceIls: listPrice, discountKind: form.discountKind as "none" | "fixed" | "percentage", discountValue, depositIls: deposit, paymentFrequency: form.frequency as "quarterly" | "semiannual" | "annual", termYears: Math.max(1, Math.min(5, Number(form.years) || 1)), firstInstallmentAt: form.firstDate ? new Date(`${form.firstDate}T00:00:00`) : null, notes: form.notes.trim() || null });
  };

  return <section id="sales" dir={isRtl ? "rtl" : "ltr"} className="mt-6 rounded-[1.7rem] border border-[#d8b26b]/20 bg-[#071a29]/78 p-5 sm:p-7">
    <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-[#d8b26b]">{t.overline}</p><h2 className="mt-2 text-2xl font-semibold text-white">{t.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{t.intro}</p></div><p className="text-xs text-white/40">{t.support}</p></div>
    {(error || notice) && <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"}`}>{error || notice}</p>}
    {importSummary && <div className="mt-4 rounded-xl border border-[#d8b26b]/25 bg-[#d8b26b]/[.07] px-3 py-3 text-xs"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-medium text-[#f1d998]">{summaryText.title}</p><p className="text-white/45">{importSummary.sourceColumnCount} {summaryText.columns} · {summaryText.imported}: {importSummary.importedRowCount}</p></div><div className="mt-3 grid gap-3 lg:grid-cols-2"><div><p className="text-white/45">{summaryText.mapped}</p><p className="mt-1 break-words leading-5 text-white/80">{importSummary.mappedColumns.length ? importSummary.mappedColumns.join(" · ") : summaryText.none}</p></div><div><p className="text-white/45">{summaryText.retained}</p><p className="mt-1 break-words leading-5 text-white/80">{importSummary.retainedColumns.length ? importSummary.retainedColumns.slice(0, 16).join(" · ") : summaryText.none}{importSummary.retainedColumns.length > 16 ? ` +${importSummary.retainedColumns.length - 16}` : ""}</p></div></div>{importSummary.skippedBlankRows > 0 && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-2 text-amber-100">{summaryText.skippedBlank}: {importSummary.skippedBlankRows}</p>}{importSummary.skippedMissingNameRows > 0 && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-2 text-amber-100">{summaryText.skippedMissingName}: {importSummary.skippedMissingNameRows}</p>}{importSummary.missingClientContactRows > 0 && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-2 text-amber-100">{summaryText.missingContact}: {importSummary.missingClientContactRows}</p>}{importSummary.missingContractPriceRows > 0 && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-2 text-amber-100">{summaryText.missingPrice}: {importSummary.missingContractPriceRows}</p>}</div>}
    <div className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <article className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><h3 className="font-medium text-white">{t.batches}</h3><div className="mt-4 grid gap-3"><label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[#d8b26b]/35 bg-black/10 px-3 py-3 text-sm text-white/70"><span>{t.propertyFile}</span><input type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={importBatch.isPending} onChange={event => { readImport("properties", event.target.files?.[0]); event.currentTarget.value = ""; }} /><span className="rounded-lg bg-[#d8b26b] px-2 py-1 text-xs font-semibold text-[#071a27]">+</span></label><label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[#d8b26b]/35 bg-black/10 px-3 py-3 text-sm text-white/70"><span>{t.clientFile}</span><input type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={importBatch.isPending} onChange={event => { readImport("clients", event.target.files?.[0]); event.currentTarget.value = ""; }} /><span className="rounded-lg bg-[#d8b26b] px-2 py-1 text-xs font-semibold text-[#071a27]">+</span></label></div><div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{data.batches.map(batch => <div key={Number(batch.id)} className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-xs"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-white">{String(batch.fileName)}</p><p className="mt-1 text-white/40">{String(batch.kind)} · {Number(batch.rowCount)} {t.rows}</p></div><button className="shrink-0 text-rose-200/80" disabled={deleteBatch.isPending} onClick={() => { if (window.confirm(t.confirmDelete)) deleteBatch.mutate({ batchId: Number(batch.id) }); }}>{t.delete}</button></div>{batch.fileUrl && <a href={String(batch.fileUrl)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[#e6c67d]">{t.open}</a>}</div>)}{!data.batches.length && <p className="text-sm text-white/40">{t.emptyBatches}</p>}</div></article>
      <article className="rounded-2xl border border-[#d8b26b]/20 bg-[#0b2a3a]/45 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-medium text-white">{t.create}</h3><span className="text-xs text-[#e6c67d]">{t.preview}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><select className={inputClass} value={form.propertyId} onChange={e => { const selected = data.properties.find(item => Number(item.id) === Number(e.target.value)); setForm(v => ({ ...v, propertyId: e.target.value, price: selected?.listPriceIls == null ? v.price : String(selected.listPriceIls) })); }}><option value="">{t.property}</option>{data.properties.filter(item => item.status !== "sold" && item.status !== "inactive").map(item => <option key={Number(item.id)} value={Number(item.id)}>{String(item.name)}</option>)}</select><select className={inputClass} value={form.clientId} onChange={e => setForm(v => ({ ...v, clientId: e.target.value }))}><option value="">{t.client}</option>{data.clients.map(item => <option key={Number(item.id)} value={Number(item.id)}>{String(item.name)}</option>)}</select><input className={inputClass} placeholder={t.contractNo} value={form.contractNumber} onChange={e => setForm(v => ({ ...v, contractNumber: e.target.value }))} /><input className={inputClass} type="number" min="1" placeholder={t.price} value={form.price} onChange={e => setForm(v => ({ ...v, price: e.target.value }))} /><div className="grid grid-cols-2 gap-2"><select className={inputClass} value={form.discountKind} onChange={e => setForm(v => ({ ...v, discountKind: e.target.value }))}><option value="none">{t.noDiscount}</option><option value="fixed">{t.fixed}</option><option value="percentage">{t.percent}</option></select><input className={inputClass} type="number" min="0" max={form.discountKind === "percentage" ? 100 : undefined} placeholder={t.discount} value={form.discount} onChange={e => setForm(v => ({ ...v, discount: e.target.value }))} /></div><input className={inputClass} type="number" min="0" placeholder={t.deposit} value={form.deposit} onChange={e => setForm(v => ({ ...v, deposit: e.target.value }))} /><select className={inputClass} value={form.frequency} onChange={e => setForm(v => ({ ...v, frequency: e.target.value }))}><option value="quarterly">{t.quarterly}</option><option value="semiannual">{t.semiannual}</option><option value="annual">{t.annual}</option></select><select className={inputClass} value={form.years} onChange={e => setForm(v => ({ ...v, years: e.target.value }))}>{[1, 2, 3, 4, 5].map(year => <option key={year} value={year}>{year} {t.years}</option>)}</select><input className={inputClass} type="date" aria-label={t.firstDate} value={form.firstDate} onChange={e => setForm(v => ({ ...v, firstDate: e.target.value }))} /><textarea className={`${inputClass} md:col-span-2 xl:col-span-3`} rows={2} placeholder={t.notes} value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div><p className="text-[11px] text-white/45">{t.net}</p><p className="mt-1 font-medium text-white">{money(net)}</p></div><div><p className="text-[11px] text-white/45">{t.balance}</p><p className="mt-1 font-medium text-white">{money(balance)}</p></div><div><p className="text-[11px] text-white/45">{t.count}</p><p className="mt-1 font-medium text-white">{installments}</p></div><div><p className="text-[11px] text-white/45">{t.installment}</p><p className="mt-1 font-medium text-[#e6c67d]">{money(perInstallment)}</p></div></div><button className="mt-5 rounded-xl bg-[#d8b26b] px-4 py-2.5 text-sm font-semibold text-[#071a27] disabled:opacity-50" disabled={createContract.isPending || !data.properties.length || !data.clients.length} onClick={submitContract}>{createContract.isPending ? "…" : t.create}</button></article>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">      <article className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-medium text-white">{t.properties}</h3><div className="flex flex-wrap gap-2"><div className="flex rounded-lg border border-white/10 bg-black/10 p-1" role="group" aria-label={propertyFilterCopy.currency}><button type="button" onClick={() => setPropertyCurrency("EGP")} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${propertyCurrency === "EGP" ? "bg-[#d8b26b] text-[#071a27]" : "text-white/60"}`}>{propertyFilterCopy.egp}</button><button type="button" onClick={() => setPropertyCurrency("USD")} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${propertyCurrency === "USD" ? "bg-[#d8b26b] text-[#071a27]" : "text-white/60"}`}>{propertyFilterCopy.usd}</button></div><select value={propertyPriceBand} onChange={event => setPropertyPriceBand(event.target.value)} className="rounded-lg border border-white/10 bg-[#071a29] px-2.5 py-1.5 text-xs text-white outline-none" aria-label={propertyFilterCopy.all}><option value="all">{propertyFilterCopy.all}</option><option value="under1m">{propertyFilterCopy.under1m}</option><option value="oneTo3m">{propertyFilterCopy.oneTo3m}</option><option value="threeTo5m">{propertyFilterCopy.threeTo5m}</option><option value="over5m">{propertyFilterCopy.over5m}</option></select></div></div><div className="mt-4 space-y-3">{filteredProperties.map(item => <SalesPropertyRow key={Number(item.id)} item={item} t={t} editing={editingProperty === Number(item.id)} draft={propertyDraft} begin={() => { setEditingProperty(Number(item.id)); setEditingClient(null); setPropertyDraft({ name: String(item.name ?? ""), address: String(item.address ?? ""), propertyType: String(item.propertyType ?? ""), status: String(item.status ?? "available"), areaSqm: item.areaSqm == null ? "" : String(item.areaSqm), listPriceIls: item.listPriceIls == null ? "" : String(item.listPriceIls), attributesJson: String(item.attributesJson ?? "") }); }} setDraft={setPropertyDraft} save={saveProperty} cancel={() => setEditingProperty(null)} busy={updateProperty.isPending} money={money} status={propertyStatus} />)}{!data.properties.length && <p className="text-sm text-white/40">{t.emptyProperties}</p>}{data.properties.length > 0 && !filteredProperties.length && <p className="text-sm text-white/40">{propertyFilterCopy.noResults}</p>}</div></article><article className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><h3 className="font-medium text-white">{t.clients}</h3><div className="mt-4 space-y-3">{data.clients.map(item => <SalesClientRow key={Number(item.id)} item={item} t={t} editing={editingClient === Number(item.id)} draft={clientDraft} begin={() => { setEditingClient(Number(item.id)); setEditingProperty(null); setClientDraft({ name: String(item.name ?? ""), email: String(item.email ?? ""), phone: String(item.phone ?? ""), identityNumber: String(item.identityNumber ?? ""), attributesJson: String(item.attributesJson ?? "") }); }} setDraft={setClientDraft} save={saveClient} cancel={() => setEditingClient(null)} busy={updateClient.isPending} />)}{!data.clients.length && <p className="text-sm text-white/40">{t.emptyClients}</p>}</div></article></div>
    <article className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-4"><h3 className="font-medium text-white">{t.contracts}</h3><div className="mt-4 grid gap-3 lg:grid-cols-2">{data.contracts.map(contract => { const schedule = data.installments.filter(item => Number(item.salesContractId) === Number(contract.id)); return <div key={Number(contract.id)} className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-white">{String(contract.contractNumber)}</p><p className="mt-1 text-xs text-white/45">{money(contract.netPriceIls)} · {frequency(String(contract.paymentFrequency))} · {Number(contract.termYears)} {t.years}</p></div><span className="rounded-full bg-[#d8b26b]/10 px-2 py-1 text-[10px] text-[#e6c67d]">{String(contract.status)}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><p className="text-white/40">{t.deposit}</p><p className="mt-1 text-white">{money(contract.depositIls)}</p></div><div><p className="text-white/40">{t.balance}</p><p className="mt-1 text-white">{money(contract.balanceIls)}</p></div><div><p className="text-white/40">{t.count}</p><p className="mt-1 text-white">{schedule.length || Number(contract.installmentCount)}</p></div></div>{schedule.length > 0 && <details className="mt-3 border-t border-white/10 pt-3"><summary className="cursor-pointer text-xs text-[#e6c67d]">{t.schedule}</summary><div className="mt-2 space-y-1 text-xs text-white/55">{schedule.map(item => <div key={Number(item.id)} className="flex justify-between"><span>{Number(item.sequenceNumber)} · {item.dueAt ? new Date(item.dueAt).toLocaleDateString() : "—"}</span><span>{money(item.amountIls)}</span></div>)}</div></details>}</div> })}{!data.contracts.length && <p className="text-sm text-white/40">{t.emptyContracts}</p>}</div></article>
  </section>;
}

function salesAttributeEntries(raw: string | null | undefined): Array<[string, string]> {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return [];
    return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, value === null || value === undefined || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)]);
  } catch {
    return [];
  }
}

function SalesImportedFields({ value, label, editable = false, onChange }: { value: string | null | undefined; label: string; editable?: boolean; onChange?: (key: string, value: string) => void }) {
  const entries = salesAttributeEntries(value);
  if (!entries.length) return null;
  return <div className="sm:col-span-2 border-t border-white/10 pt-3"><p className="mb-2 text-[11px] font-medium uppercase tracking-[.12em] text-[#e6c67d]">{label.replace(/\s*\(JSON\)/i, "")}</p><div className="grid max-h-72 gap-2 overflow-y-auto pe-1 sm:grid-cols-2">{entries.map(([key, fieldValue]) => editable ? <label key={key} className="min-w-0 rounded-lg border border-white/10 bg-white/[.025] p-2"><span className="block truncate text-[10px] text-white/45" title={key}>{key}</span><input className="mt-1 w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30" value={fieldValue === "—" ? "" : fieldValue} onChange={event => onChange?.(key, event.target.value)} /></label> : <div key={key} className="min-w-0 rounded-lg border border-white/10 bg-white/[.025] p-2"><p className="truncate text-[10px] text-white/45" title={key}>{key}</p><p className="mt-1 break-words text-xs leading-5 text-white/80">{fieldValue}</p></div>)}</div></div>;
}

function SalesPropertyRow({ item, t, editing, draft, begin, setDraft, save, cancel, busy, money, status }: { item: any; t: any; editing: boolean; draft: Record<string, string>; begin: () => void; setDraft: (value: Record<string, string>) => void; save: () => void; cancel: () => void; busy: boolean; money: (value: number | null | undefined) => string; status: (value: string) => string }) {
  const update = (key: string, value: string) => setDraft({ ...draft, [key]: value });
  const updateExtra = (key: string, value: string) => {
    const attributes = Object.fromEntries(salesAttributeEntries(draft.attributesJson).map(([entryKey, entryValue]) => [entryKey, entryValue === "—" ? "" : entryValue]));
    attributes[key] = value;
    update("attributesJson", JSON.stringify(attributes));
  };
  return <div className="rounded-xl border border-white/10 bg-black/10 p-3">{editing ? <div className="grid gap-2 sm:grid-cols-2"><input className={inputClass} value={draft.name ?? ""} onChange={e => update("name", e.target.value)} placeholder={t.name} /><input className={inputClass} value={draft.address ?? ""} onChange={e => update("address", e.target.value)} placeholder={t.address} /><input className={inputClass} value={draft.propertyType ?? ""} onChange={e => update("propertyType", e.target.value)} placeholder={t.type} /><select className={inputClass} value={draft.status ?? "available"} onChange={e => update("status", e.target.value)}><option value="available">{t.available}</option><option value="reserved">{t.reserved}</option><option value="sold">{t.sold}</option><option value="inactive">{t.inactive}</option></select><input className={inputClass} type="number" min="0" value={draft.areaSqm ?? ""} onChange={e => update("areaSqm", e.target.value)} placeholder={t.area} /><input className={inputClass} type="number" min="0" value={draft.listPriceIls ?? ""} onChange={e => update("listPriceIls", e.target.value)} placeholder={t.price} /><SalesImportedFields value={draft.attributesJson} label={t.extra} editable onChange={updateExtra} /><div className="flex gap-2 sm:col-span-2"><button className="rounded-lg bg-[#d8b26b] px-3 py-2 text-xs font-semibold text-[#071a27]" disabled={busy} onClick={save}>{t.save}</button><button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65" onClick={cancel}>{t.cancel}</button></div></div> : <div><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{String(item.name)}</p><p className="mt-1 text-xs text-white/45">{String(item.address ?? "—")} · {status(String(item.status))} · {money(item.listPriceIls)}</p></div><button className="text-xs text-[#e6c67d]" onClick={begin}>{t.edit}</button></div><SalesImportedFields value={item.attributesJson} label={t.extra} /></div>}</div>;
}

function SalesClientRow({ item, t, editing, draft, begin, setDraft, save, cancel, busy }: { item: any; t: any; editing: boolean; draft: Record<string, string>; begin: () => void; setDraft: (value: Record<string, string>) => void; save: () => void; cancel: () => void; busy: boolean }) {
  const update = (key: string, value: string) => setDraft({ ...draft, [key]: value });
  const updateExtra = (key: string, value: string) => {
    const attributes = Object.fromEntries(salesAttributeEntries(draft.attributesJson).map(([entryKey, entryValue]) => [entryKey, entryValue === "—" ? "" : entryValue]));
    attributes[key] = value;
    update("attributesJson", JSON.stringify(attributes));
  };
  return <div className="rounded-xl border border-white/10 bg-black/10 p-3">{editing ? <div className="grid gap-2 sm:grid-cols-2"><input className={inputClass} value={draft.name ?? ""} onChange={e => update("name", e.target.value)} placeholder={t.name} /><input className={inputClass} value={draft.email ?? ""} onChange={e => update("email", e.target.value)} placeholder={t.email} /><input className={inputClass} value={draft.phone ?? ""} onChange={e => update("phone", e.target.value)} placeholder={t.phone} /><input className={inputClass} value={draft.identityNumber ?? ""} onChange={e => update("identityNumber", e.target.value)} placeholder={t.identity} /><SalesImportedFields value={draft.attributesJson} label={t.extra} editable onChange={updateExtra} /><div className="flex gap-2 sm:col-span-2"><button className="rounded-lg bg-[#d8b26b] px-3 py-2 text-xs font-semibold text-[#071a27]" disabled={busy} onClick={save}>{t.save}</button><button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65" onClick={cancel}>{t.cancel}</button></div></div> : <div><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{String(item.name)}</p><p className="mt-1 text-xs text-white/45">{String(item.email ?? item.phone ?? "—")}</p></div><button className="text-xs text-[#e6c67d]" onClick={begin}>{t.edit}</button></div><SalesImportedFields value={item.attributesJson} label={t.extra} /></div>}</div>;
}
