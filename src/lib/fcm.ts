import { getToken, onMessage } from "firebase/messaging";
import { ref, update } from "firebase/database";
import { database, messaging, VAPID_KEY } from "./firebase";
import { logger } from "@/utils/logger";

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
  
  logger.log("🔍 [FCM] Vérification support:", {
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
  logger.log("🔍 [FCM] Début requestNotificationPermission pour:", userId);
  
  // ⚠️ Vérifier si FCM est supporté
  if (!isFCMSupported()) {
    logger.warn("⚠️ [FCM] FCM non supporté sur cet appareil/navigateur");
    return null;
  }

  logger.log("✅ [FCM] FCM supporté, demande permission...");
  
  try {
    // Demander la permission
    const permission = await Notification.requestPermission();
    logger.log("📱 [FCM] Résultat permission:", permission);
    
    if (permission !== "granted") {
      logger.log("❌ [FCM] Permission refusée par l'utilisateur");
      return null;
    }

    logger.log("🔑 [FCM] Tentative d'obtention du token...");
    
    // Obtenir le token FCM
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    logger.log("🔑 [FCM] Token obtenu:", token ? "OUI ✅" : "NON ❌");
    
    if (token) {
      logger.log("✅ [FCM] Token FCM complet:", token);
      logger.log("💾 [FCM] Sauvegarde du token dans Firebase Database...");
      
      // Sauvegarder le token dans Firebase
      await update(ref(database, `users/${userId}`), {
        fcmToken: token,
        fcmTokenUpdatedAt: Date.now()
      });
      
      logger.log("✅ [FCM] Token sauvegardé avec succès dans Firebase !");
      logger.log("📍 [FCM] Chemin: users/" + userId + "/fcmToken");
      
      return token;
    } else {
      logger.log("❌ [FCM] Impossible d'obtenir le token (messaging non initialisé ?)");
      return null;
    }
  } catch (error) {
    logger.error("❌ [FCM] Erreur lors de l'obtention du token:", error);
    
    // Afficher plus de détails sur l'erreur
    if (error instanceof Error) {
      logger.error("❌ [FCM] Message d'erreur:", error.message);
      logger.error("❌ [FCM] Stack:", error.stack);
    }
    
    return null;
  }
}

/**
 * 🔔 Écouter les messages en premier plan
 */
export function listenToForegroundMessages(callback: (payload: any) => void) {
  if (!isFCMSupported()) {
    logger.warn("⚠️ [FCM] Listeners désactivés (FCM non supporté)");
    return;
  }

  logger.log("👂 [FCM] Initialisation des listeners de messages...");

  try {
    onMessage(messaging, (payload) => {
      logger.log("📩 [FCM] Message reçu en premier plan:", payload);
      callback(payload);
      
      // Vibration
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
        logger.log("📳 [FCM] Vibration déclenchée");
      }
    });
    
    logger.log("✅ [FCM] Listeners configurés avec succès");
  } catch (error) {
    logger.error("❌ [FCM] Erreur lors de la configuration des listeners:", error);
  }
}
