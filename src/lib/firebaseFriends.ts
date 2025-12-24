// 📁 src/lib/firebaseFriends.ts
// Gestion des amis et paramètres utilisateur avec Firebase

import { ref, set, get, update, remove, push, onValue, query, orderByChild, equalTo } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";
import { deoptimizeUserData } from "./dbOptimization";

// ============================
// 🤝 FRIENDS SYSTEM
// ============================

export type FriendStatus = "pending" | "accepted" | "declined";

export interface FriendRequest {
  id: string;
  from: string;
  fromUsername: string;
  to: string;
  status: FriendStatus;
  timestamp: number;
}

export interface Friend {
  id: string;
  username: string;
  eloRating: number;
  avatar?: string;
  status: "online" | "offline";
  lastSeen?: number;
}

/**
 * Envoyer une demande d'ami
 */
export async function sendFriendRequest(
  fromUserId: string,
  fromUsername: string,
  toUserId: string
): Promise<void> {
  try {
    // Vérifier que l'utilisateur cible existe
    const userRef = ref(database, `users/${toUserId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      throw new Error("Utilisateur introuvable");
    }

    // Vérifier si une demande existe déjà
    const existingRequestRef = ref(database, `friendRequests/${fromUserId}_${toUserId}`);
    const existingSnapshot = await get(existingRequestRef);
    
    if (existingSnapshot.exists()) {
      throw new Error("Demande d'ami déjà envoyée");
    }

    // Vérifier si déjà amis
    const friendRef = ref(database, `friends/${fromUserId}/${toUserId}`);
    const friendSnapshot = await get(friendRef);
    
    if (friendSnapshot.exists()) {
      throw new Error("Vous êtes déjà amis");
    }

    // Créer la demande
    const requestId = `${fromUserId}_${toUserId}`;
    const requestData: FriendRequest = {
      id: requestId,
      from: fromUserId,
      fromUsername,
      to: toUserId,
      status: "pending",
      timestamp: Date.now(),
    };

    await set(ref(database, `friendRequests/${requestId}`), requestData);
  } catch (error) {
    logger.error("Erreur lors de l'envoi de la demande:", error);
    throw error;
  }
}

/**
 * Accepter une demande d'ami
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  try {
    const requestRef = ref(database, `friendRequests/${requestId}`);
    const requestSnapshot = await get(requestRef);
    
    if (!requestSnapshot.exists()) {
      throw new Error("Demande introuvable");
    }

    const request = requestSnapshot.val() as FriendRequest;
    
    // Récupérer les infos des deux utilisateurs
    const fromUserRef = ref(database, `users/${request.from}`);
    const toUserRef = ref(database, `users/${request.to}`);
    
    const [fromSnapshot, toSnapshot] = await Promise.all([
      get(fromUserRef),
      get(toUserRef)
    ]);

    if (!fromSnapshot.exists() || !toSnapshot.exists()) {
      throw new Error("Utilisateur introuvable");
    }

    const rawFromUser = fromSnapshot.val();
    const rawToUser = toSnapshot.val();

    // Déoptimiser les données pour accéder aux champs username, eloRating, etc.
    const fromUser = deoptimizeUserData(rawFromUser);
    const toUser = deoptimizeUserData(rawToUser);

    const updates: { [path: string]: unknown } = {};

    // Ajouter comme amis mutuels
    updates[`friends/${request.from}/${request.to}`] = {
      id: request.to,
      username: toUser.username,
      eloRating: toUser.eloRating || 1000,
      avatar: toUser.avatar || null,
      addedAt: Date.now(),
    };

    updates[`friends/${request.to}/${request.from}`] = {
      id: request.from,
      username: fromUser.username,
      eloRating: fromUser.eloRating || 1000,
      avatar: fromUser.avatar || null,
      addedAt: Date.now(),
    };

    // Mettre à jour le statut de la demande
    updates[`friendRequests/${requestId}/status`] = "accepted";

    await update(ref(database), updates);
  } catch (error) {
    logger.error("Erreur lors de l'acceptation:", error);
    throw error;
  }
}

/**
 * Refuser une demande d'ami
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  try {
    await update(ref(database, `friendRequests/${requestId}`), {
      status: "declined",
    });
  } catch (error) {
    logger.error("Erreur lors du refus:", error);
    throw error;
  }
}

/**
 * Supprimer un ami
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  try {
    const updates: { [path: string]: null } = {};
    updates[`friends/${userId}/${friendId}`] = null;
    updates[`friends/${friendId}/${userId}`] = null;
    
    await update(ref(database), updates);
  } catch (error) {
    logger.error("Erreur lors de la suppression:", error);
    throw error;
  }
}

/**
 * Récupérer la liste des amis
 */
export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    const friendsRef = ref(database, `friends/${userId}`);
    const snapshot = await get(friendsRef);
    
    if (!snapshot.exists()) return [];
    
    const friendsData = snapshot.val();
    const friends: Friend[] = [];

    for (const [friendId, data] of Object.entries(friendsData)) {
      const friendData = data as Record<string, unknown>;
      
      // Récupérer le statut en ligne
      const statusRef = ref(database, `userStatus/${friendId}`);
      const statusSnapshot = await get(statusRef);
      const status = statusSnapshot.exists() ? (statusSnapshot.val() as { status: string }).status : "offline";
      const lastSeen = statusSnapshot.exists() ? (statusSnapshot.val() as { lastSeen: number }).lastSeen : null;

      friends.push({
        id: friendId,
        username: (friendData.username as string) || "Unknown",
        eloRating: (friendData.eloRating as number) || 1000,
        avatar: friendData.avatar as string | undefined,
        status: status as "online" | "offline",
        lastSeen: lastSeen as number | undefined,
      });
    }

    return friends;
  } catch (error) {
    logger.error("Erreur lors de la récupération des amis:", error);
    return [];
  }
}

/**
 * Récupérer les demandes d'ami reçues
 */
export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const requestsRef = ref(database, "friendRequests");
    const snapshot = await get(requestsRef);
    
    if (!snapshot.exists()) return [];
    
    const allRequests = snapshot.val();
    const pendingRequests: FriendRequest[] = [];

    for (const [requestId, data] of Object.entries(allRequests)) {
      const request = data as FriendRequest;
      if (request.to === userId && request.status === "pending") {
        pendingRequests.push({ ...request, id: requestId });
      }
    }

    return pendingRequests.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error("Erreur lors de la récupération des demandes:", error);
    return [];
  }
}

/**
 * Écouter les changements d'amis en temps réel
 */
export function onFriendsUpdate(userId: string, callback: (friends: Friend[]) => void): () => void {
  const friendsRef = ref(database, `friends/${userId}`);
  
  const unsubscribe = onValue(friendsRef, async (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const friendsData = snapshot.val();
    const friends: Friend[] = [];

    for (const [friendId, data] of Object.entries(friendsData)) {
      const friendData = data as Record<string, unknown>;
      
      const statusRef = ref(database, `userStatus/${friendId}`);
      const statusSnapshot = await get(statusRef);
      const status = statusSnapshot.exists() ? (statusSnapshot.val() as { status: string }).status : "offline";
      const lastSeen = statusSnapshot.exists() ? (statusSnapshot.val() as { lastSeen: number }).lastSeen : null;

      friends.push({
        id: friendId,
        username: (friendData.username as string) || "Unknown",
        eloRating: (friendData.eloRating as number) || 1000,
        avatar: friendData.avatar as string | undefined,
        status: status as "online" | "offline",
        lastSeen: lastSeen as number | undefined,
      });
    }

    callback(friends);
  });

  return unsubscribe;
}

// ============================
// ⚙️ USER SETTINGS
// ============================

export interface UserSettings {
  notifications: {
    enabled: boolean;
    matchReminders: boolean;
    friendRequests: boolean;
    achievements: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number;
  };
  privacy: {
    profilePublic: boolean;
    showStats: boolean;
    allowFriendRequests: boolean;
    showOnlineStatus: boolean;
  };
  appearance: {
    darkMode: boolean;
    language: string;
  };
}

export const defaultSettings: UserSettings = {
  notifications: {
    enabled: true,
    matchReminders: true,
    friendRequests: true,
    achievements: true,
  },
  sound: {
    enabled: true,
    volume: 50,
  },
  privacy: {
    profilePublic: true,
    showStats: true,
    allowFriendRequests: true,
    showOnlineStatus: true,
  },
  appearance: {
    darkMode: true,
    language: "fr",
  },
};

/**
 * Récupérer les paramètres utilisateur
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const settingsRef = ref(database, `userSettings/${userId}`);
    const snapshot = await get(settingsRef);
    
    if (!snapshot.exists()) {
      // Créer les paramètres par défaut
      await set(settingsRef, defaultSettings);
      return defaultSettings;
    }
    
    return snapshot.val() as UserSettings;
  } catch (error) {
    logger.error("Erreur lors de la récupération des paramètres:", error);
    return defaultSettings;
  }
}

/**
 * Mettre à jour les paramètres utilisateur
 */
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  try {
    const settingsRef = ref(database, `userSettings/${userId}`);
    const currentSettings = await getUserSettings(userId);
    
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      notifications: {
        ...currentSettings.notifications,
        ...settings.notifications,
      },
      sound: {
        ...currentSettings.sound,
        ...settings.sound,
      },
      privacy: {
        ...currentSettings.privacy,
        ...settings.privacy,
      },
      appearance: {
        ...currentSettings.appearance,
        ...settings.appearance,
      },
    };

    await set(settingsRef, updatedSettings);
  } catch (error) {
    logger.error("Erreur lors de la mise à jour des paramètres:", error);
    throw error;
  }
}

/**
 * Écouter les changements de paramètres en temps réel
 */
export function onSettingsUpdate(userId: string, callback: (settings: UserSettings) => void): () => void {
  const settingsRef = ref(database, `userSettings/${userId}`);
  
  const unsubscribe = onValue(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as UserSettings);
    } else {
      callback(defaultSettings);
    }
  });

  return unsubscribe;
}

// ============================
// 📊 USER STATUS (Online/Offline)
// ============================

/**
 * Définir le statut en ligne de l'utilisateur
 */
export async function setUserOnlineStatus(userId: string, online: boolean): Promise<void> {
  try {
    const statusRef = ref(database, `userStatus/${userId}`);
    await set(statusRef, {
      status: online ? "online" : "offline",
      lastSeen: Date.now(),
    });
  } catch (error) {
    logger.error("Erreur lors de la mise à jour du statut:", error);
  }
}

/**
 * Chercher des utilisateurs par nom
 */
export async function searchUsers(searchTerm: string, currentUserId: string): Promise<Friend[]> {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return [];
    
    const users = snapshot.val();
    const results: Friend[] = [];

    for (const [userId, data] of Object.entries(users)) {
      const userData = data as Record<string, unknown>;
      
      // Exclure l'utilisateur actuel
      if (userId === currentUserId) continue;
      
      // Filtrer par nom
      const username = (userData.username as string) || "";
      if (username.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({
          id: userId,
          username,
          eloRating: (userData.eloRating as number) || 1000,
          avatar: userData.avatar as string | undefined,
          status: "offline",
        });
      }
    }

    return results;
  } catch (error) {
    logger.error("Erreur lors de la recherche:", error);
    return [];
  }
}

