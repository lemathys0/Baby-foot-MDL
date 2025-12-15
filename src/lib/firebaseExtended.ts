// 📁 src/lib/firebaseExtended.ts
// ============================
// Fonctions pour Clubs, Badges, Shop, Historique, Paramètres et Amis
// ✅ FIX: Correction complète du système avec Bannières + Titres

import { ref, get, set, update, push, onValue, runTransaction } from "firebase/database";
import { database } from "./firebase";

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

    console.log(`✅ Club créé: ${clubId} par ${founderId}`);
    return clubId;
  } catch (error) {
    console.error("Erreur création club:", error);
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
    console.log(`✅ ${userId} a rejoint le club ${clubId}`);
  } catch (error) {
    console.error("Erreur rejoindre club:", error);
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
    
    const updates: { [path: string]: unknown } = {};
    updates[`users/${userId}/fortune`] = currentFortune - amount;
    updates[`clubs/${clubId}/treasury`] = (club.treasury || 0) + amount;
    updates[`clubs/${clubId}/members/${userId}/contributions`] = currentContributions + amount;

    await update(ref(database), updates);
    
    console.log(`✅ Contribution de ${amount}€ ajoutée au club ${clubId} par ${userId}`);

  } catch (error) {
    console.error("Erreur contribution club:", error);
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
    console.log(`✅ Bonus ${bonusId} acheté pour le club ${clubId}`);
  } catch (error) {
    console.error("Erreur achat bonus club:", error);
    throw error;
  }
}

export async function leaveClub(clubId: string, userId: string): Promise<void> {
  try {
    const updates: { [path: string]: any } = {};
    updates[`clubs/${clubId}/members/${userId}`] = null;
    updates[`users/${userId}/clubId`] = null;

    await update(ref(database), updates);
    console.log(`✅ ${userId} a quitté le club ${clubId}`);
  } catch (error) {
    console.error("Erreur quitter club:", error);
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
    console.error("Erreur d'écoute des données du club:", error);
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
    
    const entry: FortuneHistory = {
      timestamp: Date.now(),
      fortune,
      change,
      reason,
    };

    await set(newEntryRef, entry);

    const snapshot = await get(historyRef);
    if (snapshot.exists()) {
      const entries = snapshot.val();
      const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
      
      const updates: { [path: string]: any } = {};
      Object.entries(entries).forEach(([key, entry]: [string, any]) => {
        if (entry.timestamp < cutoff) {
          updates[`fortuneHistory/${userId}/${key}`] = null;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    }
  } catch (error) {
    console.error("Erreur ajout historique:", error);
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
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique de fortune:", error);
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
    console.error("Erreur d'écoute de l'historique de fortune:", error);
    callback([]);
  });

  return unsubscribe;
}

// ============================
// ⚙️ PARAMÈTRES UTILISATEUR
// ============================

export interface UserSettings {
  privacy: {
    showStats: boolean;
    allowFriendRequests: boolean;
  };
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const settingsRef = ref(database, `users/${userId}/settings`);
    const snapshot = await get(settingsRef);

    const defaultSettings: UserSettings = {
      privacy: {
        showStats: true,
        allowFriendRequests: true,
      },
    };

    if (!snapshot.exists()) {
      await set(settingsRef, defaultSettings); 
      return defaultSettings;
    }

    const existingSettings = snapshot.val();
    return {
      privacy: {
        ...defaultSettings.privacy,
        ...existingSettings.privacy,
      },
    };

  } catch (error) {
    console.error("Erreur récupération paramètres utilisateur:", error);
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
    const settingsRef = ref(database, `users/${userId}/settings`);
    await update(settingsRef, settings);
  } catch (error) {
    console.error("Erreur mise à jour paramètres utilisateur:", error);
    throw new Error("Impossible de sauvegarder les paramètres.");
  }
}

// ============================
// 🤝 AMIS / UTILISATEURS
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
        const friendsRef = ref(database, `users/${userId}/friends`);
        const snapshot = await get(friendsRef);
        
        if (!snapshot.exists()) return [];
        
        const friendIds = Object.keys(snapshot.val());
        
        const friendProfiles: UserProfile[] = [];
        for (const friendId of friendIds) {
            const userRef = ref(database, `users/${friendId}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
                const user = userSnapshot.val();
                friendProfiles.push({
                    id: friendId,
                    username: user.username,
                    role: user.role || 'player',
                    eloRating: user.eloRating || 1000,
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    fortune: user.fortune || 0,
                    totalEarned: user.totalEarned || 0,
                    createdAt: user.createdAt || new Date().toISOString(),
                    clubId: user.clubId,
                });
            }
        }

        return friendProfiles;
    } catch (error) {
        console.error("Erreur récupération amis:", error);
        return [];
    }
}

export async function getPendingFriendRequests(userId: string): Promise<UserProfile[]> {
    try {
        const requestsRef = ref(database, `friendRequests/${userId}/received`);
        const snapshot = await get(requestsRef);

        if (!snapshot.exists()) return [];

        const senderIds = Object.keys(snapshot.val());
        
        const senderProfiles: UserProfile[] = [];
        for (const senderId of senderIds) {
            const userRef = ref(database, `users/${senderId}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
                const user = userSnapshot.val();
                senderProfiles.push({
                    id: senderId,
                    username: user.username,
                    role: user.role || 'player',
                    eloRating: user.eloRating || 1000,
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    fortune: user.fortune || 0,
                    totalEarned: user.totalEarned || 0,
                    createdAt: user.createdAt || new Date().toISOString(),
                    clubId: user.clubId,
                });
            }
        }

        return senderProfiles;
    } catch (error) {
        console.error("Erreur récupération demandes d'amis:", error);
        return [];
    }
}

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<void> {
    try {
        const updates: { [path: string]: any } = {};
        updates[`friendRequests/${senderId}/sent/${receiverId}`] = true;
        updates[`friendRequests/${receiverId}/received/${senderId}`] = true;

        await update(ref(database), updates);
    } catch (error) {
        console.error("Erreur envoi demande d'ami:", error);
        throw new Error("Impossible d'envoyer la demande d'ami.");
    }
}

export async function acceptFriendRequest(userId: string, senderId: string): Promise<void> {
    try {
        const updates: { [path: string]: any } = {};
        const timestamp = Date.now();

        updates[`users/${userId}/friends/${senderId}`] = { addedAt: timestamp };
        updates[`users/${senderId}/friends/${userId}`] = { addedAt: timestamp };
        updates[`friendRequests/${userId}/received/${senderId}`] = null;
        updates[`friendRequests/${senderId}/sent/${userId}`] = null;

        await update(ref(database), updates);
    } catch (error) {
        console.error("Erreur acceptation demande d'ami:", error);
        throw new Error("Impossible d'accepter la demande d'ami.");
    }
}

export async function declineFriendRequest(userId: string, senderId: string): Promise<void> {
    try {
        const updates: { [path: string]: any } = {};
        updates[`friendRequests/${userId}/received/${senderId}`] = null;
        updates[`friendRequests/${senderId}/sent/${userId}`] = null;

        await update(ref(database), updates);
    } catch (error) {
        console.error("Erreur refus demande d'ami:", error);
        throw new Error("Impossible de refuser la demande d'ami.");
    }
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
    try {
        const updates: { [path: string]: any } = {};
        updates[`users/${userId}/friends/${friendId}`] = null;
        updates[`users/${friendId}/friends/${userId}`] = null;

        await update(ref(database), updates);
    } catch (error) {
        console.error("Erreur suppression ami:", error);
        throw new Error("Impossible de supprimer l'ami.");
    }
}

export async function searchUsers(queryText: string): Promise<UserProfile[]> {
    try {
        const usersRef = ref(database, `users`);
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) return [];

        const allUsers = snapshot.val();
        const lowerCaseQuery = queryText.toLowerCase();

        const results: UserProfile[] = [];
        Object.keys(allUsers).forEach(userId => {
            const user = allUsers[userId];
            if (user.username && user.username.toLowerCase().includes(lowerCaseQuery)) {
                results.push({
                    id: userId,
                    username: user.username,
                    role: user.role || 'player',
                    eloRating: user.eloRating || 1000,
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    fortune: user.fortune || 0,
                    totalEarned: user.totalEarned || 0,
                    createdAt: user.createdAt || new Date().toISOString(),
                    clubId: user.clubId,
                });
            }
        });

        return results.slice(0, 10); 
    } catch (error) {
        console.error("Erreur recherche utilisateurs:", error);
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
    console.warn(`Taux de drop non trouvés pour ${lootboxId}, utilisation de common`);
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
    updates.fortune = currentFortune + fortuneBonus;
    
    await update(userRef, updates);
    
    console.log(`✅ Lootbox ${lootboxId} ouverte par ${userId}:`, {
      rewards: rewards.map(r => `${r.itemName} (${r.rarity})`),
      fortuneBonus,
      newItems: rewards.filter(r => r.isNew).length
    });
    
    return { rewards, fortuneBonus };
  } catch (error) {
    console.error("❌ Erreur lors de l'ouverture de la lootbox:", error);
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
    
    const updates: any = {
      fortune: currentFortune - price,
      [`inventory/lootbox/${lootboxId}`]: currentCount + 1
    };
    
    if (inventory[lootboxId]) {
      updates[`inventory/${lootboxId}`] = null;
    }
    
    await update(userRef, updates);
    
    console.log(`✅ Lootbox ${lootboxId} achetée par ${userId} (total: ${currentCount + 1})`);
  } catch (error) {
    console.error("❌ Erreur lors de l'achat de la lootbox:", error);
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
    console.error("Erreur récupération lootboxes:", error);
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
    console.error("Erreur lors de la récupération des badges:", error);
    return [];
  }
}

export async function checkAchievements(userId: string): Promise<void> {
  console.log(`[ACHIEVEMENTS] Vérification des succès pour l'utilisateur ${userId}...`);
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

// 📜 TITRES (10 items) - Titre affiché sous le pseudo
const TITLES: ShopItem[] = [
  { id: "title_newbie", name: "Débutant", description: "Titre de départ", type: "title", price: 0, rarity: "common", icon: "🆕", preview: "Débutant" },
  { id: "title_veteran", name: "Vétéran", description: "Joueur expérimenté", type: "title", price: 300, rarity: "rare", icon: "🎖️", preview: "Vétéran" },
  { id: "title_champion", name: "Champion", description: "Gagnant de tournois", type: "title", price: 500, rarity: "epic", icon: "🏆", preview: "Champion" },
  { id: "title_legend", name: "Légende", description: "Légende vivante", type: "title", price: 800, rarity: "legendary", icon: "⭐", preview: "Légende" },
  { id: "title_millionaire", name: "Millionnaire", description: "Fortune immense", type: "title", price: 1500, rarity: "legendary", icon: "💰", preview: "Millionnaire" },
  { id: "title_godlike", name: "Divin", description: "Pouvoir suprême", type: "title", price: 2000, rarity: "mythic", icon: "👑", preview: "Divin" },
  { id: "title_strategist", name: "Stratège", description: "Maître tacticien", type: "title", price: 600, rarity: "epic", icon: "🧠", preview: "Stratège" },
  { id: "title_gambler", name: "Parieur Fou", description: "Risque tout", type: "title", price: 400, rarity: "rare", icon: "🎲", preview: "Parieur Fou" },
  { id: "title_collector", name: "Collectionneur", description: "Toutes les cartes", type: "title", price: 1000, rarity: "legendary", icon: "🃏", preview: "Collectionneur" },
  { id: "title_immortal", name: "Immortel", description: "Au-delà du temps", type: "title", price: 3000, rarity: "mythic", icon: "♾️", preview: "Immortel" },
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
    updates[`users/${userId}/fortune`] = currentFortune - price;
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

  } catch (error) {
    console.error("Erreur achat article:", error);
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
    console.error("Erreur équiper article:", error);
    throw error;
  }
}
