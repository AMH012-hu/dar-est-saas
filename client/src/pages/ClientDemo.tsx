import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BellRing,
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileSpreadsheet,
  KeyRound,
  Languages,
  LayoutDashboard,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "wouter";

const whatsappUrl = "https://wa.me/201501805674";

const painPoints = [
  {
    problem: "البيانات موزعة بين ملفات Excel وواتساب ومحادثات الفريق.",
    solution: "مركز مبيعات منظم يجمع العقارات والعملاء والعقود ودفعات الاستيراد في مسارات واضحة.",
    icon: FileSpreadsheet,
  },
  {
    problem: "يصعب معرفة حالة كل وحدة أو متابعة العميل المناسب في الوقت المناسب.",
    solution: "ملفات تفصيلية قابلة للبحث مع حالة الوحدة، السعر، المالك، طرق الدفع، ومعلومات العميل الأصلية.",
    icon: Building2,
  },
  {
    problem: "المهام اليومية والحضور والتواصل بين الإدارة والمبيعات غير مرئية بوضوح.",
    solution: "مساحة تشغيل للفريق تشمل مهام المندوبين، الحضور والانصراف، ودردشة داخل الشركة حسب الصلاحيات.",
    icon: UsersRound,
  },
  {
    problem: "الاستفسارات المتكررة عن الوحدات المناسبة تستنزف وقت فريق المبيعات.",
    solution: "مستشار عقاري ذكي بفلاتر ميزانية ومنطقة ومساحة وغرف وحالة، مع بطاقات للوحدات المطابقة فقط.",
    icon: Bot,
  },
];

const modules = [
  {
    number: "01",
    title: "مساحة عمل موحدة",
    body: "صورة تشغيلية أوضح للمحفظة، الإيجارات، التحصيل، العمليات والمالية؛ دون افتراض بيانات أو أرقام غير موجودة.",
    icon: LayoutDashboard,
    points: ["لوحة قرار يومية", "سجل نشاط وصلاحيات", "تجربة فاتح/داكن"],
  },
  {
    number: "02",
    title: "مركز مبيعات متكامل",
    body: "صفحات مستقلة للعقارات والعملاء والعقود والاستيراد وعمليات الفريق، حتى يبقى كل نوع من العمل في مكانه الصحيح.",
    icon: Building2,
    points: ["استيراد Excel وCSV", "تعديل تفاصيل السجل", "دفعات استيراد قابلة للإدارة"],
  },
  {
    number: "03",
    title: "عقود وخطط دفع أوضح",
    body: "حسابات منظمة للسعر والخصم والمقدم والرصيد والأقساط، مع مدد دفع ربع سنوية أو نصف سنوية أو سنوية.",
    icon: ReceiptText,
    points: ["الخصم والمقدم", "الرصيد المتبقي", "جدول أقساط قابل للمتابعة"],
  },
  {
    number: "04",
    title: "فريق مبيعات قابل للمتابعة",
    body: "مدير الشركة والمشرف يحددان مهام المبيعات ويتابعان الحضور والمحادثات، بينما يبقى الوصول مقيداً بدور كل عضو.",
    icon: ClipboardCheck,
    points: ["دعوات أعضاء", "مهام يومية", "حضور ورسائل داخلية"],
  },
  {
    number: "05",
    title: "مستشار عقاري ذكي",
    body: "يساعد في تضييق الخيارات وفق احتياج العميل ويعرض نتائج من مخزون الشركة المصرح به، مع إدخال صوتي عند تفعيله في المتصفح.",
    icon: Bot,
    points: ["ميزانية ومساحة", "منطقة وغرف", "نتائج قابلة للفتح"],
  },
  {
    number: "06",
    title: "نمو آمن ومتعدد اللغات",
    body: "حسابات مستقلة للشركات، صلاحيات واضحة، وسجل تدقيقي، مع واجهة عربية وإنجليزية وعبرية وروسية وأوكرانية.",
    icon: ShieldCheck,
    points: ["عزل بيانات الشركات", "صلاحيات وسجل نشاط", "خمسة لغات"],
  },
];

const journey = [
  { title: "ارفع ملفك", body: "استورد ملفات العقارات أو العملاء، مع الاحتفاظ بالأعمدة الأصلية للتتبع.", icon: FileSpreadsheet },
  { title: "نظّم التشغيل", body: "افتح ملف الوحدة أو العميل أو العقد، ووزّع العمل على فريقك.", icon: ClipboardCheck },
  { title: "اتخذ القرار", body: "راجع الحالة وخطة الدفع والمتابعة، أو استخدم المستشار لتضييق الخيارات.", icon: BarChart3 },
  { title: "تابع بثقة", body: "راقب النشاط والصلاحيات والتحديثات داخل نفس مساحة الشركة.", icon: BellRing },
];

export default function ClientDemo() {
  return (
    <main dir="rtl" className="min-h-screen overflow-x-clip bg-[#071a27] text-white selection:bg-[#d8b26b]/35">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 opacity-70">
        <div className="absolute -right-36 top-6 h-[32rem] w-[32rem] rounded-full bg-[#d8b26b]/10 blur-3xl" />
        <div className="absolute -left-48 top-[35rem] h-[30rem] w-[30rem] rounded-full bg-sky-400/[.07] blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="group inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-[#e4c780]">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          الموقع الرئيسي
        </Link>
        <div className="flex items-center gap-3" aria-label="DAR.EST">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#d8b26b]/35 bg-[#d8b26b]/10 text-sm font-bold text-[#e4c780]">D</div>
          <div className="text-left leading-none" dir="ltr"><p className="font-semibold tracking-[0.16em] text-white">DAR.EST</p><p className="mt-1 text-[9px] tracking-[0.24em] text-[#d8b26b]">PROPERTY OS</p></div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8b26b]/25 bg-[#d8b26b]/10 px-4 py-2 text-xs font-semibold text-[#e8cf98]">
            <BadgeCheck className="h-4 w-4" /> ديمو تعريفي للفرق العقارية
          </div>
          <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
            حوّل إدارة العقارات من <span className="text-[#e4c780]">فوضى يومية</span> إلى تشغيل واضح.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
            DAR.EST منصة تشغيل موحدة لشركات العقارات والمبيعات. تجمع السجلات والمهام والعقود وخطط الدفع والفريق في مكان واحد، لتقليل الوقت الضائع في المتابعة وتسهيل اتخاذ القرار.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d8b26b] px-6 font-semibold text-[#071a27] transition-transform duration-150 hover:bg-[#e4c780] active:scale-[.98]">
              <MessageCircle className="h-5 w-5" /> احجز عرضاً لفريقك
            </a>
            <a href="#solutions" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.035] px-6 font-semibold text-white transition-colors hover:border-[#d8b26b]/45 hover:bg-white/[.07]">
              اكتشف ما يحلّه النظام <ChevronLeft className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d8b26b]" /> لا حاجة لتغيير كل طريقة عملك مرة واحدة</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d8b26b]" /> يبدأ من ملفك الحالي</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="rounded-[2rem] border border-white/10 bg-white/[.055] p-4 backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between border-b border-white/[.08] pb-4">
              <div><p className="text-sm font-semibold">مساحة العمل</p><p className="mt-1 text-xs text-white/45">لقطة توضيحية لطريقة تنظيم العمل</p></div>
              <div className="rounded-lg bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-200">متصل</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {["العقارات", "العملاء", "المهام"].map((item, index) => <div key={item} className="rounded-2xl border border-white/[.08] bg-[#071a27]/65 p-3"><div className={`h-1.5 w-9 rounded-full ${index === 1 ? "bg-[#d8b26b]" : "bg-white/20"}`} /><p className="mt-5 text-xs text-white/55">{item}</p><div className="mt-2 h-5 w-12 rounded bg-white/[.08]" /></div>)}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1.08fr_.92fr]">
              <div className="rounded-2xl border border-white/[.08] bg-[#071a27]/65 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">نشاط الفريق</p><BarChart3 className="h-4 w-4 text-[#d8b26b]" /></div><div className="mt-5 flex h-24 items-end justify-between gap-2">{[38, 61, 47, 76, 58, 87, 65].map((height, i) => <div key={i} style={{ height: `${height}%` }} className={`w-full rounded-t-md ${i === 5 ? "bg-[#d8b26b]" : "bg-[#d8b26b]/25"}`} />)}</div></div>
              <div className="rounded-2xl border border-[#d8b26b]/20 bg-[#d8b26b]/[.07] p-4"><Bot className="h-5 w-5 text-[#e4c780]" /><p className="mt-4 text-sm font-semibold">مستشار العقارات</p><p className="mt-2 text-xs leading-5 text-white/55">ابحث بالمنطقة، الميزانية، الغرف والمساحة.</p><div className="mt-4 rounded-lg bg-[#071a27]/70 px-3 py-2 text-[11px] text-[#e8cf98]">وحدات مطابقة لطلب العميل</div></div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-4 rounded-2xl border border-white/10 bg-[#102b3b]/90 px-4 py-3 backdrop-blur-xl sm:-left-8"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d8b26b]/15"><KeyRound className="h-4 w-4 text-[#e4c780]" /></div><div><p className="text-xs font-semibold">تفعيل منظم</p><p className="mt-1 text-[10px] text-white/50">اشتراك ومفتاح للحساب</p></div></div></div>
        </div>
      </section>

      <section id="solutions" className="relative z-10 border-y border-white/[.07] bg-[#05141f]/65 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl"><p className="text-xs font-bold tracking-[.22em] text-[#d8b26b]">المشكلة ← الحل</p><h2 className="mt-4 text-3xl font-semibold sm:text-4xl">كل قسم مبني لتخفيف عائق تشغيلي حقيقي.</h2><p className="mt-4 leading-8 text-white/65">الديمو لا يعرض وعوداً عامة؛ بل يشرح كيف تنتقل العملية من نقطة التعطيل إلى إجراء منظم داخل النظام.</p></div>
          <div className="mt-11 grid gap-4 md:grid-cols-2">
            {painPoints.map(({ problem, solution, icon: Icon }) => <article key={problem} className="group border border-white/[.09] bg-white/[.025] p-6 transition-colors hover:border-[#d8b26b]/35 hover:bg-white/[.05] sm:p-7"><Icon className="h-6 w-6 text-[#e4c780]" /><p className="mt-6 text-sm leading-7 text-white/55"><span className="font-bold text-white/80">العائق: </span>{problem}</p><div className="my-5 h-px bg-white/[.08]" /><p className="text-sm leading-7 text-white"><span className="font-bold text-[#e4c780]">كيف يعالجه DAR.EST: </span>{solution}</p></article>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-2xl"><p className="text-xs font-bold tracking-[.22em] text-[#d8b26b]">جولة في المنصة</p><h2 className="mt-4 text-3xl font-semibold sm:text-4xl">ما الذي يحصل عليه فريقك فعلياً؟</h2></div><p className="max-w-md text-sm leading-7 text-white/55">كل وحدة تشرح استخدامها دون اختلاق أرقام نجاح أو شهادات عملاء. يمكنك استخدامها كخريطة للعرض المباشر مع العميل.</p></div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[1.6rem] border border-white/[.1] bg-white/[.1] md:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ number, title, body, icon: Icon, points }) => <article key={number} className="min-h-72 bg-[#071a27] p-6 sm:p-7"><div className="flex items-start justify-between"><Icon className="h-6 w-6 text-[#e4c780]" /><span className="font-mono text-xs text-white/30">{number}</span></div><h3 className="mt-9 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-white/60">{body}</p><ul className="mt-6 space-y-2 text-sm text-white/75">{points.map(point => <li key={point} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#d8b26b]" />{point}</li>)}</ul></article>)}
        </div>
      </section>

      <section className="relative z-10 border-y border-white/[.07] bg-white/[.025] py-20 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10"><div className="max-w-2xl"><p className="text-xs font-bold tracking-[.22em] text-[#d8b26b]">من الملف إلى المتابعة</p><h2 className="mt-4 text-3xl font-semibold sm:text-4xl">ابدأ بالتدريج، وليس بالفوضى.</h2></div><div className="mt-12 grid gap-7 md:grid-cols-4">{journey.map(({ title, body, icon: Icon }, index) => <div key={title} className="relative"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#d8b26b]/25 bg-[#d8b26b]/10"><Icon className="h-5 w-5 text-[#e4c780]" /></div><span className="mt-5 block text-xs font-bold text-[#d8b26b]">خطوة {index + 1}</span><h3 className="mt-2 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-white/60">{body}</p></div>)}</div></div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="border border-[#d8b26b]/30 bg-gradient-to-l from-[#d8b26b]/12 to-transparent p-8 text-center sm:p-12"><Languages className="mx-auto h-8 w-8 text-[#e4c780]" /><h2 className="mt-6 text-3xl font-semibold sm:text-4xl">جاهز لعرض تجربة DAR.EST على فريقك؟</h2><p className="mx-auto mt-4 max-w-2xl leading-8 text-white/65">شارك هذا الرابط مع العميل المهتم، أو تواصل معنا عبر واتساب لتنظيم جولة مخصصة بحسب طريقة عمل الشركة وملفاتها الحالية.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d8b26b] px-6 font-semibold text-[#071a27] transition-transform duration-150 hover:bg-[#e4c780] active:scale-[.98]"><MessageCircle className="h-5 w-5" /> تواصل عبر واتساب</a><Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 font-semibold text-white transition-colors hover:border-[#d8b26b]/45">عرض الخطط <ChevronLeft className="h-5 w-5" /></Link></div></div>
      </section>

      <footer className="relative z-10 border-t border-white/[.07] px-5 py-8 text-center text-xs text-white/40">DAR.EST · Property Operations Platform</footer>
    </main>
  );
}
