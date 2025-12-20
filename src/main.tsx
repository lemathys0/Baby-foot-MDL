import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
// SERVICE WORKER REGISTRATION
// ===========================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none" // Force la vérification des mises à jour
      })
      .then((registration) => {
        console.log("✅ [App] Service Worker enregistré !", registration.scope);
        
        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
          console.log("🔄 [App] Vérification de mise à jour SW...");
        }, 60 * 60 * 1000);
        
        // Gérer les mises à jour du SW
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("🆕 [App] Nouvelle version du SW détectée !");
          
          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              console.log("📢 [App] Nouvelle version disponible !");
              
              // Optionnel : Afficher une notification à l'utilisateur
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
            console.log("🔄 [App] Nouveau SW actif, rechargement...");
            window.location.reload();
          }
        });
      })
      .catch((err) => {
        console.error("❌ [App] Erreur d'enregistrement du Service Worker:", err);
      });
    
    // Vérifier si on est en mode offline/online
    window.addEventListener("online", () => {
      console.log("🌐 [App] Connexion rétablie !");
      // Optionnel : afficher une notification ou synchroniser les données
    });
    
    window.addEventListener("offline", () => {
      console.log("📡 [App] Mode hors ligne activé");
      // Optionnel : afficher un message à l'utilisateur
    });
  });
}

// ===========================
// FIREBASE CLOUD MESSAGING (Notifications Push)
// ===========================
if ("Notification" in window && "serviceWorker" in navigator) {
  // Demander la permission pour les notifications
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      console.log("✅ [App] Permission notifications accordée");
      
      // Initialiser FCM ici si nécessaire
      // (À faire dans votre composant Firebase ou AuthContext)
    } else {
      console.log("⚠️ [App] Permission notifications refusée");
    }
  });
}

// ===========================
// UTILITAIRES DE DEBUG (à retirer en production)
// ===========================
if (import.meta.env.DEV) {
  // Commandes utiles en développement
  (window as any).swDebug = {
    // Vider tous les caches
    clearCache: async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log("🗑️ Tous les caches supprimés !");
      window.location.reload();
    },
    
    // Obtenir la taille du cache
    getCacheSize: async () => {
      const cacheNames = await caches.keys();
      let total = 0;
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        total += keys.length;
        console.log(`📦 ${name}: ${keys.length} entrées`);
      }
      console.log(`📊 Total: ${total} entrées en cache`);
      return total;
    },
    
    // Désinscrire le SW
    unregister: async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log("❌ Service Worker désinscrit !");
        window.location.reload();
      }
    }
  };
  
  console.log("🛠️ Mode DEV : Utilisez window.swDebug pour déboguer le SW");
  console.log("  - swDebug.clearCache()");
  console.log("  - swDebug.getCacheSize()");
  console.log("  - swDebug.unregister()");
}
