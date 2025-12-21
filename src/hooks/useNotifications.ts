import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, listenToForegroundMessages } from '@/lib/fcm';
import { toast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const initialized = useRef(false); // ✅ Empêche la double initialisation
  const listenerConfigured = useRef(false); // ✅ Empêche les listeners multiples

  useEffect(() => {
    if (!user) {
      console.log("⚠️ [useNotifications] Pas d'utilisateur connecté");
      return;
    }
    
    // ✅ Si déjà initialisé, on ne fait rien
    if (initialized.current) {
      console.log("⏭️ [useNotifications] Déjà initialisé, skip");
      return;
    }
    
    initialized.current = true;
    console.log("🔔 [useNotifications] Initialisation pour:", user.uid);
    
    // 1️⃣ Initialiser FCM selon la permission actuelle
    const initFCM = async () => {
      const currentPermission = Notification.permission;
      console.log("📱 [useNotifications] Permission actuelle:", currentPermission);
      
      if (currentPermission === 'granted') {
        // Permission déjà accordée, récupérer le token silencieusement
        console.log("✅ [useNotifications] Permission déjà accordée, récupération du token...");
        const token = await requestNotificationPermission(user.uid);
        
        if (token) {
          console.log('✅ [useNotifications] FCM réactivé avec succès');
        }
      } else if (currentPermission === 'default') {
        // Première fois : demander immédiatement
        console.log("🚀 [useNotifications] Demande de permission (première fois)...");
        
        const token = await requestNotificationPermission(user.uid);
        
        if (token) {
          console.log('✅ [useNotifications] FCM initialisé avec succès');
          toast({
            title: "✅ Notifications activées",
            description: "Vous recevrez les notifications même quand l'app est fermée",
            duration: 4000,
          });
        } else {
          console.log('⏭️ [useNotifications] Permission refusée ou non disponible');
        }
      } else {
        // Permission refusée
        console.log('⚠️ [useNotifications] Permission refusée précédemment');
      }
    };
    
    initFCM();
    
    // 2️⃣ Configurer les listeners une seule fois
    if (!listenerConfigured.current) {
      listenerConfigured.current = true;
      console.log("👂 [useNotifications] Configuration des listeners...");
      
      listenToForegroundMessages((payload) => {
        console.log("📬 [useNotifications] Message reçu:", payload.notification?.title);
        
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
      console.log("🧹 [useNotifications] Cleanup");
      initialized.current = false;
    };
  }, [user]);
};
