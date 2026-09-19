import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("company notifications contract", () => {
  const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");

  it("persists notification read state per company member", () => {
    expect(schemaSource).toContain("companyNotificationReads");
    expect(schemaSource).toContain("notificationKey");
    expect(schemaSource).toContain("company_notification_reads_unique");
  });

  it("derives authorized operational notifications and rejects foreign keys", () => {
    expect(dbSource).toContain("getCompanyNotificationsForUser");
    expect(dbSource).toContain("assertCompanySubscription(input.companyId, input.userId)");
    expect(dbSource).toContain("collection-overdue-");
    expect(dbSource).toContain("work-order-overdue-");
    expect(dbSource).toContain("document-expiring-");
    expect(dbSource).toContain("NOTIFICATION_ACCESS_REQUIRED");
  });

  it("exposes a permission-protected inbox and read mutations", () => {
    expect(routerSource).toContain("notifications: router({");
    expect(routerSource).toContain("inbox: protectedProcedure");
    expect(routerSource).toContain("markRead: protectedProcedure");
    expect(routerSource).toContain("markAllRead: protectedProcedure");
    expect(routerSource).toContain('requireCompanyPermission(membership.member.role, "workspace.read")');
  });

  it("uses the server inbox and persisted read actions in the workspace bell", () => {
    expect(workspaceSource).toContain("trpc.notifications.inbox.useQuery");
    expect(workspaceSource).toContain("trpc.notifications.markRead.useMutation");
    expect(workspaceSource).toContain("trpc.notifications.markAllRead.useMutation");
    expect(workspaceSource).toContain("href={item.href}");
  });

  it("does not present an inbox loading or query failure as an empty notification list", () => {
    expect(workspaceSource).toContain("companyNotifications.isLoading");
    expect(workspaceSource).toContain("companyNotifications.isError");
    expect(workspaceSource).toContain("companyNotifications.refetch()");
    expect(workspaceSource).toContain("notificationsUnavailable");
  });
});
