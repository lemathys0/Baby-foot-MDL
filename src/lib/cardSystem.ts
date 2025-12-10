// 📁 src/lib/cardSystem.ts
// ============================
// Configuration et logique du système de cartes

/**
 * Interface pour les données complètes d'une carte (utilisée pour le tirage).
 */
export interface CardData {
  code: string; // Code de la carte (e.g., "N831")
  nom: string; // Nom du fichier/joueur (e.g., "Lilwenn.png")
  rarity: string; // Niveau de rareté (e.g., "Bronze-NR")
  season: string; // Saison de la carte (e.g., "season1")
}

/**
 * Structure de la configuration de toutes les cartes.
 * Clé: saison, Valeur: Map de codes de cartes.
 */
export interface CardMap {
  [season: string]: {
    [code: string]: { nom: string; rarity: string };
  };
}

// Configuration complète des cartes par saison (Base de données des cartes)
export const codeToCardMap: CardMap = {
  season1: {
    // --- Cartes Communes (Bronze/Silver/Gold) ---
    "N831": { nom: "Lilwenn.png", rarity: "Bronze-NR" },
    "R174": { nom: "Cloe.png", rarity: "Bronze-NR" },
    "J665": { nom: "Romane.png", rarity: "Bronze-R" },
    "D384": { nom: "Maxence.png", rarity: "Bronze-R" },
    "W350": { nom: "Ioana.png", rarity: "Silver-NR" },
    "B298": { nom: "Eli-jah.png", rarity: "Silver-R" },
    "Y912": { nom: "Kathell.png", rarity: "Silver-R" },
    "U934": { nom: "Shana.png", rarity: "Silver-R" },
    "Z473": { nom: "Faustin.png", rarity: "Silver-NR" },
    "M483": { nom: "Abel.png", rarity: "Silver-R" },
    "C407": { nom: "Lola.png", rarity: "Silver-NR" },
    "Q493": { nom: "Lucas.png", rarity: "Silver-NR" },
    "H997": { nom: "Yoris.png", rarity: "Gold-NR" },
    "U532": { nom: "Prune.png", rarity: "Gold-NR" },
    "S849": { nom: "Thais.png", rarity: "Gold-R" },
    "K006": { nom: "Adams.png", rarity: "Gold-R" },
    "F825": { nom: "Ambre.png", rarity: "Gold-R" },
    "T209": { nom: "Marceau.png", rarity: "Espoir" },
    "Q514": { nom: "Mathys.png", rarity: "Espoir" },
    "L276": { nom: "Thimeo.png", rarity: "Icone" },
    "C478": { nom: "Mael.png", rarity: "Icone" },
    "X118": { nom: "Nathael.png", rarity: "Future-star" },
    "A621": { nom: "Enzo.png", rarity: "Hist.Maker" },
    "T294": { nom: "Larry.png", rarity: "God" },
    "Q574": { nom: "Chenaie.png", rarity: "Createur" },
    "U986": { nom: "BouBou.png", rarity: "BouBou" },
    "U956": { nom: "Dracaufeu.png", rarity: "PikaPika" }
  },
  // ... autres saisons
};

// Poids de rareté pour le tirage (plus le poids est grand, plus la carte est commune)
const rarityWeights: { [rarity: string]: number } = {
  "Bronze-NR": 40,
  "Bronze-R": 25,
  "Silver-NR": 15,
  "Silver-R": 10,
  "Gold-NR": 5,
  "Gold-R": 3,
  "Espoir": 2,
  "Icone": 1.5,
  "Future-star": 0.8,
  "God": 1,
  "Createur": 0.5,
  "PikaPika": 0.2,
  "BouBou": 0.1,
  "Hist.Maker": 0.1,
};


/**
 * Choisit une carte aléatoire basée sur la pondération de rareté.
 * @param season La saison de la carte.
 * @param excludeCodes Codes de cartes à exclure de CE tirage.
 * @returns L'objet carte tirée ou null.
 */
function pickWeightedCard(
  season: string,
  excludeCodes: Set<string> = new Set()
): CardData | null {
  const cardsInSeason = codeToCardMap[season];
  if (!cardsInSeason) return null;

  const pool = Object.entries(cardsInSeason)
    .filter(([code,]) => !excludeCodes.has(code)); 
  
  if (pool.length === 0) return null;

  let totalWeight = 0;
  const weightedCards = pool.map(([code, card]) => {
    const weight = rarityWeights[card.rarity] || 1;
    totalWeight += weight;
    return { code, ...card, weight };
  });

  let randomValue = Math.random() * totalWeight;

  for (const item of weightedCards) {
    randomValue -= item.weight;
    if (randomValue <= 0) {
      return { 
        code: item.code, 
        nom: item.nom, 
        rarity: item.rarity, 
        season: season 
      } as CardData;
    }
  }
  
  return null; // Fallback
}


/**
 * Effectue un tirage de N cartes uniques pour un booster.
 * L'unicité est garantie *à l'intérieur de ce booster*.
 * @param season La saison de la carte.
 * @param count Le nombre de cartes à tirer.
 * @returns Un tableau d'objets CardData tirés.
 */
export function drawCards(
  season: string,
  count: number
): CardData[] {
  const selected: CardData[] = [];
  const pickedCodes: Set<string> = new Set();
  
  const MAX_ATTEMPTS = count * 5; 
  let attempts = 0;

  while (selected.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const pickedCard = pickWeightedCard(season, pickedCodes);

    if (pickedCard && !pickedCodes.has(pickedCard.code)) {
      selected.push(pickedCard);
      pickedCodes.add(pickedCard.code);
    } else if (!pickedCard) {
      break;
    }
  }
  
  return selected;
}

// Types de rareté pour l'UI (utilisés par PlayerCard.tsx)
export type Rarity = "bronze" | "silver" | "gold" | "espoir" | "icone" | "future-star" | "god" | "creator" | "unknown";

/**
 * Fonction pour convertir une rareté interne en catégorie UI.
 * @param rarity La chaîne de rareté (e.g., "Bronze-NR").
 * @returns La catégorie UI normalisée.
 */
export function getRarityCategory(rarity: string): Rarity {
  // ✅ FIX: Normaliser la chaîne pour éviter les problèmes de casse
  const normalizedRarity = rarity.trim();
  
  if (normalizedRarity.includes("Bronze")) return "bronze";
  if (normalizedRarity.includes("Silver")) return "silver";
  if (normalizedRarity.includes("Gold")) return "gold";
  if (normalizedRarity === "Espoir") return "espoir";
  if (normalizedRarity === "Icone") return "icone";
  
  // ✅ FIX CRITIQUE: "Future-star" avec majuscule au lieu de "future-star"
  if (normalizedRarity === "Future-star") return "future-star";
  
  // ✅ FIX: Amélioration de la détection des raretés ultra-rares
  if (["God", "PikaPika", "BouBou", "Hist.Maker"].includes(normalizedRarity)) {
    return "god";
  }
  
  if (normalizedRarity === "Createur") return "creator";
  
  return "unknown"; 
}
