import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile, 
  sendPasswordResetEmail, 
  signOut 
} from "firebase/auth";
import { auth, firebaseConfig, isFirebaseConfigured, db } from "./firebase.js";
import { doc, setDoc } from "firebase/firestore";
import { 
  addCompanyMember, 
  updateMemberScopes, 
  checkPlanLimit, 
  recordAuditLog,
  getStorageList,
  STORAGE_KEYS,
  acceptMemberInvitation,
  getCompany
} from "./tenantStorage.js";

/**
 * Registers or sets up authentication credentials for a company team member
 * Uses a secondary isolated Firebase App so the currently logged-in Admin is never logged out.
 */
export const registerOrUpdateMemberAuth = async ({
  companyId,
  email,
  password,
  displayName,
  role = "OPERATIONS_STAFF",
  branchIds = "ALL",
  warehouseIds = "ALL",
  actor = null
}) => {
  if (!companyId || !email) throw new Error("companyId and email are required");
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  // Validate plan seat limits
  await checkPlanLimit(companyId, 'members');

  let memberUid = `usr_${Date.now().toString(36)}`;
  let fbSuccess = false;
  let alreadyExists = false;

  // 1. Create or update in Firebase Authentication
  if (isFirebaseConfigured && cleanPassword && cleanPassword.length >= 6) {
    try {
      const secondaryApp = getApps().find(a => a.name === "MemberAuthHelper") || initializeApp(firebaseConfig, "MemberAuthHelper");
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword);
      memberUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: displayName || cleanEmail.split('@')[0] });
      await signOut(secondaryAuth);
      fbSuccess = true;
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-in-use') {
        alreadyExists = true;
        // User already has a Firebase Auth account, send password reset email so they can log in
        try {
          if (auth) {
            await sendPasswordResetEmail(auth, cleanEmail);
          }
        } catch (e) {}
      } else {
        console.warn("[Firebase Member Auth] Create error:", authErr.code || authErr.message);
      }
    }
  }

  // 2. Save in LocalStorage nayaruvi_users for local offline/fallback login
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem("nayaruvi_users") : null;
    const localUsers = raw ? JSON.parse(raw) : [];
    const idx = localUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
    const userObj = {
      uid: memberUid,
      email: cleanEmail,
      displayName: displayName || cleanEmail.split('@')[0],
      password: cleanPassword || "password123",
      activeCompanyId: companyId,
      createdAt: new Date().toISOString()
    };
    if (idx !== -1) {
      localUsers[idx] = { ...localUsers[idx], ...userObj };
    } else {
      localUsers.push(userObj);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("nayaruvi_users", JSON.stringify(localUsers));
    }
  } catch (e) {
    console.error("Local user save error:", e);
  }

  // 3. Save User Profile doc in Cloud Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "users", memberUid), {
        uid: memberUid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        activeCompanyId: companyId,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("[Firestore] User profile save fallback:", e.message);
    }
  }

  // 4. Save member in company membership
  const newMember = await addCompanyMember(companyId, {
    uid: memberUid,
    email: cleanEmail,
    displayName: displayName || cleanEmail.split('@')[0],
    role
  });

  // 5. Attach Location Scopes
  if (branchIds !== 'ALL' || warehouseIds !== 'ALL') {
    await updateMemberScopes(companyId, memberUid, {
      branchIds,
      warehouseIds
    }, actor);
  }

  // 6. Record Audit Log
  await recordAuditLog(companyId, {
    action: 'MEMBER_CREATED',
    resourceType: 'TEAM_MEMBER',
    resourceId: memberUid,
    details: `Created login account for ${displayName || cleanEmail} with role ${role}`
  }, actor);

  return {
    uid: memberUid,
    email: cleanEmail,
    displayName: displayName || cleanEmail.split('@')[0],
    role,
    password: cleanPassword,
    fbSuccess,
    alreadyExists,
    member: newMember
  };
};

/**
 * Sends a password reset / invitation email to the member via Firebase
 */
export const sendMemberPasswordReset = async (email) => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  if (isFirebaseConfigured && auth) {
    await sendPasswordResetEmail(auth, cleanEmail);
    return true;
  }
  return false;
};

/**
 * Redeems an invitation token, creates/attaches the auth account, and joins the company.
 */
export const acceptInviteAndCreateAccount = async ({ token, password, displayName }) => {
  if (!token) throw new Error("Invite token is required.");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

  const allInvites = getStorageList(STORAGE_KEYS.INVITATIONS);
  const invite = allInvites.find(i => i.token === token);
  if (!invite) throw new Error("Invalid or non-existent invitation token.");
  if (invite.status !== 'PENDING') throw new Error(`This invitation is no longer active (Status: ${invite.status}).`);

  const cleanEmail = invite.email.trim().toLowerCase();
  let memberUid = `usr_${Date.now().toString(36)}`;

  // 1. Firebase Auth Registration
  if (isFirebaseConfigured && auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      memberUid = cred.user.uid;
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-in-use') {
        // Try sign in to verify credentials
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          memberUid = cred.user.uid;
        } catch (signErr) {
          throw new Error("An account with this email already exists. Please use your existing password to accept the invitation.");
        }
      } else {
        throw new Error(authErr.message || "Failed to create user account.");
      }
    }
  }

  // 2. Save in LocalStorage nayaruvi_users fallback
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem("nayaruvi_users") : null;
    const localUsers = raw ? JSON.parse(raw) : [];
    const idx = localUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
    const userObj = {
      uid: memberUid,
      email: cleanEmail,
      displayName: displayName || cleanEmail.split('@')[0],
      password: password,
      activeCompanyId: invite.companyId,
      createdAt: new Date().toISOString()
    };
    if (idx !== -1) {
      localUsers[idx] = { ...localUsers[idx], ...userObj };
    } else {
      localUsers.push(userObj);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("nayaruvi_users", JSON.stringify(localUsers));
    }
  } catch (e) {
    console.error("Local user save error:", e);
  }

  // 3. Save User Profile in Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "users", memberUid), {
        uid: memberUid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        activeCompanyId: invite.companyId,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("[Firestore] User doc fallback:", e.message);
    }
  }

  // 4. Accept the invitation in tenantStorage
  const res = await acceptMemberInvitation(token, {
    uid: memberUid,
    email: cleanEmail,
    displayName: displayName || cleanEmail.split('@')[0]
  });

  const company = await getCompany(invite.companyId);

  return {
    uid: memberUid,
    email: cleanEmail,
    displayName: displayName || cleanEmail.split('@')[0],
    companyId: invite.companyId,
    companyName: company?.displayName || company?.legalName || "Nayaruvi Workspace",
    role: invite.role,
    member: res.member
  };
};
