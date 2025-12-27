
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Report, IncidentType } from '../types';

interface IncidentMapProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
}

const getIconColor = (type: IncidentType): string => {
  switch (type) {
    case 'fire': return '#e11d48'; // Rose 600
    case 'crime': return '#7c3aed'; // Violet 600
    case 'medical': return '#2563eb'; // Blue 600
    case 'flood': return '#0891b2'; // Cyan 600
    case 'accident': return '#ea580c'; // Orange 600
    default: return '#475569'; // Slate 600
  }
};

const getTypeInitial = (type: IncidentType): string => {
  switch (type) {
    case 'fire': return 'F';
    case 'crime': return 'C';
    case 'medical': return 'M';
    case 'flood': return 'W'; // Water
    case 'accident': return 'A';
    default: return 'O';
  }
};

const createCustomIcon = (type: IncidentType) => {
  const color = getIconColor(type);
  const initial = getTypeInitial(type);
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-family: 'Arial Black', sans-serif;
          font-size: 14px;
          font-weight: 900;
        ">${initial}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const IncidentMap: React.FC<IncidentMapProps> = ({ reports, onSelectReport }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      // Bongao, Tawi-Tawi coordinates
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false
      }).setView([5.068, 119.775], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
      
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    
    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Only show active (not resolved) reports
    const activeReports = reports.filter(r => r.currentStatus !== 'resolved');

    activeReports.forEach((report) => {
      L.marker([report.latitude, report.longitude], {
        icon: createCustomIcon(report.incidentType)
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-3 min-w-[200px] font-sans">
            <div class="flex items-center justify-between mb-2">
              <span style="background-color: ${getIconColor(report.incidentType)}" class="text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                ${report.incidentType}
              </span>
              <span class="text-[9px] font-bold text-slate-400">#${report.id}</span>
            </div>
            <h4 class="font-black text-slate-800 text-sm mb-1 leading-tight">${report.addressLandmark}</h4>
            <p class="text-[10px] text-slate-500 mb-4 line-clamp-2 italic">"${report.description}"</p>
            <button class="w-full bg-slate-900 text-white text-[10px] font-black py-2.5 rounded-lg hover:bg-rose-600 transition-all uppercase tracking-widest shadow-md" onclick="window.viewDetails('${report.id}')">
              Open Incident File
            </button>
          </div>
        `);
    });

    (window as any).viewDetails = (id: string) => {
      const report = reports.find(r => r.id === id);
      if (report) onSelectReport(report);
    };
  }, [reports, onSelectReport]);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border-2 border-slate-200 shadow-2xl relative bg-slate-100">
      <div ref={containerRef} className="h-full w-full" />
      
      {/* Legend Overlay */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl z-[1000] border border-slate-200 pointer-events-none w-52">
        <h4 className="font-black text-[11px] text-slate-800 mb-4 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex items-center justify-between">
          Live Map Key
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </h4>
        <div className="space-y-3">
          {[
            { type: 'fire', color: '#e11d48', label: 'Fire Dept' },
            { type: 'medical', color: '#2563eb', label: 'Medical/EMS' },
            { type: 'crime', color: '#7c3aed', label: 'Police Force' },
            { type: 'accident', color: '#ea580c', label: 'Accident/MVA' },
            { type: 'flood', color: '#0891b2', label: 'Calamity/Water' },
          ].map(item => (
            <div key={item.type} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full shadow-inner flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: item.color }}>
                {getTypeInitial(item.type as IncidentType)}
              </div>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{item.label}</span>
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
