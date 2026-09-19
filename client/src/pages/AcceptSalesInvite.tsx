import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { CheckCircle2, ShieldCheck, UsersRound } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";

const copy = {
  he: { title: "הצטרפות לצוות המכירות", intro: "הזמנה זו מקשרת את החשבון שלך לצוות המכירות של החברה. היא תקפה רק לכתובת הדוא״ל שהוזמנה.", login: "התחברות להמשך", accept: "קבלת ההזמנה", accepting: "מאשר הזמנה…", success: "ההזמנה התקבלה. מעבירים אותך למרחב המכירות.", invalid: "לא ניתן לאשר את ההזמנה הזו. ודאו שהתחברתם עם כתובת הדוא״ל שהוזמנה ושהקישור עדיין בתוקף.", secure: "קישור מאובטח לשימוש חד-פעמי", checking: "בודק את ההזמנה…" },
  ar: { title: "الانضمام إلى فريق المبيعات", intro: "تربط هذه الدعوة حسابك بفريق مبيعات الشركة. وهي صالحة فقط للبريد الإلكتروني المدعو.", login: "تسجيل الدخول للمتابعة", accept: "قبول الدعوة", accepting: "جارٍ قبول الدعوة…", success: "تم قبول الدعوة. جارٍ نقلك إلى مساحة المبيعات.", invalid: "لا يمكن قبول هذه الدعوة. تأكد من تسجيل الدخول بالبريد المدعو وأن الرابط ما زال صالحاً.", secure: "رابط آمن للاستخدام لمرة واحدة", checking: "جارٍ التحقق من الدعوة…" },
  en: { title: "Join the sales team", intro: "This invitation links your account to the company sales team. It is valid only for the invited email address.", login: "Sign in to continue", accept: "Accept invitation", accepting: "Accepting invitation…", success: "Invitation accepted. Taking you to the sales workspace.", invalid: "This invitation could not be accepted. Confirm that you signed in with the invited email and that the link is still valid.", secure: "Secure single-use invitation link", checking: "Checking invitation…" },
  ru: { title: "Присоединиться к отделу продаж", intro: "Это приглашение связывает ваш аккаунт с отделом продаж компании. Оно действует только для приглашённого адреса.", login: "Войти, чтобы продолжить", accept: "Принять приглашение", accepting: "Подтверждение приглашения…", success: "Приглашение принято. Переходим в пространство продаж.", invalid: "Не удалось принять приглашение. Убедитесь, что вы вошли с приглашённым адресом и ссылка ещё действует.", secure: "Защищённая одноразовая ссылка", checking: "Проверка приглашения…" },
  uk: { title: "Приєднатися до команди продажів", intro: "Це запрошення пов’язує ваш обліковий запис із командою продажів компанії. Воно дійсне лише для запрошеної адреси.", login: "Увійти, щоб продовжити", accept: "Прийняти запрошення", accepting: "Підтвердження запрошення…", success: "Запрошення прийнято. Переходимо до простору продажів.", invalid: "Не вдалося прийняти запрошення. Переконайтеся, що ви увійшли з запрошеною адресою і посилання ще дійсне.", secure: "Захищене одноразове посилання", checking: "Перевірка запрошення…" },
} as const;

export default function AcceptSalesInvite() {
  const [, params] = useRoute("/sales/invite/:token");
  const [, navigate] = useLocation();
  const { lang, dir } = useLocale();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [message, setMessage] = useState("");
  const t = copy[lang];
  const accept = trpc.sales.acceptTeamInvitation.useMutation({
    onSuccess: () => { setMessage(t.success); window.setTimeout(() => navigate("/sales/team"), 700); },
    onError: () => setMessage(t.invalid),
  });
  const token = params?.token ?? "";
  if (loading) return <main dir={dir} className="grid min-h-screen place-items-center bg-[#071a27] text-white/60">{t.checking}</main>;
  return <main dir={dir} className="grid min-h-screen place-items-center bg-[#071a27] px-5 text-white"><section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[.05] p-8 text-center backdrop-blur-2xl sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e5c47c]/15 text-[#e5c47c]"><UsersRound size={30} /></div><h1 className="mt-6 text-3xl font-semibold">{t.title}</h1><p className="mt-4 leading-8 text-white/55">{t.intro}</p>{message && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e5c47c]/25 bg-[#e5c47c]/10 p-4 text-start text-sm leading-7 text-[#f0d58d]"><CheckCircle2 className="mt-1 shrink-0" size={18} />{message}</div>}{!user ? <button type="button" onClick={() => startLogin()} className="mt-8 w-full rounded-full bg-[#e5c47c] px-6 py-3 font-semibold text-[#071a27]">{t.login}</button> : <button type="button" disabled={accept.isPending || !token} onClick={() => accept.mutate({ token })} className="mt-8 w-full rounded-full bg-[#e5c47c] px-6 py-3 font-semibold text-[#071a27] disabled:opacity-50">{accept.isPending ? t.accepting : t.accept}</button>}<div className="mt-7 flex items-center justify-center gap-2 text-xs text-white/35"><ShieldCheck size={14} /> {t.secure}</div></section></main>;
}
