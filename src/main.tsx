import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from '@/utils/logger';
import { initSentry } from '@/lib/sentry';

// Initialize Sentry for error monitoring (v2.0.0)
initSentry();

// Initialize logger (prevents tree-shaking)
logger.log("🚀 Application starting...");

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Prevent FOUC (Flash of Unstyled Content)
document.body.classList.add("loaded");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ===========================
// 🔔 FIREBASE SERVICE WORKER (FCM + Cache + PWA)
// ===========================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // ⚠️ IMPORTANT : Enregistrer firebase-messaging-sw.js pour FCM
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", {
        scope: "/",
        updateViaCache: "none"
      })
      .then((registration) => {
        logger.log("✅ [FCM] Service Worker enregistré !", registration.scope);
        
        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
          logger.log("🔄 [FCM] Vérification de mise à jour SW...");
        }, 60 * 60 * 1000);
        
        // Gérer les mises à jour du SW
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          logger.log("🆕 [FCM] Nouvelle version du SW détectée !");
          
          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              logger.log("📢 [FCM] Nouvelle version disponible !");
              
              if (confirm("Une nouvelle version est disponible ! Voulez-vous recharger ?")) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            }
          });
        });
        
        // Recharger quand un nouveau SW prend le contrôle
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            logger.log("🔄 [FCM] Nouveau SW actif, rechargement...");
            window.location.reload();
          }
        });
      })
      .catch((err) => {
        logger.error("❌ [FCM] Erreur d'enregistrement du Service Worker:", err);
      });
    
    // Événements réseau
    window.addEventListener("online", () => {
      logger.log("🌐 [App] Connexion rétablie !");
    });
    
    window.addEventListener("offline", () => {
      logger.log("📡 [App] Mode hors ligne activé");
    });
  });
}

// ===========================
// 🔔 PERMISSION NOTIFICATIONS (géré par useNotifications)
// ===========================
// La permission est demandée automatiquement par useNotifications.ts
// Pas besoin de la demander ici pour éviter les doublons

// ===========================
// 🛠️ UTILITAIRES DE DEBUG (DEV uniquement)
// ===========================
if (import.meta.env.DEV) {
  (window as any).swDebug = {
    clearCache: async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logger.log("🗑️ Tous les caches supprimés !");
      window.location.reload();
    },
    
    getCacheSize: async () => {
      const cacheNames = await caches.keys();
      let total = 0;
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        total += keys.length;
        logger.log(`📦 ${name}: ${keys.length} entrées`);
      }
      logger.log(`📊 Total: ${total} entrées en cache`);
      return total;
    },
    
    unregister: async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        logger.log("❌ Service Worker désinscrit !");
        window.location.reload();
      }
    }
  };
  
  logger.log("🛠️ Mode DEV : Utilisez window.swDebug pour déboguer");
  logger.log("  - swDebug.clearCache()");
  logger.log("  - swDebug.getCacheSize()");
  logger.log("  - swDebug.unregister()");
}
