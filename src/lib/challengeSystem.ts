// 📁 src/lib/challengeSystem.ts
// Système de défis directs entre joueurs

import { ref, push, get, update, remove } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";

export type ChallengeStatus = "pending" | "accepted" | "declined" | "expired" | "completed";
export type ChallengeType = "1v1" | "2v2";

export interface Challenge {
  id: string;
  challengerId: string;
  challengerUsername: string;
  challengedId: string;
  challengedUsername: string;
  type: ChallengeType;
  message?: string;
  stake?: number; // Montant misé (optionnel)
  status: ChallengeStatus;
  createdAt: number;
  expiresAt: number;
  acceptedAt?: number;
  completedAt?: number;
  winnerId?: string;
}

const CHALLENGE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Crée un nouveau défi
 */
export async function createChallenge(
  challengerId: string,
  challengerUsername: string,
  challengedId: string,
  challengedUsername: string,
  type: ChallengeType,
  message?: string,
  stake?: number
): Promise<string> {
  try {
    // Vérifier qu'on ne se défie pas soi-même
    if (challengerId === challengedId) {
      throw new Error("Vous ne pouvez pas vous défier vous-même");
    }

    // Vérifier si un défi existe déjà entre ces joueurs
    const existingChallenge = await getActiveChallengesBetween(challengerId, challengedId);
    if (existingChallenge.length > 0) {
      throw new Error("Un défi est déjà en cours avec ce joueur");
    }

    const challengesRef = ref(database, "challenges");
    const newChallengeRef = push(challengesRef);
    const challengeId = newChallengeRef.key!;

    const challenge: Challenge = {
      id: challengeId,
      challengerId,
      challengerUsername,
      challengedId,
      challengedUsername,
      type,
      message: message || "",
      stake: stake || 0,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + CHALLENGE_EXPIRY_TIME,
    };

    await update(newChallengeRef, challenge);

    // Créer une notification pour le joueur défié
    const { default: createNotification } = await import("./firebaseNotifications");
    await createNotification(
      challengedId,
      "challenge_received",
      "Nouveau défi!",
      `${challengerUsername} vous défie en ${type}${stake ? ` pour ${stake}€` : ""}`,
      challengeId
    );

    logger.log(`✅ Défi créé: ${challengeId}`);
    return challengeId;
  } catch (error) {
    logger.error("❌ Erreur création défi:", error);
    throw error;
  }
}

/**
 * Accepte un défi
 */
export async function acceptChallenge(challengeId: string, userId: string): Promise<void> {
  try {
    const challengeRef = ref(database, `challenges/${challengeId}`);
    const snapshot = await get(challengeRef);

    if (!snapshot.exists()) {
      throw new Error("Défi introuvable");
    }

    const challenge = snapshot.val() as Challenge;

    // Vérifier que c'est bien le joueur défié qui accepte
    if (challenge.challengedId !== userId) {
      throw new Error("Vous n'êtes pas autorisé à accepter ce défi");
    }

    // Vérifier que le défi est toujours en attente
    if (challenge.status !== "pending") {
      throw new Error("Ce défi n'est plus disponible");
    }

    // Vérifier que le défi n'a pas expiré
    if (Date.now() > challenge.expiresAt) {
      await update(challengeRef, { status: "expired" });
      throw new Error("Ce défi a expiré");
    }

    await update(challengeRef, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Notifier le challenger
    const { default: createNotification } = await import("./firebaseNotifications");
    await createNotification(
      challenge.challengerId,
      "challenge_accepted",
      "Défi accepté!",
      `${challenge.challengedUsername} a accepté votre défi!`,
      challengeId
    );

    logger.log(`✅ Défi accepté: ${challengeId}`);
  } catch (error) {
    logger.error("❌ Erreur acceptation défi:", error);
    throw error;
  }
}

/**
 * Refuse un défi
 */
export async function declineChallenge(challengeId: string, userId: string): Promise<void> {
  try {
    const challengeRef = ref(database, `challenges/${challengeId}`);
    const snapshot = await get(challengeRef);

    if (!snapshot.exists()) {
      throw new Error("Défi introuvable");
    }

    const challenge = snapshot.val() as Challenge;

    // Vérifier que c'est bien le joueur défié qui refuse
    if (challenge.challengedId !== userId) {
      throw new Error("Vous n'êtes pas autorisé à refuser ce défi");
    }

    // Vérifier que le défi est toujours en attente
    if (challenge.status !== "pending") {
      throw new Error("Ce défi n'est plus disponible");
    }

    await update(challengeRef, { status: "declined" });

    // Notifier le challenger
    const { default: createNotification } = await import("./firebaseNotifications");
    await createNotification(
      challenge.challengerId,
      "challenge_declined",
      "Défi refusé",
      `${challenge.challengedUsername} a refusé votre défi`,
      challengeId
    );

    logger.log(`✅ Défi refusé: ${challengeId}`);
  } catch (error) {
    logger.error("❌ Erreur refus défi:", error);
    throw error;
  }
}

/**
 * Annule un défi (par le challenger uniquement)
 */
export async function cancelChallenge(challengeId: string, userId: string): Promise<void> {
  try {
    const challengeRef = ref(database, `challenges/${challengeId}`);
    const snapshot = await get(challengeRef);

    if (!snapshot.exists()) {
      throw new Error("Défi introuvable");
    }

    const challenge = snapshot.val() as Challenge;

    // Vérifier que c'est bien le challenger qui annule
    if (challenge.challengerId !== userId) {
      throw new Error("Seul l'initiateur peut annuler ce défi");
    }

    // Vérifier que le défi est toujours en attente
    if (challenge.status !== "pending") {
      throw new Error("Ce défi ne peut plus être annulé");
    }

    await remove(challengeRef);

    logger.log(`✅ Défi annulé: ${challengeId}`);
  } catch (error) {
    logger.error("❌ Erreur annulation défi:", error);
    throw error;
  }
}

/**
 * Marque un défi comme terminé après un match
 */
export async function completeChallenge(
  challengeId: string,
  winnerId: string
): Promise<void> {
  try {
    const challengeRef = ref(database, `challenges/${challengeId}`);
    const snapshot = await get(challengeRef);

    if (!snapshot.exists()) {
      throw new Error("Défi introuvable");
    }

    const challenge = snapshot.val() as Challenge;

    // Vérifier que le défi a été accepté
    if (challenge.status !== "accepted") {
      throw new Error("Ce défi n'a pas été accepté");
    }

    await update(challengeRef, {
      status: "completed",
      completedAt: Date.now(),
      winnerId,
    });

    // Si un stake était impliqué, transférer la fortune
    if (challenge.stake && challenge.stake > 0) {
      const loserId = winnerId === challenge.challengerId
        ? challenge.challengedId
        : challenge.challengerId;

      const { addFortune } = await import("./firebaseExtended");
      await addFortune(winnerId, challenge.stake, `Défi gagné contre ${winnerId === challenge.challengerId ? challenge.challengedUsername : challenge.challengerUsername}`);
      await addFortune(loserId, -challenge.stake, `Défi perdu`);
    }

    // Notifier les deux joueurs
    const { default: createNotification } = await import("./firebaseNotifications");
    const winnerUsername = winnerId === challenge.challengerId
      ? challenge.challengerUsername
      : challenge.challengedUsername;

    await createNotification(
      winnerId,
      "challenge_won",
      "Défi gagné!",
      `Vous avez gagné le défi${challenge.stake ? ` et remporté ${challenge.stake}€` : ""}!`,
      challengeId
    );

    const loserId = winnerId === challenge.challengerId
      ? challenge.challengedId
      : challenge.challengerId;

    await createNotification(
      loserId,
      "challenge_lost",
      "Défi perdu",
      `Vous avez perdu le défi contre ${winnerUsername}${challenge.stake ? ` (-${challenge.stake}€)` : ""}`,
      challengeId
    );

    logger.log(`✅ Défi terminé: ${challengeId}`);
  } catch (error) {
    logger.error("❌ Erreur complétion défi:", error);
    throw error;
  }
}

/**
 * Récupère les défis d'un joueur
 */
export async function getUserChallenges(userId: string): Promise<Challenge[]> {
  try {
    const challengesRef = ref(database, "challenges");
    const snapshot = await get(challengesRef);

    if (!snapshot.exists()) return [];

    const allChallenges = snapshot.val();
    const userChallenges: Challenge[] = [];

    Object.values(allChallenges).forEach((challenge: any) => {
      if (
        challenge.challengerId === userId ||
        challenge.challengedId === userId
      ) {
        userChallenges.push(challenge);
      }
    });

    // Trier par date (plus récent en premier)
    return userChallenges.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    logger.error("❌ Erreur récupération défis:", error);
    return [];
  }
}

/**
 * Récupère les défis actifs entre deux joueurs
 */
async function getActiveChallengesBetween(
  player1Id: string,
  player2Id: string
): Promise<Challenge[]> {
  try {
    const challengesRef = ref(database, "challenges");
    const snapshot = await get(challengesRef);

    if (!snapshot.exists()) return [];

    const allChallenges = snapshot.val();
    const activeChallenges: Challenge[] = [];

    Object.values(allChallenges).forEach((challenge: any) => {
      if (
        challenge.status === "pending" &&
        ((challenge.challengerId === player1Id && challenge.challengedId === player2Id) ||
         (challenge.challengerId === player2Id && challenge.challengedId === player1Id))
      ) {
        activeChallenges.push(challenge);
      }
    });

    return activeChallenges;
  } catch (error) {
    logger.error("❌ Erreur récupération défis actifs:", error);
    return [];
  }
}

/**
 * Nettoie les défis expirés
 */
export async function cleanExpiredChallenges(): Promise<number> {
  try {
    const challengesRef = ref(database, "challenges");
    const snapshot = await get(challengesRef);

    if (!snapshot.exists()) return 0;

    const allChallenges = snapshot.val();
    let expiredCount = 0;

    const now = Date.now();
    const updates: Record<string, any> = {};

    Object.entries(allChallenges).forEach(([id, challenge]: [string, any]) => {
      if (
        challenge.status === "pending" &&
        now > challenge.expiresAt
      ) {
        updates[`challenges/${id}/status`] = "expired";
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      await update(ref(database), updates);
      logger.log(`✅ ${expiredCount} défis expirés nettoyés`);
    }

    return expiredCount;
  } catch (error) {
    logger.error("❌ Erreur nettoyage défis:", error);
    return 0;
  }
}
