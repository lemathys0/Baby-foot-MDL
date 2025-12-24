// 📁 src/lib/firebaseCards.ts
// ============================
// Gestion des cartes dans Firebase - VERSION CORRIGÉE (Support Booster Mixte S1+S2)

import { ref, get, update } from "firebase/database";
import { database } from "./firebase";
import { CardData } from "./cardSystem";
import { logger } from "@/utils/logger";

// ✅ Re-export des types et fonctions utilitaires
export { 
  getRarityCategory, 
  isUltraRare,
  getAvailableSeasons,
  getSeasonDisplayName,
  cardExists,
  getCardByCode
} from "./cardSystem"; 

export type { CardData };

export interface UserCardQuantities {
  [code: string]: number;
}

export type UniqueCardData = CardData & { ownedCount: number };

/**
 * ✅ Charge la collection de l'utilisateur (Map de quantités)
 */
export async function getUserCardQuantities(uid: string): Promise<UserCardQuantities> {
  try {
    const userRef = ref(database, `users/${uid}/cards`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    logger.error("❌ Erreur chargement quantités:", error);
    return {};
  }
}

/**
 * ✅ Charge la collection formatée pour l'affichage (BabyDex)
 */
export async function getUserCards(uid: string): Promise<UniqueCardData[]> {
  const quantities = await getUserCardQuantities(uid);
  const uniqueCards: UniqueCardData[] = [];
  const { codeToCardMap } = await import("./cardSystem");
  
  for (const [code, ownedCount] of Object.entries(quantities)) {
    if (ownedCount <= 0) continue;
    
    let found = false;
    for (const [season, cards] of Object.entries(codeToCardMap)) {
      if (cards[code]) {
        uniqueCards.push({
          code,
          nom: cards[code].nom,
          rarity: cards[code].rarity,
          season,
          ownedCount,
        });
        found = true;
        break; 
      }
    }
  }
  
  return uniqueCards.sort((a, b) => a.season.localeCompare(b.season) || a.code.localeCompare(b.code));
}

/**
 * ✅ Ouvre un booster : Gère la saison spécifique OU le mélange (S1 + S2)
 */
export async function openBoosterPack(
  uid: string, 
  season: string = "season1"
): Promise<CardData[]> {
  const NUM_CARDS_IN_BOOSTER = 5; // Nombre de cartes par booster
  
  try {
    const userRef = ref(database, `users/${uid}`);
    const { drawCards, getAvailableSeasons, codeToCardMap } = await import("./cardSystem");
    
    let drawnCards: CardData[] = [];

    // --- LOGIQUE DE TIRAGE ---
    if (season === "mixed") {
      // ✅ BOOSTER MÉLANGÉ : On pioche chaque carte dans une saison aléatoire
      const availableSeasons = getAvailableSeasons();
      for (let i = 0; i < NUM_CARDS_IN_BOOSTER; i++) {
        const randomSeason = availableSeasons[Math.floor(Math.random() * availableSeasons.length)];
        const result = drawCards(randomSeason, 1);
        if (result.length > 0) {
          // On force l'ajout de la saison pour le chemin de l'image
          drawnCards.push({ ...result[0], season: randomSeason });
        }
      }
    } else {
      // ✅ BOOSTER CLASSIQUE : Une seule saison
      if (!codeToCardMap[season]) throw new Error(`Saison "${season}" introuvable`);
      const result = drawCards(season, NUM_CARDS_IN_BOOSTER);
      drawnCards = result.map(c => ({ ...c, season }));
    }
    
    if (drawnCards.length === 0) throw new Error("Échec du tirage des cartes");

    // --- MISE À JOUR BASE DE DONNÉES ---
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val() || {};
    const existingQuantities = user.cards || {};
    let totalBabyCards = user.totalBabyCards || 0;
    
    const updates: any = {};
    drawnCards.forEach(card => {
      const newQty = (existingQuantities[card.code] || 0) + 1;
      updates[`cards/${card.code}`] = newQty;
      totalBabyCards++;
    });

    updates['totalBabyCards'] = totalBabyCards;
    updates['lastBoosterOpened'] = new Date().toISOString();

    await update(userRef, updates);
    
    return drawnCards;
  } catch (error) {
    logger.error("❌ Erreur openBoosterPack:", error);
    throw error;
  }
}

/**
 * ✅ Statistiques de collection optimisées
 */
export async function getCardStats(uid: string) {
  try {
    const quantities = await getUserCardQuantities(uid);
    let totalCards = 0, uniqueCards = 0, rareCards = 0, ultraRareCards = 0;
    const cardsBySeason: { [season: string]: number } = {};
    const { codeToCardMap, isUltraRare } = await import("./cardSystem");
    
    for (const [season, cards] of Object.entries(codeToCardMap)) {
      cardsBySeason[season] = 0;
      for (const [code, count] of Object.entries(quantities)) {
        if (count > 0 && cards[code]) {
          totalCards += count;
          uniqueCards++;
          cardsBySeason[season]++;
          if (isUltraRare(cards[code].rarity)) {
            rareCards += count;
            ultraRareCards++;
          }
        }
      }
    }
    return { totalCards, uniqueCards, rareCards, ultraRareCards, cardsBySeason };
  } catch (error) {
    return { totalCards: 0, uniqueCards: 0, rareCards: 0, ultraRareCards: 0, cardsBySeason: {} };
  }
}

/**
 * ✅ Progression d'une saison spécifique
 */
export async function getSeasonProgress(uid: string, season: string) {
  try {
    const quantities = await getUserCardQuantities(uid);
    const { codeToCardMap, getTotalCardsInSeason } = await import("./cardSystem");
    const seasonCards = codeToCardMap[season];
    if (!seasonCards) return { owned: 0, total: 0, percentage: 0 };
    
    const total = getTotalCardsInSeason(season);
    let owned = 0;
    for (const code of Object.keys(seasonCards)) {
      if (quantities[code] > 0) owned++;
    }
    return { owned, total, percentage: total > 0 ? Math.round((owned / total) * 100) : 0 };
  } catch (error) {
    return { owned: 0, total: 0, percentage: 0 };
  }
}

/**
 * ✅ Vérifie si l'utilisateur possède une carte
 */
export async function hasCard(uid: string, cardCode: string): Promise<number> {
  const quantities = await getUserCardQuantities(uid);
  return quantities[cardCode] || 0;
}

/**
 * ✅ Ajoute/Retire des cartes manuellement (Admin)
 */
export async function updateCardQuantity(uid: string, cardCode: string, quantity: number): Promise<void> {
  const { cardExists } = await import("./cardSystem");
  if (!cardExists(cardCode)) throw new Error(`Carte "${cardCode}" introuvable`);
  
  const userRef = ref(database, `users/${uid}`);
  const snap = await get(userRef);
  const user = snap.val() || {};
  
  const currentCount = (user.cards || {})[cardCode] || 0;
  const newCount = Math.max(0, currentCount + quantity);
  const diff = newCount - currentCount;
  
  await update(userRef, {
    [`cards/${cardCode}`]: newCount,
    totalBabyCards: Math.max(0, (user.totalBabyCards || 0) + diff),
  });
}
