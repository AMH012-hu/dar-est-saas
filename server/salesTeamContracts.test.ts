import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("sales team operations contracts", () => {
  it("keeps the team, invitation, task, attendance, assignment and message flow company-scoped", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/SalesWorkspace.tsx"), "utf8");
    const invite = readFileSync(resolve(process.cwd(), "client/src/pages/AcceptSalesInvite.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

    expect(schema).toContain('"sales_team_members"');
    expect(schema).toContain('"sales_team_invitations"');
    expect(schema).toContain('"sales_assignments"');
    expect(schema).toContain('"sales_daily_tasks"');
    expect(schema).toContain('"sales_messages"');
    expect(schema).toContain('companyId: int("companyId")');
    expect(schema).toContain('mysqlEnum("role", ["manager", "supervisor", "representative"])');
    expect(schema).toContain('mysqlEnum("scope", ["team", "direct"])');

    expect(db).toContain("getSalesOperationsForCompany");
    expect(db).toContain("createSalesTeamInvitationForCompany");
    expect(db).toContain("acceptSalesTeamInvitationForUser");
    expect(db).toContain("updateSalesTeamMemberForCompany");
    expect(db).toContain("createSalesDailyTaskForCompany");
    expect(db).toContain("updateSalesDailyTaskForCompany");
    expect(db).toContain("recordSalesAttendanceForUser");
    expect(db).toContain("createSalesMessageForCompany");
    expect(db).toContain("getSalesTeamAccess");
    expect(db).toContain("SALES_TEAM_INVITATION_EMAIL_MISMATCH");
    expect(db).toContain('const companyManager = ["owner", "admin", "manager"].includes(membership.member.role)');
    expect(db).toContain('if (!access.salesMember && !access.canManage) throw new Error("SALES_TEAM_MEMBER_REQUIRED")');
    expect(db).toContain('const timeValue = occurredAt.toISOString().slice(11, 16)');
    expect(schema).toContain('checkIn: varchar("checkIn", { length: 5 })');
    expect(schema).toContain('checkOut: varchar("checkOut", { length: 5 })');

    expect(router).toContain("operations: protectedProcedure");
    expect(router).toContain("createTeamInvitation: protectedProcedure");
    expect(router).toContain("acceptTeamInvitation: protectedProcedure");
    expect(router).toContain("createDailyTask: protectedProcedure");
    expect(router).toContain("recordAttendance: protectedProcedure");
    expect(router).toContain("sendMessage: protectedProcedure");
    expect(router).toContain("targetContacts: z.number().int().min(0).max(10000)");

    expect(workspace).toContain("trpc.sales.operations.useQuery");
    expect(workspace).toContain("trpc.sales.createTeamInvitation.useMutation");
    expect(workspace).toContain("trpc.sales.createDailyTask.useMutation");
    expect(workspace).toContain("trpc.sales.recordAttendance.useMutation");
    expect(workspace).toContain("trpc.sales.sendMessage.useMutation");
    expect(workspace).toContain("const copy = {");
    expect(invite).toContain("trpc.sales.acceptTeamInvitation.useMutation");
    expect(app).toContain('path="/sales/team" component={SalesWorkspace}');
    expect(app).toContain('path="/sales/invite/:token" component={AcceptSalesInvite}');
  });
});
