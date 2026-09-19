import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { translate } from "@/lib/i18n";
import { Link, useRoute } from "wouter";
import { Building2, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";

export default function AcceptInvite() {
  const [, params] = useRoute("/invite/:token");
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const { lang, dir } = useLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
  const [message, setMessage] = useState<string | null>(null);
  const accept = trpc.company.acceptInvitation.useMutation({
    onSuccess: () => setMessage(t("inviteSuccess")),
    onError: (error) => setMessage(error.message || t("requestNeedsAction"))
  });
  const token = params?.token ?? "";

  if (loading) return <main dir={dir} lang={lang} className="grid min-h-screen place-items-center bg-[#071a27] text-white/60">{t("checkingInvite")}</main>;
  return <main dir={dir} lang={lang} className="grid min-h-screen place-items-center bg-[#071a27] px-5 text-white"><section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[.05] p-8 text-center backdrop-blur-2xl sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e5c47c]/15 text-[#e5c47c]"><Building2 size={30} /></div><h1 className="mt-6 text-3xl font-semibold">{t("invitePageTitle")}</h1><p className="mt-4 leading-8 text-white/55">{t("invitePageIntro")}</p>{message && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e5c47c]/25 bg-[#e5c47c]/10 p-4 text-right text-sm leading-7 text-[#f0d58d]"><CheckCircle2 className="mt-1 shrink-0" size={18} />{message}</div>}{!user ? <button type="button" onClick={() => startLogin()} className="mt-8 w-full rounded-full bg-[#e5c47c] px-6 py-3 font-semibold text-[#071a27]">{t("inviteLogin")}</button> : <button type="button" disabled={accept.isPending || !token} onClick={() => accept.mutate({ token })} className="mt-8 w-full rounded-full bg-[#e5c47c] px-6 py-3 font-semibold text-[#071a27] disabled:opacity-50">{accept.isPending ? t("acceptingInvite") : t("acceptInvite")}</button>}<Link href="/account" className="mt-6 inline-block text-sm text-white/55 hover:text-[#e5c47c]">{t("backToAccount")}</Link><div className="mt-7 flex items-center justify-center gap-2 text-xs text-white/35"><ShieldAlert size={14} /> {t("inviteSecurity")}</div></section></main>;
}
