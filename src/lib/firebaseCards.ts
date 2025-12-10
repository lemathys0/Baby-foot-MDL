// 📁 src/lib/firebaseCards.ts
import { ref, get, update } from "firebase/database";
import { database } from "./firebase";

// ⭐️ FIX: Re-export statique des types et fonctions
export { CardData, getRarityCategory } from "./cardSystem"; 

// Interface pour le format de données de la collection optimisée
export interface UserCardQuantities {
    [code: string]: number;
}

export type UniqueCardData = CardData & { ownedCount: number };

// ✅ FIX: Liste complète des raretés ultra-rares
const ULTRA_RARE_CARDS = [
  "Gold-NR", 
  "Gold-R", 
  "God", 
  "Createur", 
  "PikaPika", 
  "BouBou", 
  "Hist.Maker"
];

/**
 * Charge la collection de l'utilisateur sous forme de Map de quantités.
 */
export async function getUserCardQuantities(uid: string): Promise<UserCardQuantities> {
  try {
    const userRef = ref(database, `users/${uid}/cards`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return {};
    
    return snapshot.val() || {}; 
  } catch (error) {
    console.error("Erreur lors du chargement des quantités de cartes:", error);
    return {};
  }
}

/**
 * Charge la collection et la reformate pour le composant UI (BabyDex.tsx).
 */
export async function getUserCards(uid: string): Promise<UniqueCardData[]> {
    const quantities = await getUserCardQuantities(uid);
    const uniqueCards: UniqueCardData[] = [];
    const season = "season1";
    
    const { codeToCardMap } = await import("./cardSystem");

    for (const [code, ownedCount] of Object.entries(quantities)) {
        if (ownedCount > 0 && codeToCardMap[season]?.[code]) { 
            const cardInfo = codeToCardMap[season][code];
            uniqueCards.push({
                code: code,
                nom: cardInfo.nom,
                rarity: cardInfo.rarity,
                season: season,
                ownedCount: ownedCount,
            });
        }
    }

    return uniqueCards.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Ouvre un booster, tire des cartes et met à jour la base de données.
 */
export async function openBoosterPack(uid: string): Promise<CardData[]> {
  const NUM_CARDS_IN_BOOSTER = 3;
  
  try {
    const userRef = ref(database, `users/${uid}`);
    const { drawCards } = await import("./cardSystem");

    const drawnCards = drawCards("season1", NUM_CARDS_IN_BOOSTER); 

    const userSnapshot = await get(userRef);
    const user = userSnapshot.val() || {};
    
    const existingQuantities: UserCardQuantities = user.cards || {};
    let currentTotalCards = user.totalBabyCards || 0; 

    const cardQuantityUpdates: UserCardQuantities = {};
    
    drawnCards.forEach(card => {
        const currentCount = existingQuantities[card.code] || 0;
        cardQuantityUpdates[card.code] = currentCount + 1;
        currentTotalCards++;
    });

    const finalCardQuantities = {
        ...existingQuantities,
        ...cardQuantityUpdates
    };
    
    const updatePayload = {
        cards: finalCardQuantities,
        totalBabyCards: currentTotalCards,
        lastBoosterOpened: new Date().toISOString(),
    };
    
    await update(userRef, updatePayload);
    
    return drawnCards;
  } catch (error) {
    console.error("Erreur lors de l'ouverture du booster:", error);
    throw new Error("Impossible d'ouvrir le booster et de mettre à jour la collection.");
  }
}

/**
 * Fonction utilitaire pour les statistiques
 * ✅ FIX: Utilise la constante ULTRA_RARE_CARDS
 */
export async function getCardStats(uid: string): Promise<{ 
  totalCards: number; 
  uniqueCards: number; 
  rareCards: number 
}> {
    try {
        const quantities = await getUserCardQuantities(uid);
        let totalCards = 0;
        let uniqueCards = 0;
        let rareCards = 0;
        
        const { codeToCardMap } = await import("./cardSystem");

        for (const [code, count] of Object.entries(quantities)) {
            if (count > 0) {
                totalCards += count;
                uniqueCards++;
                
                const cardInfo = codeToCardMap.season1[code];
                // ✅ Vérification unifiée avec constante
                if (cardInfo && ULTRA_RARE_CARDS.includes(cardInfo.rarity)) {
                    rareCards += count;
                }
            }
        }

        return {
            totalCards: totalCards,
            uniqueCards: uniqueCards,
            rareCards: rareCards,
        };
    } catch (error) {
        console.error("Erreur lors du chargement des stats:", error);
        return { totalCards: 0, uniqueCards: 0, rareCards: 0 };
    }
}
