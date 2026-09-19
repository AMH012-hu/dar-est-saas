import { TRPCError } from "@trpc/server";

export type CompanyRole = "owner" | "admin" | "manager" | "member" | "viewer";

const COMPANY_PERMISSIONS: Record<CompanyRole, ReadonlySet<string>> = {
  owner: new Set(["company.read", "company.manage", "members.read", "members.write", "workspace.read", "workspace.write", "audit.read", "portfolio.read", "portfolio.write", "leasing.read", "leasing.write", "collections.read", "collections.write", "finance.read", "finance.write", "operations.read", "operations.write", "documents.read", "documents.write"]),
  admin: new Set(["company.read", "company.manage", "members.read", "members.write", "workspace.read", "workspace.write", "audit.read", "portfolio.read", "portfolio.write", "leasing.read", "leasing.write", "collections.read", "collections.write", "finance.read", "finance.write", "operations.read", "operations.write", "documents.read", "documents.write"]),
  manager: new Set(["company.read", "members.read", "workspace.read", "workspace.write", "audit.read", "portfolio.read", "portfolio.write", "leasing.read", "leasing.write", "collections.read", "collections.write", "finance.read", "finance.write", "operations.read", "operations.write", "documents.read", "documents.write"]),
  member: new Set(["company.read", "workspace.read", "workspace.write", "portfolio.read", "portfolio.write", "leasing.read", "operations.read", "operations.write", "documents.read", "documents.write"]),
  viewer: new Set(["company.read", "workspace.read", "portfolio.read", "leasing.read", "collections.read", "finance.read", "operations.read", "documents.read"]),
};

export function hasCompanyPermission(role: string | null | undefined, permission: string) {
  return Boolean(role && role in COMPANY_PERMISSIONS && COMPANY_PERMISSIONS[role as CompanyRole].has(permission));
}

export function requireCompanyPermission(role: string | null | undefined, permission: string) {
  if (!hasCompanyPermission(role, permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission for this company operation." });
  }
}
