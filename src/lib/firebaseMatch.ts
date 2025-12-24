// 🔥 src/lib/firebaseMatch.ts
// Système ELO Multi-Modes: 1v1, 2v2, et Global avec rangs

import { ref, set, remove, get, push, update, onDisconnect, onValue, runTransaction } from "firebase/database";
import { database } from "./firebase";
import { addFortuneHistoryEntry } from "./firebaseExtended";
import { logger } from "@/utils/logger";
import { applyXPBonus, applyFortuneBonus, getClubBonuses } from "./clubBonusSystem";
import { optimizeMatchData, optimizeBetData, MATCH_TYPE_ENUM } from "./dbOptimization";

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
    logger.error("Erreur lors de l'ajout à la queue:", error);
    throw new Error("Impossible de rejoindre la file d'attente");
  }
}

export async function leaveMatchQueue(userId: string): Promise<void> {
  try {
    const queueRef = ref(database, `matchQueue/${userId}`);
    await remove(queueRef);
  } catch (error) {
    logger.error("Erreur lors du retrait de la queue:", error);
    throw new Error("Impossible de quitter la file d'attente");
  }
}

export async function isPlayerInQueue(userId: string): Promise<boolean> {
  try {
    const queueRef = ref(database, `matchQueue/${userId}`);
    const snapshot = await get(queueRef);
    return snapshot.exists();
  } catch (error) {
    logger.error("Erreur lors de la vérification de la queue:", error);
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
    const rawUsers = usersSnapshot.val();

    // Déoptimiser les données utilisateur pour accéder au username
    const users: Record<string, any> = {};
    Object.keys(rawUsers).forEach(userId => {
      users[userId] = deoptimizeUserData(rawUsers[userId]);
    });
    
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
    logger.error("Erreur lors de la création du match:", error);
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
  logger.log(`📌 [PARI] Début placeBet - User: ${username}, Match: ${matchId}, Montant: ${amount}€, Équipe: ${teamBet}`);
  
  try {
    // ✅ VALIDATION ANTI-TRICHE
    if (!matchId || !userId || !username) {
      throw new Error("Paramètres invalides");
    }
    
    if (amount <= 0 || amount > 10000) {
      throw new Error("Le montant doit être entre 1€ et 10000€");
    }
    
    if (teamBet !== 1 && teamBet !== 2) {
      throw new Error("Équipe invalide");
    }

    // ✅ CHARGER LES DONNÉES EN AMONT pour éviter les erreurs de transaction
    const matchRef = ref(database, `bettingMatches/${matchId}`);
    const userRef = ref(database, `users/${userId}`);

    logger.log(`🔍 [PARI] Chargement des données...`);
    const [matchSnapshot, userSnapshot] = await Promise.all([
      get(matchRef),
      get(userRef)
    ]);
    
    if (!matchSnapshot.exists()) {
      throw new Error("Match introuvable");
    }
    
    if (!userSnapshot.exists()) {
      throw new Error("Utilisateur introuvable");
    }

    const match = matchSnapshot.val() as MatchWithBetting;
    const userData = userSnapshot.val();

    logger.log(`✅ [PARI] Données chargées - Match status: ${match.status}, User fortune: ${userData.fortune}€`);
    
    if (match.status !== "open") {
      throw new Error("Les paris sont fermés pour ce match");
    }
    
    // ✅ Empêcher de parier sur un match où l'on joue
    const isPlayerInMatch =
      (Array.isArray(match.team1) && match.team1.includes(userId)) ||
      (Array.isArray(match.team2) && match.team2.includes(userId));
    if (isPlayerInMatch) {
      throw new Error("Vous ne pouvez pas parier sur un match où vous jouez");
    }

    if (userData.banned === true) {
      throw new Error("Compte banni");
    }

    const beforeFortune = userData.fortune || 0;
    const oldBet = match.bets?.[userId];
    const availableFortune = oldBet ? beforeFortune + oldBet.amount : beforeFortune;

    logger.log(`💰 [PARI] Fortune avant: ${beforeFortune}€, Disponible: ${availableFortune}€`);

    if (availableFortune < amount) {
      throw new Error(`Vous n'avez pas assez d'argent (${availableFortune}€ disponibles)`);
    }
    
    if (beforeFortune < 0 || beforeFortune > 1000000) {
      throw new Error("Fortune invalide");
    }

    // ✅ CALCUL DES NOUVELLES VALEURS
    const newFortune = availableFortune - amount;
    
    let newTotal1 = match.totalBetsTeam1 || 0;
    let newTotal2 = match.totalBetsTeam2 || 0;
    
    // Retirer l'ancien pari s'il existe
    if (oldBet) {
      if (oldBet.teamBet === 1) {
        newTotal1 -= oldBet.amount;
      } else {
        newTotal2 -= oldBet.amount;
      }
      logger.log(`🔄 [PARI] Ancien pari trouvé: ${oldBet.amount}€ sur équipe ${oldBet.teamBet}`);
    }
    
    // Ajouter le nouveau pari
    if (teamBet === 1) {
      newTotal1 += amount;
    } else {
      newTotal2 += amount;
    }

    logger.log(`📊 [PARI] Nouveaux totaux - Équipe 1: ${newTotal1}€, Équipe 2: ${newTotal2}€`);

    // ✅ MISE À JOUR ATOMIQUE AVEC update() au lieu de transactions séparées
    const updates: { [path: string]: any } = {};
    
    // Mise à jour de la fortune
    updates[`users/${userId}/fortune`] = newFortune;
    
    // Mise à jour du pari
    updates[`bettingMatches/${matchId}/bets/${userId}`] = {
      userId,
      username,
      amount,
      teamBet,
      timestamp: Date.now(),
    };
    
    // Mise à jour des totaux
    updates[`bettingMatches/${matchId}/totalBetsTeam1`] = newTotal1;
    updates[`bettingMatches/${matchId}/totalBetsTeam2`] = newTotal2;

    logger.log(`💾 [PARI] Application des mises à jour atomiques...`);
    await update(ref(database), updates);

    logger.log(`✅ [PARI] Fortune après déduction: ${newFortune}€`);

    // ✅ Historique de fortune
    const delta = newFortune - beforeFortune;
    if (delta !== 0) {
      const reason = `Pari sur match: ${match.team1Names?.join(" & ") ?? "Équipe 1"} vs ${match.team2Names?.join(" & ") ?? "Équipe 2"}`;
      await addFortuneHistoryEntry(userId, newFortune, delta, reason);
      logger.log(`📝 [PARI] Historique ajouté: ${delta}€`);
    }

    logger.log(`✅ [PARI] Pari placé avec succès!`);
  } catch (error) {
    logger.error(`❌ [PARI] Erreur:`, error);
    throw error;
  }
}


export async function startMatch(matchId: string): Promise<void> {
  logger.log(`🎬 [START MATCH] Début startMatch - Match: ${matchId}`);

  try {
    const matchRef = ref(database, `bettingMatches/${matchId}`);

    // ✅ AMÉLIORATION: Charger les données en amont comme pour placeBet
    logger.log(`🔍 [START MATCH] Chargement des données du match...`);
    const matchSnapshot = await get(matchRef);
    
    if (!matchSnapshot.exists()) {
      throw new Error("Match introuvable");
    }
    
    const match = matchSnapshot.val() as MatchWithBetting;
    logger.log(`✅ [START MATCH] Match chargé - Status: ${match.status}`);
    
    if (match.status !== "open") {
      throw new Error("Le match n'est pas en attente de démarrage");
    }
    
    // ✅ Mise à jour atomique
    const updates: { [path: string]: any } = {};
    updates[`bettingMatches/${matchId}/status`] = "playing";
    updates[`bettingMatches/${matchId}/startedAt`] = Date.now();

    logger.log(`💾 [START MATCH] Application de la mise à jour...`);
    await update(ref(database), updates);

    logger.log(`✅ [START MATCH] Match démarré avec succès!`);
  } catch (error) {
    logger.error("❌ [START MATCH] Erreur:", error);
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
  logger.log(`🏁 [FIN MATCH] Début finishMatch - Match: ${matchId}, Score: ${score1}-${score2}`);
  
  try {
    // ✅ VALIDATION
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

    logger.log(`📊 [FIN MATCH] Total paris - Équipe 1: ${match.totalBetsTeam1}€, Équipe 2: ${match.totalBetsTeam2}€`);
    logger.log(`📊 [FIN MATCH] Nombre de parieurs: ${Object.keys(match.bets || {}).length}`);

    const suspicious = await isSuspiciousMatch(match.team1, match.team2, score1, score2);

    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      throw new Error("Aucun utilisateur trouvé");
    }

    const matchType = match.matchType;
    const allPlayerIds = [...match.team1, ...match.team2];
    const playersById = await getPlayersByIds(allPlayerIds);
    
    const missingPlayers = allPlayerIds.filter(id => !playersById[id]);
    if (missingPlayers.length > 0) {
      throw new Error(`Joueur(s) introuvable(s): ${missingPlayers.join(", ")}`);
    }
    
    const users = playersById;
    
    // === CALCUL ELO (inchangé) ===
    const getPlayerElo = (userId: string): number => {
      const user = users[userId];
      if (!user) return 1000;
      switch (matchType) {
        case "1v1": return user.elo1v1 || 1000;
        case "2v2": return user.elo2v2 || 1000;
        case "mixed": return user.eloGlobal || 1000;
      }
    };
    
    const team1Players = match.team1.map(id => {
      const user = users[id];
      if (!user) throw new Error(`Joueur ${id} introuvable`);
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
      if (!user) throw new Error(`Joueur ${id} introuvable`);
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

    const updatePlayerElo = async (player: { id: string; username: string; eloRating: number; wins: number; losses: number }, opponentAvgElo: number, won: boolean) => {
      if (suspicious) return;

      let newElo = calculateNewElo(player.eloRating, opponentAvgElo, won);
      const baseEloChange = newElo - player.eloRating;

      // ✅ BONUS CLUB: Appliquer le bonus XP (ELO)
      const clubBonuses = await getClubBonuses(player.id);
      if (clubBonuses.xpBoost && won) {
        newElo = applyXPBonus(newElo, player.eloRating);
        logger.log(`🎯 [Bonus Club] ${player.username}: ELO ${player.eloRating} → ${newElo} (avec bonus +20%)`);
      }

      const eloChange = newElo - player.eloRating;
      const eloField = matchType === "1v1" ? "elo1v1" : matchType === "2v2" ? "elo2v2" : "eloGlobal";
      updates[`users/${player.id}/${eloField}`] = newElo;
      
      const user = users[player.id];
      if (!user) throw new Error(`Utilisateur ${player.id} introuvable`);
      
      const elo1v1 = matchType === "1v1" ? newElo : (user.elo1v1 || 1000);
      const elo2v2 = matchType === "2v2" ? newElo : (user.elo2v2 || 1000);
      const eloMixed = matchType === "mixed" ? newElo : (user.eloGlobal || 1000);
      
      const elosToAverage: number[] = [];
      if (matchType === "1v1" || user.elo1v1 !== undefined) elosToAverage.push(elo1v1);
      if (matchType === "2v2" || user.elo2v2 !== undefined) elosToAverage.push(elo2v2);
      if (matchType === "mixed" || user.eloGlobal !== undefined) elosToAverage.push(eloMixed);
      
      const newGlobalElo = elosToAverage.length > 0 
        ? Math.round(elosToAverage.reduce((sum, elo) => sum + elo, 0) / elosToAverage.length)
        : 1000;
      
      updates[`users/${player.id}/eloGlobal`] = newGlobalElo;
      
      const winsField = `wins${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`;
      const lossesField = `losses${matchType === "1v1" ? "1v1" : matchType === "2v2" ? "2v2" : "Mixed"}`;

      updates[`users/${player.id}/${winsField}`] = won ? player.wins + 1 : player.wins;
      updates[`users/${player.id}/${lossesField}`] = won ? player.losses : player.losses + 1;

      // ✅ TRACKING: WinStreak (série de victoires) pour badge "Tueur de Gamelles"
      const currentWinStreak = user.winStreak || 0;
      if (won) {
        updates[`users/${player.id}/winStreak`] = currentWinStreak + 1;
      } else {
        updates[`users/${player.id}/winStreak`] = 0; // Reset si perte
      }

      // ✅ TRACKING: Thursday wins pour badge "Roi du Jeudi"
      const today = new Date();
      const isThursday = today.getDay() === 4; // 4 = jeudi
      if (won && isThursday) {
        const currentThursdayWins = user.thursdayWins || 0;
        updates[`users/${player.id}/thursdayWins`] = currentThursdayWins + 1;
      }

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

    // ✅ Application asynchrone des bonus club
    await Promise.all([
      ...team1Players.map(player => updatePlayerElo(player, team2AvgElo, team1Won)),
      ...team2Players.map(player => updatePlayerElo(player, team1AvgElo, !team1Won))
    ]);

    // ============================================
    // 🎯 DISTRIBUTION DES GAINS AVEC MINIMUM 1.10x
    // ============================================
    const winningTeam = team1Won ? 1 : 2;
    const totalPot = match.totalBetsTeam1 + match.totalBetsTeam2;
    const winningPot = winningTeam === 1 ? match.totalBetsTeam1 : match.totalBetsTeam2;
    const losingPot = winningTeam === 1 ? match.totalBetsTeam2 : match.totalBetsTeam1;
    
    const winnings: { [userId: string]: number } = {};
    const historyPromises: Promise<void>[] = [];

    logger.log(`🏆 [FIN MATCH] Équipe gagnante: ${winningTeam}`);
    logger.log(`💰 [FIN MATCH] Pot gagnant: ${winningPot}€, Pot perdant: ${losingPot}€, Total: ${totalPot}€`);

    if (match.bets && Object.keys(match.bets).length > 0) {
      // ✅ Traiter TOUS les parieurs (gagnants ET perdants)
      for (const [betUserId, bet] of Object.entries(match.bets)) {
        logger.log(`👤 [FIN MATCH] Traitement pari de ${bet.username}: ${bet.amount}€ sur équipe ${bet.teamBet}`);
        
        if (bet.teamBet === winningTeam) {
          // ✅ GAGNANT - APPLICATION DU MINIMUM 1.10x
          if (winningPot > 0) {
            // 🎯 CALCUL DE LA COTE AVEC MINIMUM GARANTI
            const rawOdds = totalPot / winningPot;
            const finalOdds = Math.max(rawOdds, 1.10); // ⭐ MINIMUM 1.10x APPLIQUÉ ICI
            const totalWinning = Math.round(bet.amount * finalOdds);
            
            winnings[betUserId] = totalWinning;
            const netProfit = totalWinning - bet.amount;

            logger.log(`✅ [FIN MATCH] ${bet.username} GAGNE ${totalWinning}€ (mise: ${bet.amount}€, profit: ${netProfit}€, cote: ${finalOdds.toFixed(2)}x)`);
            
            const userRef = ref(database, `users/${betUserId}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              const currentFortune = userData.fortune || 0;
              const currentBettingGains = userData.bettingGains || 0;

              // ✅ BONUS CLUB: Appliquer le bonus Fortune (+15%)
              const clubBonuses = await getClubBonuses(betUserId);
              let finalWinning = totalWinning;
              if (clubBonuses.fortuneBoost) {
                finalWinning = applyFortuneBonus(totalWinning);
                logger.log(`💰 [Bonus Club] ${bet.username}: Gain ${totalWinning}€ → ${finalWinning}€ (avec bonus +15%)`);
              }

              const newFortune = currentFortune + finalWinning;
              const finalProfit = finalWinning - bet.amount;

              updates[`users/${betUserId}/fortune`] = newFortune;
              updates[`users/${betUserId}/bettingGains`] = currentBettingGains + finalProfit;
              updates[`users/${betUserId}/totalEarned`] = (userData.totalEarned || 0) + finalProfit;

              // ✅ TRACKING: betWins pour badge "Parieur Fou"
              const currentBetWins = userData.betWins || 0;
              updates[`users/${betUserId}/betWins`] = currentBetWins + 1;

              historyPromises.push(
                addFortuneHistoryEntry(
                  betUserId,
                  newFortune,
                  finalWinning,
                  `Gain pari: ${match.team1Names?.join(" & ") ?? "Équipe 1"} vs ${match.team2Names?.join(" & ") ?? "Équipe 2"}`
                )
              );
            }
          } else {
            // ✅ CAS LIMITE: Remboursement si personne n'a parié sur l'équipe gagnante
            winnings[betUserId] = bet.amount;

            logger.log(`🔄 [FIN MATCH] ${bet.username} REMBOURSÉ ${bet.amount}€ (aucun pari sur équipe gagnante)`);
            
            const userRef = ref(database, `users/${betUserId}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              const currentFortune = userData.fortune || 0;
              const newFortune = currentFortune + bet.amount;
              
              updates[`users/${betUserId}/fortune`] = newFortune;

              historyPromises.push(
                addFortuneHistoryEntry(
                  betUserId,
                  newFortune,
                  bet.amount,
                  `Remboursement pari: ${match.team1Names?.join(" & ") ?? "Équipe 1"} vs ${match.team2Names?.join(" & ") ?? "Équipe 2"}`
                )
              );
            }
          }
        } else {
          // ✅ PERDANT - TRACER EXPLICITEMENT LA PERTE
          winnings[betUserId] = -bet.amount;

          logger.log(`❌ [FIN MATCH] ${bet.username} PERD ${bet.amount}€`);
          
          const userRef = ref(database, `users/${betUserId}`);
          const userSnapshot = await get(userRef);
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            const currentFortune = userData.fortune || 0;
            const currentBettingGains = userData.bettingGains || 0;
            
            // ✅ Décrémenter les gains de paris (pertes comptent négativement)
            updates[`users/${betUserId}/bettingGains`] = currentBettingGains - bet.amount;

            // ✅ Historique explicite de la perte (fortune reste inchangée car déjà déduite)
            historyPromises.push(
              addFortuneHistoryEntry(
                betUserId,
                currentFortune,
                0, // Delta = 0 car l'argent a déjà été déduit au moment du pari
                `Perte pari: ${match.team1Names?.join(" & ") ?? "Équipe 1"} vs ${match.team2Names?.join(" & ") ?? "Équipe 2"} (-${bet.amount}€)`
              )
            );
          }
        }
      }
    }

    logger.log(`📊 [FIN MATCH] Résumé des gains:`, winnings);

    // Enregistrer dans l'historique
    const recentMatchesRef = ref(database, "matches");
    const newRecentMatchRef = push(recentMatchesRef);

    // ✅ OPTIMISÉ: Structure compactée (sans team1Names/team2Names, clés abrégées, timestamp en secondes)
    const matchDataOptimized = optimizeMatchData({
      team1: match.team1,
      team2: match.team2,
      matchType,
      score1,
      score2,
      timestamp: Date.now(),
      recordedBy: match.createdBy,
      fromBetting: true,
      suspicious,
    });

    updates[`matches/${newRecentMatchRef.key}`] = matchDataOptimized;

    updates[`bettingMatches/${matchId}/status`] = "finished";
    updates[`bettingMatches/${matchId}/score1`] = score1;
    updates[`bettingMatches/${matchId}/score2`] = score2;
    updates[`bettingMatches/${matchId}/finishedAt`] = Date.now();

    await update(ref(database), updates);
    await Promise.all(historyPromises);

    invalidatePlayerCache();

    // ✅ ACHIEVEMENTS: Vérifier les achievements automatiquement pour tous les joueurs
    const { checkAchievements } = await import("./firebaseExtended");
    const matchPlayers = [...match.team1, ...match.team2];
    await Promise.all(
      matchPlayers.map(async (playerId) => {
        try {
          await checkAchievements(playerId);
        } catch (error) {
          logger.error(`Erreur vérification achievements pour ${playerId}:`, error);
        }
      })
    );

    logger.log(`✅ [FIN MATCH] Match terminé avec succès!`);

    return { eloUpdates, winnings };
  } catch (error) {
    logger.error("❌ [FIN MATCH] Erreur:", error);
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

    const updatePlayerElo = async (player: { id: string; username: string; eloRating: number; wins: number; losses: number }, opponentAvgElo: number, won: boolean) => {
      // Si le match est suspect, on enregistre le match mais on ne met pas à jour l'ELO
      if (suspicious) {
        return;
      }
      let newElo = calculateNewElo(player.eloRating, opponentAvgElo, won);
      const baseEloChange = newElo - player.eloRating;

      // ✅ BONUS CLUB: Appliquer le bonus XP (ELO)
      const clubBonuses = await getClubBonuses(player.id);
      if (clubBonuses.xpBoost && won) {
        newElo = applyXPBonus(newElo, player.eloRating);
        logger.log(`🎯 [Bonus Club] ${player.username}: ELO ${player.eloRating} → ${newElo} (avec bonus +20%)`);
      }

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

      // ✅ TRACKING: WinStreak (série de victoires) pour badge "Tueur de Gamelles"
      const currentWinStreak = user.winStreak || 0;
      if (won) {
        updates[`users/${player.id}/winStreak`] = currentWinStreak + 1;
      } else {
        updates[`users/${player.id}/winStreak`] = 0; // Reset si perte
      }

      // ✅ TRACKING: Thursday wins pour badge "Roi du Jeudi"
      const today = new Date();
      const isThursday = today.getDay() === 4; // 4 = jeudi
      if (won && isThursday) {
        const currentThursdayWins = user.thursdayWins || 0;
        updates[`users/${player.id}/thursdayWins`] = currentThursdayWins + 1;
      }

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

    // ✅ Application asynchrone des bonus club
    await Promise.all([
      ...team1Players.map(player => updatePlayerElo(player, team2AvgElo, team1Won)),
      ...team2Players.map(player => updatePlayerElo(player, team1AvgElo, !team1Won))
    ]);

    const matchesRef = ref(database, "matches");
    const newMatchRef = push(matchesRef);

    // ✅ OPTIMISÉ: Structure compactée (sans team1Names/team2Names, clés abrégées, timestamp en secondes)
    const matchData = optimizeMatchData({
      team1: team1PlayerIds,
      team2: team2PlayerIds,
      matchType,
      score1,
      score2,
      timestamp: Date.now(),
      recordedBy,
      suspicious,
      fromBetting: false,
    });

    updates[`matches/${newMatchRef.key}`] = matchData;

    await update(ref(database), updates);

    // ✅ OPTIMISATION: Invalider le cache après un match pour refléter les nouveaux ELO
    invalidatePlayerCache();

    // ✅ ACHIEVEMENTS: Vérifier les achievements automatiquement pour tous les joueurs
    // (réutilise allPlayerIds défini ligne 869)
    const { checkAchievements } = await import("./firebaseExtended");
    await Promise.all(
      allPlayerIds.map(async (playerId) => {
        try {
          await checkAchievements(playerId);
        } catch (error) {
          logger.error(`Erreur vérification achievements pour ${playerId}:`, error);
        }
      })
    );

    // ✅ QUÊTES: Mettre à jour la progression des quêtes pour tous les joueurs
    const { updateQuestProgress } = await import("./questSystem");
    await Promise.all(
      allPlayerIds.map(async (playerId) => {
        try {
          // Quête: "Jouer X matchs"
          await updateQuestProgress(playerId, 'match', 1);

          // Quête: "Gagner X matchs 1v1" ou "Gagner X matchs 2v2"
          const won = (team1Won && team1PlayerIds.includes(playerId)) ||
                      (!team1Won && team2PlayerIds.includes(playerId));

          if (won) {
            // Mettre à jour la quête spécifique au mode
            if (matchType === '1v1') {
              await updateQuestProgress(playerId, 'win_1v1', 1);
            } else if (matchType === '2v2') {
              await updateQuestProgress(playerId, 'win_2v2', 1);
            }
            // Aussi mettre à jour la quête générale "Gagner X matchs"
            await updateQuestProgress(playerId, 'win_any', 1);
          }
        } catch (error) {
          logger.error(`Erreur mise à jour quêtes pour ${playerId}:`, error);
        }
      })
    );

    // 🔥 Mettre à jour les rivalités pour les matchs 1v1
    if (matchType === '1v1') {
      try {
        const { updateRivalry, notifyRivalryMilestone } = await import('./rivalrySystem');
        await updateRivalry(
          team1PlayerIds[0],
          team2PlayerIds[0],
          users[team1PlayerIds[0]].username,
          users[team2PlayerIds[0]].username,
          team1Won
        );

        // Vérifier les milestones de rivalité
        const { getRivalryBetween } = await import('./rivalrySystem');
        const rivalry = await getRivalryBetween(team1PlayerIds[0], team2PlayerIds[0]);

        if (rivalry) {
          // Notifier pour les milestones (10, 20, 50 matchs)
          if ([10, 20, 50].includes(rivalry.totalMatches)) {
            const milestone = rivalry.intensity === 'legendary' ? 'LÉGENDAIRE' :
                            rivalry.intensity === 'heated' ? 'INTENSE' : 'CASUAL';

            await notifyRivalryMilestone(
              team1PlayerIds[0],
              users[team2PlayerIds[0]].username,
              milestone,
              rivalry.totalMatches
            );

            await notifyRivalryMilestone(
              team2PlayerIds[0],
              users[team1PlayerIds[0]].username,
              milestone,
              rivalry.totalMatches
            );
          }
        }
      } catch (error) {
        logger.error("Erreur mise à jour rivalité:", error);
      }
    }

    return { eloUpdates };
  } catch (error) {
    logger.error("Erreur lors de l'enregistrement du match:", error);
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
    logger.error("Erreur détection match suspicieux:", error);
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
    logger.error("Erreur lors de la récupération des matchs:", error);
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
    const result = Object.entries(users).map(([id, data]: [string, any]) => {
      // Déoptimiser les données utilisateur
      const deoptimizedData = deoptimizeUserData(data);
      return {
        id,
        username: deoptimizedData.username || "Unknown",
        elo1v1: deoptimizedData.elo1v1 || 1000,
        elo2v2: deoptimizedData.elo2v2 || 1000,
        eloGlobal: deoptimizedData.eloGlobal || 1000,
      };
    });
    
    // ✅ Mettre en cache
    playerCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    logger.error("Erreur lors de la récupération des joueurs:", error);
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
          const rawUserData = snapshot.val();
          const userData = deoptimizeUserData(rawUserData);
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
        logger.error(`Erreur chargement joueur ${id}:`, error);
      }
    })
  );
  
  return players;
}
