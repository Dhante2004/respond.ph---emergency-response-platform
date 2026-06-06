import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
  deleteDoc,
  Timestamp,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Report, User, AccountVerificationStatus } from "../types";

// ------------------------
// Helpers
// ------------------------
function normAgency(v: any) {
  const a = String(v ?? "").trim().toUpperCase();
  return a || "NONE";
}

function normStatus(v: any) {
  // normalize status variants to match your UI + App notification engine
  let s = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") // spaces + hyphens -> underscore
    .replace(/_+/g, "_");

  // common variants
  if (s === "enroute") s = "en_route";
  if (s === "onscene") s = "on_scene";
  if (s === "dispatched") s = "assigned";
  if (s === "closed" || s === "done") s = "resolved";
  if (!s) s = "submitted";

  return s;
}

function toIsoMaybe(v: any) {
  if (!v) return "";
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  // Firestore Timestamp-like
  if (typeof v === "object" && typeof v?.toDate === "function") {
    try {
      return v.toDate().toISOString();
    } catch {
      return "";
    }
  }
  return String(v);
}

function toMs(v: any) {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toDate().getTime();
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof v === "object" && typeof v?.toDate === "function") {
    try {
      return v.toDate().getTime();
    } catch {
      return 0;
    }
  }
  const ms = Date.parse(String(v));
  return Number.isFinite(ms) ? ms : 0;
}

/**
 *  IMPORTANT FIX (major):
 * Always force Firestore docId as the stable `Report.id`.
 *
 * Your previous code did:
 *   { id: docId, ...raw }
 * which allows raw.id to overwrite docId.
 *
 * That breaks:
 * - updateReport(report.id, ...) when Firestore docId != raw.id
 * - admin notifications diffing (Map keys mismatch)
 */
function shapeReport(docId: string, raw: any): Report {
  const assignedAgency = normAgency(raw?.assignedAgency ?? raw?.assigned_agency ?? "NONE");
  const currentStatus = normStatus(raw?.currentStatus ?? raw?.status ?? raw?.current_status ?? "");

  const createdAtIso = toIsoMaybe(raw?.createdAt);
  const updatedAtIso = toIsoMaybe(raw?.updatedAt);

  return {
    ...raw,

    //  ALWAYS override id with real doc id (after spreading raw)
    id: docId,

    //  canonical fields
    assignedAgency,
    currentStatus: currentStatus as any,

    //  normalize timestamps to ISO for the UI
    createdAt: createdAtIso,
    updatedAt: updatedAtIso || createdAtIso,
  } as Report;
}

// ------------------------
// LISTENERS
// ------------------------
export function listenReports(user: User, cb: (reports: Report[]) => void) {
  const colRef = collection(db, "reports");

  const handleSnap = (snap: QuerySnapshot<DocumentData>) => {
    const rows = snap.docs.map((d) => shapeReport(d.id, d.data()));

    //  Sort by updatedAt (ms), fallback createdAt (ms)
    rows.sort((a, b) => {
      const au = toMs((a as any).updatedAt) || toMs((a as any).createdAt);
      const bu = toMs((b as any).updatedAt) || toMs((b as any).createdAt);
      return bu - au;
    });

    cb(rows);
  };

  const handleErr = (err: any) => {
    console.error("listenReports onSnapshot error:", err);
    cb([]);
  };

  // Admin sees all
  if (user.userType === "pdrrmo_admin") {
    return onSnapshot(query(colRef), handleSnap, handleErr);
  }

  // Agency: only their assigned (requires assignedAgency stored in uppercase consistently)
  if (user.userType === "agency_admin") {
    const agency = normAgency((user as any).agency ?? user.agency ?? "NONE");
    return onSnapshot(query(colRef, where("assignedAgency", "==", agency)), handleSnap, handleErr);
  }

  // Citizen: only their own reports
  return onSnapshot(query(colRef, where("userId", "==", user.id)), handleSnap, handleErr);
}

export function listenCitizens(cb: (users: User[]) => void) {
  const qRef = query(collection(db, "users"), where("userType", "==", "citizen"));
  return onSnapshot(
    qRef,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        //  Always prefer Firestore docId as the id
        return { ...(data as User), id: d.id } as User;
      });
      cb(rows);
    },
    (err) => {
      console.error("listenCitizens onSnapshot error:", err);
      cb([]);
    }
  );
}

// ------------------------
// WRITES
// ------------------------
export async function createReport(report: Report) {
  //  normalize on write (prevents agency query mismatch + status mismatch)
  const payload: any = {
    ...report,
    assignedAgency: normAgency((report as any).assignedAgency ?? "NONE"),
    currentStatus: normStatus((report as any).currentStatus ?? "submitted"),
    createdAt: (report as any).createdAt || new Date().toISOString(),
    updatedAt: (report as any).updatedAt || new Date().toISOString(),
  };

  // if you create with report.id as doc id, this is fine
  await setDoc(doc(db, "reports", report.id), payload);
}

export async function updateReport(reportId: string, updates: Partial<Report>) {
  const patch: any = { ...updates };

  // normalize status
  if ("currentStatus" in patch || "status" in patch || "current_status" in patch) {
    const incoming = (patch as any).currentStatus ?? (patch as any).status ?? (patch as any).current_status;
    patch.currentStatus = normStatus(incoming);
    delete patch.status;
    delete patch.current_status;
  }

  // normalize agency
  if ("assignedAgency" in patch || "assigned_agency" in patch) {
    const incoming = (patch as any).assignedAgency ?? (patch as any).assigned_agency;
    patch.assignedAgency = normAgency(incoming);
    delete patch.assigned_agency;
  }

  //  always bump updatedAt (this is what makes admin notifications detect “fresh” changes)
  if (!("updatedAt" in patch)) {
    patch.updatedAt = new Date().toISOString();
  }

  await updateDoc(doc(db, "reports", reportId), patch);
}

export async function deleteReport(reportId: string) {
  await deleteDoc(doc(db, "reports", reportId));
}

export async function updateUser(userId: string, updates: Partial<User>) {
  await updateDoc(doc(db, "users", userId), updates);
}

export async function verifyCitizen(userId: string, status: AccountVerificationStatus) {
  await updateDoc(doc(db, "users", userId), { accountVerificationStatus: status });

  const qRef = query(collection(db, "reports"), where("userId", "==", userId));
  const snap = await getDocs(qRef);

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { userIsVerified: status === "verified" }));
  await batch.commit();
}

// ------------------------
// OPTIONAL: Admin migration helper (fix old docs)
// Run this once (admin-only) if you previously used addDoc() or stored lowercase agencies.
// ------------------------
export async function adminNormalizeAllReportsOnce() {
  const snap = await getDocs(query(collection(db, "reports")));
  const batch = writeBatch(db);

  snap.docs.forEach((d) => {
    const raw = d.data() as any;

    const assignedAgency = normAgency(raw?.assignedAgency ?? raw?.assigned_agency ?? "NONE");
    const currentStatus = normStatus(raw?.currentStatus ?? raw?.status ?? raw?.current_status ?? "submitted");

    const createdAt = toIsoMaybe(raw?.createdAt) || new Date().toISOString();
    const updatedAt = toIsoMaybe(raw?.updatedAt) || createdAt;

    batch.update(d.ref, {
      assignedAgency,
      currentStatus,
      createdAt,
      updatedAt,
    });
  });

  await batch.commit();
}
