// src/lib/clubBonusSystem.ts
import { ref, get } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";

interface ClubBonuses {
  xpBoost: boolean; // +20% ELO gagné
  fortuneBoost: boolean; // +15% de gains
  premiumCards: boolean; // Double chance de cartes rares
}

/**
 * Récupérer les bonus actifs du club d'un utilisateur
 */
export async function getUserClubBonuses(userId: string): Promise<ClubBonuses> {
  const defaultBonuses: ClubBonuses = {
    xpBoost: false,
    fortuneBoost: false,
    premiumCards: false,
  };

  try {
    // Récupérer le club de l'utilisateur
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) return defaultBonuses;
    
    const userData = userSnapshot.val();
    const clubId = userData.clubId;
    
    if (!clubId) return defaultBonuses;
    
    // Récupérer les bonus du club
    const clubRef = ref(database, `clubs/${clubId}`);
    const clubSnapshot = await get(clubRef);
    
    if (!clubSnapshot.exists()) return defaultBonuses;
    
    const clubData = clubSnapshot.val();
    
    return {
      xpBoost: clubData.bonuses?.xpBoost || false,
      fortuneBoost: clubData.bonuses?.fortuneBoost || false,
      premiumCards: clubData.bonuses?.premiumCards || false,
    };
  } catch (error) {
    logger.error("Erreur récupération bonus club:", error);
    return defaultBonuses;
  }
}

/**
 * Appliquer le bonus XP (ELO)
 * ✅ FIX: Nom de paramètre cohérent
 */
export function applyXPBonus(newELO: number, oldELO: number): number {
  const gain = newELO - oldELO;
  const bonusGain = Math.round(gain * 1.2); // +20% sur le gain
  return oldELO + bonusGain;
}

/**
 * Appliquer le bonus Fortune
 * ✅ FIX: Surcharge pour accepter soit un montant simple, soit avec boolean
 */
export function applyFortuneBonus(baseAmount: number): number {
  return Math.round(baseAmount * 1.15); // +15%
}

/**
 * Version avec boolean pour compatibilité
 */
export function applyFortuneBonusWithFlag(baseAmount: number, hasBonus: boolean): number {
  if (!hasBonus) return baseAmount;
  return Math.round(baseAmount * 1.15); // +15%
}

/**
 * Appliquer le bonus cartes premium (double chance)
 */
export function applyPremiumCardsBonus(baseChance: number, hasBonus: boolean): number {
  if (!hasBonus) return baseChance;
  return Math.min(baseChance * 2, 1.0); // Double la chance, max 100%
}

/**
 * Calculer les gains d'un match avec les bonus de club
 * ✅ FIX: Nom de propriété cohérent
 */
export async function calculateMatchRewards(
  userId: string,
  newELO: number,
  oldELO: number,
  baseFortune: number
): Promise<{ elo: number; fortune: number }> {
  const bonuses = await getUserClubBonuses(userId);

  const elo = bonuses.xpBoost ? applyXPBonus(newELO, oldELO) : newELO;
  const fortune = bonuses.fortuneBoost ? applyFortuneBonus(baseFortune) : baseFortune;

  return { elo, fortune };
}

/**
 * Obtenir le taux de drop de carte rare avec bonus
 */
export async function getCardDropRate(
  userId: string,
  baseRareChance: number
): Promise<number> {
  const bonuses = await getUserClubBonuses(userId);
  return applyPremiumCardsBonus(baseRareChance, bonuses.premiumCards);
}

// Alias pour compatibilité
export const getClubBonuses = getUserClubBonuses;

/**
 * Afficher un résumé des bonus actifs
 */
export async function getActiveBonusesSummary(userId: string): Promise<string[]> {
  const bonuses = await getUserClubBonuses(userId);
  const summary: string[] = [];
  
  if (bonuses.xpBoost) {
    summary.push("+20% ELO gagné");
  }
  
  if (bonuses.fortuneBoost) {
    summary.push("+15% de fortune gagnée");
  }
  
  if (bonuses.premiumCards) {
    summary.push("x2 chance de cartes rares");
  }
  
  return summary;
}
