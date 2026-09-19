import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  Globe2,
  KeyRound,
  Loader2,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { isTransientNetworkError } from "@/lib/network";
import { trpc } from "@/lib/trpc";
import { useLocale, type Lang } from "@/contexts/LocaleContext";

const whatsappUrl = "https://wa.me/201501805674";

const loadingCopy: Record<Lang, { title: string; body: string }> = {
  ar: { title: "نجهّز مساحة العمل", body: "جارٍ التحقق من حسابك وفتح المميزات المفعّلة لك..." },
  en: { title: "Preparing your workspace", body: "We are checking your account and opening your enabled capabilities..." },
  he: { title: "מכינים את סביבת העבודה", body: "בודקים את החשבון ופותחים את היכולות הפעילות שלך..." },
  ru: { title: "Подготавливаем рабочее пространство", body: "Проверяем аккаунт и открываем доступные вам возможности..." },
  uk: { title: "Готуємо робочий простір", body: "Перевіряємо акаунт і відкриваємо доступні вам можливості..." },
};

const connectionCopy: Record<Lang, { body: string; retry: string }> = {
  ar: { body: "تعذر الاتصال مؤقتاً. تحقق من الإنترنت ثم أعد المحاولة.", retry: "إعادة المحاولة" },
  en: { body: "The connection is temporarily unavailable. Check your internet and try again.", retry: "Try again" },
  he: { body: "החיבור אינו זמין זמנית. בדקו את האינטרנט ונסו שוב.", retry: "נסו שוב" },
  ru: { body: "Соединение временно недоступно. Проверьте интернет и повторите попытку.", retry: "Повторить" },
  uk: { body: "З’єднання тимчасово недоступне. Перевірте інтернет і спробуйте ще раз.", retry: "Спробувати знову" },
};

const homeCopy: Record<Lang, {
  language: string;
  navWorkspace: string;
  navPlans: string;
  navSecurity: string;
  signIn: string;
  account: string;
  start: string;
  heroBadge: string;
  hero: string;
  heroAccent: string;
  heroLead: string;
  plansAction: string;
  exploreAction: string;
  heroNotes: string[];
  previewLabel: string;
  previewTitle: string;
  previewLead: string;
  previewRows: string[];
  dataNotice: string;
  workspaceEyebrow: string;
  workspaceTitle: string;
  workspaceLead: string;
  modules: { title: string; description: string }[];
  openWorkspace: string;
  workspaceAccess: string;
  journeyEyebrow: string;
  journeyTitle: string;
  journey: { number: string; title: string; description: string }[];
  securityTitle: string;
  securityBody: string;
  securityItems: string[];
  plansEyebrow: string;
  plansTitle: string;
  plansLead: string;
  plansActionLong: string;
  paymentEyebrow: string;
  paymentTitle: string;
  paymentBody: string;
  contact: string;
  faqTitle: string;
  faq: [string, string][];
  footer: string;
}> = {
  ar: {
    language: "العربية", navWorkspace: "مساحة العمل", navPlans: "الخطط", navSecurity: "الأمان", signIn: "تسجيل الدخول", account: "حسابي", start: "اختر خطتك",
    heroBadge: "منصة SaaS لتشغيل العقارات", hero: "قسمان واضحان", heroAccent: "من الاشتراك إلى التشغيل", heroLead: "اختر خطة تناسب شركتك، ثم افتح مساحة عمل واحدة تدير العقارات والعقود والتحصيل والعمليات والمبيعات والفريق من بيانات شركتك الحقيقية.", plansAction: "استكشف الخطط", exploreAction: "استكشف مساحة العمل", heroNotes: ["دفع يدوي موثق", "مفتاح تفعيل فريد", "خمس لغات"],
    previewLabel: "DAR.EST Property OS", previewTitle: "مساحة تشغيل شركتك", previewLead: "بدل جداول متفرقة وأدوات منفصلة، تتجمع مهامك اليومية في وحدات مترابطة وصلاحيات واضحة.", previewRows: ["المحفظة والوحدات", "العقود والتحصيل", "العمليات والمستندات", "المبيعات والفريق"], dataNotice: "تظهر بيانات شركتك الفعلية هنا بعد تسجيل الدخول والتفعيل.",
    workspaceEyebrow: "مساحة العمل", workspaceTitle: "ليست صفحة أسماء للعقارات فقط.", workspaceLead: "كل وحدة ترتبط بسير عمل فعلي وصلاحيات الشركة وسجل نشاطها؛ لا تُعرض أرقام تجريبية على أنها بياناتك.", modules: [{ title: "المحفظة العقارية", description: "مبانٍ ووحدات وحالة إشغال وتاريخ تشغيلي منظم." }, { title: "العقود والتحصيل", description: "عقود، استحقاقات، دفعات وعكس دفعة محفوظة بسجل واضح." }, { title: "العمليات والمستندات", description: "أوامر عمل وملفات شركة مصنفة وإصدارات قابلة للتتبع." }, { title: "مركز المبيعات", description: "عقارات وعملاء ومهام وخطط دفع ورفع ملفات شيت كاملة." }, { title: "الفريق والصلاحيات", description: "أعضاء ودعوات وصلاحيات وحضور ونشاط داخل الشركة." }, { title: "المستشار العقاري", description: "مساعد عائم للبحث والمطابقة والتسويق ضمن بيانات الشركة المصرح بها." }], openWorkspace: "فتح مساحة العمل", workspaceAccess: "يتطلب الدخول وحساباً مفعّلاً؛ لا يتجاوز هذا الرابط أي صلاحية.",
    journeyEyebrow: "رحلة العميل", journeyTitle: "ماذا يحدث بعد اختيار الخطة؟", journey: [{ number: "01", title: "اختر الخطة", description: "اطلع على المدة والسعر وحدود الاستخدام في صفحة الخطط." }, { number: "02", title: "أرسل إثبات الدفع", description: "يُراجع الطلب يدوياً ولا يُعتبر فتح الرابط دفعة ناجحة." }, { number: "03", title: "فعّل المفتاح", description: "يصدر مفتاح فريد بعد الموافقة ويظهر داخل الحساب." }, { number: "04", title: "أنشئ شركتك وابدأ", description: "تُفتح مساحة العمل والبيانات والصلاحيات وفق اشتراكك." }],
    securityTitle: "الاشتراك والوصول مبنيان على تحقق فعلي.", securityBody: "كل عملية تنتقل من طلب دفع موثق إلى مراجعة، ثم مفتاح تفعيل فريد داخل الحساب. لا يتفعّل الاشتراك بمجرد الضغط على أي رابط دفع.", securityItems: ["إثبات دفع مرفوع", "مراجعة إدارية موثقة", "مفتاح مستقل قابل للتتبع"],
    plansEyebrow: "قسم الخطط والاشتراكات", plansTitle: "التفاصيل والأسعار في مكان واحد.", plansLead: "تتضمن صفحة الخطط الأربع مدد واضحة، المزايا وحدود الاستخدام، وخطوات الشراء اليدوي والتفعيل. لا تتكرر البطاقات هنا حتى تبقى رحلة الشراء واضحة.", plansActionLong: "الذهاب إلى الخطط والاشتراكات", paymentEyebrow: "شراء مفتاح التفعيل", paymentTitle: "هل تحتاج مساعدة في الشراء؟", paymentBody: "تواصل عبر WhatsApp لشراء مفتاح الخطة، ثم أرسل إثبات الدفع وانتظر المراجعة قبل التفعيل.", contact: "التواصل عبر WhatsApp", faqTitle: "أسئلة شائعة", faq: [["متى أرى مساحة العمل؟", "بعد تسجيل الدخول ووجود اشتراك فعال، يفتح النظام مساحة العمل المرتبطة بحسابك."], ["هل تُفعل الخطة عند الضغط على رابط الدفع؟", "لا. تظل الحالة بانتظار التأكيد إلى أن يراجع فريق الإدارة الإثبات."], ["هل يمكن للفريق استخدام نفس الشركة؟", "نعم. يدعم النظام أعضاء الشركة والدعوات والصلاحيات بحسب دور كل عضو."]], footer: "تشغيل عقاري واضح وقابل للتتبع",
  },
  en: {
    language: "English", navWorkspace: "Workspace", navPlans: "Plans", navSecurity: "Security", signIn: "Sign in", account: "Account", start: "Choose a plan",
    heroBadge: "SaaS for property operations", hero: "Two clear destinations", heroAccent: "from subscription to operations", heroLead: "Choose a plan for your company, then open one workspace for properties, leases, collections, operations, sales, and your team—built on your real company data.", plansAction: "Explore plans", exploreAction: "Explore the workspace", heroNotes: ["Documented manual payment", "Unique activation key", "Five languages"],
    previewLabel: "DAR.EST Property OS", previewTitle: "Your company workspace", previewLead: "Instead of disconnected spreadsheets and tools, daily work is organized into connected operational modules with clear permissions.", previewRows: ["Portfolio and units", "Leases and collections", "Operations and documents", "Sales and team"], dataNotice: "Your real company data appears here after sign-in and activation.",
    workspaceEyebrow: "Workspace", workspaceTitle: "More than a page for property names.", workspaceLead: "Every module follows a real workflow, company permissions, and an activity record; no sample figures are presented as your data.", modules: [{ title: "Property portfolio", description: "Buildings, units, occupancy, and organized operational history." }, { title: "Leases and collections", description: "Leases, due dates, payments, and payment reversals with a clear record." }, { title: "Operations and documents", description: "Work orders and categorized company files with traceable versions." }, { title: "Sales center", description: "Properties, clients, tasks, payment plans, and full spreadsheet imports." }, { title: "Team and permissions", description: "Members, invitations, roles, attendance, and company activity." }, { title: "Property advisor", description: "A floating assistant for search, matching, and marketing within authorized company data." }], openWorkspace: "Open workspace", workspaceAccess: "Sign-in and an active account are required; this link never bypasses permissions.",
    journeyEyebrow: "Customer journey", journeyTitle: "What happens after you choose a plan?", journey: [{ number: "01", title: "Choose a plan", description: "Review duration, price, and usage limits on the plans page." }, { number: "02", title: "Submit payment proof", description: "The request is reviewed manually; opening a link is not payment confirmation." }, { number: "03", title: "Activate the key", description: "A unique key is issued after approval and shown in the account." }, { number: "04", title: "Create your company", description: "Your workspace, data, and permissions open for your subscription." }],
    securityTitle: "Subscription access is based on real verification.", securityBody: "Each request moves from documented payment proof to review, then a unique activation key in the account. A plan is never activated merely by opening a payment link.", securityItems: ["Uploaded payment proof", "Documented owner review", "Traceable, independent key"],
    plansEyebrow: "Plans & subscriptions", plansTitle: "All prices and details in one place.", plansLead: "The dedicated plans page holds the four durations, included value, usage limits, manual purchase steps, and activation flow. Cards are not repeated here, so the purchasing path stays clear.", plansActionLong: "Go to plans & subscriptions", paymentEyebrow: "Activation-key purchase", paymentTitle: "Need help purchasing?", paymentBody: "Contact us on WhatsApp to purchase a plan key, then submit payment proof and wait for review before activation.", contact: "Contact on WhatsApp", faqTitle: "Frequently asked", faq: [["When can I see the workspace?", "After sign-in and an active subscription, the system opens the workspace connected to your account."], ["Does a payment link activate the plan?", "No. The status stays pending until an administrator reviews the proof."], ["Can a team use one company?", "Yes. The product supports company members, invitations, and role-based permissions."]], footer: "Clear, traceable property operations",
  },
  he: {
    language: "עברית", navWorkspace: "סביבת עבודה", navPlans: "מסלולים", navSecurity: "אבטחה", signIn: "כניסה", account: "החשבון שלי", start: "בחירת מסלול",
    heroBadge: "SaaS לתפעול נדל״ן", hero: "שני יעדים ברורים", heroAccent: "מהמנוי לתפעול", heroLead: "בוחרים מסלול לחברה, ואז פותחים סביבת עבודה אחת לנכסים, חוזים, גבייה, תפעול, מכירות וצוות — על בסיס נתוני החברה האמיתיים.", plansAction: "למסלולים", exploreAction: "להכיר את סביבת העבודה", heroNotes: ["תשלום ידני מתועד", "מפתח הפעלה ייחודי", "חמש שפות"],
    previewLabel: "DAR.EST Property OS", previewTitle: "סביבת העבודה של החברה", previewLead: "במקום גיליונות וכלים מנותקים, העבודה היומית מאורגנת במודולים תפעוליים מחוברים ובהרשאות ברורות.", previewRows: ["תיק נכסים ויחידות", "חוזים וגבייה", "תפעול ומסמכים", "מכירות וצוות"], dataNotice: "נתוני החברה האמיתיים יופיעו כאן לאחר כניסה והפעלה.",
    workspaceEyebrow: "סביבת עבודה", workspaceTitle: "יותר מדף של שמות נכסים.", workspaceLead: "כל מודול פועל לפי תהליך אמיתי, הרשאות חברה ויומן פעילות; מספרי דוגמה אינם מוצגים כאילו הם הנתונים שלכם.", modules: [{ title: "תיק נכסים", description: "בניינים, יחידות, תפוסה והיסטוריה תפעולית מסודרת." }, { title: "חוזים וגבייה", description: "חוזים, מועדי תשלום, תשלומים וביטולים עם תיעוד ברור." }, { title: "תפעול ומסמכים", description: "הזמנות עבודה וקבצי חברה מסווגים עם גרסאות ניתנות למעקב." }, { title: "מרכז מכירות", description: "נכסים, לקוחות, משימות, תכניות תשלום וייבוא גיליונות מלאים." }, { title: "צוות והרשאות", description: "חברים, הזמנות, תפקידים, נוכחות ופעילות חברה." }, { title: "יועץ נדל״ן", description: "עוזר צף לחיפוש, התאמה ושיווק בתוך נתוני החברה המורשים." }], openWorkspace: "פתיחת סביבת העבודה", workspaceAccess: "נדרשים כניסה וחשבון פעיל; הקישור אינו עוקף הרשאות.",
    journeyEyebrow: "מסע הלקוח", journeyTitle: "מה קורה אחרי בחירת מסלול?", journey: [{ number: "01", title: "בוחרים מסלול", description: "בודקים תקופה, מחיר ומגבלות שימוש בדף המסלולים." }, { number: "02", title: "מגישים הוכחת תשלום", description: "הבקשה נבדקת ידנית; פתיחת קישור אינה אישור תשלום." }, { number: "03", title: "מפעילים את המפתח", description: "לאחר אישור מונפק מפתח ייחודי ומופיע בחשבון." }, { number: "04", title: "יוצרים חברה ומתחילים", description: "סביבת העבודה, הנתונים וההרשאות נפתחים לפי המנוי." }],
    securityTitle: "הגישה למנוי מבוססת על אימות אמיתי.", securityBody: "כל בקשה עוברת מהוכחת תשלום מתועדת לבחינה, ואז למפתח הפעלה ייחודי בחשבון. מסלול לעולם אינו מופעל רק מפתיחת קישור תשלום.", securityItems: ["הוכחת תשלום שהועלתה", "בדיקת מנהל מתועדת", "מפתח עצמאי בר-מעקב"],
    plansEyebrow: "מסלולים ומנויים", plansTitle: "כל המחירים והפרטים במקום אחד.", plansLead: "דף המסלולים הייעודי כולל ארבע תקופות, ערך כלול, מגבלות שימוש, שלבי קנייה ידנית והפעלה. הכרטיסים אינם חוזרים כאן כדי לשמור על מסלול רכישה ברור.", plansActionLong: "למסלולים ומנויים", paymentEyebrow: "רכישת מפתח הפעלה", paymentTitle: "צריכים עזרה ברכישה?", paymentBody: "צרו קשר ב-WhatsApp לרכישת מפתח מסלול, הגישו הוכחת תשלום והמתינו לבדיקה לפני ההפעלה.", contact: "יצירת קשר ב-WhatsApp", faqTitle: "שאלות נפוצות", faq: [["מתי רואים את סביבת העבודה?", "אחרי כניסה ומנוי פעיל המערכת פותחת את סביבת העבודה המקושרת לחשבון."], ["האם קישור תשלום מפעיל את המסלול?", "לא. הסטטוס נשאר בהמתנה עד שמנהל בודק את ההוכחה."], ["האם צוות יכול להשתמש באותה חברה?", "כן. המוצר תומך בחברי חברה, הזמנות והרשאות לפי תפקיד."]], footer: "תפעול נדל״ן ברור וניתן למעקב",
  },
  ru: {
    language: "Русский", navWorkspace: "Рабочее пространство", navPlans: "Тарифы", navSecurity: "Безопасность", signIn: "Войти", account: "Аккаунт", start: "Выбрать тариф",
    heroBadge: "SaaS для операций с недвижимостью", hero: "Два понятных раздела", heroAccent: "от подписки к работе", heroLead: "Выберите тариф для компании, затем откройте единое пространство для объектов, договоров, сборов, операций, продаж и команды — на основе реальных данных компании.", plansAction: "Посмотреть тарифы", exploreAction: "Изучить рабочее пространство", heroNotes: ["Документированная ручная оплата", "Уникальный ключ активации", "Пять языков"],
    previewLabel: "DAR.EST Property OS", previewTitle: "Рабочее пространство компании", previewLead: "Вместо разрозненных таблиц и инструментов ежедневная работа собрана в связанные модули с понятными правами доступа.", previewRows: ["Портфель и объекты", "Договоры и сборы", "Операции и документы", "Продажи и команда"], dataNotice: "Реальные данные компании появятся здесь после входа и активации.",
    workspaceEyebrow: "Рабочее пространство", workspaceTitle: "Больше, чем страница с названиями объектов.", workspaceLead: "Каждый модуль следует реальному процессу, правам компании и журналу активности; демонстрационные цифры не выдаются за ваши данные.", modules: [{ title: "Портфель недвижимости", description: "Здания, единицы, занятость и организованная операционная история." }, { title: "Договоры и сборы", description: "Договоры, сроки, платежи и отмены платежей с понятной записью." }, { title: "Операции и документы", description: "Рабочие заказы и классифицированные файлы компании с отслеживаемыми версиями." }, { title: "Центр продаж", description: "Объекты, клиенты, задачи, планы платежей и полный импорт таблиц." }, { title: "Команда и права", description: "Участники, приглашения, роли, посещаемость и активность компании." }, { title: "Консультант по недвижимости", description: "Плавающий помощник для поиска, подбора и маркетинга в разрешённых данных компании." }], openWorkspace: "Открыть рабочее пространство", workspaceAccess: "Нужны вход и активный аккаунт; ссылка не обходит права.",
    journeyEyebrow: "Путь клиента", journeyTitle: "Что происходит после выбора тарифа?", journey: [{ number: "01", title: "Выберите тариф", description: "Проверьте срок, цену и лимиты использования на странице тарифов." }, { number: "02", title: "Отправьте подтверждение", description: "Заявка проверяется вручную; открытие ссылки не является подтверждением оплаты." }, { number: "03", title: "Активируйте ключ", description: "После одобрения уникальный ключ появится в аккаунте." }, { number: "04", title: "Создайте компанию", description: "Рабочее пространство, данные и права откроются по подписке." }],
    securityTitle: "Доступ по подписке основан на реальной проверке.", securityBody: "Каждая заявка проходит от документированного подтверждения оплаты до проверки, затем к уникальному ключу в аккаунте. Тариф не активируется простым открытием платёжной ссылки.", securityItems: ["Загруженное подтверждение", "Документированная проверка владельца", "Отдельный отслеживаемый ключ"],
    plansEyebrow: "Тарифы и подписки", plansTitle: "Все цены и условия в одном месте.", plansLead: "Выделенная страница тарифов содержит четыре срока, включённую ценность, лимиты, ручную покупку и активацию. Карточки не повторяются здесь, чтобы путь покупки оставался ясным.", plansActionLong: "Перейти к тарифам и подпискам", paymentEyebrow: "Покупка ключа активации", paymentTitle: "Нужна помощь с покупкой?", paymentBody: "Свяжитесь с нами в WhatsApp, чтобы купить ключ тарифа, затем отправьте подтверждение и дождитесь проверки.", contact: "Связаться через WhatsApp", faqTitle: "Частые вопросы", faq: [["Когда видно рабочее пространство?", "После входа и активной подписки система открывает пространство, связанное с аккаунтом."], ["Активирует ли платёжная ссылка тариф?", "Нет. Статус остаётся ожидающим до проверки подтверждения администратором."], ["Может ли команда использовать одну компанию?", "Да. Поддерживаются участники, приглашения и ролевые права."]], footer: "Понятные и отслеживаемые операции с недвижимостью",
  },
  uk: {
    language: "Українська", navWorkspace: "Робочий простір", navPlans: "Тарифи", navSecurity: "Безпека", signIn: "Увійти", account: "Акаунт", start: "Обрати тариф",
    heroBadge: "SaaS для операцій з нерухомістю", hero: "Два зрозумілі розділи", heroAccent: "від підписки до роботи", heroLead: "Оберіть тариф для компанії, потім відкрийте єдиний простір для об’єктів, договорів, стягнень, операцій, продажів і команди — на основі реальних даних компанії.", plansAction: "Переглянути тарифи", exploreAction: "Ознайомитися з простором", heroNotes: ["Задокументована ручна оплата", "Унікальний ключ активації", "П’ять мов"],
    previewLabel: "DAR.EST Property OS", previewTitle: "Робочий простір компанії", previewLead: "Замість розрізнених таблиць та інструментів щоденна робота організована у пов’язаних модулях із чіткими дозволами.", previewRows: ["Портфель і об’єкти", "Договори та стягнення", "Операції й документи", "Продажі та команда"], dataNotice: "Реальні дані компанії з’являться тут після входу та активації.",
    workspaceEyebrow: "Робочий простір", workspaceTitle: "Більше, ніж сторінка з назвами об’єктів.", workspaceLead: "Кожен модуль має реальний процес, дозволи компанії та журнал активності; демонстраційні цифри не видаються за ваші дані.", modules: [{ title: "Портфель нерухомості", description: "Будівлі, одиниці, заповненість та впорядкована операційна історія." }, { title: "Договори та стягнення", description: "Договори, строки, платежі й скасування платежів із чітким записом." }, { title: "Операції й документи", description: "Робочі замовлення та класифіковані файли компанії з відстежуваними версіями." }, { title: "Центр продажів", description: "Об’єкти, клієнти, завдання, плани платежів і повний імпорт таблиць." }, { title: "Команда та дозволи", description: "Учасники, запрошення, ролі, відвідуваність і активність компанії." }, { title: "Радник з нерухомості", description: "Плаваючий помічник для пошуку, підбору та маркетингу в авторизованих даних компанії." }], openWorkspace: "Відкрити робочий простір", workspaceAccess: "Потрібні вхід та активний акаунт; посилання не обходить дозволи.",
    journeyEyebrow: "Шлях клієнта", journeyTitle: "Що відбувається після вибору тарифу?", journey: [{ number: "01", title: "Оберіть тариф", description: "Перегляньте строк, ціну та ліміти використання на сторінці тарифів." }, { number: "02", title: "Надішліть підтвердження", description: "Заявка перевіряється вручну; відкриття посилання не є підтвердженням оплати." }, { number: "03", title: "Активуйте ключ", description: "Після схвалення у вашому акаунті з’являється унікальний ключ." }, { number: "04", title: "Створіть компанію", description: "Робочий простір, дані й дозволи відкриються відповідно до підписки." }],
    securityTitle: "Доступ за підпискою заснований на реальній перевірці.", securityBody: "Кожна заявка проходить від задокументованого підтвердження оплати до перевірки, а потім до унікального ключа в акаунті. Тариф не активується лише відкриттям платіжного посилання.", securityItems: ["Завантажене підтвердження", "Задокументована перевірка власника", "Окремий відстежуваний ключ"],
    plansEyebrow: "Тарифи й підписки", plansTitle: "Усі ціни та умови в одному місці.", plansLead: "Окрема сторінка тарифів містить чотири строки, включену цінність, ліміти, ручну купівлю та активацію. Картки не повторюються тут, щоб шлях купівлі був зрозумілим.", plansActionLong: "Перейти до тарифів і підписок", paymentEyebrow: "Купівля ключа активації", paymentTitle: "Потрібна допомога з купівлею?", paymentBody: "Зв’яжіться з нами через WhatsApp, щоб придбати ключ тарифу, потім надішліть підтвердження та дочекайтеся перевірки.", contact: "Зв’язатися через WhatsApp", faqTitle: "Поширені запитання", faq: [["Коли видно робочий простір?", "Після входу та активної підписки система відкриває простір, пов’язаний з акаунтом."], ["Чи активує платіжне посилання тариф?", "Ні. Статус залишається очікуваним, доки адміністратор не перевірить підтвердження."], ["Чи може команда користуватися однією компанією?", "Так. Підтримуються учасники компанії, запрошення та рольові дозволи."]], footer: "Зрозумілі й відстежувані операції з нерухомістю",
  },
};

const moduleIcons = [Building2, CalendarDays, KeyRound, Crown, ShieldCheck, Sparkles] as const;

function Brand() {
  return <div className="flex items-center gap-3" dir="ltr"><div className="grid h-10 w-10 place-items-center border border-[#d8b26b]/60 bg-[#071b2a]/60 text-[#e7c47c]"><span className="text-lg font-black">D</span></div><div className="leading-none"><div className="text-[14px] font-semibold tracking-[.24em] text-white">DAR.EST</div><div className="mt-1.5 text-[8px] uppercase tracking-[.28em] text-white/45">Property operations</div></div></div>;
}

export default function Home() {
  const { isAuthenticated, user, loading, error: authError, refresh } = useAuth();
  const { lang, setLang, dir, languageOptions: localeOptions } = useLocale();
  const accountAccess = trpc.account.access.useQuery(undefined, { enabled: isAuthenticated });
  const destination = accountAccess.data?.destination ?? "/workspace";
  const shouldOpenWorkspace = Boolean(isAuthenticated && accountAccess.data?.active && destination !== "/plans");
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const t = homeCopy[lang];
  const hasConnectionError = isTransientNetworkError(authError) || isTransientNetworkError(accountAccess.error);
  const languageOptions = useMemo(() => localeOptions.filter(option => option.code !== lang).map(option => option.code), [localeOptions, lang]);

  useEffect(() => { if (shouldOpenWorkspace) window.location.replace(destination); }, [destination, shouldOpenWorkspace]);

  if (loading || (isAuthenticated && accountAccess.isLoading) || shouldOpenWorkspace) {
    const message = loadingCopy[lang];
    return <main dir={dir} className="relative grid min-h-screen place-items-center overflow-hidden bg-[#061725] px-6 text-white" aria-busy="true" aria-live="polite"><div className="absolute inset-0 bg-[url('/manus-storage/luxury-residence-twilight_0f4510c3.png')] bg-cover bg-center opacity-25" /><div className="absolute inset-0 bg-[#061725]/80" /><div className="relative w-full max-w-md border border-[#d8b26b]/35 bg-[#071b2a]/90 p-9 text-center"><Loader2 size={28} className="mx-auto animate-spin text-[#e5c47c]" aria-hidden="true" /><div className="mt-6 text-[12px] font-semibold tracking-[.25em] text-[#e7c47c]">DAR.EST</div><h1 className="mt-5 font-serif text-3xl text-[#fff8e8]">{message.title}</h1><p className="mt-4 text-sm leading-7 text-white/65">{message.body}</p></div></main>;
  }

  return <main dir={dir} lang={lang} className="min-h-screen overflow-x-hidden bg-[#061725] text-white selection:bg-[#d8b26b] selection:text-[#061725]">
    {hasConnectionError && <div role="alert" className="sticky top-0 z-[80] border-b border-amber-300/25 bg-[#2b2417]/95 px-4 py-3 text-center text-sm text-amber-50"><span>{connectionCopy[lang].body}</span><button type="button" onClick={() => void refresh()} className="mx-3 border border-amber-200/40 px-3 py-1 font-semibold text-amber-100">{connectionCopy[lang].retry}</button></div>}

    <section className="relative isolate min-h-[760px] overflow-hidden border-b border-[#d8b26b]/25">
      <div className="absolute inset-0 -z-30 bg-[#061725]" /><div className="absolute inset-y-0 end-0 -z-20 w-full bg-[url('/manus-storage/luxury-residence-twilight_0f4510c3.png')] bg-cover bg-center opacity-75 lg:w-[67%]" /><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#061725_0%,rgba(6,23,37,.96)_34%,rgba(6,23,37,.55)_61%,rgba(6,23,37,.08)_100%)]" /><div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#061725_0%,transparent_48%,rgba(4,14,23,.35)_100%)]" /><div className="absolute end-[15%] top-0 -z-10 h-full w-px bg-[#d8b26b]/35" />
      <nav className="container flex items-center justify-between py-7">
        <Brand />
        <div className="hidden items-center gap-7 text-xs tracking-wide text-white/65 md:flex">
          <a href="#workspace" className="border-b border-transparent pb-1 hover:border-[#d8b26b] hover:text-white">{t.navWorkspace}</a>
          <Link href="/plans" className="border-b border-transparent pb-1 hover:border-[#d8b26b] hover:text-white">{t.navPlans}</Link>
          <a href="#security" className="border-b border-transparent pb-1 hover:border-[#d8b26b] hover:text-white">{t.navSecurity}</a>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="relative">
            <button type="button" aria-label="Language" aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => setLanguageOpen(value => !value)} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-xs text-white/70 hover:border-[#d8b26b]/55 hover:text-white">
              <Globe2 size={13} />
              <span>{localeOptions.find(option => option.code === lang)?.label ?? lang}</span>
              <ChevronDown size={13} className={languageOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {languageOpen && <div role="menu" aria-label="Language selection" className="absolute end-0 top-[calc(100%+8px)] z-40 min-w-40 border border-[#d8b26b]/30 bg-[#061725]/98 p-1.5 text-xs shadow-[0_18px_42px_rgba(0,0,0,.35)] backdrop-blur-xl">{localeOptions.map(option => <button key={option.code} type="button" role="menuitem" onClick={() => { setLang(option.code); setLanguageOpen(false); }} className={`flex w-full items-center justify-between px-3 py-2.5 text-start transition ${option.code === lang ? "bg-[#d8b26b]/15 text-[#f0d79d]" : "text-white/70 hover:bg-white/7 hover:text-white"}`}><span>{option.label}</span><span className="text-[9px] tracking-[.16em] text-white/35">{option.code.toUpperCase()}</span></button>)}</div>}
          </div>
          {isAuthenticated ? <Link href="/account" className="border border-white/20 px-4 py-2 text-xs text-white/85">{user?.name || t.account}</Link> : <button onClick={() => startLogin()} className="border border-white/20 px-4 py-2 text-xs text-white/85">{t.signIn}</button>}
          <Link href="/plans" className="bg-[#d8b26b] px-5 py-2.5 text-xs font-semibold text-[#061725]">{t.start}</Link>
        </div>
        <button type="button" aria-label="Menu" onClick={() => setMenuOpen(value => !value)} className="border border-white/25 p-2 md:hidden">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </nav>
      {menuOpen && <div className="container relative md:hidden"><div className="flex flex-col gap-4 border border-[#d8b26b]/30 bg-[#071b2a] p-5 text-sm text-white/80"><select aria-label="Language" value={lang} onChange={event => { setLang(event.target.value as Lang); setMenuOpen(false); }} className="border border-white/15 bg-[#061725] px-3 py-2 text-white">{localeOptions.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}</select><a href="#workspace" onClick={() => setMenuOpen(false)}>{t.navWorkspace}</a><Link href="/plans" onClick={() => setMenuOpen(false)}>{t.navPlans}</Link><a href="#security" onClick={() => setMenuOpen(false)}>{t.navSecurity}</a>{isAuthenticated ? <Link href="/account">{t.account}</Link> : <button type="button" className="text-start" onClick={() => startLogin()}>{t.signIn}</button>}</div></div>}
      <div className="container grid gap-12 pb-24 pt-20 lg:grid-cols-[1fr_.82fr] lg:items-end lg:pb-28 lg:pt-28"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 border-y border-[#d8b26b]/50 py-2 text-[10px] font-semibold tracking-[.22em] text-[#f0d79d]"><Sparkles size={13} />{t.heroBadge}</div><h1 className="mt-8 max-w-2xl font-serif text-5xl font-medium leading-[.96] tracking-[-.055em] text-[#fff9ed] sm:text-6xl lg:text-7xl">{t.hero}<span className="mt-3 block text-[#d8b26b]">{t.heroAccent}</span></h1><p className="mt-8 max-w-xl border-s-2 border-[#d8b26b]/60 ps-5 text-base leading-8 text-white/72 sm:text-lg">{t.heroLead}</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/plans" className="inline-flex items-center justify-center gap-2 bg-[#d8b26b] px-7 py-4 text-sm font-semibold text-[#061725]">{t.plansAction}<ArrowLeft size={18} /></Link><a href="#workspace" className="inline-flex items-center justify-center border border-white/25 bg-[#061725]/25 px-7 py-4 text-sm text-white/90 backdrop-blur">{t.exploreAction}</a></div><div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/65">{t.heroNotes.map(item => <span key={item} className="inline-flex items-center gap-2"><Check size={15} className="text-[#d8b26b]" />{item}</span>)}</div></div><aside className="border border-[#d8b26b]/45 bg-[#071b2a]/85 p-6 backdrop-blur-xl sm:p-8"><div className="flex items-start justify-between border-b border-[#d8b26b]/25 pb-6"><div><div className="text-[10px] font-semibold tracking-[.2em] text-[#d8b26b]">{t.previewLabel}</div><h2 className="mt-3 font-serif text-3xl text-[#fff9ed]">{t.previewTitle}</h2></div><span className="border border-[#d8b26b]/40 px-2 py-1 text-[9px] tracking-[.15em] text-[#f0d79d]">OS</span></div><p className="mt-5 leading-7 text-white/65">{t.previewLead}</p><div className="mt-7 grid border border-[#d8b26b]/20 bg-[#d8b26b]/15 sm:grid-cols-2">{t.previewRows.map((row, index) => <div key={row} className="border border-[#d8b26b]/10 bg-[#061725]/85 px-4 py-5"><span className="text-[10px] tracking-[.2em] text-[#d8b26b]">0{index + 1}</span><p className="mt-4 text-sm text-white/82">{row}</p></div>)}</div><p className="mt-5 text-xs leading-6 text-[#f0d79d]">{t.dataNotice}</p></aside></div>
    </section>

    <section id="workspace" className="relative scroll-mt-6 border-b border-[#d8b26b]/20 py-24 sm:py-28"><div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#061725_0%,#071b2a_58%,#061725_100%)]" /><div className="container"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-[10px] font-semibold tracking-[.22em] text-[#d8b26b]">{t.workspaceEyebrow}</p><h2 className="mt-5 max-w-xl font-serif text-4xl leading-tight text-[#fff9ed] sm:text-5xl">{t.workspaceTitle}</h2></div><p className="max-w-xl border-s border-[#d8b26b]/45 ps-5 text-lg leading-9 text-white/65">{t.workspaceLead}</p></div><div className="mt-16 grid border-y border-[#d8b26b]/25 md:grid-cols-2 xl:grid-cols-3">{t.modules.map((module, index) => { const Icon = moduleIcons[index]; return <article key={module.title} className="min-h-[235px] border border-[#d8b26b]/15 bg-[#071b2a]/50 p-6 transition hover:bg-[#0c2838]"><div className="flex items-center justify-between"><Icon size={21} className="text-[#d8b26b]" /><span className="text-[10px] tracking-[.2em] text-white/35">0{index + 1}</span></div><h3 className="mt-11 text-xl font-medium text-[#fff9ed]">{module.title}</h3><p className="mt-4 leading-7 text-white/55">{module.description}</p></article>; })}</div><div className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-[#d8b26b]/25 pt-7 md:flex-row md:items-center"><p className="max-w-2xl text-sm leading-7 text-white/55">{t.workspaceAccess}</p><Link href="/workspace" className="inline-flex shrink-0 items-center gap-2 border border-[#d8b26b]/55 px-6 py-3 text-sm font-semibold text-[#f0d79d] hover:bg-[#d8b26b]/10">{t.openWorkspace}<ArrowLeft size={17} /></Link></div></div></section>

    <section className="relative isolate overflow-hidden border-y border-[#d8b26b]/20 bg-[#071b2a] py-24"><div className="absolute inset-y-0 start-0 -z-10 w-full bg-[url('/manus-storage/luxury-interior-dark_4f792e05.jpg')] bg-cover bg-center opacity-25 lg:w-1/2" /><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,23,37,.35)_0%,#071b2a_57%,#071b2a_100%)]" /><div className="container"><div className="max-w-2xl"><p className="text-[10px] font-semibold tracking-[.22em] text-[#d8b26b]">{t.journeyEyebrow}</p><h2 className="mt-5 font-serif text-4xl text-[#fff9ed] sm:text-5xl">{t.journeyTitle}</h2></div><div className="mt-16 grid border-y border-[#d8b26b]/25 md:grid-cols-2 xl:grid-cols-4">{t.journey.map(step => <article key={step.number} className="border border-[#d8b26b]/15 bg-[#071b2a]/85 p-6"><div className="text-xs font-semibold tracking-[.2em] text-[#e3c27e]">{step.number}</div><h3 className="mt-12 text-xl font-medium text-[#fff9ed]">{step.title}</h3><p className="mt-4 leading-7 text-white/60">{step.description}</p></article>)}</div></div></section>

    <section id="security" className="container scroll-mt-6 py-24 sm:py-28"><div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-center"><div><div className="grid h-12 w-12 place-items-center border border-[#d8b26b]/45 text-[#e3c27e]"><ShieldCheck /></div><h2 className="mt-7 max-w-lg font-serif text-4xl text-[#fff9ed]">{t.securityTitle}</h2><p className="mt-5 max-w-lg leading-8 text-white/62">{t.securityBody}</p></div><div className="grid border border-[#d8b26b]/25 bg-[#d8b26b]/15 sm:grid-cols-3">{t.securityItems.map((item, index) => <div key={item} className="min-h-44 border border-[#d8b26b]/15 bg-[#071b2a] p-5"><div className="text-xl font-serif text-[#e3c27e]">0{index + 1}</div><div className="mt-10 text-sm font-medium text-white/88">{item}</div></div>)}</div></div></section>

    <section id="plans" className="container scroll-mt-6 pb-24"><div className="relative isolate overflow-hidden border border-[#d8b26b]/35 bg-[#071b2a] p-8 sm:p-12"><div className="absolute inset-y-0 end-0 -z-10 w-2/5 bg-[url('/manus-storage/luxury-residence-twilight_0f4510c3.png')] bg-cover bg-center opacity-25" /><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#071b2a_0%,rgba(7,27,42,.95)_55%,rgba(7,27,42,.45)_100%)]" /><div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-center"><div className="max-w-2xl"><p className="text-[10px] font-semibold tracking-[.22em] text-[#d8b26b]">{t.plansEyebrow}</p><h2 className="mt-5 font-serif text-4xl text-[#fff9ed]">{t.plansTitle}</h2><p className="mt-5 leading-8 text-white/65">{t.plansLead}</p></div><Link href="/plans" className="inline-flex items-center justify-center gap-2 bg-[#d8b26b] px-7 py-4 text-sm font-semibold text-[#061725]">{t.plansActionLong}<ArrowLeft size={18} /></Link></div></div></section>

    <section className="container pb-24" aria-labelledby="whatsapp-purchase-title"><div className="border border-[#25d366]/30 bg-[#071b2a] p-8 sm:p-10"><div className="max-w-2xl"><p className="text-[10px] font-semibold tracking-[.22em] text-[#4dde8c]">{t.paymentEyebrow}</p><h2 id="whatsapp-purchase-title" className="mt-4 font-serif text-3xl text-[#fff9ed]">{t.paymentTitle}</h2><p className="mt-4 leading-8 text-white/60">{t.paymentBody}</p></div><a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center justify-center gap-3 bg-[#25d366] px-6 py-3.5 text-sm font-semibold text-[#062315] transition hover:bg-[#53e487]"><span>{t.contact}</span><ArrowLeft size={18} /></a></div></section>

    <section className="container pb-24"><div className="mx-auto max-w-3xl"><h2 className="font-serif text-3xl text-[#fff9ed]">{t.faqTitle}</h2><div className="mt-8 divide-y divide-[#d8b26b]/20 border-y border-[#d8b26b]/25">{t.faq.map(([question, answer], index) => <div key={question} className="py-5"><button type="button" className="flex w-full items-center justify-between text-start" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span className="font-medium text-white/90">{question}</span><ChevronDown size={18} className={`text-[#d8b26b] ${openFaq === index ? "rotate-180" : ""}`} /></button>{openFaq === index && <p className="mt-4 max-w-2xl leading-8 text-white/60">{answer}</p>}</div>)}</div></div></section>

    <footer className="border-t border-[#d8b26b]/20 py-8"><div className="container flex flex-col gap-4 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between"><Brand /><span>© 2026 DAR.EST · {t.footer}</span><div className="flex items-center gap-2"><Globe2 size={14} />{languageOptions.slice(0, 2).map(option => <button key={option} type="button" onClick={() => setLang(option)} className="hover:text-[#f0d79d]">{homeCopy[option].language}</button>)}</div></div></footer>
  </main>;
}
