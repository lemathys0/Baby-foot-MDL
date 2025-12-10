import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Swords, History, Timer, Loader2, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MatchQueue } from "@/components/match/MatchQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { onQueueUpdate, onRecentMatchesUpdate, QueuedPlayer, Match } from "@/lib/firebaseSync";
import { joinMatchQueue, leaveMatchQueue } from "@/lib/firebaseMatch";

const MatchPage = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isInQueue, setIsInQueue] = useState(false);
  const [queuedPlayers, setQueuedPlayers] = useState<QueuedPlayer[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Subscribe to queue updates
  useEffect(() => {
    setIsLoadingQueue(true);
    const unsubscribe = onQueueUpdate((players) => {
      setQueuedPlayers(players);
      setIsLoadingQueue(false);
      // Check if current user is in queue
      if (user) {
        const inQueue = players.some((p) => p.id === user.uid);
        setIsInQueue(inQueue);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to recent matches updates
  useEffect(() => {
    setIsLoadingMatches(true);
    const unsubscribe = onRecentMatchesUpdate((matches) => {
      setRecentMatches(matches);
      setIsLoadingMatches(false);
    }, 10);

    return () => unsubscribe();
  }, []);

  const handleJoinQueue = async () => {
    if (!user || !userProfile) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      await joinMatchQueue(
        user.uid,
        userProfile.username,
        userProfile.eloRating || 1000
      );
      
      toast({
        title: "File d'attente",
        description: "Vous avez rejoint la file d'attente!",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre la file",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user) return;

    setIsLeaving(true);
    try {
      await leaveMatchQueue(user.uid);
      
      toast({
        title: "File d'attente",
        description: "Vous avez quitté la file d'attente.",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de quitter la file",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | number) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date inconnue';
    }
  };

  // Get team names - handle both old format (array of names) and new format (array of IDs + team1Names/team2Names)
  const getTeamDisplay = (match: Match, team: 1 | 2) => {
    const teamArray = team === 1 ? match.team1 : match.team2;
    const teamNamesArray = team === 1 ? (match as any).team1Names : (match as any).team2Names;
    
    // If team1Names/team2Names exist (new format from recordMatch)
    if (teamNamesArray && Array.isArray(teamNamesArray)) {
      return teamNamesArray.join(" & ");
    }
    
    // Otherwise, if team array contains strings (old format - direct usernames)
    if (teamArray && teamArray.length > 0 && typeof teamArray[0] === 'string') {
      return teamArray.join(" & ");
    }
    
    // Fallback
    return `Équipe ${team}`;
  };

  return (
    <AppLayout>
      {/* Header avec bouton Créer Match */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/20 p-3">
            <Swords className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Match</h1>
            <p className="text-sm text-muted-foreground">Trouvez une partie</p>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate("/betting")}
          variant="neon"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Créer Match avec Paris
        </Button>
      </motion.div>

      {/* Match Queue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        {isLoadingQueue ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Chargement de la file...</p>
            </CardContent>
          </Card>
        ) : (
          <MatchQueue
            queuedPlayers={queuedPlayers}
            isInQueue={isInQueue}
            onJoinQueue={handleJoinQueue}
            onLeaveQueue={handleLeaveQueue}
            isJoining={isJoining}
            isLeaving={isLeaving}
          />
        )}
      </motion.div>

      {/* Tournament Reminder - ✅ BOUTON CORRIGÉ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card className="border-rarity-gold/30 bg-gradient-to-r from-rarity-gold/10 to-transparent">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-rarity-gold/20 p-3">
              <Timer className="h-6 w-6 text-rarity-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Tournoi du Jeudi</h3>
              <p className="text-sm text-muted-foreground">Début dans 2h (13:00)</p>
            </div>
            <Button
              onClick={() => navigate("/tournament")}
              variant="outline"
              size="sm"
              className="border-rarity-gold text-rarity-gold hover:bg-rarity-gold/10"
            >
              S'inscrire
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Matches */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-muted-foreground" />
              Matchs récents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingMatches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Chargement des matchs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMatches.length > 0 ? (
                  recentMatches.map((match, index) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="rounded-lg bg-surface-alt p-4"
                    >
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(match.date)}</span>
                        <span
                          className={
                            match.score1 > match.score2 ? "text-primary" : "text-secondary"
                          }
                        >
                          {match.score1 > match.score2 ? "Équipe 1 gagne" : "Équipe 2 gagne"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-center">
                          <p className="text-sm font-medium text-foreground">
                            {getTeamDisplay(match, 1)}
                          </p>
                        </div>
                        <div className="mx-4 flex items-center gap-2">
                          <span
                            className={`text-2xl font-bold ${
                              match.score1 > match.score2
                                ? "text-primary text-glow-cyan"
                                : "text-muted-foreground"
                            }`}
                          >
                            {match.score1}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span
                            className={`text-2xl font-bold ${
                              match.score2 > match.score1
                                ? "text-primary text-glow-cyan"
                                : "text-muted-foreground"
                            }`}
                          >
                            {match.score2}
                          </span>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-sm font-medium text-foreground">
                            {getTeamDisplay(match, 2)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Aucun match récent</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
};

export default MatchPage;
