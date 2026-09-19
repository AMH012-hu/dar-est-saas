import { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CalendarClock, Edit3, FileText, FolderOpen, Loader2, Plus, RefreshCw, Search, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DocumentRecord = {
  id: number;
  title: string;
  category: string;
  mimeType: string;
  versionNumber: number;
  propertyId: number | null;
  unitId: number | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
};

type FormMode = "upload" | "edit" | "replace" | null;

const copy = {
  ar: {
    eyebrow: "OPERATIONS / DOCUMENTS",
    title: "مركز المستندات",
    subtitle: "ارفع مستندات الشركة، صنّفها، راقب تواريخ انتهائها، وحدّث نسخها من مكان واحد.",
    back: "مساحة العمل",
    add: "رفع مستند",
    search: "ابحث بالاسم أو التصنيف",
    all: "كل التصنيفات",
    total: "إجمالي الملفات",
    expiring: "تنتهي خلال 30 يوماً",
    categories: "تصنيفات نشطة",
    empty: "لا توجد مستندات مطابقة بعد.",
    uploadTitle: "رفع مستند جديد",
    editTitle: "تعديل بيانات المستند",
    replaceTitle: "استبدال الملف بإصدار جديد",
    titleLabel: "عنوان المستند",
    categoryLabel: "التصنيف",
    expiresLabel: "تاريخ الانتهاء (اختياري)",
    fileLabel: "الملف",
    propertyLabel: "معرّف العقار (اختياري)",
    unitLabel: "معرّف الوحدة (اختياري)",
    save: "حفظ",
    upload: "رفع وحفظ",
    replace: "استبدال الملف",
    open: "فتح آمن",
    edit: "تعديل",
    version: "الإصدار",
    remove: "حذف",
    cancel: "إلغاء",
    deleting: "جارٍ الحذف…",
    expired: "منتهي",
    expiringSoon: "ينتهي قريباً",
    protected: "الوصول والملفات معزولة حسب الشركة والصلاحية.",
    fileRequired: "اختر ملفاً لا يتجاوز 10 MB.",
    invalidFile: "لا يمكن رفع ملف فارغ أو أكبر من 10 MB.",
    relationHint: "يتم التحقق من أن معرّفات العقار والوحدة تعود لشركتك قبل الحفظ.",
  },
  en: {
    eyebrow: "OPERATIONS / DOCUMENTS",
    title: "Document centre",
    subtitle: "Upload company records, classify them, track expiries, and safely replace file versions in one place.",
    back: "Workspace",
    add: "Upload document",
    search: "Search title or category",
    all: "All categories",
    total: "Total files",
    expiring: "Expiring in 30 days",
    categories: "Active categories",
    empty: "No matching documents yet.",
    uploadTitle: "Upload a new document",
    editTitle: "Edit document metadata",
    replaceTitle: "Replace with a new version",
    titleLabel: "Document title",
    categoryLabel: "Category",
    expiresLabel: "Expiry date (optional)",
    fileLabel: "File",
    propertyLabel: "Property ID (optional)",
    unitLabel: "Unit ID (optional)",
    save: "Save changes",
    upload: "Upload and save",
    replace: "Replace file",
    open: "Open securely",
    edit: "Edit",
    version: "Version",
    remove: "Delete",
    cancel: "Cancel",
    deleting: "Deleting…",
    expired: "Expired",
    expiringSoon: "Expiring soon",
    protected: "Files and access are isolated by company and permission.",
    fileRequired: "Choose a file no larger than 10 MB.",
    invalidFile: "An empty file or a file larger than 10 MB cannot be uploaded.",
    relationHint: "Property and unit IDs are verified to belong to your company before saving.",
  },
} as const;

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

function toOptionalId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function DocumentCenter() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { lang, dir } = useLocale();
  const t = copy[lang === "ar" ? "ar" : "en"];
  const utils = trpc.useUtils();
  const center = trpc.documents.center.useQuery(undefined, { enabled: Boolean(user) });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState("");
  const [documentCategory, setDocumentCategory] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const invalidate = async () => { await utils.documents.center.invalidate(); };
  const upload = trpc.documents.upload.useMutation({ onSuccess: async () => { await invalidate(); closeForm(); } });
  const update = trpc.documents.update.useMutation({ onSuccess: async () => { await invalidate(); closeForm(); } });
  const replace = trpc.documents.replace.useMutation({ onSuccess: async () => { await invalidate(); closeForm(); } });
  const remove = trpc.documents.remove.useMutation({ onSuccess: invalidate });
  const open = trpc.documents.open.useMutation({ onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer") });

  const records = (center.data?.documents ?? []) as DocumentRecord[];
  const categories = useMemo(() => Array.from(new Set(records.map(item => item.category))).sort(), [records]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return records.filter(item => (category === "all" || item.category === category) && (!needle || `${item.title} ${item.category}`.toLocaleLowerCase().includes(needle)));
  }, [records, search, category]);

  function closeForm() {
    setFormMode(null); setSelected(null); setTitle(""); setDocumentCategory(""); setExpiresAt(""); setPropertyId(""); setUnitId(""); setFile(null); setFormError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function beginUpload() { closeForm(); setFormMode("upload"); }
  function beginEdit(record: DocumentRecord) {
    setSelected(record); setTitle(record.title); setDocumentCategory(record.category); setExpiresAt(toDateInput(record.expiresAt)); setPropertyId(record.propertyId ? String(record.propertyId) : ""); setUnitId(record.unitId ? String(record.unitId) : ""); setFile(null); setFormError(""); setFormMode("edit");
  }
  function beginReplace(record: DocumentRecord) { setSelected(record); setFile(null); setFormError(""); setFormMode("replace"); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    try {
      if (formMode === "upload") {
        if (!file) { setFormError(t.fileRequired); return; }
        if (file.size <= 0 || file.size > 10 * 1024 * 1024) { setFormError(t.invalidFile); return; }
        await upload.mutateAsync({ title: title.trim(), category: documentCategory.trim(), fileName: file.name, mimeType: file.type || "application/octet-stream", base64: await toBase64(file), propertyId: toOptionalId(propertyId), unitId: toOptionalId(unitId), expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00`) : null });
      }
      if (formMode === "edit" && selected) {
        await update.mutateAsync({ documentId: selected.id, title: title.trim(), category: documentCategory.trim(), propertyId: toOptionalId(propertyId), unitId: toOptionalId(unitId), expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00`) : null });
      }
      if (formMode === "replace" && selected) {
        if (!file) { setFormError(t.fileRequired); return; }
        if (file.size <= 0 || file.size > 10 * 1024 * 1024) { setFormError(t.invalidFile); return; }
        await replace.mutateAsync({ documentId: selected.id, fileName: file.name, mimeType: file.type || "application/octet-stream", base64: await toBase64(file) });
      }
    } catch (error) { setFormError(error instanceof Error ? error.message : "REQUEST_FAILED"); }
  }

  const busy = upload.isPending || update.isPending || replace.isPending;
  const expiryTone = (value: DocumentRecord["expiresAt"]) => {
    if (!value) return null;
    const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { label: t.expired, className: "border-rose-300/30 bg-rose-300/10 text-rose-100" };
    if (days <= 30) return { label: t.expiringSoon, className: "border-amber-300/30 bg-amber-300/10 text-amber-100" };
    return null;
  };

  return <main dir={dir} className="min-h-screen bg-[#071a27] px-4 py-4 text-white sm:px-7 sm:py-7">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => navigate("/workspace")} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[.045] text-white/80 hover:border-[#d8b26b]/50 hover:text-[#e8c983]" aria-label={t.back}><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0"><p className="text-[10px] font-semibold tracking-[.23em] text-[#d8b26b]">{t.eyebrow}</p><h1 className="mt-1 text-xl font-semibold sm:text-2xl">{t.title}</h1><p className="mt-1 max-w-2xl text-sm text-white/55">{t.subtitle}</p></div></div>
        <div className="flex items-center gap-2"><LocaleSwitcher compact /><Button onClick={beginUpload} className="bg-[#d8b26b] text-[#071a27] hover:bg-[#e8c983]"><Plus className="h-4 w-4" />{t.add}</Button></div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[[t.total, center.data?.summary.total ?? 0, FileText], [t.expiring, center.data?.summary.expiringSoon ?? 0, CalendarClock], [t.categories, center.data?.summary.categories ?? 0, FolderOpen]].map(([label, value, Icon]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-center justify-between"><span className="text-xs text-white/50">{String(label)}</span>{typeof Icon === "function" && <Icon className="h-4 w-4 text-[#d8b26b]" />}</div><p className="mt-3 text-2xl font-semibold text-[#e8c983]">{String(value)}</p></div>)}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-white/35" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={t.search} className="h-10 border-white/15 bg-black/15 ps-9 text-white placeholder:text-white/35" /></label><select value={category} onChange={event => setCategory(event.target.value)} className="h-10 rounded-xl border border-white/15 bg-black/15 px-3 text-sm text-white outline-none focus:border-[#d8b26b]/70"><option value="all">{t.all}</option>{categories.map(value => <option value={value} key={value}>{value}</option>)}</select></div>
        {center.isLoading ? <div className="flex items-center gap-2 py-14 text-sm text-white/55"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div> : filtered.length ? <div className="mt-4 divide-y divide-white/10">{filtered.map(record => { const expiry = expiryTone(record.expiresAt); return <article key={record.id} className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d8b26b]/20 bg-[#d8b26b]/10"><FileText className="h-5 w-5 text-[#e8c983]" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-medium">{record.title}</h2><span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/55">{record.category}</span><span className="text-[10px] text-white/40">{t.version} {record.versionNumber}</span>{expiry && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${expiry.className}`}>{expiry.label}</span>}</div><p className="mt-1 text-xs text-white/45">{record.mimeType} · {new Date(record.createdAt).toLocaleDateString()}</p>{record.expiresAt && <p className="mt-1 text-xs text-white/45">{t.expiresLabel}: {new Date(record.expiresAt).toLocaleDateString()}</p>}</div></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => open.mutate({ documentId: record.id })} disabled={open.isPending} className="border-white/15 text-white hover:bg-white/10">{open.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}{t.open}</Button><Button size="sm" variant="outline" onClick={() => beginEdit(record)} className="border-white/15 text-white hover:bg-white/10"><Edit3 className="h-3.5 w-3.5" />{t.edit}</Button><Button size="sm" variant="outline" onClick={() => beginReplace(record)} className="border-white/15 text-white hover:bg-white/10"><RefreshCw className="h-3.5 w-3.5" />{t.version}</Button><Button size="icon" variant="outline" onClick={() => { if (window.confirm(`${t.remove}: ${record.title}?`)) remove.mutate({ documentId: record.id }); }} disabled={remove.isPending} className="border-rose-300/25 text-rose-100 hover:bg-rose-300/10"><Trash2 className="h-3.5 w-3.5" /></Button></div></article>; })}</div> : <div className="py-14 text-center"><FolderOpen className="mx-auto h-7 w-7 text-white/25" /><p className="mt-3 text-sm text-white/55">{t.empty}</p><Button variant="outline" onClick={beginUpload} className="mt-4 border-[#d8b26b]/35 text-[#e8c983] hover:bg-[#d8b26b]/10"><Upload className="h-4 w-4" />{t.add}</Button></div>}
      </section>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-white/35"><ShieldCheck className="h-4 w-4 text-[#d8b26b]" />{t.protected}</p>
    </div>

    <Dialog open={formMode !== null} onOpenChange={open => { if (!open) closeForm(); }}>
      <DialogContent className="max-w-lg border-white/15 bg-[#0a2534] text-white"><DialogHeader><DialogTitle>{formMode === "upload" ? t.uploadTitle : formMode === "edit" ? t.editTitle : t.replaceTitle}</DialogTitle><DialogDescription className="text-white/55">{formMode === "replace" ? `${selected?.title ?? ""} · ${t.version} ${(selected?.versionNumber ?? 0) + 1}` : t.relationHint}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={submit}>{formMode !== "replace" && <><div className="space-y-2"><Label htmlFor="document-title">{t.titleLabel}</Label><Input id="document-title" required minLength={2} value={title} onChange={event => setTitle(event.target.value)} className="border-white/15 bg-black/15 text-white" /></div><div className="space-y-2"><Label htmlFor="document-category">{t.categoryLabel}</Label><Input id="document-category" required minLength={2} value={documentCategory} onChange={event => setDocumentCategory(event.target.value)} className="border-white/15 bg-black/15 text-white" /></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="document-property">{t.propertyLabel}</Label><Input id="document-property" inputMode="numeric" value={propertyId} onChange={event => setPropertyId(event.target.value)} className="border-white/15 bg-black/15 text-white" /></div><div className="space-y-2"><Label htmlFor="document-unit">{t.unitLabel}</Label><Input id="document-unit" inputMode="numeric" value={unitId} onChange={event => setUnitId(event.target.value)} className="border-white/15 bg-black/15 text-white" /></div></div><div className="space-y-2"><Label htmlFor="document-expires">{t.expiresLabel}</Label><Input id="document-expires" type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="border-white/15 bg-black/15 text-white" /></div></>}{formMode !== "edit" && <div className="space-y-2"><Label htmlFor="document-file">{t.fileLabel}</Label><Input ref={fileRef} id="document-file" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt" onChange={event => setFile(event.target.files?.[0] ?? null)} className="border-white/15 bg-black/15 text-white file:text-[#e8c983]" /><p className="text-xs text-white/40">{t.fileRequired}</p></div>}{formError && <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{formError}</p>}<DialogFooter><Button type="button" variant="outline" onClick={closeForm} className="border-white/15 text-white hover:bg-white/10">{t.cancel}</Button><Button type="submit" disabled={busy} className="bg-[#d8b26b] text-[#071a27] hover:bg-[#e8c983]">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{formMode === "upload" ? t.upload : formMode === "replace" ? t.replace : t.save}</Button></DialogFooter></form>
      </DialogContent>
    </Dialog>
  </main>;
}
