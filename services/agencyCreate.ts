import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AgencyType } from "../types";

// same config as services/firebase.ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let secondaryApp: FirebaseApp | null = null;

async function getSecondaryAuth() {
  if (!secondaryApp) {
    const existing = getApps().find((a) => a.name === "Secondary");
    secondaryApp = existing || initializeApp(firebaseConfig, "Secondary");
  }

  const secondaryAuth = getAuth(secondaryApp);

  // IMPORTANT: in-memory so it doesn't overwrite main admin session
  await setPersistence(secondaryAuth, inMemoryPersistence);

  return secondaryAuth;
}

export async function createAgencyAccount(params: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  agency: AgencyType; // "BFP" | "PNP" | "PCG"
}) {
  const secondaryAuth = await getSecondaryAuth();

  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    params.email,
    params.password
  );

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
  });

  await signOut(secondaryAuth);

  return { uid };
}
