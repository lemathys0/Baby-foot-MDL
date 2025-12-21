import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging } from "firebase/messaging";

// Configuration Firebase - Remplacez par vos propres valeurs
const firebaseConfig = {
  apiKey: "AIzaSyCbAU10zAKrvv9WJtapj1uBTQhKAlZrhXg",
  authDomain: "baby-footv2.firebaseapp.com",
  databaseURL: "https://baby-footv2-default-rtdb.firebaseio.com",
  projectId: "baby-footv2",
  storageBucket: "baby-footv2.firebasestorage.app",
  messagingSenderId: "630738367010",
  appId: "1:630738367010:web:8070effcead46645d7507b",
  measurementId: "G-PCFZ8HZ8C4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const VAPID_KEY = "BAJ02eLWbYkPyz_w3S304RHeltRnL-5l7T9to_ruWiLDjJor9rmc7YEZ_xvGj27TCkIwtxDecQ8JopCIVAmrGvw";
// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);
export const messaging = getMessaging(app);
export default app;

