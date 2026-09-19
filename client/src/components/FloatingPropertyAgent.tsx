import { useAuth } from "@/_core/hooks/useAuth";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { BedDouble, Bot, Building2, ChevronDown, MapPin, Mic, Ruler, Send, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";

type Availability = "" | "available" | "reserved" | "sold" | "inactive";
type PropertyMatch = {
  id: number;
  name: string;
  address: string | null;
  propertyType: string | null;
  status: Exclude<Availability, "">;
  areaSqm: number | null;
  listPriceIls: number | null;
  bedrooms: number | null;
};
type Message = { id: string; role: "user" | "assistant"; content: string; requestKey?: string; matches?: PropertyMatch[] };

const copy = {
  ar: {
    title: "المستشار العقاري",
    subtitle: "نتائج موثقة من مخزون شركتك",
    placeholder: "مثال: وحدة متاحة 100–120 م² حتى 3 مليون",
    budget: "الميزانية القصوى",
    region: "المنطقة أو المشروع",
    bedrooms: "عدد الغرف",
    minArea: "المساحة من (م²)",
    availability: "الحالة",
    any: "كل الحالات",
    available: "متاح",
    reserved: "محجوز",
    sold: "مباع",
    inactive: "غير نشط",
    search: "تصفية النتائج",
    results: "نتائج موصى بها",
    empty: "اطلب مطابقة وحدات أو اسأل عن إجمالي المخزون. سأعرض النتائج المؤكدة فقط.",
    recovery: "تعذر الوصول للخدمة الآن. أعد المحاولة بعد لحظات.",
    retry: "إعادة المحاولة",
    duplicate: "هذه النتيجة معروضة بالفعل. غيّر الطلب أو معايير البحث للحصول على ترشيح جديد.",
    transcript: "النص المستخرج",
    signIn: "سجّل الدخول لفتح المستشار",
    open: "فتح ملف العقار",
    quick: ["كم وحدة متاحة؟", "رشّح أفضل الوحدات المتاحة", "وحدة متاحة بمساحة 100 إلى 120 م²"],
  },
  en: {
    title: "AI Property Advisor",
    subtitle: "Verified results from your company inventory",
    placeholder: "Example: available unit, 100–120 sqm, up to 3M",
    budget: "Maximum budget",
    region: "Region or project",
    bedrooms: "Bedrooms",
    minArea: "Minimum area (sqm)",
    availability: "Availability",
    any: "All statuses",
    available: "Available",
    reserved: "Reserved",
    sold: "Sold",
    inactive: "Inactive",
    search: "Filter results",
    results: "Recommended matches",
    empty: "Ask for a unit match or inventory total. I will show verified records only.",
    recovery: "The service is temporarily unavailable. Please try again in a moment.",
    retry: "Try again",
    duplicate: "This result is already shown. Change the request or search criteria for a new recommendation.",
    transcript: "Voice transcript",
    signIn: "Sign in to open the advisor",
    open: "Open property record",
    quick: ["How many units are available?", "Recommend the best available units", "Available units from 100 to 120 sqm"],
  },
} as const;

function optionalInteger(value: string, minimum = 1) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum ? number : undefined;
}

function makeMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function FloatingPropertyAgent() {
  const { lang, dir } = useLocale();
  const { theme } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const text = copy[lang === "ar" ? "ar" : "en"];
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [budget, setBudget] = useState("");
  const [region, setRegion] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [minAreaSqm, setMinAreaSqm] = useState("");
  const [availability, setAvailability] = useState<Availability>("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const latestReplyKey = useRef("");
  const pendingRequestKeys = useRef(new Set<string>());
  const answeredRequestKeys = useRef(new Set<string>());

  type AdvisorRequestFilters = {
    budget?: number;
    region?: string;
    bedrooms?: number;
    minAreaSqm?: number;
    availability?: "available" | "reserved" | "sold" | "inactive";
  };
  const filters = (): AdvisorRequestFilters => ({
    budget: optionalInteger(budget),
    region: region.trim() || undefined,
    bedrooms: optionalInteger(bedrooms, 0),
    minAreaSqm: optionalInteger(minAreaSqm, 0),
    availability: availability || undefined,
  });
  const requestKey = (question: string, activeFilters: Partial<AdvisorRequestFilters> = filters()) => `${question.trim().toLocaleLowerCase().replace(/[أإآ]/g, "ا").replace(/\s+/g, " ")}|${JSON.stringify(activeFilters)}`;

  const assistant = trpc.sales.propertyAssistant.useMutation({
    onSuccess: (data, variables) => {
      const key = requestKey(variables.message, variables.filters ?? {});
      pendingRequestKeys.current.delete(key);
      answeredRequestKeys.current.add(key);
      latestReplyKey.current = key;
      setMessages(current => current.some(item => item.role === "assistant" && item.requestKey === key)
        ? current
        : [...current, { id: makeMessageId(), role: "assistant", content: data.answer, matches: data.matches, requestKey: key }]);
      setError("");
      setFailedQuestion("");
    },
    onError: (_error, variables) => {
      pendingRequestKeys.current.delete(requestKey(variables.message, variables.filters ?? {}));
      setError(text.recovery);
      setFailedQuestion(variables.message);
    },
  });

  const transcribe = trpc.sales.transcribeAssistantAudio.useMutation({
    onSuccess: data => { setTranscript(data.transcript); submit(data.transcript); },
    onError: () => setError(text.recovery),
  });

  function submit(value = input) {
    const question = value.trim();
    if (!question) return;
    const activeFilters = filters();
    const key = requestKey(question, activeFilters);
    if (assistant.isPending || pendingRequestKeys.current.has(key) || answeredRequestKeys.current.has(key) || latestReplyKey.current === key) {
      setError(text.duplicate);
      return;
    }
    const history = messages.slice(-8).map(item => ({ role: item.role, content: item.content }));
    const previousMatchIds = [...messages].reverse().find(item => item.role === "assistant" && item.matches?.length)?.matches?.map(match => match.id) ?? [];
    pendingRequestKeys.current.add(key);
    setMessages(current => current.some(item => item.role === "user" && item.requestKey === key)
      ? current
      : [...current, { id: makeMessageId(), role: "user", content: question, requestKey: key }]);
    setInput("");
    setError("");
    setFailedQuestion("");
    assistant.mutate({ language: lang, message: question, history, previousMatchIds, filters: activeFilters });
  }

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = () => {
        setRecording(false);
        stream.getTracks().forEach(track => track.stop());
        const reader = new FileReader();
        reader.onloadend = () => transcribe.mutate({
          language: lang,
          fileName: `property-advisor-${Date.now()}.webm`,
          contentType: "audio/webm",
          base64Content: String(reader.result).split(",")[1] ?? "",
        });
        reader.readAsDataURL(new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" }));
      };
      recorder.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch {
      setError(text.recovery);
    }
  }

  if (loading || !isAuthenticated) return null;
  const light = theme === "light";
  const panel = light ? "border-[#8f99c7]/34 bg-[#f8f9ff] text-[#29345c] shadow-[0_22px_60px_rgba(77,91,145,.16)]" : "border-white/15 bg-[#151a3c] text-white shadow-[0_22px_60px_rgba(0,0,0,.38)]";
  const muted = light ? "text-[#66729a]" : "text-white/60";
  const field = light ? "border-[#8f99c7]/25 bg-white text-[#29345c] placeholder:text-[#7a86a8]" : "border-white/10 bg-black/15 text-white placeholder:text-white/35";
  const numberFormat = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US");
  const statusCopy = (status: PropertyMatch["status"]) => text[status] ?? status;

  return <div dir={dir} className="fixed bottom-5 end-5 z-[80] flex flex-col items-end gap-3">
    {open && <section aria-label={text.title} className={`flex w-[calc(100vw-2rem)] max-w-[470px] flex-col overflow-hidden rounded-[1.55rem] border backdrop-blur-xl ${panel}`}>
      <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 ${light ? "border-[#18394a]/12" : "border-white/10"}`}>
        <div className="flex min-w-0 gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b8e] via-[#a88cff] to-[#40cbed] text-[#121630]"><Sparkles size={19} /></div><div className="min-w-0"><h2 className="font-semibold">{text.title}</h2><p className={`mt-0.5 truncate text-xs ${muted}`}>{text.subtitle}</p></div></div>
        <button aria-label="Close assistant" onClick={() => setOpen(false)} className={`rounded-xl p-2 ${light ? "hover:bg-[#163b4d]/8" : "hover:bg-white/10"}`}><X size={18} /></button>
      </header>
      <div className="space-y-3 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">{text.quick.map(prompt => <button key={prompt} type="button" onClick={() => submit(prompt)} disabled={assistant.isPending} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${light ? "border-[#a88cff]/30 bg-[#a88cff]/10 text-[#3f4775] hover:bg-[#a88cff]/18" : "border-[#a88cff]/25 bg-[#a88cff]/10 text-[#d9d0ff] hover:bg-[#a88cff]/20"}`}>{prompt}</button>)}</div>
        <button type="button" onClick={() => setFiltersOpen(value => !value)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium ${light ? "border-[#a88cff]/30 bg-[#a88cff]/10 text-[#3f4775]" : "border-[#a88cff]/25 bg-[#a88cff]/10 text-[#d9d0ff]"}`}><span className="flex items-center gap-2"><SlidersHorizontal size={16} />{text.search}</span><ChevronDown size={16} className={filtersOpen ? "rotate-180" : ""} /></button>
        {filtersOpen && <div className="grid grid-cols-2 gap-2"><input value={budget} onChange={event => setBudget(event.target.value)} inputMode="numeric" placeholder={text.budget} className={`min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#a88cff] ${field}`} /><input value={region} onChange={event => setRegion(event.target.value)} placeholder={text.region} className={`min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#a88cff] ${field}`} /><input value={bedrooms} onChange={event => setBedrooms(event.target.value)} inputMode="numeric" placeholder={text.bedrooms} className={`min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#a88cff] ${field}`} /><input value={minAreaSqm} onChange={event => setMinAreaSqm(event.target.value)} inputMode="numeric" placeholder={text.minArea} className={`min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#a88cff] ${field}`} /><select value={availability} onChange={event => setAvailability(event.target.value as Availability)} className={`col-span-2 min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#a88cff] ${field}`}><option value="">{text.any}</option><option value="available">{text.available}</option><option value="reserved">{text.reserved}</option><option value="sold">{text.sold}</option></select></div>}
        {transcript && <p className={`rounded-xl px-3 py-2 text-xs ${light ? "bg-[#d8b26b]/13 text-[#5b461d]" : "bg-[#d8b26b]/10 text-[#f0d79d]"}`}><strong>{text.transcript}: </strong>{transcript}</p>}
        {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-200"><span>{error}</span>{failedQuestion && <button type="button" onClick={() => submit(failedQuestion)} className="shrink-0 font-semibold underline underline-offset-2">{text.retry}</button>}</div>}
        <div className={`max-h-[min(52vh,430px)] min-h-44 space-y-3 overflow-y-auto rounded-2xl border p-3 ${light ? "border-[#18394a]/10 bg-[#f4f0e6]" : "border-white/10 bg-black/10"}`}>
          {messages.length ? messages.map(message => <div key={message.id} className="space-y-2">
            <div className={message.role === "user" ? "ms-auto max-w-[92%] rounded-2xl bg-[#d8b26b] px-3 py-2 text-sm leading-6 text-[#082131]" : `me-auto max-w-[92%] rounded-2xl border px-3 py-2 text-sm leading-6 ${light ? "border-[#18394a]/12 bg-white text-[#163347]" : "border-white/10 bg-white/[.06] text-white/90"}`}>{message.content}</div>
            {message.matches?.length ? <div className="space-y-2"><p className={`px-1 text-[11px] font-semibold uppercase tracking-[.12em] ${muted}`}>{text.results}</p>{message.matches.map(match => <button key={match.id} type="button" onClick={() => { setOpen(false); navigate(`/sales/properties/${match.id}`); }} className={`w-full rounded-xl border p-3 text-start transition-colors ${light ? "border-[#18394a]/12 bg-white hover:border-[#b89555]/60" : "border-white/10 bg-[#0d2b3a] hover:border-[#d8b26b]/50"}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Building2 size={15} className="shrink-0 text-[#c7a15a]" /><p className="truncate text-sm font-semibold">{match.name}</p></div><p className={`mt-1 flex items-center gap-1 truncate text-xs ${muted}`}><MapPin size={12} />{match.address || match.propertyType || "—"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${match.status === "available" ? "bg-emerald-500/13 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/13 text-amber-700 dark:text-amber-200"}`}>{statusCopy(match.status)}</span></div>
              <div className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs ${muted}`}>{match.areaSqm !== null && <span className="flex items-center gap-1"><Ruler size={13} />{numberFormat.format(match.areaSqm)} م²</span>}{match.bedrooms !== null && <span className="flex items-center gap-1"><BedDouble size={13} />{numberFormat.format(match.bedrooms)}</span>}{match.listPriceIls !== null && <span className="font-semibold text-[#b8893f]">EGP {numberFormat.format(match.listPriceIls)}</span>}</div>
              <p className="mt-2 text-xs font-semibold text-[#b8893f]">{text.open}</p>
            </button>)}</div> : null}
          </div>) : <p className={`flex min-h-36 items-center justify-center px-5 text-center text-sm leading-6 ${muted}`}>{text.empty}</p>}
          {assistant.isPending || transcribe.isPending ? <div className={`flex items-center gap-2 px-1 text-xs ${muted}`}><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d8b26b]" /><span>{lang === "ar" ? "أراجع مخزون الشركة…" : "Reviewing company inventory…"}</span></div> : null}
        </div>
        <div className="flex items-center gap-2"><textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} rows={2} placeholder={text.placeholder} className={`min-w-0 flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#d8b26b] ${field}`} /><button type="button" aria-label="Voice input" onClick={toggleRecording} className={`rounded-xl border p-3 ${recording ? "border-rose-400 bg-rose-400/15 text-rose-500" : light ? "border-[#18394a]/16 bg-white text-[#163447]" : "border-white/10 bg-white/[.06] text-white"}`}><Mic size={18} /></button><button type="button" aria-label="Send" onClick={() => submit()} className="rounded-xl bg-[#d8b26b] p-3 text-[#082131] disabled:opacity-50" disabled={!input.trim() || assistant.isPending}><Send size={18} /></button></div>
      </div>
    </section>}
    <button type="button" onClick={() => setOpen(value => !value)} aria-label={text.title} aria-expanded={open} className="group flex h-14 items-center gap-2 rounded-full border border-[#f5df9e]/55 bg-[#b8893f] px-4 text-sm font-semibold text-[#071a27] shadow-[0_12px_28px_rgba(0,0,0,.25)] transition-transform hover:scale-[1.03] active:scale-95"><Bot size={21} /><span className="hidden sm:inline">{text.title}</span></button>
  </div>;
}
