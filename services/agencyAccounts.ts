import { db } from "./firebase";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  type Auth,
} from "firebase/auth";

import type { AgencyType } from "../types";

export type AgencyAccountRow = {
  id: string; // Firestore doc id (usually same as Auth UID)
  fullName: string;
  email: string;
  phone?: string;
  agency: AgencyType;
  userType: "agency_admin";
  createdAt?: Date | null;
};

function toDateSafe(v: any): Date | null {
  try {
    if (!v) return null;
    if (v?.toDate) return v.toDate(); // Firestore Timestamp
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function normalizeDoc(id: string, data: any): AgencyAccountRow {
  return {
    id,
    fullName: data?.fullName || "",
    email: data?.email || "",
    phone: data?.phone || "",
    agency: (data?.agency || "BFP") as AgencyType,
    userType: "agency_admin",
    createdAt: toDateSafe(data?.createdAt) || toDateSafe(data?.created_at) || null,
  };
}

/**
 *  Real-time list of agency admin accounts
 * Assumes agency accounts are stored in "users" collection with userType === "agency_admin"
 */
export function listenAgencyAccounts(onRows: (rows: AgencyAccountRow[]) => void): Unsubscribe {
  const qRef = query(collection(db, "users"), where("userType", "==", "agency_admin"), limit(300));

  return onSnapshot(
    qRef,
    (snap) => {
      const rows = snap.docs.map((d) => normalizeDoc(d.id, d.data()));
      rows.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      onRows(rows);
    },
    (err) => {
      console.error("listenAgencyAccounts error:", err);
      onRows([]);
    }
  );
}

/**
 *  One-time fetch (optional)
 */
export async function fetchAgencyAccountsOnce(): Promise<AgencyAccountRow[]> {
  const qRef = query(collection(db, "users"), where("userType", "==", "agency_admin"), limit(300));
  const snap = await getDocs(qRef);

  const rows = snap.docs.map((d) => normalizeDoc(d.id, d.data()));
  rows.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return rows;
}

/**
 *  UPDATE agency account fields in Firestore
 * Note: This updates Firestore user document only (NOT Firebase Auth email/password).
 */
export async function updateAgencyAccountDoc(
  uid: string,
  updates: { fullName?: string; phone?: string; agency?: AgencyType }
) {
  const payload: any = { ...updates, updatedAt: serverTimestamp() };

  // avoid writing undefined fields
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  await updateDoc(doc(db, "users", uid), payload);
}

/**
 *  DELETE agency account document in Firestore
 * Note: This deletes Firestore doc only (NOT Firebase Auth user).
 */
export async function deleteAgencyAccountDoc(uid: string) {
  await deleteDoc(doc(db, "users", uid));
}

/* ------------------------------------------------------------------ */
/*  CREATE AGENCY ACCOUNT (SECONDARY AUTH)                             */
/* ------------------------------------------------------------------ */

// Same config as services/firebase.ts (keep env-driven)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let secondaryApp: FirebaseApp | null = null;

async function getSecondaryAuth(): Promise<Auth> {
  if (!secondaryApp) {
    const existing = getApps().find((a) => a.name === "Secondary");
    secondaryApp = existing || initializeApp(firebaseConfig, "Secondary");
  }

  const secondaryAuth = getAuth(secondaryApp);

  //  In-memory so it won't overwrite the main Admin session
  await setPersistence(secondaryAuth, inMemoryPersistence);

  return secondaryAuth;
}

/**
 * CREATE agency admin user (Auth) + Firestore user doc
 * IMPORTANT:
 * - Firestore rules must allow PDRRMO to create agency_admin docs (you already do).
 * - Deleting the Firebase Auth user later requires Admin SDK (server) OR signing in as that user.
 */
export async function createAgencyAccount(params: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  agency: AgencyType; // "BFP" | "PNP" | "PCG"
}) {
  const secondaryAuth = await getSecondaryAuth();

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, params.email, params.password);

    await updateProfile(cred.user, { displayName: params.fullName });

    const uid = cred.user.uid;

    await setDoc(doc(db, "users", uid), {
      id: uid,
      email: params.email,
      fullName: params.fullName,
      phone: params.phone || "",
      userType: "agency_admin",
      agency: params.agency,
      accountVerificationStatus: "verified",

      // timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { uid };
  } finally {
    // always sign out secondary session
    await signOut(secondaryAuth);
  }
}
