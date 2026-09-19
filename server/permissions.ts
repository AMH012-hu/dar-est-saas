import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

export type AdminRole = "admin" | "manager" | "support" | "analyst";

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Owner",
  manager: "Subscription manager",
  support: "Support reviewer",
  analyst: "Reporting viewer",
};

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<string>> = {
  admin: new Set(["dashboard.read", "users.read", "subscriptions.read", "subscriptions.write", "keys.read", "keys.write", "audit.read", "exports.read"]),
  manager: new Set(["dashboard.read", "users.read", "subscriptions.read", "subscriptions.write", "keys.read", "keys.write", "audit.read", "exports.read"]),
  support: new Set(["dashboard.read", "users.read", "subscriptions.read", "keys.read", "audit.read"]),
  analyst: new Set(["dashboard.read", "subscriptions.read", "keys.read", "audit.read", "exports.read"]),
};

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return role === "admin" || role === "manager" || role === "support" || role === "analyst";
}

export function hasPermission(role: string | null | undefined, permission: string) {
  return isAdminRole(role) && ROLE_PERMISSIONS[role].has(permission);
}

export function requirePermission(ctx: Pick<TrpcContext, "user">, permission: string) {
  if (!ctx.user || !hasPermission(ctx.user.role, permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission for this operation." });
  }
  return ctx.user;
}

export function requireRole(ctx: Pick<TrpcContext, "user">, roles: readonly AdminRole[]) {
  if (!ctx.user || !isAdminRole(ctx.user.role) || !roles.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your administrator role cannot perform this operation." });
  }
  return ctx.user;
}
