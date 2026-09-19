import { useMemo, useState } from "react";
import { ArrowUpLeft, CheckCircle2, Clock3, CreditCard, KeyRound, MessageCircle, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { SUBSCRIPTION_PLANS, type PlanCode } from "@shared/subscriptionPlans";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { checkoutCopy, durationText, planNames } from "@/lib/checkoutCopy";
import { formatPlanPrice } from "@/lib/pricing";

const WHATSAPP_NUMBER = "201501805674";
const PAYMENT_LINKS = {
  paypal: "https://www.paypal.com/qrcodes/p2pqrc/C7Q5PY283N5QA",
  bit: "https://www.bitpay.co.il/app/me/C6CBFC03-787A-2F4E-8878-1A34E17937D86AE4",
} as const;

export default function Checkout() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const { dir, lang } = useLocale();
  const copy = checkoutCopy[lang];
  const [, navigate] = useLocation();
  const plan = ((new URLSearchParams(window.location.search).get("plan") ?? "quarterly") as PlanCode);
  const selected = SUBSCRIPTION_PLANS[plan] ?? SUBSCRIPTION_PLANS.quarterly;
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "creating" | "pending">("idle");
  const [paymentProvider, setPaymentProvider] = useState<"paypal" | "bit" | null>(null);
  const displayedPrice = formatPlanPrice(selected.priceIls, lang);
  const [paymentError, setPaymentError] = useState("");
  const createPaymentRequest = trpc.payments.createManualRequest.useMutation({
    onSuccess: (_result, variables) => {
      setPaymentStatus("pending");
      setPaymentError("");
      window.open(PAYMENT_LINKS[variables.provider], "_blank", "noopener,noreferrer");
    },
    onError: (reason) => {
      setPaymentStatus("idle");
      setPaymentError(reason.message || copy.paymentFailed);
    },
  });
  const redeem = trpc.account.redeemKey.useMutation({
    onSuccess: () => {
      setError("");
      setSuccess(true);
      window.setTimeout(() => navigate("/account"), 1400);
    },
    onError: (reason) => {
      setSuccess(false);
      setError(reason.message || copy.invalidKey);
    },
  });
  const whatsappHref = useMemo(() => {
    const message = `${copy.whatsappMessage} ${planNames[lang][selected.code]} — ${formatPlanPrice(selected.priceIls, lang)}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }, [copy.whatsappMessage, lang, selected.code, selected.priceIls]);

  function startPayment(provider: "paypal" | "bit") {
    setPaymentProvider(provider);
    setPaymentStatus("creating");
    setPaymentError("");
    createPaymentRequest.mutate({
      planCode: selected.code,
      provider,
      reference: `checkout-${provider}-${selected.code}-${Date.now()}`,
    });
  }

  function submit() {
    setError("");
    setSuccess(false);
    if (!/^[A-Za-z0-9]{56}$/.test(key.trim())) {
      setError(copy.invalidKey);
      return;
    }
    redeem.mutate({ planCode: selected.code, key: key.trim() });
  }

  if (loading || !user) return <main className="min-h-screen bg-[#071a27]" />;
  return (
    <main dir={dir} className="min-h-screen overflow-x-hidden bg-[#071a27] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto min-w-0 max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm text-white/60 hover:text-white">← {copy.home}</Link><div className="flex items-center gap-3"><LocaleSwitcher /><span className="hidden text-xs tracking-[.22em] text-[#e5c47c] sm:inline">DAR.EST / ACTIVATION</span></div></header>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
          <section className="min-w-0 rounded-[2rem] border border-white/10 bg-[#0b2332] p-7 sm:p-9"><p className="text-xs uppercase tracking-[.22em] text-[#e5c47c]">{copy.selectedPlan}</p><h1 className="mt-4 text-3xl font-semibold">{planNames[lang][selected.code] ?? selected.labelAr}</h1><p className="mt-3 text-white/55">{copy.accessDuration}: {durationText[lang](selected.durationMonths)}</p><div className="mt-8 text-5xl font-semibold text-[#e5c47c]">{displayedPrice}</div><div className="mt-8 space-y-3 text-sm text-white/65"><p className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#e5c47c]" />{copy.keyUnique}</p><p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#e5c47c]" />{copy.planLocked}</p><p className="flex items-center gap-2"><KeyRound size={16} className="text-[#e5c47c]" />{copy.keyHint}</p></div></section>
          <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[.045] p-7 backdrop-blur-2xl sm:p-9"><h2 className="text-2xl font-semibold">{copy.buyTitle}</h2><p className="mt-3 leading-7 text-white/55">{copy.buyIntro}</p>
            <div className="mt-7 rounded-2xl border border-[#d8b26b]/25 bg-[#d8b26b]/[.06] p-5"><div className="flex items-start gap-3"><CreditCard size={20} className="mt-0.5 shrink-0 text-[#e5c47c]" /><div><h3 className="font-semibold text-[#f0d79d]">{copy.choosePayment}</h3><p className="mt-2 text-sm leading-6 text-white/55">{copy.paymentIntro}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={paymentStatus === "creating"} onClick={() => startPayment("paypal")} className="flex items-center justify-between gap-3 rounded-2xl border border-[#0070ba]/45 bg-[#0070ba]/15 px-4 py-4 text-left transition hover:bg-[#0070ba]/25 disabled:cursor-wait disabled:opacity-60"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-[#0070ba]">P</span><span className="font-semibold text-white">{copy.paypal}</span></span><ArrowUpLeft size={18} className="text-[#9bd7ff]" /></button><button type="button" disabled={paymentStatus === "creating"} onClick={() => startPayment("bit")} className="flex items-center justify-between gap-3 rounded-2xl border border-[#36c5a0]/40 bg-[#36c5a0]/10 px-4 py-4 text-left transition hover:bg-[#36c5a0]/20 disabled:cursor-wait disabled:opacity-60"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#36c5a0] text-xs font-black text-[#062a22]">bit</span><span className="font-semibold text-white">{copy.bit}</span></span><ArrowUpLeft size={18} className="text-[#8eead2]" /></button></div>{paymentStatus === "creating" && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#f0d79d]"><Clock3 size={16} />{copy.paymentOpening}</p>}{paymentStatus === "pending" && <div role="status" className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4"><p className="flex items-center gap-2 font-semibold text-amber-100"><Clock3 size={16} />{copy.paymentPending}</p><p className="mt-2 text-sm leading-6 text-amber-50/70">{copy.paymentPendingHint}</p>{paymentProvider && <a href={PAYMENT_LINKS[paymentProvider]} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#f0d79d] underline underline-offset-4">{paymentProvider === "paypal" ? copy.paypal : copy.bit}<ArrowUpLeft size={15} /></a>}</div>}{paymentError && <div role="alert" className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{paymentError}</div>}</div>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[#25d366]/30 bg-[#25d366]/10 p-5 transition hover:bg-[#25d366]/15"><span><span className="flex items-center gap-2 font-semibold text-[#b8ffd0]"><MessageCircle size={19} />{copy.contactWhatsapp}</span><span className="mt-2 block text-sm text-white/55">+201501805674</span></span><ArrowUpLeft className="text-[#b8ffd0]" size={20} /></a>
            <div className="my-8 flex items-center gap-3 text-xs text-white/35"><span className="h-px flex-1 bg-white/10" />{copy.orActivate}<span className="h-px flex-1 bg-white/10" /></div>
            <label className="block text-sm text-white/65">{copy.activationKey}<input value={key} onChange={(event) => setKey(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 56))} maxLength={56} autoComplete="off" placeholder={copy.keyPlaceholder} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#071a27] px-4 py-3 font-mono tracking-[.08em] text-white outline-none ring-[#e5c47c]/30 focus:ring-2" /></label>
            <p className="mt-3 text-xs leading-6 text-white/40">{copy.activationHint}</p>
            {error && <div role="alert" aria-live="assertive" className="motion-safe:animate-pulse mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}
            {success && <div role="status" aria-live="polite" className="motion-safe:animate-pulse mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{copy.activationSuccess}</div>}
            <button disabled={key.length !== 56 || redeem.isPending || success} onClick={submit} className="mt-6 w-full rounded-full bg-[#d9bd78] px-5 py-3 font-semibold text-[#071a27] transition duration-200 hover:scale-[1.01] hover:bg-[#ebd393] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40">{redeem.isPending ? copy.activating : success ? copy.activationSuccess : copy.activate}</button>
          </section>
        </div>
      </div>
    </main>
  );
}
