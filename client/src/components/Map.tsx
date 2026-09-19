/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

type MapStatus = "loading" | "ready" | "error";

let mapScriptPromise: Promise<void> | null = null;
let mapConstructor: typeof google.maps.Map | null = null;

async function waitForMapsApi(): Promise<void> {
  const maps = window.google?.maps;
  if (!maps) throw new Error("Google Maps API is unavailable");

  // Some proxy responses expose the classic global constructor but not
  // importLibrary. Use the modern library result when available and fall back
  // to the already-loaded global Map constructor otherwise.
  const importLibrary = (maps as unknown as {
    importLibrary?: (name: string) => Promise<unknown>;
  }).importLibrary;
  let library: unknown = null;
  if (typeof importLibrary === "function") {
    try {
      library = await importLibrary.call(maps, "maps");
    } catch {
      // The classic global API can still become ready after this promise
      // rejects, so continue with the bounded namespace check below.
    }
  }
  const importedMap = (library as { Map?: typeof google.maps.Map } | null)?.Map;
  const deadline = Date.now() + 5000;
  let globalMap = typeof maps.Map === "function" ? maps.Map : null;
  while (!globalMap && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 40));
    globalMap = typeof window.google?.maps?.Map === "function" ? window.google.maps.Map : null;
  }
  mapConstructor = globalMap ?? importedMap ?? null;

  if (!mapConstructor) {
    throw new Error("Google Maps library did not initialize");
  }
}

function loadMapScript(): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapScriptPromise) return mapScriptPromise;

  mapScriptPromise = new Promise<void>((resolve, reject) => {
    const complete = () => {
      void waitForMapsApi().then(resolve, reject);
    };
    const fail = () => reject(new Error("Google Maps script failed to load"));
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-dar-est-google-maps="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", complete, { once: true });
      existingScript.addEventListener("error", fail, { once: true });
      // A script tag can already be complete when React mounts after HMR or a
      // route change. In that case, use the namespace immediately.
      if (window.google?.maps) complete();
      return;
    }

    const script = document.createElement("script");
    const key = API_KEY ? `&key=${encodeURIComponent(API_KEY)}` : "";
    script.src = `${MAPS_PROXY_URL}/maps/api/js?v=weekly&loading=async${key}&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.dataset.darEstGoogleMaps = "true";
    script.onload = complete;
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch(error => {
    mapScriptPromise = null;
    throw error;
  });

  return mapScriptPromise!;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadMapScript();
        if (cancelled || !mapContainer.current) return;

        const maps = window.google?.maps;
        const MapConstructor = mapConstructor ?? maps?.Map;
        if (!MapConstructor) throw new Error("Google Maps API is unavailable");

        const nextMap = new MapConstructor(mapContainer.current, {
          zoom: initialZoom,
          center: initialCenter,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
        });
        map.current = nextMap;

        if (!cancelled) {
          setStatus("ready");
          onMapReady?.(nextMap);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("DAR.EST map initialization failed", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Google Maps is unavailable",
        );
      }
    };

    void init();
    return () => {
      cancelled = true;
      map.current = null;
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, onMapReady]);

  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${initialCenter.lat},${initialCenter.lng}`;
  const staticMapUrl = "/manus-storage/porto-golf-map_a00e2891.png";

  return (
    <div className={cn("relative min-h-[300px] w-full", className)}>
      <div
        ref={mapContainer}
        aria-label="Google Maps project location"
        className="absolute inset-0 min-h-[300px] w-full bg-[#dce5df]"
      />
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#e9eee8] text-sm text-[#18352f]">
          Loading map…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-10 overflow-hidden bg-[#e9eee8] text-[#18352f]">
          <img
            src={staticMapUrl}
            alt="Porto Golf approximate project location map"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-x-4 bottom-4 flex flex-col items-center gap-2 rounded-2xl bg-white/92 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
            <strong className="text-sm">Porto Golf approximate location</strong>
            <span className="text-[11px] leading-4 text-[#64736c]">
              {errorMessage ? "Live Google Maps is unavailable; the customer-safe project map is shown instead." : "Customer-safe project-area map; unit locations are approximate."}
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              <a href={fallbackUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#18352f] px-4 py-2 text-[11px] font-semibold text-white hover:bg-[#2b5147]">Open in Google Maps</a>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="rounded-full border border-[#18352f]/15 px-4 py-2 text-[11px] font-semibold text-[#18352f] hover:border-[#ad7d1b]">Map data © OpenStreetMap</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
