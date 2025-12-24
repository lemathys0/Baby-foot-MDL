// src/lib/taxSystem.ts
import { ref, get, update } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";
// ✅ FIX: Import de la fonction depuis utils.ts pour éviter la duplication
import { calculateTaxRate, TAX_BRACKETS } from "./utils";
import { addFortuneHistoryEntry } from "./firebaseExtended";

interface UserTaxData {
  bettingGains: number;
  taxesDue: number;
  taxesPaid: boolean;
  lastTaxPaymentDate: number;
  latePenalty: boolean;
  daysUntilNextTax: number;
}

/**
 * Obtenir la date du dernier week-end du mois
 * ✅ FIX: Prend maintenant une date en paramètre
 */
function getLastWeekendOfMonth(date: Date = new Date()): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Premier jour du mois suivant
  const firstDayNextMonth = new Date(year, month + 1, 1);
  // Dernier jour du mois
  const lastDayOfMonth = new Date(firstDayNextMonth.getTime() - 1);
  
  // Trouver le dernier samedi du mois
  let lastSaturday = new Date(lastDayOfMonth);
  while (lastSaturday.getDay() !== 6) {
    lastSaturday.setDate(lastSaturday.getDate() - 1);
  }
  
  // Dernier dimanche du mois
  let lastSunday = new Date(lastSaturday);
  lastSunday.setDate(lastSunday.getDate() + 1);
  
  return {
    start: lastSaturday,
    end: lastSunday,
  };
}

/**
 * Vérifier si nous sommes dans le dernier week-end du mois
 */
export function isLastWeekendOfMonth(): boolean {
  const now = new Date();
  const weekend = getLastWeekendOfMonth(now);
  
  return now >= weekend.start && now <= weekend.end;
}

/**
 * Obtenir les jours restants jusqu'au dernier week-end du mois
 * ✅ FIX: Logique de calcul simplifiée et corrigée
 */
export function getDaysUntilLastWeekend(): number {
  const now = new Date();
  const currentMonthWeekend = getLastWeekendOfMonth(now);
  
  // Si on est pendant le weekend
  if (now >= currentMonthWeekend.start && now <= currentMonthWeekend.end) {
    return 0;
  }
  
  // Si le weekend est passé, calculer pour le mois prochain
  if (now > currentMonthWeekend.end) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const nextWeekend = getLastWeekendOfMonth(nextMonth);
    return Math.ceil((nextWeekend.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Sinon, calculer jusqu'au weekend de ce mois
  return Math.ceil((currentMonthWeekend.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ✅ FIX: Suppression de la duplication - utilise la fonction de utils.ts
// export function calculateTaxRate(bettingGains: number): number { ... }

/**
 * Calculer les taxes dues basées sur les gains de paris SEULEMENT
 */
export function calculateTaxesDue(bettingGains: number): number {
  const rate = calculateTaxRate(bettingGains);
  return Math.round(bettingGains * rate);
}

/**
 * Obtenir les informations fiscales complètes d'un utilisateur
 */
export async function getUserTaxInfo(userId: string): Promise<UserTaxData> {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return {
        bettingGains: 0,
        taxesDue: 0,
        taxesPaid: false,
        lastTaxPaymentDate: Date.now(),
        latePenalty: false,
        daysUntilNextTax: getDaysUntilLastWeekend(),
      };
    }
    
    const userData = snapshot.val();
    const bettingGains = userData.bettingGains || 0;
    const taxesPaid = userData.taxesPaidThisMonth || false;
    const lastTaxPaymentDate = userData.lastTaxPaymentDate || 0;
    const taxesDue = calculateTaxesDue(bettingGains);
    
    return {
      bettingGains,
      taxesDue,
      taxesPaid,
      lastTaxPaymentDate,
      latePenalty: false,
      daysUntilNextTax: getDaysUntilLastWeekend(),
    };
  } catch (error) {
    logger.error("Erreur récupération infos fiscales:", error);
    return {
      bettingGains: 0,
      taxesDue: 0,
      taxesPaid: false,
      lastTaxPaymentDate: Date.now(),
      latePenalty: false,
      daysUntilNextTax: getDaysUntilLastWeekend(),
    };
  }
}

/**
 * Payer les taxes manuellement (seulement le dernier week-end du mois)
 */
export async function payTaxesManually(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Vérifier si nous sommes le dernier week-end
    if (!isLastWeekendOfMonth()) {
      const daysRemaining = getDaysUntilLastWeekend();
      return {
        success: false,
        message: `Les taxes ne peuvent être payées que le dernier week-end du mois. ${daysRemaining} jour(s) restant(s).`,
      };
    }
    
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return {
        success: false,
        message: "Utilisateur non trouvé",
      };
    }
    
    const userData = snapshot.val();
    
    // Vérifier si déjà payé ce mois-ci
    if (userData.taxesPaidThisMonth) {
      return {
        success: false,
        message: "Vous avez déjà payé vos taxes ce mois-ci.",
      };
    }
    
    const bettingGains = userData.bettingGains || 0;
    const fortune = userData.fortune || 0;
    const taxesDue = calculateTaxesDue(bettingGains);
    
    if (fortune < taxesDue) {
      return {
        success: false,
        message: `Fonds insuffisants. Vous avez besoin de ${taxesDue}€ (vous en avez ${fortune}€)`,
      };
    }
    
    // Déduire les taxes et marquer comme payé
    const newFortune = fortune - taxesDue;
    const updates: { [key: string]: any } = {};
    updates[`users/${userId}/fortune`] = newFortune;
    updates[`users/${userId}/taxesPaidThisMonth`] = true;
    updates[`users/${userId}/lastTaxPaymentDate`] = Date.now();
    updates[`users/${userId}/totalTaxesPaid`] = (userData.totalTaxesPaid || 0) + taxesDue;

    await update(ref(database), updates);

    // Enregistrer dans l'historique
    await addFortuneHistoryEntry(
      userId,
      newFortune,
      -taxesDue,
      `Paiement de taxes (${taxRate}% sur ${bettingGains}€ de gains)`
    );

    return {
      success: true,
      message: `${taxesDue}€ de taxes payées avec succès`,
    };
  } catch (error: any) {
    logger.error("Erreur paiement taxes:", error);
    return {
      success: false,
      message: error.message || "Erreur lors du paiement des taxes",
    };
  }
}

/**
 * Réinitialiser le statut de paiement au nouveau mois
 */
export async function resetMonthlyTaxStatus(): Promise<void> {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return;
    
    const users = snapshot.val();
    const updates: { [key: string]: any } = {};
    
    // Réinitialiser pour tous les utilisateurs
    Object.keys(users).forEach((userId) => {
      updates[`users/${userId}/taxesPaidThisMonth`] = false;
    });
    
    await update(ref(database), updates);
    logger.log("Statut de paiement réinitialisé pour tous les utilisateurs");
  } catch (error) {
    logger.error("Erreur réinitialisation statut:", error);
  }
}
