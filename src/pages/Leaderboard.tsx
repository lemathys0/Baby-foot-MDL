import { motion } from "framer-motion";
import { Trophy, Filter, Loader2, Swords, Users, Globe } from "lucide-react";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getEloRank } from "@/lib/firebaseMatch";
import { ref, onValue, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { LeaderboardSkeleton } from "@/components/SkeletonLoader";
import { logger } from '@/utils/logger';
import { deoptimizeUserData } from "@/lib/dbOptimization";

interface PlayerStats {
  id: string;
  username: string;
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

// Helper functions moved outside component
const getRankColor = (rank: number) => {
  if (rank === 1) return "text-rarity-gold";
  if (rank === 2) return "text-rarity-silver";
  if (rank === 3) return "text-rarity-bronze";
  return "text-muted-foreground";
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return "👑";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};

const getWinRateForMode = (player: PlayerStats, mode: "1v1" | "2v2" | "mixed") => {
  const wins = mode === "1v1" ? player.wins1v1 : mode === "2v2" ? player.wins2v2 : player.winsMixed;
  const losses = mode === "1v1" ? player.losses1v1 : mode === "2v2" ? player.losses2v2 : player.lossesMixed;
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

const getRankBadgeComponent = (elo: number) => {
  const rank = getEloRank(elo);
  return (
    <Badge
      style={{
        backgroundColor: `${rank.color}20`,
        borderColor: rank.color,
        color: rank.color
      }}
      className="border"
    >
      <span className="mr-1">{rank.icon}</span>
      {rank.name}
    </Badge>
  );
};

// ✅ OPTIMISATION: Memoized LeaderboardItem component moved outside to avoid closure issues
const LeaderboardItem = React.memo(({
  player,
  rank,
  index,
  selectedMode
}: {
  player: PlayerStats;
  rank: number;
  index: number;
  selectedMode: "global" | "1v1" | "2v2";
}) => {
  const currentElo = selectedMode === "1v1" ? player.elo1v1 : selectedMode === "2v2" ? player.elo2v2 : player.eloGlobal;
  const modeKey = selectedMode === "1v1" ? "1v1" : selectedMode === "2v2" ? "2v2" : "mixed";
  const winRate = getWinRateForMode(player, modeKey);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className={`rounded-lg border p-4 ${
        rank <= 3
          ? "border-primary/40 bg-gradient-to-r from-primary/10 to-transparent"
          : "border-border bg-surface-alt"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-surface font-bold ${getRankColor(rank)}`}>
          {getRankIcon(rank)}
        </div>

        {/* Player Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground">{player.username}</p>
            {getRankBadgeComponent(currentElo)}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>WR: {winRate}%</span>
            <span>•</span>
            <span>
              {selectedMode === "1v1" && `${player.wins1v1}V - ${player.losses1v1}D`}
              {selectedMode === "2v2" && `${player.wins2v2}V - ${player.losses2v2}D`}
              {selectedMode === "global" && `${player.winsMixed}V - ${player.lossesMixed}D`}
            </span>
          </div>
        </div>

        {/* ELO */}
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{currentElo}</p>
          <p className="text-xs text-muted-foreground">ELO</p>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // ✅ OPTIMISATION: Ne re-render que si les données importantes changent
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.elo1v1 === nextProps.player.elo1v1 &&
    prevProps.player.elo2v2 === nextProps.player.elo2v2 &&
    prevProps.player.eloGlobal === nextProps.player.eloGlobal &&
    prevProps.rank === nextProps.rank &&
    prevProps.selectedMode === nextProps.selectedMode
  );
});

const Leaderboard = () => {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<"global" | "1v1" | "2v2">("global");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const usersRef = ref(database, "users");
    
    // Subscribe to real-time updates
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPlayers([]);
        setIsLoading(false);
        return;
      }

      const playersData: PlayerStats[] = [];
      snapshot.forEach((child) => {
        const rawUserData = child.val();
        const userData = deoptimizeUserData(rawUserData);
        playersData.push({
          id: child.key!,
          username: userData.username || "Joueur",
          // Use multi-mode ELO fields if available, fallback to single eloRating
          elo1v1: userData.elo1v1 || userData.eloRating || 1000,
          elo2v2: userData.elo2v2 || userData.eloRating || 1000,
          eloGlobal: userData.eloGlobal || userData.eloRating || 1000,
          wins1v1: userData.wins1v1 || 0,
          losses1v1: userData.losses1v1 || 0,
          wins2v2: userData.wins2v2 || 0,
          losses2v2: userData.losses2v2 || 0,
          winsMixed: userData.winsMixed || 0,
          lossesMixed: userData.lossesMixed || 0,
        });
      });

      setPlayers(playersData);
      setIsLoading(false);
    }, (error) => {
      logger.error("Erreur chargement leaderboard:", error);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // ✅ OPTIMISATION: Memoization du tri des joueurs
  const sortedPlayers = useMemo(() => {
    const sortKey = selectedMode === "1v1" ? "elo1v1" : selectedMode === "2v2" ? "elo2v2" : "eloGlobal";
    return [...players].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [players, selectedMode]);

  // ✅ OPTIMISATION: Memoization de la distribution des rangs
  const rankDistribution = useMemo(() => {
    const distribution = {
      Bronze: 0,
      Argent: 0,
      Or: 0,
      Platine: 0,
      Diamant: 0,
      Maître: 0,
      "G.Maître": 0,
      Challenger: 0,
    };

    const sortKey = selectedMode === "1v1" ? "elo1v1" : selectedMode === "2v2" ? "elo2v2" : "eloGlobal";
    
    players.forEach((player) => {
      const elo = player[sortKey];
      const rank = getEloRank(elo);
      if (distribution.hasOwnProperty(rank.name)) {
        distribution[rank.name as keyof typeof distribution]++;
      }
    });

    const total = players.length || 1;
    return Object.entries(distribution).map(([name, count]) => ({
      name,
      percentage: Math.round((count / total) * 100),
    }));
  }, [players, selectedMode]);

  // ✅ OPTIMISATION: Memoization des top 3 joueurs
  const topPlayers = useMemo(() => sortedPlayers.slice(0, 3), [sortedPlayers]);

  // ✅ OPTIMISATION: Pagination
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedPlayers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedPlayers, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedPlayers.length / itemsPerPage);
  }, [sortedPlayers.length]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-rarity-gold/20 p-3">
              <Trophy className="h-6 w-6 text-rarity-gold" />
            </div>
            <div>
              <div className="h-7 w-32 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <LeaderboardSkeleton />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-rarity-gold/20 p-3">
            <Trophy className="h-6 w-6 text-rarity-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Classement</h1>
            <p className="text-sm text-muted-foreground">Saison 1 - Multi-Modes</p>
          </div>
        </div>

        {/* Mode Selector */}
        <Tabs value={selectedMode} onValueChange={(v) => setSelectedMode(v as "global" | "1v1" | "2v2")} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global" className="gap-2">
              <Globe className="h-4 w-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="1v1" className="gap-2">
              <Swords className="h-4 w-4" />
              1v1
            </TabsTrigger>
            <TabsTrigger value="2v2" className="gap-2">
              <Users className="h-4 w-4" />
              2v2
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Podium */}
      {topPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex items-end justify-center gap-2"
        >
          {/* 2nd Place */}
          {topPlayers[1] && (
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border-4 border-rarity-silver bg-surface-alt">
                <span className="text-2xl">🥈</span>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{topPlayers[1].username}</p>
              {getRankBadgeComponent(selectedMode === "1v1" ? topPlayers[1].elo1v1 : selectedMode === "2v2" ? topPlayers[1].elo2v2 : topPlayers[1].eloGlobal)}
              <div className="mt-2 h-20 w-20 rounded-t-lg bg-gradient-to-b from-rarity-silver/40 to-rarity-silver/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-rarity-silver">
                  {selectedMode === "1v1" ? topPlayers[1].elo1v1 : selectedMode === "2v2" ? topPlayers[1].elo2v2 : topPlayers[1].eloGlobal}
                </span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {topPlayers[0] && (
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-2"
              >
                <span className="text-3xl">👑</span>
              </motion.div>
              <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border-4 border-rarity-gold bg-surface-alt glow-gold">
                <span className="text-3xl">🏆</span>
              </div>
              <p className="font-semibold text-foreground mb-1">{topPlayers[0].username}</p>
              {getRankBadgeComponent(selectedMode === "1v1" ? topPlayers[0].elo1v1 : selectedMode === "2v2" ? topPlayers[0].elo2v2 : topPlayers[0].eloGlobal)}
              <div className="mt-2 h-28 w-24 rounded-t-lg bg-gradient-to-b from-rarity-gold/40 to-rarity-gold/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-rarity-gold">
                  {selectedMode === "1v1" ? topPlayers[0].elo1v1 : selectedMode === "2v2" ? topPlayers[0].elo2v2 : topPlayers[0].eloGlobal}
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {topPlayers[2] && (
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border-4 border-rarity-bronze bg-surface-alt">
                <span className="text-xl">🥉</span>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{topPlayers[2].username}</p>
              {getRankBadgeComponent(selectedMode === "1v1" ? topPlayers[2].elo1v1 : selectedMode === "2v2" ? topPlayers[2].elo2v2 : topPlayers[2].eloGlobal)}
              <div className="mt-2 h-16 w-18 rounded-t-lg bg-gradient-to-b from-rarity-bronze/40 to-rarity-bronze/20 flex items-center justify-center px-6">
                <span className="text-xl font-bold text-rarity-bronze">
                  {selectedMode === "1v1" ? topPlayers[2].elo1v1 : selectedMode === "2v2" ? topPlayers[2].elo2v2 : topPlayers[2].eloGlobal}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Rank Distribution Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribution des Rangs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: "Bronze", icon: "🥉", color: "#CD7F32" },
                { name: "Argent", icon: "🥈", color: "#C0C0C0" },
                { name: "Or", icon: "🥇", color: "#FFD700" },
                { name: "Platine", icon: "💎", color: "#E5E4E2" },
                { name: "Diamant", icon: "💠", color: "#B9F2FF" },
                { name: "Maître", icon: "👑", color: "#9B59B6" },
                { name: "G.Maître", icon: "⚡", color: "#E74C3C" },
                { name: "Challenger", icon: "🔥", color: "#F39C12" },
              ].map((rank) => {
                const dist = rankDistribution.find(d => d.name === rank.name);
                return (
                  <div 
                    key={rank.name}
                    className="flex flex-col items-center rounded-lg border border-border bg-surface-alt p-2"
                  >
                    <span className="text-2xl mb-1">{rank.icon}</span>
                    <span className="text-xs font-medium" style={{ color: rank.color }}>
                      {rank.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dist?.percentage || 0}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Full Leaderboard */}
      <div className="space-y-3">
        {paginatedPlayers.length > 0 ? (
          paginatedPlayers.map((player, index) => {
            const globalRank = (currentPage - 1) * itemsPerPage + index + 1;
            return (
              <LeaderboardItem
                key={player.id}
                player={player}
                rank={globalRank}
                index={index}
                selectedMode={selectedMode}
              />
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucun joueur trouvé</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ✅ Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </AppLayout>
  );
};

export default Leaderboard;
