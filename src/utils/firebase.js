import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

export const isBrowser = typeof window !== "undefined";

// Safe env extraction for Vite & test environments
const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

export const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  metaEnv.VITE_USE_FIREBASE !== "false"
);

// Initialize Firebase App instance safely only when configured
const app = isFirebaseConfigured 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

// Analytics support check
let analytics = null;
if (isBrowser) {
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export { app, analytics };