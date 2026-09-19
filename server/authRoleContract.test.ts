import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 41,
      openId: "role-contract-user",
      name: "Role Contract User",
      email: "role-contract@example.com",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    requestId: "role-contract-request",
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.me role contract", () => {
  it("returns the current admin role so the Owner route can authorize the session", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));

    await expect(caller.auth.me()).resolves.toMatchObject({
      id: 41,
      email: "role-contract@example.com",
      role: "admin",
    });
  });
});
