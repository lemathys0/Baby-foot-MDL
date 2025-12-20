// 🔥 src/lib/firebaseMatch.ts
// Système ELO Multi-Modes: 1v1, 2v2, et Global avec rangs

import { ref, set, remove, get, push, update, onDisconnect, onValue, runTransaction } from "firebase/database";
import { database } from "./firebase";
import { addFortuneHistoryEntry } from "./firebaseExtended";

// ============================
// 🏆 ELO RANKS SYSTEM
// ============================

export interface EloRank {
  name: string;
  minElo: number;
  maxElo: number;
  color: string;
  icon: string;
}

export const ELO_RANKS: EloRank[] = [
  { name: "Bronze", minElo: 0, maxElo: 1099, color: "#CD7F32", icon: "🥉" },
  { name: "Argent", minElo: 1100, maxElo: 1299, color: "#C0C0C0", icon: "🥈" },
  { name: "Or", minElo: 1300, maxElo: 1499, color: "#FFD700", icon: "🥇" },
  { name: "Platine", minElo: 1500, maxElo: 1699, color: "#E5E4E2", icon: "💎" },
  { name: "Diamant", minElo: 1700, maxElo: 1899, color: "#B9F2FF", icon: "💠" },
  { name: "Maître", minElo: 1900, maxElo: 2099, color: "#9B59B6", icon: "👑" },
  { name: "Grand Maître", minElo: 2100, maxElo: 2299, color: "#E74C3C", icon: "⚡" },
  { name: "Challenger", minElo: 2300, maxElo: 9999, color: "#F39C12", icon: "🔥" },
];

export function getEloRank(elo: number): EloRank {
  // ✅ VALIDATION: S'assurer que l'ELO est valide
  if (typeof elo !== 'number' || isNaN(elo) || elo < 0) {
    return ELO_RANKS[0]; // Bronze par défaut
  }
  
  // ✅ LOGIQUE: Trouver le rang approprié
  const rank = ELO_RANKS.find(r => elo >= r.minElo && elo <= r.maxElo);
  return rank || ELO_RANKS[ELO_RANKS.length - 1]; // Challenger si au-dessus du maximum
}

// ============================
// 🎮 MATCH TYPES
// ============================

export type MatchType = "1v1" | "2v2" | "mixed";

export interface EloRatings {
  elo1v1: number;
  elo2v2: number;
  eloGlobal: number;
  wins1v1: number;
  losses1v1: number;
  wins2v2: number;
  losses2v2: number;
  winsMixed: number;
  lossesMixed: number;
}

// ============================
// 🎮 QUEUE MANAGEMENT
// ============================

export interface QueuedPlayer {
  id: string;
  username: string;
  elo1v1: number;
  elo2v2: number;
  eloGlobal: number;
  joinedAt: number;
}

export async function joinMatchQueue(
  userId: string,
  username: string,
  elo1v1: number,
  elo2v2: number,
  eloGlobal: number
): Promise<void> {
  try {
    const queueRef = ref(database, `matchQueue/${userId}`);
    await set(queueRef, {
      id: userId,
      username,
      elo1v1,
      elo2v2,
      eloGlobal,
      joinedAt: Date.now(),
    });
    onDisconnect(queueRef).remove();
  } catch (error) {
    console.error("Erreur lors de l'ajout à la queue:", error);
    throw new Error("Impossible de rejoindre la file d'attente");
  }
}

export async function leaveMatchQueue(userId: string): Promise<void> {
  try {
    const queueRef = ref(database, `matchQueue/${userId}`);
    await remove(queueRef);
  } catch (error) {
    console.error("Erreur lors du retrait de la queue:", error);
    throw new Error("Impossible de quitter la file d'attente");
  }
}

export async function isPlayerInQueue(userId: string): Promise<boolean> {
  try {
    const queueRef = ref(database, `matchQueue/${userId}`);
    const snapshot = await get(queueRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Erreur lors de la vérification de la queue:", error);
    return false;
  }
}

// ============================
// 🎲 MATCH WITH BETTING SYSTEM
// ============================

export type MatchStatus = "open" | "playing" | "finished" | "cancelled";

export interface Bet {
  userId: string;
  username: string;
  amount: number;
  teamBet: 1 | 2;
  timestamp: number;
}

export interface MatchWithBetting {
  id: string;
  team1: string[];
  team2: string[];
  team1Names: string[];
  team2Names: string[];
  matchType: MatchType;
  status: MatchStatus;
  score1?: number;
  score2?: number;
  createdAt: number;
  createdBy: string;
  startedAt?: number;
  finishedAt?: number;
  bets: { [userId: string]: Bet };
  totalBetsTeam1: number;
  totalBetsTeam2: number;
}

export interface EloUpdate {
  userId: string;
  username: string;
  oldElo: number;
  newElo: number;
  eloChange: number;
  matchType: MatchType;
  rank: EloRank;
}

// Déterminer le type de match
function determineMatchType(team1Size: number, team2Size: number): MatchType {
  if (team1Size === 1 && team2Size === 1) return "1v1";
  if (team1Size === 2 && team2Size === 2) return "2v2";
  return "mixed";
}

export async function createMatchForBetting(
  team1PlayerIds: string[],
  team2PlayerIds: string[],
  createdBy: string
): Promise<string> {
  try {
    // ✅ VALIDATION: Vérifier les paramètres
    if (!Array.isArray(team1PlayerIds) || !Array.isArray(team2PlayerIds)) {
      throw new Error("Équipes invalides");
    }
    
    if (team1PlayerIds.length === 0 || team2PlayerIds.length === 0) {
      throw new Error("Les équipes doivent contenir au moins un joueur");
    }
    
    if (team1PlayerIds.length > 2 || team2PlayerIds.length > 2) {
      throw new Error("Maximum 2 joueurs par équipe");
    }
    
    const duplicates = team1PlayerIds.filter(id => team2PlayerIds.includes(id));
    if (duplicates.length > 0) {
      throw new Error("Un joueur ne peut pas être dans les deux équipes");
    }

    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    if (!usersSnapshot.exists()) {
      throw new Error("Aucun utilisateur trouvé");
    }
    const users = usersSnapshot.val();
    
    // ✅ VALIDATION: Vérifier que tous les joueurs existent
    const allPlayerIds = [...team1PlayerIds, ...team2PlayerIds];
    const missingPlayers = allPlayerIds.filter(id => !users[id]);
    if (missingPlayers.length > 0) {
      throw new Error(`Joueur(s) introuvable(s): ${missingPlayers.join(", ")}`);
    }
    
    const team1Names = team1PlayerIds.map(id => users[id]?.username || "Unknown");
    const team2Names = team2PlayerIds.map(id => users[id]?.username || "Unknown");
    
    const matchType = determineMatchType(team1PlayerIds.length, team2PlayerIds.length);

    const matchesRef = ref(database, "bettingMatches");
    const newMatchRef = push(matchesRef);
    const matchId = newMatchRef.key!;

    const matchData: MatchWithBetting = {
      id: matchId,
      team1: team1PlayerIds,
      team2: team2PlayerIds,
      team1Names,
      team2Names,
      matchType,
      status: "open",
      createdAt: Date.now(),
      createdBy,
      bets: {},
      totalBetsTeam1: 0,
      totalBetsTeam2: 0,
    };

    await set(newMatchRef, matchData);
    return matchId;
  } catch (error) {
    console.error("Erreur lors de la création du match:", error);
    throw error;
  }
}

export async function placeBet(
  matchId: string,
  userId: string,
  username: string,
  amount: number,
  teamBet: 1 | 2
): Promise<void> {
  try {
    // ✅ VALIDATION ANTI-TRICHE: Vérifier les paramètres
    if (!matchId || !userId || !username) {
      throw new Error("Paramètres invalides");
    }
    
    if (amount <= 0 || amount > 10000) {
      throw new Error("Le montant doit être entre 1€ et 10000€");
    }
    
    if (teamBet !== 1 && teamBet !== 2) {
      throw new Error("Équipe invalide");
    }

    // ✅ AMÉLIORATION: Vérifier d'abord le match et l'utilisateur avant les transactions
    const matchRef = ref(database, `bettingMatches/${matchId}`);
    const matchSnapshot = await get(matchRef);
    
    if (!matchSnapshot.exists()) {
      throw new Error("Match introuvable");
    }

    const match = matchSnapshot.val() as MatchWithBetting;
    
    // ✅ VALIDATION ANTI-TRICHE: Vérifier le statut
    if (match.status !== "open") {
      throw new Error("Les paris sont fermés pour ce match");
    }
    
    // ✅ VALIDATION ANTI-TRICHE: Empêcher de parier sur un match où l'on joue
    const isPlayerInMatch =
      (Array.isArray(match.team1) && match.team1.includes(userId)) ||
      (Array.isArray(match.team2) && match.team2.includes(userId));
    if (isPlayerInMatch) {
      throw new Error("Vous ne pouvez pas parier sur un match où vous jouez");
    }

    // Sauvegarder la fortune avant pari (pour l'historique)
    const userRef = ref(database, `users/${userId}`);
    const beforeSnap = await get(userRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.val() : null;
    const beforeFortune = beforeData?.fortune ?? 0;

    // ✅ AMÉLIORATION: Transaction sur l'utilisateur d'abord
    await runTransaction(userRef, (userData) => {
      if (!userData) {
        throw new Error("Utilisateur introuvable");
      }
      
      // ✅ VALIDATION ANTI-TRICHE: Vérifier que l'utilisateur n'est pas banni
      if (userData.banned === true) {
        throw new Error("Compte banni");
      }

      const currentFortune = userData.fortune || 0;
      const oldBet = match.bets?.[userId];
      const availableFortune = oldBet ? currentFortune + oldBet.amount : currentFortune;

      // ✅ VALIDATION ANTI-TRICHE: Vérifier les fonds
      if (availableFortune < amount) {
        throw new Error("Vous n'avez pas assez d'argent");
      }
      
      // ✅ VALIDATION ANTI-TRICHE: Limite de fortune
      if (currentFortune < 0 || currentFortune > 1000000) {
        throw new Error("Fortune invalide");
      }

      userData.fortune = availableFortune - amount;
      return userData;
    });

    // ✅ AMÉLIORATION: Utiliser une transaction pour éviter les race conditions sur le match
    await runTransaction(matchRef, (matchData) => {
      if (!matchData) {
        throw new Error("Match introuvable");
      }
      
      // ✅ VALIDATION: Vérifier que le match est toujours ouvert
      if (matchData.status !== "open") {
        throw new Error("Les paris sont fermés pour ce match");
      }
      
      const currentBets = matchData.bets || {};
      const oldBet = currentBets[userId];
      
      let newTotal1 = matchData.totalBetsTeam1 || 0;
      let newTotal2 = matchData.totalBetsTeam2 || 0;
      
      // Retirer l'ancien pari s'il existe
      if (oldBet) {
        if (oldBet.teamBet === 1) {
          newTotal1 -= oldBet.amount;
        } else {
          newTotal2 -= oldBet.amount;
        }
      }
      
      // Ajouter le nouveau pari
      if (teamBet === 1) {
        newTotal1 += amount;
      } else {
        newTotal2 += amount;
      }
      
      // Mettre à jour les données du match
      matchData.bets = {
        ...currentBets,
        [userId]: {
          userId,
          username,
          amount,
          teamBet,
          timestamp: Date.now(),
        }
      };
      matchData.totalBetsTeam1 = newTotal1;
      matchData.totalBetsTeam2 = newTotal2;
      
      return matchData;
    });

    // Historique de fortune: fortune après pari
    const afterSnap = await get(userRef);
    if (afterSnap.exists()) {
      const afterData = afterSnap.val();
      const afterFortune = afterData.fortune ?? 0;
      const delta = afterFortune - beforeFortune;
      if (delta !== 0) {
        const reason = `Pari sur match: ${match.team1Names?.join(" & ") ?? "Équipe 1"} vs ${match.team2Names?.join(" & ") ?? "Équipe 2"}`;
        await addFortuneHistoryEntry(userId, afterFortune, delta, reason);
      }
    }
  } catch (error) {
    console.error("Erreur lors du placement du pari:", error);
    throw error;
  }
}

export async function startMatch(matchId: string): Promise<void> {
  try {
    const matchRef = ref(database, `bettingMatches/${matchId}`);
    
    // ✅ AMÉLIORATION: Utiliser une transaction pour éviter les race conditions
    await runTransaction(matchRef, (matchData) => {
      if (!matchData) {
        throw new Error("Match introuvable");
      }
      
      if (matchData.status !== "open") {
        throw new Error("Le match n'est pas en attente de démarrage");
      }
      
      matchData.status = "playing";
      matchData.startedAt = Date.now();
      
      return matchData;
    });
  } catch (error) {
    console.error("Erreur lors du démarrage du match:", error);
    throw error;
  }
}

// ✅ Calcul ELO avec K-Factor dynamique basé sur le rang
function getKFactor(elo: number): number {
  if (elo < 1300) return 40; // Bronze/Argent: progression rapide
  if (elo < 1700) return 32; // Or/Platine: progression normale
  if (elo < 2100) return 24; // Diamant/Maître: progression lente
  return 16; // Grand Maître/Challenger: très lente
}

function calculateNewElo(
  playerElo: number,
  opponentElo: number,
  won: boolean
): number {
  // ✅ VALIDATION: Vérifier que les ELO sont valides
  if (typeof playerElo !== 'number' || isNaN(playerElo) || playerElo < 0) {
    playerElo = 1000; // Valeur par défaut
  }
  if (typeof opponentElo !== 'number' || isNaN(opponentElo) || opponentElo < 0) {
    opponentElo = 1000; // Valeur par défaut
  }
  
  const kFactor = getKFactor(playerElo);
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = won ? 1 : 0;
  const eloChange = Math.round(kFactor * (actualScore - expectedScore));
  const newElo = playerElo + eloChange;
  
  // ✅ VALIDATION: S'assurer que le nouvel ELO ne devient pas négatif
  return Math.max(0, newElo);
}

export async function finishMatch(
  matchId: string,
  score1: number,
  score2: number
): Promise<{ eloUpdates: EloUpdate[]; winnings: { [userId: string]: number } }> {
  try {
    // ✅ VALIDATION: Vérifier que les scores sont valides
    if (typeof score1 !== 'number' || typeof score2 !== 'number') {
      throw new Error("Scores invalides");
    }
    
    if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
      throw new Error("Les scores doivent être des nombres entiers");
    }
    
    if (score1 < 0 || score2 < 0 || score1 > 100 || score2 > 100) {
      throw new Error("Les scores doivent être entre 0 et 100");
    }
    
    if (score1 === score2) {
      throw new Error("Le score ne peut pas être égal");
    }

    const matchRef = ref(database, `bettingMatches/${matchId}`);
    const matchSnapshot = await get(matchRef);
    
    if (!matchSnapshot.exists()) {
      throw new Error("Match introuvable");
    }

    const match = matchSnapshot.val() as MatchWithBetting;
    
    if (match.status === "finished") {
      throw new Error("Ce match est déjà terminé");
    }

    const suspicious = await isSuspiciousMatch(match.team1, match.team2, score1, score2);

    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      throw new Error("Aucun utilisateur trouvé");
    }

    const matchType = match.matchType;
    
    // ✅ OPTIMISATION: Charger seulement les joueurs nécessaires
    const allPlayerIds = [...match.team1, ...match.team2];
    const playersById = await getPlayersByIds(allPlayerIds);
    
    // Vérifier que tous les joueurs existent
    const missingPlayers = allPlayerIds.filter(id => !playersById[id]);
    if (missingPlayers.length > 0) {
      throw new Error(`Joueur(s) introuvable(s): ${missingPlayers.join(", ")}`);
    }
    
    // Convertir en format attendu pour compatibilité
    const users = playersById;
    
    // Récupérer les ELO appropriés selon le type de match
    const getPlayerElo = (userId: string): number => {
      const user = users[userId];
      if (!user) return 1000;
      
      switch (matchType) {
        case "1v1":
          return user.elo1v1 || 1000;
        case "2v2":
          return user.elo2v2 || 1000;
        case "mixed":
          return user.eloGlobal || 1000;
      }
    };
    
    const team1Players = match.team1.map(id => {
      const user = users[id];
      if (!user) {
        throw new Error(`Joueur ${id} introuvable`);
      }
      return {
        id,
        username: user.username || "Unknown",
        eloRating: getPlayerElo(id),
        wins: user[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
        losses: user[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      };
    });

    const team2Players = match.team2.map(id => {
      const user = users[id];
      if (!user) {
        throw new Error(`Joueur ${id} introuvable`);
      }
      return {
        id,
        username: user.username || "Unknown",
        eloRating: getPlayerElo(id),
        wins: user[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
        losses: user[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      };
    });

    const team1AvgElo = team1Players.reduce((sum, p) => sum + p.eloRating, 0) / team1Players.length;
    const team2AvgElo = team2Players.reduce((sum, p) => sum + p.eloRating, 0) / team2Players.length;
    const team1Won = score1 > score2;
    
    const eloUpdates: EloUpdate[] = [];
    const updates: { [path: string]: unknown } = {};

    // Mettre à jour les ELO spécifiques + global
    const updatePlayerElo = (player: { id: string; username: string; eloRating: number; wins: number; losses: number }, opponentAvgElo: number, won: boolean) => {
      // Si le match est suspect, on enregistre le match mais on ne touche pas à l'ELO
      if (suspicious) {
        return;
      }
      const newElo = calculateNewElo(player.eloRating, opponentAvgElo, won);
      const eloChange = newElo - player.eloRating;
      
      // Mise à jour ELO spécifique
      const eloField = matchType === "1v1" ? "elo1v1" : matchType === "2v2" ? "elo2v2" : "eloGlobal";
      updates[`users/${player.id}/${eloField}`] = newElo;
      
      // ✅ AMÉLIORATION: Mise à jour ELO global (moyenne pondérée uniquement des modes joués)
      const user = users[player.id];
      if (!user) {
        throw new Error(`Utilisateur ${player.id} introuvable lors de la mise à jour ELO`);
      }
      
      const elo1v1 = matchType === "1v1" ? newElo : (user.elo1v1 || 1000);
      const elo2v2 = matchType === "2v2" ? newElo : (user.elo2v2 || 1000);
      const eloMixed = matchType === "mixed" ? newElo : (user.eloGlobal || 1000);
      
      // ✅ LOGIQUE AMÉLIORÉE: Calculer la moyenne uniquement des modes qui ont été joués
      // Si un joueur n'a jamais joué en 1v1, on ne l'inclut pas dans la moyenne
      const elosToAverage: number[] = [];
      if (matchType === "1v1" || user.elo1v1 !== undefined) {
        elosToAverage.push(elo1v1);
      }
      if (matchType === "2v2" || user.elo2v2 !== undefined) {
        elosToAverage.push(elo2v2);
      }
      if (matchType === "mixed" || user.eloGlobal !== undefined) {
        elosToAverage.push(eloMixed);
      }
      
      // Si aucun mode n'a été joué, utiliser la valeur par défaut
      const newGlobalElo = elosToAverage.length > 0 
        ? Math.round(elosToAverage.reduce((sum, elo) => sum + elo, 0) / elosToAverage.length)
        : 1000;
      
      updates[`users/${player.id}/eloGlobal`] = newGlobalElo;
      
      // Stats
      const winsField = `wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`;
      const lossesField = `losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`;
      
      updates[`users/${player.id}/${winsField}`] = won ? player.wins + 1 : player.wins;
      updates[`users/${player.id}/${lossesField}`] = won ? player.losses : player.losses + 1;
      
      const rank = getEloRank(newElo);
      
      eloUpdates.push({
        userId: player.id,
        username: player.username,
        oldElo: player.eloRating,
        newElo,
        eloChange,
        matchType,
        rank,
      });
    };

    team1Players.forEach(player => updatePlayerElo(player, team2AvgElo, team1Won));
    team2Players.forEach(player => updatePlayerElo(player, team1AvgElo, !team1Won));

    // Distribution des gains
    const winningTeam = team1Won ? 1 : 2;
    const totalPot = match.totalBetsTeam1 + match.totalBetsTeam2;
    const winningPot = winningTeam === 1 ? match.totalBetsTeam1 : match.totalBetsTeam2;
    const losingPot = winningTeam === 1 ? match.totalBetsTeam2 : match.totalBetsTeam1;
    
    const winnings: { [userId: string]: number } = {};
    const historyPromises: Promise<void>[] = [];

    // ✅ AMÉLIORATION: Distribution des gains avec gestion des cas limites
    if (match.bets && Object.keys(match.bets).length > 0) {
      if (winningPot > 0) {
        // Cas normal : des paris sur l'équipe gagnante
        for (const bet of Object.values(match.bets)) {
          if (bet.teamBet === winningTeam) {
            const winnerShare = bet.amount / winningPot;
            const profitFromLosers = winnerShare * losingPot;
            const totalWinning = bet.amount + profitFromLosers;
            
            winnings[bet.userId] = Math.round(totalWinning);
            
            const userRef = ref(database, `users/${bet.userId}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              const currentFortune = userData.fortune || 0;
              const currentBettingGains = userData.bettingGains || 0;
              const netProfit = Math.round(profitFromLosers);
              const newFortune = currentFortune + winnings[bet.userId];
              
              updates[`users/${bet.userId}/fortune`] = newFortune;
              updates[`users/${bet.userId}/bettingGains`] = currentBettingGains + netProfit;
              updates[`users/${bet.userId}/totalEarned`] = (userData.totalEarned || 0) + netProfit;

              // Historique de fortune pour les gains
              historyPromises.push(
                addFortuneHistoryEntry(
                  bet.userId,
                  newFortune,
                  winnings[bet.userId],
                  `Gain pari: ${match.team1Names?.join(" & ") ?? "Équipe 1"} vs ${match.team2Names?.join(" & ") ?? "Équipe 2"}`
                )
              );
            }
          }
        }
      } else {
        // ✅ CAS LIMITE: Personne n'a parié sur l'équipe gagnante
        // Rembourser tous les paris de l'équipe perdante
        for (const bet of Object.values(match.bets)) {
          if (bet.teamBet !== winningTeam) {
            const userRef = ref(database, `users/${bet.userId}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              const currentFortune = userData.fortune || 0;
              const newFortune = currentFortune + bet.amount;
              
              // Rembourser la mise
              updates[`users/${bet.userId}/fortune`] = newFortune;

              // Historique de fortune pour les remboursements
              historyPromises.push(
                addFortuneHistoryEntry(
                  bet.userId,
                  newFortune,
                  bet.amount,
                  `Remboursement pari: ${match.team1Names?.join(" & ") ?? "Équipe 1"} vs ${match.team2Names?.join(" & ") ?? "Équipe 2"}`
                )
              );
            }
          }
        }
      }
    }

    // Enregistrer dans l'historique
    const recentMatchesRef = ref(database, "matches");
    const newRecentMatchRef = push(recentMatchesRef);
    
    updates[`matches/${newRecentMatchRef.key}`] = {
      id: newRecentMatchRef.key,
      team1: match.team1,
      team2: match.team2,
      team1Names: match.team1Names,
      team2Names: match.team2Names,
      matchType,
      score1,
      score2,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      recordedBy: match.createdBy,
      fromBetting: true,
      suspicious,
    };

    updates[`bettingMatches/${matchId}/status`] = "finished";
    updates[`bettingMatches/${matchId}/score1`] = score1;
    updates[`bettingMatches/${matchId}/score2`] = score2;
    updates[`bettingMatches/${matchId}/finishedAt`] = Date.now();

    await update(ref(database), updates);
    await Promise.all(historyPromises);

    // ✅ OPTIMISATION: Invalider le cache après un match pour refléter les nouveaux ELO
    invalidatePlayerCache();

    return { eloUpdates, winnings };
  } catch (error) {
    console.error("Erreur lors de la finalisation du match:", error);
    throw error;
  }
}

// ============================
// 📝 RECORD MATCH (SANS PARIS)
// ============================

export async function recordMatch(
  team1PlayerIds: string[],
  team2PlayerIds: string[],
  score1: number,
  score2: number,
  recordedBy: string
): Promise<{ eloUpdates: EloUpdate[] }> {
  try {
    // ✅ VALIDATION ANTI-TRICHE: Vérifier les paramètres
    if (!recordedBy) {
      throw new Error("Utilisateur non authentifié");
    }
    
    if (!Array.isArray(team1PlayerIds) || !Array.isArray(team2PlayerIds)) {
      throw new Error("Équipes invalides");
    }
    
    if (team1PlayerIds.length === 0 || team2PlayerIds.length === 0) {
      throw new Error("Les équipes doivent contenir au moins un joueur");
    }
    
    if (team1PlayerIds.length > 2 || team2PlayerIds.length > 2) {
      throw new Error("Maximum 2 joueurs par équipe");
    }
    
    // ✅ VALIDATION ANTI-TRICHE: Scores valides
    if (typeof score1 !== 'number' || typeof score2 !== 'number') {
      throw new Error("Scores invalides");
    }
    
    // ✅ VALIDATION: Vérifier que les scores sont des entiers
    if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
      throw new Error("Les scores doivent être des nombres entiers");
    }
    
    if (score1 < 0 || score2 < 0 || score1 > 100 || score2 > 100) {
      throw new Error("Les scores doivent être entre 0 et 100");
    }
    
    if (score1 === score2) {
      throw new Error("Le score ne peut pas être égal");
    }

    // ✅ VALIDATION ANTI-TRICHE: Pas de doublons
    const duplicates = team1PlayerIds.filter(id => team2PlayerIds.includes(id));
    if (duplicates.length > 0) {
      throw new Error("Un joueur ne peut pas être dans les deux équipes");
    }
    
    // ✅ VALIDATION ANTI-TRICHE: Pas de doublons dans la même équipe
    const team1Duplicates = team1PlayerIds.filter((id, index) => team1PlayerIds.indexOf(id) !== index);
    const team2Duplicates = team2PlayerIds.filter((id, index) => team2PlayerIds.indexOf(id) !== index);
    if (team1Duplicates.length > 0 || team2Duplicates.length > 0) {
      throw new Error("Un joueur ne peut pas être deux fois dans la même équipe");
    }

    const suspicious = await isSuspiciousMatch(team1PlayerIds, team2PlayerIds, score1, score2);
    const matchType = determineMatchType(team1PlayerIds.length, team2PlayerIds.length);

    // ✅ OPTIMISATION: Charger seulement les joueurs nécessaires au lieu de tous
    const allPlayerIds = [...team1PlayerIds, ...team2PlayerIds];
    const playersById = await getPlayersByIds(allPlayerIds);
    
    // Vérifier que tous les joueurs existent
    const missingPlayers = allPlayerIds.filter(id => !playersById[id]);
    if (missingPlayers.length > 0) {
      throw new Error(`Joueur(s) introuvable(s): ${missingPlayers.join(", ")}`);
    }
    
    // Convertir en format attendu pour compatibilité
    const users = playersById;
    
    const getPlayerElo = (userId: string): number => {
      const user = users[userId];
      if (!user) return 1000;
      
      switch (matchType) {
        case "1v1":
          return user.elo1v1 || 1000;
        case "2v2":
          return user.elo2v2 || 1000;
        case "mixed":
          return user.eloGlobal || 1000;
      }
    };
    
    const team1Players = team1PlayerIds.map(id => {
      const user = users[id];
      if (!user) {
        throw new Error(`Joueur ${id} introuvable`);
      }
      return {
        id,
        username: user.username || "Unknown",
        eloRating: getPlayerElo(id),
        wins: user[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
        losses: user[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      };
    });

    const team2Players = team2PlayerIds.map(id => {
      const user = users[id];
      if (!user) {
        throw new Error(`Joueur ${id} introuvable`);
      }
      return {
        id,
        username: user.username || "Unknown",
        eloRating: getPlayerElo(id),
        wins: user[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
        losses: user[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      };
    });

    const team1AvgElo = team1Players.reduce((sum, p) => sum + p.eloRating, 0) / team1Players.length;
    const team2AvgElo = team2Players.reduce((sum, p) => sum + p.eloRating, 0) / team2Players.length;
    const team1Won = score1 > score2;
    
    const eloUpdates: EloUpdate[] = [];
    const updates: { [path: string]: unknown } = {};

    const updatePlayerElo = (player: { id: string; username: string; eloRating: number; wins: number; losses: number }, opponentAvgElo: number, won: boolean) => {
      // Si le match est suspect, on enregistre le match mais on ne met pas à jour l'ELO
      if (suspicious) {
        return;
      }
      const newElo = calculateNewElo(player.eloRating, opponentAvgElo, won);
      const eloChange = newElo - player.eloRating;
      
      const eloField = matchType === "1v1" ? "elo1v1" : matchType === "2v2" ? "elo2v2" : "eloGlobal";
      updates[`users/${player.id}/${eloField}`] = newElo;
      
      // ✅ AMÉLIORATION: Mise à jour ELO global (moyenne pondérée uniquement des modes joués)
      const user = users[player.id];
      if (!user) {
        throw new Error(`Utilisateur ${player.id} introuvable lors de la mise à jour ELO`);
      }
      
      const elo1v1 = matchType === "1v1" ? newElo : (user.elo1v1 || 1000);
      const elo2v2 = matchType === "2v2" ? newElo : (user.elo2v2 || 1000);
      const eloMixed = matchType === "mixed" ? newElo : (user.eloGlobal || 1000);
      
      // ✅ LOGIQUE AMÉLIORÉE: Calculer la moyenne uniquement des modes qui ont été joués
      const elosToAverage: number[] = [];
      if (matchType === "1v1" || user.elo1v1 !== undefined) {
        elosToAverage.push(elo1v1);
      }
      if (matchType === "2v2" || user.elo2v2 !== undefined) {
        elosToAverage.push(elo2v2);
      }
      if (matchType === "mixed" || user.eloGlobal !== undefined) {
        elosToAverage.push(eloMixed);
      }
      
      const newGlobalElo = elosToAverage.length > 0 
        ? Math.round(elosToAverage.reduce((sum, elo) => sum + elo, 0) / elosToAverage.length)
        : 1000;
      
      updates[`users/${player.id}/eloGlobal`] = newGlobalElo;
      
      const winsField = `wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`;
      const lossesField = `losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`;
      
      updates[`users/${player.id}/${winsField}`] = won ? player.wins + 1 : player.wins;
      updates[`users/${player.id}/${lossesField}`] = won ? player.losses : player.losses + 1;
      
      const rank = getEloRank(newElo);
      
      eloUpdates.push({
        userId: player.id,
        username: player.username,
        oldElo: player.eloRating,
        newElo,
        eloChange,
        matchType,
        rank,
      });
    };

    team1Players.forEach(player => updatePlayerElo(player, team2AvgElo, team1Won));
    team2Players.forEach(player => updatePlayerElo(player, team1AvgElo, !team1Won));

    const matchesRef = ref(database, "matches");
    const newMatchRef = push(matchesRef);
    
    const team1Names = team1Players.map(p => p.username);
    const team2Names = team2Players.map(p => p.username);
    
    const matchData = {
      id: newMatchRef.key,
      team1: team1PlayerIds,
      team2: team2PlayerIds,
      team1Names,
      team2Names,
      matchType,
      score1,
      score2,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      recordedBy,
      suspicious,
    };

    updates[`matches/${newMatchRef.key}`] = matchData;

    await update(ref(database), updates);

    // ✅ OPTIMISATION: Invalider le cache après un match pour refléter les nouveaux ELO
    invalidatePlayerCache();

    return { eloUpdates };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du match:", error);
    throw error;
  }
}

// ============================
// 📊 HELPER FUNCTIONS
// ============================

export function onMatchUpdate(matchId: string, callback: (match: MatchWithBetting | null) => void): () => void {
  const matchRef = ref(database, `bettingMatches/${matchId}`);
  
  const unsubscribe = onValue(matchRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: matchId, ...snapshot.val() });
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

function haveSamePlayers(teamA: string[], teamB: string[]): boolean {
  if (!Array.isArray(teamA) || !Array.isArray(teamB)) return false;
  if (teamA.length !== teamB.length) return false;
  const setA = new Set(teamA);
  const setB = new Set(teamB);
  if (setA.size !== setB.size) return false;
  for (const id of setA) {
    if (!setB.has(id)) return false;
  }
  return true;
}

async function isSuspiciousMatch(
  team1: string[],
  team2: string[],
  score1: number,
  score2: number
): Promise<boolean> {
  try {
    const matchesRef = ref(database, "matches");
    const snapshot = await get(matchesRef);
    if (!snapshot.exists()) return false;

    const now = Date.now();
    const WINDOW_MS = 6 * 60 * 60 * 1000; // 6 heures
    let samePairCount = 0;

    snapshot.forEach((child) => {
      const m = child.val() as {
        team1?: string[];
        team2?: string[];
        timestamp?: number;
      };
      if (!m || !Array.isArray(m.team1) || !Array.isArray(m.team2) || !m.timestamp) {
        return;
      }
      if (now - m.timestamp > WINDOW_MS) {
        return;
      }

      const sameOrder =
        haveSamePlayers(m.team1, team1) && haveSamePlayers(m.team2, team2);
      const reversedOrder =
        haveSamePlayers(m.team1, team2) && haveSamePlayers(m.team2, team1);

      if (sameOrder || reversedOrder) {
        samePairCount++;
      }
    });

    const scoreDiff = Math.abs(score1 - score2);

    // Règles simples anti-farm :
    // - 5 matchs ou plus entre les mêmes joueurs sur 6h
    // - OU 3 matchs ou plus + gros écart de score
    if (samePairCount >= 5) return true;
    if (samePairCount >= 3 && scoreDiff >= 10) return true;

    return false;
  } catch (error) {
    console.error("Erreur détection match suspicieux:", error);
    return false;
  }
}

export async function getOpenMatches(): Promise<MatchWithBetting[]> {
  try {
    const matchesRef = ref(database, "bettingMatches");
    const snapshot = await get(matchesRef);
    
    if (!snapshot.exists()) return [];
    
    const matches: MatchWithBetting[] = [];
    snapshot.forEach((child) => {
      const match = { id: child.key!, ...child.val() } as MatchWithBetting;
      if (match.status === "open" || match.status === "playing") {
        matches.push(match);
      }
    });

    return matches.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs:", error);
    return [];
  }
}

// ✅ OPTIMISATION: Cache simple pour réduire les requêtes Firebase
const playerCache = new Map<string, { data: Array<{
  id: string;
  username: string;
  elo1v1: number;
  elo2v2: number;
  eloGlobal: number;
}>, timestamp: number }>();
const CACHE_TTL = 30000; // 30 secondes

export async function getAvailablePlayers(useCache = true): Promise<Array<{
  id: string;
  username: string;
  elo1v1: number;
  elo2v2: number;
  eloGlobal: number;
}>> {
  const cacheKey = 'all_players';
  const cached = playerCache.get(cacheKey);
  
  // ✅ Retourner le cache si valide
  if (useCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      // ✅ Même si vide, mettre en cache pour éviter les requêtes répétées
      const emptyResult: Array<{
        id: string;
        username: string;
        elo1v1: number;
        elo2v2: number;
        eloGlobal: number;
      }> = [];
      playerCache.set(cacheKey, { data: emptyResult, timestamp: Date.now() });
      return emptyResult;
    }
    
    const users = snapshot.val();
    const result = Object.entries(users).map(([id, data]: [string, any]) => ({
      id,
      username: data.username || "Unknown",
      elo1v1: data.elo1v1 || 1000,
      elo2v2: data.elo2v2 || 1000,
      eloGlobal: data.eloGlobal || 1000,
    }));
    
    // ✅ Mettre en cache
    playerCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Erreur lors de la récupération des joueurs:", error);
    // ✅ En cas d'erreur, retourner le cache si disponible
    if (cached) {
      return cached.data;
    }
    return [];
  }
}

// ✅ NOUVEAU: Fonction pour invalider le cache (appelée après un match)
export function invalidatePlayerCache(): void {
  playerCache.clear();
}

// ✅ NOUVEAU: Charger seulement les joueurs nécessaires (optimisation)
export async function getPlayersByIds(playerIds: string[]): Promise<Record<string, {
  id: string;
  username: string;
  elo1v1: number;
  elo2v2: number;
  eloGlobal: number;
  wins1v1?: number;
  losses1v1?: number;
  wins2v2?: number;
  losses2v2?: number;
  winsMixed?: number;
  lossesMixed?: number;
}>> {
  const players: Record<string, any> = {};
  
  // ✅ Charger en parallèle pour meilleure performance
  await Promise.all(
    playerIds.map(async (id) => {
      try {
        const userRef = ref(database, `users/${id}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          players[id] = {
            id,
            username: userData.username || "Unknown",
            elo1v1: userData.elo1v1 || 1000,
            elo2v2: userData.elo2v2 || 1000,
            eloGlobal: userData.eloGlobal || 1000,
            wins1v1: userData.wins1v1 || 0,
            losses1v1: userData.losses1v1 || 0,
            wins2v2: userData.wins2v2 || 0,
            losses2v2: userData.losses2v2 || 0,
            winsMixed: userData.winsMixed || 0,
            lossesMixed: userData.lossesMixed || 0,
          };
        }
      } catch (error) {
        console.error(`Erreur chargement joueur ${id}:`, error);
      }
    })
  );
  
  return players;
}
