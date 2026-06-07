import React, { useEffect, useMemo, useRef, useState } from "react";
import { User, IncidentType, Report } from "../types";
import {
  Camera,
  MapPin,
  Send,
  AlertTriangle,
  History,
  User as UserIcon,
  ShieldCheck,
  X,
  Upload,
  Info,
  RefreshCw,
  FlipHorizontal,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

interface CitizenPortalProps {
  user: User;
  reports: Report[];
  onSubmit: (reportData: Partial<Report>) => void;
  onUpdateUser: (userData: Partial<User>) => void;
  onDeleteReport?: (reportId: string) => Promise<void> | void;
}

type RevGeoAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  village?: string;
  hamlet?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
};

type CitizenToast = { id: string; title: string; message: string };

const INCIDENT_STYLES: Record<
  IncidentType,
  { active: string; inactive: string; focus: string; dot: string }
> = {
  fire: {
    active: "border-red-600 bg-red-50 text-red-700 shadow-sm",
    inactive: "border-slate-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50/40",
    focus: "focus:ring-red-300",
    dot: "bg-red-500",
  },
  crime: {
    active: "border-violet-600 bg-violet-50 text-violet-700 shadow-sm",
    inactive: "border-slate-100 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40",
    focus: "focus:ring-violet-300",
    dot: "bg-violet-500",
  },
  medical: {
    active: "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm",
    inactive: "border-slate-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40",
    focus: "focus:ring-emerald-300",
    dot: "bg-emerald-500",
  },
  accident: {
    active: "border-amber-600 bg-amber-50 text-amber-800 shadow-sm",
    inactive: "border-slate-100 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/40",
    focus: "focus:ring-amber-300",
    dot: "bg-amber-500",
  },
  flood: {
    active: "border-sky-600 bg-sky-50 text-sky-700 shadow-sm",
    inactive: "border-slate-100 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/40",
    focus: "focus:ring-sky-300",
    dot: "bg-sky-500",
  },
  other: {
    active: "border-slate-600 bg-slate-50 text-slate-800 shadow-sm",
    inactive: "border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50",
    focus: "focus:ring-slate-300",
    dot: "bg-slate-500",
  },
};

// Persisted “only-new” notification tracking (per user)
type SeenState = {
  ack: Record<string, string>; // reportId -> acknowledgedAt
  status: Record<string, string>; // reportId -> currentStatus
};
const seenKey = (uid: string) => `respondph:citizen_seen_v1:${uid}`;

function loadSeen(uid: string): SeenState {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    if (!raw) return { ack: {}, status: {} };
    const parsed = JSON.parse(raw);
    return {
      ack: (parsed?.ack as Record<string, string>) || {},
      status: (parsed?.status as Record<string, string>) || {},
    };
  } catch {
    return { ack: {}, status: {} };
  }
}

function saveSeen(uid: string, state: SeenState) {
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

const CitizenPortal: React.FC<CitizenPortalProps> = ({
  user,
  reports,
  onSubmit,
  onUpdateUser,
  onDeleteReport,
}) => {
  const [view, setView] = useState<"form" | "history" | "account">("form");
  const [incidentType, setIncidentType] = useState<IncidentType>("other");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // address now includes street + barangay label
  const [address, setAddress] = useState("");
  const [geoDetails, setGeoDetails] = useState<{
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    label?: string;
  } | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const idInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation modal (UI)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Toasts
  const [citizenToasts, setCitizenToasts] = useState<CitizenToast[]>([]);

  const pushCitizenToast = (title: string, message: string) => {
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    setCitizenToasts((p) => [{ id, title, message }, ...p].slice(0, 3));
    setTimeout(() => setCitizenToasts((p) => p.filter((x) => x.id !== id)), 5500);
  };

  // Catch the user returning from Didit.me KYC Check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("kyc_success") === "true") {
      // Automatically update Firestore from the frontend!
      onUpdateUser({ accountVerificationStatus: "verified" });
      pushCitizenToast("Verification Complete", "Your identity has been verified by Didit.me!");
      setView("account");
      
      // Clean up the URL so it looks nice again
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // My reports
  const myReports = useMemo(
    () => reports.filter((r) => r.userId === user.id),
    [reports, user.id]
  );

  // Trigger effect when ack/status changes even if array length stays same
  const myReportsSig = useMemo(() => {
    return myReports
      .map((r) => {
        const ack = String(r.acknowledgedAt ?? "");
        const st = String(r.currentStatus ?? "");
        const upd = String(r.updatedAt ?? "");
        const agency = String(r.acknowledgedByAgency ?? "");
        return `${r.id}:${ack}:${agency}:${st}:${upd}`;
      })
      .sort()
      .join("|");
  }, [myReports]);

  const seenRef = useRef<SeenState>({ ack: {}, status: {} });
  const bootRef = useRef(true);

  // Reset baseline when user changes (no spam on load)
  useEffect(() => {
    bootRef.current = true;
    setCitizenToasts([]);

    const seen = loadSeen(user.id);

    // remove stale keys (if report deleted)
    const existing = new Set(myReports.map((r) => r.id));
    const ack = { ...seen.ack };
    const status = { ...seen.status };
    Object.keys(ack).forEach((id) => !existing.has(id) && delete ack[id]);
    Object.keys(status).forEach((id) => !existing.has(id) && delete status[id]);

    // baseline current values so refresh won't re-toast
    for (const r of myReports) {
      const a = String(r.acknowledgedAt ?? "");
      if (a) ack[r.id] = a;
      status[r.id] = r.currentStatus;
    }

    seenRef.current = { ack, status };
    saveSeen(user.id, seenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Only show notifications that are NEW
  useEffect(() => {
    if (bootRef.current) {
      bootRef.current = false;
      return;
    }

    const prev = seenRef.current;
    const nextAck = { ...prev.ack };
    const nextStatus = { ...prev.status };

    const existing = new Set(myReports.map((r) => r.id));
    Object.keys(nextAck).forEach((id) => !existing.has(id) && delete nextAck[id]);
    Object.keys(nextStatus).forEach((id) => !existing.has(id) && delete nextStatus[id]);

    for (const r of myReports) {
      // ACK
      const ack = String(r.acknowledgedAt ?? "");
      if (ack) {
        const wasAck = nextAck[r.id] || "";
        if (ack !== wasAck) {
          const byAgency = String(r.acknowledgedByAgency ?? r.assignedAgency ?? "UNIT");
          pushCitizenToast("Report acknowledged", `${byAgency} has seen your report • ${r.addressLandmark}`);
          nextAck[r.id] = ack;
        }
      }

      // STATUS
      const st = r.currentStatus;
      const wasSt = nextStatus[r.id] || "";
      if (wasSt && st && st !== wasSt) {
        pushCitizenToast("Status updated", `Your report is now ${st.replace("_", " ")} • ${r.addressLandmark}`);
      }
      if (st) nextStatus[r.id] = st;
    }

    seenRef.current = { ack: nextAck, status: nextStatus };
    saveSeen(user.id, seenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myReportsSig]);

  const handleStartKYC = async () => {
    try {
      pushCitizenToast("Initiating...", "Connecting to secure server...");
      
      // Point this to your new separate backend!
      // When you deploy the backend, you will change this localhost URL to the live one.
      const BACKEND_URL = "http://localhost:5000/api/kyc/create-session"; 

      const res = await fetch(BACKEND_URL, { 
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          workflow_id: "ov-Lohmxby10_S2jgUKJP02RGJjNv3YsoYRBAEVbG3c", 
          vendor_data: user.id,
          redirect_url: `${window.location.origin}/?kyc_success=true`
        }),
      });
      
      const data = await res.json();
      
      if (data.url) {
        // Redirect the user to Didit
        window.location.href = data.url;
      } else {
        pushCitizenToast("Error", "Backend rejected session request.");
        console.error("Backend Response:", data);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      pushCitizenToast("Connection Error", "Is the backend running?");
    }
  };
  // Attach stream and play
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.play().catch((err) => console.warn("Video play failed:", err));
    }
  }, [showCamera, stream]);

  // Cleanup stream
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  // Reverse geocode helper (Nominatim)
  const reverseGeocode = async (lat: number, lng: number) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Reverse geocoding failed");
    const json = await res.json();

    const a: RevGeoAddress = json?.address || {};
    const street = a.road || a.pedestrian || a.footway || a.neighbourhood || "";
    const barangay = a.suburb || a.quarter || a.village || a.hamlet || a.neighbourhood || "";
    const city = a.city || a.town || a.municipality || "";
    const province = a.state || a.region || "";

    const parts = [street, barangay, city, province].filter(Boolean);
    const label = parts.length ? parts.join(", ") : json?.display_name;

    return { street, barangay, city, province, label };
  };

  const handleCaptureLocation = async () => {
    if (isCapturingLocation) return;
    setIsCapturingLocation(true);

    try {
      if (!("geolocation" in navigator)) throw new Error("No geolocation");

      const pos: GeolocationPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setLocation({ lat, lng });

      try {
        const details = await reverseGeocode(lat, lng);
        setGeoDetails(details);
        setAddress(details?.label || "GPS Captured");
      } catch {
        setGeoDetails(null);
        setAddress("GPS Captured (address unavailable)");
      }
    } catch {
      // fallback
      setLocation({ lat: 5.068, lng: 119.775 });
      setGeoDetails({
        street: "",
        barangay: "",
        city: "Bongao",
        province: "Tawi-Tawi",
        label: "Bongao, Tawi-Tawi",
      });
      setAddress("Location services denied. Using default (Bongao, Tawi-Tawi).");
    } finally {
      setIsCapturingLocation(false);
    }
  };

  // Camera Logic
  const startCamera = async () => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Please allow camera access in your browser settings to capture evidence.");
    }
  };

  const toggleCamera = () =>
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));

  useEffect(() => {
    if (showCamera) startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraFacing]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (cameraFacing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setImagePreview(dataUrl);
    stopCamera();
  };

  // Government ID upload
  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdateUser({
        accountVerificationStatus: "pending",
        idImageUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedId = () => {
    const ok = window.confirm(
      "Remove your uploaded ID? This will set your status back to Unverified."
    );
    if (!ok) return;

    onUpdateUser({
      accountVerificationStatus: "unverified",
      idImageUrl: undefined as any, // if your Firestore uses null, change this to null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !location) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));

    onSubmit({
      incidentType,
      description,
      latitude: location.lat,
      longitude: location.lng,
      addressLandmark: address || geoDetails?.label || "Current Location",
      imageUrl: imagePreview || `https://picsum.photos/seed/${Date.now()}/600/400`,
    });

    setIsSubmitting(false);
    setDescription("");
    setAddress("");
    setGeoDetails(null);
    setLocation(null);
    setImagePreview(null);
    setView("history");
  };

  const openDeleteModal = (report: Report) => {
    setDeleteTarget(report);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteResolved = async () => {
    if (!deleteTarget) return;

    if (!onDeleteReport) {
      pushCitizenToast("Delete not available", "Delete is not wired yet in App.tsx.");
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      return;
    }

    setDeleteBusy(true);
    try {
      await onDeleteReport(deleteTarget.id);

      // cleanup persisted seen state
      const prev = seenRef.current;
      const next: SeenState = { ack: { ...prev.ack }, status: { ...prev.status } };
      delete next.ack[deleteTarget.id];
      delete next.status[deleteTarget.id];
      seenRef.current = next;
      saveSeen(user.id, next);

      pushCitizenToast("Deleted", "Resolved report removed from your history.");
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete report. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const statusChip =
    user.accountVerificationStatus === "verified" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200">
        <ShieldCheck className="h-4 w-4" />
        Verified
      </span>
    ) : user.accountVerificationStatus === "pending" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-700 ring-1 ring-amber-200">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Pending
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600 ring-1 ring-slate-200">
        <AlertTriangle className="h-4 w-4" />
        Unverified
      </span>
    );

  return (
    <div className="mx-auto max-w-2xl pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Citizen toast host */}
      {citizenToasts.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] max-w-md space-y-2">
          {citizenToasts.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl bg-white border border-emerald-200 shadow-2xl px-5 py-4"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">
                {t.title}
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">{t.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 -mx-4 mb-5 bg-slate-50/85 px-4 pt-3 backdrop-blur-md">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Citizen Portal
              </p>
              <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-900">
                {view === "form"
                  ? "Create Emergency Alert"
                  : view === "history"
                  ? "Your Incident History"
                  : "Your Account"}
              </h2>
            </div>
            <div className="shrink-0">{statusChip}</div>
          </div>

          {/* Tabs */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200">
              <button
                onClick={() => setView("form")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition-all focus:outline-none focus:ring-2 focus:ring-rose-400 active:scale-[0.99] ${
                  view === "form"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200"
                }`}
                aria-pressed={view === "form"}
              >
                <AlertTriangle className="h-5 w-5" />
                Report
              </button>

              <button
                onClick={() => setView("history")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition-all focus:outline-none focus:ring-2 focus:ring-rose-400 active:scale-[0.99] ${
                  view === "history"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200"
                }`}
                aria-pressed={view === "history"}
              >
                <History className="h-5 w-5" />
                History
              </button>

              <button
                onClick={() => setView("account")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition-all focus:outline-none focus:ring-2 focus:ring-rose-400 active:scale-[0.99] ${
                  view === "account"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200"
                }`}
                aria-pressed={view === "account"}
              >
                <UserIcon className="h-5 w-5" />
                Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FORM VIEW */}
      {view === "form" ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {user.accountVerificationStatus !== "verified" && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="h-fit rounded-2xl bg-amber-100 p-2 text-amber-700">
                  <Info className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-amber-900">
                    Unverified account
                  </h4>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-amber-800">
                    You can still submit reports, but they will appear as{" "}
                    <strong>Unverified</strong>. Upload a government ID to request
                    verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView("account")}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-xs font-black text-amber-900 transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 active:scale-[0.99]"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Upload ID in Account
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900">
                  Incident details
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Select a type, add details, then attach your location and evidence
                  photo.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Incident type */}
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Emergency type
                </label>

                <div className="grid grid-cols-3 gap-3">
                  {(
                    ["fire", "crime", "medical", "accident", "flood", "other"] as IncidentType[]
                  ).map((t) => {
                    const s = INCIDENT_STYLES[t];
                    const isActive = incidentType === t;

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setIncidentType(t)}
                        className={[
                          "rounded-2xl border-2 px-3 py-3 text-sm font-black capitalize transition-all",
                          "focus:outline-none focus:ring-2 active:scale-[0.99]",
                          s.focus,
                          isActive ? s.active : s.inactive,
                        ].join(" ")}
                        aria-pressed={isActive}
                        title={`Set type: ${t}`}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                          <span>{t}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-[11px] font-bold text-slate-400">
                  Selected:{" "}
                  <span className="font-black text-slate-600">{incidentType}</span>
                </p>
              </div>

              {/* Description */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Description
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[150px] rounded-2xl border-2 border-slate-100 bg-white p-4 font-medium text-slate-800 placeholder:text-slate-300 transition-colors focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="What is happening? Include landmarks, hazards, or people involved."
                  required
                  maxLength={500}
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* GPS button */}
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={isCapturingLocation}
                  className={`group flex items-center justify-center rounded-2xl px-4 py-4 font-black text-white shadow-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-60 active:scale-[0.99] ${
                    isCapturingLocation
                      ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300"
                      : location
                      ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300"
                      : "bg-slate-900 hover:bg-slate-800 focus:ring-slate-400"
                  }`}
                >
                  <div className="relative flex items-center justify-center gap-3">
                    {isCapturingLocation ? (
                      <span className="relative inline-flex items-center justify-center">
                        <span className="absolute inline-flex h-9 w-9 rounded-full bg-emerald-400/30 animate-ping" />
                        <span className="absolute inline-flex h-9 w-9 rounded-full ring-2 ring-emerald-200/80" />
                        <MapPin className="h-5 w-5 text-white/95" />
                      </span>
                    ) : (
                      <MapPin className="h-5 w-5 opacity-90 transition-transform group-hover:-translate-y-0.5" />
                    )}

                    <span>
                      {isCapturingLocation
                        ? "Locating…"
                        : location
                        ? "Location attached"
                        : "Get my location"}
                    </span>
                  </div>
                </button>

                {/* Evidence button */}
                <button
                  type="button"
                  onClick={startCamera}
                  className={`group flex items-center justify-center gap-3 rounded-2xl border-2 px-4 py-4 font-black shadow-sm transition-all focus:outline-none focus:ring-2 active:scale-[0.99] ${
                    imagePreview
                      ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-50 focus:ring-emerald-400"
                      : "border-rose-100 bg-rose-50/50 text-rose-700 hover:bg-rose-50 focus:ring-rose-400"
                  }`}
                >
                  <Camera className="h-5 w-5 opacity-90 transition-transform group-hover:-translate-y-0.5" />
                  {imagePreview ? "Evidence attached" : "Capture evidence"}
                </button>
              </div>

              {/* Location details */}
              {location && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-inner">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-800">
                      <MapPin className="h-4 w-4" />
                      Location attached
                    </p>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </span>
                  </div>

                  {geoDetails?.label && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-white/70 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">
                        Detected address
                      </p>
                      <p className="mt-1 text-sm font-black text-emerald-900">
                        {geoDetails.label}
                      </p>

                      {(geoDetails.street || geoDetails.barangay) && (
                        <p className="mt-2 text-[11px] font-bold text-emerald-800/80">
                          {geoDetails.street ? `Street: ${geoDetails.street}` : ""}
                          {geoDetails.street && geoDetails.barangay ? " • " : ""}
                          {geoDetails.barangay
                            ? `Barangay: ${geoDetails.barangay}`
                            : ""}
                        </p>
                      )}
                    </div>
                  )}

                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder='Add extra landmark details (e.g. "2nd floor, blue building")'
                    className="w-full rounded-xl border border-emerald-200 bg-white/70 px-3 py-3 font-bold text-emerald-900 placeholder:text-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              )}

              {/* Photo preview */}
              {imagePreview && (
                <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={imagePreview}
                      className="h-60 w-full object-cover"
                      alt="Evidence"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
                      <span className="rounded-full bg-emerald-600/75 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur">
                        Evidence attached
                      </span>
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-rose-700 shadow-sm backdrop-blur transition-colors hover:bg-rose-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-300 active:scale-[0.99]"
                        aria-label="Remove attached photo"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky submit */}
          <div className="sticky bottom-3 z-20">
            <div className="rounded-3xl bg-white/85 p-2 backdrop-blur-md ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.12)]">
              <button
                type="submit"
                disabled={isSubmitting || !location}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-600 p-5 text-lg font-black tracking-[0.12em] text-white shadow-xl shadow-rose-200 transition-all hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50 active:scale-[0.99]"
              >
                <Send className="h-6 w-6" />
                {isSubmitting
                  ? "TRANSMITTING…"
                  : !location
                  ? "ATTACH LOCATION TO SEND"
                  : "SEND EMERGENCY ALERT"}
              </button>
            </div>
          </div>
        </form>
      ) : view === "history" ? (
        /* HISTORY VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              Incident history
            </h3>
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600 ring-1 ring-rose-100">
              {myReports.length} report{myReports.length === 1 ? "" : "s"}
            </span>
          </div>

          {myReports.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-slate-200" />
              <p className="font-medium text-slate-500">No reports yet.</p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Create a report from the{" "}
                <span className="font-black text-slate-500">Report</span> tab.
              </p>
            </div>
          ) : (
            myReports
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              .map((report) => {
                const isResolved = report.currentStatus === "resolved";
                const acknowledgedAt = String(report.acknowledgedAt ?? "");
                const isAcknowledged = !!acknowledgedAt;

                return (
                  <div
                    key={report.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-rose-200 hover:shadow-md"
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <img
                          src={report.imageUrl || "https://picsum.photos/seed/fallback/200/200"}
                          className="h-24 w-24 shrink-0 rounded-2xl border bg-slate-100 object-cover shadow-inner"
                          alt="Incident"
                          loading="lazy"
                        />
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 ring-1 ring-slate-200 shadow-sm">
                          {report.incidentType}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-black text-slate-900">
                              {report.addressLandmark}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500 italic">
                              “{report.description}”
                            </p>
                          </div>
                          <span className="whitespace-nowrap text-[10px] font-bold text-slate-400">
                            {new Date(report.createdAt).toLocaleString([], {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm ring-1 ${
                                isResolved
                                  ? "bg-emerald-500 text-white ring-emerald-300"
                                  : report.currentStatus === "submitted"
                                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                                  : "bg-blue-600 text-white ring-blue-300"
                              }`}
                            >
                              {report.currentStatus.replace("_", " ")}
                            </span>

                            {isAcknowledged && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200">
                                <CheckCircle2 className="h-4 w-4" />
                                Acknowledged
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-bold text-slate-300">
                            ID: {report.id}
                          </span>
                        </div>

                        <div className="mt-4 flex justify-end">
                          {isResolved ? (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(report)}
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-700 ring-1 ring-rose-100 hover:bg-rose-600 hover:text-white transition-all active:scale-[0.99]"
                              title="Delete resolved report"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                              Deletable after resolved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      ) : (
        /* ACCOUNT VIEW */
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="relative mx-auto mb-6 inline-block">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-rose-50 text-rose-600 shadow-inner">
                <UserIcon className="h-14 w-14" />
              </div>
              {user.accountVerificationStatus === "verified" && (
                <div className="absolute bottom-1 right-1 rounded-full border-4 border-white bg-emerald-500 p-1.5 text-white shadow-md">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              )}
            </div>

            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              {user.fullName}
            </h3>
            <p className="mt-1 font-medium text-slate-500">{user.phone}</p>

            <div className="mt-6">{statusChip}</div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-medium text-slate-600">
                Upload a clear photo of your <strong>Government-issued ID</strong>{" "}
                to request verification. Verified accounts are prioritized by dispatch.
              </p>
            </div>
          </div>

          {/* INSTANT VERIFICATION CARD */}
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/30 to-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">
                  Instant Verification
                </h4>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Fast, automated KYC verification powered by Didit.me. Verify your identity in seconds.
                </p>
              </div>

              <div className="shrink-0 rounded-2xl bg-emerald-50 p-3 text-emerald-600 ring-1 ring-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleStartKYC}
                disabled={user.accountVerificationStatus === "verified"}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-4 font-black text-white shadow-lg transition-all focus:outline-none focus:ring-2 active:scale-[0.99] ${
                  user.accountVerificationStatus === "verified"
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
                {user.accountVerificationStatus === "verified" ? "Account Verified" : "Verify Automatically"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <div className="h-px w-16 bg-slate-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              OR MANUAL FALLBACK
            </span>
            <div className="h-px w-16 bg-slate-200" />
          </div>

          {/* Government ID Upload Card (Manual Fallback) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">
                  Manual Document Upload
                </h4>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Examples: Driver’s License, PhilSys ID, Passport, UMID, PRC ID.
                </p>
              </div>

              <div className="shrink-0 rounded-2xl bg-rose-50 p-3 text-rose-600 ring-1 ring-rose-100">
                <ImageIcon className="h-5 w-5" />
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={idInputRef}
              onChange={handleIdUpload}
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => idInputRef.current?.click()}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-4 font-black text-white shadow-lg transition-all focus:outline-none focus:ring-2 active:scale-[0.99] ${
                  user.accountVerificationStatus === "verified"
                    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400"
                    : user.accountVerificationStatus === "pending"
                    ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-400"
                    : "bg-rose-600 hover:bg-rose-700 focus:ring-rose-400"
                }`}
              >
                <Upload className="h-5 w-5" />
                {user.idImageUrl ? "Re-upload ID" : "Upload ID"}
              </button>

              <button
                type="button"
                disabled={!user.idImageUrl}
                onClick={removeUploadedId}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-50 px-4 py-4 font-black text-rose-700 ring-1 ring-rose-100 transition-all hover:bg-rose-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                <Trash2 className="h-5 w-5" />
                Remove ID
              </button>
            </div>

            {user.idImageUrl ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <div className="overflow-hidden rounded-2xl bg-white shadow-inner">
                  <img
                    src={user.idImageUrl}
                    className="h-56 w-full object-contain"
                    alt="Government ID"
                    loading="lazy"
                  />
                </div>

                {user.accountVerificationStatus === "pending" && (
                  <p className="mt-4 text-center text-[10px] font-black uppercase italic tracking-[0.25em] text-amber-600">
                    Queued for manual dispatch review
                  </p>
                )}
                {user.accountVerificationStatus === "verified" && (
                  <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
                    Verified
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-center text-[11px] font-bold text-slate-400">
                No ID uploaded yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => !deleteBusy && setDeleteConfirmOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b bg-gradient-to-b from-slate-50 to-white">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Confirm Action
              </p>
              <h3 className="mt-2 text-lg font-black text-slate-900 uppercase tracking-tight">
                Delete resolved report?
              </h3>
              <p className="mt-2 text-xs font-bold text-slate-500">
                This cannot be undone.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {!onDeleteReport ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-black text-amber-900">Delete not wired</p>
                  <p className="text-xs font-bold text-amber-800 mt-1">
                    Add <span className="font-black">onDeleteReport</span> in App.tsx to
                    delete from Firestore.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-black text-rose-900">
                    You’re about to remove this record
                  </p>
                  <p className="text-xs font-bold text-rose-800 mt-1">
                    ID: {deleteTarget?.id} • {deleteTarget?.addressLandmark}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleteBusy}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50 disabled:opacity-50 active:scale-[0.99]"
                >
                  Cancel
                </button>

                <button
                  disabled={deleteBusy || !onDeleteReport || !deleteTarget}
                  onClick={confirmDeleteResolved}
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-50 active:scale-[0.99]"
                >
                  {deleteBusy ? "DELETING…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
          {/* Top bar */}
          <div className="absolute top-0 z-[110] w-full bg-gradient-to-b from-black/95 to-transparent px-4 pb-6 pt-5 text-white">
            <div className="mx-auto flex max-w-lg items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-red-600 shadow-[0_0_18px_rgba(220,38,38,0.9)]" />
                <h4 className="text-xs font-black uppercase tracking-[0.25em] opacity-95">
                  Evidence camera
                </h4>
              </div>
              <button
                onClick={stopCamera}
                className="rounded-full bg-white/15 p-2.5 shadow-lg transition-colors hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 active:scale-[0.99]"
                aria-label="Close camera"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Camera preview */}
          <div className="relative w-full max-w-lg overflow-hidden bg-slate-900 shadow-[0_0_60px_rgba(0,0,0,0.65)] md:rounded-[2rem] md:ring-1 md:ring-white/10">
            <div className="aspect-[3/4]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
              />
            </div>

            {/* Switch camera */}
            <div className="absolute bottom-4 left-4">
              <button
                onClick={toggleCamera}
                className="rounded-full border border-white/20 bg-black/45 p-3 text-white backdrop-blur-md transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 active:scale-[0.99]"
                aria-label="Switch camera"
              >
                <FlipHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="mt-8 flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={takePhoto}
              className="flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-slate-200/40 bg-white p-1 shadow-2xl transition-all hover:border-white active:scale-90"
              aria-label="Take photo"
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-rose-600 shadow-inner transition-colors hover:bg-rose-700">
                <Camera className="h-10 w-10 text-white" />
              </div>
            </button>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70">
              Center the incident, then tap
            </p>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default CitizenPortal;