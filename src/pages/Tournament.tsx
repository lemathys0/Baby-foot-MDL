import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Clock, Star, AlertCircle, UserPlus, Zap, Loader2, Search, ArrowRight, Crown, Medal, CheckCircle2, TrendingUp, Calendar, Sparkles, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ref, get, update, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { searchUsers, UserProfile, addFortuneHistoryEntry } from "@/lib/firebaseExtended";
import { 
  notifyTournamentStarting, 
  notifyFortuneReceived 
} from "@/lib/firebaseNotifications";
import { logger } from '@/utils/logger';
import {
  createNextRoundSafe,
  finishMatchSafe,
  checkRoundCompletion,
  distributeTournamentPrizes,
  Tournament as TournamentType,
  TournamentMatch,
  TournamentPlayer
} from "@/lib/firebaseTournament";

const TOURNAMENT_START = 13; // 13h
const TOURNAMENT_END = 14.25; // 14h15
const ENTRY_FEE_SOLO = 50;
const ENTRY_FEE_DUO = 25;

const Tournament = () => {
  const { user, userProfile } = useAuth();
  const [currentView, setCurrentView] = useState<"overview" | "matches" | "leaderboard">("overview");
  const [selectedRound, setSelectedRound] = useState(1);
  const [currentTournament, setCurrentTournament] = useState<TournamentType | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [playMode, setPlayMode] = useState<"solo" | "duo">("solo");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [fortune, setFortune] = useState(0);

  // Charger les données du tournoi
  useEffect(() => {
    if (!user) return;
    loadTournamentData();
    const interval = setInterval(loadTournamentData, 5000); // Refresh toutes les 5s
    return () => clearInterval(interval);
  }, [user]);

  // Mettre à jour le temps restant
  useEffect(() => {
    const timer = setInterval(updateTimeDisplay, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mettre à jour le round sélectionné selon le round actuel
  useEffect(() => {
    if (currentTournament?.currentRound) {
      setSelectedRound(currentTournament.currentRound);
    }
  }, [currentTournament?.currentRound]);

  // Recherche de partenaires
  useEffect(() => {
    const searchPartner = async () => {
      if (partnerSearch.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchUsers(partnerSearch);
        const filteredResults = results.filter(u => u.id !== user?.uid);
        setSuggestions(filteredResults);
      } catch (error) {
        logger.error("Erreur recherche partenaires:", error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchPartner, 300);
    return () => clearTimeout(timeoutId);
  }, [partnerSearch, user]);

  const loadTournamentData = async () => {
    if (!user) return;

    try {
      // Charger la fortune
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        setFortune(userSnapshot.val().fortune || 0);
      }

      // Charger le tournoi
      const tournamentRef = ref(database, `tournaments/active`);
      const snapshot = await get(tournamentRef);

      if (snapshot.exists()) {
        const tournament = snapshot.val() as TournamentType;
        
        // ✅ CORRECTION: S'assurer que players est toujours un tableau
        if (!tournament.players || !Array.isArray(tournament.players)) {
          tournament.players = [];
        }
        
        // ✅ CORRECTION: S'assurer que matches est toujours un objet
        if (!tournament.matches || typeof tournament.matches !== 'object') {
          tournament.matches = {};
        }
        
        setCurrentTournament(tournament);

        const registered = tournament.players.some((p) => p.userId === user.uid);
        setIsRegistered(registered);

        // ✅ Distribuer les prix automatiquement si tournoi terminé et prix non distribués
        if (
          tournament.status === "completed" &&
          !tournament.prizesDistributed &&
          tournament.winners?.length > 0
        ) {
          logger.log("🏆 Tournoi terminé détecté, distribution des prix...");
          setTimeout(async () => {
            const result = await distributeTournamentPrizes("active");
            if (result.success) {
              toast({
                title: "🏆 Prix distribués!",
                description: result.message,
              });
              loadTournamentData();
            }
          }, 1000);
        }
      } else {
        setCurrentTournament(null);
        setIsRegistered(false);
      }
    } catch (error) {
      logger.error("Erreur chargement tournoi:", error);
    }
  };

  const updateTimeDisplay = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    if (currentHour >= TOURNAMENT_START && currentHour < TOURNAMENT_END) {
      const remaining = TOURNAMENT_END - currentHour;
      const hours = Math.floor(remaining);
      const minutes = Math.floor((remaining - hours) * 60);
      const seconds = Math.floor(((remaining - hours) * 60 - minutes) * 60);
      setTimeRemaining({ hours, minutes, seconds });
    } else if (currentHour < TOURNAMENT_START) {
      const until = TOURNAMENT_START - currentHour;
      const hours = Math.floor(until);
      const minutes = Math.floor((until - hours) * 60);
      const seconds = Math.floor(((until - hours) * 60 - minutes) * 60);
      setTimeRemaining({ hours, minutes, seconds });
    } else {
      setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
    }
  };

  const isTournamentTime = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    return currentHour >= TOURNAMENT_START && currentHour < TOURNAMENT_END;
  };

  // ✅ SOLUTION: Inscription duo avec système de token temporaire
// Remplacer handleRegister dans Tournament.tsx

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

  if (playMode === "duo" && !partnerSearch.trim()) {
    toast({
      title: "Partenaire requis",
      description: "Entrez le nom de votre partenaire",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);

  try {
    let partnerId: string | null = null;
    let partnerName: string | null = null;
    let partnerFortune = 0;

    if (playMode === "duo") {
      const usersRef = ref(database, "users");
      const usersSnapshot = await get(usersRef);

      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        const partner = Object.entries(users).find(
          ([_, data]: [string, any]) =>
            data.username?.toLowerCase() === partnerSearch.toLowerCase()
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
        partnerFortune = (partner[1] as any).fortune || 0;

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

    if (!snapshot.exists()) {
      toast({
        title: "Aucun tournoi actif",
        description: "Un admin doit d'abord créer le tournoi.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const tournament = snapshot.val() as TournamentType;

    if (!tournament.players || !Array.isArray(tournament.players)) {
      tournament.players = [];
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

    if (partnerId && tournament.players.some((p) => p.userId === partnerId)) {
      toast({
        title: "Partenaire déjà inscrit",
        description: `${partnerName} est déjà inscrit au tournoi`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const newPlayer: TournamentPlayer = {
      userId: user.uid,
      username: userProfile.username,
      eloRating: userProfile.eloRating || 1000,
      partnerId: partnerId || null,
      partnerUsername: partnerName || null,
    };

    tournament.players.push(newPlayer);

    let totalFees = entryFee;
    if (playMode === "duo" && partnerId) {
      totalFees += ENTRY_FEE_DUO;
    }
    tournament.prizePool += totalFees;

    // ✅ ÉTAPE 1: Créer un token temporaire pour autoriser le débit du partenaire
    const registrationId = `reg_${user.uid}_${Date.now()}`;
    
    if (playMode === "duo" && partnerId) {
      await set(ref(database, `tournamentRegistrations/${registrationId}`), {
        userId: user.uid,
        partnerId: partnerId,
        timestamp: Date.now(),
      });
    }

    // ✅ ÉTAPE 2: Effectuer les mises à jour avec le token en place
    const updates: { [key: string]: any } = {};
    updates[`users/${user.uid}/fortune`] = fortune - entryFee;

    if (playMode === "duo" && partnerId) {
      updates[`users/${partnerId}/fortune`] = partnerFortune - ENTRY_FEE_DUO;
    }

    updates["tournaments/active/players"] = tournament.players;
    updates["tournaments/active/prizePool"] = tournament.prizePool;

    await update(ref(database), updates);

    // ✅ ÉTAPE 3: Supprimer le token temporaire
    if (playMode === "duo") {
      await set(ref(database, `tournamentRegistrations/${registrationId}`), null);
    }

    // ✅ ÉTAPE 4: Enregistrer l'historique de fortune pour l'utilisateur principal
    await addFortuneHistoryEntry(
      user.uid,
      -entryFee, // Montant négatif car c'est une dépense
      "tournament_entry",
      `Inscription tournoi ${playMode === "solo" ? "solo" : "duo"}`,
      {
        tournamentId: "active",
        mode: playMode,
        entryFee,
        ...(playMode === "duo" && partnerId && { 
          partnerId, 
          partnerName 
        })
      }
    );

    // ✅ ÉTAPE 5: Enregistrer l'historique pour le partenaire en duo
    if (playMode === "duo" && partnerId && partnerName) {
      await addFortuneHistoryEntry(
        partnerId,
        -ENTRY_FEE_DUO,
        "tournament_entry",
        `Inscription tournoi duo`,
        {
          tournamentId: "active",
          mode: "duo",
          entryFee: ENTRY_FEE_DUO,
          partnerId: user.uid,
          partnerName: userProfile.username
        }
      );
    }

    toast({
      title: "Inscription réussie! 🎉",
      description: `Vous êtes inscrit ${playMode === "duo" ? `en duo (${totalFees}€ total)` : `en solo (${entryFee}€)`}`,
    });

    await notifyTournamentStarting(user.uid, "Tournoi Quotidien", "dans quelques instants");

    setShowRegisterModal(false);
    setPartnerSearch("");
    setPlayMode("solo");
    loadTournamentData();
  } catch (error: any) {
    logger.error("Erreur inscription:", error);
    toast({
      title: "Erreur",
      description: error.message || "Impossible de s'inscrire au tournoi",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

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
      logger.error("Erreur mise à jour score:", error);
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const finishMatch = async (matchId: string) => {
    if (!currentTournament || !userProfile) return;
    
    const match = currentTournament.matches[matchId];
    if (!match) return;

    if (match.score1 === match.score2) {
      toast({
        title: "Score invalide",
        description: "Le match ne peut pas se terminer par une égalité",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm(`✅ Terminer le match ${match.team1.playerNames[0]} vs ${match.team2.playerNames[0]} ?`)) return;
    
    try {
      setIsLoading(true);
      const result = await finishMatchSafe(matchId, user!.uid);
      
      if (result.success) {
        toast({
          title: "Match terminé! 🏁",
          description: `Score final: ${match.score1} - ${match.score2}`,
        });
        await loadTournamentData();
        
        // Vérifier si le round est terminé
        const completion = await checkRoundCompletion();
        if (completion.isComplete && completion.winnersCount > 1) {
          setTimeout(() => {
            if (confirm(`🎊 Round terminé! ${completion.winnersCount} gagnants. Créer le prochain round ?`)) {
              createNextRound();
            }
          }, 1000);
        } else if (completion.winnersCount === 1) {
          toast({
            title: "🏆 TOURNOI TERMINÉ!",
            description: "Le vainqueur a été déterminé!",
          });
        }
      } else {
        toast({
          title: "Erreur",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      logger.error("Erreur fin de match:", error);
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNextRound = async () => {
    if (!user || !currentTournament) return;

    try {
      setIsLoading(true);
      const result = await createNextRoundSafe("active", user.uid);

      if (result.success) {
        toast({
          title: `🎮 Round ${result.newRound} créé!`,
          description: result.message,
        });
        await loadTournamentData();
      } else {
        toast({
          title: "Erreur",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      logger.error("Erreur création round:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startTournament = async () => {
    if (!currentTournament || !user) {
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
      
      // Mélanger les joueurs
      for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
      }
      
      // Créer les matchs
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
              partnerId: player1.partnerId ?? null,
              partnerName: player1.partnerUsername ?? null,
            },
            team2: {
              playerIds: [player2.userId],
              playerNames: [player2.username],
              partnerId: player2.partnerId ?? null,
              partnerName: player2.partnerUsername ?? null,
            },
            status: "pending",
            startTime: Date.now(),
            score1: 0,
            score2: 0,
          });
        }
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
      logger.error("Erreur lancement tournoi:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Grouper les matchs par round
  const getMatchesByRound = () => {
    if (!currentTournament?.matches) return {};
    
    const matchesByRound: { [key: number]: TournamentMatch[] } = {};
    Object.values(currentTournament.matches).forEach((match) => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
    
    return matchesByRound;
  };

  // Calculer le classement en temps réel
  const getLeaderboard = () => {
    if (!currentTournament) return [];
    
    // ✅ CORRECTION: Vérifier que players existe et est un tableau
    if (!currentTournament.players || !Array.isArray(currentTournament.players)) {
      return [];
    }

    const playerStats: { [key: string]: { name: string; wins: number; elo: number } } = {};

    // Initialiser tous les joueurs
    currentTournament.players.forEach(player => {
      playerStats[player.userId] = {
        name: player.username + (player.partnerUsername ? ` & ${player.partnerUsername}` : ''),
        wins: 0,
        elo: player.eloRating,
      };
    });

    // Compter les victoires
    if (currentTournament.matches && typeof currentTournament.matches === 'object') {
      Object.values(currentTournament.matches).forEach((match) => {
        if (match.status === 'completed' && match.winnerId) {
          if (playerStats[match.winnerId]) {
            playerStats[match.winnerId].wins++;
          }
        }
      });
    }

    // Trier par victoires puis ELO
    const sorted = Object.entries(playerStats)
      .map(([id, stats]) => ({ ...stats, id }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.elo - a.elo;
      })
      .slice(0, 10);

    // Ajouter les gains potentiels
    return sorted.map((player, index) => ({
      ...player,
      rank: index + 1,
      prize: index === 0 ? Math.floor(currentTournament.prizePool * 0.5) :
             index === 1 ? Math.floor(currentTournament.prizePool * 0.3) :
             index === 2 ? Math.floor(currentTournament.prizePool * 0.2) : 0,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/30";
      case "in_progress": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "pending": return "bg-gray-500/10 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const MatchCard = ({ match, matchKey }: { match: TournamentMatch; matchKey: string }) => {
    const isAdmin = userProfile && (userProfile.role === "admin" || userProfile.role === "agent");
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 border border-slate-700 hover:border-blue-500/50 transition-all"
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(match.status)}`}>
            {match.status === "completed" ? "✅ Terminé" : 
             match.status === "in_progress" ? "🎮 En cours" : "⏳ À venir"}
          </span>
          <span className="text-xs text-slate-400">Round {match.round}</span>
        </div>

        <div className="space-y-3">
          {/* Team 1 */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            match.winnerId === match.team1.playerIds[0] ? "bg-blue-500/20 border border-blue-500/50" : "bg-slate-800/50"
          }`}>
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold ${
                match.winnerId === match.team1.playerIds[0] ? "ring-2 ring-blue-500" : ""
              }`}>
                {match.team1.playerNames[0][0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {match.team1.playerNames[0]}
                  {match.team1.partnerName && ` & ${match.team1.partnerName}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && match.status !== "completed" && (
                <>
                  <button
                    onClick={() => updateMatchScore(matchKey, 'team1', Math.max(0, match.score1 - 1))}
                    disabled={match.score1 <= 0 || isLoading}
                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{match.score1}</span>
                  <button
                    onClick={() => updateMatchScore(matchKey, 'team1', match.score1 + 1)}
                    disabled={isLoading}
                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold"
                  >
                    +
                  </button>
                </>
              )}
              {match.status === "completed" && (
                <span className={`text-3xl font-bold ${match.winnerId === match.team1.playerIds[0] ? 'text-blue-400' : 'text-slate-600'}`}>
                  {match.score1}
                </span>
              )}
            </div>
          </div>

          <div className="text-center text-slate-500 font-bold text-sm">VS</div>

          {/* Team 2 */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            match.winnerId === match.team2.playerIds[0] ? "bg-blue-500/20 border border-blue-500/50" : "bg-slate-800/50"
          }`}>
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold ${
                match.winnerId === match.team2.playerIds[0] ? "ring-2 ring-blue-500" : ""
              }`}>
                {match.team2.playerNames[0][0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {match.team2.playerNames[0]}
                  {match.team2.partnerName && ` & ${match.team2.partnerName}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && match.status !== "completed" && (
                <>
                  <button
                    onClick={() => updateMatchScore(matchKey, 'team2', Math.max(0, match.score2 - 1))}
                    disabled={match.score2 <= 0 || isLoading}
                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{match.score2}</span>
                  <button
                    onClick={() => updateMatchScore(matchKey, 'team2', match.score2 + 1)}
                    disabled={isLoading}
                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold"
                  >
                    +
                  </button>
                </>
              )}
              {match.status === "completed" && (
                <span className={`text-3xl font-bold ${match.winnerId === match.team2.playerIds[0] ? 'text-blue-400' : 'text-slate-600'}`}>
                  {match.score2}
                </span>
              )}
            </div>
          </div>
        </div>

        {isAdmin && match.status !== "completed" && (
          <button
            onClick={() => finishMatch(matchKey)}
            disabled={isLoading}
            className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "🏁 Terminer le match"}
          </button>
        )}

        {match.status === "completed" && match.winnerId && (
          <div className="mt-3 text-center p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
            <p className="text-sm font-semibold text-blue-400 flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4" />
              {match.winnerId === match.team1.playerIds[0] ? match.team1.playerNames[0] : match.team2.playerNames[0]} remporte le match !
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  const leaderboard = getLeaderboard();
  const matchesByRound = getMatchesByRound();
  const totalRounds = Object.keys(matchesByRound).length;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-8xl mb-4"
            >
              🏆
            </motion.div>
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Tournoi Quotidien
            </h1>
            <p className="text-slate-400 text-lg">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            {currentTournament?.status && (
              <div className="mt-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                  currentTournament.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                  currentTournament.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                  'bg-gray-500/10 text-gray-400 border-gray-500/30'
                }`}>
                  {currentTournament.status === 'in_progress' ? '🎮 En cours' : 
                   currentTournament.status === 'completed' ? '✅ Terminé' : '⏳ En attente'}
                </span>
              </div>
            )}
          </motion.div>

          {/* Stats rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-6 border border-blue-500/20"
            >
              <Clock className="h-8 w-8 text-blue-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">
                {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </p>
              <p className="text-sm text-slate-400">Temps restant</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-6 border border-purple-500/20"
            >
              <Users className="h-8 w-8 text-purple-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">{currentTournament?.players.length || 0}</p>
              <p className="text-sm text-slate-400">Participants</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-xl p-6 border border-yellow-500/20"
            >
              <Trophy className="h-8 w-8 text-yellow-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">{currentTournament?.prizePool || 0}€</p>
              <p className="text-sm text-slate-400">Cagnotte totale</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 rounded-xl p-6 border border-pink-500/20"
            >
              <TrendingUp className="h-8 w-8 text-pink-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">
                Round {currentTournament?.currentRound || 0}/{totalRounds || 0}
              </p>
              <p className="text-sm text-slate-400">Progression</p>
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
  {[
    { view: "overview", icon: "📊", label: "Vue" },
    { view: "matches", icon: "🎮", label: "Matchs" },
    { view: "leaderboard", icon: "🏅", label: "Classement" }
  ].map(({ view, icon, label }) => (
    <button
      key={view}
      onClick={() => setCurrentView(view as any)}
      className={`py-3 px-2 rounded-lg font-semibold transition-all ${
        currentView === view
          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
          : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      <span className="hidden sm:inline">{icon} {label}</span>
      <span className="sm:hidden text-xl">{icon}</span>
    </button>
  ))}
</div>

          {/* Contenu selon la vue */}
          <AnimatePresence mode="wait">
            {currentView === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Bannière d'inscription */}
                {!isRegistered && currentTournament?.status !== 'in_progress' && currentTournament?.status !== 'completed' && currentTournament && (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 sm:p-8 border border-white/10 relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
    <div className="relative">
      <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 text-white mb-3 sm:mb-4" />
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Rejoignez le tournoi !</h2>
      <p className="text-white/90 mb-4 sm:mb-6 text-base sm:text-lg">
        Participez seul ou en duo et tentez de remporter la cagnotte de {currentTournament?.prizePool || 0}€
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowRegisterModal(true)}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-purple-600 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Chargement..." : "S'inscrire maintenant"}
        </button>
        <button 
          onClick={() => setShowRulesDialog(true)}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold hover:bg-white/20 transition-all border border-white/20"
        >
          Voir les règles
        </button>
      </div>
    </div>
  </motion.div>
)}

                {/* Message si pas de tournoi actif */}
                {!currentTournament && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-2xl p-8 border border-orange-500/30 text-center"
                  >
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-white" />
                    <h2 className="text-2xl font-bold text-white mb-2">Aucun tournoi actif</h2>
                    <p className="text-white/90 mb-4">
                      Un administrateur doit créer le tournoi du jour depuis le panneau admin.
                    </p>
                    {userProfile && (userProfile.role === "admin" || userProfile.role === "agent") && (
                      <button
                        onClick={async () => {
                          if (!user) return;
                          try {
                            setIsLoading(true);
                            const newTournament = {
                              id: "active",
                              startTime: Date.now(),
                              endTime: 0,
                              isActive: true,
                              players: [],
                              matches: {},
                              winners: [],
                              prizePool: 0,
                              status: "waiting",
                              currentRound: 0,
                              organizerId: user.uid,
                            };
                            await set(ref(database, "tournaments/active"), newTournament);
                            toast({
                              title: "Tournoi créé ! 🎮",
                              description: "Les joueurs peuvent maintenant s'inscrire",
                            });
                            await loadTournamentData();
                          } catch (error: any) {
                            toast({
                              title: "Erreur",
                              description: error.message,
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                        className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Création...
                          </span>
                        ) : (
                          "Créer le tournoi"
                        )}
                      </button>
                    )}
                  </motion.div>
                )}

                {isRegistered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 rounded-2xl p-8 border border-green-500/30"
                  >
                    <div className="text-center">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-white" />
                      <h2 className="text-3xl font-bold text-white mb-2">Vous êtes inscrit ! ✅</h2>
                      <p className="text-white/90 text-lg">Bonne chance pour le tournoi</p>
                    </div>
                  </motion.div>
                )}

                {/* Bouton admin pour lancer le tournoi */}
                {userProfile && (userProfile.role === "admin" || userProfile.role === "agent") && 
                 currentTournament && currentTournament.status === "waiting" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-2xl p-6 border border-orange-500/30"
                  >
                    <h3 className="text-xl font-bold text-white mb-4">🎮 Panel Organisateur</h3>
                    <button
                      onClick={startTournament}
                      disabled={isLoading || (currentTournament?.players.length || 0) < 2}
                      className="w-full px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Lancement...
                        </span>
                      ) : (
                        `Lancer le tournoi (${currentTournament?.players.length || 0} joueurs)`
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Informations du tournoi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-400" />
                      Informations
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-400">Horaires</span>
                        <span className="font-semibold">13h00 - 14h15</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-400">Durée des matchs</span>
                        <span className="font-semibold">5 minutes</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-400">Format</span>
                        <span className="font-semibold">Élimination directe</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-400">Inscription</span>
                        <span className="font-semibold text-blue-400">50€ solo / 25€ duo</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-400" />
                      Récompenses
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-lg border border-yellow-500/30">
                        <div className="flex items-center gap-2">
                          <Medal className="h-5 w-5 text-yellow-400" />
                          <span className="font-semibold">1er place</span>
                        </div>
                        <span className="font-bold text-yellow-400">
                          {currentTournament ? Math.floor(currentTournament.prizePool * 0.5) : 0}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-500/20 to-slate-600/20 rounded-lg border border-slate-500/30">
                        <div className="flex items-center gap-2">
                          <Medal className="h-5 w-5 text-slate-400" />
                          <span className="font-semibold">2ème place</span>
                        </div>
                        <span className="font-bold text-slate-400">
                          {currentTournament ? Math.floor(currentTournament.prizePool * 0.3) : 0}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg border border-orange-500/30">
                        <div className="flex items-center gap-2">
                          <Medal className="h-5 w-5 text-orange-400" />
                          <span className="font-semibold">3ème place</span>
                        </div>
                        <span className="font-bold text-orange-400">
                          {currentTournament ? Math.floor(currentTournament.prizePool * 0.2) : 0}€
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progression du tournoi */}
                {currentTournament && totalRounds > 0 && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold mb-4">Progression du tournoi</h3>
                    <div className="flex items-center gap-4">
                      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
                        <div key={round} className="flex-1 flex items-center gap-2">
                          <div className={`w-full h-3 rounded-full ${
                            round < (currentTournament.currentRound || 1) ? "bg-green-500" :
                            round === (currentTournament.currentRound || 1) ? "bg-blue-500 animate-pulse" :
                            "bg-slate-700"
                          }`}></div>
                          {round < totalRounds && <ArrowRight className="h-5 w-5 text-slate-600 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2">
                      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
                        <p key={round} className="text-xs text-slate-400 flex-1 text-center">
                          Round {round}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Liste des participants */}
                {currentTournament && currentTournament.players.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold mb-4">
                      Participants ({currentTournament.players.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {currentTournament.players.map((player, index) => (
                        <motion.div
                          key={player.userId}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 rounded-lg ${
                            player.userId === user?.uid
                              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50"
                              : "bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold">
                              {player.username[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{player.username}</p>
                              {player.partnerUsername && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  avec {player.partnerUsername}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <Zap className="h-3 w-3" />
                                {player.eloRating} ELO
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentView === "matches" && (
              <motion.div
                key="matches"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {Object.keys(matchesByRound).length > 0 ? (
                  <>
                    <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                      {Object.keys(matchesByRound).sort((a, b) => Number(b) - Number(a)).map((round) => (
                        <button
                          key={round}
                          onClick={() => setSelectedRound(Number(round))}
                          className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                            selectedRound === Number(round)
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                              : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                          }`}
                        >
                          Round {round}
                          {Number(round) === currentTournament?.currentRound && (
                            <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {matchesByRound[selectedRound]?.map((match) => {
                        const matchKey = Object.keys(currentTournament?.matches || {}).find(
                          key => currentTournament?.matches[key].id === match.id
                        );
                        return matchKey ? (
                          <MatchCard key={match.id} match={match} matchKey={matchKey} />
                        ) : null;
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                    <p className="text-xl text-slate-400">Aucun match pour le moment</p>
                    <p className="text-sm text-slate-500 mt-2">Les matchs apparaîtront une fois le tournoi lancé</p>
                  </div>
                )}
              </motion.div>
            )}

            {currentView === "leaderboard" && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700"
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  Classement
                </h3>
                {leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center justify-between p-4 rounded-xl ${
                          player.rank === 1 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30" :
                          player.rank === 2 ? "bg-gradient-to-r from-slate-500/20 to-slate-600/20 border border-slate-500/30" :
                          player.rank === 3 ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30" :
                          "bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            player.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" :
                            player.rank === 2 ? "bg-gradient-to-br from-slate-400 to-slate-600 text-white" :
                            player.rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" :
                            "bg-slate-700 text-slate-300"
                          }`}>
                            #{player.rank}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{player.name}</p>
                            <p className="text-sm text-slate-400 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {player.wins} victoire{player.wins > 1 ? 's' : ''}
                              <span className="ml-2 flex items-center gap-1">
                                <Zap className="h-4 w-4" />
                                {player.elo}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-400">{player.prize}€</p>
                          <p className="text-xs text-slate-400">Gains potentiels</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Medal className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                    <p className="text-xl text-slate-400">Aucun classement disponible</p>
                    <p className="text-sm text-slate-500 mt-2">Le classement apparaîtra une fois les matchs commencés</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal d'inscription */}
          <AnimatePresence>
            {showRegisterModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowRegisterModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
                >
                  <h2 className="text-2xl font-bold mb-6">Inscription au Tournoi</h2>
                  
                  <div className="mb-6">
                    <p className="text-slate-400 mb-2">Votre fortune : <span className="font-bold text-white">{fortune}€</span></p>
                    <p className="text-slate-400 mb-4">
                      Choisissez votre mode de jeu :
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setPlayMode("solo")}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          playMode === "solo"
                            ? "border-blue-500 bg-blue-500/20"
                            : "border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <Trophy className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                        <p className="font-bold mb-1">Solo</p>
                        <p className="text-sm text-slate-400">50€</p>
                      </button>
                      <button
                        onClick={() => setPlayMode("duo")}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          playMode === "duo"
                            ? "border-purple-500 bg-purple-500/20"
                            : "border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <Users className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                        <p className="font-bold mb-1">Duo</p>
                        <p className="text-sm text-slate-400">25€ / joueur</p>
                      </button>
                    </div>
                  </div>

                  {playMode === "duo" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6"
                    >
                      <label className="block text-sm font-semibold mb-2">Rechercher un partenaire</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-slate-400 z-10" />
                        )}
                        <input
                          type="text"
                          value={partnerSearch}
                          onChange={(e) => setPartnerSearch(e.target.value)}
                          placeholder="Nom du joueur..."
                          className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-white"
                        />
                      </div>
                      
                      {partnerSearch.length >= 2 && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 space-y-2 max-h-48 overflow-y-auto"
                        >
                          {suggestions.map((partner) => (
                            <button
                              key={partner.id}
                              onClick={() => setPartnerSearch(partner.username)}
                              className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-all text-left"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">{partner.username}</p>
                                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                    <Zap className="h-3 w-3" />
                                    {partner.eloRating} ELO
                                    <span className="ml-2">💰 {partner.fortune}€</span>
                                  </p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}

                      {partnerSearch.length > 0 && partnerSearch.length < 2 && (
                        <p className="text-xs text-slate-400 mt-2">
                          Tapez au moins 2 lettres pour rechercher
                        </p>
                      )}
                    </motion.div>
                  )}

                  <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Frais d'inscription</span>
                      <span className="font-bold text-blue-400">
                        {playMode === "solo" ? "50€" : "25€"}
                      </span>
                    </div>
                    {fortune < (playMode === "solo" ? ENTRY_FEE_SOLO : ENTRY_FEE_DUO) && (
                      <p className="text-xs text-red-400 mt-2">
                        ⚠️ Vous n'avez pas assez de fortune pour participer
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRegisterModal(false)}
                      className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleRegister}
                      disabled={
                        isLoading || 
                        fortune < (playMode === "solo" ? ENTRY_FEE_SOLO : ENTRY_FEE_DUO) ||
                        (playMode === "duo" && !partnerSearch.trim())
                      }
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Inscription...
                        </span>
                      ) : (
                        "Confirmer"
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal des règles */}
          <AnimatePresence>
            {showRulesDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowRulesDialog(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <AlertCircle className="h-6 w-6 text-blue-400" />
                    <h2 className="text-2xl font-bold">Règles du Tournoi</h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-400" />
                        Horaires
                      </h3>
                      <p className="text-slate-300">
                        Le tournoi se déroule tous les jours de <strong className="text-white">13h00 à 14h15</strong> (1h15 de compétition)
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-400" />
                        Modes de jeu
                      </h3>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span><strong className="text-white">Solo :</strong> Affrontez les autres joueurs individuellement (50€)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-1">•</span>
                          <span><strong className="text-white">Duo :</strong> Formez une équipe avec un partenaire (25€ par personne)</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-400" />
                        Déroulement
                      </h3>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span>Chaque match dure exactement <strong className="text-white">5 minutes</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span>Les matchs sont organisés en <strong className="text-white">élimination directe</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span>Le gagnant de chaque match passe au round suivant</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span>Le tournoi continue jusqu'à ce qu'il ne reste qu'un seul vainqueur</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-400" />
                        Récompenses
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                          <span className="flex items-center gap-2">
                            <Medal className="h-4 w-4 text-yellow-400" />
                            <span className="font-semibold text-yellow-400">1er place</span>
                          </span>
                          <span className="font-bold text-yellow-400">50% de la cagnotte</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-500/10 rounded-lg border border-slate-500/30">
                          <span className="flex items-center gap-2">
                            <Medal className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-400">2ème place</span>
                          </span>
                          <span className="font-bold text-slate-400">30% de la cagnotte</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                          <span className="flex items-center gap-2">
                            <Medal className="h-4 w-4 text-orange-400" />
                            <span className="font-semibold text-orange-400">3ème place</span>
                          </span>
                          <span className="font-bold text-orange-400">20% de la cagnotte</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-pink-400" />
                        Bonus
                      </h3>
                      <p className="text-slate-300">
                        Les bonus de club sont actifs pendant le tournoi !
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowRulesDialog(false)}
                    className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-semibold transition-all"
                  >
                    J'ai compris
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tournoi terminé */}
          {currentTournament?.status === 'completed' && currentTournament.winners.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                className="bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-600 rounded-2xl p-12 border border-yellow-400/50 text-center max-w-lg"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-9xl mb-6"
                >
                  🏆
                </motion.div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  Tournoi terminé !
                </h2>
                <p className="text-xl text-white/90 mb-6">
                  Félicitations au vainqueur ! 🎉
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-6">
                  <p className="text-5xl font-bold text-white mb-2">
                    {Math.floor(currentTournament.prizePool * 0.5)}€
                  </p>
                  <p className="text-white/80">Gain du vainqueur</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-4 bg-white text-yellow-600 rounded-xl font-bold hover:scale-105 transition-transform"
                >
                  Retour à l'accueil
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Tournament;
