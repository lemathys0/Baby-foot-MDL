// src/lib/firebaseTournament.ts
// ✅ SOLUTION: Centraliser la logique du tournoi avec transactions Firebase

import { ref, get, runTransaction, update } from "firebase/database";
import { database } from "./firebase";
import { addFortuneHistoryEntry } from "./firebaseExtended";
import { logger } from "@/utils/logger";
// ============= TYPES =============
export interface TournamentPlayer {
  userId: string;
  username: string;
  eloRating: number;
  partnerId?: string;
  partnerUsername?: string;
}

export interface TournamentMatch {
  id: string;
  round: number;
  team1: {
    playerIds: string[];
    playerNames: string[];
    partnerId: string | null;
    partnerName: string | null;
  };
  team2: {
    playerIds: string[];
    playerNames: string[];
    partnerId: string | null;
    partnerName: string | null;
  };
  status: "pending" | "in_progress" | "completed";
  startTime: number;
  score1: number;
  score2: number;
  winnerId?: string;
  isBye?: boolean;
}

export interface Tournament {
  id: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  players: TournamentPlayer[];
  matches: { [key: string]: TournamentMatch };
  winners: string[];
  prizePool: number;
  status?: "waiting" | "in_progress" | "completed";
  currentRound: number;
  organizerId: string;
  roundLock?: {
    isLocked: boolean;
    lockedBy: string;
    lockedAt: number;
  };
}

// ============= UTILITAIRES =============

/**
 * ✅ Créer un match "bye" pour joueur impair
 */
export function createByeMatch(
  player: TournamentPlayer,
  round: number
): TournamentMatch {
  return {
    id: `match_round${round}_bye_${player.userId}`,
    round,
    team1: {
      playerIds: [player.userId],
      playerNames: [player.username],
      partnerId: player.partnerId || null,
      partnerName: player.partnerUsername || null,
    },
    team2: {
      playerIds: [],
      playerNames: ["BYE"],
      partnerId: null,
      partnerName: null,
    },
    status: "completed",
    startTime: Date.now(),
    score1: 10,
    score2: 0,
    winnerId: player.userId,
    isBye: true,
  };
}

/**
 * ✅ Mélanger un tableau (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============= FONCTIONS PRINCIPALES =============

/**
 * ✅ AMÉLIORATION: Créer le prochain round avec transaction Firebase
 * Évite les race conditions même avec plusieurs clients
 */
export async function createNextRoundSafe(
  tournamentId: string = "active",
  organizerId: string
): Promise<{ success: boolean; message: string; newRound?: number }> {
  const tournamentRef = ref(database, `tournaments/${tournamentId}`);

  try {
    const result = await runTransaction(tournamentRef, (tournament) => {
      if (!tournament) {
        return tournament;
      }

      // ✅ Vérifier le lock (timeout de 30 secondes)
      const now = Date.now();
      if (tournament.roundLock?.isLocked) {
        const lockAge = now - tournament.roundLock.lockedAt;
        if (lockAge < 30000 && tournament.roundLock.lockedBy !== organizerId) {
          // Lock actif par quelqu'un d'autre
          throw new Error("Un autre organisateur crée le round");
        }
      }

      const currentRound = tournament.currentRound || 1;
      const matches = tournament.matches || {};

      // Vérifier que tous les matchs du round actuel sont terminés
      const currentRoundMatches = Object.values(matches).filter(
        (m: any) => m.round === currentRound
      );

      const allCompleted = currentRoundMatches.every(
        (m: any) => m.status === "completed"
      );

      if (!allCompleted) {
        throw new Error("Tous les matchs du round actuel doivent être terminés");
      }

      // Récupérer les gagnants
      let winners: TournamentPlayer[] = currentRoundMatches.map((match: any) => {
        const winnerId = match.score1 > match.score2 
          ? match.team1.playerIds[0] 
          : match.team2.playerIds[0];

        const winnerTeam = match.score1 > match.score2 ? match.team1 : match.team2;

        return {
          userId: winnerId,
          username: winnerTeam.playerNames[0],
          eloRating: 
            tournament.players.find((p: any) => p.userId === winnerId)?.eloRating || 1000,
          partnerId: winnerTeam.partnerId,
          partnerUsername: winnerTeam.partnerName,
        };
      });

      // Si un seul gagnant, tournoi terminé
      if (winners.length === 1) {
        tournament.status = "completed";
        tournament.winners = [winners[0].userId];
        tournament.roundLock = {
          isLocked: false,
          lockedBy: "",
          lockedAt: 0,
        };

        return tournament;
      }

      // ✅ Poser le lock
      tournament.roundLock = {
        isLocked: true,
        lockedBy: organizerId,
        lockedAt: now,
      };

      // Mélanger les gagnants
      winners = shuffleArray(winners);

      const nextRound = currentRound + 1;

      // ✅ Gérer le joueur impair avec "bye"
      let byePlayer: TournamentPlayer | null = null;
      if (winners.length % 2 !== 0) {
        byePlayer = winners.pop()!;
        const byeMatch = createByeMatch(byePlayer, nextRound);
        matches[byeMatch.id] = byeMatch;
      }

      // Créer les matchs normaux
      for (let i = 0; i < winners.length - 1; i += 2) {
        const player1 = winners[i];
        const player2 = winners[i + 1];

        if (player1 && player2) {
          const matchKey = `match_round${nextRound}_${i}`;
          matches[matchKey] = {
            id: matchKey,
            round: nextRound,
            team1: {
              playerIds: [player1.userId],
              playerNames: [player1.username],
              partnerId: player1.partnerId || null,
              partnerName: player1.partnerUsername || null,
            },
            team2: {
              playerIds: [player2.userId],
              playerNames: [player2.username],
              partnerId: player2.partnerId || null,
              partnerName: player2.partnerUsername || null,
            },
            status: "pending",
            startTime: now,
            score1: 0,
            score2: 0,
          };
        }
      }

      tournament.matches = matches;
      tournament.currentRound = nextRound;

      // ✅ Libérer le lock
      tournament.roundLock = {
        isLocked: false,
        lockedBy: "",
        lockedAt: 0,
      };

      return tournament;
    });

    if (!result.committed) {
      return {
        success: false,
        message: "Transaction annulée - réessayez",
      };
    }

    const newRound = result.snapshot.val()?.currentRound;
    const byeCount = result.snapshot.val()?.matches
      ? Object.values(result.snapshot.val().matches).filter(
          (m: any) => m.round === newRound && m.isBye
        ).length
      : 0;

    return {
      success: true,
      message: `Round ${newRound} créé avec succès${byeCount > 0 ? ` (${byeCount} bye)` : ""}`,
      newRound,
    };
  } catch (error: any) {
    logger.error("Erreur création round:", error);
    return {
      success: false,
      message: error.message || "Erreur lors de la création du round",
    };
  }
}

/**
 * ✅ AMÉLIORATION: Terminer un match avec transaction
 */
export async function finishMatchSafe(
  matchId: string,
  organizerId: string,
  tournamentId: string = "active"
): Promise<{ success: boolean; message: string }> {
  const matchRef = ref(database, `tournaments/${tournamentId}/matches/${matchId}`);

  try {
    const result = await runTransaction(matchRef, (match) => {
      if (!match) {
        throw new Error("Match introuvable");
      }

      if (match.status === "completed") {
        throw new Error("Match déjà terminé");
      }

      if (match.score1 === match.score2) {
        throw new Error("Le score ne peut pas être une égalité");
      }

      const winnerId = match.score1 > match.score2 
        ? match.team1.playerIds[0] 
        : match.team2.playerIds[0];

      match.status = "completed";
      match.winnerId = winnerId;

      return match;
    });

    if (!result.committed) {
      return {
        success: false,
        message: "Transaction annulée",
      };
    }

    return {
      success: true,
      message: "Match terminé avec succès",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Erreur lors de la fin du match",
    };
  }
}

/**
 * ✅ AMÉLIORATION: Vérifier si tous les matchs du round sont terminés
 */
export async function checkRoundCompletion(
  tournamentId: string = "active"
): Promise<{ isComplete: boolean; winnersCount: number }> {
  try {
    const tournamentRef = ref(database, `tournaments/${tournamentId}`);
    const snapshot = await get(tournamentRef);

    if (!snapshot.exists()) {
      return { isComplete: false, winnersCount: 0 };
    }

    const tournament = snapshot.val() as Tournament;
    const currentRound = tournament.currentRound || 1;
    const matches = Object.values(tournament.matches || {});

    const currentRoundMatches = matches.filter((m) => m.round === currentRound);
    const isComplete = currentRoundMatches.every((m) => m.status === "completed");

    const winnersCount = currentRoundMatches.length;

    return { isComplete, winnersCount };
  } catch (error) {
    logger.error("Erreur vérification round:", error);
    return { isComplete: false, winnersCount: 0 };
  }
}

/**
 * ✅ Valider qu'un utilisateur peut modifier le tournoi
 */
export async function validateOrganizerPermission(
  userId: string,
  userRole?: string,
  tournamentId: string = "active"
): Promise<boolean> {
  try {
    // Admin et agent = toujours autorisés
    if (userRole === "admin" || userRole === "agent") return true;

    const tournamentRef = ref(database, `tournaments/${tournamentId}`);
    const snapshot = await get(tournamentRef);

    if (!snapshot.exists()) return false;

    const tournament = snapshot.val() as Tournament;
    return tournament.organizerId === userId;
  } catch (error) {
    logger.error("Erreur validation permission:", error);
    return false;
  }
}


export async function distributeTournamentPrizes(
  tournamentId: string = "active"
): Promise<{ success: boolean; message: string }> {
  const tournamentRef = ref(database, `tournaments/${tournamentId}`);

  try {
    const snapshot = await get(tournamentRef);
    if (!snapshot.exists()) {
      return { success: false, message: "Tournoi introuvable" };
    }

    const tournament = snapshot.val() as Tournament;

    if (tournament.status !== "completed") {
      return { success: false, message: "Le tournoi n'est pas terminé" };
    }

    if (tournament.winners.length === 0) {
      return { success: false, message: "Aucun gagnant trouvé" };
    }

    // Calculer les positions finales
    const matches = Object.values(tournament.matches || {});
    const maxRound = Math.max(...matches.map(m => m.round));
    
    // Trouver les joueurs par position
    const finalMatches = matches.filter(m => m.round === maxRound && m.status === "completed");
    
    if (finalMatches.length === 0) {
      return { success: false, message: "Aucun match final trouvé" };
    }

    // Identifier le gagnant (1er), le finaliste (2ème), et les demi-finalistes (3ème)
    const winnerId = tournament.winners[0];
    
    // Le finaliste est le perdant du match final
    const finalMatch = finalMatches[0];
    const finalistId = finalMatch.winnerId === finalMatch.team1.playerIds[0]
      ? finalMatch.team2.playerIds[0]
      : finalMatch.team1.playerIds[0];

    // Les demi-finalistes sont les perdants des demi-finales
    const semiFinalsRound = maxRound - 1;
    const semiFinalMatches = matches.filter(m => m.round === semiFinalsRound && m.status === "completed");
    const semiFinalistIds = semiFinalMatches.map(m => 
      m.winnerId === m.team1.playerIds[0] ? m.team2.playerIds[0] : m.team1.playerIds[0]
    );

    // Calculer les montants
    const firstPrize = Math.floor(tournament.prizePool * 0.5);
    const secondPrize = Math.floor(tournament.prizePool * 0.3);
    const thirdPrize = Math.floor(tournament.prizePool * 0.2);

    const updates: { [key: string]: any } = {};

    // 1er place
    const winnerRef = ref(database, `users/${winnerId}`);
    const winnerSnap = await get(winnerRef);
    if (winnerSnap.exists()) {
      const winnerData = winnerSnap.val();
      const newFortune = (winnerData.fortune || 0) + firstPrize;
      updates[`users/${winnerId}/fortune`] = newFortune;

      // ✅ FIX: Historique avec signature correcte (4 paramètres)
      await addFortuneHistoryEntry(
        winnerId,
        newFortune,
        firstPrize,
        "🏆 1ère place - Tournoi Quotidien"
      );
    }

    // 2ème place
    if (finalistId) {
      const finalistRef = ref(database, `users/${finalistId}`);
      const finalistSnap = await get(finalistRef);
      if (finalistSnap.exists()) {
        const finalistData = finalistSnap.val();
        const newFortune = (finalistData.fortune || 0) + secondPrize;
        updates[`users/${finalistId}/fortune`] = newFortune;

        // ✅ FIX: Historique avec signature correcte (4 paramètres)
        await addFortuneHistoryEntry(
          finalistId,
          newFortune,
          secondPrize,
          "🥈 2ème place - Tournoi Quotidien"
        );
      }
    }

    // 3ème place (partagé entre les 2 demi-finalistes)
    const thirdPrizePerPlayer = Math.floor(thirdPrize / Math.max(semiFinalistIds.length, 1));
    for (const semiFinalistId of semiFinalistIds) {
      const semiRef = ref(database, `users/${semiFinalistId}`);
      const semiSnap = await get(semiRef);
      if (semiSnap.exists()) {
        const semiData = semiSnap.val();
        const newFortune = (semiData.fortune || 0) + thirdPrizePerPlayer;
        updates[`users/${semiFinalistId}/fortune`] = newFortune;

        // ✅ FIX: Historique avec signature correcte (4 paramètres)
        await addFortuneHistoryEntry(
          semiFinalistId,
          newFortune,
          thirdPrizePerPlayer,
          "🥉 3ème place - Tournoi Quotidien"
        );
      }
    }

    // Marquer le tournoi comme "prizes_distributed"
    updates[`tournaments/${tournamentId}/prizesDistributed`] = true;
    updates[`tournaments/${tournamentId}/prizesDistributedAt`] = Date.now();

    await update(ref(database), updates);

    return {
      success: true,
      message: `Prix distribués: 1er (${firstPrize}€), 2ème (${secondPrize}€), 3ème (${thirdPrizePerPlayer}€)`
    };
  } catch (error: any) {
    logger.error("Erreur distribution prix:", error);
    return {
      success: false,
      message: error.message || "Erreur distribution des prix"
    };
  }
}
