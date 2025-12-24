import { motion } from "framer-motion";
import { Trophy, Users, Layers, TrendingUp, Zap, Loader2  } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAppStats, onAppStatsUpdate, getRecentMatches, onRecentMatchesUpdate, Match, getQueuedPlayers, onQueueUpdate, QueuedPlayer } from "@/lib/firebaseSync";
import { getCardStats } from "@/lib/firebaseCards";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/utils/logger';
import { QuickQuestCard } from "@/components/quests/QuickQuestCard";

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPlayers: 0,
    averageElo: 0,
    totalMatches: 0,
  });
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [queuedPlayers, setQueuedPlayers] = useState<QueuedPlayer[]>([]);
  const [cardStats, setCardStats] = useState({ totalCards: 0, uniqueCards: 48 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [appStats, matches, queue] = await Promise.all([
          getAppStats(),
          getRecentMatches(3),
          getQueuedPlayers(),
        ]);
        
        setStats(appStats);
        setRecentMatches(matches);
        setQueuedPlayers(queue);

        if (user) {
          const cards = await getCardStats(user.uid);
          setCardStats(cards);
        }
      } catch (error) {
        logger.error("Erreur chargement données:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    const unsubscribeStats = onAppStatsUpdate(setStats);
    const unsubscribeMatches = onRecentMatchesUpdate((matches) => {
      setRecentMatches(matches.slice(0, 3));
    }, 3);
    const unsubscribeQueue = onQueueUpdate(setQueuedPlayers);

    return () => {
      unsubscribeStats();
      unsubscribeMatches();
      unsubscribeQueue();
    };
  }, [user]);

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  const getActivityFromMatches = () => {
    const activities = [];
    recentMatches.forEach((match) => {
      // Skip les matchs optimisés sans noms (anciens matchs ont team1Names/team2Names)
      if (!match.team1Names || !match.team2Names) return;

      const winner = match.score1 > match.score2
        ? match.team1Names.join(" & ")
        : match.team2Names.join(" & ");
      activities.push({
        text: `${winner} a gagné ${match.score1}-${match.score2}`,
        time: formatTimeAgo(match.timestamp),
        type: "match" as const,
      });
    });

    if (user && cardStats.uniqueCards > 0) {
      activities.push({
        text: `${cardStats.uniqueCards} cartes uniques collectées`,
        time: "Collection",
        type: "card" as const,
      });
    }
    return activities.slice(0, 3);
  };

  // Suppression du bloc tutorialLoading qui causait l'erreur
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const activities = getActivityFromMatches();

  return (
    <AppLayout>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-4 text-6xl"
        >
          ⚽
        </motion.div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Baby-Foot <span className="text-primary text-glow-cyan">App</span>
        </h1>
        <p className="text-muted-foreground">
          Compétition • Collection • Communauté
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 grid grid-cols-3 gap-3"
      >
        <Card className="text-center">
          <CardContent className="p-4">
            <Zap className="mx-auto mb-2 h-6 w-6 text-primary" />
            {loading ? (
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stats.averageElo}</p>
            )}
            <p className="text-xs text-muted-foreground">ELO Moyen</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="mx-auto mb-2 h-6 w-6 text-secondary" />
            {loading ? (
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stats.totalPlayers}</p>
            )}
            <p className="text-xs text-muted-foreground">Joueurs</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Trophy className="mx-auto mb-2 h-6 w-6 text-rarity-gold" />
            {loading ? (
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stats.totalMatches}</p>
            )}
            <p className="text-xs text-muted-foreground">Matchs</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/match">
            <Card className="group cursor-pointer overflow-hidden transition-all hover:neon-border-cyan">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-primary/20 p-3 transition-all group-hover:glow-cyan">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    Rejoindre un match
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {queuedPlayers.length} joueur{queuedPlayers.length !== 1 ? 's' : ''} en attente
                  </p>
                </div>
                <Button variant="neon" size="sm">
                  Jouer
                </Button>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Carte des quêtes */}
        <QuickQuestCard />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link to="/leaderboard">
            <Card className="group cursor-pointer overflow-hidden transition-all hover:border-rarity-gold/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-rarity-gold/20 p-3">
                  <Trophy className="h-8 w-8 text-rarity-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Classement</h3>
                  <p className="text-sm text-muted-foreground">
                    Voir le top des joueurs
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link to="/babydex">
            <Card className="group cursor-pointer overflow-hidden transition-all hover:neon-border-magenta">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-secondary/20 p-3 transition-all group-hover:glow-magenta">
                  <Layers className="h-8 w-8 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">BabyDex</h3>
                  <p className="text-sm text-muted-foreground">
                    {user 
                      ? `${cardStats.uniqueCards}/${cardStats.uniqueCards} cartes collectées`
                      : "Collection de cartes"
                    }
                  </p>
                </div>
                <Button variant="neon-magenta" size="sm">
                  Ouvrir
                </Button>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/tournament">
            <Card className="group cursor-pointer overflow-hidden transition-all hover:border-yellow-500/50 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-yellow-500/20 p-3">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Tournoi Quotidien</h3>
                    <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500 text-black rounded-full">
                      NOUVEAU
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    13h00 - 14h15 • Frais 50₣
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                >
                  S'inscrire
                </Button>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Activité récente
        </h2>
        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune activité récente
            </div>
          ) : (
            activities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-3 rounded-lg bg-surface-alt p-3"
              >
                <span className="text-lg">
                  {activity.type === "match" && "⚽"}
                  {activity.type === "card" && "🃏"}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Index;
