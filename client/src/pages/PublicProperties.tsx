import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, BedDouble, Building2, CheckCircle2, ChevronLeft, ChevronRight, Home, MapPin, Menu, Phone, Share2, Sparkles, Wallet, X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";

const USD_RATE = 50;
const PORTO_GOLF_ADDRESS = "Porto Golf Marina New Alamein North Coast Egypt";
const PORTO_GOLF_COORDINATES = { lat: 30.95, lng: 28.83 };
const PORTO_GOLF_IMAGES = [
  "/manus-storage/porto-golf-aerial_66c61b73.jpg",
  "/manus-storage/porto-golf-night_c5d5df58.jpg",
  "/manus-storage/porto-golf-pool_43df95ee.jpg",
  "/manus-storage/porto-golf-marina_e27cbd85.jpg",
];
type Currency = "EGP" | "USD";

type PublicProperty = {
  id: number;
  name: string;
  address: string | null;
  propertyType: string | null;
  status: string;
  areaSqm: number | null;
  listPriceIls: number | null;
  publicDescription: string | null;
  publicImagesJson: string | null;
  paymentPlanJson: string | null;
  publicVideoUrl: string | null;
  publicTourUrl: string | null;
  publicFloorPlanUrl: string | null;
  publicLatitude: string | null;
  publicLongitude: string | null;
};

const money = (value: number | null | undefined, currency: Currency) => {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const amount = currency === "USD" ? Number(value) / USD_RATE : Number(value);
  return new Intl.NumberFormat(currency === "EGP" ? "ar-EG" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

const copy = {
  ar: { eyebrow: "مشاريع مختارة بعناية", title: "اكتشف المكان الذي يشبهك", subtitle: "مشاريع عقارية مميزة، بتفاصيل واضحة وخطط سداد مرنة تساعدك على اتخاذ قرارك بثقة.", browse: "استكشف المشاريع", details: "شاهد التفاصيل", price: "يبدأ من", area: "المساحة", location: "الموقع", payment: "أنظمة السداد", contact: "تواصل مع مستشار", available: "متاح الآن", published: "مشاريع DAR.EST", noProperties: "لا توجد مشاريع منشورة حالياً.", back: "العودة للمشاريع", overview: "عن المشروع", share: "مشاركة عبر واتساب", currency: "العملة", planFallback: "خطة سداد مرنة تناسب احتياجاتك.", menu: "القائمة", mediaTitle: "فيديو وجولة افتراضية", video: "شاهد الفيديو التعريفي", tour: "افتح الجولة الافتراضية", mapTitle: "موقع الوحدة على الخريطة", approximate: "موقع تقريبي للمشروع", floorPlan: "المخطط الهندسي", floorPlanMissing: "سيتم إضافة المخطط الهندسي لهذه الوحدة قريباً.", openFloorPlan: "فتح المخطط الهندسي" },
  en: { eyebrow: "Curated developments", title: "Find the place that feels like you", subtitle: "Distinctive real estate projects with clear details and flexible payment plans to help you decide with confidence.", browse: "Explore projects", details: "View details", price: "Starting from", area: "Area", location: "Location", payment: "Payment plans", contact: "Talk to an advisor", available: "Available now", published: "DAR.EST projects", noProperties: "No published projects yet.", back: "Back to projects", overview: "About the project", share: "Share on WhatsApp", currency: "Currency", planFallback: "A flexible payment plan built around your needs.", menu: "Menu", mediaTitle: "Video & virtual tour", video: "Watch introduction video", tour: "Open virtual tour", mapTitle: "Unit location on the map", approximate: "Approximate project location", floorPlan: "Floor plan", floorPlanMissing: "The floor plan for this unit will be added soon.", openFloorPlan: "Open floor plan" },
  he: { eyebrow: "פרויקטים נבחרים", title: "מצאו את המקום שמתאים לכם", subtitle: "פרויקטים עם פרטים ברורים ותוכניות תשלום גמישות.", browse: "לכל הפרויקטים", details: "פרטים", price: "החל מ־", area: "שטח", location: "מיקום", payment: "תוכניות תשלום", contact: "דברו עם יועץ", available: "זמין כעת", published: "פרויקטי DAR.EST", noProperties: "אין פרויקטים שפורסמו.", back: "חזרה", overview: "על הפרויקט", share: "שיתוף בוואטסאפ", currency: "מטבע", planFallback: "תוכנית תשלום גמישה.", menu: "תפריט" },
  ru: { eyebrow: "Избранные проекты", title: "Найдите место для себя", subtitle: "Особенные проекты с понятными деталями и гибкими планами оплаты.", browse: "Все проекты", details: "Подробнее", price: "От", area: "Площадь", location: "Расположение", payment: "Планы оплаты", contact: "Связаться с консультантом", available: "Доступно сейчас", published: "Проекты DAR.EST", noProperties: "Опубликованных проектов пока нет.", back: "Назад", overview: "О проекте", share: "Поделиться в WhatsApp", currency: "Валюта", planFallback: "Гибкий план оплаты.", menu: "Меню" },
  uk: { eyebrow: "Вибрані проєкти", title: "Знайдіть своє місце", subtitle: "Особливі проєкти з прозорими деталями та гнучкими планами оплати.", browse: "Усі проєкти", details: "Деталі", price: "Від", area: "Площа", location: "Розташування", payment: "Плани оплати", contact: "Зв’язатися з консультантом", available: "Доступно зараз", published: "Проєкти DAR.EST", noProperties: "Опублікованих проєктів ще немає.", back: "Назад", overview: "Про проєкт", share: "Поділитися у WhatsApp", currency: "Валюта", planFallback: "Гнучкий план оплати.", menu: "Меню" },
} as const;

function projectImages(property: PublicProperty) {
  const savedImages = parseJson<string[]>(property.publicImagesJson, []).filter(image => /^https?:\/\//.test(image) || image.startsWith("/manus-storage/"));
  return savedImages.length ? savedImages : PORTO_GOLF_IMAGES;
}

function ProjectImage({ property, className = "" }: { property: PublicProperty; className?: string }) {
  const src = projectImages(property)[0];
  return <div className={`relative overflow-hidden bg-[#dfe5df] ${className}`}>{src ? <img src={src} alt={property.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-[#18352f]"><Building2 className="h-20 w-20 text-[#d9b66e]/50" /></div>}<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e211e]/75 via-transparent to-transparent" /></div>;
}

function ProjectsHeader({ currency, onToggle }: { currency: Currency; onToggle: () => void }) {
  const { dir } = useLocale();
  return <header className="flex items-center justify-between border-b border-[#18352f]/15 py-5" dir={dir}><Link href="/projects" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9b66e] text-lg font-black text-[#10251f]">D</span><span><strong className="block text-xl tracking-[.12em] text-[#10251f]">DAR.EST</strong><small className="block text-[10px] uppercase tracking-[.28em] text-[#6c766f]">Projects</small></span></Link><nav className="hidden items-center gap-8 text-sm font-medium text-[#30443d] md:flex"><a href="#projects" className="hover:text-[#ac7d24]">Projects</a><a href="#location" className="hover:text-[#ac7d24]">Location</a><a href="#about" className="hover:text-[#ac7d24]">Why DAR.EST</a><a href="https://wa.me/201501805674" target="_blank" rel="noreferrer" className="hover:text-[#ac7d24]">Contact</a></nav><div className="flex items-center gap-2"><Button variant="outline" onClick={onToggle} className="border-[#18352f]/20 bg-transparent text-[#18352f] hover:bg-[#18352f]/5">{currency === "EGP" ? "USD $" : "EGP ج.م"}</Button><Button asChild className="hidden bg-[#18352f] text-white hover:bg-[#2b5147] sm:inline-flex"><a href="https://wa.me/201501805674" target="_blank" rel="noreferrer"><Phone className="me-2 h-4 w-4" />Contact</a></Button><Menu className="ms-1 h-6 w-6 text-[#18352f] md:hidden" /></div></header>;
}

function ProjectsShell({ children, currency, onToggle }: { children: React.ReactNode; currency: Currency; onToggle: () => void }) {
  const { dir } = useLocale();
  return <main dir={dir} className="min-h-screen bg-[#f5f5ef] text-[#10251f]"><div className="pointer-events-none fixed inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(#c8a760 0.7px, transparent 0.7px)", backgroundSize: "26px 26px" }} /><div className="relative mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16"><ProjectsHeader currency={currency} onToggle={onToggle} />{children}</div></main>;
}

function PortoGolfMap({ properties, lang }: { properties: PublicProperty[]; lang: keyof typeof copy }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const visibleProperties = properties.slice(0, 10);
  useEffect(() => {
    if (!map || visibleProperties.length === 0 || !window.google?.maps) return;
    let marker: google.maps.Marker | null = null;
    let infoWindow: google.maps.InfoWindow | null = null;
    let cancelled = false;
    const fallbackPosition = PORTO_GOLF_COORDINATES;
    const isArabic = lang === "ar";
    const markerTitle = isArabic ? "Porto Golf — مشاريع DAR.EST" : "Porto Golf — DAR.EST projects";
    const markerDetails = isArabic
      ? `${visibleProperties.length} عقارات منشورة في DAR.EST`
      : `${visibleProperties.length} published DAR.EST properties`;
    const approximateNote = isArabic ? "موقع تقريبي للمشروع" : "Approximate project location";
    const createMarker = (position: google.maps.LatLng | google.maps.LatLngLiteral, isApproximate: boolean) => {
      if (cancelled) return;
      map.setCenter(position);
      map.setZoom(isApproximate ? 11 : 13);
      marker = new window.google!.maps.Marker({ map, position, title: markerTitle });
      infoWindow = new window.google!.maps.InfoWindow({
        content: `<div style="min-width:190px"><strong>Porto Golf</strong><br/>${markerDetails}${isApproximate ? `<br/><small>${approximateNote}</small>` : ""}</div>`,
      });
      marker.addListener("click", () => infoWindow?.open({ map, anchor: marker }));
    };
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: PORTO_GOLF_ADDRESS }, (results, status) => {
      const position = status === "OK" && results?.[0]
        ? results[0].geometry.location
        : fallbackPosition;
      createMarker(position, !(status === "OK" && results?.[0]));
    });
    return () => { cancelled = true; marker?.setMap(null); infoWindow?.close(); };
  }, [map, visibleProperties.length, lang]);
  const isArabic = lang === "ar";
  return <motion.section id="location" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .55 }} className="scroll-mt-10 border-t border-[#18352f]/10 py-20" aria-labelledby="porto-golf-map-title"><div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center"><div className="overflow-hidden rounded-[2rem] border border-[#18352f]/10 bg-white p-2 shadow-xl shadow-[#18352f]/10"><MapView className="h-[380px] rounded-[1.5rem] sm:h-[500px]" initialCenter={PORTO_GOLF_COORDINATES} initialZoom={11} onMapReady={setMap} /></div><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#ad7d1b]">DAR.EST / MAP</p><h2 id="porto-golf-map-title" className="mt-3 text-4xl font-semibold tracking-[-.03em]">{isArabic ? "أول 10 عقارات في Porto Golf" : "10 properties at Porto Golf"}</h2><p className="mt-5 leading-8 text-[#64736c]">{isArabic ? "الخريطة تحدد موقع المشروع على مستوى المنطقة بشكل تقريبي؛ لا تمثل مواقع الوحدات الفردية. اضغط على العلامة لعرض عدد العقارات المنشورة." : "The map marks the project area approximately; it does not represent individual unit locations. Select the pin to see the published property count."}</p><div className="mt-7 grid gap-3">{visibleProperties.map((property, index) => <Link key={property.id} href={`/projects/${property.id}`} className="flex items-center justify-between gap-4 border-b border-[#18352f]/10 py-3 text-sm hover:text-[#ad7d1b]"><span className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d9b66e]/25 text-xs font-bold text-[#18352f]">{index + 1}</span><span className="truncate">{property.name}</span></span><ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" /></Link>)}</div></div></div></motion.section>;
}

function UnitMap({ property, lang }: { property: PublicProperty; lang: keyof typeof copy }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const latitude = Number(property.publicLatitude);
  const longitude = Number(property.publicLongitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const position = hasCoordinates ? { lat: latitude, lng: longitude } : PORTO_GOLF_COORDINATES;
  const isArabic = lang === "ar";
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const marker = new window.google.maps.Marker({ map, position, title: property.name });
    map.setCenter(position);
    map.setZoom(hasCoordinates ? 15 : 11);
    return () => marker.setMap(null);
  }, [map, property.id, latitude, longitude, hasCoordinates]);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`;
  return <section className="mt-10 border-t border-[#18352f]/10 pt-10" aria-labelledby="unit-map-title"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#ad7d1b]">DAR.EST / UNIT MAP</p><h2 id="unit-map-title" className="mt-2 text-3xl font-semibold">{isArabic ? "موقع الوحدة على الخريطة" : "Unit location on the map"}</h2><p className="mt-2 text-sm text-[#64736c]">{hasCoordinates ? (isArabic ? "الموقع المحدد لهذه الوحدة." : "Exact location saved for this unit.") : (isArabic ? "موقع تقريبي داخل Porto Golf." : "Approximate location inside Porto Golf.")}</p></div><a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#18352f]/20 px-4 py-2 text-sm font-semibold text-[#18352f] hover:border-[#ad7d1b] hover:text-[#ad7d1b]"><MapPin className="h-4 w-4" />{isArabic ? "فتح في Google Maps" : "Open in Google Maps"}</a></div><div className="overflow-hidden rounded-[1.75rem] border border-[#18352f]/10 bg-white p-2 shadow-lg shadow-[#18352f]/10"><MapView className="h-[300px] rounded-[1.25rem] sm:h-[420px]" initialCenter={position} initialZoom={hasCoordinates ? 15 : 11} onMapReady={setMap} /></div></section>;
}

function PublicUnitMedia({ property, lang }: { property: PublicProperty; lang: keyof typeof copy }) {
  const isArabic = lang === "ar";
  const videoUrl = property.publicVideoUrl?.trim() || "";
  const tourUrl = property.publicTourUrl?.trim() || "";
  const embedVideo = /youtube\.com|youtu\.be|vimeo\.com/.test(videoUrl);
  return <section className="mt-10 border-t border-[#18352f]/10 pt-10" aria-labelledby="unit-media-title"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#ad7d1b]">DAR.EST / MEDIA</p><h2 id="unit-media-title" className="mt-2 text-3xl font-semibold">{isArabic ? "فيديو وجولة افتراضية" : "Video & virtual tour"}</h2>{videoUrl || tourUrl ? <div className="mt-6 grid gap-5 md:grid-cols-2">{videoUrl && <div className="overflow-hidden rounded-[1.5rem] bg-[#18352f]"><div className="aspect-video">{embedVideo ? <iframe src={videoUrl} title={isArabic ? "الفيديو التعريفي للوحدة" : "Unit introduction video"} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video src={videoUrl} controls preload="metadata" className="h-full w-full object-contain" />}</div><p className="p-4 text-sm font-semibold text-white">{isArabic ? "شاهد الفيديو التعريفي" : "Watch introduction video"}</p></div>}{tourUrl && <a href={tourUrl} target="_blank" rel="noreferrer" className="flex min-h-48 flex-col items-center justify-center rounded-[1.5rem] bg-[#18352f] p-7 text-center text-white hover:bg-[#2b5147]"><Building2 className="h-12 w-12 text-[#d9b66e]" /><strong className="mt-4 text-xl">{isArabic ? "افتح الجولة الافتراضية" : "Open virtual tour"}</strong><span className="mt-2 text-sm text-white/65">{isArabic ? "استكشف الوحدة في نافذة جديدة" : "Explore the unit in a new tab"}</span></a>}</div> : <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#18352f]/20 bg-white/60 p-8 text-center text-[#64736c]">{isArabic ? "سيتم إضافة الفيديو أو الجولة الافتراضية لهذه الوحدة قريباً." : "A video or virtual tour will be added for this unit soon."}</div>}</section>;
}

function PublicFloorPlan({ property, lang }: { property: PublicProperty; lang: keyof typeof copy }) {
  const isArabic = lang === "ar";
  const floorPlanUrl = property.publicFloorPlanUrl?.trim() || "";
  return <section className="mt-10 border-t border-[#18352f]/10 pt-10" aria-labelledby="floor-plan-title"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#ad7d1b]">DAR.EST / FLOOR PLAN</p><h2 id="floor-plan-title" className="mt-2 text-3xl font-semibold">{isArabic ? "المخطط الهندسي" : "Floor plan"}</h2>{floorPlanUrl ? <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#18352f]/10 bg-white p-3 shadow-lg shadow-[#18352f]/10"><img src={floorPlanUrl} alt={isArabic ? `المخطط الهندسي لوحدة ${property.name}` : `${property.name} floor plan`} className="max-h-[620px] w-full object-contain" /><a href={floorPlanUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center rounded-full bg-[#18352f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2b5147]">{isArabic ? "فتح المخطط الهندسي" : "Open floor plan"}</a></div> : <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#18352f]/20 bg-white/60 p-8 text-center text-[#64736c]">{isArabic ? "سيتم إضافة المخطط الهندسي لهذه الوحدة قريباً." : "The floor plan for this unit will be added soon."}</div>}</section>;
}

function PublicInquiryForm({ property, lang }: { property: PublicProperty; lang: keyof typeof copy }) {
  const isArabic = lang === "ar";
  const mutation = trpc.publicProperties.submitInquiry.useMutation();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ salesPropertyId: property.id, ...form }, { onSuccess: () => { setSent(true); setForm({ name: "", phone: "", email: "", message: "" }); } }); };
  return <section className="mt-8 rounded-[2rem] border border-[#18352f]/10 bg-white/75 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ad7d1b]">{isArabic ? "استفسار عن المشروع" : "Project inquiry"}</p><h2 className="mt-2 text-2xl font-semibold text-[#10251f]">{isArabic ? "هل تريد معرفة المزيد؟" : "Want to know more?"}</h2>{sent ? <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#e6f0e8] p-4 text-[#18352f]"><CheckCircle2 className="h-5 w-5" />{isArabic ? "تم إرسال استفسارك، سيتواصل معك المستشار قريباً." : "Your inquiry was sent. An advisor will contact you soon."}</div> : <form onSubmit={submit} className="mt-6 grid gap-4"><input required minLength={2} value={form.name} onChange={e => update("name", e.target.value)} placeholder={isArabic ? "الاسم" : "Your name"} className="h-12 rounded-xl border border-[#18352f]/15 bg-white px-4 outline-none focus:border-[#d9b66e]" /><input required minLength={5} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder={isArabic ? "رقم الهاتف" : "Phone number"} className="h-12 rounded-xl border border-[#18352f]/15 bg-white px-4 outline-none focus:border-[#d9b66e]" /><input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder={isArabic ? "البريد الإلكتروني (اختياري)" : "Email (optional)"} className="h-12 rounded-xl border border-[#18352f]/15 bg-white px-4 outline-none focus:border-[#d9b66e]" /><textarea required minLength={5} value={form.message} onChange={e => update("message", e.target.value)} placeholder={isArabic ? "اكتب استفسارك عن السعر أو السداد أو المعاينة" : "Ask about price, payment plans, or a viewing"} className="min-h-28 rounded-xl border border-[#18352f]/15 bg-white px-4 py-3 outline-none focus:border-[#d9b66e]" /><Button type="submit" disabled={mutation.isPending} className="rounded-full bg-[#18352f] py-6 text-white hover:bg-[#2b5147]">{mutation.isPending ? (isArabic ? "جارٍ الإرسال…" : "Sending…") : (isArabic ? "إرسال الاستفسار" : "Send inquiry")}</Button>{mutation.error && <p className="text-sm text-red-700">{isArabic ? "تعذر إرسال الاستفسار. حاول مرة أخرى." : "Unable to send the inquiry. Please try again."}</p>}</form>}</section>;
}

export default function PublicProperties() {
  const { lang } = useLocale(); const t = copy[lang]; const [currency, setCurrency] = useState<Currency>("EGP");
  const { data = [], isLoading } = trpc.publicProperties.list.useQuery();
  const properties = data as PublicProperty[];
  const featured = properties[0]; const secondary = properties.slice(1, 3);
  return <ProjectsShell currency={currency} onToggle={() => setCurrency(currency === "EGP" ? "USD" : "EGP")}><section className="grid min-h-[610px] items-center gap-12 py-16 lg:grid-cols-[.8fr_1.2fr] lg:py-24"><motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .65 }}><p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-[#ad7d1b]"><Sparkles className="h-4 w-4" />{t.eyebrow}</p><h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-[-.04em] text-[#10251f] sm:text-7xl">{t.title}</h1><p className="mt-7 max-w-xl text-lg leading-8 text-[#64736c]">{t.subtitle}</p><div className="mt-9 flex flex-wrap items-center gap-3"><a href="#projects" className="inline-flex items-center gap-3 rounded-full bg-[#18352f] px-7 py-4 font-semibold text-white transition-transform hover:-translate-y-1">{t.browse}<ArrowDown className="h-4 w-4" /></a><a href="#location" className="inline-flex items-center gap-2 rounded-full border border-[#18352f]/20 px-6 py-4 font-semibold text-[#18352f] hover:border-[#ad7d1b] hover:text-[#ad7d1b]"><MapPin className="h-4 w-4" />{lang === "ar" ? "شاهد موقع المشروع" : "View location"}</a></div><div className="mt-14 flex items-center gap-8 text-sm text-[#64736c]"><div><strong className="block text-3xl text-[#18352f]">{properties.length}</strong>Published projects</div><div className="h-10 w-px bg-[#18352f]/15" /><div><strong className="block text-3xl text-[#18352f]">50:1</strong>EGP / USD rate</div></div></motion.div><motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .75, delay: .1 }} className="relative"><div className="absolute -inset-5 rounded-[2.5rem] border border-[#d9b66e]/30" /><div className="relative h-[430px] overflow-hidden rounded-[2rem] bg-[#18352f] shadow-2xl shadow-[#18352f]/15 sm:h-[570px]">{featured ? <><ProjectImage property={featured} className="h-full" /><div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#f2d894]">{t.published}</p><h2 className="mt-2 text-3xl font-semibold sm:text-5xl">{featured.name}</h2><p className="mt-3 flex items-center gap-2 text-sm text-white/75"><MapPin className="h-4 w-4 text-[#f2d894]" />{featured.address || "—"}</p><Link href={`/projects/${featured.id}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#18352f]">{t.details}<ArrowLeft className="h-4 w-4 rtl:rotate-180" /></Link></div></> : <div className="flex h-full items-center justify-center text-white/60">{t.noProperties}</div>}</div><div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#d9b66e] px-5 py-4 text-sm font-semibold text-[#18352f] shadow-xl"><CheckCircle2 className="me-2 inline h-4 w-4" />{t.available}</div></motion.div></section>{properties.length > 0 && <PortoGolfMap properties={properties} lang={lang} />}<section id="projects" className="scroll-mt-10 border-t border-[#18352f]/10 py-20"><div className="mb-10 flex items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#ad7d1b]">DAR.EST / 02</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.03em] sm:text-5xl">{t.published}</h2></div><span className="hidden text-sm text-[#64736c] sm:block">{currency === "EGP" ? "EGP · جنيه مصري" : "USD · US Dollar"}</span></div>{isLoading ? <div className="py-20 text-center text-[#64736c]">Loading…</div> : !properties.length ? <div className="border-y border-[#18352f]/10 py-20 text-center text-[#64736c]">{t.noProperties}</div> : <div className="grid gap-8 lg:grid-cols-2">{secondary.map((property, index) => <motion.article key={property.id} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .5, delay: index * .1 }} className="group"><Link href={`/projects/${property.id}`}><ProjectImage property={property} className="h-[340px] rounded-[1.5rem] sm:h-[430px]" /><div className="flex items-start justify-between gap-4 pt-5"><div><h3 className="text-2xl font-semibold group-hover:text-[#ad7d1b]">{property.name}</h3><p className="mt-2 flex items-center gap-2 text-sm text-[#64736c]"><MapPin className="h-4 w-4" />{property.address || "—"}</p></div><div className="text-end"><p className="text-xs text-[#8a948f]">{t.price}</p><strong className="text-lg text-[#18352f]">{money(property.listPriceIls, currency)}</strong></div></div></Link></motion.article>)}</div>}</section><section id="about" className="grid gap-8 border-t border-[#18352f]/10 py-20 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#ad7d1b]">DAR.EST / 03</p><h2 className="mt-4 text-4xl font-semibold">A clearer way to choose your next place.</h2></div><p className="max-w-xl text-lg leading-8 text-[#64736c]">We bring the important details together in one calm experience: real availability, transparent pricing, and payment plans you can understand before you speak to an advisor.</p></section></ProjectsShell>;
}

export function PublicPropertyDetail() {
  const { lang } = useLocale(); const t = copy[lang]; const [, params] = useRoute("/projects/:id"); const [, navigate] = useLocation(); const { data = [], isLoading } = trpc.publicProperties.list.useQuery(); const [currency, setCurrency] = useState<Currency>("EGP"); const [activeImage, setActiveImage] = useState(0); const [zoomed, setZoomed] = useState(false); const properties = data as PublicProperty[]; const property = properties.find(item => String(item.id) === String(params?.id)); const images = property ? projectImages(property) : []; const plan = property ? parseJson<Record<string, unknown>>(property.paymentPlanJson, {}) : {};
  if (isLoading) return <ProjectsShell currency={currency} onToggle={() => setCurrency(currency === "EGP" ? "USD" : "EGP")}><div className="py-32 text-center text-[#64736c]">Loading…</div></ProjectsShell>;
  if (!property) return <ProjectsShell currency={currency} onToggle={() => setCurrency(currency === "EGP" ? "USD" : "EGP")}><div className="py-32 text-center"><p className="text-[#64736c]">{t.noProperties}</p><Link href="/projects" className="mt-5 inline-flex items-center gap-2 text-[#ad7d1b]"><ArrowRight className="h-4 w-4 rtl:rotate-180" />{t.back}</Link></div></ProjectsShell>;
  const shareText = encodeURIComponent(`${property.name} — ${property.address || "DAR.EST Projects"}\n${window.location.href}`); const nextImage = (delta: number) => setActiveImage(current => images.length ? (current + delta + images.length) % images.length : 0);
  return <ProjectsShell currency={currency} onToggle={() => setCurrency(currency === "EGP" ? "USD" : "EGP")}><div className="py-8"><button onClick={() => navigate("/projects")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#64736c] hover:text-[#ad7d1b]"><ArrowRight className="h-4 w-4 rtl:rotate-180" />{t.back}</button><div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_.85fr]"><div><div className="relative h-[390px] overflow-hidden rounded-[2rem] bg-[#18352f] sm:h-[590px]">{images.length ? <AnimatePresence mode="wait"><motion.img key={images[activeImage]} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .3 }} src={images[activeImage]} alt={`${property.name} ${activeImage + 1}`} onClick={() => setZoomed(true)} className="h-full w-full cursor-zoom-in object-cover" /></AnimatePresence> : <div className="flex h-full items-center justify-center"><Building2 className="h-24 w-24 text-[#d9b66e]/50" /></div>}{images.length > 1 && <><button onClick={() => nextImage(-1)} aria-label="Previous image" className="absolute start-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#18352f] shadow-lg"><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></button><button onClick={() => nextImage(1)} aria-label="Next image" className="absolute end-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#18352f] shadow-lg"><ChevronRight className="h-5 w-5 rtl:rotate-180" /></button></>}</div>{images.length > 1 && <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{images.map((src, index) => <button key={src} onClick={() => setActiveImage(index)} className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 ${index === activeImage ? "border-[#d9b66e]" : "border-transparent opacity-65"}`}><img src={src} alt="" className="h-full w-full object-cover" /></button>)}</div>}<div className="mt-10"><p className="text-xs font-bold uppercase tracking-[.25em] text-[#ad7d1b]">{t.overview}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.04em] sm:text-6xl">{property.name}</h1><p className="mt-4 flex items-center gap-2 text-[#64736c]"><MapPin className="h-5 w-5 text-[#ad7d1b]" />{property.address || "—"}</p><p className="mt-7 max-w-2xl whitespace-pre-wrap text-lg leading-8 text-[#64736c]">{property.publicDescription || "—"}</p></div></div><PublicUnitMedia property={property} lang={lang} /><PublicFloorPlan property={property} lang={lang} /><aside className="h-fit rounded-[2rem] bg-[#18352f] p-7 text-white shadow-2xl shadow-[#18352f]/15 sm:p-9"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-white/55">{t.price}</p><p className="mt-2 text-4xl font-semibold text-[#f2d894]">{money(property.listPriceIls, currency)}</p><p className="mt-1 text-xs text-white/50">{currency === "EGP" ? "EGP · جنيه مصري" : "USD · US Dollar"}</p></div><Button variant="outline" onClick={() => setCurrency(currency === "EGP" ? "USD" : "EGP")} className="border-white/20 bg-white/5 text-[#f2d894] hover:bg-white/10">{currency === "EGP" ? "USD $" : "EGP ج.م"}</Button></div><div className="my-8 grid gap-4 border-y border-white/10 py-6 text-sm"><p className="flex justify-between gap-5"><span className="text-white/55">{t.area}</span><strong>{property.areaSqm ? `${property.areaSqm} m²` : "—"}</strong></p><p className="flex justify-between gap-5"><span className="text-white/55">{t.location}</span><strong className="max-w-[60%] text-end">{property.address || "—"}</strong></p><p className="flex justify-between gap-5"><span className="text-white/55">Type</span><strong>{property.propertyType || "—"}</strong></p></div><h2 className="flex items-center gap-2 text-xl font-semibold"><Wallet className="h-5 w-5 text-[#d9b66e]" />{t.payment}</h2><p className="mt-4 leading-8 text-white/70">{typeof plan.summary === "string" ? plan.summary : t.planFallback}</p><div className="mt-8 grid gap-3"><a href={`https://wa.me/201501805674?text=${shareText}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-[#d9b66e] px-5 py-4 font-bold text-[#18352f] hover:bg-[#f2d894]"><Share2 className="h-4 w-4" />{t.share}</a><a href="https://wa.me/201501805674" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-4 font-semibold text-white hover:bg-white/10"><Phone className="h-4 w-4" />{t.contact}</a></div></aside></div><UnitMap property={property} lang={lang} /><PublicInquiryForm property={property} lang={lang} />{zoomed && images.length > 0 && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251f]/90 p-5" role="dialog" aria-modal="true" onClick={() => setZoomed(false)}><button onClick={() => setZoomed(false)} aria-label="Close image" className="absolute end-5 top-5 rounded-full bg-white/90 p-3 text-[#18352f]"><X className="h-5 w-5" /></button><img src={images[activeImage]} alt={property.name} className="max-h-[90vh] max-w-[94vw] object-contain" onClick={event => event.stopPropagation()} /></div>}</div></ProjectsShell>;
}
