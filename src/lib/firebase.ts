// ✅ src/lib/firebase.ts - Configuration Firebase corrigée

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";
import { logger } from "@/utils/logger";

// Configuration Firebase (depuis variables d'environnement)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Vérifier si on est dans le navigateur avant d'initialiser Analytics
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication
export const auth = getAuth(app);

// VAPID Key pour les notifications push (depuis variables d'environnement)
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Realtime Database
export const database = getDatabase(app);

// Initialize Cloud Messaging (seulement dans le navigateur)
let messaging = null;
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    logger.warn("⚠️ Messaging non disponible (probablement en développement local)", error);
  }
}

export { messaging, analytics };
export default app;
