import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("route-level lazy loading contract", () => {
  it("defers authenticated and operational page modules while keeping the landing page eager", () => {
    expect(source).toContain('import Home from "./pages/Home"');
    expect(source).toContain('const Workspace = lazy(() => import("./pages/Workspace"))');
    expect(source).toContain('const WorkspaceModule = lazy(() => import("./pages/WorkspaceModule"))');
    expect(source).toContain('const SalesWorkspace = lazy(() => import("./pages/SalesWorkspace"))');
    expect(source).toContain('const Owner = lazy(() => import("./pages/Owner"))');
    expect(source).toContain('const ClientDemo = lazy(() => import("./pages/ClientDemo"))');
    expect(source).toContain('const NotFound = lazy(() => import("./pages/NotFound"))');
    expect(source).toContain('const OperationalReports = lazy(() => import("./pages/OperationalReports"))');
  });

  it("wraps all routes in a single localized suspense boundary", () => {
    expect(source).toContain('import { lazy, Suspense } from "react"');
    expect(source).toContain("function RouteLoading()");
    expect(source).toContain('ar: "جارٍ تحميل الصفحة…"');
    expect(source).toContain('en: "Loading page…"');
    expect(source).toContain('he: "העמוד נטען…"');
    expect(source).toContain('ru: "Загрузка страницы…"');
    expect(source).toContain('uk: "Завантаження сторінки…"');
    expect(source).toContain("<Suspense fallback={<RouteLoading />}>");
  });

  it("keeps the specific workspace, projects, and sales routes ahead of their generic routes", () => {
    expect(source.indexOf('path="/workspace/action-center"')).toBeLessThan(source.indexOf('path="/workspace/:module"'));
    expect(source.indexOf('path="/workspace/reports"')).toBeLessThan(source.indexOf('path="/workspace/:module"'));
    expect(source.indexOf('path="/projects/:id"')).toBeLessThan(source.indexOf('path="/projects"'));
    expect(source).not.toContain('path="/properties"');
    expect(source).not.toContain('path="/properties/:id"');
    expect(source.indexOf('path="/sales/properties/:id"')).toBeLessThan(source.indexOf('path="/sales/properties"'));
    expect(source.indexOf('path="/sales/clients/:id"')).toBeLessThan(source.indexOf('path="/sales/clients"'));
  });
});
