import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, Users, Play, Trophy, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { 
  createMatchForBetting,
  getOpenMatches,
  getAvailablePlayers,
  placeBet,
  startMatch,
  finishMatch,
  onMatchUpdate,
  MatchWithBetting 
} from "@/lib/firebaseMatch";

type Player = { id: string; username: string; eloRating: number };

const BettingMatches = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchWithBetting[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [agentFortune, setAgentFortune] = useState(0);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [team1Ids, setTeam1Ids] = useState<string[]>([]);
  const [team2Ids, setTeam2Ids] = useState<string[]>([]);
  
  const [betAmounts, setBetAmounts] = useState<{ [matchId: string]: number }>({});
  const [betTeams, setBetTeams] = useState<{ [matchId: string]: 1 | 2 }>({});
  
  const [finishDialogMatch, setFinishDialogMatch] = useState<string | null>(null);
  const [finalScore1, setFinalScore1] = useState(0);
  const [finalScore2, setFinalScore2] = useState(0);

  useEffect(() => {
    loadData();
    loadAgentFortune();
  }, [user]);

  const loadAgentFortune = async () => {
    if (!user) return;
    
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        setAgentFortune(snapshot.val().fortune || 0);
      }
    } catch (error) {
      console.error("Erreur chargement fortune:", error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [matchesData, playersData] = await Promise.all([
        getOpenMatches(),
        getAvailablePlayers()
      ]);
      setMatches(matchesData);
      setAvailablePlayers(playersData);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!user || team1Ids.length === 0 || team2Ids.length === 0) {
      toast({
        title: "Erreur",
        description: "Sélectionnez au moins 1 joueur par équipe",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      await createMatchForBetting(team1Ids, team2Ids, user.uid);
      toast({
        title: "Match créé! 🎮",
        description: "Les paris sont ouverts"
      });
      setShowCreateDialog(false);
      setTeam1Ids([]);
      setTeam2Ids([]);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePlaceBet = async (matchId: string) => {
    if (!user || !userProfile) return;
    
    const amount = betAmounts[matchId];
    const team = betTeams[matchId];
    
    if (!amount || amount <= 0 || !team) {
      toast({
        title: "Erreur",
        description: "Montant ou équipe invalide",
        variant: "destructive"
      });
      return;
    }

    try {
      await placeBet(matchId, user.uid, userProfile.username, amount, team);
      toast({
        title: "Pari placé! 💰",
        description: `${amount}€ sur l'équipe ${team}`
      });
      loadData();
      loadAgentFortune();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleStartMatch = async (matchId: string) => {
    try {
      await startMatch(matchId);
      toast({
        title: "Match démarré! ⚽",
        description: "Les paris sont fermés"
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleFinishMatch = async () => {
    if (!finishDialogMatch) return;
    
    if (finalScore1 === finalScore2) {
      toast({
        title: "Erreur",
        description: "Match nul interdit",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await finishMatch(finishDialogMatch, finalScore1, finalScore2);
      
      toast({
        title: "Match terminé! 🏆",
        description: `${Object.keys(result.winnings).length} gagnants`
      });
      
      setFinishDialogMatch(null);
      setFinalScore1(0);
      setFinalScore2(0);
      loadData();
      loadAgentFortune();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const togglePlayer = (playerId: string, team: 1 | 2) => {
    const ids1 = team === 1 ? team1Ids : team2Ids;
    const ids2 = team === 1 ? team2Ids : team1Ids;
    const setter1 = team === 1 ? setTeam1Ids : setTeam2Ids;
    const setter2 = team === 1 ? setTeam2Ids : setTeam1Ids;

    if (ids2.includes(playerId)) {
      setter2(ids2.filter(id => id !== playerId));
    }

    if (ids1.includes(playerId)) {
      setter1(ids1.filter(id => id !== playerId));
    } else if (ids1.length < 2) {
      setter1([...ids1, playerId]);
    }
  };

  // ✅ FIX: Nouvelle formule de calcul des cotes basée sur la distribution proportionnelle
  const calculateOdds = (match: MatchWithBetting) => {
  const total = match.totalBetsTeam1 + match.totalBetsTeam2;
  
  // Si aucune mise, cotes par défaut
  if (total === 0) return { odds1: "2.00", odds2: "2.00" };
  
  // ✅ FORMULE CORRECTE:
  // Si l'équipe 1 a 50€ et l'équipe 2 a 50€:
  // - Cote équipe 1 = (50 + 50) / 50 = 2.00
  // - Si je mise 10€ sur équipe 1 qui gagne: je récupère 10 × 2.00 = 20€
  // - Profit = 20€ - 10€ = 10€ (ma part du pot perdant)
  
  // Si l'équipe 1 a 80€ et l'équipe 2 a 20€:
  // - Cote équipe 1 = 100 / 80 = 1.25 (favorite)
  // - Cote équipe 2 = 100 / 20 = 5.00 (outsider)
  // - Si je mise 10€ sur équipe 2 qui gagne: 10 × 5.00 = 50€
  
  const odds1 = match.totalBetsTeam1 === 0 
    ? total.toFixed(2) // Si personne n'a misé sur équipe 1, cote = tout le pot
    : (total / match.totalBetsTeam1).toFixed(2);
  
  const odds2 = match.totalBetsTeam2 === 0 
    ? total.toFixed(2) // Si personne n'a misé sur équipe 2, cote = tout le pot
    : (total / match.totalBetsTeam2).toFixed(2);
  
  return { odds1, odds2 };
};

// ✅ EXPLICATION DU SYSTÈME:
// 
// 1. Distribution proportionnelle (Pari Mutuel)
//    - Tous les paris vont dans un pot commun
//    - Les gagnants se partagent le pot proportionnellement à leurs mises
//
// 2. Calcul du gain:
//    Gain = Mise × Cote
//    Profit = Gain - Mise
//
// 3. Exemple concret:
//    Équipe 1: 80€ de mises (80% des paris)
//    Équipe 2: 20€ de mises (20% des paris)
//    Total: 100€
//
//    Si l'équipe 1 gagne:
//    - Cote = 100 / 80 = 1.25
//    - Chaque euro misé sur équipe 1 rapporte 1.25€
//    - Profit par euro = 0.25€ (25% de gain)
//
//    Si l'équipe 2 gagne:
//    - Cote = 100 / 20 = 5.00
//    - Chaque euro misé sur équipe 2 rapporte 5€
//    - Profit par euro = 4€ (400% de gain!)


  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/match')}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="rounded-xl bg-primary/20 p-3">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Paris</h1>
            <p className="text-sm text-muted-foreground">
              {agentFortune.toLocaleString()}€ disponibles
            </p>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="neon">
              <Plus className="h-4 w-4 mr-2" />
              Créer Match
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un match avec paris</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="font-semibold text-primary">Équipe 1 ({team1Ids.length}/2)</label>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {availablePlayers.map(p => (
                    <div
                      key={p.id}
                      onClick={() => togglePlayer(p.id, 1)}
                      className={`p-2 rounded cursor-pointer transition ${
                        team1Ids.includes(p.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface-alt hover:bg-surface-alt/70'
                      }`}
                    >
                      {p.username} ({p.eloRating})
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-semibold text-red-500">Équipe 2 ({team2Ids.length}/2)</label>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {availablePlayers.map(p => (
                    <div
                      key={p.id}
                      onClick={() => togglePlayer(p.id, 2)}
                      className={`p-2 rounded cursor-pointer transition ${
                        team2Ids.includes(p.id)
                          ? 'bg-red-500 text-white'
                          : 'bg-surface-alt hover:bg-surface-alt/70'
                      }`}
                    >
                      {p.username} ({p.eloRating})
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button
              onClick={handleCreateMatch}
              disabled={isCreating || team1Ids.length === 0 || team2Ids.length === 0}
              className="w-full mt-4"
              variant="neon"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
            </Button>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="space-y-4">
        {matches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucun match disponible
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ✅ FIX: Info Card corrigée */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/20 p-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1">
                      💡 Système de cotes
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Distribution proportionnelle: vous récupérez votre mise + votre part des pertes adverses.
                      Plus l'équipe est favorite (plus de mises), plus la cote est basse. Pariez sur l'outsider pour des gains maximums !
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {matches.map((match, idx) => {
            const odds = calculateOdds(match);
            const userBet = user ? match.bets?.[user.uid] : null;
            
            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        {match.team1Names.join(" & ")} vs {match.team2Names.join(" & ")}
                      </CardTitle>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          match.status === "open"
                            ? "bg-green-500/20 text-green-500"
                            : match.status === "playing"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-gray-500/20 text-gray-500"
                        }`}
                      >
                        {match.status === "open"
                          ? "Paris ouverts"
                          : match.status === "playing"
                          ? "En cours"
                          : "Terminé"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p className="text-sm text-muted-foreground">Équipe 1</p>
                        <p className="text-2xl font-bold text-primary">{match.totalBetsTeam1}€</p>
                        <p className="text-xs text-muted-foreground">Cote: x{odds.odds1}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10">
                        <p className="text-sm text-muted-foreground">Équipe 2</p>
                        <p className="text-2xl font-bold text-red-500">{match.totalBetsTeam2}€</p>
                        <p className="text-xs text-muted-foreground">Cote: x{odds.odds2}</p>
                      </div>
                    </div>

                    {userBet && (
                      <div className="p-3 rounded-lg bg-accent/10 border border-accent">
                        <p className="text-sm">
                          Votre pari: <span className="font-bold">{userBet.amount}€</span> sur{" "}
                          <span className="font-bold">Équipe {userBet.teamBet}</span>
                        </p>
                      </div>
                    )}

                    {match.status === "open" && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Montant (€)"
                          value={betAmounts[match.id] || ""}
                          onChange={(e) =>
                            setBetAmounts({ ...betAmounts, [match.id]: Number(e.target.value) })
                          }
                        />
                        <Button
                          variant={betTeams[match.id] === 1 ? "default" : "outline"}
                          onClick={() => {
                            setBetTeams({ ...betTeams, [match.id]: 1 });
                            handlePlaceBet(match.id);
                          }}
                        >
                          Équipe 1
                        </Button>
                        <Button
                          variant={betTeams[match.id] === 2 ? "destructive" : "outline"}
                          onClick={() => {
                            setBetTeams({ ...betTeams, [match.id]: 2 });
                            handlePlaceBet(match.id);
                          }}
                        >
                          Équipe 2
                        </Button>
                      </div>
                    )}

                    {match.status === "open" && match.createdBy === user?.uid && (
                      <Button onClick={() => handleStartMatch(match.id)} variant="neon" className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Démarrer le match
                      </Button>
                    )}

                    {match.status === "playing" && match.createdBy === user?.uid && (
                      <Dialog
                        open={finishDialogMatch === match.id}
                        onOpenChange={(open) => setFinishDialogMatch(open ? match.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="neon" className="w-full">
                            <Trophy className="h-4 w-4 mr-2" />
                            Terminer le match
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Entrer les scores</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="text-sm text-primary">Score Équipe 1</label>
                              <Input
                                type="number"
                                value={finalScore1}
                                onChange={(e) => setFinalScore1(Number(e.target.value))}
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-red-500">Score Équipe 2</label>
                              <Input
                                type="number"
                                value={finalScore2}
                                onChange={(e) => setFinalScore2(Number(e.target.value))}
                                min="0"
                              />
                            </div>
                          </div>
                          <Button onClick={handleFinishMatch} variant="neon" className="w-full mt-4">
                            Valider
                          </Button>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default BettingMatches;
