import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Check, ChevronRight, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ModuleId = "portfolio" | "collections" | "work-orders" | "insights" | "leases" | "operating-log";
type Row = Record<string, unknown>;
type FormKind = "portfolio" | "building" | "unit" | "payment" | "collection-period" | "receipt" | "payment-reversal" | "work-order" | "maintenance" | "tenant" | "contract" | null;
type EditKind = "unit" | "payment" | "maintenance" | "work-order" | "tenant" | "contract" | null;

function asRecord(value: unknown): Row {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => typeof item === "object" && item !== null) as Row[] : [];
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateValue(value: unknown) {
  if (!value) return "";
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  return "—";
}

const inputClass = "mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#061725] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#d8b26b]/70";
const selectClass = "mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#061725] px-3 text-sm text-white outline-none focus:border-[#d8b26b]/70";
const buttonClass = "inline-flex items-center gap-2 rounded-full border border-[#d8b26b]/45 px-3.5 py-2 text-xs font-semibold text-[#f3d98d] transition hover:bg-[#d8b26b]/10 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-white/60"><span>{label}</span>{children}</label>;
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-[#f3d98d]">{title}</h2><span className="text-xs text-white/40">{count} matching records</span></div>;
}

export default function WorkspaceModuleOperations({
  moduleId,
  lang,
  query,
  filter,
  hierarchy,
  leasing,
  collections,
  finance,
  operations,
  documents,
  activity,
  tenants,
  contracts,
  maintenance,
  payments,
}: {
  moduleId: ModuleId;
  lang: string;
  query: string;
  filter: { value: string; terms: string[] };
  hierarchy: unknown;
  leasing: unknown;
  collections: unknown;
  finance: unknown;
  operations: unknown;
  documents: unknown;
  activity: unknown;
  tenants: unknown;
  contracts: unknown;
  maintenance: unknown;
  payments: unknown;
}) {
  const utils = trpc.useUtils();
  const isArabic = lang === "ar";
  const [form, setForm] = useState<FormKind>(null);
  const [editor, setEditor] = useState<{ kind: EditKind; row: Row } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: Exclude<EditKind, "work-order">; id: number } | null>(null);
  const [reversalEvent, setReversalEvent] = useState<Row | null>(null);
  const [activityType, setActivityType] = useState("all");
  const [activityActor, setActivityActor] = useState("");
  const [activityStart, setActivityStart] = useState("");
  const [activityEnd, setActivityEnd] = useState("");

  const createPortfolio = trpc.portfolio.createPortfolio.useMutation({ onSuccess: async () => { await utils.portfolio.hierarchy.invalidate(); setNotice(isArabic ? "تم إنشاء المحفظة." : "Portfolio created."); setForm(null); } });
  const createBuilding = trpc.portfolio.createBuilding.useMutation({ onSuccess: async () => { await utils.portfolio.hierarchy.invalidate(); setNotice(isArabic ? "تم إنشاء المبنى." : "Building created."); setForm(null); } });
  const createUnit = trpc.portfolio.createUnit.useMutation({ onSuccess: async () => { await Promise.all([utils.portfolio.hierarchy.invalidate(), utils.portfolio.leasingCenter.invalidate()]); setNotice(isArabic ? "تم إنشاء الوحدة." : "Unit created."); setForm(null); } });
  const updateUnitStatus = trpc.portfolio.updateUnitStatus.useMutation({ onSuccess: async () => { await Promise.all([utils.portfolio.hierarchy.invalidate(), utils.portfolio.leasingCenter.invalidate(), utils.company.activity.invalidate()]); setNotice(isArabic ? "تم تحديث حالة الوحدة." : "Unit status updated."); setEditor(null); } });
  const deleteUnit = trpc.portfolio.deleteUnit.useMutation({ onSuccess: async () => { await Promise.all([utils.portfolio.hierarchy.invalidate(), utils.portfolio.leasingCenter.invalidate(), utils.portfolio.collections.invalidate(), utils.company.activity.invalidate()]); setNotice(isArabic ? "تم حذف الوحدة." : "Unit deleted."); setConfirmDelete(null); } });
  const createPayment = trpc.legacy.createOperationalPayment.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.operationalPayments.invalidate(), utils.portfolio.collections.invalidate(), utils.finance.center.invalidate()]); setNotice(isArabic ? "تم تسجيل الدفعة." : "Payment recorded."); setForm(null); } });
  const updatePayment = trpc.legacy.updateOperationalPayment.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.operationalPayments.invalidate(), utils.portfolio.collections.invalidate(), utils.finance.center.invalidate()]); setNotice(isArabic ? "تم تحديث الدفعة." : "Payment updated."); setEditor(null); } });
  const deletePayment = trpc.legacy.deleteOperationalPayment.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.operationalPayments.invalidate(), utils.portfolio.collections.invalidate(), utils.finance.center.invalidate()]); setNotice(isArabic ? "تم حذف الدفعة." : "Payment deleted."); setConfirmDelete(null); } });
  const createPeriod = trpc.portfolio.createCollectionPeriod.useMutation({ onSuccess: async () => { await utils.portfolio.collections.invalidate(); setNotice(isArabic ? "تم إنشاء استحقاق التحصيل." : "Collection period created."); setForm(null); } });
  const recordReceipt = trpc.portfolio.recordPayment.useMutation({ onSuccess: async () => { await Promise.all([utils.portfolio.collections.invalidate(), utils.finance.center.invalidate()]); setNotice(isArabic ? "تم تسجيل التحصيل." : "Receipt recorded."); setForm(null); } });
  const reverseReceipt = trpc.portfolio.reversePayment.useMutation({ onSuccess: async () => { await Promise.all([utils.portfolio.collections.invalidate(), utils.finance.center.invalidate(), utils.company.activity.invalidate()]); setNotice(isArabic ? "تم عكس التحصيل كسجل تعويضي." : "Receipt reversed as a compensating record."); setForm(null); setReversalEvent(null); } });
  const createMaintenance = trpc.legacy.createMaintenance.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.maintenance.invalidate(), utils.operations.center.invalidate()]); setNotice(isArabic ? "تم إنشاء طلب الصيانة." : "Maintenance request created."); setForm(null); } });
  const updateMaintenance = trpc.legacy.updateMaintenance.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.maintenance.invalidate(), utils.operations.center.invalidate()]); setNotice(isArabic ? "تم تحديث طلب الصيانة." : "Maintenance request updated."); setEditor(null); } });
  const deleteMaintenance = trpc.legacy.deleteMaintenance.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.maintenance.invalidate(), utils.operations.center.invalidate()]); setNotice(isArabic ? "تم حذف طلب الصيانة." : "Maintenance request deleted."); setConfirmDelete(null); } });
  const createWorkOrder = trpc.operations.createWorkOrder.useMutation({ onSuccess: async () => { await utils.operations.center.invalidate(); setNotice(isArabic ? "تم إنشاء أمر العمل." : "Work order created."); setForm(null); } });
  const updateWorkOrder = trpc.operations.updateWorkOrder.useMutation({ onSuccess: async () => { await utils.operations.center.invalidate(); setNotice(isArabic ? "تم تحديث أمر العمل." : "Work order updated."); setEditor(null); } });
  const createTenant = trpc.legacy.createTenant.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.tenants.invalidate(), utils.portfolio.leasingCenter.invalidate()]); setNotice(isArabic ? "تم إنشاء المستأجر." : "Tenant created."); setForm(null); } });
  const updateTenant = trpc.legacy.updateTenant.useMutation({ onSuccess: async () => { await utils.legacy.tenants.invalidate(); setNotice(isArabic ? "تم تحديث المستأجر." : "Tenant updated."); setEditor(null); } });
  const deleteTenant = trpc.legacy.deleteTenant.useMutation({ onSuccess: async () => { await utils.legacy.tenants.invalidate(); setNotice(isArabic ? "تم حذف المستأجر." : "Tenant deleted."); setConfirmDelete(null); } });
  const createContract = trpc.legacy.createContract.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.contracts.invalidate(), utils.portfolio.leasingCenter.invalidate()]); setNotice(isArabic ? "تم إنشاء العقد." : "Contract created."); setForm(null); } });
  const updateContract = trpc.legacy.updateContract.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.contracts.invalidate(), utils.portfolio.leasingCenter.invalidate()]); setNotice(isArabic ? "تم تحديث العقد." : "Contract updated."); setEditor(null); } });
  const deleteContract = trpc.legacy.deleteContract.useMutation({ onSuccess: async () => { await Promise.all([utils.legacy.contracts.invalidate(), utils.portfolio.leasingCenter.invalidate()]); setNotice(isArabic ? "تم حذف العقد." : "Contract deleted."); setConfirmDelete(null); } });

  const hierarchyData = asRecord(hierarchy);
  const portfolioRows = rows(hierarchyData.portfolios);
  const buildingRows = rows(hierarchyData.buildings);
  const unitRows = rows(hierarchyData.units);
  const leaseRows = rows(asRecord(leasing).leases);
  const collectionRows = rows(asRecord(collections).collections);
  const collectionEventRows = collectionRows.flatMap(collection => rows(collection.paymentEvents).map(event => ({ ...event, periodLabel: collection.periodLabel, leaseReference: collection.leaseReference, unitLabel: collection.unitLabel, tenantName: collection.tenantName })));
  const financeData = asRecord(finance);
  const operationData = asRecord(operations);
  const activityRows = rows(asRecord(activity).items);

  const sources = useMemo(() => ({
    portfolio: [{ label: "Portfolios", data: portfolioRows }, { label: "Buildings", data: buildingRows }, { label: "Units", data: unitRows }],
    collections: [{ label: "Collections ledger", data: collectionRows }, { label: "Collection payment events", data: collectionEventRows }, { label: "Payments", data: rows(payments) }, { label: "Recurring charges", data: rows(financeData.recurringCharges) }],
    "work-orders": [{ label: "Work orders", data: rows(operationData.workOrders) }, { label: "Maintenance", data: rows(maintenance) }],
    insights: [{ label: "Finance", data: rows(financeData.collections) }, { label: "Leasing", data: leaseRows }, { label: "Operations", data: rows(operationData.workOrders) }, { label: "Documents", data: rows(asRecord(documents).documents) }],
    leases: [{ label: "Leases", data: leaseRows }, { label: "Contracts", data: rows(contracts) }, { label: "Tenants", data: rows(tenants) }],
    "operating-log": [{ label: "Recent activity", data: activityRows }],
  }), [activityRows, collectionEventRows, collectionRows, contracts, documents, financeData.collections, financeData.recurringCharges, leaseRows, maintenance, operationData.workOrders, payments, portfolioRows, buildingRows, unitRows, tenants]);

  const filtered = (data: Row[]) => data.filter(row => {
    const searchable = JSON.stringify(row).toLocaleLowerCase();
    const hasQuery = !query.trim() || searchable.includes(query.trim().toLocaleLowerCase());
    const hasFilter = filter.value === "all" || filter.terms.some(term => searchable.includes(term.toLocaleLowerCase()));
    if (moduleId !== "operating-log") return hasQuery && hasFilter;
    const action = String(row.action ?? row.eventType ?? "").toLocaleLowerCase();
    const actor = String(row.actorName ?? row.actorEmail ?? row.actorUserId ?? "").toLocaleLowerCase();
    const dateRaw = row.createdAt ?? row.occurredAt ?? row.timestamp;
    const date = dateRaw ? new Date(dateRaw as string | number | Date) : null;
    const matchingType = activityType === "all" || action.includes(activityType);
    const matchingActor = !activityActor.trim() || actor.includes(activityActor.trim().toLocaleLowerCase());
    const matchingStart = !activityStart || (date && !Number.isNaN(date.getTime()) && date >= new Date(`${activityStart}T00:00:00`));
    const matchingEnd = !activityEnd || (date && !Number.isNaN(date.getTime()) && date <= new Date(`${activityEnd}T23:59:59`));
    return hasQuery && hasFilter && matchingType && matchingActor && Boolean(matchingStart) && Boolean(matchingEnd);
  });

  const toolbar = () => {
    if (moduleId === "portfolio") return <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={() => setForm("portfolio")}><Plus size={15} />{isArabic ? "محفظة" : "Portfolio"}</button><button className={buttonClass} onClick={() => setForm("building")}><Plus size={15} />{isArabic ? "مبنى" : "Building"}</button><button className={buttonClass} onClick={() => setForm("unit")}><Plus size={15} />{isArabic ? "وحدة" : "Unit"}</button></div>;
    if (moduleId === "collections") return <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={() => setForm("payment")}><Plus size={15} />{isArabic ? "دفعة" : "Payment"}</button><button className={buttonClass} onClick={() => setForm("collection-period")}><Plus size={15} />{isArabic ? "استحقاق" : "Due period"}</button><button className={buttonClass} onClick={() => setForm("receipt")}><Check size={15} />{isArabic ? "تسجيل تحصيل" : "Record receipt"}</button></div>;
    if (moduleId === "work-orders") return <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={() => setForm("work-order")}><Plus size={15} />{isArabic ? "أمر عمل" : "Work order"}</button><button className={buttonClass} onClick={() => setForm("maintenance")}><Plus size={15} />{isArabic ? "طلب صيانة" : "Maintenance"}</button></div>;
    if (moduleId === "leases") return <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={() => setForm("tenant")}><Plus size={15} />{isArabic ? "مستأجر" : "Tenant"}</button><button className={buttonClass} onClick={() => setForm("contract")}><Plus size={15} />{isArabic ? "عقد" : "Contract"}</button></div>;
    if (moduleId === "insights") return <div className="flex flex-wrap gap-2"><Link href="/workspace/collections" className={buttonClass}>{isArabic ? "تابع التحصيل" : "Review collections"}<ChevronRight size={15} /></Link><Link href="/workspace/work-orders" className={buttonClass}>{isArabic ? "تابع الأوامر" : "Review work"}<ChevronRight size={15} /></Link></div>;
    return <button className={buttonClass} onClick={() => { void utils.company.activity.invalidate(); setNotice(isArabic ? "تم تحديث السجل." : "Log refreshed."); }}><RefreshCw size={15} />{isArabic ? "تحديث السجل" : "Refresh log"}</button>;
  };

  const rowControls = (label: string, row: Row) => {
    const id = asNumber(row.id);
    if (!id) return null;
    if (label === "Collection payment events") {
      const canReverse = row.eventType === "payment" && row.isReversed !== true;
      return canReverse ? <div className="mt-3 flex flex-wrap gap-2"><button className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 hover:text-white" onClick={() => { setReversalEvent(row); setForm("payment-reversal"); }}><RefreshCw size={13} />{isArabic ? "عكس التحصيل" : "Reverse receipt"}</button></div> : null;
    }
    let kind: EditKind = null;
    if (label === "Units") kind = "unit";
    if (label === "Payments") kind = "payment";
    if (label === "Maintenance") kind = "maintenance";
    if (label === "Work orders") kind = "work-order";
    if (label === "Tenants") kind = "tenant";
    if (label === "Contracts") kind = "contract";
    if (!kind) return null;
    return <div className="mt-3 flex flex-wrap gap-2"><button className="inline-flex items-center gap-1 text-xs font-semibold text-[#e6c67d] hover:text-white" onClick={() => setEditor({ kind, row })}><Pencil size={13} />{isArabic ? "تعديل" : "Edit"}</button>{kind !== "work-order" && <button className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-rose-100" onClick={() => setConfirmDelete({ kind, id })}><Trash2 size={13} />{isArabic ? "حذف" : "Delete"}</button>}</div>;
  };

  const error = [createPortfolio, createBuilding, createUnit, updateUnitStatus, deleteUnit, createPayment, updatePayment, createPeriod, recordReceipt, reverseReceipt, createMaintenance, updateMaintenance, createWorkOrder, updateWorkOrder, createTenant, updateTenant, createContract, updateContract].find(mutation => mutation.error)?.error?.message;
  const busy = [createPortfolio, createBuilding, createUnit, updateUnitStatus, deleteUnit, createPayment, updatePayment, createPeriod, recordReceipt, reverseReceipt, createMaintenance, updateMaintenance, createWorkOrder, updateWorkOrder, createTenant, updateTenant, createContract, updateContract, deletePayment, deleteMaintenance, deleteTenant, deleteContract].some(mutation => mutation.isPending);

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    const optionalNumber = (key: string) => { const value = text(key); return value ? asNumber(value) : undefined; };
    const optionalId = (key: string) => { const value = asNumber(text(key)); return value > 0 ? value : undefined; };
    if (form === "portfolio") createPortfolio.mutate({ name: text("name"), description: text("description") || undefined });
    if (form === "building") createBuilding.mutate({ portfolioId: asNumber(text("portfolioId")), name: text("name"), address: text("address") || undefined });
    if (form === "unit") createUnit.mutate({ buildingId: asNumber(text("buildingId")), label: text("label"), floor: text("floor") || undefined, bedrooms: optionalNumber("bedrooms"), areaSqm: optionalNumber("areaSqm"), status: (text("status") || "vacant") as "vacant" | "occupied" | "reserved" | "maintenance", askingRentIls: optionalNumber("askingRentIls") });
    if (form === "payment") createPayment.mutate({ tenantId: optionalId("tenantId"), contractId: optionalId("contractId"), amountIls: asNumber(text("amountIls")), method: (text("method") || "bank") as "cash" | "bank" | "card" | "transfer", status: (text("status") || "pending") as "paid" | "pending" | "overdue", paidAt: text("paidAt") ? new Date(text("paidAt")) : undefined, notes: text("notes") || undefined });
    if (form === "collection-period") createPeriod.mutate({ leaseId: asNumber(text("leaseId")), periodLabel: text("periodLabel"), dueAt: new Date(text("dueAt")), amountDueIls: asNumber(text("amountIls")), notes: text("notes") || null });
    if (form === "receipt") recordReceipt.mutate({ collectionId: asNumber(text("collectionId")), amountIls: asNumber(text("amountIls")), paymentMethod: (text("method") || "bank") as "cash" | "bank" | "card" | "transfer" | "other", receivedAt: text("paidAt") ? new Date(text("paidAt")) : undefined, notes: text("notes") || undefined, idempotencyKey: crypto.randomUUID() });
    if (form === "payment-reversal" && reversalEvent) reverseReceipt.mutate({ paymentEventId: asNumber(reversalEvent.id), reason: text("reason"), reversedAt: text("reversedAt") ? new Date(text("reversedAt")) : undefined, idempotencyKey: crypto.randomUUID() });
    if (form === "maintenance") createMaintenance.mutate({ title: text("title"), description: text("description") || undefined, priority: (text("priority") || "medium") as "low" | "medium" | "high" | "urgent", status: (text("status") || "open") as "open" | "in_progress" | "completed" | "cancelled", scheduledAt: text("scheduledAt") ? new Date(text("scheduledAt")) : undefined, costIls: optionalNumber("costIls") });
    if (form === "work-order") createWorkOrder.mutate({ buildingId: optionalId("buildingId"), unitId: optionalId("unitId"), tenantId: optionalId("tenantId"), vendorId: optionalId("vendorId"), title: text("title"), priority: (text("priority") || "medium") as "low" | "medium" | "high" | "urgent", slaHours: optionalNumber("slaHours") });
    if (form === "tenant") createTenant.mutate({ name: text("name"), email: text("email") || undefined, phone: text("phone") || undefined, status: (text("status") || "active") as "active" | "late" | "ended", notes: text("notes") || undefined });
    if (form === "contract") createContract.mutate({ title: text("title"), tenantId: optionalId("tenantId"), startAt: new Date(text("startAt")), endAt: new Date(text("endAt")), rentAmountIls: optionalNumber("rentAmountIls"), status: (text("status") || "active") as "active" | "expired" | "terminated", notes: text("notes") || undefined });
  }

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    const optionalId = (key: string) => { const value = asNumber(text(key)); return value > 0 ? value : undefined; };
    const optionalNumber = (key: string) => { const value = text(key); return value ? asNumber(value) : undefined; };
    const id = asNumber(editor.row.id);
    if (editor.kind === "unit") updateUnitStatus.mutate({ unitId: id, status: text("status") as "vacant" | "occupied" | "reserved" | "maintenance", askingRentIls: optionalNumber("askingRentIls") });
    if (editor.kind === "payment") updatePayment.mutate({ id, tenantId: optionalId("tenantId"), contractId: optionalId("contractId"), amountIls: asNumber(text("amountIls")), method: text("method") as "cash" | "bank" | "card" | "transfer", status: text("status") as "paid" | "pending" | "overdue", paidAt: text("paidAt") ? new Date(text("paidAt")) : null, notes: text("notes") || undefined });
    if (editor.kind === "maintenance") updateMaintenance.mutate({ id, title: text("title"), description: text("description") || undefined, priority: text("priority") as "low" | "medium" | "high" | "urgent", status: text("status") as "open" | "in_progress" | "completed" | "cancelled", scheduledAt: text("scheduledAt") ? new Date(text("scheduledAt")) : null, costIls: optionalNumber("costIls") });
    if (editor.kind === "work-order") updateWorkOrder.mutate({ workOrderId: id, status: text("status") as "open" | "assigned" | "in_progress" | "resolved" | "closed", vendorId: text("vendorId") ? optionalId("vendorId") : null, estimatedCostIls: text("estimatedCostIls") ? asNumber(text("estimatedCostIls")) : null, actualCostIls: text("actualCostIls") ? asNumber(text("actualCostIls")) : null });
    if (editor.kind === "tenant") updateTenant.mutate({ id, name: text("name"), email: text("email") || undefined, phone: text("phone") || undefined, status: text("status") as "active" | "late" | "ended", notes: text("notes") || undefined });
    if (editor.kind === "contract") updateContract.mutate({ id, title: text("title"), tenantId: optionalId("tenantId"), startAt: new Date(text("startAt")), endAt: new Date(text("endAt")), rentAmountIls: optionalNumber("rentAmountIls"), status: text("status") as "active" | "expired" | "terminated", notes: text("notes") || undefined });
  }

  const selectOptions = (data: Row[], labelKey: string) => data.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row[labelKey] ?? row.name ?? row.label ?? `#${row.id}`)}</option>);
  const modalOpen = Boolean(form || editor || confirmDelete);

  return <>
    <section className="mt-8 border-y border-[#d8b26b]/25 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#d8b26b]">{isArabic ? "أدوات تنفيذية" : "Operational tools"}</p><p className="mt-2 text-sm text-white/55">{isArabic ? "أضف أو عدّل السجلات مباشرة ضمن صلاحيات شركتك." : "Create and update records directly within your company permissions."}</p></div>{toolbar()}</div>
      {notice && <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={15} /></button></div>}
      {error && <div className="mt-5 rounded-xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div>}
      {moduleId === "insights" && <div className="mt-6 grid gap-4 md:grid-cols-3"><article className="border-s border-white/10 ps-4"><p className="text-sm font-semibold">{isArabic ? "إشغال وتأجير" : "Occupancy & leasing"}</p><p className="mt-2 text-sm text-white/52">{isArabic ? `${leaseRows.length} عقد/إشارة تأجير متاحة للمراجعة.` : `${leaseRows.length} lease records available for review.`}</p><Link href="/workspace/leases" className="mt-3 inline-flex text-xs font-semibold text-[#e6c67d]">{isArabic ? "فتح العقود" : "Open leases"}</Link></article><article className="border-s border-white/10 ps-4"><p className="text-sm font-semibold">{isArabic ? "التحصيل" : "Collections"}</p><p className="mt-2 text-sm text-white/52">{isArabic ? `${collectionRows.length} سجل تحصيل مصدره البيانات الحالية.` : `${collectionRows.length} collection records from current data.`}</p><Link href="/workspace/collections" className="mt-3 inline-flex text-xs font-semibold text-[#e6c67d]">{isArabic ? "فتح التحصيل" : "Open collections"}</Link></article><article className="border-s border-white/10 ps-4"><p className="text-sm font-semibold">{isArabic ? "التشغيل" : "Operations"}</p><p className="mt-2 text-sm text-white/52">{isArabic ? `${rows(operationData.workOrders).length} أمر عمل مرئي وفق الصلاحيات.` : `${rows(operationData.workOrders).length} work orders visible under your permissions.`}</p><Link href="/workspace/work-orders" className="mt-3 inline-flex text-xs font-semibold text-[#e6c67d]">{isArabic ? "فتح الأوامر" : "Open work orders"}</Link></article></div>}
      {moduleId === "operating-log" && <div className="mt-5"><p className="text-sm leading-6 text-white/52">{isArabic ? "تعمل التصفية والبحث على النشاطات المصرح بها الحالية؛ لا يعرض السجل أي بيانات من شركات أخرى." : "Search and filters apply to currently authorized activity only; no cross-company data is shown."}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Field label={isArabic ? "نوع الحدث" : "Event type"}><select value={activityType} onChange={event => setActivityType(event.target.value)} className={selectClass}><option value="all">{isArabic ? "كل الأحداث" : "All events"}</option><option value="created">Created</option><option value="updated">Updated</option><option value="deleted">Deleted</option><option value="payment">Payment</option><option value="lease">Lease</option></select></Field><Field label={isArabic ? "المنفذ" : "Actor"}><input value={activityActor} onChange={event => setActivityActor(event.target.value)} className={inputClass} placeholder={isArabic ? "اسم أو معرّف" : "Name or ID"} /></Field><Field label={isArabic ? "من تاريخ" : "From date"}><input value={activityStart} onChange={event => setActivityStart(event.target.value)} type="date" className={inputClass} /></Field><Field label={isArabic ? "إلى تاريخ" : "To date"}><input value={activityEnd} onChange={event => setActivityEnd(event.target.value)} type="date" className={inputClass} /></Field></div></div>}
    </section>

    <div className="mt-8 grid gap-5 xl:grid-cols-2">{sources[moduleId].map(source => { const filteredRows = filtered(source.data).slice(0, 24); return <section key={source.label} className="border-y border-white/10 py-5"><SectionTitle title={source.label} count={filteredRows.length} />{filteredRows.length ? <div className="mt-4 divide-y divide-white/8">{filteredRows.map((row, index) => <div key={String(row.id ?? row.name ?? index)} className="py-3"><div className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(row).filter(([, value]) => typeof value !== "object" || value instanceof Date).slice(0, 6).map(([key, value]) => <div key={key} className="min-w-0"><span className="block text-[11px] uppercase tracking-[.1em] text-white/35">{key.replace(/([A-Z])/g, " $1")}</span><span className="block truncate text-white/80">{display(value)}</span></div>)}</div>{rowControls(source.label, row)}</div>)}</div> : <p className="mt-5 text-sm leading-6 text-white/45">{isArabic ? "لا توجد سجلات مطابقة حالياً. استخدم أداة الإضافة في أعلى الصفحة لإنشاء سجل جديد." : "No matching records. Use the add controls above to create a new record."}</p>}</section>; })}</div>

    {modalOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#020a11]/80 px-4 py-6 backdrop-blur-sm"><div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0b2131] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold text-[#f3d98d]">{confirmDelete ? (isArabic ? "تأكيد الحذف" : "Confirm deletion") : editor ? (isArabic ? "تعديل السجل" : "Edit record") : form === "payment-reversal" ? (isArabic ? "عكس التحصيل" : "Reverse receipt") : (isArabic ? "إضافة سجل" : "Add record")}</h2><button className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" onClick={() => { setForm(null); setEditor(null); setConfirmDelete(null); setReversalEvent(null); }}><X size={18} /></button></div>
      {confirmDelete ? <div className="mt-5"><p className="text-sm leading-6 text-white/65">{isArabic ? "سيتم حذف هذا السجل نهائياً من بيانات الشركة. لا يمكن التراجع عن الإجراء." : "This record will be permanently deleted from the company data. This action cannot be undone."}</p><div className="mt-6 flex justify-end gap-3"><button className={buttonClass} onClick={() => setConfirmDelete(null)}>{isArabic ? "إلغاء" : "Cancel"}</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-rose-400 px-4 py-2 text-xs font-semibold text-[#071a27] disabled:opacity-50" onClick={() => { if (confirmDelete.kind === "unit") deleteUnit.mutate({ unitId: confirmDelete.id }); if (confirmDelete.kind === "payment") deletePayment.mutate({ id: confirmDelete.id }); if (confirmDelete.kind === "maintenance") deleteMaintenance.mutate({ id: confirmDelete.id }); if (confirmDelete.kind === "tenant") deleteTenant.mutate({ id: confirmDelete.id }); if (confirmDelete.kind === "contract") deleteContract.mutate({ id: confirmDelete.id }); }}><Trash2 size={14} />{isArabic ? "حذف السجل" : "Delete record"}</button></div></div> : <form className="mt-5 space-y-4" onSubmit={editor ? submitEdit : submitCreate}>
        {!editor && form === "portfolio" && <><Field label={isArabic ? "اسم المحفظة" : "Portfolio name"}><input required name="name" className={inputClass} /></Field><Field label={isArabic ? "وصف اختياري" : "Optional description"}><input name="description" className={inputClass} /></Field></>}
        {!editor && form === "building" && <><Field label={isArabic ? "المحفظة" : "Portfolio"}><select required name="portfolioId" className={selectClass}><option value="">{isArabic ? "اختر المحفظة" : "Select portfolio"}</option>{selectOptions(portfolioRows, "name")}</select></Field><Field label={isArabic ? "اسم المبنى" : "Building name"}><input required name="name" className={inputClass} /></Field><Field label={isArabic ? "العنوان" : "Address"}><input name="address" className={inputClass} /></Field></>}
        {!editor && form === "unit" && <><Field label={isArabic ? "المبنى" : "Building"}><select required name="buildingId" className={selectClass}><option value="">{isArabic ? "اختر المبنى" : "Select building"}</option>{selectOptions(buildingRows, "name")}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "رقم أو اسم الوحدة" : "Unit label"}><input required name="label" className={inputClass} /></Field><Field label={isArabic ? "الطابق" : "Floor"}><input name="floor" className={inputClass} /></Field><Field label={isArabic ? "غرف" : "Bedrooms"}><input name="bedrooms" type="number" min="0" className={inputClass} /></Field><Field label={isArabic ? "المساحة م²" : "Area sqm"}><input name="areaSqm" type="number" min="0" className={inputClass} /></Field><Field label={isArabic ? "الحالة" : "Status"}><select name="status" className={selectClass}><option value="vacant">Vacant</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option><option value="maintenance">Maintenance</option></select></Field><Field label={isArabic ? "إيجار مطلوب EGP" : "Asking rent EGP"}><input name="askingRentIls" type="number" min="0" className={inputClass} /></Field></div></>}
        {!editor && form === "collection-period" && <><Field label={isArabic ? "العقد الإيجاري" : "Lease"}><select required name="leaseId" className={selectClass}><option value="">{isArabic ? "اختر العقد" : "Select lease"}</option>{selectOptions(leaseRows, "reference")}</select></Field><div className="grid gap-4 sm:grid-cols-3"><Field label={isArabic ? "وصف الاستحقاق" : "Period label"}><input required name="periodLabel" className={inputClass} /></Field><Field label={isArabic ? "تاريخ الاستحقاق" : "Due date"}><input required name="dueAt" type="date" className={inputClass} /></Field><Field label={isArabic ? "المبلغ EGP" : "Amount EGP"}><input required name="amountIls" min="1" type="number" className={inputClass} /></Field></div><Field label={isArabic ? "ملاحظات" : "Notes"}><input name="notes" className={inputClass} /></Field></>}
        {!editor && form === "receipt" && <><Field label={isArabic ? "سجل التحصيل" : "Collection record"}><select required name="collectionId" className={selectClass}><option value="">{isArabic ? "اختر السجل" : "Select record"}</option>{selectOptions(collectionRows, "periodLabel")}</select></Field><div className="grid gap-4 sm:grid-cols-3"><Field label={isArabic ? "المبلغ EGP" : "Amount EGP"}><input required name="amountIls" min="1" type="number" className={inputClass} /></Field><Field label={isArabic ? "الطريقة" : "Method"}><select name="method" className={selectClass}><option value="bank">Bank</option><option value="cash">Cash</option><option value="card">Card</option><option value="transfer">Transfer</option><option value="other">Other</option></select></Field><Field label={isArabic ? "تاريخ الاستلام" : "Received date"}><input name="paidAt" type="date" className={inputClass} /></Field></div><Field label={isArabic ? "ملاحظات" : "Notes"}><input name="notes" className={inputClass} /></Field></>}
        {!editor && form === "payment-reversal" && reversalEvent && <PaymentReversalForm isArabic={isArabic} event={reversalEvent} />}
        {!editor && form === "payment" && <PaymentForm tenants={rows(tenants)} contracts={rows(contracts)} isArabic={isArabic} />}
        {!editor && form === "maintenance" && <MaintenanceForm isArabic={isArabic} />}
        {!editor && form === "work-order" && <WorkOrderForm buildings={buildingRows} units={unitRows} tenants={rows(tenants)} vendors={rows(operationData.vendors)} isArabic={isArabic} />}
        {!editor && form === "tenant" && <TenantForm isArabic={isArabic} />}
        {!editor && form === "contract" && <ContractForm tenants={rows(tenants)} isArabic={isArabic} />}
        {editor?.kind === "payment" && <PaymentForm tenants={rows(tenants)} contracts={rows(contracts)} isArabic={isArabic} row={editor.row} />}
        {editor?.kind === "unit" && <UnitStatusForm isArabic={isArabic} row={editor.row} />}
        {editor?.kind === "maintenance" && <MaintenanceForm isArabic={isArabic} row={editor.row} />}
        {editor?.kind === "work-order" && <WorkOrderEditForm isArabic={isArabic} row={editor.row} vendors={rows(operationData.vendors)} />}
        {editor?.kind === "tenant" && <TenantForm isArabic={isArabic} row={editor.row} />}
        {editor?.kind === "contract" && <ContractForm tenants={rows(tenants)} isArabic={isArabic} row={editor.row} />}
        <div className="flex justify-end gap-3 border-t border-white/10 pt-5"><button type="button" className={buttonClass} onClick={() => { setForm(null); setEditor(null); setReversalEvent(null); }}>{isArabic ? "إلغاء" : "Cancel"}</button><button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#d8b26b] px-4 py-2 text-xs font-semibold text-[#071a27] disabled:opacity-50"><Save size={14} />{busy ? (isArabic ? "جارٍ الحفظ" : "Saving") : form === "payment-reversal" ? (isArabic ? "تأكيد العكس" : "Confirm reversal") : (isArabic ? "حفظ" : "Save")}</button></div>
      </form>}</div></div>}
  </>;
}

function UnitStatusForm({ isArabic, row }: { isArabic: boolean; row: Row }) {
  return <div className="grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "حالة الإشغال" : "Occupancy status"}><select name="status" defaultValue={String(row.status ?? "vacant")} className={selectClass}><option value="vacant">Vacant</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option><option value="maintenance">Maintenance</option></select></Field><Field label={isArabic ? "الإيجار المطلوب EGP" : "Asking rent EGP"}><input name="askingRentIls" type="number" min="0" defaultValue={row.askingRentIls ? asNumber(row.askingRentIls) : ""} className={inputClass} /></Field></div>;
}

function PaymentForm({ tenants, contracts, isArabic, row }: { tenants: Row[]; contracts: Row[]; isArabic: boolean; row?: Row }) {
  return <><div className="grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "المستأجر" : "Tenant"}><select name="tenantId" defaultValue={String(row?.tenantId ?? "")} className={selectClass}><option value="">{isArabic ? "غير مرتبط" : "Not linked"}</option>{tenants.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "العقد" : "Contract"}><select name="contractId" defaultValue={String(row?.contractId ?? "")} className={selectClass}><option value="">{isArabic ? "غير مرتبط" : "Not linked"}</option>{contracts.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.title ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "المبلغ EGP" : "Amount EGP"}><input required name="amountIls" type="number" min="1" defaultValue={row ? asNumber(row.amountIls) : ""} className={inputClass} /></Field><Field label={isArabic ? "الطريقة" : "Method"}><select name="method" defaultValue={String(row?.method ?? "bank")} className={selectClass}><option value="bank">Bank</option><option value="cash">Cash</option><option value="card">Card</option><option value="transfer">Transfer</option></select></Field><Field label={isArabic ? "الحالة" : "Status"}><select name="status" defaultValue={String(row?.status ?? "pending")} className={selectClass}><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></Field><Field label={isArabic ? "تاريخ الدفع" : "Payment date"}><input name="paidAt" type="date" defaultValue={dateValue(row?.paidAt)} className={inputClass} /></Field></div><Field label={isArabic ? "ملاحظات" : "Notes"}><input name="notes" defaultValue={String(row?.notes ?? "")} className={inputClass} /></Field></>;
}

function PaymentReversalForm({ isArabic, event }: { isArabic: boolean; event: Row }) {
  return <><div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50"><p className="font-semibold">{isArabic ? "سيُسجَّل حدث عكس تعويضي؛ لن يُحذف سند التحصيل الأصلي." : "A compensating reversal event will be recorded; the original receipt will not be deleted."}</p><p className="mt-1 text-amber-50/75">{isArabic ? `المبلغ: EGP${asNumber(event.amountIls).toLocaleString()} · المرجع #${event.id}` : `Amount: EGP${asNumber(event.amountIls).toLocaleString()} · Reference #${event.id}`}</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "سبب العكس" : "Reversal reason"}><input required name="reason" minLength={3} maxLength={500} className={inputClass} placeholder={isArabic ? "مثال: إلغاء تحويل مكرر" : "Example: duplicate transfer voided"} /></Field><Field label={isArabic ? "تاريخ العكس" : "Reversal date"}><input name="reversedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></Field></div></>;
}

function MaintenanceForm({ isArabic, row }: { isArabic: boolean; row?: Row }) {
  return <><Field label={isArabic ? "العنوان" : "Title"}><input required name="title" defaultValue={String(row?.title ?? "")} className={inputClass} /></Field><Field label={isArabic ? "الوصف" : "Description"}><input name="description" defaultValue={String(row?.description ?? "")} className={inputClass} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label={isArabic ? "الأولوية" : "Priority"}><select name="priority" defaultValue={String(row?.priority ?? "medium")} className={selectClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field><Field label={isArabic ? "الحالة" : "Status"}><select name="status" defaultValue={String(row?.status ?? "open")} className={selectClass}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field><Field label={isArabic ? "التكلفة EGP" : "Cost EGP"}><input name="costIls" type="number" min="0" defaultValue={row ? asNumber(row.costIls) : ""} className={inputClass} /></Field></div><Field label={isArabic ? "موعد التنفيذ" : "Scheduled date"}><input name="scheduledAt" type="date" defaultValue={dateValue(row?.scheduledAt)} className={inputClass} /></Field></>;
}

function WorkOrderForm({ buildings, units, tenants, vendors, isArabic }: { buildings: Row[]; units: Row[]; tenants: Row[]; vendors: Row[]; isArabic: boolean }) {
  return <><Field label={isArabic ? "العنوان" : "Title"}><input required name="title" className={inputClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "المبنى" : "Building"}><select name="buildingId" className={selectClass}><option value="">{isArabic ? "غير مرتبط" : "Not linked"}</option>{buildings.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "الوحدة" : "Unit"}><select name="unitId" className={selectClass}><option value="">{isArabic ? "غير مرتبط" : "Not linked"}</option>{units.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.label ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "المستأجر" : "Tenant"}><select name="tenantId" className={selectClass}><option value="">{isArabic ? "غير مرتبط" : "Not linked"}</option>{tenants.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "المورد" : "Vendor"}><select name="vendorId" className={selectClass}><option value="">{isArabic ? "تعيين لاحقاً" : "Assign later"}</option>{vendors.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "الأولوية" : "Priority"}><select name="priority" className={selectClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field><Field label={isArabic ? "مهلة الخدمة بالساعات" : "SLA hours"}><input name="slaHours" type="number" min="1" max="720" className={inputClass} /></Field></div></>;
}

function WorkOrderEditForm({ isArabic, row, vendors }: { isArabic: boolean; row: Row; vendors: Row[] }) {
  return <div className="grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "الحالة" : "Status"}><select name="status" defaultValue={String(row.status ?? "open")} className={selectClass}><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></Field><Field label={isArabic ? "المورد" : "Vendor"}><select name="vendorId" defaultValue={String(row.vendorId ?? "")} className={selectClass}><option value="">{isArabic ? "إلغاء التعيين" : "Unassign"}</option>{vendors.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "التكلفة المتوقعة EGP" : "Estimated cost EGP"}><input name="estimatedCostIls" type="number" min="0" defaultValue={row.estimatedCostIls ? asNumber(row.estimatedCostIls) : ""} className={inputClass} /></Field><Field label={isArabic ? "التكلفة الفعلية EGP" : "Actual cost EGP"}><input name="actualCostIls" type="number" min="0" defaultValue={row.actualCostIls ? asNumber(row.actualCostIls) : ""} className={inputClass} /></Field></div>;
}

function TenantForm({ isArabic, row }: { isArabic: boolean; row?: Row }) {
  return <><div className="grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "الاسم" : "Name"}><input required name="name" defaultValue={String(row?.name ?? "")} className={inputClass} /></Field><Field label={isArabic ? "البريد الإلكتروني" : "Email"}><input name="email" type="email" defaultValue={String(row?.email ?? "")} className={inputClass} /></Field><Field label={isArabic ? "الهاتف" : "Phone"}><input name="phone" defaultValue={String(row?.phone ?? "")} className={inputClass} /></Field><Field label={isArabic ? "الحالة" : "Status"}><select name="status" defaultValue={String(row?.status ?? "active")} className={selectClass}><option value="active">Active</option><option value="late">Late</option><option value="ended">Ended</option></select></Field></div><Field label={isArabic ? "ملاحظات" : "Notes"}><input name="notes" defaultValue={String(row?.notes ?? "")} className={inputClass} /></Field></>;
}

function ContractForm({ tenants, isArabic, row }: { tenants: Row[]; isArabic: boolean; row?: Row }) {
  return <><Field label={isArabic ? "عنوان العقد" : "Contract title"}><input required name="title" defaultValue={String(row?.title ?? "")} className={inputClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={isArabic ? "المستأجر" : "Tenant"}><select name="tenantId" defaultValue={String(row?.tenantId ?? "")} className={selectClass}><option value="">{isArabic ? "غير مرتبط" : "Not linked"}</option>{tenants.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.id)}</option>)}</select></Field><Field label={isArabic ? "الحالة" : "Status"}><select name="status" defaultValue={String(row?.status ?? "active")} className={selectClass}><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option></select></Field><Field label={isArabic ? "تاريخ البدء" : "Start date"}><input required name="startAt" type="date" defaultValue={dateValue(row?.startAt)} className={inputClass} /></Field><Field label={isArabic ? "تاريخ الانتهاء" : "End date"}><input required name="endAt" type="date" defaultValue={dateValue(row?.endAt)} className={inputClass} /></Field><Field label={isArabic ? "الإيجار EGP" : "Rent EGP"}><input name="rentAmountIls" type="number" min="0" defaultValue={row ? asNumber(row.rentAmountIls) : ""} className={inputClass} /></Field></div><Field label={isArabic ? "ملاحظات" : "Notes"}><input name="notes" defaultValue={String(row?.notes ?? "")} className={inputClass} /></Field></>;
}
