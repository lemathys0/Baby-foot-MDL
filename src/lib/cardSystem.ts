// 📁 src/lib/cardSystem.ts
// ============================
// Configuration et logique du système de cartes - VERSION CORRIGÉE

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
  season2: {
    // --- Cartes Communes (Bronze/Silver/Gold) ---
    "S2N001": { nom: "Player1.png", rarity: "Bronze-NR" },
    "S2N002": { nom: "Player2.png", rarity: "Bronze-NR" },
    "S2R001": { nom: "Player3.png", rarity: "Bronze-R" },
    "S2R002": { nom: "Player4.png", rarity: "Bronze-R" },
    "S2W001": { nom: "Player5.png", rarity: "Silver-NR" },
    "S2B001": { nom: "Player6.png", rarity: "Silver-R" },
    "S2Y001": { nom: "Player7.png", rarity: "Silver-R" },
    "S2U001": { nom: "Player8.png", rarity: "Silver-R" },
    "S2Z001": { nom: "Player9.png", rarity: "Silver-NR" },
    "S2M001": { nom: "Player10.png", rarity: "Silver-R" },
    "S2C001": { nom: "Player11.png", rarity: "Silver-NR" },
    "S2Q001": { nom: "Player12.png", rarity: "Silver-NR" },
    "S2H001": { nom: "Player13.png", rarity: "Gold-NR" },
    "S2U002": { nom: "Player14.png", rarity: "Gold-NR" },
    "S2S001": { nom: "Player15.png", rarity: "Gold-R" },
    "S2K001": { nom: "Player16.png", rarity: "Gold-R" },
    "S2F001": { nom: "Player17.png", rarity: "Gold-R" },
    "S2T001": { nom: "Player18.png", rarity: "Espoir" },
    "S2Q002": { nom: "Player19.png", rarity: "Espoir" },
    "S2L001": { nom: "Player20.png", rarity: "Icone" },
    "S2C002": { nom: "Player21.png", rarity: "Icone" },
    "S2X001": { nom: "Player22.png", rarity: "Future-star" },
    "S2A001": { nom: "Player23.png", rarity: "Hist.Maker" },
    "S2T002": { nom: "Player24.png", rarity: "God" },
    "S2Q003": { nom: "Player25.png", rarity: "Createur" },
    "S2U003": { nom: "Player26.png", rarity: "BouBou" },
    "S2U004": { nom: "Player27.png", rarity: "PikaPika" }
  }
};

// ✅ FIX: Poids de rareté normalisés et équilibrés
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
 * ✅ Choisit une carte aléatoire basée sur la pondération de rareté.
 * @param season La saison de la carte.
 * @param excludeCodes Codes de cartes à exclure de CE tirage.
 * @returns L'objet carte tirée ou null.
 */
function pickWeightedCard(
  season: string,
  excludeCodes: Set<string> = new Set()
): CardData | null {
  const cardsInSeason = codeToCardMap[season];
  if (!cardsInSeason) {
    console.warn(`⚠️ Saison "${season}" introuvable dans codeToCardMap`);
    return null;
  }

  const pool = Object.entries(cardsInSeason)
    .filter(([code]) => !excludeCodes.has(code)); 
  
  if (pool.length === 0) {
    console.warn(`⚠️ Plus de cartes disponibles dans la saison "${season}"`);
    return null;
  }

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
  
  // Fallback: retourner la première carte si tout échoue
  const fallback = weightedCards[0];
  return {
    code: fallback.code,
    nom: fallback.nom,
    rarity: fallback.rarity,
    season: season
  } as CardData;
}

/**
 * ✅ Effectue un tirage de N cartes uniques pour un booster.
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
  
  const MAX_ATTEMPTS = count * 10; // ✅ Plus de tentatives pour garantir le succès
  let attempts = 0;

  while (selected.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const pickedCard = pickWeightedCard(season, pickedCodes);

    if (pickedCard && !pickedCodes.has(pickedCard.code)) {
      selected.push(pickedCard);
      pickedCodes.add(pickedCard.code);
    } else if (!pickedCard) {
      console.error(`❌ Impossible de tirer une carte après ${attempts} tentatives`);
      break;
    }
  }
  
  if (selected.length < count) {
    console.warn(`⚠️ Seulement ${selected.length}/${count} cartes tirées`);
  }
  
  return selected;
}

// Types de rareté pour l'UI (utilisés par PlayerCard.tsx)
export type Rarity = "bronze" | "silver" | "gold" | "espoir" | "icone" | "future-star" | "god" | "creator" | "unknown";

/**
 * ✅ FIX MAJEUR: Fonction pour convertir une rareté interne en catégorie UI.
 * Gère maintenant correctement toutes les variations de casse et de format.
 * @param rarity La chaîne de rareté (e.g., "Bronze-NR", "Future-star").
 * @returns La catégorie UI normalisée.
 */
export function getRarityCategory(rarity: string): Rarity {
  // ✅ Normalisation complète: trim + lowercase
  const normalized = rarity.trim().toLowerCase();
  
  // Cartes communes
  if (normalized.includes("bronze")) return "bronze";
  if (normalized.includes("silver")) return "silver";
  if (normalized.includes("gold")) return "gold";
  
  // Cartes spéciales
  if (normalized === "espoir") return "espoir";
  if (normalized === "icone") return "icone";
  if (normalized === "future-star") return "future-star";
  
  // ✅ Cartes ultra-rares (toutes mappées vers "god" ou "creator")
  if (["god", "pikapika", "boubou", "hist.maker"].includes(normalized)) {
    return "god";
  }
  
  if (normalized === "createur") return "creator";
  
  console.warn(`⚠️ Rareté inconnue: "${rarity}" (normalisée: "${normalized}")`);
  return "unknown"; 
}

/**
 * ✅ Liste complète des raretés ultra-rares (pour les stats)
 */
export const ULTRA_RARE_RARITIES = [
  "God", 
  "Createur", 
  "PikaPika", 
  "BouBou", 
  "Hist.Maker",
  "Future-star", // ✅ Ajouté car très rare
  "Icone"        // ✅ Ajouté car très rare
];

/**
 * ✅ Vérifie si une rareté est ultra-rare
 */
export function isUltraRare(rarity: string): boolean {
  return ULTRA_RARE_RARITIES.some(
    ultra => rarity.toLowerCase() === ultra.toLowerCase()
  );
}

/**
 * ✅ Retourne la liste de toutes les saisons disponibles
 */
export function getAvailableSeasons(): string[] {
  return Object.keys(codeToCardMap).sort();
}

/**
 * ✅ Retourne le nom d'affichage d'une saison
 */
export function getSeasonDisplayName(season: string): string {
  const seasonNames: { [key: string]: string } = {
    season1: "Saison 1",
    season2: "Saison 2",
    season3: "Saison 3" // Préparé pour l'avenir
  };
  return seasonNames[season] || season;
}

/**
 * ✅ Obtient toutes les cartes d'une saison spécifique
 */
export function getCardsForSeason(season: string): CardData[] {
  const cardsInSeason = codeToCardMap[season];
  if (!cardsInSeason) return [];
  
  return Object.entries(cardsInSeason).map(([code, card]) => ({
    code,
    nom: card.nom,
    rarity: card.rarity,
    season
  }));
}

/**
 * ✅ Obtient le nombre total de cartes dans une saison
 */
export function getTotalCardsInSeason(season: string): number {
  const cardsInSeason = codeToCardMap[season];
  return cardsInSeason ? Object.keys(cardsInSeason).length : 0;
}

/**
 * ✅ Vérifie si un code de carte existe
 */
export function cardExists(code: string, season?: string): boolean {
  if (season) {
    return !!(codeToCardMap[season]?.[code]);
  }
  
  // Chercher dans toutes les saisons
  for (const seasonCards of Object.values(codeToCardMap)) {
    if (seasonCards[code]) return true;
  }
  
  return false;
}

/**
 * ✅ Obtient les informations d'une carte par son code
 */
export function getCardByCode(code: string): (CardData & { found: boolean }) | null {
  for (const [season, cards] of Object.entries(codeToCardMap)) {
    if (cards[code]) {
      return {
        code,
        nom: cards[code].nom,
        rarity: cards[code].rarity,
        season,
        found: true
      };
    }
  }
  
  return null;
}
