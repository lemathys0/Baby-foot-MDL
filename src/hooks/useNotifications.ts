import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, listenToForegroundMessages } from '@/lib/fcm';
import { toast } from '@/hooks/use-toast';
import { logger } from "@/utils/logger";

export const useNotifications = () => {
  const { user } = useAuth();
  const initialized = useRef(false); // ✅ Empêche la double initialisation
  const listenerConfigured = useRef(false); // ✅ Empêche les listeners multiples

  useEffect(() => {
    if (!user) {
      logger.log("⚠️ [useNotifications] Pas d'utilisateur connecté");
      return;
    }
    
    // ✅ Si déjà initialisé, on ne fait rien
    if (initialized.current) {
      logger.log("⏭️ [useNotifications] Déjà initialisé, skip");
      return;
    }
    
    initialized.current = true;
    logger.log("🔔 [useNotifications] Initialisation pour:", user.uid);
    
    // 1️⃣ Initialiser FCM selon la permission actuelle
    const initFCM = async () => {
      const currentPermission = Notification.permission;
      logger.log("📱 [useNotifications] Permission actuelle:", currentPermission);
      
      if (currentPermission === 'granted') {
        // Permission déjà accordée, récupérer le token silencieusement
        logger.log("✅ [useNotifications] Permission déjà accordée, récupération du token...");
        const token = await requestNotificationPermission(user.uid);
        
        if (token) {
          logger.log('✅ [useNotifications] FCM réactivé avec succès');
        }
      } else if (currentPermission === 'default') {
        // Première fois : demander immédiatement
        logger.log("🚀 [useNotifications] Demande de permission (première fois)...");
        
        const token = await requestNotificationPermission(user.uid);
        
        if (token) {
          logger.log('✅ [useNotifications] FCM initialisé avec succès');
          toast({
            title: "✅ Notifications activées",
            description: "Vous recevrez les notifications même quand l'app est fermée",
            duration: 4000,
          });
        } else {
          logger.log('⏭️ [useNotifications] Permission refusée ou non disponible');
        }
      } else {
        // Permission refusée
        logger.log('⚠️ [useNotifications] Permission refusée précédemment');
      }
    };
    
    initFCM();
    
    // 2️⃣ Configurer les listeners une seule fois
    if (!listenerConfigured.current) {
      listenerConfigured.current = true;
      logger.log("👂 [useNotifications] Configuration des listeners...");
      
      listenToForegroundMessages((payload) => {
        logger.log("📬 [useNotifications] Message reçu:", payload.notification?.title);
        
        // Afficher la notification dans l'app
        toast({
          title: payload.notification?.title || "Notification",
          description: payload.notification?.body || "",
          duration: 5000,
        });
      });
    }
    
    // Cleanup au démontage du composant
    return () => {
      logger.log("🧹 [useNotifications] Cleanup");
      initialized.current = false;
    };
  }, [user]);
};
