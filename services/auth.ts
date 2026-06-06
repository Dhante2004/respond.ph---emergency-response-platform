import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FbUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { User, AgencyType, UserType, AccountVerificationStatus } from "../types";

/**  SUPERADMIN (Hardcoded demo) */
const SUPERADMIN_USERNAME = "pdrrmoadmin";
const SUPERADMIN_EMAIL = "pdrrmoadmin@respond.ph";
const SUPERADMIN_PASS = "pdrrmo2026";

export const DEMO_SUPERADMIN = {
  username: SUPERADMIN_USERNAME,
  password: SUPERADMIN_PASS,
  email: SUPERADMIN_EMAIL,
};

export function mapIdentifierToEmail(identifier: string) {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed === SUPERADMIN_USERNAME) return SUPERADMIN_EMAIL;
  return trimmed; // expects real email for non-superadmin
}

/**
 * Only auto-infer the SUPERADMIN.
 * Everyone else must come from Firestore users/{uid}.
 */
function inferRole(email: string | null | undefined): { userType: UserType; agency?: AgencyType } {
  const e = (email || "").toLowerCase().trim();
  if (e === SUPERADMIN_EMAIL) return { userType: "pdrrmo_admin" };
  return { userType: "citizen" };
}

export async function login(identifier: string, password: string) {
  const email = mapIdentifierToEmail(identifier);
  console.log("Signing in with:", email);
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerCitizen(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}) {
  const cred = await createUserWithEmailAndPassword(auth, params.email, params.password);

  const userDoc: User = {
    id: cred.user.uid, //  MUST be UID
    email: params.email,
    fullName: params.fullName,
    phone: params.phone,
    userType: "citizen",
    accountVerificationStatus: "unverified",
  };

  await setDoc(doc(db, "users", cred.user.uid), userDoc);
  return cred;
}

/**
 * Creates/repairs Firestore profile.
 *  never writes undefined fields (Firestore rejects them)
 *  enforces stable id = uid
 */
export async function ensureProfile(fbUser: FbUser): Promise<User> {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);

  const inferred = inferRole(fbUser.email);
  const isSuperAdmin = inferred.userType === "pdrrmo_admin";

  const safeEmail = (fbUser.email || "").trim();
  const safeName =
    fbUser.displayName?.trim() ||
    (isSuperAdmin ? "PDRRMO Super Admin" : "Citizen");

  // ---------
  // If exists
  // ---------
  if (snap.exists()) {
    const current = snap.data() as Partial<User>;

    //  Always repair id/email if wrong/missing
    const patch: Partial<User> = {};
    if (current.id !== fbUser.uid) patch.id = fbUser.uid;
    if ((current.email || "").trim() !== safeEmail) patch.email = safeEmail;

    //  Enforce superadmin role no matter what
    if (isSuperAdmin) {
      patch.userType = "pdrrmo_admin";
      patch.accountVerificationStatus = "verified";
    } else {
      // keep whatever userType is stored (citizen/agency_admin), but ensure it exists
      if (!current.userType) patch.userType = inferred.userType;
      if (!current.accountVerificationStatus) patch.accountVerificationStatus = "unverified";
    }

    // only add agency if defined
    if (isSuperAdmin && inferred.agency) patch.agency = inferred.agency;

    // apply patch only if there are fields
    if (Object.keys(patch).length > 0) {
      await setDoc(ref, patch, { merge: true });
    }

    // return merged profile
    return {
      id: fbUser.uid,
      email: safeEmail,
      fullName: (current.fullName || safeName) as string,
      phone: (current.phone || "") as string,
      userType: (patch.userType || current.userType || inferred.userType) as UserType,
      agency: (patch.agency || current.agency) as AgencyType | undefined,
      accountVerificationStatus: (patch.accountVerificationStatus ||
        current.accountVerificationStatus ||
        (isSuperAdmin ? "verified" : "unverified")) as AccountVerificationStatus,
      idImageUrl: current.idImageUrl,
    } as User;
  }

  // -------------
  // If missing doc
  // -------------
  const fallback: User = {
    id: fbUser.uid,
    email: safeEmail,
    fullName: safeName,
    phone: "",
    userType: inferred.userType,
    accountVerificationStatus: isSuperAdmin ? "verified" : "unverified",
  };

  //  only add agency if defined
  if (inferred.agency) fallback.agency = inferred.agency;

  await setDoc(ref, fallback);
  return fallback;
}

/**
 *  Never hang the app on initializing
 */
export function listenAuth(cb: (u: User | null) => void, onError?: (e: any) => void) {
  return onAuthStateChanged(auth, (fbUser) => {
    (async () => {
      try {
        if (!fbUser) {
          cb(null);
          return;
        }

        const profile = await ensureProfile(fbUser);
        cb(profile);
      } catch (e) {
        console.error("Auth bootstrap failed:", e);
        onError?.(e);
        cb(null); // don’t block UI
      }
    })();
  });
}

export async function logout() {
  await signOut(auth);
}
