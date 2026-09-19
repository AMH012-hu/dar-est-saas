import { useMemo } from "react";
import { ArrowLeft, Building2, Download, FileBarChart2, Printer, RefreshCw, ShieldCheck, Wallet, Wrench } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";

type Locale = "ar" | "en" | "he" | "ru" | "uk";
type Row = Record<string, unknown>;

const copy: Record<Locale, Record<string, string>> = {
  ar: { eyebrow: "تقارير تشغيلية", title: "مركز التقارير", description: "ملخص قابل للمشاركة مبني على سجلات شركتك المصرح بها الآن، دون تقديرات أو بيانات تجريبية.", workspace: "مساحة العمل", exportCsv: "تصدير ملخص CSV", print: "طباعة / حفظ PDF", refresh: "تحديث البيانات", source: "المصادر المصرح بها", protected: "بيانات شركة محمية", loading: "جارٍ جمع بيانات التقرير…", unavailable: "تعذر تحميل أحد مصادر التقرير حالياً.", retry: "إعادة المحاولة", generated: "تم الإنشاء", portfolio: "المحفظة", units: "الوحدات", occupied: "وحدات مشغولة", leases: "عقود نشطة", collections: "التحصيل", due: "إجمالي المستحق", received: "إجمالي المحصل", outstanding: "الرصيد القائم", arrears: "مخاطر المتأخرات", operations: "التشغيل", openOrders: "أوامر عمل مفتوحة", urgentOrders: "أوامر عاجلة", documents: "المستندات", documentsCount: "مستندات مسجلة", expiring: "تنتهي قريباً", reportValue: "القيمة", summary: "ملخص تشغيلي", companyOnly: "يعرض هذا التقرير البيانات التشغيلية المصرح بها لشركتك فقط.", noData: "لا توجد سجلات كافية لتوليد مؤشر في هذا القسم بعد." },
  en: { eyebrow: "Operational reporting", title: "Reports center", description: "A shareable summary built from your company’s currently authorized records, with no estimates or demo data.", workspace: "Workspace", exportCsv: "Export CSV summary", print: "Print / save PDF", refresh: "Refresh data", source: "Authorized sources", protected: "Protected company data", loading: "Collecting report data…", unavailable: "One or more report sources could not be loaded right now.", retry: "Retry", generated: "Generated", portfolio: "Portfolio", units: "Units", occupied: "Occupied units", leases: "Active leases", collections: "Collections", due: "Total due", received: "Total received", outstanding: "Outstanding balance", arrears: "Arrears risk", operations: "Operations", openOrders: "Open work orders", urgentOrders: "Urgent work orders", documents: "Documents", documentsCount: "Recorded documents", expiring: "Expiring soon", reportValue: "Value", summary: "Operating summary", companyOnly: "This report shows only operational data authorized for your company.", noData: "There are not enough records to calculate an indicator in this section yet." },
  he: { eyebrow: "דיווח תפעולי", title: "מרכז דוחות", description: "סיכום לשיתוף המבוסס על הרשומות המורשות של החברה בלבד, ללא אומדנים או נתוני הדגמה.", workspace: "מרחב עבודה", exportCsv: "ייצוא סיכום CSV", print: "הדפסה / שמירה ל‑PDF", refresh: "רענון נתונים", source: "מקורות מורשים", protected: "נתוני חברה מוגנים", loading: "איסוף נתוני הדוח…", unavailable: "לא ניתן לטעון כעת אחד או יותר ממקורות הדוח.", retry: "נסה שוב", generated: "נוצר", portfolio: "תיק נכסים", units: "יחידות", occupied: "יחידות מאוכלסות", leases: "חוזים פעילים", collections: "גבייה", due: "סך לחיוב", received: "סך שהתקבל", outstanding: "יתרה פתוחה", arrears: "סיכון פיגורים", operations: "תפעול", openOrders: "פקודות עבודה פתוחות", urgentOrders: "פקודות דחופות", documents: "מסמכים", documentsCount: "מסמכים רשומים", expiring: "פגים בקרוב", reportValue: "ערך", summary: "סיכום תפעולי", companyOnly: "הדוח מציג רק נתונים תפעוליים המורשים לחברה שלך.", noData: "אין עדיין מספיק רשומות לחישוב מדד בסעיף זה." },
  ru: { eyebrow: "Операционная отчётность", title: "Центр отчётов", description: "Сводка для совместного использования на основе разрешённых записей компании — без оценок и демонстрационных данных.", workspace: "Рабочее пространство", exportCsv: "Экспорт сводки CSV", print: "Печать / сохранить PDF", refresh: "Обновить данные", source: "Разрешённые источники", protected: "Защищённые данные компании", loading: "Сбор данных отчёта…", unavailable: "Один или несколько источников отчёта сейчас недоступны.", retry: "Повторить", generated: "Сформировано", portfolio: "Портфель", units: "Объекты", occupied: "Занятые объекты", leases: "Активные договоры", collections: "Сборы", due: "Всего к получению", received: "Всего получено", outstanding: "Остаток", arrears: "Риск просрочки", operations: "Операции", openOrders: "Открытые заказы", urgentOrders: "Срочные заказы", documents: "Документы", documentsCount: "Зарегистрированные документы", expiring: "Скоро истекают", reportValue: "Значение", summary: "Операционная сводка", companyOnly: "Отчёт показывает только операционные данные, разрешённые для вашей компании.", noData: "Пока недостаточно записей для расчёта показателя в этом разделе." },
  uk: { eyebrow: "Операційна звітність", title: "Центр звітів", description: "Спільний підсумок на основі дозволених записів компанії — без оцінок і демонстраційних даних.", workspace: "Робочий простір", exportCsv: "Експортувати підсумок CSV", print: "Друк / зберегти PDF", refresh: "Оновити дані", source: "Дозволені джерела", protected: "Захищені дані компанії", loading: "Збирання даних звіту…", unavailable: "Одне або кілька джерел звіту зараз недоступні.", retry: "Спробувати знову", generated: "Створено", portfolio: "Портфель", units: "Об’єкти", occupied: "Зайняті об’єкти", leases: "Активні договори", collections: "Збір", due: "Усього до отримання", received: "Усього отримано", outstanding: "Непогашений залишок", arrears: "Ризик прострочення", operations: "Операції", openOrders: "Відкриті замовлення", urgentOrders: "Термінові замовлення", documents: "Документи", documentsCount: "Зареєстровані документи", expiring: "Незабаром спливають", reportValue: "Значення", summary: "Операційний підсумок", companyOnly: "Цей звіт показує лише операційні дані, дозволені для вашої компанії.", noData: "Ще недостатньо записів для розрахунку показника в цьому розділі." },
};

function asRecord(value: unknown): Row { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Row : {}; }
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => typeof item === "object" && item !== null) : []; }
function numberValue(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function state(row: Row) { return String(row.status ?? "").toLowerCase(); }
function csvCell(value: string | number) { const text = String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }

function Metric({ label, value, hint, icon: Icon, tone = "gold" }: { label: string; value: string | number; hint?: string; icon: typeof Building2; tone?: "gold" | "green" | "rose" }) {
  const colors = tone === "green" ? "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-100" : tone === "rose" ? "border-rose-300/20 bg-rose-300/[.07] text-rose-100" : "border-[#d8b26b]/25 bg-[#d8b26b]/[.08] text-[#f3d98d]";
  return <article className={`rounded-2xl border p-4 ${colors}`}><Icon className="h-4 w-4" /><p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs font-medium text-white/80">{label}</p>{hint ? <p className="mt-1 text-[11px] leading-5 text-white/45">{hint}</p> : null}</article>;
}

export default function OperationalReports() {
  const { user, loading } = useAuth();
  const { lang, dir } = useLocale();
  const locale = (lang in copy ? lang : "en") as Locale;
  const t = copy[locale];
  const access = trpc.account.access.useQuery(undefined, { enabled: Boolean(user) });
  const active = Boolean(access.data?.active);
  const company = trpc.company.current.useQuery(undefined, { enabled: Boolean(user && active) });
  const enabled = Boolean(user && active && company.data?.company);
  const portfolio = trpc.portfolio.hierarchy.useQuery(undefined, { enabled });
  const leasing = trpc.portfolio.leasingCenter.useQuery(undefined, { enabled });
  const collections = trpc.portfolio.collections.useQuery(undefined, { enabled });
  const operations = trpc.operations.center.useQuery(undefined, { enabled });
  const documents = trpc.documents.center.useQuery(undefined, { enabled });

  const report = useMemo(() => {
    const unitRows = rows(asRecord(portfolio.data).units);
    const leaseRows = rows(asRecord(leasing.data).leases);
    const collectionSummary = asRecord(asRecord(collections.data).summary);
    const workOrders = rows(asRecord(operations.data).workOrders);
    const documentData = asRecord(documents.data);
    const docs = rows(documentData.documents);
    return {
      units: unitRows.length,
      occupied: unitRows.filter(row => ["occupied", "rented", "sold"].includes(state(row))).length,
      activeLeases: leaseRows.filter(row => ["active", "notice"].includes(state(row))).length,
      totalDue: numberValue(collectionSummary.totalDueIls),
      totalReceived: numberValue(collectionSummary.totalReceivedIls),
      outstanding: numberValue(collectionSummary.outstandingIls),
      arrears: numberValue(collectionSummary.arrearsRiskIls),
      openOrders: workOrders.filter(row => !["resolved", "closed", "completed", "done"].includes(state(row))).length,
      urgentOrders: workOrders.filter(row => state(row) !== "closed" && String(row.priority ?? "").toLowerCase() === "urgent").length,
      documents: docs.length,
      expiring: numberValue(asRecord(documentData.summary).expiringSoon),
    };
  }, [collections.data, documents.data, leasing.data, operations.data, portfolio.data]);

  const isLoading = loading || access.isLoading || company.isLoading || (enabled && [portfolio, leasing, collections, operations, documents].some(query => query.isLoading));
  const hasError = enabled && [portfolio, leasing, collections, operations, documents].some(query => query.isError);
  const currency = new Intl.NumberFormat(locale === "uk" ? "uk-UA" : `${locale}-IL`, { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
  const retry = () => { void Promise.all([portfolio.refetch(), leasing.refetch(), collections.refetch(), operations.refetch(), documents.refetch()]); };
  const exportCsv = () => {
    const reportRows: Array<[string, string | number]> = [
      [t.generated, new Date().toISOString()], [t.units, report.units], [t.occupied, report.occupied], [t.leases, report.activeLeases],
      [t.due, report.totalDue], [t.received, report.totalReceived], [t.outstanding, report.outstanding], [t.arrears, report.arrears],
      [t.openOrders, report.openOrders], [t.urgentOrders, report.urgentOrders], [t.documentsCount, report.documents], [t.expiring, report.expiring],
    ];
    const csv = `\uFEFF${[t.summary, t.reportValue].map(csvCell).join(",")}\n${reportRows.map(row => row.map(csvCell).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `dar-est-operational-report-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  if (loading || access.isLoading || company.isLoading) return <main className="grid min-h-screen place-items-center bg-[#061725] text-white"><div className="text-center"><div className="mx-auto h-12 w-12 animate-pulse rounded-2xl border border-[#d8b26b]/40 bg-[#d8b26b]/10" /><p className="mt-4 text-sm text-white/55">DAR.EST</p></div></main>;
  if (!user || !active || !company.data?.company) return <main dir={dir} className="grid min-h-screen place-items-center bg-[#061725] px-6 text-center text-white"><div><p className="text-xl font-semibold">{t.companyOnly}</p><Link href="/account" className="mt-5 inline-flex rounded-full bg-[#d8b26b] px-5 py-3 font-semibold text-[#071a27]">{t.workspace}</Link></div></main>;

  return <main dir={dir} className="min-h-screen bg-[#061725] text-white print:bg-white print:text-slate-900"><style>{`@media print { .no-print { display:none!important; } .print-card { border-color:#cbd5e1!important; background:white!important; color:#0f172a!important; } }`}</style><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8"><header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><Link href="/workspace" className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-[#e8c983]"><ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />{t.workspace}</Link><LocaleSwitcher compact /></header><section className="mt-8 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-7"><div><p className="text-xs font-semibold uppercase tracking-[.24em] text-[#d8b26b]">DAR.EST · {t.eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 print:text-slate-600">{t.description}</p></div><div className="no-print flex flex-wrap gap-2"><button onClick={retry} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white/70 hover:border-[#d8b26b]/55 hover:text-[#f3d98d]"><RefreshCw className="h-4 w-4" />{t.refresh}</button><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-[#d8b26b] px-3.5 py-2.5 text-xs font-bold text-[#071a27]"><Download className="h-4 w-4" />{t.exportCsv}</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-[#d8b26b]/45 px-3.5 py-2.5 text-xs font-semibold text-[#f3d98d] hover:bg-[#d8b26b]/10"><Printer className="h-4 w-4" />{t.print}</button></div></section>{isLoading ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/[.06]" />)}</div> : hasError ? <section className="mt-8 rounded-[1.75rem] border border-rose-300/25 bg-rose-300/[.08] p-7 text-center"><h2 className="text-lg font-semibold text-rose-100">{t.unavailable}</h2><button onClick={retry} className="no-print mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200/35 px-4 py-2 text-sm font-semibold text-rose-50"><RefreshCw className="h-4 w-4" />{t.retry}</button></section> : <><section className="mt-8"><div className="mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-[#d8b26b]" /><h2 className="font-semibold">{t.portfolio}</h2></div><div className="grid gap-3 sm:grid-cols-3"><Metric label={t.units} value={report.units} icon={Building2} /><Metric label={t.occupied} value={report.occupied} icon={Building2} tone="green" /><Metric label={t.leases} value={report.activeLeases} icon={FileBarChart2} /></div></section><section className="mt-7"><div className="mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-[#d8b26b]" /><h2 className="font-semibold">{t.collections}</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={t.due} value={currency.format(report.totalDue)} icon={Wallet} /><Metric label={t.received} value={currency.format(report.totalReceived)} icon={Wallet} tone="green" /><Metric label={t.outstanding} value={currency.format(report.outstanding)} icon={Wallet} tone={report.outstanding > 0 ? "rose" : "green"} /><Metric label={t.arrears} value={currency.format(report.arrears)} icon={Wallet} tone={report.arrears > 0 ? "rose" : "green"} /></div></section><section className="mt-7 grid gap-6 lg:grid-cols-2"><div><div className="mb-4 flex items-center gap-2"><Wrench className="h-4 w-4 text-[#d8b26b]" /><h2 className="font-semibold">{t.operations}</h2></div><div className="grid gap-3 sm:grid-cols-2"><Metric label={t.openOrders} value={report.openOrders} icon={Wrench} tone={report.openOrders > 0 ? "rose" : "green"} /><Metric label={t.urgentOrders} value={report.urgentOrders} icon={Wrench} tone={report.urgentOrders > 0 ? "rose" : "green"} /></div></div><div><div className="mb-4 flex items-center gap-2"><FileBarChart2 className="h-4 w-4 text-[#d8b26b]" /><h2 className="font-semibold">{t.documents}</h2></div><div className="grid gap-3 sm:grid-cols-2"><Metric label={t.documentsCount} value={report.documents} icon={FileBarChart2} /><Metric label={t.expiring} value={report.expiring} icon={FileBarChart2} tone={report.expiring > 0 ? "rose" : "green"} /></div></div></section><section className="print-card mt-8 rounded-[1.5rem] border border-white/10 bg-white/[.04] p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#d8b26b]" /><h2 className="font-semibold">{t.source}</h2></div><p className="mt-3 text-sm leading-7 text-white/55 print:text-slate-600">{t.companyOnly}</p><p className="mt-2 text-xs text-white/35 print:text-slate-500">{t.generated}: {new Date().toLocaleString()}</p></section></>}</div></main>;
}
