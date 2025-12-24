// 📁 src/lib/rivalrySystem.ts
// Système de rivalités automatiques basé sur les matchs

import { ref, get, set, update } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";

export interface Rivalry {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Username: string;
  player2Username: string;
  player1Wins: number;
  player2Wins: number;
  totalMatches: number;
  lastMatchDate: number;
  createdAt: number;
  intensity: "casual" | "heated" | "legendary"; // Basé sur le nombre de matchs
}

/**
 * Calcule l'intensité de la rivalité basée sur le nombre de matchs
 */
function calculateIntensity(totalMatches: number): Rivalry["intensity"] {
  if (totalMatches >= 20) return "legendary";
  if (totalMatches >= 10) return "heated";
  return "casual";
}

/**
 * Crée ou met à jour une rivalité après un match
 */
export async function updateRivalry(
  player1Id: string,
  player2Id: string,
  player1Username: string,
  player2Username: string,
  player1Won: boolean
): Promise<void> {
  try {
    // Trier les IDs pour avoir un ID de rivalité cohérent
    const [smallerId, largerId] = [player1Id, player2Id].sort();
    const rivalryId = `${smallerId}_${largerId}`;

    const rivalryRef = ref(database, `rivalries/${rivalryId}`);
    const snapshot = await get(rivalryRef);

    if (snapshot.exists()) {
      // Mettre à jour la rivalité existante
      const rivalry = snapshot.val() as Rivalry;

      // Déterminer quel joueur a gagné
      const isPlayer1Small = player1Id === smallerId;
      const player1WinsIncrement = player1Won && isPlayer1Small ? 1 : (!player1Won && !isPlayer1Small ? 1 : 0);
      const player2WinsIncrement = !player1Won && isPlayer1Small ? 1 : (player1Won && !isPlayer1Small ? 1 : 0);

      const updates = {
        player1Wins: rivalry.player1Wins + player1WinsIncrement,
        player2Wins: rivalry.player2Wins + player2WinsIncrement,
        totalMatches: rivalry.totalMatches + 1,
        lastMatchDate: Date.now(),
        intensity: calculateIntensity(rivalry.totalMatches + 1),
      };

      await update(rivalryRef, updates);
      logger.log(`✅ Rivalité mise à jour: ${rivalryId}`);
    } else {
      // Créer une nouvelle rivalité
      const isPlayer1Small = player1Id === smallerId;

      const newRivalry: Rivalry = {
        id: rivalryId,
        player1Id: smallerId,
        player2Id: largerId,
        player1Username: isPlayer1Small ? player1Username : player2Username,
        player2Username: isPlayer1Small ? player2Username : player1Username,
        player1Wins: (isPlayer1Small && player1Won) || (!isPlayer1Small && !player1Won) ? 1 : 0,
        player2Wins: (isPlayer1Small && !player1Won) || (!isPlayer1Small && player1Won) ? 1 : 0,
        totalMatches: 1,
        lastMatchDate: Date.now(),
        createdAt: Date.now(),
        intensity: "casual",
      };

      await set(rivalryRef, newRivalry);
      logger.log(`✅ Nouvelle rivalité créée: ${rivalryId}`);
    }
  } catch (error) {
    logger.error("❌ Erreur mise à jour rivalité:", error);
  }
}

/**
 * Récupère les rivalités d'un joueur
 */
export async function getUserRivalries(userId: string): Promise<Rivalry[]> {
  try {
    const rivalriesRef = ref(database, "rivalries");
    const snapshot = await get(rivalriesRef);

    if (!snapshot.exists()) return [];

    const allRivalries = snapshot.val();
    const userRivalries: Rivalry[] = [];

    Object.values(allRivalries).forEach((rivalry: any) => {
      if (rivalry.player1Id === userId || rivalry.player2Id === userId) {
        userRivalries.push(rivalry);
      }
    });

    // Trier par intensité puis par nombre de matchs
    return userRivalries.sort((a, b) => {
      const intensityOrder = { legendary: 3, heated: 2, casual: 1 };
      const diff = intensityOrder[b.intensity] - intensityOrder[a.intensity];
      if (diff !== 0) return diff;
      return b.totalMatches - a.totalMatches;
    });
  } catch (error) {
    logger.error("❌ Erreur récupération rivalités:", error);
    return [];
  }
}

/**
 * Récupère la rivalité entre deux joueurs
 */
export async function getRivalryBetween(
  player1Id: string,
  player2Id: string
): Promise<Rivalry | null> {
  try {
    const [smallerId, largerId] = [player1Id, player2Id].sort();
    const rivalryId = `${smallerId}_${largerId}`;

    const rivalryRef = ref(database, `rivalries/${rivalryId}`);
    const snapshot = await get(rivalryRef);

    if (!snapshot.exists()) return null;

    return snapshot.val() as Rivalry;
  } catch (error) {
    logger.error("❌ Erreur récupération rivalité:", error);
    return null;
  }
}

/**
 * Récupère les rivalités les plus intenses du système
 */
export async function getTopRivalries(limit: number = 10): Promise<Rivalry[]> {
  try {
    const rivalriesRef = ref(database, "rivalries");
    const snapshot = await get(rivalriesRef);

    if (!snapshot.exists()) return [];

    const allRivalries: Rivalry[] = Object.values(snapshot.val());

    // Trier par intensité et nombre de matchs
    return allRivalries
      .sort((a, b) => {
        const intensityOrder = { legendary: 3, heated: 2, casual: 1 };
        const diff = intensityOrder[b.intensity] - intensityOrder[a.intensity];
        if (diff !== 0) return diff;
        return b.totalMatches - a.totalMatches;
      })
      .slice(0, limit);
  } catch (error) {
    logger.error("❌ Erreur récupération top rivalités:", error);
    return [];
  }
}
