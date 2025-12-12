import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Clock, Star, AlertCircle, UserPlus, Zap, Loader2, Search, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ref, get, set, update, push } from "firebase/database";
import { database } from "@/lib/firebase";
import { searchUsers, UserProfile } from "@/lib/firebaseExtended";

interface TournamentPlayer {
  userId: string;
  username: string;
  eloRating: number;
  partnerId?: string;
  partnerUsername?: string;
}

interface Match {
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
}

interface Tournament {
  id: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  players: TournamentPlayer[];
  matches: { [key: string]: Match };
  winners: string[];
  prizePool: number;
  status?: string;
  currentRound: number;
}

const TOURNAMENT_START = 13; // 13h
const TOURNAMENT_END = 14.25; // 14h15
const MATCH_DURATION = 5; // 5 minutes
const ENTRY_FEE_SOLO = 50; // 50€ en solo
const ENTRY_FEE_DUO = 25; // 25€ par personne en duo

const Tournament = () => {
  const { user, userProfile } = useAuth();
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [playMode, setPlayMode] = useState<"solo" | "duo">("solo");
  const [partnerUsername, setPartnerUsername] = useState("");
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fortune, setFortune] = useState(0);
  const [timeUntilTournament, setTimeUntilTournament] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTournamentData();
    const interval = setInterval(updateTimeDisplay, 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Recherche de partenaires avec debounce
  useEffect(() => {
    const searchPartner = async () => {
      if (partnerUsername.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchUsers(partnerUsername);
        const filteredResults = results.filter(u => u.id !== user?.uid);
        setSuggestions(filteredResults);
        setShowSuggestions(filteredResults.length > 0);
      } catch (error) {
        console.error("Erreur recherche partenaires:", error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchPartner, 300);
    return () => clearTimeout(timeoutId);
  }, [partnerUsername, user]);

  const loadTournamentData = async () => {
    if (!user) return;

    try {
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        setFortune(userSnapshot.val().fortune || 0);
      }

      const tournamentRef = ref(database, `tournaments/active`);
      const snapshot = await get(tournamentRef);

      if (snapshot.exists()) {
        const tournament = snapshot.val() as Tournament;
        setCurrentTournament(tournament);

        const registered = tournament.players.some((p) => p.userId === user.uid);
        setIsRegistered(registered);
      } else {
        setCurrentTournament(null);
        setIsRegistered(false);
      }
    } catch (error) {
      console.error("Erreur chargement tournoi:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tournoi",
        variant: "destructive",
      });
    }
  };

  const updateTimeDisplay = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    if (currentHour >= TOURNAMENT_START && currentHour < TOURNAMENT_END) {
      const remaining = TOURNAMENT_END - currentHour;
      const minutes = Math.floor(remaining * 60);
      setTimeUntilTournament(`En cours - ${minutes} min restantes`);
    } else if (currentHour < TOURNAMENT_START) {
      const until = TOURNAMENT_START - currentHour;
      const hours = Math.floor(until);
      const minutes = Math.floor((until - hours) * 60);
      setTimeUntilTournament(`Débute dans ${hours}h ${minutes}min`);
    } else {
      setTimeUntilTournament("Terminé pour aujourd'hui");
    }
  };

  const handleSelectPartner = (partner: UserProfile) => {
    setPartnerUsername(partner.username);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleRegister = async () => {
    if (!user || !userProfile) return;

    const entryFee = playMode === "duo" ? ENTRY_FEE_DUO : ENTRY_FEE_SOLO;

    if (fortune < entryFee) {
      toast({
        title: "Fonds insuffisants",
        description: `Il vous faut ${entryFee}€ pour participer (vous avez ${fortune}€)`,
        variant: "destructive",
      });
      return;
    }

    if (playMode === "duo" && !partnerUsername.trim()) {
      toast({
        title: "Partenaire requis",
        description: "Entrez le nom de votre partenaire",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let partnerId = undefined;
      let partnerName = undefined;

      if (playMode === "duo") {
        const usersRef = ref(database, "users");
        const usersSnapshot = await get(usersRef);

        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          const partner = Object.entries(users).find(
            ([_, data]: [string, any]) =>
              data.username?.toLowerCase() === partnerUsername.toLowerCase()
          );

          if (!partner) {
            toast({
              title: "Partenaire introuvable",
              description: "Aucun joueur avec ce nom",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          partnerId = partner[0];
          partnerName = (partner[1] as any).username;
          const partnerFortune = (partner[1] as any).fortune || 0;

          if (partnerFortune < ENTRY_FEE_DUO) {
            toast({
              title: "Partenaire sans fonds",
              description: `${partnerName} n'a pas assez de fortune (${partnerFortune}€ / ${ENTRY_FEE_DUO}€)`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
      }

      const tournamentRef = ref(database, "tournaments/active");
      const snapshot = await get(tournamentRef);

      let tournament: Tournament;

      if (!snapshot.exists()) {
        const now = Date.now();
        tournament = {
          id: `tournament_${now}`,
          startTime: now,
          endTime: now + 75 * 60 * 1000,
          isActive: true,
          players: [],
          matches: {},
          winners: [],
          prizePool: 0,
          currentRound: 0,
        };
      } else {
        tournament = snapshot.val();
      }

      const alreadyRegistered = tournament.players.some((p) => p.userId === user.uid);
      if (alreadyRegistered) {
        toast({
          title: "Déjà inscrit",
          description: "Vous êtes déjà inscrit à ce tournoi",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const newPlayer: TournamentPlayer = {
        userId: user.uid,
        username: userProfile.username,
        eloRating: userProfile.eloRating || 1000,
        partnerId,
        partnerUsername: partnerName,
      };

      tournament.players.push(newPlayer);

      let totalFees = entryFee;
      if (playMode === "duo" && partnerId) {
        totalFees += ENTRY_FEE_DUO;
      }
      tournament.prizePool += totalFees;

      const updates: { [key: string]: any } = {};
      updates[`users/${user.uid}/fortune`] = fortune - entryFee;

      if (playMode === "duo" && partnerId) {
        const partnerRef = ref(database, `users/${partnerId}`);
        const partnerSnapshot = await get(partnerRef);
        
        if (partnerSnapshot.exists()) {
          const partnerData = partnerSnapshot.val();
          updates[`users/${partnerId}/fortune`] = (partnerData.fortune || 0) - ENTRY_FEE_DUO;
        }
      }

      updates["tournaments/active"] = tournament;

      await update(ref(database), updates);

      toast({
        title: "Inscription réussie! 🎉",
        description: `Vous êtes inscrit ${playMode === "duo" ? `en duo (${totalFees}€ total)` : `en solo (${entryFee}€)`}`,
      });

      setShowRegisterDialog(false);
      setPartnerUsername("");
      setPlayMode("solo");
      loadTournamentData();
    } catch (error: any) {
      console.error("Erreur inscription:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de s'inscrire au tournoi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isTournamentTime = () => {
    return true;
  };

  // 🎯 FONCTION - Mettre à jour le score d'un match
  const updateMatchScore = async (matchId: string, team: 'team1' | 'team2', newScore: number) => {
    if (!currentTournament) return;
    
    try {
      const updates: { [key: string]: any } = {};
      const scoreKey = team === 'team1' ? 'score1' : 'score2';
      updates[`tournaments/active/matches/${matchId}/${scoreKey}`] = newScore;
      
      await update(ref(database), updates);
      await loadTournamentData();
      
      toast({
        title: "Score mis à jour",
        description: `${team === 'team1' ? 'Équipe 1' : 'Équipe 2'}: ${newScore} points`,
      });
    } catch (error: any) {
      console.error("Erreur mise à jour score:", error);
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // 🏁 FONCTION - Terminer un match
  const finishMatch = async (matchId: string) => {
    if (!currentTournament) return;
    
    const match = currentTournament.matches[matchId];
    if (!match) return;
    
    if (!confirm(`✅ Terminer le match ${match.team1.playerNames[0]} vs ${match.team2.playerNames[0]} ?`)) return;
    
    try {
      const winnerId = match.score1 > match.score2 
        ? match.team1.playerIds[0] 
        : match.team2.playerIds[0];

      const updates: { [key: string]: any } = {};
      updates[`tournaments/active/matches/${matchId}/status`] = 'completed';
      updates[`tournaments/active/matches/${matchId}/winnerId`] = winnerId;
      
      await update(ref(database), updates);
      await loadTournamentData();
      
      toast({
        title: "Match terminé! 🏁",
        description: `Score final: ${match.score1} - ${match.score2}`,
      });

      // Vérifier si tous les matchs du round sont terminés
      await checkRoundCompletion();
    } catch (error: any) {
      console.error("Erreur fin de match:", error);
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // 🔄 FONCTION - Vérifier si le round est terminé et créer le suivant
  const checkRoundCompletion = async () => {
    if (!currentTournament) return;

    const matches = Object.values(currentTournament.matches);
    const currentRound = currentTournament.currentRound || 1;
    
    const currentRoundMatches = matches.filter((m: any) => m.round === currentRound);
    const allCompleted = currentRoundMatches.every((m: any) => m.status === 'completed');

    if (!allCompleted) return;

    // Récupérer les gagnants du round actuel
    const winners = currentRoundMatches
      .map((m: any) => {
        if (m.score1 > m.score2) {
          return {
            userId: m.team1.playerIds[0],
            username: m.team1.playerNames[0],
            partnerId: m.team1.partnerId,
            partnerName: m.team1.partnerName,
          };
        } else {
          return {
            userId: m.team2.playerIds[0],
            username: m.team2.playerNames[0],
            partnerId: m.team2.partnerId,
            partnerName: m.team2.partnerName,
          };
        }
      });

    // Si un seul gagnant, le tournoi est terminé
    if (winners.length === 1) {
      await finishTournament(winners[0].userId);
      return;
    }

    // Sinon, créer le prochain round
    toast({
      title: "🎊 Round terminé!",
      description: `${winners.length} gagnants passent au prochain round`,
    });

    setTimeout(() => {
      createNextRound(winners);
    }, 2000);
  };

  // ➡️ FONCTION - Créer le prochain round
  const createNextRound = async (winners: any[]) => {
    if (!currentTournament) return;

    try {
      const nextRound = (currentTournament.currentRound || 1) + 1;
      const newMatches: { [key: string]: Match } = { ...currentTournament.matches };

      // Mélanger les gagnants
      for (let i = winners.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [winners[i], winners[j]] = [winners[j], winners[i]];
      }

      // Créer les nouveaux matchs
      for (let i = 0; i < winners.length - 1; i += 2) {
        const player1 = winners[i];
        const player2 = winners[i + 1];

        if (player1 && player2) {
          const matchKey = `match_round${nextRound}_${i}`;
          newMatches[matchKey] = {
            id: matchKey,
            round: nextRound,
            team1: {
              playerIds: [player1.userId],
              playerNames: [player1.username],
              partnerId: player1.partnerId || null,
              partnerName: player1.partnerName || null,
            },
            team2: {
              playerIds: [player2.userId],
              playerNames: [player2.username],
              partnerId: player2.partnerId || null,
              partnerName: player2.partnerName || null,
            },
            status: "pending",
            startTime: Date.now(),
            score1: 0,
            score2: 0,
          };
        }
      }

      const updates: { [key: string]: any } = {};
      updates['tournaments/active/matches'] = newMatches;
      updates['tournaments/active/currentRound'] = nextRound;

      await update(ref(database), updates);
      await loadTournamentData();

      toast({
        title: `🎮 Round ${nextRound} créé!`,
        description: `${Math.floor(winners.length / 2)} nouveaux matchs`,
      });
    } catch (error: any) {
      console.error("Erreur création round:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 🏆 FONCTION - Terminer le tournoi et distribuer les récompenses
  const finishTournament = async (winnerId: string) => {
    if (!currentTournament) return;

    try {
      const winner = currentTournament.players.find(p => p.userId === winnerId);
      if (!winner) return;

      const prizePool = currentTournament.prizePool;
      const firstPrize = Math.floor(prizePool * 0.5);

      const updates: { [key: string]: any } = {};
      
      const winnerRef = ref(database, `users/${winnerId}`);
      const winnerSnapshot = await get(winnerRef);
      
      if (winnerSnapshot.exists()) {
        const currentFortune = winnerSnapshot.val().fortune || 0;
        updates[`users/${winnerId}/fortune`] = currentFortune + firstPrize;
      }

      updates['tournaments/active/status'] = 'completed';
      updates['tournaments/active/winners'] = [winnerId];
      updates['tournaments/active/isActive'] = false;

      await update(ref(database), updates);
      await loadTournamentData();

      toast({
        title: "🏆 TOURNOI TERMINÉ!",
        description: `${winner.username} remporte ${firstPrize}€!`,
      });
    } catch (error: any) {
      console.error("Erreur fin tournoi:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 🎮 FONCTION - Lancer le tournoi
  const startTournament = async () => {
    if (!currentTournament) {
      toast({ title: "Erreur", description: "Aucun tournoi actif", variant: "destructive" });
      return;
    }
    
    if (currentTournament.players.length < 2) {
      toast({ title: "Erreur", description: "Il faut au moins 2 joueurs", variant: "destructive" });
      return;
    }
    
    if (!confirm(`⚠️ Lancer le tournoi avec ${currentTournament.players.length} joueurs ?`)) return;
    
    setIsLoading(true);
    try {
      const players = [...currentTournament.players];
      const matchesArray = [];
      
      // Mélanger les joueurs aléatoirement
      for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
      }
      
      // Créer les paires de matchs
      for (let i = 0; i < players.length - 1; i += 2) {
        const player1 = players[i];
        const player2 = players[i + 1];
        
        if (player1 && player2) {
          matchesArray.push({
            id: `match_round1_${i}`,
            round: 1,
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
            startTime: Date.now(),
            score1: 0,
            score2: 0,
          });
        }
      }
      
      if (matchesArray.length === 0) {
        toast({ 
          title: "Erreur", 
          description: "Impossible de créer les matchs", 
          variant: "destructive" 
        });
        setIsLoading(false);
        return;
      }
      
      const matchesObject: { [key: string]: any } = {};
      matchesArray.forEach((match) => {
        matchesObject[match.id] = match;
      });
      
      const updates: { [key: string]: any } = {};
      updates['tournaments/active/matches'] = matchesObject;
      updates['tournaments/active/status'] = 'in_progress';
      updates['tournaments/active/currentRound'] = 1;
      
      await update(ref(database), updates);
      
      toast({
        title: "🎮 Tournoi lancé!",
        description: `${matchesArray.length} matchs créés pour le Round 1`,
      });
      
      await loadTournamentData();
    } catch (error: any) {
      console.error("Erreur lancement tournoi:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // 🧪 FONCTION DE TEST - Inscrire tous les joueurs
  const registerAllPlayers = async () => {
    if (!confirm("⚠️ Inscrire TOUS les joueurs au tournoi ?")) return;
    
    setIsLoading(true);
    try {
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val();
      
      if (!users) {
        toast({ title: "Erreur", description: "Aucun utilisateur trouvé", variant: "destructive" });
        return;
      }
      
      const tournamentRef = ref(database, 'tournaments/active');
      const tournamentSnapshot = await get(tournamentRef);
      
      let tournament;
      if (!tournamentSnapshot.exists()) {
        const now = Date.now();
        tournament = {
          id: `tournament_${now}`,
          startTime: now,
          endTime: now + 75 * 60 * 1000,
          isActive: true,
          players: [],
          matches: {},
          winners: [],
          prizePool: 0,
          currentRound: 0,
        };
      } else {
        tournament = tournamentSnapshot.val();
      }
      
      const ENTRY_FEE = 50;
      let registered = 0;
      const updates: { [key: string]: any } = {};
      
      Object.keys(users).forEach(userId => {
        const user = users[userId];
        
        if (tournament.players.some((p: any) => p.userId === userId)) return;
        
        const fortune = user.fortune || 0;
        if (fortune < ENTRY_FEE) return;
        
        tournament.players.push({
          userId: userId,
          username: user.username,
          eloRating: user.eloRating || 1000,
        });
        
        updates[`users/${userId}/fortune`] = fortune - ENTRY_FEE;
        tournament.prizePool += ENTRY_FEE;
        registered++;
      });
      
      updates['tournaments/active'] = tournament;
      await update(ref(database), updates);
      
      toast({
        title: "✅ Inscription réussie!",
        description: `${registered} joueurs inscrits - Cagnotte: ${tournament.prizePool}€`,
      });
      
      await loadTournamentData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Grouper les matchs par round
  const getMatchesByRound = () => {
    if (!currentTournament?.matches) return {};
    
    const matchesByRound: { [key: number]: Match[] } = {};
    Object.values(currentTournament.matches).forEach((match: any) => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
    
    return matchesByRound;
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mb-4 text-6xl"
          >
            🏆
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Tournoi Quotidien</h1>
          <p className="text-muted-foreground">{timeUntilTournament}</p>
          
          {currentTournament?.status && (
            <Badge className="mt-2" variant={currentTournament.status === 'completed' ? 'default' : 'secondary'}>
              {currentTournament.status === 'in_progress' ? '🎮 En cours' : 
               currentTournament.status === 'completed' ? '✅ Terminé' : '⏳ En attente'}
            </Badge>
          )}
          
          {/* 🧪 BOUTONS DE TEST */}
          <div className="flex gap-2 justify-center mt-2">
            <Button 
              onClick={registerAllPlayers}
              variant="outline"
              size="sm"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Inscription...
                </>
              ) : (
                <>🧪 Inscrire tous</>
              )}
            </Button>
            
            {currentTournament && currentTournament.players.length >= 2 && !currentTournament.status && (
              <Button 
                onClick={startTournament}
                variant="outline"
                size="sm"
                className="border-green-500 text-green-500 hover:bg-green-500/10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Lancement...
                  </>
                ) : (
                  <>🎮 Lancer tournoi</>
                )}
              </Button>
            )}
          </div>
        </div>

        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Informations du Tournoi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horaires</span>
              <span className="font-bold">13h00 - 14h15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Durée des matchs</span>
              <span className="font-bold">{MATCH_DURATION} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais d'inscription</span>
              <span className="font-bold text-primary">50€ solo / 25€ duo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cagnotte</span>
              <span className="font-bold text-yellow-500">{currentTournament?.prizePool || 0}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joueurs inscrits</span>
              <span className="font-bold">{currentTournament?.players.length || 0}</span>
            </div>
            {currentTournament?.currentRound && currentTournament.currentRound > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round actuel</span>
                <span className="font-bold text-primary">Round {currentTournament.currentRound}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {!isRegistered && currentTournament?.status !== 'in_progress' && currentTournament?.status !== 'completed' ? (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2">Rejoindre le tournoi</h3>
              <p className="text-muted-foreground mb-4">Participez seul ou en duo au tournoi quotidien</p>
              <div className="flex gap-3 justify-center mb-4">
                <Button onClick={() => setShowRulesDialog(true)} variant="outline">
                  Voir les règles
                </Button>
                <Button
                  onClick={() => setShowRegisterDialog(true)}
                  variant="default"
                  className="bg-primary hover:bg-primary/90"
                  disabled={!isTournamentTime() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Inscription...
                    </>
                  ) : (
                    "S'inscrire"
                  )}
                </Button>
              </div>
              {!isTournamentTime() && (
                <p className="text-xs text-muted-foreground">
                  ⏰ Le tournoi est disponible de 13h à 14h15
                </p>
              )}
            </CardContent>
          </Card>
        ) : isRegistered ? (
          <Card className="mb-6 border-primary">
            <CardContent className="p-6 text-center">
              <Star className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Vous êtes inscrit! ✅</h3>
              <p className="text-muted-foreground">Bonne chance pour le tournoi</p>
            </CardContent>
          </Card>
        ) : null}

        {currentTournament && currentTournament.players.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Participants ({currentTournament.players.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentTournament.players.map((player, index) => (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      player.userId === user?.uid
                        ? "bg-primary/20 border border-primary/50"
                        : "bg-surface-alt"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{player.username}</p>
                        {player.partnerUsername && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            avec {player.partnerUsername}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-bold">{player.eloRating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AFFICHAGE DES MATCHS PAR ROUND */}
        {currentTournament && currentTournament.matches && Object.keys(currentTournament.matches).length > 0 && (
          <div className="space-y-6">
            {Object.entries(getMatchesByRound())
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([roundNum, matches]) => (
                <Card key={roundNum}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🎮 Round {roundNum}
                      <Badge variant="secondary">{matches.length} match{matches.length > 1 ? 's' : ''}</Badge>
                      {Number(roundNum) === currentTournament.currentRound && (
                        <Badge variant="default" className="ml-2">En cours</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {matches.map((match: Match, index: number) => {
                        const matchId = Object.keys(currentTournament.matches).find(
                          key => currentTournament.matches[key].id === match.id
                        );
                        
                        return (
                          <div
                            key={match.id}
                            className="p-4 rounded-lg bg-surface-alt border border-border"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline">Match #{index + 1}</Badge>
                              <Badge 
                                variant={
                                  match.status === "completed" ? "default" :
                                  match.status === "in_progress" ? "secondary" : 
                                  "outline"
                                }
                              >
                                {match.status === "completed" ? "✅ Terminé" :
                                 match.status === "in_progress" ? "🎮 En cours" : 
                                 "⏳ En attente"}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              {/* ÉQUIPE 1 */}
                              <div className="flex items-center justify-between p-3 rounded bg-surface border border-border">
                                <div className="flex-1">
                                  <p className="font-bold text-foreground">
                                    {match.team1.playerNames.join(" & ")}
                                    {match.team1.partnerName && ` & ${match.team1.partnerName}`}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {match.status !== "completed" && matchId && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateMatchScore(matchId, 'team1', Math.max(0, match.score1 - 1))}
                                        disabled={match.score1 <= 0}
                                      >
                                        -
                                      </Button>
                                      <span className="text-2xl font-bold w-12 text-center">{match.score1}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateMatchScore(matchId, 'team1', match.score1 + 1)}
                                      >
                                        +
                                      </Button>
                                    </>
                                  )}
                                  {match.status === "completed" && (
                                    <span className={`text-3xl font-bold ${match.winnerId === match.team1.playerIds[0] ? 'text-primary' : 'text-muted-foreground'}`}>
                                      {match.score1}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-center text-muted-foreground font-bold">VS</div>

                              {/* ÉQUIPE 2 */}
                              <div className="flex items-center justify-between p-3 rounded bg-surface border border-border">
                                <div className="flex-1">
                                  <p className="font-bold text-foreground">
                                    {match.team2.playerNames.join(" & ")}
                                    {match.team2.partnerName && ` & ${match.team2.partnerName}`}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {match.status !== "completed" && matchId && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateMatchScore(matchId, 'team2', Math.max(0, match.score2 - 1))}
                                        disabled={match.score2 <= 0}
                                      >
                                        -
                                      </Button>
                                      <span className="text-2xl font-bold w-12 text-center">{match.score2}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateMatchScore(matchId, 'team2', match.score2 + 1)}
                                      >
                                        +
                                      </Button>
                                    </>
                                  )}
                                  {match.status === "completed" && (
                                    <span className={`text-3xl font-bold ${match.winnerId === match.team2.playerIds[0] ? 'text-primary' : 'text-muted-foreground'}`}>
                                      {match.score2}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* BOUTON TERMINER LE MATCH */}
                              {match.status !== "completed" && matchId && (
                                <Button
                                  onClick={() => finishMatch(matchId)}
                                  className="w-full"
                                  variant="default"
                                >
                                  🏁 Terminer le match
                                </Button>
                              )}

                              {/* INDICATEUR DE VICTOIRE */}
                              {match.status === "completed" && (
                                <div className="text-center p-2 bg-primary/10 rounded">
                                  <p className="text-sm font-bold text-primary">
                                    🏆 Vainqueur: {match.winnerId === match.team1.playerIds[0] ? match.team1.playerNames[0] : match.team2.playerNames[0]}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* AFFICHAGE DU GAGNANT */}
        {currentTournament?.status === 'completed' && currentTournament.winners.length > 0 && (
          <Card className="mb-6 border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-transparent">
            <CardContent className="p-6 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                🏆
              </motion.div>
              <h3 className="text-2xl font-bold mb-2">
                Tournoi terminé!
              </h3>
              <p className="text-lg text-muted-foreground mb-4">
                Félicitations au gagnant! 🎉
              </p>
              <div className="text-3xl font-bold text-yellow-500">
                {Math.floor(currentTournament.prizePool * 0.5)}€
              </div>
              <p className="text-sm text-muted-foreground mt-2">Gain du vainqueur</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Règles du Tournoi
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold mb-2">⏰ Horaires</h3>
                <p className="text-sm text-muted-foreground">
                  Le tournoi se déroule tous les jours de <strong>13h00 à 14h15</strong> (1h15 de
                  compétition)
                </p>
              </div>

              <div>
                <h3 className="font-bold mb-2">👥 Modes de jeu</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Solo :</strong> Affrontez les autres joueurs individuellement</li>
                  <li>• <strong>Duo :</strong> Formez une équipe avec un partenaire</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">🎮 Déroulement</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Chaque match dure exactement <strong>5 minutes</strong></li>
                  <li>• Les matchs sont organisés en <strong>élimination directe</strong></li>
                  <li>• Le gagnant de chaque match passe au round suivant</li>
                  <li>• Le tournoi continue jusqu'à ce qu'il ne reste qu'un seul vainqueur</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">💰 Récompenses</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Frais d'inscription : <strong>50€ en solo</strong> ou <strong>25€ par personne en duo</strong></li>
                  <li>• La cagnotte totale est redistribuée aux gagnants</li>
                  <li>• 🥇 1er : 50% de la cagnotte</li>
                  <li>• 🥈 2ème : 30% de la cagnotte</li>
                  <li>• 🥉 3ème : 20% de la cagnotte</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">🎁 Bonus</h3>
                <p className="text-sm text-muted-foreground">
                  Les bonus de club sont actifs pendant le tournoi !
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inscription au Tournoi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Votre fortune : <span className="font-bold text-foreground">{fortune}€</span>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Frais d'inscription : <span className="font-bold text-primary">{playMode === "duo" ? ENTRY_FEE_DUO : ENTRY_FEE_SOLO}€</span>
                </p>
                {fortune < (playMode === "duo" ? ENTRY_FEE_DUO : ENTRY_FEE_SOLO) && (
                  <p className="text-xs text-destructive mb-4">
                    ⚠️ Vous n'avez pas assez de fortune pour participer
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={playMode === "solo" ? "default" : "outline"}
                  onClick={() => setPlayMode("solo")}
                  className="h-20"
                >
                  <div className="text-center">
                    <Trophy className="h-6 w-6 mx-auto mb-1" />
                    <p className="font-bold">Solo</p>
                    <p className="text-xs text-muted-foreground">50€</p>
                  </div>
                </Button>
                <Button
                  variant={playMode === "duo" ? "default" : "outline"}
                  onClick={() => setPlayMode("duo")}
                  className="h-20"
                >
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-1" />
                    <p className="font-bold">Duo</p>
                    <p className="text-xs text-muted-foreground">25€</p>
                  </div>
                </Button>
              </div>

              {playMode === "duo" && (
                <div className="relative">
                  <label className="text-sm font-medium mb-2 block">Nom du partenaire</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground z-10" />
                    )}
                    <input
                      type="text"
                      value={partnerUsername}
                      onChange={(e) => setPartnerUsername(e.target.value)}
                      onFocus={() => partnerUsername.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Tapez au moins 2 lettres..."
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {suggestions.map((partner) => (
                          <button
                            key={partner.id}
                            onClick={() => handleSelectPartner(partner)}
                            className="w-full px-4 py-3 text-left hover:bg-surface-alt transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-medium text-foreground group-hover:text-primary">
                                {partner.username}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <Zap className="h-3 w-3" />
                                {partner.eloRating} ELO
                                <span className="ml-2">💰 {partner.fortune}€</span>
                              </p>
                            </div>
                            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {partnerUsername.length > 0 && partnerUsername.length < 2 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Tapez au moins 2 lettres pour rechercher
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleRegister}
                className="w-full"
                disabled={fortune < (playMode === "duo" ? ENTRY_FEE_DUO : ENTRY_FEE_SOLO) || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Inscription en cours...
                  </>
                ) : (
                  "Confirmer l'inscription"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
};

export default Tournament;
