// 📁 src/lib/firebaseNotifications.ts
// ✅ SYSTÈME DE NOTIFICATIONS SIMPLIFIÉ (sans FCM)
// Ce système utilise uniquement Firebase Realtime Database
// Pas besoin de backend, service workers ou clé VAPID

import { ref, push, update } from "firebase/database";
import { database } from "./firebase";

export interface Notification {
  id: string;
  userId: string;
  type: 
    | "offer_received" 
    | "offer_accepted" 
    | "offer_rejected" 
    | "offer_countered" 
    | "listing_sold"
    | "new_message"
    | "friend_request"
    | "match_completed"
    | "tournament_starting"
    | "bet_won"
    | "bet_lost"
    | "fortune_received"
    | "admin_announcement";
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  createdAt: number;
}

/**
 * ✅ Fonction générique pour créer une notification
 */
async function createNotification(
  userId: string,
  type: Notification["type"],
  title: string,
  message: string,
  relatedId?: string
): Promise<void> {
  try {
    const notificationRef = ref(database, `notifications/${userId}`);
    const newNotificationRef = push(notificationRef);
    
    await update(newNotificationRef, {
      type,
      title,
      message,
      relatedId: relatedId || "",
      read: false,
      createdAt: Date.now(),
    });

    console.log(`✅ Notification envoyée à ${userId}: ${title}`);
  } catch (error) {
    console.error("❌ Erreur création notification:", error);
    throw error;
  }
}

// ========================================
// 🛒 NOTIFICATIONS MARCHÉ DE CARTES
// ========================================

export async function notifyOfferReceived(
  sellerId: string,
  buyerUsername: string,
  amount: number,
  cardName: string
): Promise<void> {
  await createNotification(
    sellerId,
    "offer_received",
    "Nouvelle offre reçue",
    `${buyerUsername} vous propose ${amount}€ pour ${cardName}`,
    undefined
  );
}

export async function notifyOfferAccepted(
  buyerId: string,
  sellerUsername: string,
  cardName: string
): Promise<void> {
  await createNotification(
    buyerId,
    "offer_accepted",
    "Offre acceptée ✅",
    `${sellerUsername} a accepté votre offre pour ${cardName}`,
    undefined
  );
}

export async function notifyOfferRejected(
  buyerId: string,
  sellerUsername: string,
  cardName: string
): Promise<void> {
  await createNotification(
    buyerId,
    "offer_rejected",
    "Offre refusée",
    `${sellerUsername} a refusé votre offre pour ${cardName}`,
    undefined
  );
}

export async function notifyOfferCountered(
  buyerId: string,
  sellerUsername: string,
  newAmount: number,
  cardName: string
): Promise<void> {
  await createNotification(
    buyerId,
    "offer_countered",
    "Contre-offre reçue",
    `${sellerUsername} propose ${newAmount}€ pour ${cardName}`,
    undefined
  );
}

export async function notifyListingSold(
  sellerId: string,
  buyerUsername: string,
  cardName: string,
  price: number
): Promise<void> {
  await createNotification(
    sellerId,
    "listing_sold",
    "Carte vendue ✅",
    `${buyerUsername} a acheté ${cardName} pour ${price}€`,
    undefined
  );
}

// ========================================
// 💬 NOTIFICATIONS CHAT
// ========================================

export async function notifyNewMessage(
  recipientId: string,
  senderUsername: string,
  messagePreview: string,
  chatId: string
): Promise<void> {
  await createNotification(
    recipientId,
    "new_message",
    `Message de ${senderUsername}`,
    messagePreview,
    chatId
  );
}

// ========================================
// 👥 NOTIFICATIONS AMIS
// ========================================

export async function notifyFriendRequest(
  recipientId: string,
  senderUsername: string
): Promise<void> {
  await createNotification(
    recipientId,
    "friend_request",
    "Nouvelle demande d'ami",
    `${senderUsername} vous a envoyé une demande d'ami`,
    undefined
  );
}

// ========================================
// 🎮 NOTIFICATIONS MATCHS
// ========================================

export async function notifyMatchCompleted(
  userId: string,
  result: string,
  eloChange: number
): Promise<void> {
  const changeText = eloChange > 0 
    ? `+${eloChange} ELO` 
    : `${eloChange} ELO`;
    
  await createNotification(
    userId,
    "match_completed",
    "Match terminé",
    `${result} • ${changeText}`,
    undefined
  );
}

// ========================================
// 🏆 NOTIFICATIONS TOURNOI
// ========================================

export async function notifyTournamentStarting(
  userId: string,
  tournamentName: string,
  startTime: string
): Promise<void> {
  await createNotification(
    userId,
    "tournament_starting",
    "Tournoi sur le point de commencer",
    `${tournamentName} débute ${startTime}`,
    undefined
  );
}

// ========================================
// 💰 NOTIFICATIONS PARIS
// ========================================

export async function notifyBetResult(
  userId: string,
  won: boolean,
  amount: number
): Promise<void> {
  await createNotification(
    userId,
    won ? "bet_won" : "bet_lost",
    won ? "Pari gagné! 🎉" : "Pari perdu",
    won 
      ? `Vous avez gagné ${amount}€!`
      : `Vous avez perdu ${amount}€`,
    undefined
  );
}

// ========================================
// 💸 NOTIFICATIONS FORTUNE
// ========================================

export async function notifyFortuneReceived(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  await createNotification(
    userId,
    "fortune_received",
    "Fortune reçue 💰",
    `+${amount}€ - ${reason}`,
    undefined
  );
}

// ========================================
// 📢 NOTIFICATIONS ADMIN
// ========================================

export async function notifyAdminAnnouncement(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  await createNotification(
    userId,
    "admin_announcement",
    `📢 ${title}`,
    message,
    undefined
  );
}

/**
 * ✅ Envoyer une notification à tous les utilisateurs
 */
export async function notifyAllUsers(
  title: string,
  message: string
): Promise<void> {
  try {
    const { ref: dbRef, get } = await import("firebase/database");
    const usersRef = dbRef(database, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      console.warn("⚠️ Aucun utilisateur trouvé");
      return;
    }

    const users = snapshot.val();
    const promises: Promise<void>[] = [];

    Object.keys(users).forEach((userId) => {
      promises.push(
        notifyAdminAnnouncement(userId, title, message)
      );
    });

    await Promise.all(promises);
    console.log(`✅ Notification envoyée à ${promises.length} utilisateurs`);
  } catch (error) {
    console.error("❌ Erreur notification globale:", error);
    throw error;
  }
}
