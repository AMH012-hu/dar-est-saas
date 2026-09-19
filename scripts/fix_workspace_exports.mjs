import fs from "node:fs";
const path = "client/src/pages/Workspace.tsx";
let source = fs.readFileSync(path, "utf8");
const start = source.indexOf("  const exportPerformanceCsv = () => {");
const end = source.indexOf("  const overdueTasks = taskItems.filter", start);
if (start < 0 || end < 0) throw new Error("Export function range not found");
const replacement = `  const exportPerformanceCsv = () => {
    const rows = [
      [c.reports, c.currentPeriod, c.previousPeriod],
      ...performanceData.map(row => [row.label, row.current, row.previous]),
    ];
    const csv = rows
      .map(row =>
        row
          .map(value => \`"\${String(value).replaceAll('"', '""')}"\`)
          .join(",")
      )
      .join("\\n");
    const blob = new Blob(["\\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = \`darest-kpi-\${performancePeriod}d.csv\`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPerformancePdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("DAR.EST - KPI", 18, 18);
    doc.setFontSize(10);
    doc.text(\`Period: \${periodLabel}\`, 18, 27);
    performanceData.forEach((row, index) => {
      doc.text(
        \`\${row.label} | current: \${row.current} | previous: \${row.previous}\`,
        18,
        40 + index * 8
      );
    });
    doc.save(\`darest-kpi-\${performancePeriod}d.pdf\`);
  };
`;
source = source.slice(0, start) + replacement + source.slice(end);
source = source.replace(/String\(item\.status\) !== \\\"done\\\"/g, 'String(item.status) !== "done"');
source = source.replace(/String\(item\.status\) !== \\\"done\\\"/g, 'String(item.status) !== "done"');
fs.writeFileSync(path, source);
console.log("Workspace exports fixed");
