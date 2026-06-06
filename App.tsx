import React, { useEffect, useRef, useState } from "react";
import { User, Report, IncidentType, AccountVerificationStatus } from "./types";

import Layout from "./components/Layout";
import ReportsDashboard from "./views/ReportsDashboard";
import IncidentMap from "./views/IncidentMap";
import Analytics from "./views/Analytics";
import CitizenPortal from "./views/CitizenPortal";
import UserVerification from "./views/UserVerification";
import AgencyAccounts from "./views/AgencyAccounts";
import DeviceGate from "./views/DeviceGate";
import Logo from "./components/Logo";
import InstallAppButton from "./components/InstallAppButton";
import CitizenIntro from "./components/CitizenIntro";

import useIsMobile from "./hooks/useIsMobile";

import {
  Lock,
  UserPlus,
  ArrowLeft,
  Mail,
  Phone,
  User as UserIcon,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  MapPin,
  Bell,
  CheckCircle2,
} from "lucide-react";

import { listenAuth, login, registerCitizen, logout } from "./services/auth";
import {
  listenReports,
  createReport,
  updateReport,
  deleteReport,
  listenCitizens,
  verifyCitizen,
  updateUser,
} from "./services/firestore";

function friendlyAuthError(err: any) {
  const code = err?.code || "";
  if (code.includes("auth/invalid-credential"))
    return "Invalid credentials. Check username/email and password.";
  if (code.includes("auth/user-not-found")) return "Account not found.";
  if (code.includes("auth/wrong-password")) return "Wrong password.";
  if (code.includes("auth/email-already-in-use")) return "Email already in use.";
  if (code.includes("auth/weak-password"))
    return "Password is too weak (try 6+ characters).";
  if (code.includes("auth/operation-not-allowed"))
    return "Enable Email/Password provider in Firebase Auth.";
  return err?.message || "Authentication failed.";
}

const GPS_TAGS: Array<{ top: string; left: string; delay: string; scale: number }> =
  [
    { top: "14%", left: "18%", delay: "-0.3s", scale: 0.95 },
    { top: "22%", left: "62%", delay: "-1.2s", scale: 1.05 },
    { top: "34%", left: "32%", delay: "-2.1s", scale: 0.9 },
    { top: "40%", left: "76%", delay: "-0.9s", scale: 1.1 },
    { top: "52%", left: "14%", delay: "-1.7s", scale: 1.0 },
    { top: "58%", left: "46%", delay: "-2.6s", scale: 0.92 },
    { top: "64%", left: "84%", delay: "-1.4s", scale: 1.06 },
    { top: "74%", left: "28%", delay: "-2.9s", scale: 1.02 },
    { top: "78%", left: "60%", delay: "-0.6s", scale: 0.96 },
    { top: "18%", left: "86%", delay: "-2.4s", scale: 0.9 },
    { top: "30%", left: "10%", delay: "-1.0s", scale: 1.08 },
    { top: "46%", left: "56%", delay: "-3.1s", scale: 0.92 },
    { top: "70%", left: "72%", delay: "-2.0s", scale: 1.04 },
    { top: "86%", left: "40%", delay: "-1.6s", scale: 0.94 },
  ];

type ToastTone = "rose" | "amber" | "blue" | "emerald" | "slate";
type ToastAction = "map" | "confirm_resolved" | "none";

type AppToast = {
  id: string;
  title: string;
  message: string;
  reportId: string;
  tone: ToastTone;
  createdAt: number;
  action?: ToastAction;
};

const toneClasses: Record<
  ToastTone,
  { bg: string; ring: string; text: string; badge: string }
> = {
  rose: {
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    text: "text-rose-900",
    badge: "bg-rose-600 text-white",
  },
  amber: {
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    text: "text-amber-900",
    badge: "bg-amber-600 text-white",
  },
  blue: {
    bg: "bg-blue-50",
    ring: "ring-blue-200",
    text: "text-blue-900",
    badge: "bg-blue-600 text-white",
  },
  emerald: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    text: "text-emerald-900",
    badge: "bg-emerald-600 text-white",
  },
  slate: {
    bg: "bg-slate-50",
    ring: "ring-slate-200",
    text: "text-slate-900",
    badge: "bg-slate-900 text-white",
  },
};

// ---------- Canon helpers ----------
const canonAgency = (v: any) => {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "NONE";
  if (s === "N/A") return "NONE";
  return s;
};

const canonStatus = (v: any) => {
  const raw = String(v ?? "").trim().toLowerCase();
  let s = raw.replace(/[\s-]+/g, "_").replace(/_+/g, "_");

  if (s === "enroute") s = "en_route";
  if (s === "onscene") s = "on_scene";

  if (s === "closed" || s === "done") s = "resolved";
  if (s === "dispatched") s = "assigned";
  if (s === "new") s = "submitted";

  return s;
};

const canonVer = (v: any) => String(v ?? "").trim().toLowerCase();

type NotifSnap = {
  agency: string;
  status: string;
  ver: string;
  ackAtMs: number;
  updatedAtMs: number;
  createdAtMs: number;
};

const App: React.FC = () => {
  const isMobile = useIsMobile();
  const [authReady, setAuthReady] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [citizens, setCitizens] = useState<User[]>([]);

  const [activeView, setActiveView] = useState("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(false);

  const [loginData, setLoginData] = useState({ identifier: "", password: "" });
  const [regData, setRegData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [lastReportsSync, setLastReportsSync] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [toasts, setToasts] = useState<AppToast[]>([]);

  const [focusReportId, setFocusReportId] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);

  const [reportsHydrated, setReportsHydrated] = useState(false);

  const firstNotifLoadRef = useRef(true);
  const prevNotifSnapRef = useRef<Map<string, NotifSnap>>(new Map());

  const sessionStartMsRef = useRef<number>(Date.now());

  const parseIsoMs = (v: any) => {
    if (!v) return 0;
    if (typeof v === "object" && typeof (v as any)?.toDate === "function") {
      try {
        return (v as any).toDate().getTime();
      } catch {
        return 0;
      }
    }
    const ms = Date.parse(String(v));
    return Number.isFinite(ms) ? ms : 0;
  };

  const reportUpdatedMs = (r: any) =>
    parseIsoMs((r as any)?.updatedAt) || parseIsoMs((r as any)?.createdAt) || 0;

  //  centered success toast
  const [centerResolvedOpen, setCenterResolvedOpen] = useState(false);
  const centerResolvedTimerRef = useRef<number | null>(null);

  const showCenterResolvedToast = () => {
    if (centerResolvedTimerRef.current)
      window.clearTimeout(centerResolvedTimerRef.current);
    setCenterResolvedOpen(true);
    centerResolvedTimerRef.current = window.setTimeout(
      () => setCenterResolvedOpen(false),
      1500
    );
  };

  const pushToast = (t: Omit<AppToast, "id" | "createdAt">) => {
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const toast: AppToast = { ...t, id, createdAt: Date.now(), action: t.action ?? "map" };

    setToasts((prev) => [toast, ...prev].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 7500);
  };

  const goToReportOnMap = (reportId: string) => {
    setActiveView("map");
    setFocusReportId(reportId);
    setFocusSignal((v) => v + 1);
  };

  const confirmResolvedNotification = (t: AppToast) => {
    setToasts((p) => p.filter((x) => x.id !== t.id));
    showCenterResolvedToast();
  };

  /**
   *  In-app notifications (Admin + Agency only)
   */
  useEffect(() => {
    if (!user) return;
    if (!reportsHydrated) return;

    const sessionStart = sessionStartMsRef.current;

    const snap = new Map<string, NotifSnap>();
    for (const r of reports) {
      const agency = canonAgency(
        (r as any).assignedAgency ?? (r as any).agencyAssigned ?? r.assignedAgency
      );
      const status = canonStatus((r as any).currentStatus ?? (r as any).status ?? r.currentStatus);
      const ver = canonVer((r as any).verificationStatus ?? r.verificationStatus);
      const ackAtMs = parseIsoMs((r as any).acknowledgedAt);
      const updatedAtMs = reportUpdatedMs(r);
      const createdAtMs = parseIsoMs((r as any).createdAt);

      snap.set(r.id, { agency, status, ver, ackAtMs, updatedAtMs, createdAtMs });
    }

    if (firstNotifLoadRef.current) {
      firstNotifLoadRef.current = false;
      prevNotifSnapRef.current = snap;
      return;
    }

    const prev = prevNotifSnapRef.current;

    const myAgency = canonAgency((user as any).agency ?? user.agency ?? "");
    const isAdmin = user.userType === "pdrrmo_admin";
    const isAgency = user.userType === "agency_admin";

    for (const r of reports) {
      const now = snap.get(r.id);
      if (!now) continue;

      const was = prev.get(r.id);

      if (now.ver === "false") continue;

      if (!was) {
        if (isAdmin && now.createdAtMs > sessionStart) {
          pushToast({
            tone: "rose",
            reportId: r.id,
            title: "NEW REPORT",
            message: `${String(r.incidentType).toUpperCase()} • ${r.addressLandmark}`,
            action: "map",
          });
        }

        if (isAgency && now.agency === myAgency && now.updatedAtMs > sessionStart) {
          pushToast({
            tone: "rose",
            reportId: r.id,
            title: "NEW ASSIGNMENT",
            message: `${String(r.incidentType).toUpperCase()} • ${r.addressLandmark}`,
            action: "map",
          });
        }

        continue;
      }

      if (was.agency !== now.agency && now.updatedAtMs > sessionStart) {
        if (isAgency && now.agency === myAgency) {
          pushToast({
            tone: "rose",
            reportId: r.id,
            title: "NEW ASSIGNMENT",
            message: `${String(r.incidentType).toUpperCase()} • ${r.addressLandmark}`,
            action: "map",
          });
        }

        if (isAdmin && now.agency !== "NONE") {
          pushToast({
            tone: "rose",
            reportId: r.id,
            title: "DISPATCHED",
            message: `${now.agency} • ${r.addressLandmark}`,
            action: "map",
          });
        }
      }

      if (was.status !== now.status && now.updatedAtMs > sessionStart) {
        if (isAgency && now.agency === myAgency) {
          if (now.status === "en_route") {
            pushToast({
              tone: "blue",
              reportId: r.id,
              title: "EN ROUTE",
              message: `${String(r.incidentType).toUpperCase()} • ${r.addressLandmark}`,
              action: "map",
            });
          } else if (now.status === "on_scene") {
            pushToast({
              tone: "amber",
              reportId: r.id,
              title: "ON SCENE",
              message: `${String(r.incidentType).toUpperCase()} • ${r.addressLandmark}`,
              action: "map",
            });
          }
        }

        if (isAdmin) {
          const unit = now.agency && now.agency !== "NONE" ? now.agency : "UNIT";

          if (now.status === "en_route") {
            pushToast({
              tone: "blue",
              reportId: r.id,
              title: "UNIT EN ROUTE",
              message: `${unit} • ${r.addressLandmark}`,
              action: "map",
            });
          } else if (now.status === "on_scene") {
            pushToast({
              tone: "amber",
              reportId: r.id,
              title: "UNIT ON SCENE",
              message: `${unit} • ${r.addressLandmark}`,
              action: "map",
            });
          } else if (now.status === "resolved") {
            pushToast({
              tone: "slate",
              reportId: r.id,
              title: "RESOLVED UPDATE",
              message: `${unit} • ${r.addressLandmark}`,
              action: "confirm_resolved",
            });
          }
        }
      }

      if (was.ackAtMs !== now.ackAtMs && now.ackAtMs > 0 && now.ackAtMs > sessionStart) {
        if (isAdmin) {
          const unit = now.agency && now.agency !== "NONE" ? now.agency : "UNIT";
          pushToast({
            tone: "emerald",
            reportId: r.id,
            title: "ACKNOWLEDGED",
            message: `${unit} • ${r.addressLandmark}`,
            action: "map",
          });
        }
      }
    }

    prevNotifSnapRef.current = snap;
  }, [reportsHydrated, reports, user?.id, user?.userType, (user as any)?.agency]);

  // viewport vars
  useEffect(() => {
    const setViewportVars = () => {
      const vv = window.visualViewport;
      const visibleH = vv?.height ?? window.innerHeight;
      const keyboardH = vv
        ? Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0))
        : 0;

      document.documentElement.style.setProperty("--app-height", `${visibleH}px`);
      document.documentElement.style.setProperty("--keyboard", `${keyboardH}px`);
    };

    setViewportVars();

    window.addEventListener("resize", setViewportVars);
    window.visualViewport?.addEventListener("resize", setViewportVars);
    window.visualViewport?.addEventListener("scroll", setViewportVars);

    return () => {
      window.removeEventListener("resize", setViewportVars);
      window.visualViewport?.removeEventListener("resize", setViewportVars);
      window.visualViewport?.removeEventListener("scroll", setViewportVars);
    };
  }, []);

  useEffect(() => {
    if (user) return;

    const onFocusIn = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const tag = el.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        el.getAttribute("contenteditable") === "true"
      ) {
        setTimeout(() => {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 250);
      }
    };

    window.addEventListener("focusin", onFocusIn);
    return () => window.removeEventListener("focusin", onFocusIn);
  }, [user]);

  useEffect(() => {
    const unsub = listenAuth((u) => {
      setUser(u);
      setAuthReady(true);

      firstNotifLoadRef.current = true;
      prevNotifSnapRef.current = new Map();
      setToasts([]);

      setReportsHydrated(false);

      if (u) sessionStartMsRef.current = Date.now();
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) return;
    setAuthLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.userType === "citizen") setActiveView("reports");
    else setActiveView("dashboard");
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setCitizens([]);
      setReportsHydrated(false);
      return;
    }

    const unsubReports = listenReports(user, (rows) => {
      setReports(rows);
      setReportsHydrated(true);
    });

    let unsubCitizens = () => {};
    if (user.userType === "pdrrmo_admin") {
      unsubCitizens = listenCitizens(setCitizens);
    } else {
      setCitizens([]);
    }

    return () => {
      unsubReports?.();
      unsubCitizens?.();
    };
  }, [user?.id, user?.userType, (user as any)?.agency]);

  useEffect(() => {
    if (!user) return;
    setLastReportsSync(new Date().toISOString());
  }, [reports, user?.id]);

  const handleLogout = async () => {
    await logout();
    setAuthMode("login");
    setAuthError(null);
    setLoginData({ identifier: "", password: "" });
    setShowPassword(false);
    setShowRegPassword(false);

    setToasts([]);
    firstNotifLoadRef.current = true;
    prevNotifSnapRef.current = new Map();

    setReportsHydrated(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;

    setAuthError(null);
    setAuthLoading(true);

    try {
      await login(loginData.identifier, loginData.password);
    } catch (err) {
      setAuthError(friendlyAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;

    setAuthError(null);
    setAuthLoading(true);

    try {
      await registerCitizen({
        email: regData.email,
        password: regData.password,
        fullName: regData.fullName,
        phone: regData.phone,
      });
    } catch (err) {
      setAuthError(friendlyAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const onUpdateReport = async (id: string, updates: Partial<Report>) => {
    if (user?.userType === "agency_admin" && (updates as any).currentStatus === "resolved") {
      showCenterResolvedToast();
    }

    const payload: Partial<Report> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)));

    try {
      await updateReport(id, payload);
    } catch (e) {
      console.error(e);
    }
  };

  const onUpdateUser = async (updates: Partial<User>) => {
    if (!user) return;
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    try {
      await updateUser(user.id, updates);
    } catch (e) {
      console.error(e);
    }
  };

  const onVerifyUser = async (userId: string, status: AccountVerificationStatus) => {
    try {
      await verifyCitizen(userId, status);
    } catch (e) {
      console.error(e);
    }
  };

  const onSubmitReport = async (reportData: Partial<Report>) => {
    if (!user) return;

    const isUserVerified = user.accountVerificationStatus === "verified";

    const newReport: Report = {
      id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      userName: user.fullName,
      userPhone: (user as any).phone,
      userIsVerified: isUserVerified,
      incidentType: (reportData.incidentType || "other") as IncidentType,
      description: reportData.description || "",
      latitude: (reportData as any).latitude || 5.068,
      longitude: (reportData as any).longitude || 119.775,
      addressLandmark: reportData.addressLandmark || "Bongao",
      verificationStatus: "pending",
      priorityLevel: "none",
      currentStatus: "submitted",
      assignedAgency: "NONE",
      imageUrl: (reportData as any).imageUrl,
      acknowledgedAt: null,
      acknowledgedById: null,
      acknowledgedByName: null,
      acknowledgedByAgency: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setReports((prev) => [newReport, ...prev]);

    try {
      await createReport(newReport);
    } catch (e) {
      console.error(e);
    }
  };

  const onDeleteReport = async (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    try {
      await deleteReport(reportId);
    } catch (e) {
      console.error(e);
    }
  };

  //  INTRO (first open) — only for mobile citizens before login
  const INTRO_KEY = "respondph:citizen_intro_seen_v1";
  const [introSeen, setIntroSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(INTRO_KEY) === "1";
    } catch {
      return false;
    }
  });

  const completeIntro = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // ignore
    }
    setIntroSeen(true);
  };

  // ---------- Boot screen ----------
  if (!authReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <Logo className="w-16 h-16 mx-auto mb-4" />
          <p className="font-black text-slate-800 uppercase tracking-widest text-sm">
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  // ---------- Auth UI ----------
  if (!user) {
    //  Show onboarding intro ONLY on mobile, ONLY first open, then go to login page
    if (isMobile && !introSeen) {
      return <CitizenIntro onDone={completeIntro} />;
    }

    const MAP_SVG_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='900' viewBox='0 0 900 900'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.48' stroke-width='3'%3E%3Cpath d='M-20 120 C 120 80, 220 190, 360 150 S 600 70, 760 140 S 980 230, 980 230'/%3E%3Cpath d='M-20 280 C 160 220, 260 350, 420 300 S 640 220, 820 300 S 980 380, 980 380'/%3E%3Cpath d='M-20 460 C 160 420, 280 520, 430 470 S 650 390, 820 470 S 980 560, 980 560'/%3E%3Cpath d='M-20 650 C 150 610, 290 710, 430 660 S 660 580, 820 660 S 980 740, 980 740'/%3E%3Cpath d='M140 -20 C 90 140, 210 210, 160 350 S 120 590, 220 720 S 340 940, 340 940'/%3E%3Cpath d='M340 -20 C 280 140, 420 230, 350 380 S 260 600, 380 730 S 520 940, 520 940'/%3E%3Cpath d='M560 -20 C 510 120, 640 240, 560 400 S 420 620, 560 760 S 740 940, 740 940'/%3E%3Cpath d='M760 -20 C 700 120, 830 240, 760 420 S 620 650, 760 780 S 940 940, 940 940'/%3E%3Cpath d='M90 90 L 210 200 L 320 170'/%3E%3Cpath d='M520 260 L 640 330 L 760 300'/%3E%3Cpath d='M220 540 L 360 610 L 470 560'/%3E%3Cpath d='M610 620 L 700 700 L 820 660'/%3E%3C/g%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.26' stroke-width='1.6'%3E%3Cpath d='M0 0 H900 M0 150 H900 M0 300 H900 M0 450 H900 M0 600 H900 M0 750 H900 M0 900 H900'/%3E%3Cpath d='M0 0 V900 M150 0 V900 M300 0 V900 M450 0 V900 M600 0 V900 M750 0 V900 M900 0 V900'/%3E%3C/g%3E%3C/svg%3E")`;

    return (
      <div
        className="relative w-full bg-rose-600 overflow-hidden"
        style={{ height: "var(--app-height, 100vh)" }}
      >
        <style>{`
          @keyframes gpsDotFlicker {
            0%, 100% { opacity: .18; transform: translateY(0) scale(.95); filter: blur(0px); }
            45% { opacity: .72; transform: translateY(-1px) scale(1.05); filter: blur(.2px); }
            70% { opacity: .28; transform: translateY(0) scale(.98); }
          }
          @keyframes gpsRing {
            0% { transform: scale(.65); opacity: .0; }
            20% { opacity: .42; }
            100% { transform: scale(1.9); opacity: 0; }
          }
          @keyframes gpsFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>

        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.34]"
          style={{
            backgroundImage: MAP_SVG_BG,
            backgroundSize: "900px 900px",
            backgroundPosition: "center",
            mixBlendMode: "overlay",
          }}
        />

        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {GPS_TAGS.map((t, idx) => (
            <div
              key={idx}
              className="absolute"
              style={{
                top: t.top,
                left: t.left,
                transform: `translate(-50%, -50%) scale(${t.scale})`,
                animation: `gpsFloat 7.8s ease-in-out ${t.delay} infinite`,
                opacity: 0.95,
                mixBlendMode: "screen",
              }}
            >
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    border: "1.5px solid rgba(255,255,255,0.48)",
                    animation: `gpsRing 4.2s ease-out ${t.delay} infinite`,
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    border: "1px solid rgba(255,255,255,0.20)",
                    animation: `gpsRing 4.2s ease-out calc(${t.delay} - 1.3s) infinite`,
                  }}
                />
                <div
                  className="flex items-center gap-2 rounded-full px-2.5 py-1.5"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    backdropFilter: "blur(6px)",
                    animation: `gpsDotFlicker 5.2s ease-in-out ${t.delay} infinite`,
                  }}
                >
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: 7,
                      height: 7,
                      background: "rgba(255,255,255,0.90)",
                      boxShadow: "0 0 18px rgba(255,255,255,0.38)",
                    }}
                  />
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/80" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 520px at 20% 10%, rgba(255,255,255,0.14), transparent 58%)," +
              "radial-gradient(900px 520px at 85% 0%, rgba(0,0,0,0.14), transparent 62%)," +
              "linear-gradient(to bottom, rgba(136,19,55,0.28), rgba(225,29,72,0.52), rgba(88,13,36,0.28))",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.30)]"
        />

        <div
          className="relative z-10 h-full overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div
            className="min-h-full flex flex-col md:flex-row items-center justify-center p-6 gap-12"
            style={{
              paddingBottom:
                "calc(7rem + env(safe-area-inset-bottom) + var(--keyboard, 0px))",
            }}
          >
            <div className="max-w-md text-white space-y-6 text-center md:text-left">
              <Logo className="w-24 h-24 mx-auto md:mx-0 shadow-2xl scale-110" />
              <h1 className="text-6xl font-black leading-tight tracking-tighter">
                RESPOND.PH
              </h1>
              <p className="text-xl text-rose-100 font-medium">
                Tawi-Tawi&apos;s Unified Emergency Response and Disaster Management
                Platform.
              </p>
            </div>

            <div className="bg-white w-full max-w-lg p-8 rounded-3xl shadow-2xl space-y-6">
              {authMode === "login" ? (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                        Sign In
                      </h2>
                      <p className="text-slate-500 mt-1 font-medium">
                        Use email or username
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setAuthMode("register");
                        setShowPassword(false);
                        setShowRegPassword(false);
                      }}
                      className="flex flex-col items-center gap-1 text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      <UserPlus className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase">
                        Sign Up
                      </span>
                    </button>
                  </div>

                  {authError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <p className="text-sm font-bold text-amber-900">
                        {authError}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">
                        Email or Username
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          value={loginData.identifier}
                          onChange={(e) =>
                            setLoginData((p) => ({
                              ...p,
                              identifier: e.target.value,
                            }))
                          }
                          placeholder="name@respond.ph"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type={showPassword ? "text" : "password"}
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData((p) => ({
                              ...p,
                              password: e.target.value,
                            }))
                          }
                          placeholder="••••••••"
                          className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5 text-slate-500" />
                          ) : (
                            <Eye className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      {authLoading ? (
                        <span className="inline-flex items-center justify-center gap-3">
                          <span className="w-5 h-5 rounded-full border-2 border-white/90 border-t-transparent animate-spin" />
                          Signing In...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setShowPassword(false);
                        setShowRegPassword(false);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                      Citizen Registration
                    </h2>
                  </div>

                  {authError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <p className="text-sm font-bold text-amber-900">
                        {authError}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type="text"
                          value={regData.fullName}
                          onChange={(e) =>
                            setRegData({ ...regData, fullName: e.target.value })
                          }
                          placeholder="e.g. Juan Dela Cruz"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type="email"
                          value={regData.email}
                          onChange={(e) =>
                            setRegData({ ...regData, email: e.target.value })
                          }
                          placeholder="name@respond.ph"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type="tel"
                          value={regData.phone}
                          onChange={(e) =>
                            setRegData({ ...regData, phone: e.target.value })
                          }
                          placeholder="0917XXXXXXX"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">
                        Secure Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type={showRegPassword ? "text" : "password"}
                          value={regData.password}
                          onChange={(e) =>
                            setRegData({ ...regData, password: e.target.value })
                          }
                          placeholder="••••••••"
                          className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          aria-label={
                            showRegPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showRegPassword ? (
                            <EyeOff className="w-5 h-5 text-slate-500" />
                          ) : (
                            <Eye className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {authLoading ? (
                      <span className="inline-flex items-center justify-center gap-3">
                        <span className="w-5 h-5 rounded-full border-2 border-white/90 border-t-transparent animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isCitizen = user.userType === "citizen";
  const isAdminOrAgency =
    user.userType === "pdrrmo_admin" || user.userType === "agency_admin";

  if (isCitizen && !isMobile) {
    return (
      <DeviceGate
        title="Citizen Portal is Mobile-only"
        message="Open this on your phone to submit incident reports."
        showInstall={true}
        onLogout={handleLogout}
      />
    );
  }

  if (isAdminOrAgency && isMobile) {
    return (
      <DeviceGate
        title="Admin & Agency are Web-only"
        message="Open this on a computer to access dashboards and dispatch tools."
        showInstall={false}
        onLogout={handleLogout}
      />
    );
  }

  if (isCitizen && isMobile) {
    return (
      <div className="h-screen w-full bg-slate-50 overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10 rounded-xl shadow-sm" />
            <div className="leading-tight">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Citizen Portal
              </p>
              <p className="font-black text-slate-800">{user.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppButton />
            <button
              onClick={handleLogout}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-64px)] overflow-auto px-4 py-4">
          <CitizenPortal
            user={user}
            reports={reports}
            onSubmit={onSubmitReport}
            onUpdateUser={onUpdateUser}
            onDeleteReport={onDeleteReport}
          />
        </div>
      </div>
    );
  }

  const myAgency = canonAgency((user as any).agency ?? user.agency ?? "");
  const visibleReports =
    user.userType === "pdrrmo_admin"
      ? reports
      : reports.filter(
          (r) => canonAgency((r as any).assignedAgency ?? r.assignedAgency) === myAgency
        );

  const activeReports = visibleReports.filter((r) => {
    const s = canonStatus((r as any).currentStatus ?? r.currentStatus);
    const v = canonVer((r as any).verificationStatus ?? r.verificationStatus);
    return s !== "resolved" && v !== "false";
  });

  const pendingDispatch = activeReports.filter(
    (r) => canonVer((r as any).verificationStatus) === "pending"
  ).length;

  const closedCases = visibleReports.filter((r) => {
    const s = canonStatus((r as any).currentStatus ?? r.currentStatus);
    const v = canonVer((r as any).verificationStatus ?? r.verificationStatus);
    return s === "resolved" && v !== "false";
  }).length;

  const fieldUnitsLive = activeReports.filter((r) => {
    const s = canonStatus((r as any).currentStatus ?? r.currentStatus);
    return s === "en_route" || s === "on_scene";
  }).length;

  const threatLevel =
    activeReports.length >= 10 ||
    activeReports.some((r) => r.incidentType === "fire" || r.incidentType === "crime")
      ? "HIGH"
      : activeReports.length >= 5
      ? "MEDIUM"
      : "LOW";

  const threatClass =
    threatLevel === "HIGH"
      ? "text-rose-600"
      : threatLevel === "MEDIUM"
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <Layout
      user={user}
      onLogout={handleLogout}
      activeView={activeView}
      setActiveView={setActiveView}
    >
      {/*  CENTER SUCCESS TOAST */}
      {centerResolvedOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
          <div className="bg-white border border-emerald-200 rounded-3xl shadow-2xl px-6 py-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Incident Resolved
            </p>
          </div>
        </div>
      )}

      {/*  TOAST HOST (top-right) */}
      {(user.userType === "pdrrmo_admin" || user.userType === "agency_admin") &&
        toasts.length > 0 && (
          <div className="fixed top-5 right-5 z-[99999] space-y-3 w-[360px] max-w-[92vw]">
            {toasts.map((t) => {
              const cls = toneClasses[t.tone];
              const cardClickable =
                t.action === "confirm_resolved"
                  ? true
                  : t.action === "map"
                  ? true
                  : false;

              const onCardClick = () => {
                if (t.action === "confirm_resolved") confirmResolvedNotification(t);
                else if (t.action === "map") goToReportOnMap(t.reportId);
              };

              return (
                <div
                  key={t.id}
                  className={`rounded-3xl ${cls.bg} ring-1 ${cls.ring} shadow-2xl overflow-hidden ${
                    cardClickable ? "cursor-pointer" : ""
                  }`}
                  onClick={cardClickable ? onCardClick : undefined}
                  role={cardClickable ? "button" : undefined}
                  tabIndex={cardClickable ? 0 : -1}
                  onKeyDown={(e) => {
                    if (!cardClickable) return;
                    if (e.key === "Enter" || e.key === " ") onCardClick();
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.22em] ${cls.badge}`}
                        >
                          <Bell className="w-4 h-4" />
                          {t.title}
                        </span>
                        <p className={`mt-2 text-sm font-black ${cls.text} truncate`}>
                          {t.message}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                          ID: {t.reportId}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setToasts((p) => p.filter((x) => x.id !== t.id));
                        }}
                        className="shrink-0 rounded-2xl bg-white/70 hover:bg-white border border-slate-200 p-2"
                        aria-label="Dismiss"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4 text-slate-700" />
                      </button>
                    </div>

                    {t.action === "map" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToReportOnMap(t.reportId);
                        }}
                        className="mt-3 w-full rounded-2xl bg-slate-900 text-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        View on Map
                      </button>
                    )}

                    {t.action === "confirm_resolved" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmResolvedNotification(t);
                        }}
                        className="mt-3 w-full rounded-2xl bg-slate-900 text-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      <div className="h-full">
        {activeView === "dashboard" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_14px_rgba(16,185,129,0.65)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Live Feed
                </p>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Last update:{" "}
                <span className="text-slate-700">
                  {lastReportsSync
                    ? new Date(lastReportsSync).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "—"}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-rose-600 text-white p-6 rounded-2xl shadow-xl shadow-rose-200 border-b-4 border-rose-900">
                <span className="text-[10px] font-black uppercase opacity-80 tracking-[0.2em]">
                  Pending Dispatch
                </span>
                <p className="text-5xl font-black mt-1">{pendingDispatch}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Active Incidents
                </span>
                <p className="text-5xl font-black text-slate-800 mt-1">
                  {activeReports.length}
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Closed Cases
                </span>
                <p className="text-5xl font-black text-slate-800 mt-1">
                  {closedCases}
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${threatClass}`}>
                  Threat Level
                </span>
                <p className={`text-5xl font-black mt-1 ${threatClass}`}>{threatLevel}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Units deployed: <span className="text-slate-700">{fieldUnitsLive}</span>
                </p>
              </div>
            </div>
          </>
        )}

        {(activeView === "dashboard" || activeView === "reports") && (
          <div className="h-[calc(100vh-160px)]">
            <ReportsDashboard
              reports={visibleReports}
              user={user}
              onUpdateReport={onUpdateReport}
            />
          </div>
        )}

        {activeView === "map" && (
          <div className="h-[calc(100vh-160px)]">
            <IncidentMap
              reports={visibleReports}
              focusReportId={focusReportId}
              focusSignal={focusSignal}
              onSelectReport={(report) => {
                setActiveView("reports");
                setTimeout(() => {
                  (window as any).openIncidentFile?.(report.id);
                }, 80);
              }}
            />
          </div>
        )}

        {activeView === "user-auth" && (
          <div className="h-[calc(100vh-160px)]">
            <UserVerification users={citizens} onVerifyUser={onVerifyUser} />
          </div>
        )}

        {activeView === "agency-accounts" && <AgencyAccounts />}

        {activeView === "analytics" && <Analytics reports={reports} />}
      </div>
    </Layout>
  );
};

export default App;
