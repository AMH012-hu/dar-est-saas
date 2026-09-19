import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("release evidence checklist contract", () => {
  const checklist = readFileSync(
    resolve(process.cwd(), "docs/release_evidence_checklist.md"),
    "utf8"
  );

  it("retains the mandatory quality gates for every published checkpoint", () => {
    expect(checklist).toContain("pnpm test -- --run");
    expect(checklist).toContain("pnpm build");
    expect(checklist).toContain("الصلاحيات والعزل");
    expect(checklist).toContain("مراجعة متجاوبة");
    expect(checklist).toContain("تدفق المستخدم الحرج");
    expect(checklist).toContain("المراقبة والاسترداد");
  });

  it("prevents the checklist from treating production data rollback as a code rollback", () => {
    expect(checklist).toContain("لا تستخدم هذه القائمة لإعادة قاعدة البيانات");
    expect(checklist).toContain("production_quality_runbook.md");
  });
});
