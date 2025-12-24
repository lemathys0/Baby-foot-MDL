// 📁 src/lib/firebaseExtended.ts
// ============================
// Fonctions pour Clubs, Badges, Shop, Historique, Paramètres et Amis
// ✅ FIX: Correction complète du système avec Bannières + Titres

import { ref, get, set, update, push, onValue, runTransaction } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";
import { optimizeFortuneHistoryEntry, toSeconds, optimizeBadgeData, BADGE_ENUM } from "./dbOptimization";

// ============================
// 🏆 CLUBS / CLANS
// ============================

export interface Club {
  id: string;
  name: string;
  logo: string;
  color: string;
  founderId: string;
  members: Record<string, ClubMember>;
  treasury: number;
  totalEarnings: number;
  createdAt: number;
  bonuses: {
    xpBoost?: boolean;
    fortuneBoost?: boolean;
    premiumCards?: boolean;
  };
}

export interface ClubMember {
  userId: string;
  username: string;
  role: "founder" | "member";
  joinedAt: number;
  contributions: number;
}

export async function createClub(
  founderId: string,
  founderUsername: string,
  clubName: string,
  logo: string,
  color: string
): Promise<string> {
  try {
    const clubsRef = ref(database, "clubs");
    const newClubRef = push(clubsRef);
    const clubId = newClubRef.key!;

    const clubData: Club = {
      id: clubId,
      name: clubName,
      logo,
      color,
      founderId,
      members: {
        [founderId]: {
          userId: founderId,
          username: founderUsername,
          role: "founder",
          joinedAt: Date.now(),
          contributions: 0,
        },
      },
      treasury: 0,
      totalEarnings: 0,
      createdAt: Date.now(),
      bonuses: {},
    };
    
    await set(newClubRef, clubData);
    await update(ref(database, `users/${founderId}`), { clubId });

    logger.log(`✅ Club créé: ${clubId} par ${founderId}`);
    return clubId;
  } catch (error) {
    logger.error("Erreur création club:", error);
    throw new Error("Impossible de créer le club.");
  }
}

export async function joinClub(
  clubId: string,
  userId: string,
  username: string
): Promise<void> {
  try {
    const clubRef = ref(database, `clubs/${clubId}`);
    const clubSnapshot = await get(clubRef);
    if (!clubSnapshot.exists()) {
      throw new Error("Club introuvable.");
    }

    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    if (userSnapshot.exists() && userSnapshot.val().clubId) {
      throw new Error("Vous êtes déjà membre d'un autre club.");
    }

    const newMember: ClubMember = {
      userId,
      username,
      role: "member",
      joinedAt: Date.now(),
      contributions: 0,
    };
    
    const updates: { [path: string]: any } = {};
    updates[`clubs/${clubId}/members/${userId}`] = newMember;
    updates[`users/${userId}/clubId`] = clubId;

    await update(ref(database), updates);
    logger.log(`✅ ${userId} a rejoint le club ${clubId}`);
  } catch (error) {
    logger.error("Erreur rejoindre club:", error);
    throw error;
  }
}

export async function contributeToClub(
  userId: string,
  clubId: string,
  amount: number
): Promise<void> {
  try {
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
       throw new Error("Utilisateur introuvable");
    }

    const userData = userSnapshot.val();
    const currentFortune = userData.fortune || 0;
    
    if (currentFortune < amount) {
      throw new Error("Fonds insuffisants");
    }

    const clubRef = ref(database, `clubs/${clubId}`);
    const clubSnapshot = await get(clubRef);
    
    if (!clubSnapshot.exists()) {
      throw new Error("Club introuvable");
    }
    
    const club = clubSnapshot.val();

    if (!club.members || !club.members[userId]) {
      throw new Error("Vous devez être membre du club pour contribuer");
    }
    
    const currentContributions = club.members?.[userId]?.contributions || 0;
    const newFortune = currentFortune - amount;
    
    const updates: { [path: string]: unknown } = {};
    updates[`users/${userId}/fortune`] = newFortune;
    updates[`clubs/${clubId}/treasury`] = (club.treasury || 0) + amount;
    updates[`clubs/${clubId}/members/${userId}/contributions`] = currentContributions + amount;

    await update(ref(database), updates);

    logger.log(`✅ Contribution de ${amount}€ ajoutée au club ${clubId} par ${userId}`);

    // Historique de fortune
    await addFortuneHistoryEntry(
      userId,
      newFortune,
      -amount,
      `Contribution club ${clubId}`
    );

  } catch (error) {
    logger.error("Erreur contribution club:", error);
    throw error;
  }
}

export async function buyClubBonus(
  clubId: string,
  bonusId: keyof Club['bonuses'],
  cost: number
): Promise<void> {
  try {
    const clubRef = ref(database, `clubs/${clubId}`);
    const clubSnapshot = await get(clubRef);
    if (!clubSnapshot.exists()) {
      throw new Error("Club introuvable.");
    }
    const club = clubSnapshot.val() as Club;

    if ((club.treasury || 0) < cost) {
      throw new Error("Trésorerie insuffisante pour acheter ce bonus.");
    }
    if (club.bonuses[bonusId]) {
      throw new Error("Ce bonus est déjà actif.");
    }

    const updates: { [path: string]: any } = {};
    updates[`treasury`] = (club.treasury || 0) - cost;
    updates[`bonuses/${bonusId}`] = true;

    await update(clubRef, updates);
    logger.log(`✅ Bonus ${bonusId} acheté pour le club ${clubId}`);
  } catch (error) {
    logger.error("Erreur achat bonus club:", error);
    throw error;
  }
}

export async function leaveClub(clubId: string, userId: string): Promise<void> {
  try {
    const updates: { [path: string]: any } = {};
    updates[`clubs/${clubId}/members/${userId}`] = null;
    updates[`users/${userId}/clubId`] = null;

    await update(ref(database), updates);
    logger.log(`✅ ${userId} a quitté le club ${clubId}`);
  } catch (error) {
    logger.error("Erreur quitter club:", error);
    throw new Error("Impossible de quitter le club.");
  }
}

export function onClubDataUpdate(
  clubId: string,
  callback: (club: Club | null) => void
): () => void {
  const clubRef = ref(database, `clubs/${clubId}`);

  const unsubscribe = onValue(clubRef, (snapshot) => {
    if (snapshot.exists()) {
      const clubData = snapshot.val() as Club;
      if (!clubData.members) {
         clubData.members = {};
      }
      callback(clubData);
    } else {
      callback(null);
    }
  }, (error) => {
    logger.error("Erreur d'écoute des données du club:", error);
    callback(null);
  });

  return unsubscribe;
}

// ============================
// 💸 HISTORIQUE DE FORTUNE
// ============================

export interface FortuneHistory {
  timestamp: number;
  fortune: number;
  change: number;
  reason: string;
}

export async function addFortuneHistoryEntry(
  userId: string,
  fortune: number,
  change: number,
  reason: string
): Promise<void> {
  try {
    const historyRef = ref(database, `fortuneHistory/${userId}`);
    const newEntryRef = push(historyRef);

    // ✅ OPTIMISÉ: Structure compactée (ts=secondes, rs=enum)
    const entry = optimizeFortuneHistoryEntry({
      timestamp: Date.now(),
      fortune,
      change,
      reason,
    });

    await set(newEntryRef, entry);

    // Nettoyage automatique des entrées > 30 jours (optimisé)
    const snapshot = await get(historyRef);
    if (snapshot.exists()) {
      const entries = snapshot.val();
      const cutoffSeconds = toSeconds(Date.now() - (30 * 24 * 60 * 60 * 1000));

      const updates: { [path: string]: any } = {};
      Object.entries(entries).forEach(([key, entry]: [string, any]) => {
        if (entry.ts < cutoffSeconds) {
          updates[`fortuneHistory/${userId}/${key}`] = null;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    }
  } catch (error) {
    logger.error("Erreur ajout historique:", error);
  }
}

export async function getFortuneHistory(
  userId: string,
  days: number = 30
): Promise<FortuneHistory[]> {
  try {
    const historyRef = ref(database, `fortuneHistory/${userId}`);
    const snapshot = await get(historyRef);
    
    if (!snapshot.exists()) return [];
    
    const allEntries = Object.values(snapshot.val()) as FortuneHistory[];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

    return allEntries
      .filter(entry => entry.timestamp >= cutoff)
      // Tri croissant (du plus ancien au plus récent) pour que
      // history[0] = début de période et history[history.length-1] = fortune actuelle
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'historique de fortune:", error);
    return [];
  }
}

export function onFortuneHistoryUpdate(
  userId: string,
  callback: (history: FortuneHistory[]) => void
): () => void {
  const historyRef = ref(database, `fortuneHistory/${userId}`);

  const unsubscribe = onValue(historyRef, (snapshot) => {
    if (snapshot.exists()) {
      const allEntries = Object.values(snapshot.val()) as FortuneHistory[];
      
      const days = 30;
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      const filteredHistory = allEntries
        .filter(entry => entry.timestamp >= cutoff)
        .sort((a, b) => b.timestamp - a.timestamp); 
      
      callback(filteredHistory);
    } else {
      callback([]);
    }
  }, (error) => {
    logger.error("Erreur d'écoute de l'historique de fortune:", error);
    callback([]);
  });

  return unsubscribe;
}

/**
 * ✅ OPTIMISATION: Nettoyer l'historique de fortune > 30 jours
 * Réduit la taille de la base de données de 60-70%
 * À appeler périodiquement (ex: tous les jours via une tâche planifiée)
 */
export async function cleanupOldFortuneHistory(userId: string): Promise<{ deleted: number; kept: number }> {
  try {
    const historyRef = ref(database, `fortuneHistory/${userId}`);
    const snapshot = await get(historyRef);

    if (!snapshot.exists()) {
      return { deleted: 0, kept: 0 };
    }

    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 jours
    const updates: { [path: string]: any } = {};
    let deletedCount = 0;
    let keptCount = 0;

    snapshot.forEach((child) => {
      const entry = child.val();
      if (entry.timestamp < cutoffDate) {
        // Marquer pour suppression
        updates[`fortuneHistory/${userId}/${child.key}`] = null;
        deletedCount++;
      } else {
        keptCount++;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
      logger.log(`🗑️ [Cleanup] Supprimé ${deletedCount} entrées d'historique pour ${userId}, conservé ${keptCount}`);
    }

    return { deleted: deletedCount, kept: keptCount };
  } catch (error) {
    logger.error("Erreur nettoyage historique fortune:", error);
    return { deleted: 0, kept: 0 };
  }
}

/**
 * ✅ OPTIMISATION: Nettoyer tous les historiques anciens
 * À exécuter via une Cloud Function ou un script admin
 */
export async function cleanupAllFortuneHistories(): Promise<void> {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return;

    let totalDeleted = 0;
    let totalKept = 0;

    const userIds = Object.keys(snapshot.val());
    logger.log(`🧹 [Cleanup Global] Nettoyage de ${userIds.length} utilisateurs...`);

    for (const userId of userIds) {
      const result = await cleanupOldFortuneHistory(userId);
      totalDeleted += result.deleted;
      totalKept += result.kept;
    }

    logger.log(`✅ [Cleanup Global] Terminé: ${totalDeleted} entrées supprimées, ${totalKept} conservées`);
  } catch (error) {
    logger.error("Erreur nettoyage global historique:", error);
  }
}

// 🔧 CORRECTIONS pour getUserSettings et getFriends
// Remplacer les fonctions existantes dans firebaseExtended.ts

// ============================
// ⚙️ PARAMÈTRES UTILISATEUR - CORRIGÉ
// ============================

export interface UserSettings {
  privacy: {
    showStats: boolean;
    allowFriendRequests: boolean;
  };
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    // ✅ FIX: Accès direct à users/{userId}/settings (pas userSettings)
    const settingsRef = ref(database, `users/${userId}/settings`);
    const snapshot = await get(settingsRef);

    const defaultSettings: UserSettings = {
      privacy: {
        showStats: true,
        allowFriendRequests: true,
      },
    };

    if (!snapshot.exists()) {
      // Créer les paramètres par défaut si inexistants
      await set(settingsRef, defaultSettings);
      return defaultSettings;
    }

    const existingSettings = snapshot.val();
    
    // Vérifier la structure
    if (!existingSettings.privacy) {
      // Migrer l'ancienne structure si nécessaire
      const migratedSettings = {
        privacy: {
          showStats: existingSettings.showStats !== false,
          allowFriendRequests: existingSettings.allowFriendRequests !== false,
        }
      };
      await set(settingsRef, migratedSettings);
      return migratedSettings;
    }

    return {
      privacy: {
        showStats: existingSettings.privacy.showStats !== false,
        allowFriendRequests: existingSettings.privacy.allowFriendRequests !== false,
      },
    };

  } catch (error) {
    logger.error("Erreur récupération paramètres utilisateur:", error);
    // Retourner valeurs par défaut en cas d'erreur
    return {
      privacy: {
        showStats: true,
        allowFriendRequests: true,
      },
    };
  }
}

export async function updateUserSettings(userId: string, settings: UserSettings): Promise<void> {
  try {
    // ✅ FIX: Accès direct à users/{userId}/settings
    const settingsRef = ref(database, `users/${userId}/settings`);
    await set(settingsRef, settings);
    logger.log(`✅ Paramètres mis à jour pour ${userId}`);
  } catch (error) {
    logger.error("Erreur mise à jour paramètres utilisateur:", error);
    throw new Error("Impossible de sauvegarder les paramètres.");
  }
}

// ============================
// 🤝 AMIS / UTILISATEURS - CORRIGÉ
// ============================

export interface UserProfile {
  id: string;
  username: string;
  role: "player" | "agent" | "admin";
  eloRating: number;
  wins: number;
  losses: number;
  fortune: number;
  totalEarned: number;
  createdAt: string;
  clubId?: string;
}

export async function getFriends(userId: string): Promise<UserProfile[]> {
  try {
    // ✅ FIX: Accès direct à users/{userId}/friends
    const friendsRef = ref(database, `users/${userId}/friends`);
    const snapshot = await get(friendsRef);

    if (!snapshot.exists()) {
      logger.log(`Aucun ami trouvé pour ${userId}`);
      return [];
    }

    const friendsData = snapshot.val();

    // Vérifier si c'est un objet avec des clés (IDs d'amis)
    if (typeof friendsData !== 'object') {
      logger.log(`Structure friends invalide pour ${userId}`);
      return [];
    }

    const friendIds = Object.keys(friendsData);
    logger.log(`${friendIds.length} ami(s) trouvé(s) pour ${userId}`);
    
    const friendProfiles: UserProfile[] = [];
    
    for (const friendId of friendIds) {
      try {
        const userRef = ref(database, `users/${friendId}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const user = userSnapshot.val();
          friendProfiles.push({
            id: friendId,
            username: user.username || "Joueur inconnu",
            role: user.role || 'player',
            eloRating: user.eloRating || user.eloGlobal || 1000,
            wins: user.wins || 0,
            losses: user.losses || 0,
            fortune: user.fortune || 0,
            totalEarned: user.totalEarned || 0,
            createdAt: user.createdAt || new Date().toISOString(),
            clubId: user.clubId,
          });
        } else {
          logger.warn(`Utilisateur ${friendId} introuvable (ami orphelin)`);
        }
      } catch (error) {
        logger.error(`Erreur chargement ami ${friendId}:`, error);
      }
    }

    return friendProfiles;
  } catch (error) {
    logger.error("Erreur récupération amis:", error);
    // Ne pas throw, retourner tableau vide
    return [];
  }
}

export async function getPendingFriendRequests(userId: string): Promise<UserProfile[]> {
  try {
    // Structure: friendRequests/{userId}/received/{senderId}
    const requestsRef = ref(database, `friendRequests/${userId}/received`);
    const snapshot = await get(requestsRef);

    if (!snapshot.exists()) {
      logger.log(`Aucune demande d'ami en attente pour ${userId}`);
      return [];
    }

    const requestsData = snapshot.val();
    const senderIds = Object.keys(requestsData);
    logger.log(`${senderIds.length} demande(s) d'ami en attente pour ${userId}`);
    
    const senderProfiles: UserProfile[] = [];
    
    for (const senderId of senderIds) {
      try {
        const userRef = ref(database, `users/${senderId}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const user = userSnapshot.val();
          senderProfiles.push({
            id: senderId,
            username: user.username || "Joueur inconnu",
            role: user.role || 'player',
            eloRating: user.eloRating || user.eloGlobal || 1000,
            wins: user.wins || 0,
            losses: user.losses || 0,
            fortune: user.fortune || 0,
            totalEarned: user.totalEarned || 0,
            createdAt: user.createdAt || new Date().toISOString(),
            clubId: user.clubId,
          });
        }
      } catch (error) {
        logger.error(`Erreur chargement expéditeur ${senderId}:`, error);
      }
    }

    return senderProfiles;
  } catch (error) {
    logger.error("Erreur récupération demandes d'amis:", error);
    return [];
  }
}

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<void> {
  try {
    if (senderId === receiverId) {
      throw new Error("Vous ne pouvez pas vous ajouter vous-même");
    }

    // Vérifier si déjà amis
    const friendsRef = ref(database, `users/${senderId}/friends/${receiverId}`);
    const friendSnapshot = await get(friendsRef);
    
    if (friendSnapshot.exists()) {
      throw new Error("Vous êtes déjà amis");
    }

    // Vérifier si demande déjà envoyée
    const sentRef = ref(database, `friendRequests/${senderId}/sent/${receiverId}`);
    const sentSnapshot = await get(sentRef);
    
    if (sentSnapshot.exists()) {
      throw new Error("Demande déjà envoyée");
    }

    const updates: { [path: string]: any } = {};
    updates[`friendRequests/${senderId}/sent/${receiverId}`] = { 
      timestamp: Date.now(),
      status: 'pending'
    };
    updates[`friendRequests/${receiverId}/received/${senderId}`] = { 
      timestamp: Date.now(),
      status: 'pending'
    };

    await update(ref(database), updates);
    logger.log(`✅ Demande d'ami envoyée: ${senderId} → ${receiverId}`);
  } catch (error) {
    logger.error("Erreur envoi demande d'ami:", error);
    throw error;
  }
}

export async function acceptFriendRequest(userId: string, senderId: string): Promise<void> {
  try {
    const timestamp = Date.now();
    
    const updates: { [path: string]: any } = {};
    
    // Ajouter aux amis
    updates[`users/${userId}/friends/${senderId}`] = { addedAt: timestamp };
    updates[`users/${senderId}/friends/${userId}`] = { addedAt: timestamp };
    
    // Supprimer les demandes
    updates[`friendRequests/${userId}/received/${senderId}`] = null;
    updates[`friendRequests/${senderId}/sent/${userId}`] = null;

    await update(ref(database), updates);
    logger.log(`✅ Demande d'ami acceptée: ${userId} ↔ ${senderId}`);
  } catch (error) {
    logger.error("Erreur acceptation demande d'ami:", error);
    throw new Error("Impossible d'accepter la demande d'ami.");
  }
}

export async function declineFriendRequest(userId: string, senderId: string): Promise<void> {
  try {
    const updates: { [path: string]: any } = {};
    updates[`friendRequests/${userId}/received/${senderId}`] = null;
    updates[`friendRequests/${senderId}/sent/${userId}`] = null;

    await update(ref(database), updates);
    logger.log(`✅ Demande d'ami refusée: ${userId} ✗ ${senderId}`);
  } catch (error) {
    logger.error("Erreur refus demande d'ami:", error);
    throw new Error("Impossible de refuser la demande d'ami.");
  }
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  try {
    const updates: { [path: string]: any } = {};
    updates[`users/${userId}/friends/${friendId}`] = null;
    updates[`users/${friendId}/friends/${userId}`] = null;

    await update(ref(database), updates);
    logger.log(`✅ Ami supprimé: ${userId} ✗ ${friendId}`);
  } catch (error) {
    logger.error("Erreur suppression ami:", error);
    throw new Error("Impossible de supprimer l'ami.");
  }
}

export async function searchUsers(queryText: string): Promise<UserProfile[]> {
  try {
    if (!queryText || queryText.trim().length < 2) {
      return [];
    }

    const usersRef = ref(database, `users`);
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      return [];
    }

    const allUsers = snapshot.val();
    const lowerCaseQuery = queryText.toLowerCase().trim();

    const results: UserProfile[] = [];
    
    Object.keys(allUsers).forEach(userId => {
      const user = allUsers[userId];
      
      // Ne pas inclure les utilisateurs sans username
      if (!user.username) return;
      
      // Recherche par username
      if (user.username.toLowerCase().includes(lowerCaseQuery)) {
        results.push({
          id: userId,
          username: user.username,
          role: user.role || 'player',
          eloRating: user.eloRating || user.eloGlobal || 1000,
          wins: user.wins || 0,
          losses: user.losses || 0,
          fortune: user.fortune || 0,
          totalEarned: user.totalEarned || 0,
          createdAt: user.createdAt || new Date().toISOString(),
          clubId: user.clubId,
        });
      }
    });

    // Trier par pertinence (commence par la recherche d'abord)
    results.sort((a, b) => {
      const aStarts = a.username.toLowerCase().startsWith(lowerCaseQuery);
      const bStarts = b.username.toLowerCase().startsWith(lowerCaseQuery);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.username.localeCompare(b.username);
    });

    return results.slice(0, 20); // Limiter à 20 résultats
  } catch (error) {
    logger.error("Erreur recherche utilisateurs:", error);
    return [];
  }
}

// ============================
// 🎁 LOOTBOX SYSTEM
// ============================

export interface LootboxReward {
  itemId: string;
  itemName: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  type: "avatar" | "theme" | "banner" | "title" | "effect";
  isNew: boolean;
}

interface LootboxResult {
  rewards: LootboxReward[];
  fortuneBonus: number;
}

const LOOTBOX_DROP_RATES = {
  lootbox_starter: {
    common: 70,
    rare: 25,
    epic: 4,
    legendary: 0.9,
    mythic: 0.1
  },
  lootbox_silver: {
    common: 40,
    rare: 40,
    epic: 15,
    legendary: 4,
    mythic: 1
  },
  lootbox_gold: {
    common: 20,
    rare: 35,
    epic: 30,
    legendary: 12,
    mythic: 3
  },
  lootbox_diamond: {
    common: 5,
    rare: 20,
    epic: 35,
    legendary: 30,
    mythic: 10
  },
  lootbox_mythic: {
    common: 0,
    rare: 10,
    epic: 30,
    legendary: 40,
    mythic: 20
  }
};

const FORTUNE_BONUS = {
  common: { min: 10, max: 50 },
  rare: { min: 50, max: 150 },
  epic: { min: 150, max: 300 },
  legendary: { min: 300, max: 600 },
  mythic: { min: 600, max: 1200 }
};

function selectRarity(lootboxId: string): "common" | "rare" | "epic" | "legendary" | "mythic" {
  const rates = LOOTBOX_DROP_RATES[lootboxId as keyof typeof LOOTBOX_DROP_RATES];

  if (!rates) {
    logger.warn(`Taux de drop non trouvés pour ${lootboxId}, utilisation de common`);
    return "common";
  }
  
  const random = Math.random() * 100;
  
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (random <= cumulative) {
      return rarity as "common" | "rare" | "epic" | "legendary" | "mythic";
    }
  }
  
  return "common";
}

function selectItemByRarity(
  targetRarity: string, 
  excludeIds: string[]
): { item: ShopItem, rarity: string } | null {
  const availableItems = SHOP_ITEMS.filter(
    item => 
      item.rarity === targetRarity && 
      item.type !== "lootbox" &&
      !excludeIds.includes(item.id)
  );
  
  if (availableItems.length === 0) {
    const rarityOrder: string[] = ["mythic", "legendary", "epic", "rare", "common"];
    const currentIndex = rarityOrder.indexOf(targetRarity);
    
    for (let i = currentIndex + 1; i < rarityOrder.length; i++) {
      const fallbackItems = SHOP_ITEMS.filter(
        item => 
          item.rarity === rarityOrder[i] && 
          item.type !== "lootbox" &&
          !excludeIds.includes(item.id)
      );
      
      if (fallbackItems.length > 0) {
        const randomItem = fallbackItems[Math.floor(Math.random() * fallbackItems.length)];
        return { item: randomItem, rarity: rarityOrder[i] };
      }
    }
    
    return null;
  }
  
  const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
  return { item: randomItem, rarity: targetRarity };
}

function generateFortuneBonus(lootboxId: string): number {
  const lootboxItem = SHOP_ITEMS.find(item => item.id === lootboxId);
  const rarity = lootboxItem?.rarity || "common";
  
  const bonus = FORTUNE_BONUS[rarity as keyof typeof FORTUNE_BONUS];
  return Math.floor(Math.random() * (bonus.max - bonus.min + 1)) + bonus.min;
}

export function getLootboxCount(inventory: any, lootboxId: string): number {
  if (inventory?.lootbox && typeof inventory.lootbox[lootboxId] === 'number') {
    return inventory.lootbox[lootboxId];
  }
  
  if (typeof inventory?.[lootboxId] === 'number') {
    return inventory[lootboxId];
  }
  
  return 0;
}

export async function openLootbox(
  userId: string,
  lootboxId: string
): Promise<LootboxResult> {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      throw new Error("Utilisateur non trouvé");
    }
    
    const userData = snapshot.val();
    const inventory = userData.inventory || {};
    
    const lootboxCount = getLootboxCount(inventory, lootboxId);
    
    if (lootboxCount <= 0) {
      throw new Error("Vous ne possédez pas cette lootbox");
    }
    
    const lootboxItem = SHOP_ITEMS.find(item => item.id === lootboxId);
    if (!lootboxItem) {
      throw new Error("Lootbox introuvable");
    }
    
    const rewards: LootboxReward[] = [];
    const usedItemIds: string[] = [];
    
    for (let i = 0; i < 3; i++) {
      const selectedRarity = selectRarity(lootboxId);
      const result = selectItemByRarity(selectedRarity, usedItemIds);
      
      if (result) {
        const { item, rarity } = result;
        usedItemIds.push(item.id);
        
        const alreadyOwned = !!(inventory[item.type]?.[item.id]);
        
        rewards.push({
          itemId: item.id,
          itemName: item.name,
          rarity: rarity as any,
          type: item.type as any,
          isNew: !alreadyOwned
        });
      }
    }
    
    const fortuneBonus = generateFortuneBonus(lootboxId);
    
    const updates: any = {};
    
    const newLootboxCount = lootboxCount - 1;
    if (newLootboxCount <= 0) {
      updates[`inventory/lootbox/${lootboxId}`] = null;
      if (inventory[lootboxId]) {
        updates[`inventory/${lootboxId}`] = null;
      }
    } else {
      updates[`inventory/lootbox/${lootboxId}`] = newLootboxCount;
      if (inventory[lootboxId]) {
        updates[`inventory/${lootboxId}`] = null;
      }
    }
    
    rewards.forEach(reward => {
      if (reward.isNew) {
        updates[`inventory/${reward.type}/${reward.itemId}`] = {
          obtainedAt: Date.now(),
          source: "lootbox",
          lootboxId: lootboxId
        };
      }
    });
    
    const currentFortune = userData.fortune || 0;
    const newFortune = currentFortune + fortuneBonus;
    updates.fortune = newFortune;
    
    await update(userRef, updates);

    logger.log(`✅ Lootbox ${lootboxId} ouverte par ${userId}:`, {
      rewards: rewards.map(r => `${r.itemName} (${r.rarity})`),
      fortuneBonus,
      newItems: rewards.filter(r => r.isNew).length
    });

    // Historique de fortune
    if (fortuneBonus !== 0) {
      await addFortuneHistoryEntry(
        userId,
        newFortune,
        fortuneBonus,
        `Bonus lootbox: ${lootboxId}`
      );
    }

    return { rewards, fortuneBonus };
  } catch (error) {
    logger.error("❌ Erreur lors de l'ouverture de la lootbox:", error);
    throw error;
  }
}

export async function buyLootbox(
  userId: string,
  lootboxId: string,
  price: number
): Promise<void> {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      throw new Error("Utilisateur non trouvé");
    }
    
    const userData = snapshot.val();
    const currentFortune = userData.fortune || 0;
    
    if (currentFortune < price) {
      throw new Error("Fonds insuffisants");
    }
    
    const inventory = userData.inventory || {};
    
    const currentCount = getLootboxCount(inventory, lootboxId);
    const newFortune = currentFortune - price;
    
    const updates: any = {
      fortune: newFortune,
      [`inventory/lootbox/${lootboxId}`]: currentCount + 1
    };
    
    if (inventory[lootboxId]) {
      updates[`inventory/${lootboxId}`] = null;
    }
    
    await update(userRef, updates);

    logger.log(`✅ Lootbox ${lootboxId} achetée par ${userId} (total: ${currentCount + 1})`);

    // Historique de fortune
    await addFortuneHistoryEntry(
      userId,
      newFortune,
      -price,
      `Achat lootbox: ${lootboxId}`
    );
  } catch (error) {
    logger.error("❌ Erreur lors de l'achat de la lootbox:", error);
    throw error;
  }
}

export async function getUserLootboxes(userId: string): Promise<Array<{ id: string, count: number }>> {
  try {
    const userRef = ref(database, `users/${userId}/inventory/lootbox`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const lootboxData = snapshot.val();
    return Object.entries(lootboxData)
      .filter(([_, count]) => typeof count === 'number' && count > 0)
      .map(([id, count]) => ({ id, count: count as number }));

  } catch (error) {
    logger.error("Erreur récupération lootboxes:", error);
    return [];
  }
}

export function checkItemOwnership(inventory: any, itemId: string, itemType: string): boolean {
  if (itemType === "lootbox") {
    return false;
  }
  
  if (inventory?.[itemType]?.[itemId]) {
    return true;
  }
  
  if (inventory?.[itemId]) {
    return true;
  }
  
  return false;
}

// ============================
// 🏅 BADGES / ACHIEVEMENTS
// ============================

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  unlocked: boolean;
  target?: number;
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  try {
    const badgesRef = ref(database, `userBadges/${userId}`);
    const snapshot = await get(badgesRef);
    if (!snapshot.exists()) return [];

    const badgesData = snapshot.val();
    return Object.keys(badgesData).map(id => ({
      id,
      ...badgesData[id],
      unlocked: badgesData[id].unlocked || false,
      progress: badgesData[id].progress || 0,
    }));
  } catch (error) {
    logger.error("Erreur lors de la récupération des badges:", error);
    return [];
  }
}

// Définitions des achievements (doit correspondre à ACHIEVEMENT_DEFINITIONS dans BadgesSection.tsx)
const ACHIEVEMENTS = [
  {
    id: "tueur_gamelle",
    name: "Tueur de Gamelles",
    description: "Gagner 10 matchs d'affilée",
    icon: "🔥",
    rarity: "epic" as const,
    reward: 100,
    check: async (userId: string) => {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return false;
      const userData = snapshot.val();
      return (userData.winStreak || 0) >= 10;
    }
  },
  {
    id: "roi_jeudi",
    name: "Roi du Jeudi",
    description: "Gagner 5 matchs un jeudi",
    icon: "👑",
    rarity: "rare" as const,
    reward: 50,
    check: async (userId: string) => {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return false;
      const userData = snapshot.val();
      return (userData.thursdayWins || 0) >= 5;
    }
  },
  {
    id: "millionnaire",
    name: "Millionnaire",
    description: "Atteindre 1000€ de fortune",
    icon: "💰",
    rarity: "legendary" as const,
    reward: 200,
    check: async (userId: string) => {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return false;
      const userData = snapshot.val();
      return (userData.fortune || 0) >= 1000;
    }
  },
  {
    id: "collectionneur",
    name: "Collectionneur",
    description: "Posséder 50 cartes uniques",
    icon: "🎴",
    rarity: "epic" as const,
    reward: 150,
    check: async (userId: string) => {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return false;
      const userData = snapshot.val();
      const cards = userData.cards || {};
      const uniqueCards = Object.keys(cards).filter(cardId => cards[cardId] > 0).length;
      return uniqueCards >= 50;
    }
  },
  {
    id: "parieur_fou",
    name: "Parieur Fou",
    description: "Gagner 10 paris",
    icon: "🎲",
    rarity: "rare" as const,
    reward: 75,
    check: async (userId: string) => {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return false;
      const userData = snapshot.val();
      return (userData.betWins || 0) >= 10;
    }
  }
];

export async function checkAchievements(userId: string): Promise<Badge[]> {
  logger.log(`[ACHIEVEMENTS] Vérification des succès pour l'utilisateur ${userId}...`);

  try {
    const newlyUnlockedBadges: Badge[] = [];

    // Charger les badges déjà débloqués
    const existingBadges = await getUserBadges(userId);
    const unlockedIds = existingBadges.map(b => b.id);

    // Vérifier chaque achievement
    for (const achievement of ACHIEVEMENTS) {
      // Si déjà débloqué, passer
      if (unlockedIds.includes(achievement.id)) {
        continue;
      }

      // Vérifier si le joueur remplit les conditions
      const isUnlocked = await achievement.check(userId);

      if (isUnlocked) {
        logger.log(`✅ [ACHIEVEMENTS] Badge débloqué: ${achievement.name} (${achievement.reward}€)`);

        // ✅ OPTIMISÉ: Badge avec structure compactée (clé courte, timestamp en secondes)
        const badgeCode = BADGE_ENUM[achievement.id as keyof typeof BADGE_ENUM] || achievement.id;
        const badgeRef = ref(database, `userBadges/${userId}/${badgeCode}`);

        const badgeDataOptimized = optimizeBadgeData({
          unlocked: true,
          unlockedAt: Date.now(),
          progress: 100,
        });

        await set(badgeRef, badgeDataOptimized);

        // Pour retourner au format lisible
        const badgeData = {
          id: achievement.id,
          name: achievement.name,
          icon: achievement.icon,
          unlocked: true,
          unlockedAt: Date.now(),
          progress: 100,
        };

        // Ajouter la récompense de fortune
        if (achievement.reward > 0) {
          const userRef = ref(database, `users/${userId}`);
          const userSnapshot = await get(userRef);

          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            const currentFortune = userData.fortune || 0;
            const newFortune = currentFortune + achievement.reward;

            await update(userRef, {
              fortune: newFortune,
            });

            // Ajouter à l'historique
            await addFortuneHistoryEntry(
              userId,
              newFortune,
              achievement.reward,
              `Badge débloqué: ${achievement.name}`
            );

            logger.log(`💰 [ACHIEVEMENTS] Récompense ajoutée: +${achievement.reward}€ (nouveau solde: ${newFortune}€)`);
          }
        }

        newlyUnlockedBadges.push(badgeData);
      }
    }

    return newlyUnlockedBadges;
  } catch (error) {
    logger.error("Erreur vérification achievements:", error);
    return [];
  }
}

// ============================
// 🎯 DÉFIS JOURNALIERS / HEBDO
// ============================

export type ChallengeType = "daily" | "weekly";

export interface UserChallenge {
  id: string;
  label: string;
  description: string;
  type: ChallengeType;
  progress: number;
  goal: number;
  rewardFortune: number;
  rewardTitleId?: string;
  rewardBannerId?: string;
  completed: boolean;
  createdAt: number;
  lastResetAt: number;
}

const DEFAULT_CHALLENGES: UserChallenge[] = [
  {
    id: "daily_play_matches",
    label: "Jouer 3 matchs",
    description: "Disputer 3 matchs aujourd'hui (tous modes confondus).",
    type: "daily",
    progress: 0,
    goal: 3,
    rewardFortune: 50,
    completed: false,
    createdAt: Date.now(),
    lastResetAt: Date.now(),
  },
  {
    id: "daily_win_match",
    label: "Gagner 1 match",
    description: "Remporter au moins 1 match aujourd'hui.",
    type: "daily",
    progress: 0,
    goal: 1,
    rewardFortune: 75,
    completed: false,
    createdAt: Date.now(),
    lastResetAt: Date.now(),
  },
  {
    id: "weekly_grind",
    label: "Farmer la saison",
    description: "Jouer 15 matchs cette semaine.",
    type: "weekly",
    progress: 0,
    goal: 15,
    rewardFortune: 300,
    completed: false,
    createdAt: Date.now(),
    lastResetAt: Date.now(),
  },
  {
    id: "weekly_babydex",
    label: "Collectionneur BabyDex",
    description: "Acheter ou ouvrir 5 cartes cette semaine.",
    type: "weekly",
    progress: 0,
    goal: 5,
    rewardFortune: 0,
    rewardTitleId: "title_collector",
    completed: false,
    createdAt: Date.now(),
    lastResetAt: Date.now(),
  },
];

function isSameDay(ts: number, now: number): boolean {
  const a = new Date(ts);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameISOWeek(ts: number, now: number): boolean {
  const getISOWeek = (d: Date): { year: number; week: number } => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: date.getUTCFullYear(), week: weekNo };
  };

  const a = getISOWeek(new Date(ts));
  const b = getISOWeek(new Date(now));
  return a.year === b.year && a.week === b.week;
}

export async function getUserChallenges(userId: string): Promise<UserChallenge[]> {
  try {
    const now = Date.now();
    const challengesRef = ref(database, `userChallenges/${userId}`);
    const snapshot = await get(challengesRef);

    // Aucune donnée : on initialise avec les défis par défaut
    if (!snapshot.exists()) {
      const initial: { [id: string]: UserChallenge } = {};
      DEFAULT_CHALLENGES.forEach((ch) => {
        initial[ch.id] = { ...ch, createdAt: now, lastResetAt: now, progress: 0, completed: false };
      });
      await set(challengesRef, initial);
      return Object.values(initial);
    }

    const raw = snapshot.val() as Record<string, UserChallenge>;
    const updated: { [id: string]: UserChallenge } = { ...raw };

    // S'assurer que tous les défis par défaut existent et gérer le reset journalier/hebdo
    DEFAULT_CHALLENGES.forEach((template) => {
      const existing = updated[template.id];
      if (!existing) {
        updated[template.id] = {
          ...template,
          createdAt: now,
          lastResetAt: now,
          progress: 0,
          completed: false,
        };
        return;
      }

      const shouldReset =
        (template.type === "daily" && !isSameDay(existing.lastResetAt, now)) ||
        (template.type === "weekly" && !isSameISOWeek(existing.lastResetAt, now));

      if (shouldReset) {
        updated[template.id] = {
          ...existing,
          label: template.label,
          description: template.description,
          goal: template.goal,
          rewardFortune: template.rewardFortune,
          rewardTitleId: template.rewardTitleId,
          rewardBannerId: template.rewardBannerId,
          progress: 0,
          completed: false,
          lastResetAt: now,
        };
      }
    });

    // Persister les éventuelles mises à jour
    await update(challengesRef, updated);

    return Object.values(updated);
  } catch (error) {
    logger.error("Erreur récupération défis:", error);
    return [];
  }
}

export async function claimChallengeReward(
  userId: string,
  challengeId: string
): Promise<void> {
  try {
    const challengeRef = ref(database, `userChallenges/${userId}/${challengeId}`);
    const challengeSnap = await get(challengeRef);
    if (!challengeSnap.exists()) {
      throw new Error("Défi introuvable");
    }

    const challenge = challengeSnap.val() as UserChallenge;
    if (challenge.completed) {
      throw new Error("Récompense déjà récupérée");
    }

    // Option simple : on considère que le joueur valide le défi quand il clique
    const rootRef = ref(database);
    const userRef = ref(database, `users/${userId}`);
    const userSnap = await get(userRef);
    if (!userSnap.exists()) {
      throw new Error("Utilisateur introuvable");
    }
    const userData = userSnap.val();
    const currentFortune = userData.fortune || 0;
    const reward = challenge.rewardFortune || 0;
    const newFortune = currentFortune + reward;

    const updates: { [path: string]: any } = {};
    updates[`users/${userId}/fortune`] = newFortune;
    updates[`userChallenges/${userId}/${challengeId}/completed`] = true;
    updates[`userChallenges/${userId}/${challengeId}/progress`] = challenge.goal;
    updates[`userChallenges/${userId}/${challengeId}/lastResetAt`] = Date.now();

    // Titres / bannières spéciaux offerts
    if (challenge.rewardTitleId) {
      const titleId = challenge.rewardTitleId;
      if (!userData.inventory?.title || !userData.inventory.title[titleId]) {
        updates[`users/${userId}/inventory/title/${titleId}`] = {
          obtainedAt: Date.now(),
          source: "challenge",
        };
      }
    }

    if (challenge.rewardBannerId) {
      const bannerId = challenge.rewardBannerId;
      if (!userData.inventory?.banner || !userData.inventory.banner[bannerId]) {
        updates[`users/${userId}/inventory/banner/${bannerId}`] = {
          obtainedAt: Date.now(),
          source: "challenge",
        };
      }
    }

    await update(rootRef, updates);
    
    // Historique de fortune
    if (reward !== 0) {
      await addFortuneHistoryEntry(
        userId,
        newFortune,
        reward,
        `Récompense défi: ${challenge.label || challengeId}`
      );
    }
    logger.log(`✅ Défi ${challengeId} validé pour ${userId}`);
  } catch (error) {
    logger.error("Erreur validation défi:", error);
    throw error;
  }
}

// ============================
// 💰 SHOP / BOUTIQUE ENRICHIE
// ============================

export type ItemRarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type ItemType = "avatar" | "theme" | "banner" | "title" | "effect" | "lootbox" | "badge";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  preview?: string;
  type: ItemType;
  rarity: ItemRarity;
  unlockable?: boolean;
  requirement?: string;
}

// 🎨 AVATARS (20 items)
const AVATARS: ShopItem[] = [
  { id: "avatar_default", name: "Avatar Classique", description: "L'avatar par défaut", type: "avatar", price: 0, rarity: "common", icon: "😊" },
  { id: "avatar_king", name: "Roi", description: "Avatar royal avec couronne dorée", type: "avatar", price: 150, rarity: "rare", icon: "👑" },
  { id: "avatar_ninja", name: "Ninja", description: "Discret et rapide", type: "avatar", price: 200, rarity: "rare", icon: "🥷" },
  { id: "avatar_wizard", name: "Magicien", description: "Maître des arcanes", type: "avatar", price: 250, rarity: "epic", icon: "🧙" },
  { id: "avatar_robot", name: "Robot", description: "Technologie avancée", type: "avatar", price: 180, rarity: "rare", icon: "🤖" },
  { id: "avatar_alien", name: "Alien", description: "Venu d'une autre galaxie", type: "avatar", price: 300, rarity: "epic", icon: "👽" },
  { id: "avatar_dragon", name: "Dragon", description: "Puissance légendaire", type: "avatar", price: 500, rarity: "legendary", icon: "🐉" },
  { id: "avatar_phoenix", name: "Phénix", description: "Renaît de ses cendres", type: "avatar", price: 450, rarity: "legendary", icon: "🔥" },
  { id: "avatar_ghost", name: "Fantôme", description: "Mystérieux et insaisissable", type: "avatar", price: 220, rarity: "epic", icon: "👻" },
  { id: "avatar_pirate", name: "Pirate", description: "Chasseur de trésors", type: "avatar", price: 170, rarity: "rare", icon: "🏴‍☠️" },
  { id: "avatar_astronaut", name: "Astronaute", description: "Explorateur spatial", type: "avatar", price: 280, rarity: "epic", icon: "👨‍🚀" },
  { id: "avatar_vampire", name: "Vampire", description: "Immortel de la nuit", type: "avatar", price: 320, rarity: "epic", icon: "🧛" },
  { id: "avatar_knight", name: "Chevalier", description: "Gardien du royaume", type: "avatar", price: 190, rarity: "rare", icon: "⚔️" },
  { id: "avatar_samurai", name: "Samouraï", description: "Guerrier honorable", type: "avatar", price: 350, rarity: "epic", icon: "🗾" },
  { id: "avatar_cyborg", name: "Cyborg", description: "Fusion homme-machine", type: "avatar", price: 400, rarity: "legendary", icon: "🦾" },
  { id: "avatar_demon", name: "Démon", description: "Seigneur des ténèbres", type: "avatar", price: 550, rarity: "legendary", icon: "😈" },
  { id: "avatar_angel", name: "Ange", description: "Messager céleste", type: "avatar", price: 500, rarity: "legendary", icon: "👼" },
  { id: "avatar_zeus", name: "Zeus", description: "Dieu de l'Olympe", type: "avatar", price: 800, rarity: "mythic", icon: "⚡👑" },
  { id: "avatar_reaper", name: "Faucheuse", description: "Gardien des âmes", type: "avatar", price: 600, rarity: "legendary", icon: "💀" },
  { id: "avatar_titan", name: "Titan", description: "Colosse ancestral", type: "avatar", price: 900, rarity: "mythic", icon: "⛰️" },
];

// 🎨 THÈMES (15 items)
const THEMES: ShopItem[] = [
  { id: "theme_default", name: "Thème Par Défaut", description: "Le thème classique", type: "theme", price: 0, rarity: "common", preview: "#6366f1", icon: "🎨" },
  { id: "theme_ocean", name: "Océan Profond", description: "Ambiance sous-marine", type: "theme", price: 200, rarity: "rare", preview: "#1e40af", icon: "🌊" },
  { id: "theme_sunset", name: "Coucher de Soleil", description: "Tons chauds orangés", type: "theme", price: 180, rarity: "rare", preview: "#ea580c", icon: "🌅" },
  { id: "theme_forest", name: "Forêt Enchantée", description: "Vert naturel", type: "theme", price: 220, rarity: "epic", preview: "#15803d", icon: "🌲" },
  { id: "theme_neon", name: "Néon Cyberpunk", description: "Style futuriste", type: "theme", price: 350, rarity: "epic", preview: "#a855f7", icon: "⚡" },
  { id: "theme_gold", name: "Or Royal", description: "Luxe et prestige", type: "theme", price: 500, rarity: "legendary", preview: "#d97706", icon: "👑" },
  { id: "theme_ice", name: "Glace Arctique", description: "Froid cristallin", type: "theme", price: 250, rarity: "epic", preview: "#0ea5e9", icon: "❄️" },
  { id: "theme_lava", name: "Lave Volcanique", description: "Chaleur intense", type: "theme", price: 280, rarity: "epic", preview: "#dc2626", icon: "🌋" },
  { id: "theme_space", name: "Espace Infini", description: "Cosmos mystérieux", type: "theme", price: 400, rarity: "legendary", preview: "#1e1b4b", icon: "🌌" },
  { id: "theme_sakura", name: "Sakura", description: "Fleurs de cerisier", type: "theme", price: 300, rarity: "epic", preview: "#ec4899", icon: "🌸" },
  { id: "theme_matrix", name: "Matrix", description: "Code vert", type: "theme", price: 450, rarity: "legendary", preview: "#22c55e", icon: "💻" },
  { id: "theme_blood", name: "Sang Noir", description: "Ténèbres profondes", type: "theme", price: 550, rarity: "legendary", preview: "#7f1d1d", icon: "🩸" },
  { id: "theme_rainbow", name: "Arc-en-ciel", description: "Toutes les couleurs", type: "theme", price: 600, rarity: "legendary", preview: "#ff00ff", icon: "🌈" },
  { id: "theme_diamond", name: "Diamant", description: "Luxe absolu", type: "theme", price: 800, rarity: "mythic", preview: "#38bdf8", icon: "💎" },
  { id: "theme_cosmic", name: "Cosmique", description: "Galaxies infinies", type: "theme", price: 1000, rarity: "mythic", preview: "#4c1d95", icon: "✨" },
];

// 🎌 BANNIÈRES (15 items) - Arrière-plan visuel du profil
const BANNERS: ShopItem[] = [
  { id: "banner_default", name: "Bannière Simple", description: "Bannière de départ", type: "banner", price: 0, rarity: "common", icon: "📋", preview: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" },
  { id: "banner_stars", name: "Ciel Étoilé", description: "Étoiles scintillantes", type: "banner", price: 150, rarity: "rare", icon: "⭐", preview: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)" },
  { id: "banner_fire", name: "Flammes", description: "Bannière enflammée", type: "banner", price: 200, rarity: "rare", icon: "🔥", preview: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #ea580c 100%)" },
  { id: "banner_lightning", name: "Éclair", description: "Bannière électrique", type: "banner", price: 250, rarity: "epic", icon: "⚡", preview: "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #06b6d4 100%)" },
  { id: "banner_rainbow", name: "Arc-en-ciel", description: "Bannière multicolore", type: "banner", price: 180, rarity: "rare", icon: "🌈", preview: "linear-gradient(135deg, #dc2626 0%, #ea580c 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #a855f7 100%)" },
  { id: "banner_galaxy", name: "Galaxie", description: "Bannière cosmique", type: "banner", price: 400, rarity: "legendary", icon: "🌌", preview: "linear-gradient(135deg, #0c4a6e 0%, #7c3aed 50%, #ec4899 100%)" },
  { id: "banner_diamond", name: "Diamant", description: "Luxe cristallin", type: "banner", price: 500, rarity: "legendary", icon: "💎", preview: "linear-gradient(135deg, #0c4a6e 0%, #06b6d4 50%, #e0f2fe 100%)" },
  { id: "banner_sakura", name: "Fleurs de Cerisier", description: "Élégance japonaise", type: "banner", price: 280, rarity: "epic", icon: "🌸", preview: "linear-gradient(135deg, #9f1239 0%, #ec4899 50%, #fce7f3 100%)" },
  { id: "banner_dragon", name: "Dragon Doré", description: "Mythique", type: "banner", price: 450, rarity: "legendary", icon: "🐲", preview: "linear-gradient(135deg, #78350f 0%, #f59e0b 50%, #fef3c7 100%)" },
  { id: "banner_ocean", name: "Vagues Océaniques", description: "Aquatique", type: "banner", price: 220, rarity: "epic", icon: "🌊", preview: "linear-gradient(135deg, #0c4a6e 0%, #0891b2 50%, #06b6d4 100%)" },
  { id: "banner_aurora", name: "Aurore Boréale", description: "Lumineuse magique", type: "banner", price: 350, rarity: "epic", icon: "🌌", preview: "linear-gradient(135deg, #064e3b 0%, #10b981 33%, #06b6d4 66%, #a855f7 100%)" },
  { id: "banner_blood", name: "Lune Sanglante", description: "Nocturne mystique", type: "banner", price: 380, rarity: "epic", icon: "🌙", preview: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #dc2626 100%)" },
  { id: "banner_gold", name: "Or Impérial", description: "Richesse absolue", type: "banner", price: 600, rarity: "legendary", icon: "🏆", preview: "linear-gradient(135deg, #713f12 0%, #f59e0b 50%, #fef3c7 100%)" },
  { id: "banner_phoenix", name: "Phénix Céleste", description: "Renaissance éternelle", type: "banner", price: 700, rarity: "mythic", icon: "🔥🦅", preview: "linear-gradient(135deg, #dc2626 0%, #f97316 25%, #facc15 50%, #f97316 75%, #dc2626 100%)" },
  { id: "banner_infinity", name: "Infini", description: "Au-delà du temps", type: "banner", price: 900, rarity: "mythic", icon: "♾️", preview: "linear-gradient(135deg, #1e1b4b 0%, #5b21b6 25%, #ec4899 50%, #5b21b6 75%, #1e1b4b 100%)" },
];

// ✨ EFFETS (20 items)
const EFFECTS: ShopItem[] = [
  { id: "effect_none", name: "Aucun Effet", description: "Pas d'effet visuel", type: "effect", price: 0, rarity: "common", icon: "⚪" },
  { id: "effect_sparkles", name: "Étincelles", description: "Particules brillantes", type: "effect", price: 100, rarity: "common", icon: "✨" },
  { id: "effect_glow", name: "Aura Lumineuse", description: "Halo coloré", type: "effect", price: 150, rarity: "rare", icon: "💫" },
  { id: "effect_fire", name: "Flammes", description: "Feu animé", type: "effect", price: 200, rarity: "rare", icon: "🔥" },
  { id: "effect_ice", name: "Cristaux de Glace", description: "Effet de gel", type: "effect", price: 220, rarity: "epic", icon: "❄️" },
  { id: "effect_lightning", name: "Électricité", description: "Éclairs animés", type: "effect", price: 250, rarity: "epic", icon: "⚡" },
  { id: "effect_rainbow", name: "Arc-en-ciel", description: "Effet multicolore", type: "effect", price: 180, rarity: "rare", icon: "🌈" },
  { id: "effect_stars", name: "Étoiles Filantes", description: "Traînée d'étoiles", type: "effect", price: 300, rarity: "epic", icon: "⭐" },
  { id: "effect_portal", name: "Portail", description: "Effet dimensionnel", type: "effect", price: 400, rarity: "legendary", icon: "🌀" },
  { id: "effect_crown", name: "Couronne Flottante", description: "Couronne dorée", type: "effect", price: 350, rarity: "legendary", icon: "👑" },
  { id: "effect_wings", name: "Ailes d'Ange", description: "Ailes lumineuses", type: "effect", price: 500, rarity: "legendary", icon: "🪽" },
  { id: "effect_shadow", name: "Ombre Vivante", description: "Ombre qui bouge", type: "effect", price: 280, rarity: "epic", icon: "🌑" },
  { id: "effect_sakura", name: "Pétales de Sakura", description: "Fleurs qui tombent", type: "effect", price: 320, rarity: "epic", icon: "🌸" },
  { id: "effect_smoke", name: "Fumée Mystique", description: "Brume magique", type: "effect", price: 260, rarity: "epic", icon: "💨" },
  { id: "effect_galaxy", name: "Tourbillon Galactique", description: "Étoiles qui tournent", type: "effect", price: 450, rarity: "legendary", icon: "🌌" },
  { id: "effect_blood", name: "Aura Sanguine", description: "Rouge pulsant", type: "effect", price: 380, rarity: "epic", icon: "🩸" },
  { id: "effect_divine", name: "Lumière Divine", description: "Rayons célestes", type: "effect", price: 600, rarity: "legendary", icon: "☀️" },
  { id: "effect_demon", name: "Flammes Démoniaques", description: "Feu noir", type: "effect", price: 550, rarity: "legendary", icon: "😈" },
  { id: "effect_cosmic", name: "Énergie Cosmique", description: "Pouvoir ultime", type: "effect", price: 800, rarity: "mythic", icon: "💥" },
  { id: "effect_infinity", name: "Boucle Infinie", description: "Symbole infini", type: "effect", price: 1000, rarity: "mythic", icon: "♾️" },
];

// 🎁 LOOTBOXES (5 items)
const LOOTBOXES: ShopItem[] = [
  { id: "lootbox_starter", name: "Coffre Débutant", description: "Cartes Bronze/Silver/Gold", type: "lootbox", price: 100, rarity: "common", icon: "📦" },
  { id: "lootbox_silver", name: "Boîte Argentée", description: "Cartes Silver/Gold/Platinum", type: "lootbox", price: 250, rarity: "rare", icon: "🎁" },
  { id: "lootbox_gold", name: "Coffre Doré", description: "Cartes Gold/Platinum/Diamond", type: "lootbox", price: 500, rarity: "epic", icon: "💰" },
  { id: "lootbox_diamond", name: "Coffre Diamant", description: "Cartes Platinum/Diamond/Black", type: "lootbox", price: 1000, rarity: "legendary", icon: "💎" },
  { id: "lootbox_mythic", name: "Coffre Mythique", description: "Cartes légendaires garanties", type: "lootbox", price: 2000, rarity: "mythic", icon: "✨" },
];

// 📜 TITRES (10 items) - Style Rocket League FR
const TITLES: ShopItem[] = [
  {
    id: "title_newbie",
    name: "Bronze de Parking",
    description: "Pour ceux qui découvrent encore le kick-off.",
    type: "title",
    price: 0,
    rarity: "common",
    icon: "🥉",
    preview: "Bronze de Parking",
  },
  {
    id: "title_veteran",
    name: "Tryhard Platine",
    description: "Toujours en ranked, jamais en freeplay.",
    type: "title",
    price: 300,
    rarity: "rare",
    icon: "💿",
    preview: "Tryhard Platine",
  },
  {
    id: "title_champion",
    name: "Champion de Garage",
    description: "Smurf ou génie incompris, on ne sait pas.",
    type: "title",
    price: 600,
    rarity: "epic",
    icon: "🏆",
    preview: "Champion de Garage",
  },
  {
    id: "title_legend",
    name: "Légende du Reset",
    description: "Flip, musty, breezi... tout y passe.",
    type: "title",
    price: 900,
    rarity: "legendary",
    icon: "✨",
    preview: "Légende du Reset",
  },
  {
    id: "title_millionaire",
    name: "Marchand d’Octanes",
    description: "RL Garage ouvert 24/7.",
    type: "title",
    price: 1200,
    rarity: "legendary",
    icon: "🚗",
    preview: "Marchand d’Octanes",
  },
  {
    id: "title_godlike",
    name: "Insane Freestyler",
    description: "Clip ou leave, jamais entre les deux.",
    type: "title",
    price: 2000,
    rarity: "mythic",
    icon: "🎥",
    preview: "Insane Freestyler",
  },
  {
    id: "title_strategist",
    name: "Cerveau de la Rot",
    description: "Toujours dernier, jamais dans le mur.",
    type: "title",
    price: 700,
    rarity: "epic",
    icon: "🧠",
    preview: "Cerveau de la Rot",
  },
  {
    id: "title_gambler",
    name: "Démon de la SoloQ",
    description: "3 mates tiltés, 0 problème.",
    type: "title",
    price: 500,
    rarity: "rare",
    icon: "😈",
    preview: "Démon de la SoloQ",
  },
  {
    id: "title_collector",
    name: "Full White Dealer",
    description: "Fennec, Octane, Interstellar… tout en titanium.",
    type: "title",
    price: 1600,
    rarity: "legendary",
    icon: "⚪",
    preview: "Full White Dealer",
  },
  {
    id: "title_immortal",
    name: "Le Goat du Baby",
    description: "Jamais AFK, jamais tilt, toujours clutch.",
    type: "title",
    price: 3000,
    rarity: "mythic",
    icon: "🐐",
    preview: "Le GOAT du Baby",
  },
];

// 🎯 EXPORT DE TOUS LES ITEMS
export const SHOP_ITEMS: ShopItem[] = [
  ...AVATARS,
  ...THEMES,
  ...BANNERS,
  ...EFFECTS,
  ...LOOTBOXES,
  ...TITLES,
];

// ✅ FIX: Correction de buyShopItem
export async function buyShopItem(
  userId: string,
  itemId: string,
  itemType: ItemType,
  price: number
): Promise<void> {
  try {
    const userRef = ref(database, `users/${userId}`);
    
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error("Utilisateur introuvable");
    }

    const userData = userSnapshot.val();
    const currentFortune = userData.fortune || 0;
    
    if (currentFortune < price) {
      throw new Error("Fonds insuffisants");
    }

    if (userData.inventory?.[itemType]?.[itemId]) {
      throw new Error("Vous possédez déjà cet item");
    }

    const updates: { [path: string]: any } = {};
    const newFortune = currentFortune - price;
    updates[`users/${userId}/fortune`] = newFortune;
    updates[`users/${userId}/inventory/${itemType}/${itemId}`] = { 
      obtainedAt: Date.now(),
      source: "shop",
      price: price 
    };

    const hasOtherItems = userData.inventory?.[itemType] && 
      Object.keys(userData.inventory[itemType]).length > 0;
    
    if (!hasOtherItems && itemType !== "lootbox") {
      updates[`users/${userId}/${itemType}`] = itemId;
    }

    await update(ref(database), updates);

    // Historique de fortune
    const shopItem = SHOP_ITEMS.find((i) => i.id === itemId);
    await addFortuneHistoryEntry(
      userId,
      newFortune,
      -price,
      `Achat boutique: ${shopItem?.name || itemId}`
    );
  } catch (error) {
    logger.error("Erreur achat article:", error);
    throw error;
  }
}

export async function equipItem(
  userId: string,
  itemId: string,
  itemType: ItemType
): Promise<void> {
  try {
    const userRef = ref(database, `users/${userId}`);

    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error("Utilisateur introuvable");
    }

    const userData = userSnapshot.val();
    const hasItem = userData.inventory?.[itemType]?.[itemId];
    
    if (!hasItem) {
      throw new Error("Vous ne possédez pas cet item");
    }

    const updatePath = {
      'avatar': 'avatar',
      'theme': 'theme',
      'banner': 'banner',
      'effect': 'effect',
      'title': 'title',
      'badge': 'badge',
      'lootbox': null
    }[itemType];

    if (!updatePath) {
      throw new Error("Ce type d'article n'est pas équipable.");
    }

    const updates: { [path: string]: any } = {};
    updates[`users/${userId}/${updatePath}`] = itemId;
    
    await update(ref(database), updates);

  } catch (error) {
    logger.error("Erreur équiper article:", error);
    throw error;
  }
}
