// 📁 src/lib/firebaseSync.ts
// ============================
// Fonctions pour synchroniser les données depuis Firebase

import { ref, get, query, orderByChild, limitToLast, onValue } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";

export interface Player {
  id: string;
  username: string;
  eloRating: number;
  wins: number;
  losses: number;
  avatar?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  team1: string[];
  team2: string[];
  score1: number;
  score2: number;
  date: string;
  timestamp: number;
}

export interface QueuedPlayer {
  id: string;
  username: string;
  eloRating: number;
}

// ============================
// 🏆 LEADERBOARD FUNCTIONS
// ============================

export async function getLeaderboardPlayers(): Promise<Player[]> {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return [];
    
    const players: Player[] = [];
    snapshot.forEach((child) => {
      players.push({
        id: child.key!,
        ...(child.val() as Omit<Player, "id">),
      });
    });

    // Trier par ELO (descendant)
    return players.sort((a, b) => b.eloRating - a.eloRating);
  } catch (error) {
    logger.error("Erreur chargement leaderboard:", error);
    return [];
  }
}

export function onLeaderboardUpdate(callback: (players: Player[]) => void): () => void {
  const usersRef = ref(database, "users");
  
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const players: Player[] = [];
    snapshot.forEach((child) => {
      players.push({
        id: child.key!,
        ...(child.val() as Omit<Player, "id">),
      });
    });
    // Trier et retourner
    callback(players.sort((a, b) => b.eloRating - a.eloRating));
  });

  return unsubscribe;
}

// ============================
// 🎮 MATCH FUNCTIONS
// ============================

export async function getRecentMatches(limit: number = 10): Promise<Match[]> {
  try {
    const matchesRef = ref(database, "matches");
    const snapshot = await get(matchesRef);
    
    if (!snapshot.exists()) return [];
    
    const matches: Match[] = [];
    snapshot.forEach((child) => {
      matches.push({
        id: child.key!,
        ...(child.val() as Omit<Match, "id">),
      });
    });

    // Trier par timestamp (descendant) et limiter
    return matches
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
  } catch (error) {
    logger.error("Erreur chargement matchs:", error);
    return [];
  }
}

export function onRecentMatchesUpdate(callback: (matches: Match[]) => void, limit: number = 10): () => void {
  const matchesRef = ref(database, "matches");
  
  const unsubscribe = onValue(matchesRef, (snapshot) => {
    const matches: Match[] = [];
    snapshot.forEach((child) => {
      matches.push({
        id: child.key!,
        ...(child.val() as Omit<Match, "id">),
      });
    });
    // Trier et retourner
    callback(matches
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit)
    );
  });

  return unsubscribe;
}

// ============================
// 📊 QUEUE FUNCTIONS
// ============================

export async function getQueuedPlayers(): Promise<QueuedPlayer[]> {
  try {
    const queueRef = ref(database, "matchQueue");
    const snapshot = await get(queueRef);
    
    if (!snapshot.exists()) return [];
    
    const players: QueuedPlayer[] = [];
    snapshot.forEach((child) => {
      players.push({
        id: child.key!,
        ...(child.val() as Omit<QueuedPlayer, "id">),
      });
    });

    return players;
  } catch (error) {
    logger.error("Erreur chargement queue:", error);
    return [];
  }
}

export function onQueueUpdate(callback: (players: QueuedPlayer[]) => void): () => void {
  const queueRef = ref(database, "matchQueue");
  
  const unsubscribe = onValue(queueRef, (snapshot) => {
    const players: QueuedPlayer[] = [];
    snapshot.forEach((child) => {
      players.push({
        id: child.key!,
        ...(child.val() as Omit<QueuedPlayer, "id">),
      });
    });
    callback(players);
  });

  return unsubscribe;
}

// ============================
// 📈 STATS FUNCTIONS
// ============================

export async function getAppStats(): Promise<{
  totalPlayers: number;
  averageElo: number;
  totalMatches: number;
}> {
  try {
    const usersSnapshot = await get(ref(database, "users"));
    const matchesSnapshot = await get(ref(database, "matches"));

    const players: any[] = [];
    usersSnapshot.forEach((child) => {
      players.push(child.val());
    });

    const totalPlayers = players.length;
    const averageElo = players.length > 0
      ? Math.round(players.reduce((sum, p) => sum + (p.eloRating || 1000), 0) / players.length)
      : 0;
    const totalMatches = matchesSnapshot.size;

    return {
      totalPlayers,
      averageElo,
      totalMatches,
    };
  } catch (error) {
    logger.error("Erreur chargement stats:", error);
    return {
      totalPlayers: 0,
      averageElo: 0,
      totalMatches: 0,
    };
  }
}

export function onAppStatsUpdate(callback: (stats: any) => void): () => void {
  let playersUnsubscribe: (() => void) | null = null;
  let matchesUnsubscribe: (() => void) | null = null;

  const updateStats = async () => {
    const stats = await getAppStats();
    callback(stats);
  };

  playersUnsubscribe = onValue(ref(database, "users"), () => {
    updateStats();
  });

  matchesUnsubscribe = onValue(ref(database, "matches"), () => {
    updateStats();
  });

  return () => {
    playersUnsubscribe?.();
    matchesUnsubscribe?.();
  };
}
