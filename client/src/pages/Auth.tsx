import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Auth() {
  const [location, setLocation] = useLocation();
  const registerMode = location === "/register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.login.useMutation({ onSuccess: () => setLocation("/") });
  const register = trpc.auth.register.useMutation({ onSuccess: () => setLocation("/") });
  const pending = login.isPending || register.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (registerMode) {
      register.mutate({ name, email, password }, { onError: err => setError(err.message) });
    } else {
      login.mutate({ email, password }, { onError: err => setError(err.message) });
    }
  };

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#071a27] px-4 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.06] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d8b26b]/15 text-2xl font-bold text-[#e3c27e]">D</div>
          <h1 className="mt-5 text-3xl font-semibold">{registerMode ? "إنشاء حساب" : "تسجيل الدخول"}</h1>
          <p className="mt-3 text-sm leading-7 text-white/60">{registerMode ? "أنشئ حسابك المحلي وابدأ إدارة شركتك." : "ادخل إلى مساحة عمل DAR.EST."}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {registerMode && <input required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="الاسم بالكامل" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[#d8b26b]" />}
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[#d8b26b]" />
          <input required minLength={registerMode ? 8 : 1} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[#d8b26b]" />
          {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          <button disabled={pending} className="w-full rounded-xl bg-[#d8b26b] px-4 py-3 font-semibold text-[#071a27] disabled:opacity-50">{pending ? "جارٍ التنفيذ..." : registerMode ? "إنشاء الحساب" : "دخول"}</button>
        </form>
        <div className="mt-6 text-center text-sm text-white/60">
          {registerMode ? "لديك حساب بالفعل؟ " : "ليس لديك حساب؟ "}
          <Link href={registerMode ? "/login" : "/register"} className="text-[#e3c27e] hover:underline">{registerMode ? "تسجيل الدخول" : "إنشاء حساب"}</Link>
        </div>
        <Link href="/" className="mt-5 block text-center text-xs text-white/40 hover:text-white">العودة للرئيسية</Link>
      </section>
    </main>
  );
}
