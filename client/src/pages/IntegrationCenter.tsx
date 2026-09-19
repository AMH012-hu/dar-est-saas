import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clipboard, ExternalLink, Globe2, KeyRound, PlugZap, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { trpc } from "@/lib/trpc";

const copy = {
  ar: {
    title: "مركز التكامل", subtitle: "اربط موقع الإعلانات أو صفحة الهبوط بمنصة DAR.EST بدون كشف بيانات السيلز الداخلية.", back: "مركز المبيعات", currentCompany: "الشركة الحالية", slug: "معرّف الشركة", publicApi: "قراءة العقارات المنشورة", publicApiText: "استخدم هذه الروابط لعرض العقارات المتاحة فقط في الموقع الآخر.", writeApi: "إرسال العملاء إلى CRM", writeApiText: "أرسل نموذج التواصل من الموقع الآخر إلى DAR.EST؛ سيظهر العميل في CRM مع مصدره والعقار المهتم به.", key: "مفتاح التكامل", keyText: "ضع المفتاح في الخادم فقط، وليس داخل JavaScript أو HTML الظاهر للزائر.", copy: "نسخ", copied: "تم النسخ", docs: "فتح OpenAPI", stepsTitle: "خطوات الربط", step1: "اضبط متغير البيئة DAR_EST_INTEGRATION_API_KEY في إعدادات DAR.EST.", step2: "اضبط DAR_EST_INTEGRATION_ALLOWED_ORIGINS على دومين الموقع الآخر، مفصولاً بفاصلة إذا كان لديك أكثر من دومين.", step3: "اعرض GET /properties?company=SLUG في الموقع الآخر، واستخدم id وimages وpriceEgp لبطاقات العقارات.", step4: "أرسل POST /leads من backend الموقع الآخر باستخدام Authorization: Bearer API_KEY.", security: "قواعد الأمان", securityText: "قراءة العقارات المنشورة عامة، أما إرسال العملاء فهو محمي بالمفتاح ومحدد بـ30 طلباً في الدقيقة لكل عنوان IP.", codePublic: "مثال قراءة العقارات", codeLead: "مثال إرسال عميل", noCompany: "لم يتم إنشاء شركة بعد. أنشئ الشركة أولاً من مساحة العمل.", error: "تعذر قراءة بيانات الشركة" 
  },
  en: {
    title: "Integration center", subtitle: "Connect a listing site or landing page to DAR.EST without exposing internal sales data.", back: "Sales center", currentCompany: "Current company", slug: "Company slug", publicApi: "Read published properties", publicApiText: "Use these URLs to show available and published properties on the other website.", writeApi: "Send leads to CRM", writeApiText: "Post the other website's contact form to DAR.EST; the lead is stored in CRM with its source and property interest.", key: "Integration key", keyText: "Keep the key on the server only. Never put it in browser JavaScript or visible HTML.", copy: "Copy", copied: "Copied", docs: "Open OpenAPI", stepsTitle: "Connection steps", step1: "Set DAR_EST_INTEGRATION_API_KEY in DAR.EST environment settings.", step2: "Set DAR_EST_INTEGRATION_ALLOWED_ORIGINS to the other website origin; separate multiple origins with commas.", step3: "Call GET /properties?company=SLUG from the other website and use id, images, and priceEgp for listing cards.", step4: "Call POST /leads from the other website backend with Authorization: Bearer API_KEY.", security: "Security rules", securityText: "Property reads are public, while lead writes require the key and are limited to 30 requests per minute per IP.", codePublic: "Property read example", codeLead: "Lead submission example", noCompany: "No company exists yet. Create a company from the workspace first.", error: "Could not load company data"
  }
} as const;

function CodeBlock({ value, label, onCopy, copied }: { value: string; label: string; onCopy: () => void; copied: boolean }) {
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#04131d]"><div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-[.14em] text-[#d8b26b]">{label}</span><Button type="button" variant="ghost" size="sm" onClick={onCopy} className="text-white/65 hover:bg-white/10 hover:text-white"><Clipboard className="me-2 h-4 w-4" />{copied ? <Check className="me-2 h-4 w-4 text-emerald-300" /> : null}{copied ? "Copied" : "Copy"}</Button></div><pre className="overflow-x-auto p-4 text-xs leading-6 text-[#d6e6ee]"><code>{value}</code></pre></div>;
}

export default function IntegrationCenter() {
  const { lang, dir } = useLocale();
  const t = copy[lang === "ar" ? "ar" : "en"];
  const [, navigate] = useLocation();
  const companyQuery = trpc.company.current.useQuery();
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = typeof window === "undefined" ? "https://YOUR-DAR-EST-DOMAIN" : window.location.origin;
  const company = companyQuery.data?.company;
  const slug = company?.slug || "YOUR_COMPANY_SLUG";
  const publicExample = useMemo(() => `const response = await fetch(\"${baseUrl}/api/integrations/v1/properties?company=${slug}\");\nconst { data } = await response.json();\n// data: [{ id, name, priceEgp, images, paymentPlan, ... }]`, [baseUrl, slug]);
  const leadExample = useMemo(() => `await fetch(\"${baseUrl}/api/integrations/v1/leads\", {\n  method: \"POST\",\n  headers: {\n    \"Content-Type\": \"application/json\",\n    Authorization: \"Bearer \\\u003cDAR_EST_INTEGRATION_API_KEY\\\u003e\",\n  },\n  body: JSON.stringify({\n    companySlug: \"${slug}\",\n    propertyId: 12,\n    name: \"Ahmed Ali\",\n    phone: \"+201001234567\",\n    email: \"ahmed@example.com\",\n    message: \"I want to book a viewing\",\n    source: \"partner-website\",\n    externalId: \"partner-form-00042\"\n  })\n});`, [baseUrl, slug]);

  const copyValue = async (key: string, value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(current => current === key ? null : current), 1600);
  };
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return <main dir={dir} className="min-h-screen bg-[#071a27] px-4 py-7 text-white sm:px-8"><div className="mx-auto w-full max-w-[1450px]">
    <header className="mb-7 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between"><div><button type="button" onClick={() => navigate("/sales")} className="mb-3 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-[#f4dca0]"><BackIcon className="h-4 w-4" />{t.back}</button><div className="flex items-center gap-3"><div className="rounded-2xl border border-[#d8b26b]/25 bg-[#d8b26b]/10 p-3"><PlugZap className="h-6 w-6 text-[#d8b26b]" /></div><div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{t.subtitle}</p></div></div></div><LocaleSwitcher /></header>

    <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
      <Card className="border-white/10 bg-white/[.035] text-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe2 className="h-5 w-5 text-[#d8b26b]" />{t.currentCompany}</CardTitle></CardHeader><CardContent>{companyQuery.isLoading ? <p className="text-sm text-white/55">Loading…</p> : companyQuery.isError ? <p className="text-sm text-rose-200">{t.error}</p> : company ? <div className="space-y-4"><div><p className="text-xs uppercase tracking-[.14em] text-white/40">{company.name}</p><p className="mt-1 break-all font-mono text-sm text-[#f4dca0]">{company.slug}</p></div><div className="rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-xs text-white/40">{t.slug}</p><p className="mt-1 font-mono text-sm text-white/80">{company.slug}</p></div></div> : <p className="text-sm text-white/55">{t.noCompany}</p>}</CardContent></Card>
      <Card className="border-[#d8b26b]/20 bg-[#d8b26b]/[.07] text-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-5 w-5 text-[#f4dca0]" />{t.key}</CardTitle></CardHeader><CardContent><p className="font-mono text-sm text-[#f4dca0]">DAR_EST_INTEGRATION_API_KEY</p><p className="mt-3 text-sm leading-6 text-white/65">{t.keyText}</p><div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] p-3 text-sm text-emerald-100"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><span>{t.securityText}</span></div></CardContent></Card>
    </section>

    <section className="grid gap-5 lg:grid-cols-2"><Card className="border-white/10 bg-white/[.035] text-white"><CardHeader><CardTitle>{t.publicApi}</CardTitle><p className="text-sm leading-6 text-white/50">{t.publicApiText}</p></CardHeader><CardContent className="space-y-4"><div className="rounded-xl border border-white/10 bg-black/15 p-4"><code className="break-all text-xs text-[#d8b26b]">GET {baseUrl}/api/integrations/v1/properties?company={slug}</code></div><div className="rounded-xl border border-white/10 bg-black/15 p-4"><code className="break-all text-xs text-[#d8b26b]">GET {baseUrl}/api/integrations/v1/properties/:id?company={slug}</code></div><CodeBlock label={t.codePublic} value={publicExample} onCopy={() => void copyValue("public", publicExample)} copied={copied === "public"} /></CardContent></Card>
      <Card className="border-white/10 bg-white/[.035] text-white"><CardHeader><CardTitle>{t.writeApi}</CardTitle><p className="text-sm leading-6 text-white/50">{t.writeApiText}</p></CardHeader><CardContent className="space-y-4"><div className="rounded-xl border border-white/10 bg-black/15 p-4"><code className="break-all text-xs text-[#d8b26b]">POST {baseUrl}/api/integrations/v1/leads</code><p className="mt-2 text-xs text-white/40">{t.key}: Authorization: Bearer API_KEY</p></div><CodeBlock label={t.codeLead} value={leadExample} onCopy={() => void copyValue("lead", leadExample)} copied={copied === "lead"} /></CardContent></Card>
    </section>

    <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Card className="border-white/10 bg-white/[.035] text-white"><CardHeader><CardTitle>{t.stepsTitle}</CardTitle></CardHeader><CardContent><ol className="space-y-4 text-sm leading-6 text-white/70">{[t.step1, t.step2, t.step3, t.step4].map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d8b26b]/15 font-semibold text-[#f4dca0]">{index + 1}</span><span>{step}</span></li>)}</ol></CardContent></Card><Card className="border-white/10 bg-white/[.035] text-white"><CardHeader><CardTitle className="flex items-center gap-2"><ExternalLink className="h-5 w-5 text-[#d8b26b]" />OpenAPI</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-white/55">{t.securityText}</p><a className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#d8b26b] px-4 py-3 text-sm font-semibold text-[#071a27] transition hover:bg-[#efcf8d]" href={`${baseUrl}/api/integrations/v1/openapi.json`} target="_blank" rel="noreferrer">{t.docs}<ExternalLink className="h-4 w-4" /></a></CardContent></Card></section>
  </div></main>;
}
