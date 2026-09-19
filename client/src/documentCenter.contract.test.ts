import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = fs.readFileSync(path.join(projectRoot, "client/src/pages/DocumentCenter.tsx"), "utf8");

describe("document centre UI contract", () => {
  it("keeps the secure document centre reachable as a dedicated operational page", () => {
    expect(source).toContain("trpc.documents.center.useQuery");
    expect(source).toContain("Document centre");
    expect(source).toContain("LocaleSwitcher compact");
  });

  it("keeps upload, metadata editing, file versioning, secure opening, and removal wired to server procedures", () => {
    expect(source).toContain("trpc.documents.upload.useMutation");
    expect(source).toContain("trpc.documents.update.useMutation");
    expect(source).toContain("trpc.documents.replace.useMutation");
    expect(source).toContain("trpc.documents.open.useMutation");
    expect(source).toContain("trpc.documents.remove.useMutation");
    expect(source).toContain("utils.documents.center.invalidate()");
  });

  it("enforces the client-side size guard before reading file content", () => {
    expect(source).toContain("file.size > 10 * 1024 * 1024");
    expect(source).toContain("toBase64(file)");
    expect(source).toContain("Property and unit IDs are verified to belong to your company");
  });
});
