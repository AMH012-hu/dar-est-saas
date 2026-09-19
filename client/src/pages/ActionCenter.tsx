import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft, BriefcaseBusiness, CalendarClock, CheckCircle2, ChevronRight, FileWarning, ListChecks, RefreshCw, WalletCards, Wrench } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type FocusKind = "all" | "critical" | "collections" | "operations" | "leases" | "documents";
type FocusItem = {
  id: string;
  kind: Exclude<FocusKind, "all" | "critical">;
  title: string;
  description: string;
  href: string;
  dueAt?: Date;
  priority: "critical" | "attention" | "planned";
  icon: typeof WalletCards;
};

const asRows = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
const stringValue = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) { const value = row[key]; if (typeof value === "string" && value.trim()) return value.trim(); }
  return "";
};
const numberValue = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) { const value = row[key]; if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value); }
  return 0;
};
const dateValue = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" || typeof value === "number") { const parsed = new Date(value); if (!Number.isNaN(parsed.getTime())) return parsed; }
  }
  return undefined;
};

export default function ActionCenter() {
  const { user, loading } = useAuth();
  const { lang } = useLocale();
  const isAr = lang === "ar";
  const [filter, setFilter] = useState<FocusKind>("all");
  const now = useMemo(() => new Date(), []);
  const endOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59), [now]);
  const collections = trpc.portfolio.collections.useQuery(undefined, { enabled: Boolean(user) });
  const operations = trpc.operations.center.useQuery(undefined, { enabled: Boolean(user) });
  const leasing = trpc.portfolio.leasingCenter.useQuery(undefined, { enabled: Boolean(user) });
  const documents = trpc.documents.center.useQuery(undefined, { enabled: Boolean(user) });
  const isLoading = loading || collections.isLoading || operations.isLoading || leasing.isLoading || documents.isLoading;

  const focusItems = useMemo<FocusItem[]>(() => {
    const result: FocusItem[] = [];
    const collectionRows = asRows((collections.data as Record<string, unknown> | undefined)?.collections ?? (collections.data as Record<string, unknown> | undefined)?.items);
    collectionRows.forEach((row, index) => {
      const dueAt = dateValue(row, "dueAt", "dueDate", "periodEnd");
      const received = numberValue(row, "receivedIls", "amountReceivedIls", "paidAmount", "amountPaid");
      const due = numberValue(row, "amountIls", "amountDueIls", "dueAmount", "amount");
      const status = stringValue(row, "status").toLowerCase();
      const remaining = Math.max(0, due - received);
      if ((status.includes("paid") && !status.includes("unpaid")) || remaining <= 0) return;
      const overdue = Boolean(dueAt && dueAt < now);
      result.push({ id: `collection-${stringValue(row, "id", "periodId") || index}`, kind: "collections", title: isAr ? "دفعة تحتاج متابعة" : "Payment follow-up", description: `${stringValue(row, "tenantName", "leaseReference", "unitLabel", "reference") || (isAr ? "فترة تحصيل" : "Collection period")} · ${remaining.toLocaleString()} EGP${dueAt ? ` · ${isAr ? "الاستحقاق" : "Due"}: ${dueAt.toLocaleDateString()}` : ""}`, href: "/workspace/collections", dueAt, priority: overdue ? "critical" : "attention", icon: WalletCards });
    });

    const operationSource = operations.data as Record<string, unknown> | undefined;
    const workRows = [...asRows(operationSource?.workOrders), ...asRows(operationSource?.maintenance)];
    workRows.forEach((row, index) => {
      const status = stringValue(row, "status").toLowerCase();
      if (["completed", "closed", "resolved", "cancelled"].some((done) => status.includes(done))) return;
      const dueAt = dateValue(row, "dueAt", "scheduledFor", "scheduledAt", "targetDate");
      const priorityText = stringValue(row, "priority").toLowerCase();
      const critical = priorityText.includes("urgent") || priorityText.includes("high") || Boolean(dueAt && dueAt < now);
      result.push({ id: `operation-${stringValue(row, "id", "workOrderId", "maintenanceId") || index}`, kind: "operations", title: stringValue(row, "title", "subject", "name") || (isAr ? "أمر عمل مفتوح" : "Open work order"), description: `${stringValue(row, "status", "priority") || (isAr ? "بانتظار الإجراء" : "Awaiting action")}${dueAt ? ` · ${isAr ? "الموعد" : "Due"}: ${dueAt.toLocaleDateString()}` : ""}`, href: "/workspace/work-orders", dueAt, priority: critical ? "critical" : "attention", icon: Wrench });
    });

    const leaseSource = leasing.data as Record<string, unknown> | undefined;
    asRows(leaseSource?.leases ?? leaseSource?.contracts).forEach((row, index) => {
      const endAt = dateValue(row, "endAt", "endDate", "expiresAt");
      if (!endAt || endAt < now || endAt > endOfMonth) return;
      result.push({ id: `lease-${stringValue(row, "id", "contractId", "leaseId") || index}`, kind: "leases", title: isAr ? "عقد يقترب من الانتهاء" : "Lease nearing expiry", description: `${stringValue(row, "tenantName", "reference", "unitLabel", "title") || (isAr ? "عقد إيجار" : "Lease")} · ${endAt.toLocaleDateString()}`, href: "/workspace/leases", dueAt: endAt, priority: "attention", icon: CalendarClock });
    });

    const docSource = documents.data as Record<string, unknown> | undefined;
    asRows(docSource?.documents ?? docSource?.items).forEach((row, index) => {
      const expiresAt = dateValue(row, "expiresAt", "expiryDate", "validUntil");
      if (!expiresAt || expiresAt < now || expiresAt > endOfMonth) return;
      result.push({ id: `document-${stringValue(row, "id", "documentId") || index}`, kind: "documents", title: isAr ? "مستند يقترب من الانتهاء" : "Document nearing expiry", description: `${stringValue(row, "title", "fileName", "name") || (isAr ? "مستند تشغيلي" : "Operational document")} · ${expiresAt.toLocaleDateString()}`, href: "/workspace/documents", dueAt: expiresAt, priority: expiresAt.getTime() - now.getTime() < 7 * 86400000 ? "critical" : "attention", icon: FileWarning });
    });
    return result.sort((a, b) => Number(a.priority === "critical") - Number(b.priority === "critical") || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity)).reverse();
  }, [collections.data, documents.data, endOfMonth, isAr, leasing.data, now, operations.data]);

  const filtered = focusItems.filter((item) => filter === "all" || (filter === "critical" ? item.priority === "critical" : item.kind === filter));
  const counts = { critical: focusItems.filter((item) => item.priority === "critical").length, collections: focusItems.filter((item) => item.kind === "collections").length, operations: focusItems.filter((item) => item.kind === "operations").length, documents: focusItems.filter((item) => item.kind === "documents").length };
  const labels: Record<FocusKind, string> = { all: isAr ? "الكل" : "All", critical: isAr ? "حرج" : "Critical", collections: isAr ? "التحصيل" : "Collections", operations: isAr ? "العمليات" : "Operations", leases: isAr ? "العقود" : "Leases", documents: isAr ? "المستندات" : "Documents" };

  if (loading) return <main className="min-h-screen bg-[#071a27]" />;
  if (!user) return <main className="min-h-screen bg-[#071a27] px-6 py-20 text-center text-white"><p>{isAr ? "سجّل الدخول لفتح مركز العمل." : "Sign in to open your action center."}</p><Link href="/" className="mt-5 inline-flex rounded-xl bg-[#d8b26b] px-4 py-2 font-semibold text-[#071a27]">{isAr ? "الرئيسية" : "Home"}</Link></main>;

  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#071a27] text-white"><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><Link href="/workspace" className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-[#e8c983]"><ArrowLeft className={isAr ? "h-4 w-4 rotate-180" : "h-4 w-4"} />{isAr ? "مساحة العمل" : "Workspace"}</Link><LocaleSwitcher compact /></header><section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div><p className="text-xs font-semibold uppercase tracking-[.25em] text-[#d8b26b]">DAR.EST · {isAr ? "تشغيل اليوم" : "TODAY'S OPERATIONS"}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{isAr ? "مركز العمل الموحد" : "Unified action center"}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">{isAr ? "قائمة واحدة لأولويات الشركة من التحصيل والعمليات والعقود والمستندات. كل بند يأخذك إلى السجل التشغيلي المصرح به لإتمامه." : "One authorized queue for collections, operations, leases, and documents. Every item opens its operational record area so your team can act."}</p></div><div className="grid grid-cols-2 gap-3"><Metric label={isAr ? "بحاجة لتدخل" : "Needs attention"} value={focusItems.length} icon={ListChecks} /><Metric label={isAr ? "حرج" : "Critical"} value={counts.critical} icon={AlertCircle} tone="critical" /><Metric label={isAr ? "التحصيل" : "Collections"} value={counts.collections} icon={WalletCards} /><Metric label={isAr ? "أوامر مفتوحة" : "Open work"} value={counts.operations} icon={Wrench} /></div></section><section className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[.04] p-4 backdrop-blur-xl sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(Object.keys(labels) as FocusKind[]).map((key) => <button type="button" key={key} onClick={() => setFilter(key)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${filter === key ? "bg-[#d8b26b] text-[#071a27]" : "border border-white/10 bg-white/[.03] text-white/65 hover:bg-white/[.08]"}`}>{labels[key]}</button>)}</div><button type="button" onClick={() => { void Promise.all([collections.refetch(), operations.refetch(), leasing.refetch(), documents.refetch()]); }} className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-[#e8c983]"><RefreshCw className="h-3.5 w-3.5" />{isAr ? "تحديث" : "Refresh"}</button></div><div className="mt-5 space-y-3">{isLoading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/[.06]" />) : filtered.length ? filtered.map((item) => <FocusRow key={item.id} item={item} isAr={isAr} />) : <div className="py-14 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-[#d8b26b]" /><h2 className="mt-4 text-lg font-semibold">{isAr ? "لا توجد أولوية مفتوحة في هذا العرض" : "No open priority in this view"}</h2><p className="mt-2 text-sm text-white/55">{isAr ? "غيّر عامل التصفية أو تابع الوحدات التشغيلية لإضافة أول سجل." : "Change the filter or open an operating module to create the first record."}</p></div>}</div></section><section className="mt-6 grid gap-3 md:grid-cols-3"><QuickLink href="/workspace/portfolio" icon={BriefcaseBusiness} title={isAr ? "المحفظة والإشغال" : "Portfolio & occupancy"} text={isAr ? "الوحدات والعقود النشطة" : "Units and active leases"} /><QuickLink href="/workspace/insights" icon={ListChecks} title={isAr ? "مؤشرات القرار" : "Decision insights"} text={isAr ? "قراءة مؤشرات حقيقية" : "Traceable operating indicators"} /><QuickLink href="/workspace/operating-log" icon={CalendarClock} title={isAr ? "سجل التشغيل" : "Operating log"} text={isAr ? "راجع أثر تغييرات الفريق" : "Review team activity"} /></section></div></main>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof WalletCards; tone?: "critical" }) { return <div className={`rounded-2xl border p-4 ${tone === "critical" && value > 0 ? "border-red-300/25 bg-red-300/10" : "border-white/10 bg-white/[.04]"}`}><Icon className={`h-4 w-4 ${tone === "critical" && value > 0 ? "text-red-200" : "text-[#d8b26b]"}`} /><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-white/55">{label}</p></div>; }
function FocusRow({ item, isAr }: { item: FocusItem; isAr: boolean }) { const Icon = item.icon; const color = item.priority === "critical" ? "border-red-300/25 bg-red-300/10 text-red-100" : "border-[#d8b26b]/20 bg-[#d8b26b]/10 text-[#f0d48e]"; return <Link href={item.href} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-[#d8b26b]/35 hover:bg-white/[.05]"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-white">{item.title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>{item.priority === "critical" ? (isAr ? "حرج" : "Critical") : (isAr ? "متابعة" : "Follow up")}</span></div><p className="mt-1 truncate text-xs text-white/55">{item.description}</p></div><ChevronRight className={`h-4 w-4 shrink-0 text-white/40 transition group-hover:text-[#e8c983] ${isAr ? "rotate-180" : ""}`} /></Link>; }
function QuickLink({ href, icon: Icon, title, text }: { href: string; icon: typeof WalletCards; title: string; text: string }) { return <Link href={href} className="group rounded-2xl border border-white/10 bg-white/[.03] p-5 transition hover:border-[#d8b26b]/35 hover:bg-white/[.06]"><Icon className="h-4 w-4 text-[#d8b26b]" /><p className="mt-4 font-medium">{title}</p><p className="mt-1 text-xs text-white/55">{text}</p></Link>; }
