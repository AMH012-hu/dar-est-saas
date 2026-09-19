import {
  ArrowUpRight,
  Building2,
  Check,
  ChevronLeft,
  FileCheck2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { SUBSCRIPTION_PLANS, type PlanCode } from "@shared/subscriptionPlans";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { formatPlanAmount, formatPlanPrice } from "@/lib/pricing";

type LocaleKey = "ar" | "en" | "he" | "ru" | "uk";

const copy: Record<
  LocaleKey,
  {
    eyebrow: string;
    title: string;
    accent: string;
    intro: string;
    workspace: string;
    home: string;
    signIn: string;
    choose: string;
    selected: string;
    processIntro: string;
    review: string;
    evidence: string;
    activation: string;
    value: string;
    mostPopular: string;
    bestValue: string;
    monthly: string;
    quarterly: string;
    semiannual: string;
    annual: string;
    lifetime: string;
    start: string;
    workspaceEyebrow: string;
    workspaceTitle: string;
    workspaceBody: string;
    openWorkspace: string;
    secure: string;
    per: string;
    oneTime: string;
    included: string;
    baseRate: string;
  }
> = {
  ar: {
    eyebrow: "خطط واشتراكات DAR.EST",
    title: "اشتراك واضح.",
    accent: "تشغيل عقاري أقوى.",
    intro: "اختر الخطة المناسبة لشركتك وابدأ مساحة عمل عقارية منظمة، مع مراجعة دفع يدوية آمنة وتفعيل موثق.",
    workspace: "مساحة العمل",
    home: "الرئيسية",
    signIn: "تسجيل الدخول",
    choose: "اختر الخطة",
    selected: "مسار الاشتراك",
    processIntro: "من اختيار الخطة إلى الوصول التشغيلي، لا يُفعّل أي اشتراك قبل مراجعة إثبات الدفع.",
    review: "مراجعة الطلب",
    evidence: "رفع إثبات الدفع",
    activation: "تفعيل موثق",
    value: "خطط مصممة للنمو",
    mostPopular: "الأكثر اختياراً",
    bestValue: "أفضل قيمة",
    monthly: "Basic · شهر واحد",
    quarterly: "Plus · 3 أشهر",
    semiannual: "Pro · 6 أشهر",
    annual: "VIP · سنة كاملة",
    lifetime: "Enterprise · مدى الحياة",
    start: "اشترك الآن",
    workspaceEyebrow: "من الاشتراك إلى التشغيل",
    workspaceTitle: "مساحة عمل واحدة لفريق العقارات",
    workspaceBody: "بعد تفعيل الاشتراك، انتقل إلى عمليات المحفظة والعقود والتحصيل والمبيعات والفريق من واجهة تشغيلية واحدة.",
    openWorkspace: "فتح مساحة العمل",
    secure: "الدفع بالتواصل المباشر ومراجعة إثبات التحويل",
    per: "لكل مدة",
    oneTime: "دفعة واحدة",
    included: "يشمل",
    baseRate: "السعر الأساسي: 999 جنيه شهرياً",
  },
  en: {
    eyebrow: "DAR.EST PLANS & SUBSCRIPTIONS",
    title: "Clear subscription.",
    accent: "Stronger real-estate operations.",
    intro: "Choose the right plan for your company and start an organized property workspace with secure manual-payment review and documented activation.",
    workspace: "Workspace",
    home: "Home",
    signIn: "Sign in",
    choose: "Choose a plan",
    selected: "SUBSCRIPTION PATH",
    processIntro: "From plan selection to operational access, no subscription is activated before transfer proof is reviewed.",
    review: "Request review",
    evidence: "Upload payment proof",
    activation: "Documented activation",
    value: "PLANS BUILT FOR GROWTH",
    mostPopular: "MOST CHOSEN",
    bestValue: "BEST VALUE",
    monthly: "Basic · 1 month",
    quarterly: "Plus · 3 months",
    semiannual: "Pro · 6 months",
    annual: "VIP · 12 months",
    lifetime: "Enterprise · Lifetime",
    start: "Subscribe now",
    workspaceEyebrow: "FROM SUBSCRIPTION TO OPERATIONS",
    workspaceTitle: "One workspace for your real-estate team",
    workspaceBody: "Once your subscription is active, enter portfolio, contracts, collections, sales, and team operations from one focused control surface.",
    openWorkspace: "Open workspace",
    secure: "Payment is reviewed with transfer proof",
    per: "per term",
    oneTime: "one-time payment",
    included: "INCLUDED",
    baseRate: "Base monthly rate: $19.98",
  },
  he: {
    eyebrow: "מסלולים ומינויים של DAR.EST",
    title: "מנוי ברור.",
    accent: "ניהול נדל״ן חזק יותר.",
    intro: "בחרו את המסלול המתאים לחברה והתחילו סביבת עבודה מסודרת, עם בדיקת תשלום ידנית והפעלה מתועדת.",
    workspace: "סביבת עבודה",
    home: "ראשי",
    signIn: "כניסה",
    choose: "בחירת מסלול",
    selected: "מסלול המנוי",
    processIntro: "מבחירת המסלול ועד גישה תפעולית, שום מנוי אינו מופעל לפני בדיקת אסמכתת ההעברה.",
    review: "בדיקת בקשה",
    evidence: "העלאת אסמכתת תשלום",
    activation: "הפעלה מתועדת",
    value: "מסלולים לצמיחה",
    mostPopular: "הכי נבחר",
    bestValue: "הערך הטוב ביותר",
    monthly: "Basic · חודש",
    quarterly: "Plus · 3 חודשים",
    semiannual: "Pro · 6 חודשים",
    annual: "VIP · שנה מלאה",
    lifetime: "Enterprise · לכל החיים",
    start: "הצטרפות עכשיו",
    workspaceEyebrow: "ממנוי לתפעול",
    workspaceTitle: "סביבת עבודה אחת לצוות הנדל״ן",
    workspaceBody: "אחרי שהמנוי פעיל, עוברים לתיק נכסים, חוזים, גבייה, מכירות וצוות מממשק תפעולי ממוקד אחד.",
    openWorkspace: "פתיחת סביבת העבודה",
    secure: "התשלום נבדק עם אסמכתת העברה",
    per: "לכל תקופה",
    oneTime: "תשלום חד-פעמי",
    included: "כולל",
    baseRate: "מחיר חודשי בסיסי: EGP75",
  },
  ru: {
    eyebrow: "ТАРИФЫ И ПОДПИСКИ DAR.EST",
    title: "Понятная подписка.",
    accent: "Сильнее работа с недвижимостью.",
    intro: "Выберите подходящий тариф для компании и начните работу в организованном пространстве с безопасной ручной проверкой оплаты и документированной активацией.",
    workspace: "Рабочее пространство",
    home: "Главная",
    signIn: "Войти",
    choose: "Выбрать тариф",
    selected: "ПУТЬ ПОДПИСКИ",
    processIntro: "От выбора тарифа до операционного доступа: подписка не активируется до проверки подтверждения перевода.",
    review: "Проверка заявки",
    evidence: "Загрузка подтверждения",
    activation: "Документированная активация",
    value: "ТАРИФЫ ДЛЯ РОСТА",
    mostPopular: "ПОПУЛЯРНЫЙ",
    bestValue: "ЛУЧШАЯ ЦЕННОСТЬ",
    monthly: "Basic · 1 месяц",
    quarterly: "Plus · 3 месяца",
    semiannual: "Pro · 6 месяцев",
    annual: "VIP · 12 месяцев",
    lifetime: "Enterprise · навсегда",
    start: "Оформить подписку",
    workspaceEyebrow: "ОТ ПОДПИСКИ К РАБОТЕ",
    workspaceTitle: "Одно рабочее пространство для вашей команды",
    workspaceBody: "После активации подписки управляйте портфелем, договорами, платежами, продажами и командой из одной панели.",
    openWorkspace: "Открыть пространство",
    secure: "Оплата проверяется по подтверждению перевода",
    per: "за период",
    oneTime: "разовый платёж",
    included: "ВКЛЮЧЕНО",
    baseRate: "Базовая месячная ставка: EGP75",
  },
  uk: {
    eyebrow: "ТАРИФИ ТА ПІДПИСКИ DAR.EST",
    title: "Прозора підписка.",
    accent: "Сильніша робота з нерухомістю.",
    intro: "Оберіть план для своєї компанії та почніть роботу в організованому просторі з безпечною ручною перевіркою оплати й документованою активацією.",
    workspace: "Робочий простір",
    home: "Головна",
    signIn: "Увійти",
    choose: "Обрати план",
    selected: "ШЛЯХ ПІДПИСКИ",
    processIntro: "Від вибору плану до операційного доступу: підписка не активується до перевірки підтвердження переказу.",
    review: "Перевірка запиту",
    evidence: "Завантаження підтвердження",
    activation: "Документована активація",
    value: "ПЛАНИ ДЛЯ ЗРОСТАННЯ",
    mostPopular: "НАЙПОПУЛЯРНІШИЙ",
    bestValue: "НАЙКРАЩА ЦІННІСТЬ",
    monthly: "Basic · 1 місяць",
    quarterly: "Plus · 3 місяці",
    semiannual: "Pro · 6 місяців",
    annual: "VIP · 12 місяців",
    lifetime: "Enterprise · назавжди",
    start: "Оформити підписку",
    workspaceEyebrow: "ВІД ПІДПИСКИ ДО РОБОТИ",
    workspaceTitle: "Один робочий простір для вашої команди",
    workspaceBody: "Після активації підписки керуйте портфелем, договорами, стягненнями, продажами та командою з однієї панелі.",
    openWorkspace: "Відкрити простір",
    secure: "Оплату перевіряють за підтвердженням переказу",
    per: "за період",
    oneTime: "одноразовий платіж",
    included: "ВКЛЮЧЕНО",
    baseRate: "Базова місячна ставка: EGP75",
  },
};

const planBenefits: Record<LocaleKey, Record<PlanCode, string[]>> = {
  ar: {
    monthly: ["مساحة عمل عقارية أساسية", "مراجعة تفعيل يدوية", "وصول شركة آمن"],
    quarterly: ["كل ما في Basic", "سعة تشغيل أطول", "وصول مبكر للميزات"],
    semiannual: ["كل ما في Plus", "وحدات تشغيل متقدمة", "دعم بأولوية"],
    annual: ["كل ما في Pro", "وصول كامل للميزات المتقدمة", "أعلى أولوية للدعم"],
    lifetime: ["كل ما في VIP", "وصول دائم للشركات الكبيرة", "دعم مخصص للمؤسسات"],
  },
  en: {
    monthly: ["Core property workspace", "Manual activation review", "Secure company access"],
    quarterly: ["Everything in Basic", "Longer operating runway", "Priority feature access"],
    semiannual: ["Everything in Plus", "Advanced operational modules", "Priority support"],
    annual: ["Everything in Pro", "Full advanced access", "Highest support priority"],
    lifetime: ["Everything in VIP", "Permanent access for large companies", "Dedicated enterprise support"],
  },
  he: {
    monthly: ["סביבת עבודה בסיסית לנכסים", "בדיקת הפעלה ידנית", "גישה מאובטחת לחברה"],
    quarterly: ["כל מה שב-Basic", "תקופת עבודה ארוכה יותר", "גישה מועדפת לתכונות"],
    semiannual: ["כל מה שב-Plus", "מודולים תפעוליים מתקדמים", "תמיכה בעדיפות"],
    annual: ["כל מה שב-Pro", "גישה מלאה לתכונות מתקדמות", "עדיפות תמיכה גבוהה ביותר"],
    lifetime: ["כל מה שב-VIP", "גישה קבועה לחברות גדולות", "תמיכה ארגונית ייעודית"],
  },
  ru: {
    monthly: ["Базовое пространство для недвижимости", "Ручная проверка активации", "Безопасный доступ компании"],
    quarterly: ["Всё из Basic", "Больше времени для работы", "Приоритетный доступ к функциям"],
    semiannual: ["Всё из Plus", "Расширенные рабочие модули", "Приоритетная поддержка"],
    annual: ["Всё из Pro", "Полный доступ к расширенным функциям", "Максимальный приоритет поддержки"],
    lifetime: ["Всё из VIP", "Постоянный доступ для крупных компаний", "Выделенная корпоративная поддержка"],
  },
  uk: {
    monthly: ["Базовий простір для нерухомості", "Ручна перевірка активації", "Безпечний доступ компанії"],
    quarterly: ["Усе з Basic", "Довший операційний період", "Пріоритетний доступ до функцій"],
    semiannual: ["Усе з Plus", "Розширені операційні модулі", "Пріоритетна підтримка"],
    annual: ["Усе з Pro", "Повний доступ до розширених функцій", "Найвищий пріоритет підтримки"],
    lifetime: ["Усе з VIP", "Постійний доступ для великих компаній", "Виділена корпоративна підтримка"],
  },
};

const planNotes: Record<LocaleKey, Record<PlanCode, string>> = {
  ar: {
    monthly: "مرونة كاملة لتجربة المنصة",
    quarterly: "تشغيل أطول بسعر أوفر",
    semiannual: "وصول متقدم مع دعم بأولوية",
    annual: "أفضل قيمة للوصول الكامل",
    lifetime: "حل مؤسسي طويل الأمد للشركات الكبيرة",
  },
  en: {
    monthly: "Full flexibility to try the platform",
    quarterly: "Longer operations at a lower cost",
    semiannual: "Advanced access with priority support",
    annual: "Best value for complete access",
    lifetime: "Long-term enterprise solution for large companies",
  },
  he: {
    monthly: "גמישות מלאה להתנסות בפלטפורמה",
    quarterly: "תפעול ארוך יותר במחיר משתלם",
    semiannual: "גישה מתקדמת עם תמיכה בעדיפות",
    annual: "הערך הטוב ביותר לגישה מלאה",
    lifetime: "פתרון ארגוני ארוך טווח לחברות גדולות",
  },
  ru: {
    monthly: "Полная гибкость для знакомства с платформой",
    quarterly: "Больше времени для работы по выгодной цене",
    semiannual: "Расширенный доступ и приоритетная поддержка",
    annual: "Лучшая ценность для полного доступа",
    lifetime: "Долгосрочное решение для крупных компаний",
  },
  uk: {
    monthly: "Повна гнучкість для знайомства з платформою",
    quarterly: "Довша робота за вигіднішою ціною",
    semiannual: "Розширений доступ і пріоритетна підтримка",
    annual: "Найкраща цінність для повного доступу",
    lifetime: "Довгострокове корпоративне рішення для великих компаній",
  },
};

const planDurations: Record<LocaleKey, Record<PlanCode, string>> = {
  ar: { monthly: "شهر واحد", quarterly: "3 أشهر", semiannual: "6 أشهر", annual: "12 شهراً", lifetime: "مدى الحياة" },
  en: { monthly: "1 month", quarterly: "3 months", semiannual: "6 months", annual: "12 months", lifetime: "Lifetime" },
  he: { monthly: "חודש אחד", quarterly: "3 חודשים", semiannual: "6 חודשים", annual: "12 חודשים", lifetime: "לכל החיים" },
  ru: { monthly: "1 месяц", quarterly: "3 месяца", semiannual: "6 месяцев", annual: "12 месяцев", lifetime: "Навсегда" },
  uk: { monthly: "1 місяць", quarterly: "3 місяці", semiannual: "6 місяців", annual: "12 місяців", lifetime: "Назавжди" },
};

const savingsCopy: Record<LocaleKey, (amount: string) => string> = {
  ar: (amount) => `وفّر ${amount} جنيه مقارنة بالدفع الشهري`,
  en: (amount) => `Save $${amount} compared with monthly billing`,
  he: (amount) => `חיסכון של EGP${amount} לעומת תשלום חודשי`,
  ru: (amount) => `Экономия EGP${amount} по сравнению с ежемесячной оплатой`,
  uk: (amount) => `Заощадьте EGP${amount} проти щомісячної оплати`,
};

const originalPriceCopy: Record<LocaleKey, string> = {
  ar: "السعر الأصلي",
  en: "Original price",
  he: "מחיר מקורי",
  ru: "Исходная цена",
  uk: "Початкова ціна",
};

const monthlyCostCopy: Record<LocaleKey, (amount: string) => string> = {
  ar: (amount) => `التكلفة الفعلية: ${amount} جنيه شهرياً`,
  en: (amount) => `Effective cost: $${amount} per month`,
  he: (amount) => `עלות בפועל: EGP${amount} לחודש`,
  ru: (amount) => `Фактическая стоимость: EGP${amount} в месяц`,
  uk: (amount) => `Фактична вартість: EGP${amount} на місяць`,
};

const annualDiscountCopy: Record<LocaleKey, string> = {
  ar: "خصم 58%",
  en: "58% OFF",
  he: "58% הנחה",
  ru: "СКИДКА 58%",
  uk: "ЗНИЖКА 58%",
};

const planTag: Record<PlanCode, PlanCode> = {
  monthly: "monthly",
  quarterly: "quarterly",
  semiannual: "semiannual",
  annual: "annual",
  lifetime: "lifetime",
};

export default function Plans() {
  const { lang, dir } = useLocale();
  const { isAuthenticated, user } = useAuth();
  const t = copy[lang as LocaleKey] ?? copy.en;
  const activeLocale = (lang as LocaleKey) in copy ? (lang as LocaleKey) : "en";
  // Monthly remains in the shared catalog for legacy subscriptions, but is not offered publicly.
  const planCodes = (Object.keys(SUBSCRIPTION_PLANS) as PlanCode[]).filter((code) => code !== "monthly");

  const choosePlan = (code: PlanCode) => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    window.location.href = `/checkout?plan=${code}`;
  };

  return (
    <main dir={dir} lang={lang} className="min-h-screen overflow-x-hidden bg-[#061725] text-white selection:bg-[#d8b26b] selection:text-[#061725]">
      <section className="relative isolate overflow-hidden border-b border-[#d8b26b]/20 bg-[#061725]">
        <div className="absolute inset-0 -z-30 bg-[#061725]" />
        <div className="absolute inset-y-0 end-0 -z-20 w-full bg-[url('/manus-storage/luxury-residence-twilight_0f4510c3.png')] bg-cover bg-center opacity-65 lg:w-[68%]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#061725_5%,rgba(6,23,37,.96)_32%,rgba(6,23,37,.6)_63%,rgba(6,23,37,.2)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#061725_0%,transparent_45%,rgba(4,15,25,.44)_100%)]" />
        <div className="absolute end-[16%] top-0 -z-10 h-full w-px bg-[#d8b26b]/35" />

        <nav className="container flex items-center justify-between py-6 sm:py-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center border border-[#d8b26b]/65 bg-[#061725]/55 text-[#e6c67f] backdrop-blur">
              <Building2 size={19} />
            </span>
            <span>
              <span className="block text-[11px] font-semibold tracking-[.28em] text-[#f2d895]">DAR.EST</span>
              <span className="mt-0.5 block text-[10px] tracking-[.16em] text-white/40">REAL ESTATE OS</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="hidden border-b border-transparent px-2 py-2 text-xs text-white/65 transition hover:border-[#d8b26b] hover:text-white sm:inline">{t.home}</Link>
            <Link href="/workspace" className="hidden border-b border-transparent px-2 py-2 text-xs text-white/65 transition hover:border-[#d8b26b] hover:text-white md:inline">{t.workspace}</Link>
            <LocaleSwitcher compact />
            <button
              type="button"
              onClick={() => (isAuthenticated ? (window.location.href = "/account") : startLogin())}
              className="border border-white/15 bg-white/[.03] px-3 py-2 text-xs font-medium text-white/80 transition hover:border-[#d8b26b]/60 hover:text-[#f3d995] sm:px-4"
            >
              {isAuthenticated ? user?.name || t.workspace : t.signIn}
            </button>
          </div>
        </nav>

        <div className="container grid gap-12 pb-16 pt-12 lg:grid-cols-[1.12fr_.88fr] lg:items-end lg:pb-24 lg:pt-20">
          <div className="max-w-3xl lg:pb-5">
            <div className="inline-flex items-center gap-2 border-y border-[#d8b26b]/45 py-2 text-[10px] font-semibold tracking-[.21em] text-[#efd391]">
              <Sparkles size={13} />
              {t.eyebrow}
            </div>
            <h1 className="mt-8 max-w-2xl font-serif text-5xl font-medium leading-[.98] tracking-[-.055em] text-[#fffaf0] sm:text-6xl lg:text-7xl">
              {t.title}
              <span className="mt-3 block text-[#dfba70]">{t.accent}</span>
            </h1>
            <p className="mt-8 max-w-xl border-s-2 border-[#d8b26b]/65 ps-5 text-base leading-8 text-white/72 sm:text-lg">{t.intro}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#plans" className="inline-flex items-center gap-2 bg-[#d8b26b] px-7 py-4 text-sm font-semibold text-[#081b28] transition hover:bg-[#edcf8c]">
                {t.choose}
                <ChevronLeft size={17} className={dir === "rtl" ? "rotate-180" : undefined} />
              </a>
              <Link href="/workspace" className="inline-flex items-center gap-2 border border-white/25 bg-[#061725]/30 px-7 py-4 text-sm font-medium text-white/90 backdrop-blur transition hover:border-[#d8b26b]/70">
                {t.workspace}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>

          <aside className="relative self-end overflow-hidden border border-[#d8b26b]/45 bg-[#071b2a]/80 p-5 backdrop-blur-xl sm:p-7">
            <div className="absolute end-0 top-0 h-full w-1 bg-[#d8b26b]" />
            <div className="absolute right-0 top-0 h-28 w-28 bg-[#d8b26b]/15 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[#d8b26b]">{t.selected}</span>
              <ShieldCheck size={19} className="text-[#d8b26b]" />
            </div>
            <div className="relative mt-9 grid grid-cols-2 gap-px border border-[#d8b26b]/20 bg-[#d8b26b]/20">
              {[
                ["01", t.choose],
                ["02", t.evidence],
                ["03", t.review],
                ["04", t.activation],
              ].map(([number, label]) => (
                <div key={number} className="bg-[#081d2b]/95 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{number}</div>
                  <div className="mt-4 text-sm font-medium">{label}</div>
                </div>
              ))}
            </div>
            <p className="relative mt-5 text-xs leading-6 text-white/50">{t.secure}</p>
          </aside>
        </div>
      </section>

      <section id="plans" className="relative py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#061725_0%,#071b2a_48%,#061725_100%)]" />
        <div className="container">
        <div className="mb-12 flex flex-col justify-between gap-5 border-b border-[#d8b26b]/35 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-semibold tracking-[.2em] text-[#d8b26b]">{t.value}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-[#f7f2e7] sm:text-4xl">{t.choose}</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-white/60">{t.processIntro}</p>
        </div>

        <div className="grid gap-x-0 gap-y-5 border-y border-[#d8b26b]/25 md:grid-cols-2 xl:grid-cols-3">
          {planCodes.map((code) => {
            const plan = SUBSCRIPTION_PLANS[code];
            const tag = planTag[code];
            const isPro = code === "semiannual";
            const isVip = code === "annual";
            const isLifetime = code === "lifetime";
            const originalPrice = isLifetime ? plan.priceIls : SUBSCRIPTION_PLANS.monthly.priceIls * plan.durationMonths;
            const savings = Math.max(0, originalPrice - plan.priceIls);
            return (
              <article
                key={code}
                className={`group relative flex min-h-[430px] flex-col border p-6 transition duration-300 hover:-translate-y-1 ${
                  isPro
                    ? "border-[#d8b26b]/80 bg-[linear-gradient(180deg,rgba(216,178,107,.22)_0%,rgba(7,27,42,.95)_42%)]"
                    : isVip
                      ? "border-[#d8b26b]/55 bg-[linear-gradient(180deg,rgba(18,49,65,.92)_0%,rgba(6,23,37,.96)_100%)]"
                      : "border-white/10 bg-[#071b2a]/55 hover:border-[#d8b26b]/45"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold tracking-[.2em] text-[#d8b26b]">{t[tag]}</div>
                    <p className="mt-4 text-sm leading-6 text-white/65">{planNotes[activeLocale][code]}</p>
                  </div>
                  {isPro && <span className="bg-[#d8b26b] px-2 py-1 text-[9px] font-bold tracking-wider text-[#071a27]">{t.mostPopular}</span>}
                  {isVip && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-[#d8b26b] px-2.5 py-1 text-[10px] font-black tracking-wider text-[#071a27]">{annualDiscountCopy[activeLocale]}</span>
                      <span className="border border-[#d8b26b]/45 px-2 py-1 text-[9px] font-bold tracking-wider text-[#f0d18a]">{t.bestValue}</span>
                    </div>
                  )}
                </div>
                <div className="mt-10">
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="font-serif text-5xl font-medium tracking-[-.05em] text-[#fffaf0]">{formatPlanPrice(plan.priceIls, lang)}</span>
                    {!isLifetime && <span className="text-sm text-white/35 line-through decoration-[#d8b26b]/70">{formatPlanPrice(originalPrice, lang)}</span>}
                    <span className="mb-1 text-xs text-white/45">{isLifetime ? t.oneTime : t.per}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#e6c67d]">{planDurations[activeLocale][code]}</p>
                  {!isLifetime && <p className="mt-2 text-[11px] text-white/45">{originalPriceCopy[activeLocale]}: {formatPlanPrice(originalPrice, lang)}</p>}
                  {!isLifetime && <p className="mt-2 text-[11px] font-medium text-[#f0d18a]">{monthlyCostCopy[activeLocale](formatPlanAmount(Math.round(plan.priceIls / plan.durationMonths), lang))}</p>}
                  {savings > 0 && !isLifetime && <p className="mt-2 text-xs font-medium text-[#f0d18a]">{savingsCopy[activeLocale](formatPlanAmount(savings, lang))}</p>}
                </div>
                <div className="my-7 h-px bg-[#d8b26b]/25" />
                <p className="text-[10px] font-semibold tracking-[.16em] text-white/45">{t.included}</p>
                <ul className="mt-4 space-y-3 text-sm text-white/70">
                  {planBenefits[activeLocale][code].map((benefit: string) => (
                    <li key={benefit} className="flex gap-2.5">
                      <Check size={16} className="mt-0.5 shrink-0 text-[#d8b26b]" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => choosePlan(code)}
                  className={`mt-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                    isPro || isVip
                      ? "bg-[#d8b26b] text-[#071a27] hover:bg-[#eed18c]"
                      : "border border-[#d8b26b]/35 bg-transparent text-white hover:border-[#d8b26b] hover:bg-[#d8b26b]/10 hover:text-[#f0d18a]"
                  }`}
                >
                  {t.start}
                  <ArrowUpRight size={16} />
                </button>
              </article>
            );
          })}
        </div></div>
      </section>

      <section className="relative isolate overflow-hidden border-y border-[#d8b26b]/20 bg-[#071b2a]">
        <div className="absolute inset-y-0 start-0 -z-10 w-full bg-[url('/manus-storage/luxury-interior-dark_4f792e05.jpg')] bg-cover bg-center opacity-20 lg:w-[52%]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,23,37,.55)_0%,#071b2a_53%,#071b2a_100%)]" />
        <div className="container grid gap-10 py-20 lg:grid-cols-[1fr_.95fr] lg:items-center lg:py-28">
          <div className="lg:ps-8">
            <p className="text-[10px] font-semibold tracking-[.2em] text-[#d8b26b]">{t.workspaceEyebrow}</p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-[-.045em] text-white">{t.workspaceTitle}</h2>
            <p className="mt-5 max-w-xl leading-8 text-white/60">{t.workspaceBody}</p>
            <Link href="/workspace" className="mt-8 inline-flex items-center gap-2 border border-white/15 bg-white/[.04] px-5 py-3 text-sm font-medium text-white transition hover:border-[#d8b26b]/65">
              {t.openWorkspace}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="grid gap-px border border-[#d8b26b]/25 bg-[#d8b26b]/20 sm:grid-cols-3">
            <div className="bg-[#071b2a]/90 p-5"><WalletCards className="text-[#d8b26b]" size={21} /><h3 className="mt-7 text-sm font-semibold">01</h3><p className="mt-2 text-xs leading-6 text-white/55">{t.choose}</p></div>
            <div className="bg-[#071b2a]/90 p-5"><FileCheck2 className="text-[#d8b26b]" size={21} /><h3 className="mt-7 text-sm font-semibold">02</h3><p className="mt-2 text-xs leading-6 text-white/55">{t.review}</p></div>
            <div className="bg-[#071b2a]/90 p-5"><KeyRound className="text-[#d8b26b]" size={21} /><h3 className="mt-7 text-sm font-semibold">03</h3><p className="mt-2 text-xs leading-6 text-white/55">{t.openWorkspace}</p></div>
          </div>
        </div>
      </section>
    </main>
  );
}
