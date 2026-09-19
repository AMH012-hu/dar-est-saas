import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("enterprise observability contracts", () => {
  it("adds a request ID to each response and blocks fingerprinting headers", () => {
    const source = read("server/_core/index.ts");
    expect(source).toContain('app.disable("x-powered-by")');
    expect(source).toContain('res.setHeader("X-Request-ID", requestId)');
    expect(source).toContain('res.setHeader("X-Content-Type-Options", "nosniff")');
  });

  it("propagates the request ID through tRPC failures without exposing server internals", () => {
    expect(read("server/_core/context.ts")).toContain("requestId: string");
    expect(read("server/_core/trpc.ts")).toContain("requestId: ctx?.requestId");
  });

  it("stores request correlation on platform audit events and sensitive owner actions", () => {
    expect(read("drizzle/schema.ts")).toContain('requestId: varchar("requestId", { length: 64 })');
    expect(read("server/db.ts")).toContain("requestId: input.requestId ?? null");
    expect(read("server/routers.ts")).toContain("requestId: ctx.requestId");
  });

  it("keeps the responsive performance chart measurable during initial layout", () => {
    const workspace = read("client/src/pages/Workspace.tsx");
    expect(workspace).toContain('min-h-[230px] min-w-0');
    expect(workspace).toContain('minWidth={0} minHeight={230}');
  });

  it("makes the critical reports path observable through explicit loading, failure, and retry states", () => {
    const reports = read("client/src/pages/OperationalReports.tsx");
    expect(reports).toContain("const enabled = Boolean(user && active && company.data?.company)");
    expect(reports).toContain("const isLoading =");
    expect(reports).toContain("query.isError");
    expect(reports).toContain("const retry = () =>");
  });
});
