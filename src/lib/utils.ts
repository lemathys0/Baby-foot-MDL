// 📁 src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===========================================
// 💸 CONFIGURATION DU SYSTÈME DE TAXATION
// ✅ FIX: Seuils cohérents avec taxSystem.ts
// ===========================================

export interface TaxBracket {
    threshold: number; // Seuil en EUR
    rate: number;      // Taux en décimal (0.10 = 10%)
}

/**
 * Définition des paliers de taxation progressifs (en € et en décimal).
 * Le taux appliqué est celui du dernier seuil atteint.
 */
export const TAX_BRACKETS: TaxBracket[] = [
    { threshold: 0, rate: 0.10 },      // 10% de 0€ à 99€
    { threshold: 100, rate: 0.15 },    // 15% de 100€ à 999€
    { threshold: 1000, rate: 0.19 },   // 19% de 1000€ à 1999€
    { threshold: 2000, rate: 0.23 }    // 23% à partir de 2000€
];

/**
 * Taux de pénalité de 5% si non payé à temps
 */
export const TAX_PENALTY_RATE = 0.05; 

/**
 * Calcule le taux de taxe applicable en fonction du montant.
 * ✅ FIX: Utilise TAX_BRACKETS comme source unique de vérité
 * @param amount Montant en euros.
 * @returns Le taux de taxe en décimal (e.g., 0.23 pour 23%).
 */
export function calculateTaxRate(amount: number): number {
    let applicableRate = TAX_BRACKETS[0].rate;

    for (const bracket of TAX_BRACKETS) {
        if (amount >= bracket.threshold) {
            applicableRate = bracket.rate;
        } else {
            break; 
        }
    }
    return applicableRate;
}
