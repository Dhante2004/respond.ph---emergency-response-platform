import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, Marker as MLMarker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Report, IncidentType } from "../types";

interface IncidentMapProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;

  focusReportId?: string | null;
  focusSignal?: number;
}

type MarkerState = "normal" | "unassigned";

const getIconColor = (type: IncidentType): string => {
  switch (type) {
    case "fire":
      return "#e11d48";
    case "crime":
      return "#7c3aed";
    case "medical":
      return "#2563eb";
    case "flood":
      return "#0891b2";
    case "accident":
      return "#ea580c";
    default:
      return "#475569";
  }
};

const getTypeInitial = (type: IncidentType): string => {
  switch (type) {
    case "fire":
      return "F";
    case "crime":
      return "C";
    case "medical":
      return "M";
    case "flood":
      return "W";
    case "accident":
      return "A";
    default:
      return "O";
  }
};

const getMarkerState = (report: Report): MarkerState => {
  const assigned = String((report as any).assignedAgency ?? "").trim();
  const isUnassigned = assigned === "" || assigned === "NONE";
  return isUnassigned ? "unassigned" : "normal";
};
const build3DTerrainStyle = (): StyleSpecification =>
  ({
    version: 8 as const,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap Contributors",
        maxzoom: 19,
      },
      terrainSource: {
        type: "raster-dem",
        url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
        tileSize: 256,
      },
      hillshadeSource: {
        type: "raster-dem",
        url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
        tileSize: 256,
      },
    },
    layers: [
      { id: "osm", type: "raster", source: "osm" },
      {
        id: "hills",
        type: "hillshade",
        source: "hillshadeSource",
        layout: { visibility: "visible" },
        paint: { "hillshade-shadow-color": "#473B24" },
      },
    ],
    terrain: { source: "terrainSource", exaggeration: 1 },
    sky: {},
  } as const) as StyleSpecification;

function createMarkerElement(report: Report) {
  const state = getMarkerState(report);
  const typeColor = getIconColor(report.incidentType);
  const initial = getTypeInitial(report.incidentType);

  const el = document.createElement("div");
  el.className = `custom-marker rp-marker ${state === "unassigned" ? "rp-unassigned" : "rp-normal"}`;
  el.innerHTML = `
    <div class="rp-wrap">
      <div class="rp-pulse ${state === "unassigned" ? "rp-pulse-red" : ""}"></div>

      <div class="rp-pin" style="
        background-color: ${typeColor};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.30);
        position: relative;
        z-index: 2;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-family: 'Arial Black', sans-serif;
          font-size: 14px;
          font-weight: 900;
          text-shadow: 0 2px 10px rgba(0,0,0,0.28);
        ">${initial}</span>
      </div>
    </div>
  `;
  return el;
}

const IncidentMap: React.FC<IncidentMapProps> = ({
  reports,
  onSelectReport,
  focusReportId = null,
  focusSignal = 0,
}) => {
  const mapRef = useRef<MLMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersByIdRef = useRef<Map<string, MLMarker>>(new Map());

  // screen flash
  const flashQueueRef = useRef<Array<"red" | "green">>([]);
  const flashingRef = useRef(false);
  const [flash, setFlash] = useState<{ color: null | "red" | "green"; key: number }>({
    color: null,
    key: 0,
  });

  const firstLoadRef = useRef(true);
  const prevSnapshotRef = useRef<Map<string, { status: string }>>(new Map());

  const runFlashQueue = () => {
    if (flashingRef.current) return;
    const next = flashQueueRef.current.shift();
    if (!next) return;
    flashingRef.current = true;
    setFlash((prev) => ({ color: next, key: prev.key + 1 }));
  };

  const enqueueFlash = (color: "red" | "green") => {
    flashQueueRef.current.push(color);
    runFlashQueue();
  };

  const onFlashEnd = () => {
    flashingRef.current = false;
    setFlash((prev) => ({ ...prev, color: null }));
    setTimeout(runFlashQueue, 80);
  };

  //  init 3D map
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: build3DTerrainStyle(),
      center: [119.775, 5.068],
      zoom: 13,
      pitch: 70, 
      bearing: -10,
      maxZoom: 18,
      maxPitch: 85,
      hash: false,
      attributionControl: {}, // (your types require options, not true)
    });

    //  controls
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }),
      "bottom-right"
    );

    //  Terrain toggle control (if available in your maplibre version)
    // If TS complains that TerrainControl doesn't exist, see note below.
    // @ts-ignore
    if ((maplibregl as any).TerrainControl) {
      // @ts-ignore
      map.addControl(new (maplibregl as any).TerrainControl({ source: "terrainSource", exaggeration: 1 }));
    }

    setTimeout(() => map.resize(), 250);

    mapRef.current = map;

    return () => {
      markersByIdRef.current.forEach((m) => m.remove());
      markersByIdRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  //  markers + flashing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const cleanAll = reports.filter((r) => r.verificationStatus !== "false");
    const prev = prevSnapshotRef.current;

    let hasNew = false;
    let hasResolved = false;

    for (const r of cleanAll) {
      const p = prev.get(r.id);
      if (!p) hasNew = true;
      else if (p.status !== "resolved" && r.currentStatus === "resolved") hasResolved = true;
    }

    const nextSnap = new Map<string, { status: string }>();
    for (const r of cleanAll) nextSnap.set(r.id, { status: r.currentStatus });

    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      prevSnapshotRef.current = nextSnap;
    } else {
      prevSnapshotRef.current = nextSnap;
      if (hasNew) enqueueFlash("red");
      if (hasResolved) enqueueFlash("green");
    }

    // clear markers
    markersByIdRef.current.forEach((m) => m.remove());
    markersByIdRef.current.clear();

    const activeReports = reports.filter(
      (r) => r.currentStatus !== "resolved" && r.verificationStatus !== "false"
    );

    (window as any).viewDetails = (id: string) => {
      const report = reports.find(
        (r) => r.id === id && r.verificationStatus !== "false" && r.currentStatus !== "resolved"
      );
      if (report) onSelectReport(report);
    };

    activeReports.forEach((report) => {
      const el = createMarkerElement(report);

      const popupHtml = `
        <div class="p-3 min-w-[200px] font-sans">
          <div class="flex items-center justify-between mb-2">
            <span style="background-color: ${getIconColor(report.incidentType)}"
              class="text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
              ${report.incidentType}
            </span>
            <span class="text-[9px] font-bold text-slate-400">#${report.id}</span>
          </div>
          <h4 class="font-black text-slate-800 text-sm mb-1 leading-tight">${report.addressLandmark}</h4>
          <p class="text-[10px] text-slate-500 mb-4 line-clamp-2 italic">"${report.description}"</p>
          <button
            class="w-full bg-slate-900 text-white text-[10px] font-black py-2.5 rounded-lg hover:bg-rose-600 transition-all uppercase tracking-widest shadow-md"
            onclick="window.viewDetails('${report.id}')">
            Open Incident File
          </button>
        </div>
      `;

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: true,
        offset: 28,
        maxWidth: "280px",
      }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(popup)
        .addTo(map);

      markersByIdRef.current.set(report.id, marker);
    });
  }, [reports, onSelectReport]);

  //  jump-to focus
  useEffect(() => {
    if (!focusReportId) return;
    const map = mapRef.current;
    if (!map) return;

    setTimeout(() => {
      const r = reports.find((x) => x.id === focusReportId);
      const marker = markersByIdRef.current.get(focusReportId);

      if (r) {
        map.easeTo({
          center: [r.longitude, r.latitude],
          zoom: Math.max(map.getZoom(), 16),
          duration: 650,
          pitch: Math.max(map.getPitch(), 70),
        });
      }
      if (marker) marker.togglePopup();
    }, 60);
  }, [focusSignal, focusReportId, reports]);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border-2 border-slate-200 shadow-2xl relative bg-slate-100">
      {/* Marker pulse + screen flash */}
      <style>{`
        .rp-wrap { position: relative; width: 36px; height: 36px; }
        .rp-pulse {
          position: absolute;
          inset: -22px;
          border-radius: 999px;
          z-index: 1;
          pointer-events: none;
          opacity: 0;
        }

        @keyframes rpLoudPulseRed {
          0%   { transform: scale(0.55); opacity: 0; filter: blur(0px); }
          12%  { opacity: 0.95; }
          35%  { transform: scale(1.15); opacity: 0.55; filter: blur(0.3px); }
          55%  { transform: scale(1.55); opacity: 0.25; filter: blur(0.7px); }
          100% { transform: scale(2.05); opacity: 0; filter: blur(1.0px); }
        }

        @keyframes rpFlicker {
          0%, 100% { opacity: 1; }
          10% { opacity: 0.75; }
          12% { opacity: 1; }
          18% { opacity: 0.55; }
          20% { opacity: 1; }
          62% { opacity: 0.8; }
          64% { opacity: 1; }
          78% { opacity: 0.65; }
          80% { opacity: 1; }
        }

        .rp-unassigned .rp-pulse-red {
          opacity: 1;
          background:
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0 22%, rgba(239,68,68,0.55) 28%, rgba(239,68,68,0.00) 70%),
            radial-gradient(circle at 50% 50%, rgba(239,68,68,0.22) 0 45%, rgba(239,68,68,0.00) 75%);
          box-shadow:
            0 0 28px rgba(239,68,68,0.55),
            0 0 60px rgba(239,68,68,0.28),
            inset 0 0 28px rgba(239,68,68,0.30);
          animation:
            rpLoudPulseRed 1.05s ease-out infinite,
            rpFlicker 0.85s steps(2, end) infinite;
          mix-blend-mode: screen;
        }

        .rp-unassigned .rp-pin {
          filter:
            drop-shadow(0 0 10px rgba(239,68,68,0.60))
            drop-shadow(0 0 22px rgba(239,68,68,0.30));
          animation: rpFlicker 0.9s steps(2, end) infinite;
        }

        @keyframes rpScreenFlashRed {
          0% { opacity: 0; }
          35% { opacity: .38; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes rpScreenFlashGreen {
          0% { opacity: 0; }
          35% { opacity: .30; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        .rp-screen-flash-red { animation: rpScreenFlashRed .36s ease-in-out 0s 3; }
        .rp-screen-flash-green { animation: rpScreenFlashGreen .36s ease-in-out 0s 3; }
      `}</style>

      <div ref={containerRef} className="h-full w-full" />

      {flash.color && (
        <div
          key={flash.key}
          onAnimationEnd={onFlashEnd}
          className={`absolute inset-0 z-[1200] pointer-events-none ${
            flash.color === "red" ? "rp-screen-flash-red" : "rp-screen-flash-green"
          }`}
          style={{
            background: flash.color === "red" ? "rgba(239,68,68,1)" : "rgba(16,185,129,1)",
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl z-[1000] border border-slate-200 pointer-events-none w-52">
        <h4 className="font-black text-[11px] text-slate-800 mb-4 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex items-center justify-between">
          Live Map Key
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </h4>
        <div className="space-y-3">
          {[
            { type: "fire", color: "#e11d48", label: "Fire Dept" },
            { type: "medical", color: "#2563eb", label: "Medical/EMS" },
            { type: "crime", color: "#7c3aed", label: "Police Force" },
            { type: "accident", color: "#ea580c", label: "Accident/MVA" },
            { type: "flood", color: "#0891b2", label: "Calamity/Water" },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full shadow-inner flex items-center justify-center text-[9px] font-black text-white"
                style={{ backgroundColor: item.color }}
              >
                {getTypeInitial(item.type as IncidentType)}
              </div>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 pt-3 border-t border-slate-100 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic text-center">
          Tap markers for mission data
        </p>
      </div>
    </div>
  );
};

export default IncidentMap;
