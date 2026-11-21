import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { setActiveCompanyContext } from '../utils/storage';
import { 
  sanitizeCompanyId, 
  getCompany, 
  getCompanyMembers, 
  addCompanyMember, 
  updateChallanSettings,
  updateCompanySubscription,
  getCompanySubscription,
  seedInitialLocalStorageData
} from '../utils/tenantStorage';
import { evaluateSubscriptionStatus, recordSubscriptionPayment } from '../utils/subscriptionManager';
import { auth, db, isFirebaseConfigured, firebaseConfig } from '../utils/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

const USERS_STORAGE_KEY = "nayaruvi_users";
const SESSION_UID_KEY = "nayaruvi_session_uid";

// Helper to get local users
const getLocalUsers = () => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const setLocalUsers = (users) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  } catch (e) {
    console.error("Error writing users to localStorage:", e);
  }
};

// Seed initial default user if empty
const seedDefaultUser = () => {
  seedInitialLocalStorageData();
  const users = getLocalUsers();
  if (users.length === 0) {
    const defaultAdmin = {
      uid: "usr_tekpower_admin",
      email: "admin@tekpower.in",
      password: "password123",
      displayName: "TekPower Admin",
      phone: "9940523444",
      activeCompanyId: "company_tekpower",
      createdAt: new Date().toISOString()
    };
    setLocalUsers([defaultAdmin]);
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userCompanies, setUserCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [currentMembership, setCurrentMembership] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [simulatedDay, setSimulatedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user companies & active company data (Firestore + Local fallback)
  const loadUserCompanyData = async (user, forcedCompanyId = null) => {
    if (!user) {
      setUserProfile(null);
      setUserCompanies([]);
      setCurrentCompany(null);
      setCurrentMembership(null);
      setSubscription(null);
      setActiveCompanyContext(null, null);
      return;
    }

    try {
      setUserProfile(user);

      let targetCompanyId = forcedCompanyId || user.activeCompanyId;

      // 1. Check Cloud Firestore for user's profile and active company (only for active Firebase users)
      if (isFirebaseConfigured && db && auth?.currentUser && user.uid && !user.uid.startsWith("usr_tekpower")) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (!targetCompanyId && uData.activeCompanyId) {
              targetCompanyId = uData.activeCompanyId;
            }
          }
        } catch (err) {
          // Graceful fallback to local cached user profile
        }
      }

      // 2. Resolve companies from LocalStorage / Firestore
      const companiesRaw = typeof localStorage !== 'undefined' ? localStorage.getItem("nayaruvi_companies") : null;
      const allCompanies = companiesRaw ? JSON.parse(companiesRaw) : [];

      const membersRaw = typeof localStorage !== 'undefined' ? localStorage.getItem("nayaruvi_members") : null;
      const allMembers = membersRaw ? JSON.parse(membersRaw) : [];

      const userEmail = (user.email || '').toLowerCase().trim();
      const userMemberships = allMembers.filter((m) => 
        m.uid === user.uid || (m.email && m.email.toLowerCase().trim() === userEmail)
      );
      const userCompanyList = [];

      for (const m of userMemberships) {
        const comp = allCompanies.find((c) => c.id === m.companyId);
        if (comp) {
          userCompanyList.push({
            ...comp,
            role: m.role || 'STAFF',
            status: m.status || 'ACTIVE'
          });
        }
      }

      for (const comp of allCompanies) {
        if ((comp.createdBy === user.uid || (comp.businessEmail && comp.businessEmail.toLowerCase().trim() === userEmail)) && !userCompanyList.some((c) => c.id === comp.id)) {
          userCompanyList.push({
            ...comp,
            role: 'OWNER',
            status: 'ACTIVE'
          });
        }
      }

      // If target company is found, fetch live company details
      if (targetCompanyId) {
        const liveComp = await getCompany(targetCompanyId);
        if (liveComp && !userCompanyList.some((c) => c.id === liveComp.id)) {
          const isOwner = liveComp.createdBy === user.uid || (liveComp.businessEmail && liveComp.businessEmail.toLowerCase().trim() === userEmail);
          userCompanyList.push({
            ...liveComp,
            role: isOwner ? 'OWNER' : 'STAFF',
            status: 'ACTIVE'
          });
        }
      }

      // Deduplicate by company ID
      const uniqueCompanyList = [];
      const seenIds = new Set();
      for (const comp of userCompanyList) {
        if (comp && comp.id && !seenIds.has(comp.id)) {
          seenIds.add(comp.id);
          uniqueCompanyList.push(comp);
        }
      }

      setUserCompanies(uniqueCompanyList);

      if (!targetCompanyId && userCompanyList.length > 0) {
        targetCompanyId = userCompanyList[0].id;
      }

      if (targetCompanyId) {
        const activeComp = await getCompany(targetCompanyId) || userCompanyList.find((c) => c.id === targetCompanyId) || userCompanyList[0];
        if (activeComp) {
          setCurrentCompany(activeComp);

          // Get member role
          const members = await getCompanyMembers(activeComp.id);
          const memberRecord = members.find((m) => 
            m.uid === user.uid || (m.email && m.email.toLowerCase().trim() === userEmail)
          );
          const role = memberRecord?.role || ((activeComp.createdBy === user.uid || (activeComp.businessEmail && activeComp.businessEmail.toLowerCase().trim() === userEmail)) ? 'OWNER' : 'STAFF');

          setCurrentMembership({
            role,
            status: memberRecord?.status || 'ACTIVE'
          });
          setActiveCompanyContext(activeComp.id, user);

          // Load subscription
          const sub = await getCompanySubscription(activeComp.id);
          setSubscription(sub);

          // Update active company in user profile
          if (isFirebaseConfigured && db && user.uid) {
            try {
              await setDoc(doc(db, 'users', user.uid), { activeCompanyId: activeComp.id }, { merge: true });
            } catch (e) {}
          }
        }
      } else {
        setCurrentCompany(null);
        setCurrentMembership(null);
        setSubscription(null);
        setActiveCompanyContext(null, user);
      }
    } catch (err) {
      console.error("Error loading user company context:", err);
    }
  };

  // Auth state listener: connects to Firebase Auth with local fallback
  useEffect(() => {
    seedDefaultUser();

    let unsubscribe = () => {};

    if (isFirebaseConfigured && auth) {
      try {
        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            const appUser = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email.split('@')[0],
              phone: fbUser.phoneNumber || '',
              photoURL: fbUser.photoURL || null
            };
            setCurrentUser(appUser);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(SESSION_UID_KEY, fbUser.uid);
            }
            await loadUserCompanyData(appUser);
            setLoading(false);
          } else {
            // Check local storage session for demo users
            const activeUid = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_UID_KEY) : null;
            if (activeUid) {
              const users = getLocalUsers();
              const user = users.find((u) => u.uid === activeUid);
              if (user) {
                setCurrentUser(user);
                await loadUserCompanyData(user);
              } else {
                localStorage.removeItem(SESSION_UID_KEY);
                setCurrentUser(null);
              }
            } else {
              setCurrentUser(null);
            }
            setLoading(false);
          }
        });
      } catch (e) {
        console.warn("Firebase Auth listener error, fallback to local:", e);
        setLoading(false);
      }
    } else {
      // Local storage only mode
      const activeUid = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_UID_KEY) : null;
      if (activeUid) {
        const users = getLocalUsers();
        const user = users.find((u) => u.uid === activeUid);
        if (user) {
          setCurrentUser(user);
          loadUserCompanyData(user);
        }
      }
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // --- ACTIONS ---

  const login = async (email, password) => {
    seedDefaultUser();
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check local demo accounts first
    if (trimmedEmail === "admin@tekpower.in" || trimmedEmail === "admin@nayaruvi.com" || trimmedEmail === "admin" || trimmedEmail === "demo") {
      const users = getLocalUsers();
      const user = users.find((u) => u.email === "admin@tekpower.in" || u.email === "admin@nayaruvi.com") || users[0];
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SESSION_UID_KEY, user.uid);
      }
      setCurrentUser(user);
      await loadUserCompanyData(user);
      return user;
    }

    // 2. Try Firebase Authentication
    if (isFirebaseConfigured && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const fbUser = cred.user;
        const appUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email.split('@')[0],
          phone: fbUser.phoneNumber || ''
        };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SESSION_UID_KEY, fbUser.uid);
        }
        setCurrentUser(appUser);
        await loadUserCompanyData(appUser);
        return appUser;
      } catch (fbErr) {
        // If Firebase user-not-found, check if user exists in local demo users
        const users = getLocalUsers();
        const localUser = users.find((u) => u.email.toLowerCase() === trimmedEmail);
        if (localUser && localUser.password === password) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(SESSION_UID_KEY, localUser.uid);
          }
          setCurrentUser(localUser);
          await loadUserCompanyData(localUser);
          return localUser;
        }
        throw fbErr;
      }
    }

    // 3. Fallback to Local Users
    const users = getLocalUsers();
    const user = users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      throw new Error("No company account found with this email. Please check your email or Register a new company.");
    }
    if (user.password && password && user.password !== password) {
      throw new Error("Invalid password. Please check your credentials.");
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_UID_KEY, user.uid);
    }
    setCurrentUser(user);
    await loadUserCompanyData(user);
    return user;
  };

  const registerCompany = async ({ account, company }) => {
    seedDefaultUser();
    const trimmedEmail = account.email.trim().toLowerCase();
    const fullName = account.fullName.trim();
    const companyId = sanitizeCompanyId(company.legalName);

    let newUid = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    let firebaseUser = null;

    // 1. Create account in Firebase Authentication if configured
    if (isFirebaseConfigured && auth) {
      try {
        const cred = await Promise.race([
          createUserWithEmailAndPassword(auth, trimmedEmail, account.password),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Auth operation timed out")), 4000))
        ]);
        firebaseUser = cred.user;
        newUid = firebaseUser.uid;
        await updateProfile(firebaseUser, { displayName: fullName }).catch(() => {});
      } catch (fbAuthErr) {
        console.warn("Firebase Auth registration warning:", fbAuthErr.code || fbAuthErr.message);
        if (fbAuthErr.code === 'auth/configuration-not-found') {
          const consoleUrl = firebaseConfig?.projectId 
            ? `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication`
            : "Firebase Console";
          throw new Error(`Firebase Authentication is NOT enabled yet in your Firebase Console! Please open ${consoleUrl} -> click 'Get Started' -> click 'Email/Password' -> Enable it -> Save.`);
        }
        if (fbAuthErr.code === 'auth/operation-not-allowed') {
          throw new Error("Email/Password sign-in provider is disabled in Firebase Console! Please go to Firebase Console -> Authentication -> Sign-in method -> enable Email/Password.");
        }
        if (fbAuthErr.code === 'auth/email-already-in-use') {
          throw fbAuthErr;
        }
        if (fbAuthErr.code === 'auth/weak-password') {
          throw fbAuthErr;
        }
        // If other error, throw it so user gets instant actionable feedback
        throw fbAuthErr;
      }
    }

    // 2. Prepare User Object
    const newUser = {
      uid: newUid,
      email: trimmedEmail,
      displayName: fullName,
      phone: account.phone || '',
      activeCompanyId: companyId,
      createdAt: new Date().toISOString()
    };

    // Save to Cloud Firestore with timeout
    if (isFirebaseConfigured && db) {
      try {
        await Promise.race([
          setDoc(doc(db, 'users', newUid), newUser),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 1500))
        ]);
      } catch (err) {
        console.warn("[Firestore] Save user doc fallback:", err.message);
      }
    }

    // Save to LocalStorage
    const users = getLocalUsers();
    users.push({ ...newUser, password: account.password });
    setLocalUsers(users);

    // 3. Prepare Company Document
    const defaultPrefix = (company.displayName || company.legalName)
      .replace(/[^A-Za-z]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'DC';

    const newCompany = {
      id: companyId,
      legalName: company.legalName.trim(),
      displayName: (company.displayName || company.legalName).trim(),
      businessType: company.businessType || 'Private Limited',
      gstin: (company.gstin || '').trim().toUpperCase(),
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      pincode: company.pincode || '',
      country: company.country || 'India',
      businessEmail: company.businessEmail || trimmedEmail,
      businessPhone: company.businessPhone || account.phone || '',
      website: company.website || '',
      logoUrl: null,
      logoSize: 'medium',
      logoWidth: 46,
      logoHeight: 21,
      lockAspectRatio: true,
      footerTagline: company.footerTagline || 'Quality Products & Professional Services',
      onboardingComplete: false,
      createdBy: newUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save Company to Cloud Firestore with timeout
    if (isFirebaseConfigured && db) {
      try {
        await Promise.race([
          setDoc(doc(db, 'companies', companyId), newCompany),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 1500))
        ]);
      } catch (err) {
        console.warn("[Firestore] Save company doc fallback:", err.message);
      }
    }

    // Save Company to LocalStorage
    const companiesRaw = typeof localStorage !== 'undefined' ? localStorage.getItem("nayaruvi_companies") : null;
    const allCompanies = companiesRaw ? JSON.parse(companiesRaw) : [];
    allCompanies.push(newCompany);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("nayaruvi_companies", JSON.stringify(allCompanies));
    }

    // 4. Create Membership with role OWNER (Firestore + Local)
    await addCompanyMember(companyId, {
      uid: newUid,
      email: trimmedEmail,
      displayName: fullName,
      role: 'OWNER'
    });

    // 5. Initialize Challan Numbering Settings
    await updateChallanSettings(companyId, {
      prefix: defaultPrefix,
      startingNumber: 1,
      currentSequence: 1,
      digits: 4,
      footerText: newCompany.footerTagline
    });

    // 6. Initialize 14-Day Free Trial Subscription
    const trialDays = 14;
    const trialEnds = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    await updateCompanySubscription(companyId, {
      status: 'TRIAL',
      planName: '14-Day Free Trial',
      planId: 'trial',
      trialEndsAt: trialEnds,
      amount: 0,
      currency: 'INR',
      createdAt: new Date().toISOString()
    });

    // 7. Save session and activate company
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_UID_KEY, newUid);
    }
    setCurrentUser(newUser);
    await loadUserCompanyData(newUser, companyId);
    return { user: newUser, companyId };
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Signout error:", e);
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_UID_KEY);
    }
    setActiveCompanyContext(null, null);
    setCurrentUser(null);
    setUserProfile(null);
    setCurrentCompany(null);
    setCurrentMembership(null);
    setSubscription(null);
  };

  const resetPassword = async (email) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, trimmedEmail);
      return true;
    }
    const users = getLocalUsers();
    const user = users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      throw new Error("No user found with this email address.");
    }
    return true;
  };

  const switchCompany = async (newCompanyId) => {
    if (!currentUser) return;
    await loadUserCompanyData(currentUser, newCompanyId);
  };

  const reloadCompany = async () => {
    if (currentUser && currentCompany) {
      await loadUserCompanyData(currentUser, currentCompany.id);
    }
  };

  // Role helpers
  const role = currentMembership?.role || 'VIEWER';
  const isOwner = role === 'OWNER';
  const isAdmin = isOwner || role === 'ADMIN';
  const isStaff = isAdmin || role === 'STAFF';
  const isViewer = isStaff || role === 'VIEWER';

  // Monthly Subscription Status Engine (1st/2nd alerts & 3rd lockout)
  const subscriptionStatus = useMemo(() => {
    return evaluateSubscriptionStatus(subscription, { day: simulatedDay });
  }, [subscription, simulatedDay]);

  const recordPayment = async (paymentData) => {
    if (!currentCompany) return null;
    const updated = await recordSubscriptionPayment(currentCompany.id, paymentData);
    setSubscription(updated);
    return updated;
  };

  const isSubscriptionActive = () => {
    return !subscriptionStatus?.isLocked;
  };

  const value = {
    currentUser,
    userProfile,
    userCompanies,
    currentCompany,
    currentMembership,
    subscription,
    subscriptionStatus,
    simulatedDay,
    setSimulatedDay,
    recordPayment,
    role,
    isOwner,
    isAdmin,
    isStaff,
    isViewer,
    isSubscriptionActive: isSubscriptionActive(),
    loading,
    login,
    registerCompany,
    logout,
    resetPassword,
    switchCompany,
    reloadCompany
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
