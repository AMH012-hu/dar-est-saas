import { FileText, LogOut, Receipt, ShieldCheck, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { trpc } from "@/lib/trpc";

const copy = {
  he: { title: "אזור הדייר", subtitle: "כל המידע החשוב שלך במקום אחד", notFound: "לא נמצא חשבון דייר עבור כתובת הדוא״ל המחוברת.", back: "חזרה למרחב העבודה", active: "פעיל", ended: "הסתיים", contracts: "חוזים", payments: "תשלומים", documents: "מסמכים", noData: "אין נתונים להצגה", secure: "גישה מאובטחת ומבודדת לפי החשבון שלך", paid: "שולם", pending: "ממתין", overdue: "באיחור" },
  ar: { title: "بوابة المستأجر", subtitle: "كل معلوماتك المهمة في مكان واحد", notFound: "لم يتم العثور على حساب مستأجر للبريد المرتبط.", back: "العودة لمساحة العمل", active: "نشط", ended: "منتهٍ", contracts: "العقود", payments: "المدفوعات", documents: "المستندات", noData: "لا توجد بيانات للعرض", secure: "وصول آمن ومعزول حسب حسابك", paid: "مدفوع", pending: "قيد الانتظار", overdue: "متأخر" },
  en: { title: "Tenant portal", subtitle: "Your important property information in one place", notFound: "No tenant account was found for the signed-in email.", back: "Back to workspace", active: "Active", ended: "Ended", contracts: "Contracts", payments: "Payments", documents: "Documents", noData: "No data to display", secure: "Secure access scoped to your account", paid: "Paid", pending: "Pending", overdue: "Overdue" },
  ru: { title: "Портал арендатора", subtitle: "Важная информация о недвижимости в одном месте", notFound: "Учетная запись арендатора для текущей почты не найдена.", back: "Назад в рабочую область", active: "Активен", ended: "Завершен", contracts: "Договоры", payments: "Платежи", documents: "Документы", noData: "Нет данных", secure: "Безопасный доступ только к вашему аккаунту", paid: "Оплачен", pending: "Ожидает", overdue: "Просрочен" },
  uk: { title: "Портал орендаря", subtitle: "Важна інформація про нерухомість в одному місці", notFound: "Обліковий запис орендаря для поточної пошти не знайдено.", back: "Назад до робочої області", active: "Активний", ended: "Завершений", contracts: "Договори", payments: "Платежі", documents: "Документи", noData: "Немає даних", secure: "Безпечний доступ лише до вашого облікового запису", paid: "Сплачено", pending: "Очікує", overdue: "Прострочено" },
} as const;

export default function TenantPortal() {
  const [, navigate] = useLocation();
  const { lang, dir } = useLocale();
  const t = copy[lang];
  const { data, isLoading } = trpc.portal.me.useQuery();
  const statusLabel = (status: string) => status === "paid" ? t.paid : status === "overdue" ? t.overdue : t.pending;

  return <main dir={dir} className="min-h-screen bg-[#071a27] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[.28em] text-[#d8b26b]"><ShieldCheck className="h-4 w-4" /> DAR.EST</div><h1 className="text-3xl font-semibold sm:text-5xl">{t.title}</h1><p className="mt-2 text-white/55">{t.subtitle}</p></div>
        <div className="flex flex-wrap items-center gap-2"><LocaleSwitcher /><Button variant="outline" onClick={() => navigate("/workspace")} className="border-white/15 bg-white/[.04] text-white hover:bg-white/10"><LogOut className="me-2 h-4 w-4" />{t.back}</Button></div>
      </header>
      {isLoading ? <div className="grid gap-4 md:grid-cols-3"><div className="h-36 animate-pulse rounded-3xl bg-white/[.06]" /><div className="h-36 animate-pulse rounded-3xl bg-white/[.06]" /><div className="h-36 animate-pulse rounded-3xl bg-white/[.06]" /></div> : !data?.tenant ? <Card className="border-white/10 bg-white/[.04] text-white"><CardContent className="p-10 text-center"><p className="text-white/70">{t.notFound}</p></CardContent></Card> : <>
        <Card className="mb-6 border-[#d8b26b]/25 bg-gradient-to-br from-[#17394b] to-[#0b2433] text-white"><CardContent className="flex flex-wrap items-center justify-between gap-5 p-6"><div><p className="text-sm text-white/50">{data.tenant.email}</p><h2 className="mt-1 text-2xl font-semibold">{data.tenant.name}</h2></div><Badge className="border-[#d8b26b]/30 bg-[#d8b26b]/15 text-[#e8c983]">{data.tenant.status === "active" ? t.active : t.ended}</Badge></CardContent></Card>
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="border-white/10 bg-white/[.04] text-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5 text-[#d8b26b]" />{t.contracts}</CardTitle></CardHeader><CardContent>{data.contracts.length ? data.contracts.map(contract => <div key={contract.id} className="border-t border-white/10 py-3"><div className="flex justify-between gap-3"><span>{contract.title}</span><Badge variant="outline" className="border-white/15 text-white/60">{contract.status}</Badge></div><p className="mt-1 text-sm text-white/45">EGP{contract.rentAmountIls.toLocaleString()} · {new Date(contract.endAt).toLocaleDateString()}</p></div>) : <p className="text-sm text-white/45">{t.noData}</p>}</CardContent></Card>
          <Card className="border-white/10 bg-white/[.04] text-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-5 w-5 text-[#d8b26b]" />{t.payments}</CardTitle></CardHeader><CardContent>{data.payments.length ? data.payments.map(payment => <div key={payment.id} className="border-t border-white/10 py-3"><div className="flex justify-between gap-3"><span>EGP{payment.amountIls.toLocaleString()}</span><Badge variant="outline" className="border-white/15 text-white/60">{statusLabel(payment.status)}</Badge></div><p className="mt-1 text-sm text-white/45">{new Date(payment.createdAt).toLocaleDateString()}</p></div>) : <p className="text-sm text-white/45">{t.noData}</p>}</CardContent></Card>
          <Card className="border-white/10 bg-white/[.04] text-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-5 w-5 text-[#d8b26b]" />{t.documents}</CardTitle></CardHeader><CardContent>{data.documents.length ? data.documents.map(document => <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer" className="block border-t border-white/10 py-3 hover:text-[#e8c983]"><div className="flex justify-between gap-3"><span>{document.title}</span><span className="text-xs text-white/45">v{document.versionNumber}</span></div><p className="mt-1 text-sm text-white/45">{document.category}</p></a>) : <p className="text-sm text-white/45">{t.noData}</p>}</CardContent></Card>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/35"><ShieldCheck className="h-4 w-4" />{t.secure}</p>
      </>}
    </div>
  </main>;
}
