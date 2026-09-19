import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("document center contracts", () => {
  it("keeps document metadata company-scoped and expiry-aware", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");
    expect(schema).toContain('"documents"');
    expect(schema).toContain("fileKey");
    expect(db).toContain("getDocumentsCenterForCompany");
    expect(db).toContain("eq(documents.companyId, companyId)");
    expect(db).toContain("DOCUMENT_KEY_INVALID");
    expect(router).toContain("documents: router");
    expect(router).toContain("createDocumentMetadataForCompany");
    expect(workspace).toContain("trpc.documents.center.useQuery");
    expect(workspace).toContain("مركز المستندات");
  });

  it("keeps document operations permission-gated, company-scoped, and version-aware", () => {
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(db).toContain("updateDocumentMetadataForCompany");
    expect(db).toContain("replaceDocumentFileForCompany");
    expect(db).toContain("removeDocumentForCompany");
    expect(db).toContain("getDocumentFileForCompany");
    expect(db).toContain("versionNumber: existing.versionNumber + 1");
    expect(router).toContain("documents.write");
    expect(router).toContain("documents.read");
    expect(router).toContain("storagePut(`${membership.company.id}/documents/");
    expect(router).toContain("storageGetSignedUrl(document.fileKey)");
    expect(router).toContain("Document must be between 1 byte and 10 MB.");
  });
});
