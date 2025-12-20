// 📁 src/hooks/useNotifications.ts
// Hook personnalisé pour initialiser et gérer les notifications

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  initializeNotifications, 
  requestNotificationPermission 
} from '@/lib/firebaseNotifications';
import { Messaging } from 'firebase/messaging';
import { toast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!user || isInitialized) return;

    const initNotifications = async () => {
      try {
        console.log('🔔 Initialisation des notifications pour:', user.uid);

        // Vérifier si le navigateur supporte les notifications
        if (!('Notification' in window)) {
          console.warn('⚠️ Les notifications ne sont pas supportées par ce navigateur');
          return;
        }

        // Vérifier la permission actuelle
        if (Notification.permission === 'granted') {
          setPermissionGranted(true);
          
          // Initialiser Firebase Messaging
          const msg = await initializeNotifications(user.uid);
          
          if (msg) {
            setMessaging(msg);
            setIsInitialized(true);
            console.log('✅ Notifications initialisées avec succès');
          }
        } else if (Notification.permission === 'default') {
          // Demander la permission après un délai (meilleure UX)
          setTimeout(async () => {
            const granted = await requestNotificationPermission();
            
            if (granted) {
              setPermissionGranted(true);
              const msg = await initializeNotifications(user.uid);
              
              if (msg) {
                setMessaging(msg);
                setIsInitialized(true);
                
                toast({
                  title: "🔔 Notifications activées",
                  description: "Vous recevrez désormais des notifications pour vos matchs, paris et messages.",
                });
              }
            }
          }, 3000); // Attendre 3 secondes après le chargement
        } else {
          console.log('❌ Permission des notifications refusée');
        }
      } catch (error) {
        console.error('❌ Erreur initialisation notifications:', error);
      }
    };

    initNotifications();
  }, [user, isInitialized]);

  return {
    messaging,
    permissionGranted,
    isInitialized,
  };
};
