// 📁 src/lib/firebaseNotifications.ts
// Système complet de notifications push avec Firebase Cloud Messaging

import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { ref, set, get, update } from "firebase/database";
import { database } from "./firebase";
import { toast } from "@/hooks/use-toast";

// ✅ Configuration
const VAPID_KEY = "VOTRE_VAPID_KEY_ICI"; // À remplacer par votre clé VAPID depuis Firebase Console

// Types de notifications
export type NotificationType = 
  | "friend_request"
  | "friend_accepted"
  | "match_invite"
  | "match_started"
  | "match_completed"
  | "bet_won"
  | "bet_lost"
  | "tournament_starting"
  | "tournament_completed"
  | "club_invitation"
  | "fortune_received"
  | "badge_earned"
  | "new_message"
  | "offer_received"
  | "offer_accepted"
  | "offer_rejected"
  | "admin_announcement";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  senderId?: string;
  senderName?: string;
  icon?: string;
  actionUrl?: string;
  priority?: "high" | "normal";
}

// ✅ FONCTION : Demander la permission de notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!("Notification" in window)) {
      console.warn("Ce navigateur ne supporte pas les notifications");
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("✅ Permission de notifications accordée");
      return true;
    } else {
      console.log("⛔ Permission de notifications refusée");
      return false;
    }
  } catch (error) {
    console.error("Erreur demande permission:", error);
    return false;
  }
};

// ✅ FONCTION : Obtenir le token FCM
export const getFCMToken = async (messaging: Messaging, userId: string): Promise<string | null> => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (currentToken) {
      console.log("✅ Token FCM obtenu:", currentToken.substring(0, 20) + "...");
      
      // Sauvegarder le token dans Firebase
      await saveTokenToDatabase(userId, currentToken);
      return currentToken;
    } else {
      console.warn("⚠️ Impossible d'obtenir le token FCM");
      return null;
    }
  } catch (error) {
    console.error("❌ Erreur obtention token FCM:", error);
    return null;
  }
};

// ✅ FONCTION : Sauvegarder le token dans la base de données
const saveTokenToDatabase = async (userId: string, token: string): Promise<void> => {
  try {
    const tokenRef = ref(database, `users/${userId}/fcmToken`);
    await set(tokenRef, token);
    
    const lastUpdatedRef = ref(database, `users/${userId}/fcmTokenUpdatedAt`);
    await set(lastUpdatedRef, Date.now());
    
    console.log("💾 Token FCM sauvegardé");
  } catch (error) {
    console.error("Erreur sauvegarde token:", error);
  }
};

// ✅ FONCTION : Initialiser le système de notifications
export const initializeNotifications = async (userId: string): Promise<Messaging | null> => {
  try {
    // Vérifier si le navigateur supporte les notifications
    if (!("Notification" in window)) {
      console.warn("Notifications non supportées");
      return null;
    }

    // Demander la permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return null;
    }

    // Obtenir le messaging
    const messaging = getMessaging();
    
    // Obtenir et sauvegarder le token
    await getFCMToken(messaging, userId);
    
    // Écouter les messages en foreground
    onMessage(messaging, (payload) => {
      console.log("📩 Message reçu (foreground):", payload);
      
      const notification = payload.notification;
      if (notification) {
        // Afficher une notification toast
        toast({
          title: notification.title || "Notification",
          description: notification.body || "",
        });
        
        // Afficher une notification système
        if (Notification.permission === "granted") {
          new Notification(notification.title || "Baby-Foot App", {
            body: notification.body,
            icon: notification.icon || "/icons/logo-192.png",
            badge: "/icons/logo-192.png",
            tag: payload.data?.type || "general",
            data: payload.data,
          });
        }
      }
    });
    
    return messaging;
  } catch (error) {
    console.error("❌ Erreur initialisation notifications:", error);
    return null;
  }
};

// ✅ FONCTION : Envoyer une notification à un utilisateur spécifique
export const sendNotificationToUser = async (
  targetUserId: string,
  notification: NotificationPayload
): Promise<boolean> => {
  try {
    // Récupérer le token FCM de l'utilisateur cible
    const tokenRef = ref(database, `users/${targetUserId}/fcmToken`);
    const tokenSnapshot = await get(tokenRef);
    
    if (!tokenSnapshot.exists()) {
      console.warn(`⚠️ Pas de token FCM pour l'utilisateur ${targetUserId}`);
      return false;
    }

    const token = tokenSnapshot.val();
    
    // Créer la notification dans la base de données
    const notificationRef = ref(database, `notifications/${targetUserId}/${Date.now()}`);
    await set(notificationRef, {
      ...notification,
      read: false,
      createdAt: Date.now(),
    });
    
    // Incrémenter le compteur de notifications non lues
    const unreadRef = ref(database, `users/${targetUserId}/unreadNotifications`);
    const unreadSnapshot = await get(unreadRef);
    const currentUnread = unreadSnapshot.val() || 0;
    await set(unreadRef, currentUnread + 1);
    
    console.log(`✅ Notification envoyée à ${targetUserId}`);
    return true;
  } catch (error) {
    console.error("❌ Erreur envoi notification:", error);
    return false;
  }
};

// ✅ FONCTION : Obtenir les notifications d'un utilisateur
export const getUserNotifications = async (userId: string, limit: number = 20) => {
  try {
    const notificationsRef = ref(database, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const notifications = snapshot.val();
    const notificationsArray = Object.entries(notifications).map(([id, data]: [string, any]) => ({
      id,
      ...data,
    }));
    
    // Trier par date (plus récent en premier)
    notificationsArray.sort((a, b) => b.createdAt - a.createdAt);
    
    return notificationsArray.slice(0, limit);
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    return [];
  }
};

// ✅ FONCTION : Marquer une notification comme lue
export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
  try {
    const notificationRef = ref(database, `notifications/${userId}/${notificationId}`);
    await update(notificationRef, { read: true });
    
    // Décrémenter le compteur
    const unreadRef = ref(database, `users/${userId}/unreadNotifications`);
    const unreadSnapshot = await get(unreadRef);
    const currentUnread = unreadSnapshot.val() || 0;
    await set(unreadRef, Math.max(0, currentUnread - 1));
  } catch (error) {
    console.error("Erreur marquage notification:", error);
  }
};

// ✅ FONCTION : Marquer toutes les notifications comme lues
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notificationsRef = ref(database, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) return;
    
    const notifications = snapshot.val();
    const updates: { [key: string]: any } = {};
    
    Object.keys(notifications).forEach(id => {
      updates[`notifications/${userId}/${id}/read`] = true;
    });
    
    updates[`users/${userId}/unreadNotifications`] = 0;
    
    await update(ref(database), updates);
  } catch (error) {
    console.error("Erreur marquage toutes notifications:", error);
  }
};

// ✅ FONCTIONS SPÉCIFIQUES PAR TYPE D'ACTION

export const notifyFriendRequest = async (
  targetUserId: string,
  senderUserId: string,
  senderUsername: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "friend_request",
    title: "Nouvelle demande d'ami",
    body: `${senderUsername} vous a envoyé une demande d'ami`,
    userId: targetUserId,
    senderId: senderUserId,
    senderName: senderUsername,
    icon: "👥",
    actionUrl: "/profile",
    priority: "normal",
  });
};

export const notifyFriendAccepted = async (
  targetUserId: string,
  senderUserId: string,
  senderUsername: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "friend_accepted",
    title: "Demande d'ami acceptée",
    body: `${senderUsername} a accepté votre demande d'ami`,
    userId: targetUserId,
    senderId: senderUserId,
    senderName: senderUsername,
    icon: "✅",
    actionUrl: "/profile",
    priority: "normal",
  });
};

export const notifyMatchCompleted = async (
  targetUserId: string,
  matchResult: string,
  eloChange: number
) => {
  const isWin = eloChange > 0;
  return sendNotificationToUser(targetUserId, {
    type: "match_completed",
    title: isWin ? "Match gagné ! 🏆" : "Match terminé",
    body: `${matchResult} (${eloChange > 0 ? '+' : ''}${eloChange} ELO)`,
    userId: targetUserId,
    icon: isWin ? "🏆" : "⚽",
    actionUrl: "/match",
    priority: "high",
    data: { eloChange },
  });
};

export const notifyBetResult = async (
  targetUserId: string,
  isWin: boolean,
  amount: number
) => {
  return sendNotificationToUser(targetUserId, {
    type: isWin ? "bet_won" : "bet_lost",
    title: isWin ? "Pari gagné ! 💰" : "Pari perdu",
    body: isWin 
      ? `Vous avez gagné ${amount}€ !`
      : `Vous avez perdu ${amount}€`,
    userId: targetUserId,
    icon: isWin ? "💰" : "😢",
    actionUrl: "/betting",
    priority: "high",
    data: { amount, isWin },
  });
};

export const notifyTournamentStarting = async (
  targetUserId: string,
  tournamentName: string,
  startTime: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "tournament_starting",
    title: "Tournoi qui commence ! 🏆",
    body: `${tournamentName} commence ${startTime}`,
    userId: targetUserId,
    icon: "🏆",
    actionUrl: "/tournament",
    priority: "high",
  });
};

export const notifyFortuneReceived = async (
  targetUserId: string,
  amount: number,
  reason: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "fortune_received",
    title: "Fortune reçue ! 💵",
    body: `+${amount}€ - ${reason}`,
    userId: targetUserId,
    icon: "💵",
    actionUrl: "/profile",
    priority: "normal",
    data: { amount, reason },
  });
};

export const notifyBadgeEarned = async (
  targetUserId: string,
  badgeName: string,
  badgeIcon: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "badge_earned",
    title: "Nouveau badge débloqué ! 🏅",
    body: `Vous avez obtenu le badge "${badgeName}"`,
    userId: targetUserId,
    icon: badgeIcon,
    actionUrl: "/profile",
    priority: "normal",
    data: { badgeName },
  });
};

export const notifyNewMessage = async (
  targetUserId: string,
  senderName: string,
  messagePreview: string,
  chatId: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "new_message",
    title: `Message de ${senderName}`,
    body: messagePreview,
    userId: targetUserId,
    senderName,
    icon: "💬",
    actionUrl: "/chat",
    priority: "normal",
    data: { chatId },
  });
};

export const notifyOfferReceived = async (
  targetUserId: string,
  buyerName: string,
  amount: number,
  cardName: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "offer_received",
    title: "Nouvelle offre reçue ! 💼",
    body: `${buyerName} propose ${amount}€ pour ${cardName}`,
    userId: targetUserId,
    senderName: buyerName,
    icon: "💼",
    actionUrl: "/my-offers",
    priority: "high",
    data: { amount, cardName },
  });
};

export const notifyOfferAccepted = async (
  targetUserId: string,
  sellerName: string,
  cardName: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "offer_accepted",
    title: "Offre acceptée ! ✅",
    body: `${sellerName} a accepté votre offre pour ${cardName}`,
    userId: targetUserId,
    senderName: sellerName,
    icon: "✅",
    actionUrl: "/inventory",
    priority: "high",
    data: { cardName },
  });
};

export const notifyOfferRejected = async (
  targetUserId: string,
  sellerName: string,
  cardName: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "offer_rejected",
    title: "Offre refusée",
    body: `${sellerName} a refusé votre offre pour ${cardName}`,
    userId: targetUserId,
    senderName: sellerName,
    icon: "❌",
    actionUrl: "/my-offers",
    priority: "normal",
    data: { cardName },
  });
};

export const notifyAdminAnnouncement = async (
  targetUserId: string,
  title: string,
  message: string
) => {
  return sendNotificationToUser(targetUserId, {
    type: "admin_announcement",
    title: `📢 ${title}`,
    body: message,
    userId: targetUserId,
    icon: "📢",
    actionUrl: "/",
    priority: "high",
  });
};
