// 🔥 src/lib/firebaseMatch.ts
// Système ELO Multi-Modes: 1v1, 2v2, et Global avec rangs

import { ref, set, remove, get, push, update, onDisconnect, onValue, runTransaction } from "firebase/database";
import { database } from "./firebase";

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
  return ELO_RANKS.find(rank => elo >= rank.minElo && elo <= rank.maxElo) || ELO_RANKS[0];
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
    const matchRef = ref(database, `bettingMatches/${matchId}`);
    const matchSnapshot = await get(matchRef);
    
    if (!matchSnapshot.exists()) {
      throw new Error("Match introuvable");
    }

    const match = matchSnapshot.val() as MatchWithBetting;
    
    if (match.status !== "open") {
      throw new Error("Les paris sont fermés pour ce match");
    }

    const userRef = ref(database, `users/${userId}`);
    
    await runTransaction(userRef, (userData) => {
      if (!userData) {
        throw new Error("Utilisateur introuvable");
      }

      const currentFortune = userData.fortune || 0;
      const oldBet = match.bets?.[userId];
      const availableFortune = oldBet ? currentFortune + oldBet.amount : currentFortune;

      if (availableFortune < amount) {
        throw new Error("Vous n'avez pas assez d'argent");
      }

      userData.fortune = availableFortune - amount;
      return userData;
    });

    const updates: { [path: string]: any } = {};
    
    updates[`bettingMatches/${matchId}/bets/${userId}`] = {
      userId,
      username,
      amount,
      teamBet,
      timestamp: Date.now(),
    };

    let newTotal1 = match.totalBetsTeam1 || 0;
    let newTotal2 = match.totalBetsTeam2 || 0;

    const oldBet = match.bets?.[userId];
    if (oldBet) {
      if (oldBet.teamBet === 1) newTotal1 -= oldBet.amount;
      else newTotal2 -= oldBet.amount;
    }

    if (teamBet === 1) newTotal1 += amount;
    else newTotal2 += amount;

    updates[`bettingMatches/${matchId}/totalBetsTeam1`] = newTotal1;
    updates[`bettingMatches/${matchId}/totalBetsTeam2`] = newTotal2;

    await update(ref(database), updates);
  } catch (error) {
    console.error("Erreur lors du placement du pari:", error);
    throw error;
  }
}

export async function startMatch(matchId: string): Promise<void> {
  try {
    const updates: { [path: string]: any } = {};
    updates[`bettingMatches/${matchId}/status`] = "playing";
    updates[`bettingMatches/${matchId}/startedAt`] = Date.now();
    await update(ref(database), updates);
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
  const kFactor = getKFactor(playerElo);
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = won ? 1 : 0;
  const eloChange = Math.round(kFactor * (actualScore - expectedScore));
  return playerElo + eloChange;
}

export async function finishMatch(
  matchId: string,
  score1: number,
  score2: number
): Promise<{ eloUpdates: EloUpdate[]; winnings: { [userId: string]: number } }> {
  try {
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

    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      throw new Error("Aucun utilisateur trouvé");
    }

    const users = usersSnapshot.val();
    const matchType = match.matchType;
    
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
    
    const team1Players = match.team1.map(id => ({
      id,
      username: users[id]?.username || "Unknown",
      eloRating: getPlayerElo(id),
      wins: users[id]?.[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      losses: users[id]?.[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
    }));

    const team2Players = match.team2.map(id => ({
      id,
      username: users[id]?.username || "Unknown",
      eloRating: getPlayerElo(id),
      wins: users[id]?.[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      losses: users[id]?.[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
    }));

    const team1AvgElo = team1Players.reduce((sum, p) => sum + p.eloRating, 0) / team1Players.length;
    const team2AvgElo = team2Players.reduce((sum, p) => sum + p.eloRating, 0) / team2Players.length;
    const team1Won = score1 > score2;
    
    const eloUpdates: EloUpdate[] = [];
    const updates: { [path: string]: any } = {};

    // Mettre à jour les ELO spécifiques + global
    const updatePlayerElo = (player: any, opponentAvgElo: number, won: boolean) => {
      const newElo = calculateNewElo(player.eloRating, opponentAvgElo, won);
      const eloChange = newElo - player.eloRating;
      
      // Mise à jour ELO spécifique
      const eloField = matchType === "1v1" ? "elo1v1" : matchType === "2v2" ? "elo2v2" : "eloGlobal";
      updates[`users/${player.id}/${eloField}`] = newElo;
      
      // Mise à jour ELO global (moyenne pondérée)
      const user = users[player.id];
      const elo1v1 = matchType === "1v1" ? newElo : (user?.elo1v1 || 1000);
      const elo2v2 = matchType === "2v2" ? newElo : (user?.elo2v2 || 1000);
      const eloMixed = matchType === "mixed" ? newElo : (user?.eloGlobal || 1000);
      
      const newGlobalElo = Math.round((elo1v1 + elo2v2 + eloMixed) / 3);
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

    if (match.bets && winningPot > 0) {
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
            
            updates[`users/${bet.userId}/fortune`] = currentFortune + winnings[bet.userId];
            updates[`users/${bet.userId}/bettingGains`] = currentBettingGains + netProfit;
            updates[`users/${bet.userId}/totalEarned`] = (userData.totalEarned || 0) + netProfit;
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
    };

    updates[`bettingMatches/${matchId}/status`] = "finished";
    updates[`bettingMatches/${matchId}/score1`] = score1;
    updates[`bettingMatches/${matchId}/score2`] = score2;
    updates[`bettingMatches/${matchId}/finishedAt`] = Date.now();

    await update(ref(database), updates);

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
    if (score1 === score2) {
      throw new Error("Le score ne peut pas être égal");
    }

    const duplicates = team1PlayerIds.filter(id => team2PlayerIds.includes(id));
    if (duplicates.length > 0) {
      throw new Error("Un joueur ne peut pas être dans les deux équipes");
    }

    const matchType = determineMatchType(team1PlayerIds.length, team2PlayerIds.length);

    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      throw new Error("Aucun utilisateur trouvé");
    }

    const users = usersSnapshot.val();
    
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
    
    const team1Players = team1PlayerIds.map(id => ({
      id,
      username: users[id]?.username || "Unknown",
      eloRating: getPlayerElo(id),
      wins: users[id]?.[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      losses: users[id]?.[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
    }));

    const team2Players = team2PlayerIds.map(id => ({
      id,
      username: users[id]?.username || "Unknown",
      eloRating: getPlayerElo(id),
      wins: users[id]?.[`wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
      losses: users[id]?.[`losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`] || 0,
    }));

    const team1AvgElo = team1Players.reduce((sum, p) => sum + p.eloRating, 0) / team1Players.length;
    const team2AvgElo = team2Players.reduce((sum, p) => sum + p.eloRating, 0) / team2Players.length;
    const team1Won = score1 > score2;
    
    const eloUpdates: EloUpdate[] = [];
    const updates: { [path: string]: any } = {};

    const updatePlayerElo = (player: any, opponentAvgElo: number, won: boolean) => {
      const newElo = calculateNewElo(player.eloRating, opponentAvgElo, won);
      const eloChange = newElo - player.eloRating;
      
      const eloField = matchType === "1v1" ? "elo1v1" : matchType === "2v2" ? "elo2v2" : "eloGlobal";
      updates[`users/${player.id}/${eloField}`] = newElo;
      
      const user = users[player.id];
      const elo1v1 = matchType === "1v1" ? newElo : (user?.elo1v1 || 1000);
      const elo2v2 = matchType === "2v2" ? newElo : (user?.elo2v2 || 1000);
      const eloMixed = matchType === "mixed" ? newElo : (user?.eloGlobal || 1000);
      
      const newGlobalElo = Math.round((elo1v1 + elo2v2 + eloMixed) / 3);
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
    };

    updates[`matches/${newMatchRef.key}`] = matchData;

    await update(ref(database), updates);

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

export async function getAvailablePlayers(): Promise<Array<{
  id: string;
  username: string;
  elo1v1: number;
  elo2v2: number;
  eloGlobal: number;
}>> {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return [];
    
    const users = snapshot.val();
    return Object.entries(users).map(([id, data]: [string, any]) => ({
      id,
      username: data.username || "Unknown",
      elo1v1: data.elo1v1 || 1000,
      elo2v2: data.elo2v2 || 1000,
      eloGlobal: data.eloGlobal || 1000,
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des joueurs:", error);
    return [];
  }
}
