import fs from "node:fs";

const path = "client/src/pages/Workspace.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  '  CircleDollarSign,\n',
  '  CircleDollarSign,\n  Download,\n  FileDown,\n'
);
source = source.replace(
  'import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";\n',
  'import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";\nimport { jsPDF } from "jspdf";\n'
);

const translationAdds = [
  ['kpiHint: "بيانات محدثة من سجلات الشركة التشغيلية",', 'kpiHint: "بيانات محدثة من سجلات الشركة التشغيلية",\n    period: "الفترة",\n    currentPeriod: "الفترة الحالية",\n    previousPeriod: "الفترة السابقة",\n    days7: "7 أيام",\n    days30: "30 يوماً",\n    days90: "90 يوماً",\n    year1: "12 شهراً",\n    markAllRead: "تحديد الكل كمقروء",\n    priority: "الأهمية",\n    allPriorities: "كل التنبيهات",\n    highPriority: "عالية",\n    mediumPriority: "متوسطة",\n    lowPriority: "منخفضة",\n    exportCsv: "تصدير CSV",\n    exportPdf: "تصدير PDF",\n    compare: "مقارنة الأداء",'],
  ['kpiHint: "Updated from the company’s operational records",', 'kpiHint: "Updated from the company’s operational records",\n    period: "Period",\n    currentPeriod: "Current period",\n    previousPeriod: "Previous period",\n    days7: "7 days",\n    days30: "30 days",\n    days90: "90 days",\n    year1: "12 months",\n    markAllRead: "Mark all as read",\n    priority: "Priority",\n    allPriorities: "All alerts",\n    highPriority: "High",\n    mediumPriority: "Medium",\n    lowPriority: "Low",\n    exportCsv: "Export CSV",\n    exportPdf: "Export PDF",\n    compare: "Performance comparison",'],
  ['kpiHint: "נתונים מעודכנים מרשומות החברה",', 'kpiHint: "נתונים מעודכנים מרשומות החברה",\n    period: "תקופה",\n    currentPeriod: "התקופה הנוכחית",\n    previousPeriod: "התקופה הקודמת",\n    days7: "7 ימים",\n    days30: "90 ימים",\n    days90: "90 ימים",\n    year1: "12 חודשים",\n    markAllRead: "סמן הכל כנקרא",\n    priority: "חשיבות",\n    allPriorities: "כל ההתראות",\n    highPriority: "גבוהה",\n    mediumPriority: "בינונית",\n    lowPriority: "נמוכה",\n    exportCsv: "ייצוא CSV",\n    exportPdf: "ייצוא PDF",\n    compare: "השוואת ביצועים",'],
  ['kpiHint: "Обновлено по операционным данным компании",', 'kpiHint: "Обновлено по операционным данным компании",\n    period: "Период",\n    currentPeriod: "Текущий период",\n    previousPeriod: "Предыдущий период",\n    days7: "7 дней",\n    days30: "30 дней",\n    days90: "90 дней",\n    year1: "12 месяцев",\n    markAllRead: "Отметить всё прочитанным",\n    priority: "Важность",\n    allPriorities: "Все уведомления",\n    highPriority: "Высокая",\n    mediumPriority: "Средняя",\n    lowPriority: "Низкая",\n    exportCsv: "Экспорт CSV",\n    exportPdf: "Экспорт PDF",\n    compare: "Сравнение показателей",'],
  ['kpiHint: "Оновлено з операційних даних компанії",', 'kpiHint: "Оновлено з операційних даних компанії",\n    period: "Період",\n    currentPeriod: "Поточний період",\n    previousPeriod: "Попередній період",\n    days7: "7 днів",\n    days30: "30 днів",\n    days90: "90 днів",\n    year1: "12 місяців",\n    markAllRead: "Позначити все як прочитане",\n    priority: "Важливість",\n    allPriorities: "Усі сповіщення",\n    highPriority: "Висока",\n    mediumPriority: "Середня",\n    lowPriority: "Низька",\n    exportCsv: "Експорт CSV",\n    exportPdf: "Експорт PDF",\n    compare: "Порівняння показників",'],
];
for (const [find, replace] of translationAdds) {
  if (!source.includes(find)) throw new Error(`Missing translation anchor: ${find}`);
  source = source.replace(find, replace);
}

source = source.replace(
  '  const [notificationsOpen, setNotificationsOpen] = useState(false);',
  '  const [notificationsOpen, setNotificationsOpen] = useState(false);\n  const [notificationPriority, setNotificationPriority] = useState<"all" | "high" | "medium" | "low">("all");\n  const [performancePeriod, setPerformancePeriod] = useState<7 | 30 | 90 | 365>(30);'
);

const oldPerfStart = source.indexOf('  const performanceData = [');
const oldPerfEnd = source.indexOf('  const sidebar = (', oldPerfStart);
if (oldPerfStart < 0 || oldPerfEnd < 0) throw new Error("Performance block not found");
const newPerf = `  const periodLabel = performancePeriod === 7 ? c.days7 : performancePeriod === 30 ? c.days30 : performancePeriod === 90 ? c.days90 : c.year1;\n  const getItemDate = (item: Record<string, unknown>) => {\n    const value = item.createdAt ?? item.updatedAt ?? item.dueAt;\n    const date = value ? new Date(String(value)).getTime() : 0;\n    return Number.isFinite(date) ? date : 0;\n  };\n  const countInWindow = (items: Array<Record<string, unknown>>, start: number, end: number) =>\n    items.filter(item => {\n      const timestamp = getItemDate(item);\n      return timestamp >= start && timestamp < end;\n    }).length;\n  const now = Date.now();\n  const currentStart = now - performancePeriod * 24 * 60 * 60 * 1000;\n  const previousStart = currentStart - performancePeriod * 24 * 60 * 60 * 1000;\n  const performanceRows = [\n    { label: c.properties, items: propertyItems },\n    { label: c.clients, items: clientItems },\n    { label: c.tasks, items: taskItems },\n    { label: c.tenants, items: tenantItems },\n    { label: c.contracts, items: contractItems },\n    { label: c.maintenance, items: maintenanceItems },\n    { label: c.payments, items: operationalPaymentItems },\n  ];\n  const performanceData = performanceRows.map(row => ({\n    label: row.label,\n    current: countInWindow(row.items, currentStart, now),\n    previous: countInWindow(row.items, previousStart, currentStart),\n    value: countInWindow(row.items, currentStart, now),\n  }));\n  const exportPerformanceCsv = () => {\n    const rows = [[c.reports, c.currentPeriod, c.previousPeriod], ...performanceData.map(row => [row.label, row.current, row.previous])];\n    const csv = rows.map(row => row.map(value => \\\"\\\"\\\"\\\" + String(value).replaceAll(\\\"\\\"\\\"\\\", \\\"\\\"\\\"\\\"\\\") + \\\"\\\"\\\"\\\"\\\").join(\\\",\\\"));\n    const blob = new Blob([\\\"\\\\uFEFF\\\" + csv.join(\\\"\\\\n\\\")], { type: \\\"text/csv;charset=utf-8\\\" });\n    const url = URL.createObjectURL(blob);\n    const link = document.createElement(\\\"a\\\");\n    link.href = url;\n    link.download = \\\"darest-kpi-\\\" + performancePeriod + \\\"d.csv\\\";\n    link.click();\n    URL.revokeObjectURL(url);\n  };\n  const exportPerformancePdf = () => {\n    const doc = new jsPDF();\n    doc.setFontSize(16);\n    doc.text(\\\"DAR.EST - KPI\\\", 18, 18);\n    doc.setFontSize(10);\n    doc.text(\\\"Period: \\\" + periodLabel, 18, 27);\n    performanceData.forEach((row, index) => {\n      doc.text(row.label + \\\" | current: \\\" + row.current + \\\" | previous: \\\" + row.previous, 18, 40 + index * 8);\n    });\n    doc.save(\\\"darest-kpi-\\\" + performancePeriod + \\\"d.pdf\\\");\n  };\n  const overdueTasks = taskItems.filter(item => {\n    const dueAt = item.dueAt ? new Date(String(item.dueAt)).getTime() : 0;\n    return dueAt > 0 && dueAt < Date.now() && String(item.status) !== \\\"done\\\";\n  });\n  const notifications = [\n    ...overdueTasks.slice(0, 5).map(item => ({\n      id: \\\"task-\\\" + String(item.id),\n      label: c.overdueTask,\n      detail: String(item.title ?? c.tasks),\n      tone: \\\"rose\\\",\n      priority: \\\"high\\\" as const,\n    })),\n    ...(openMaintenance > 0 ? [{ id: \\\"maintenance-open\\\", label: c.openMaintenance, detail: String(openMaintenance), tone: \\\"amber\\\", priority: \\\"medium\\\" as const }] : []),\n    ...((activity.data?.items ?? []).slice(0, 3).map(item => ({\n      id: \\\"activity-\\\" + String(item.activity.id),\n      label: c.recentActivity,\n      detail: String(item.activity.action),\n      tone: \\\"gold\\\",\n      priority: \\\"low\\\" as const,\n    }))),\n  ].filter(item => !dismissedNotificationIds.includes(item.id));\n  const filteredNotifications = notificationPriority === \\\"all\\\" ? notifications : notifications.filter(item => item.priority === notificationPriority);\n`;
source = source.slice(0, oldPerfStart) + newPerf + source.slice(oldPerfEnd);

source = source.replace(
  '{notifications.length}\n                      </span>\n                    </div>',
  '{filteredNotifications.length}\n                      </span>\n                    </div>\n                    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-2 py-3">\n                      <span className="text-[10px] text-white/40">{c.priority}</span>\n                      {([["all", c.allPriorities], ["high", c.highPriority], ["medium", c.mediumPriority], ["low", c.lowPriority]] as const).map(([value, label]) => (\n                        <button key={value} onClick={() => setNotificationPriority(value)} className={`rounded-full px-2 py-1 text-[10px] ${notificationPriority === value ? "bg-[#d8b26b]/20 text-[#e6c67d]" : "text-white/45 hover:text-white"}`}>{label}</button>\n                      ))}\n                      <button onClick={() => setDismissedNotificationIds(notifications.map(item => item.id))} className="ms-auto text-[10px] text-[#e6c67d] hover:text-white">{c.markAllRead}</button>\n                    </div>'
);
source = source.replace('{notifications.map(item => (', '{filteredNotifications.map(item => (');
source = source.replace('{notifications.length === 0 && (', '{filteredNotifications.length === 0 && (');

source = source.replace(
  '                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">\n                  {c.plan}: {planLabels[planCode]}\n                </span>',
  '                <div className="flex flex-wrap items-center gap-2">\n                  <label className="text-xs text-white/45">{c.period}</label>\n                  <select value={performancePeriod} onChange={event => setPerformancePeriod(Number(event.target.value) as 7 | 30 | 90 | 365)} className="rounded-full border border-white/10 bg-[#092437] px-3 py-1 text-xs text-white/70">\n                    <option value={7}>{c.days7}</option>\n                    <option value={30}>{c.days30}</option>\n                    <option value={90}>{c.days90}</option>\n                    <option value={365}>{c.year1}</option>\n                  </select>\n                  <button onClick={exportPerformanceCsv} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#d8b26b]/40 hover:text-[#e6c67d]"><Download size={13} />{c.exportCsv}</button>\n                  <button onClick={exportPerformancePdf} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#d8b26b]/40 hover:text-[#e6c67d]"><FileDown size={13} />{c.exportPdf}</button>\n                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{c.plan}: {planLabels[planCode]}</span>\n                </div>'
);
source = source.replace(
  '                    <AreaChart data={performanceData}>',
  '                    <AreaChart data={performanceData}>'
);
source = source.replace(
  '                      dataKey="value"\n                      stroke="#e6c67d"',
  '                      dataKey="current"\n                      name={c.currentPeriod}\n                      stroke="#e6c67d"'
);
source = source.replace(
  '                    />\n                  </AreaChart>',
  '                    />\n                    <Area type="monotone" dataKey="previous" name={c.previousPeriod} stroke="#7aa9bd" strokeWidth={2} strokeDasharray="5 5" fill="none" />\n                  </AreaChart>'
);
source = source.replace(
  '              <p className="text-xs text-white/35">\n                {c.usage}:',
  '              <p className="mb-2 text-xs text-white/40">{c.compare}: {c.currentPeriod} / {c.previousPeriod} · {periodLabel}</p>\n              <p className="text-xs text-white/35">\n                {c.usage}:'
);

fs.writeFileSync(path, source);
console.log("Workspace analytics tools added");
