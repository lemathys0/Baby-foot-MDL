import { getToken, onMessage } from "firebase/messaging";
import { ref, update } from "firebase/database";
import { database, messaging, VAPID_KEY } from "./firebase";

/**
 * Vérifier si FCM est supporté
 */
function isFCMSupported(): boolean {
  const supported = (
    'serviceWorker' in navigator &&
    'Notification' in window &&
    (window.location.protocol === 'https:' || 
     window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1')
  );
  
  console.log("🔍 [FCM] Vérification support:", {
    hasServiceWorker: 'serviceWorker' in navigator,
    hasNotification: 'Notification' in window,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    supported: supported
  });
  
  return supported;
}

/**
 * 📱 Demander la permission et obtenir le token FCM
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  console.log("🔍 [FCM] Début requestNotificationPermission pour:", userId);
  
  // ⚠️ Vérifier si FCM est supporté
  if (!isFCMSupported()) {
    console.warn("⚠️ [FCM] FCM non supporté sur cet appareil/navigateur");
    return null;
  }

  console.log("✅ [FCM] FCM supporté, demande permission...");
  
  try {
    // Demander la permission
    const permission = await Notification.requestPermission();
    console.log("📱 [FCM] Résultat permission:", permission);
    
    if (permission !== "granted") {
      console.log("❌ [FCM] Permission refusée par l'utilisateur");
      return null;
    }

    console.log("🔑 [FCM] Tentative d'obtention du token...");
    
    // Obtenir le token FCM
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log("🔑 [FCM] Token obtenu:", token ? "OUI ✅" : "NON ❌");
    
    if (token) {
      console.log("✅ [FCM] Token FCM complet:", token);
      console.log("💾 [FCM] Sauvegarde du token dans Firebase Database...");
      
      // Sauvegarder le token dans Firebase
      await update(ref(database, `users/${userId}`), {
        fcmToken: token,
        fcmTokenUpdatedAt: Date.now()
      });
      
      console.log("✅ [FCM] Token sauvegardé avec succès dans Firebase !");
      console.log("📍 [FCM] Chemin: users/" + userId + "/fcmToken");
      
      return token;
    } else {
      console.log("❌ [FCM] Impossible d'obtenir le token (messaging non initialisé ?)");
      return null;
    }
  } catch (error) {
    console.error("❌ [FCM] Erreur lors de l'obtention du token:", error);
    
    // Afficher plus de détails sur l'erreur
    if (error instanceof Error) {
      console.error("❌ [FCM] Message d'erreur:", error.message);
      console.error("❌ [FCM] Stack:", error.stack);
    }
    
    return null;
  }
}

/**
 * 🔔 Écouter les messages en premier plan
 */
export function listenToForegroundMessages(callback: (payload: any) => void) {
  if (!isFCMSupported()) {
    console.warn("⚠️ [FCM] Listeners désactivés (FCM non supporté)");
    return;
  }

  console.log("👂 [FCM] Initialisation des listeners de messages...");

  try {
    onMessage(messaging, (payload) => {
      console.log("📩 [FCM] Message reçu en premier plan:", payload);
      callback(payload);
      
      // Vibration
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
        console.log("📳 [FCM] Vibration déclenchée");
      }
    });
    
    console.log("✅ [FCM] Listeners configurés avec succès");
  } catch (error) {
    console.error("❌ [FCM] Erreur lors de la configuration des listeners:", error);
  }
}
