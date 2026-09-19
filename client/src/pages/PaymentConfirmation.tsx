import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, FileImage, Loader2, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { checkoutCopy, durationText, planNames } from "@/lib/checkoutCopy";
import { SUBSCRIPTION_PLANS, type PlanCode } from "@shared/subscriptionPlans";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
type AcceptedType = (typeof ACCEPTED_TYPES)[number];

type UploadState = "idle" | "reading" | "uploading" | "submitted";

export default function PaymentConfirmation() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const { dir, lang } = useLocale();
  const copy = checkoutCopy[lang];
  const [, navigate] = useLocation();
  const requestId = Number(new URLSearchParams(window.location.search).get("requestId"));
  const requestsQuery = trpc.payments.myManualRequests.useQuery(undefined, { enabled: Boolean(user) });
  const invoicesQuery = trpc.payments.myInvoices.useQuery(undefined, { enabled: Boolean(user) });
  const uploadProof = trpc.payments.uploadProof.useMutation({
    onSuccess: () => {
      setUploadState("submitted");
      setError("");
      void requestsQuery.refetch();
      void invoicesQuery.refetch();
    },
    onError: (reason) => {
      setUploadState("idle");
      setError(reason.message || copy.proofUploadFailed);
    },
  });
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(() => {
    const item = requestsQuery.data?.find((entry) => entry.request.id === requestId);
    const planCode = (item?.request.planCode ?? "quarterly") as PlanCode;
    return { item, plan: SUBSCRIPTION_PLANS[planCode] ?? SUBSCRIPTION_PLANS.quarterly };
  }, [requestId, requestsQuery.data]);
  const currentStatus = selected.item?.request.status;
  const alreadySubmitted = currentStatus === "pending_manual_verification" || currentStatus === "approved";
  const isRejected = currentStatus === "rejected";

  async function handleFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
      setError(copy.proofFileType);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(copy.proofFileSize);
      return;
    }
    if (!selected.item) {
      setError(copy.proofRequestMissing);
      return;
    }
    setFileName(file.name);
    setUploadState("reading");
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error(copy.proofReadFailed));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!dataBase64) {
      setUploadState("idle");
      setError(copy.proofReadFailed);
      return;
    }
    setUploadState("uploading");
    uploadProof.mutate({ requestId, fileName: file.name, contentType: file.type as AcceptedType, dataBase64 });
  }

  if (loading || !user) return <main className="min-h-screen bg-[#071a27]" />;
  if (!Number.isInteger(requestId) || requestId <= 0 || (!requestsQuery.isLoading && !selected.item)) {
    return <main dir={dir} className="flex min-h-screen items-center justify-center bg-[#071a27] px-5 text-white"><section className="max-w-lg rounded-[2rem] border border-white/10 bg-white/[.045] p-8 text-center backdrop-blur-2xl"><ShieldCheck className="mx-auto text-[#e5c47c]" size={34} /><h1 className="mt-5 text-2xl font-semibold">{copy.proofRequestMissing}</h1><Link href="/account" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#d9bd78] px-6 py-3 font-semibold text-[#071a27]"><ArrowLeft size={17} />{copy.account}</Link></section></main>;
  }

  return <main dir={dir} className="min-h-screen overflow-x-hidden bg-[#071a27] px-4 py-8 text-white sm:px-8"><div className="mx-auto min-w-0 max-w-4xl"><header className="mb-8 flex items-center justify-between gap-4"><Link href="/account" className="flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={16} />{copy.account}</Link><div className="flex items-center gap-3"><LocaleSwitcher /><span className="hidden text-xs tracking-[.22em] text-[#e5c47c] sm:inline">DAR.EST / PAYMENT</span></div></header><section className="rounded-[2rem] border border-white/10 bg-white/[.045] p-6 backdrop-blur-2xl sm:p-10"><p className="text-xs uppercase tracking-[.22em] text-[#e5c47c]">DAR.EST / PAYMENT</p><h1 className="mt-4 text-3xl font-semibold">{copy.proofTitle}</h1><p className="mt-3 max-w-2xl leading-7 text-white/55">{copy.proofIntro}</p><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0b2332] p-5"><p className="text-xs text-white/45">{copy.selectedPlan}</p><p className="mt-2 font-semibold">{planNames[lang][selected.plan.code]}</p><p className="mt-1 text-sm text-white/50">{durationText[lang](selected.plan.durationMonths)}</p></div><div className="rounded-2xl border border-white/10 bg-[#0b2332] p-5"><p className="text-xs text-white/45">{copy.amount}</p><p className="mt-2 text-2xl font-semibold text-[#e5c47c]">{selected.plan.priceIls} EGP</p></div><div className="rounded-2xl border border-[#d8b26b]/25 bg-[#d8b26b]/[.06] p-5"><p className="text-xs text-white/45">{copy.paymentStatus}</p><p className="mt-2 flex items-center gap-2 font-semibold text-[#f0d79d]">{alreadySubmitted ? <CheckCircle2 size={17} /> : isRejected ? <XCircle size={17} /> : <Clock3 size={17} />}{alreadySubmitted ? copy.proofSubmitted : isRejected ? copy.proofRejected : copy.paymentPending}</p></div></div>{alreadySubmitted ? <div role="status" className="mt-7 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5 text-emerald-50"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18} />{copy.proofSubmitted}</p><p className="mt-2 text-sm leading-6 text-emerald-50/70">{copy.proofSubmittedHint}</p></div> : <div className="mt-7"><label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8b26b]/45 bg-[#d8b26b]/[.05] p-6 text-center transition hover:bg-[#d8b26b]/[.1]"><input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" disabled={uploadState === "reading" || uploadState === "uploading"} onChange={(event) => void handleFile(event.target.files?.[0])} /><UploadCloud className="text-[#e5c47c]" size={30} /><span className="mt-3 font-semibold">{copy.chooseProof}</span><span className="mt-2 text-xs text-white/45">{copy.proofFormats}</span>{fileName && <span className="mt-3 flex items-center gap-2 text-sm text-[#f0d79d]"><FileImage size={15} />{fileName}</span>}</label>{(uploadState === "reading" || uploadState === "uploading") && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#f0d79d]"><Loader2 className="animate-spin" size={16} />{uploadState === "reading" ? copy.proofReading : copy.proofUploading}</p>}{error && <p role="alert" className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}</div>}<div className="mt-7 flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-2 text-white/45"><ShieldCheck size={16} className="text-[#e5c47c]" />{copy.proofManualOnly}</span><Link href="/account" className="ms-auto rounded-full border border-white/15 px-5 py-3 font-semibold text-white/75 hover:bg-white/[.06]">{copy.account}</Link></div></section></div></main>;
}
