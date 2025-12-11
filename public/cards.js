window.codeToCardMap = {
  season1: {
    //"F743": { nom: "Kiara.png", rarity: "Bronze-NR" },
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
  season2: { "1234": { nom: "Ioana2.png", rarity: "Gold-NR" } }
}

// Maintenir la déclaration 'const' pour que le reste du script l'utilise
const codeToCardMap = window.codeToCardMap;


// =========================
// 🔹 HELPERS
// =========================

const rarityWeights = {
  // Poids standard (les plus courants sont les plus grands)
  "Bronze-NR": 26500, // ~26.5%
  "Bronze-R": 22500, // ~22.5%
  "Silver-NR": 15000, // ~15%
  "Silver-R": 11500, // ~11.5%
  "Gold-NR": 8000, // ~8%
  "Gold-R": 6000, // ~6%
  "Espoir": 4000, // ~4%
  "Icone": 3000, // ~3%
  "Future-star": 2000, // ~2%
  "Hist.Maker": 1500, // ~1.5%
  "God": 1000, // ~1%
  "Createur": 500, // ~0.5%
  
  // Cartes ULTRA RARES : Poids extrêmement bas (moins d'une chance sur 100 000)
  "PikaPika": 1, // Dracaufeu
  "BouBou": 0.1 // Boubou
};


function flattenSeasonCardsWithRarity(season = "season1") {
  const cards = [];
  if (season === "all") {
    for (const s in codeToCardMap) {
      const seasonCards = codeToCardMap[s];
      for (const [code, info] of Object.entries(seasonCards)) {
        cards.push({ code, nom: info.nom, rarity: info.rarity || "commun", season: s });
      }
    }
  } else {
    const seasonCards = codeToCardMap[season] || {};
    for (const [code, info] of Object.entries(seasonCards)) {
      cards.push({ code, nom: info.nom, rarity: info.rarity || "commun", season });
    }
  }
  return cards;
}

function findCardByCode(code) {
  for (const seasonKey in codeToCardMap) {
    if (codeToCardMap[seasonKey][code]) {
      const cardInfo = codeToCardMap[seasonKey][code];
      return {
        code: code,
        nom: cardInfo.nom,
        rarity: cardInfo.rarity,
        season: seasonKey
      };
    }
  }
  return null; 
}


// FONCTION CORRIGÉE AVEC LOGS ET SANS FAILLES DE RARETÉ
function drawWeightedRandomCards(count, season = "season1") {
  console.log(`[TIRAGE] Tentative de tirage de ${count} cartes pour la saison ${season}.`);
  
  const pool = flattenSeasonCardsWithRarity(season);
  
  // 1. Création du pool pondéré avec poids cumulatifs
  const weighted = [];
  let totalWeight = 0;
  
  pool.forEach(card => {
    const w = rarityWeights[card.rarity];
    if (w === undefined) {
      // Cas de rareté inconnue
      console.warn(`[TIRAGE: AVERTISSEMENT] Rareté '${card.rarity}' inconnue, poids de 1 utilisé.`);
      totalWeight += 1;
      weighted.push({ card, weight: 1, cumulative: totalWeight });
    } else {
      totalWeight += w;
      weighted.push({ card, weight: w, cumulative: totalWeight });
    }
  });

  if (totalWeight === 0) {
    console.error("[TIRAGE: ERREUR] Le poids total des cartes est zéro. Retourne un tableau vide.");
    return [];
  }
  
  console.log(`[TIRAGE] Poids total du pool : ${totalWeight.toFixed(2)}`);

  const selected = [];
  const pickedCodes = new Set();
  
  // 2. Boucle pour sélectionner le nombre exact de cartes UNiQUES demandées
  while (selected.length < count) {
    // Choisir un nombre aléatoire entre 0 et le poids total
    const randomValue = Math.random() * totalWeight;
    let pickedCard = null;

    // Trouver la carte correspondante (méthode de la roulette russe)
    for (const item of weighted) {
      if (randomValue < item.cumulative) {
        pickedCard = item.card;
        break;
      }
    }
    
    // Processus de sélection et gestion des doublons
    if (pickedCard && !pickedCodes.has(pickedCard.code)) {
      selected.push(pickedCard);
      pickedCodes.add(pickedCard.code);
      console.log(`[TIRAGE: SUCCÈS] Carte tirée : ${pickedCard.nom} (${pickedCard.rarity}).`);
    } else if (pickedCard) {
      // Cas où la carte a déjà été tirée (on retente un tirage à la prochaine itération)
      console.log(`[TIRAGE: Répétition] Carte déjà tirée : ${pickedCard.nom} (${pickedCard.rarity}). Retente un tirage pondéré...`);
      
      // Sécurité : si toutes les cartes uniques ont été tirées, on arrête pour ne pas boucler à l'infini
      if (selected.length === pool.length) {
        console.warn("[TIRAGE: FIN FORCÉE] Toutes les cartes uniques du pool ont été tirées.");
        break;
      }
      
    } else {
      // Cas de sécurité (ne devrait jamais arriver)
      console.error("[TIRAGE: ERREUR] Erreur inattendue, pas de carte tirée. Arrêt du tirage.");
      break; 
    }
  }

  // Si le nombre de cartes tirées est inférieur à 'count'
  if (selected.length < count) {
    console.warn(`[TIRAGE: ATTENTION] Seulement ${selected.length} cartes uniques tirées sur ${count} demandées.`);
  }

  console.log(`[TIRAGE: FIN] Tirage terminé. ${selected.length} cartes finales.`);
  return selected;
}

function now() {
  return Date.now();
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load error: " + src));
    img.src = src;
  });
}