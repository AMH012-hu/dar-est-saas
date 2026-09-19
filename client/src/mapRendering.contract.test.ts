import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mapSource = readFileSync(resolve(process.cwd(), "client/src/components/Map.tsx"), "utf8");
const projectsSource = readFileSync(resolve(process.cwd(), "client/src/pages/PublicProperties.tsx"), "utf8");

describe("public Projects map rendering contract", () => {
  it("waits for the Maps library before constructing a map and does not use a demo map id", () => {
    expect(mapSource).toContain('importLibrary.call(maps, "maps")');
    expect(mapSource).toContain("Google Maps library did not initialize");
    expect(mapSource).not.toContain("DEMO_MAP_ID");
  });

  it("reuses an in-flight script and exposes visible loading and error states", () => {
    expect(mapSource).toContain("mapScriptPromise");
    expect(mapSource).toContain('data-dar-est-google-maps="true"');
    expect(mapSource).toContain("Porto Golf approximate location");
    expect(mapSource).toContain("Open in Google Maps");
    expect(mapSource).toContain("porto-golf-map_a00e2891.png");
    expect(mapSource).toContain('className="absolute inset-0 min-h-[300px] w-full bg-[#dce5df]"');
  });

  it("keeps Porto Golf geocoding resilient with an approximate project-area fallback", () => {
    expect(projectsSource).toContain('Porto Golf Marina New Alamein North Coast Egypt');
    expect(projectsSource).toContain("const PORTO_GOLF_COORDINATES = { lat: 30.95, lng: 28.83 }");
    expect(projectsSource).toContain("const fallbackPosition = PORTO_GOLF_COORDINATES");
    expect(projectsSource).toContain("Approximate project location");
    expect(projectsSource).toContain("Porto Golf — DAR.EST projects");
  });

  it("keeps per-unit media and location sections in the public detail page", () => {
    expect(projectsSource).toContain("function PublicUnitMedia");
    expect(projectsSource).toContain("publicVideoUrl");
    expect(projectsSource).toContain("publicTourUrl");
    expect(projectsSource).toContain("function UnitMap");
    expect(projectsSource).toContain("publicLatitude");
    expect(projectsSource).toContain("Unit location on the map");
  });
});
