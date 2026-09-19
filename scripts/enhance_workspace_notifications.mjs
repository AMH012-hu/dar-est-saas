import fs from "node:fs";

const path = "client/src/pages/Workspace.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace('import { useState } from "react";', 'import { useMemo, useState } from "react";');

const translationAdds = [
  ['account: "الحساب والاشتراك",', 'account: "الحساب والاشتراك",\n    notifications: "التنبيهات",\n    noNotifications: "لا توجد تنبيهات جديدة",\n    overdueTask: "مهمة متأخرة",\n    openMaintenance: "طلب صيانة مفتوح",\n    recentActivity: "نشاط حديث",\n    markRead: "تمت القراءة",\n    kpiHint: "بيانات محدثة من سجلات الشركة التشغيلية",'],
  ['account: "Account & subscription",', 'account: "Account & subscription",\n    notifications: "Notifications",\n    noNotifications: "No new notifications",\n    overdueTask: "Overdue task",\n    openMaintenance: "Open maintenance request",\n    recentActivity: "Recent activity",\n    markRead: "Mark as read",\n    kpiHint: "Updated from the company’s operational records",'],
  ['account: "חשבון ומנוי",', 'account: "חשבון ומנוי",\n    notifications: "התראות",\n    noNotifications: "אין התראות חדשות",\n    overdueTask: "משימה באיחור",\n    openMaintenance: "בקשת תחזוקה פתוחה",\n    recentActivity: "פעילות אחרונה",\n    markRead: "סומן כנקרא",\n    kpiHint: "נתונים מעודכנים מרשומות החברה",'],
  ['account: "Аккаунт и подписка",', 'account: "Аккаунт и подписка",\n    notifications: "Уведомления",\n    noNotifications: "Новых уведомлений нет",\n    overdueTask: "Просроченная задача",\n    openMaintenance: "Открытая заявка на обслуживание",\n    recentActivity: "Последняя активность",\n    markRead: "Прочитано",\n    kpiHint: "Обновлено по операционным данным компании",'],
  ['account: "Обліковий запис і підписка",', 'account: "Обліковий запис і підписка",\n    notifications: "Сповіщення",\n    noNotifications: "Нових сповіщень немає",\n    overdueTask: "Прострочене завдання",\n    openMaintenance: "Відкрита заявка на обслуговування",\n    recentActivity: "Остання активність",\n    markRead: "Позначено як прочитане",\n    kpiHint: "Оновлено з операційних даних компанії",'],
];
for (const [find, replace] of translationAdds) {
  if (!source.includes(find)) throw new Error(`Missing translation anchor: ${find}`);
  source = source.replace(find, replace);
}

source = source.replace(
  'const [mobileOpen, setMobileOpen] = useState(false);',
  'const [mobileOpen, setMobileOpen] = useState(false);\n  const [notificationsOpen, setNotificationsOpen] = useState(false);\n  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);'
);

source = source.replace(
  'const activity = trpc.company.activity.useQuery(\n    { page: 1, pageSize: 5 },\n    { enabled: Boolean(user && active && company.data?.company) }\n  );',
  'const activity = trpc.company.activity.useQuery(\n    { page: 1, pageSize: 5 },\n    {\n      enabled: Boolean(user && active && company.data?.company),\n      refetchInterval: 30000,\n      refetchOnWindowFocus: true,\n    }\n  );'
);

source = source.replace(
  'const tasks = trpc.resources.tasks.useQuery(undefined, {\n    enabled: Boolean(user && active && company.data?.company),\n  });',
  'const tasks = trpc.resources.tasks.useQuery(undefined, {\n    enabled: Boolean(user && active && company.data?.company),\n    refetchInterval: 30000,\n    refetchOnWindowFocus: true,\n  });'
);

source = source.replace(
  'const performanceData = [\n    { label: c.properties, value: totalProperties },\n    { label: c.clients, value: clientItems.length },\n    { label: c.tasks, value: taskItems.length },\n    { label: c.tenants, value: tenantItems.length },\n    { label: c.contracts, value: contractItems.length },\n  ];',
  'const performanceData = [\n    { label: c.properties, value: totalProperties },\n    { label: c.clients, value: clientItems.length },\n    { label: c.tasks, value: taskItems.length },\n    { label: c.tenants, value: tenantItems.length },\n    { label: c.contracts, value: contractItems.length },\n    { label: c.maintenance, value: maintenanceItems.length },\n    { label: c.payments, value: operationalPaymentItems.length },\n  ];\n  const overdueTasks = taskItems.filter(item => {\n    const dueAt = item.dueAt ? new Date(String(item.dueAt)).getTime() : 0;\n    return dueAt > 0 && dueAt < Date.now() && String(item.status) !== "done";\n  });\n  const notifications = [\n    ...overdueTasks.slice(0, 5).map(item => ({\n      id: `task-${String(item.id)}`,\n      label: c.overdueTask,\n      detail: String(item.title ?? c.tasks),\n      tone: "rose",\n    })),\n    ...(openMaintenance > 0\n      ? [{ id: "maintenance-open", label: c.openMaintenance, detail: `${openMaintenance}`, tone: "amber" }]\n      : []),\n    ...((activity.data?.items ?? []).slice(0, 3).map(item => ({\n      id: `activity-${String(item.activity.id)}`,\n      label: c.recentActivity,\n      detail: String(item.activity.action),\n      tone: "gold",\n    }))),\n  ].filter(item => !dismissedNotificationIds.includes(item.id));'
);

source = source.replace(
  '              <button\n                className="rounded-2xl border border-white/10 bg-white/[.035] p-3 text-white/60"\n                aria-label="Notifications"\n              >\n                <Bell size={18} />\n              </button>',
  '              <div className="relative">\n                <button\n                  onClick={() => setNotificationsOpen(value => !value)}\n                  className="relative rounded-2xl border border-white/10 bg-white/[.035] p-3 text-white/60 transition hover:-translate-y-0.5 hover:border-[#d8b26b]/40 hover:text-[#e6c67d]"\n                  aria-label={c.notifications}\n                  aria-expanded={notificationsOpen}\n                >\n                  <Bell size={18} />\n                  {notifications.length > 0 && (\n                    <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-bold text-[#071725]">{notifications.length}</span>\n                  )}\n                </button>\n                {notificationsOpen && (\n                  <div className="absolute end-0 top-14 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#092437]/95 p-3 shadow-2xl backdrop-blur-xl">\n                    <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">\n                      <p className="text-sm font-semibold">{c.notifications}</p>\n                      <span className="text-xs text-white/40">{notifications.length}</span>\n                    </div>\n                    <div className="max-h-72 space-y-2 overflow-y-auto pt-2">\n                      {notifications.map(item => (\n                        <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3">\n                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.tone === "rose" ? "bg-rose-300" : item.tone === "amber" ? "bg-amber-300" : "bg-[#e6c67d]"}`} />\n                          <div className="min-w-0 flex-1">\n                            <p className="text-xs font-semibold text-white/80">{item.label}</p>\n                            <p className="mt-1 truncate text-xs text-white/45">{item.detail}</p>\n                          </div>\n                          <button\n                            onClick={() => setDismissedNotificationIds(ids => [...ids, item.id])}\n                            className="shrink-0 text-[10px] text-[#e6c67d] hover:text-white"\n                          >\n                            {c.markRead}\n                          </button>\n                        </div>\n                      ))}\n                      {notifications.length === 0 && <p className="px-2 py-5 text-center text-xs text-white/40">{c.noNotifications}</p>}\n                    </div>\n                  </div>\n                )}\n              </div>'
);

source = source.replace(
  '                className="border-b border-white/10 bg-white/[.035] px-5 py-5 first:rounded-s-2xl last:rounded-e-2xl"',
  '                title={c.kpiHint}\n                className="group border-b border-white/10 bg-white/[.035] px-5 py-5 transition duration-200 hover:-translate-y-1 hover:bg-white/[.07] hover:border-[#d8b26b]/35 focus-within:-translate-y-1 first:rounded-s-2xl last:rounded-e-2xl"'
);
source = source.replace(
  '                  <span className="text-xs">{label}</span>',
  '                  <span className="text-xs">{label}</span>\n                  <span className="pointer-events-none absolute mt-16 hidden rounded-lg border border-white/10 bg-[#092437] px-2 py-1 text-[10px] text-white/65 shadow-xl group-hover:block">{c.kpiHint}</span>'
);

fs.writeFileSync(path, source);
console.log("Workspace enhanced");
