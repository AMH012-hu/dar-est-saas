import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, ChevronRight, Filter, Loader2, MessageCircle, PhoneCall, Plus, RefreshCw, Search, Target, UserRound, UsersRound } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { trpc } from "@/lib/trpc";

const stages = ["new", "contacted", "qualified", "viewing", "negotiation", "won", "lost"] as const;
type Stage = (typeof stages)[number];

const copy = {
  en: {
    title: "CRM workspace", subtitle: "Keep every lead, conversation, property interest, and next action in one place.", back: "Sales center", clients: "Clients", pipeline: "Pipeline", search: "Search by name, phone, or email…", allStages: "All stages", noClients: "No CRM clients match this view.", selectClient: "Select a client to see activity and interests.", nextFollowUp: "Next follow-up", lastContact: "Last contact", source: "Lead source", interest: "Property interests", activity: "Activity timeline", addActivity: "Log activity", activityType: "Activity type", subject: "Subject", notes: "Notes", save: "Save activity", saved: "Activity saved", failed: "Could not save activity", newLead: "New lead", contacted: "Contacted", qualified: "Qualified", viewing: "Viewing", negotiation: "Negotiation", won: "Won", lost: "Lost", noActivity: "No activity recorded yet.", call: "Call", whatsapp: "WhatsApp", meeting: "Meeting", email: "Email", note: "Note", other: "Other", refresh: "Refresh", total: "Total leads", needsFollowUp: "Needs follow-up", activePipeline: "Active pipeline", pipelineSnapshot: "Pipeline snapshot", budget: "Budget", location: "Preferred location", type: "Property type", choose: "Choose…", updateStage: "Update stage", stageUpdated: "Stage updated", stageFailed: "Could not update stage", today: "Today", details: "Client details", assigned: "Assigned sales member", noValue: "Not set", relatedProperty: "Related property", interestLevel: "Interest" 
  },
  ar: {
    title: "مساحة CRM", subtitle: "اجمع كل العملاء والمتابعات والعقارات المهتم بها والخطوة القادمة في مكان واحد.", back: "مركز المبيعات", clients: "العملاء", pipeline: "خط سير البيع", search: "ابحث بالاسم أو الهاتف أو البريد…", allStages: "كل المراحل", noClients: "لا يوجد عملاء مطابقون لهذا العرض.", selectClient: "اختر عميلاً لعرض النشاط والاهتمامات.", nextFollowUp: "المتابعة القادمة", lastContact: "آخر تواصل", source: "مصدر العميل", interest: "العقارات المهتم بها", activity: "سجل النشاط", addActivity: "تسجيل نشاط", activityType: "نوع النشاط", subject: "عنوان النشاط", notes: "ملاحظات", save: "حفظ النشاط", saved: "تم حفظ النشاط", failed: "تعذر حفظ النشاط", newLead: "جديد", contacted: "تم التواصل", qualified: "مؤهل", viewing: "معاينة", negotiation: "تفاوض", won: "تم البيع", lost: "غير مهتم", noActivity: "لا يوجد نشاط مسجل بعد.", call: "مكالمة", whatsapp: "واتساب", meeting: "اجتماع", email: "بريد إلكتروني", note: "ملاحظة", other: "أخرى", refresh: "تحديث", total: "إجمالي العملاء", needsFollowUp: "تحتاج متابعة", activePipeline: "الفرص النشطة", pipelineSnapshot: "ملخص خط السير", budget: "الميزانية", location: "الموقع المفضل", type: "نوع العقار", choose: "اختر…", updateStage: "تحديث المرحلة", stageUpdated: "تم تحديث المرحلة", stageFailed: "تعذر تحديث المرحلة", today: "اليوم", details: "تفاصيل العميل", assigned: "مندوب المبيعات المسؤول", noValue: "غير محدد", relatedProperty: "العقار المرتبط", interestLevel: "درجة الاهتمام"
  }
} as const;

function formatDate(value: unknown, lang: "ar" | "en") {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

function stageLabel(stage: Stage, t: (typeof copy)["en"] | (typeof copy)["ar"]) {
  const labels: Record<Stage, string> = { new: t.newLead, contacted: t.contacted, qualified: t.qualified, viewing: t.viewing, negotiation: t.negotiation, won: t.won, lost: t.lost };
  return labels[stage];
}

function stageTone(stage: Stage) {
  if (stage === "won") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (stage === "lost") return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (stage === "negotiation" || stage === "viewing") return "border-[#e5c47c]/30 bg-[#e5c47c]/10 text-[#f4dca0]";
  return "border-sky-400/30 bg-sky-400/10 text-sky-200";
}

export default function SalesCRM() {
  const { lang, dir } = useLocale();
  const t = copy[lang === "ar" ? "ar" : "en"];
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activityType, setActivityType] = useState<"call" | "whatsapp" | "meeting" | "viewing" | "email" | "note" | "other">("call");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");

  const queryInput = useMemo(() => ({ search: search.trim() || undefined, stage: stage === "all" ? undefined : stage }), [search, stage]);
  const clientsQuery = trpc.sales.crmClients.useQuery(queryInput);
  const summaryQuery = trpc.sales.crmPipelineSummary.useQuery();
  const detailQuery = trpc.sales.crmClient.useQuery({ salesClientId: selectedId ?? 0 }, { enabled: selectedId !== null });
  const updateClient = trpc.sales.updateCrmClient.useMutation({
    onSuccess: async () => { sonnerToast.success(t.stageUpdated); await Promise.all([clientsQuery.refetch(), summaryQuery.refetch(), detailQuery.refetch()]); },
    onError: () => sonnerToast.error(t.stageFailed),
  });
  const createActivity = trpc.sales.createCrmActivity.useMutation({
    onSuccess: async () => { sonnerToast.success(t.saved); setSubject(""); setNotes(""); await Promise.all([clientsQuery.refetch(), detailQuery.refetch()]); },
    onError: () => sonnerToast.error(t.failed),
  });

  const clients = clientsQuery.data ?? [];
  const selected = detailQuery.data?.client ?? clients.find(client => client.id === selectedId) ?? null;
  const summary = summaryQuery.data ?? { new: 0, contacted: 0, qualified: 0, viewing: 0, negotiation: 0, won: 0, lost: 0 };
  const total = Object.values(summary).reduce((sum, count) => sum + count, 0);
  const active = summary.new + summary.contacted + summary.qualified + summary.viewing + summary.negotiation;
  const needsFollowUp = clients.filter(client => client.nextFollowUpAt && new Date(String(client.nextFollowUpAt)).getTime() <= Date.now()).length;
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <main className="min-h-screen bg-[#090b0f] text-white" dir={dir}>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => navigate("/sales")} className="mb-4 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-[#f4dca0]"><BackIcon className="h-4 w-4" />{t.back}</button>
            <div className="flex items-center gap-3"><div className="rounded-2xl border border-[#e5c47c]/20 bg-[#e5c47c]/10 p-3"><Target className="h-6 w-6 text-[#e5c47c]" /></div><div><h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1><p className="mt-1 max-w-2xl text-sm text-white/55">{t.subtitle}</p></div></div>
          </div>
          <LocaleSwitcher />
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[{ label: t.total, value: total, icon: UsersRound }, { label: t.needsFollowUp, value: needsFollowUp, icon: CalendarClock }, { label: t.activePipeline, value: active, icon: Target }, { label: t.won, value: summary.won, icon: CheckCircle2 }].map(({ label, value, icon: Icon }) => <Card key={label} className="border-white/10 bg-white/[0.035] text-white"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div><Icon className="h-6 w-6 text-[#e5c47c]" /></CardContent></Card>)}
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{t.pipelineSnapshot}</h2><p className="text-sm text-white/45">{t.pipeline}</p></div><Button variant="ghost" size="sm" onClick={() => { void clientsQuery.refetch(); void summaryQuery.refetch(); }} className="text-white/65 hover:bg-white/10 hover:text-white"><RefreshCw className="me-2 h-4 w-4" />{t.refresh}</Button></div>
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">{stages.map(item => <button key={item} type="button" onClick={() => setStage(item)} className={`rounded-xl border px-3 py-3 text-start transition ${stage === item ? "border-[#e5c47c]/60 bg-[#e5c47c]/10" : "border-white/10 bg-black/10 hover:border-white/25"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs text-white/60">{stageLabel(item, t)}</span><span className="text-lg font-semibold text-white">{summary[item]}</span></div><div className="mt-2 h-1 rounded-full bg-white/10"><div className="h-1 rounded-full bg-[#e5c47c]" style={{ width: `${total ? Math.max(6, (summary[item] / total) * 100) : 0}%` }} /></div></button>)}</div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="border-white/10 bg-white/[0.035] text-white"><CardHeader className="border-b border-white/10 pb-4"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{t.clients}</CardTitle><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><div className="relative min-w-[240px]"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={t.search} className="border-white/10 bg-black/20 ps-9 text-white placeholder:text-white/30" /></div><Select value={stage} onValueChange={value => setStage(value as Stage | "all")}><SelectTrigger className="w-full border-white/10 bg-black/20 text-white sm:w-[170px]"><Filter className="me-2 h-4 w-4 text-white/45" /><SelectValue placeholder={t.allStages} /></SelectTrigger><SelectContent><SelectItem value="all">{t.allStages}</SelectItem>{stages.map(item => <SelectItem key={item} value={item}>{stageLabel(item, t)}</SelectItem>)}</SelectContent></Select></div></div></CardHeader><CardContent className="p-0">{clientsQuery.isLoading ? <div className="flex items-center justify-center p-12 text-white/50"><Loader2 className="me-2 h-5 w-5 animate-spin" />{t.clients}</div> : clients.length === 0 ? <div className="p-12 text-center text-sm text-white/45">{t.noClients}</div> : <div className="divide-y divide-white/10">{clients.map(client => { const clientStage = client.pipelineStage as Stage; return <button key={client.id} type="button" onClick={() => setSelectedId(client.id)} className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition hover:bg-white/[0.04] ${selectedId === client.id ? "bg-[#e5c47c]/[0.08]" : ""}`}><div className="min-w-0"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-[#e5c47c]" /><p className="truncate font-medium">{client.name}</p></div><p className="mt-1 truncate text-sm text-white/45">{client.phone || client.email || t.noValue}</p></div><div className="flex shrink-0 items-center gap-3"><div className="hidden text-end sm:block"><p className="text-xs text-white/35">{t.nextFollowUp}</p><p className="text-xs text-white/65">{formatDate(client.nextFollowUpAt, lang === "ar" ? "ar" : "en")}</p></div><Badge variant="outline" className={stageTone(clientStage)}>{stageLabel(clientStage, t)}</Badge><ChevronRight className={`h-4 w-4 text-white/30 ${dir === "rtl" ? "rotate-180" : ""}`} /></div></button> })}</div>}</CardContent></Card>

          <Card className="border-white/10 bg-white/[0.035] text-white"><CardHeader className="border-b border-white/10"><CardTitle>{selected ? selected.name : t.details}</CardTitle>{selected && <p className="text-sm text-white/45">{selected.phone || selected.email || t.noValue}</p>}</CardHeader><CardContent className="space-y-5 p-5">{!selected ? <div className="py-12 text-center text-sm text-white/45">{t.selectClient}</div> : <>
            <div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="outline" className={stageTone(selected.pipelineStage as Stage)}>{stageLabel(selected.pipelineStage as Stage, t)}</Badge><Select value={selected.pipelineStage} onValueChange={value => updateClient.mutate({ salesClientId: selected.id, pipelineStage: value as Stage })} disabled={updateClient.isPending}><SelectTrigger className="w-[170px] border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent>{stages.map(item => <SelectItem key={item} value={item}>{stageLabel(item, t)}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs text-white/40">{t.nextFollowUp}</p><p className="mt-1 text-white/80">{formatDate(selected.nextFollowUpAt, lang === "ar" ? "ar" : "en")}</p></div><div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs text-white/40">{t.lastContact}</p><p className="mt-1 text-white/80">{formatDate(selected.lastContactedAt, lang === "ar" ? "ar" : "en")}</p></div><div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs text-white/40">{t.source}</p><p className="mt-1 text-white/80">{selected.leadSource || t.noValue}</p></div><div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs text-white/40">{t.assigned}</p><p className="mt-1 text-white/80">{selected.assignedSalesTeamMemberId ? `#${selected.assignedSalesTeamMemberId}` : t.noValue}</p></div></div>
            <div className="grid gap-2 text-sm sm:grid-cols-3"><div><p className="text-xs text-white/40">{t.budget}</p><p className="mt-1 text-white/75">{selected.budgetMinIls || selected.budgetMaxIls ? `${selected.budgetMinIls ?? "—"} – ${selected.budgetMaxIls ?? "—"}` : t.noValue}</p></div><div><p className="text-xs text-white/40">{t.location}</p><p className="mt-1 text-white/75">{selected.preferredLocation || t.noValue}</p></div><div><p className="text-xs text-white/40">{t.type}</p><p className="mt-1 text-white/75">{selected.preferredPropertyType || t.noValue}</p></div></div>
            <div><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{t.activity}</h3><span className="text-xs text-white/35">{detailQuery.data?.activities?.length ?? 0}</span></div><div className="space-y-2">{detailQuery.data?.activities?.length ? detailQuery.data.activities.slice(0, 4).map(activity => <div key={activity.id} className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{activity.subject}</span><span className="text-xs text-white/35">{formatDate(activity.createdAt, lang === "ar" ? "ar" : "en")}</span></div><p className="mt-1 text-xs text-white/50">{activity.notes || activity.outcome || activity.type}</p></div>) : <p className="text-sm text-white/40">{t.noActivity}</p>}</div></div>
            <div className="border-t border-white/10 pt-5"><div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-[#e5c47c]" /><h3 className="font-semibold">{t.addActivity}</h3></div><div className="grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><Select value={activityType} onValueChange={value => setActivityType(value as typeof activityType)}><SelectTrigger className="border-white/10 bg-black/20 text-white"><SelectValue placeholder={t.activityType} /></SelectTrigger><SelectContent>{(["call", "whatsapp", "meeting", "viewing", "email", "note", "other"] as const).map(item => <SelectItem key={item} value={item}>{item === "call" ? t.call : item === "whatsapp" ? t.whatsapp : item === "meeting" ? t.meeting : item === "email" ? t.email : item === "note" ? t.note : item === "other" ? t.other : t.viewing}</SelectItem>)}</SelectContent></Select><Input value={subject} onChange={event => setSubject(event.target.value)} placeholder={t.subject} className="border-white/10 bg-black/20 text-white placeholder:text-white/30" /></div><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={t.notes} className="min-h-[80px] border-white/10 bg-black/20 text-white placeholder:text-white/30" /><Button disabled={!subject.trim() || createActivity.isPending} onClick={() => createActivity.mutate({ salesClientId: selected.id, type: activityType, subject: subject.trim(), notes: notes.trim() || null, completedAt: new Date() })} className="bg-[#e5c47c] text-[#17130b] hover:bg-[#f4dca0]">{createActivity.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : activityType === "call" ? <PhoneCall className="me-2 h-4 w-4" /> : activityType === "whatsapp" ? <MessageCircle className="me-2 h-4 w-4" /> : <Plus className="me-2 h-4 w-4" />}{t.save}</Button></div></div>
          </>}</CardContent></Card>
        </section>
      </div>
    </main>
  );
}
