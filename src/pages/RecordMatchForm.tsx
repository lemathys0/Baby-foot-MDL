// src/pages/RecordMatchForm.tsx
import { useState, useEffect } from 'react';
import { Loader2, Zap, Users, Trophy, TrendingUp, TrendingDown, ArrowLeft, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { 
    recordMatch, 
    getAvailablePlayers,
    EloUpdate
} from "@/lib/firebaseMatch"; 

type Player = { 
    id: string; 
    username: string; 
    eloRating: number; 
};

const RecordMatchForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [team1Ids, setTeam1Ids] = useState<string[]>([]);
  const [team2Ids, setTeam2Ids] = useState<string[]>([]);
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [eloUpdates, setEloUpdates] = useState<EloUpdate[]>([]);
  const [showEloUpdates, setShowEloUpdates] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      setIsLoadingPlayers(true);
      try {
        const playersData = await getAvailablePlayers(); 
        // Mapper les données pour utiliser elo2v2 comme eloRating pour les matchs 2v2
        const mappedPlayers: Player[] = playersData.map(p => ({
          id: p.id,
          username: p.username,
          eloRating: p.elo2v2, // Utiliser elo2v2 pour les matchs 2v2
        }));
        setAvailablePlayers(mappedPlayers);
      } catch (error) {
        toast({
            title: "Erreur",
            description: "Impossible de charger la liste des joueurs.",
            variant: "destructive",
        });
      } finally {
        setIsLoadingPlayers(false);
      }
    };
    loadPlayers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
        toast({ 
          title: "Erreur", 
          description: "Vous devez être connecté.", 
          variant: "destructive" 
        });
        return;
    }

    if (team1Ids.length === 0 || team2Ids.length === 0) {
        toast({ 
          title: "Erreur", 
          description: "Veuillez sélectionner les joueurs des deux équipes.", 
          variant: "destructive" 
        });
        return;
    }

    if (score1 === score2) {
        toast({ 
          title: "Erreur", 
          description: "Le score final ne peut pas être une égalité.", 
          variant: "destructive" 
        });
        return;
    }

    // ✅ VALIDATION: Les scores doivent être >= 0 (0 est valide pour un match)
    if (score1 < 0 || score2 < 0 || !Number.isInteger(score1) || !Number.isInteger(score2)) {
        toast({ 
          title: "Erreur", 
          description: "Les scores doivent être des nombres entiers positifs.", 
          variant: "destructive" 
        });
        return;
    }

    const duplicates = team1Ids.filter(id => team2Ids.includes(id));
    if (duplicates.length > 0) {
        toast({ 
          title: "Erreur", 
          description: "Un joueur ne peut pas être dans les deux équipes.", 
          variant: "destructive" 
        });
        return;
    }

    setIsRecording(true);
    setShowEloUpdates(false);
    
    try {
      const result = await recordMatch(
        team1Ids,
        team2Ids,
        score1,
        score2,
        user.uid
      );

      const winner = score1 > score2 ? "Équipe 1" : "Équipe 2";
      
      setEloUpdates(result.eloUpdates);
      setShowEloUpdates(true);

      toast({
        title: "Match enregistré avec succès! 🏆",
        description: `${winner} a gagné. Les ELO ont été mis à jour.`,
        duration: 5000,
      });

      // Réinitialiser le formulaire
      setTeam1Ids([]);
      setTeam2Ids([]);
      setScore1(0);
      setScore2(0);

    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du match:", error);
      toast({
        title: "Erreur d'enregistrement",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };
  
  const togglePlayer = (playerId: string, team: 1 | 2) => {
    // Retirer le joueur de l'équipe adverse s'il y est
    if (team === 1 && team2Ids.includes(playerId)) {
      setTeam2Ids(team2Ids.filter(id => id !== playerId));
    }
    if (team === 2 && team1Ids.includes(playerId)) {
      setTeam1Ids(team1Ids.filter(id => id !== playerId));
    }

    const currentTeam = team === 1 ? team1Ids : team2Ids;
    const setter = team === 1 ? setTeam1Ids : setTeam2Ids;

    if (currentTeam.includes(playerId)) {
      // Désélectionner le joueur
      setter(currentTeam.filter(id => id !== playerId));
    } else {
      // Ajouter le joueur si la limite n'est pas atteinte
      if (currentTeam.length < 2) { 
        setter([...currentTeam, playerId]);
      } else {
         toast({ 
           title: "Limite atteinte", 
           description: "Maximum 2 joueurs par équipe.", 
           variant: "default" 
         });
      }
    }
  };

  // Obtenir le nom d'un joueur par son ID
  const getPlayerName = (playerId: string) => {
    return availablePlayers.find(p => p.id === playerId)?.username || 'Inconnu';
  };

  // Calculer l'ELO moyen d'une équipe
  const getTeamAvgElo = (teamIds: string[]) => {
    if (teamIds.length === 0) return 0;
    const totalElo = teamIds.reduce((sum, id) => {
      const player = availablePlayers.find(p => p.id === id);
      return sum + (player?.eloRating || 0);
    }, 0);
    return Math.round(totalElo / teamIds.length);
  };
  
  if (isLoadingPlayers) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Chargement des joueurs...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/match')}
            className="rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="rounded-xl bg-primary/20 p-2 sm:p-3">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Enregistrer un Match</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Match 2v2</p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Récapitulatif des équipes */}
        {(team1Ids.length > 0 || team2Ids.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-primary/30">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
                  {/* Équipe 1 */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Équipe 1</p>
                    <div className="space-y-1">
                      {team1Ids.length > 0 ? (
                        <>
                          {team1Ids.map(id => (
                            <div key={id} className="text-sm font-medium">{getPlayerName(id)}</div>
                          ))}
                          <p className="text-xs text-primary mt-2">ELO moyen: {getTeamAvgElo(team1Ids)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun joueur</p>
                      )}
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl font-bold text-primary">VS</div>
                  </div>

                  {/* Équipe 2 */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Équipe 2</p>
                    <div className="space-y-1">
                      {team2Ids.length > 0 ? (
                        <>
                          {team2Ids.map(id => (
                            <div key={id} className="text-sm font-medium">{getPlayerName(id)}</div>
                          ))}
                          <p className="text-xs text-red-500 mt-2">ELO moyen: {getTeamAvgElo(team2Ids)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun joueur</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Sélection des équipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {/* Équipe 1 */}
                  <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <label className="font-semibold text-lg flex items-center justify-between text-primary">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" /> Équipe 1
                      </span>
                      <span className="text-sm">({team1Ids.length}/2)</span>
                    </label>
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                      {availablePlayers.map(p => {
                          const isSelected = team1Ids.includes(p.id);
                          const isInOtherTeam = team2Ids.includes(p.id);
                          return (
                              <div
                                  key={p.id}
                                  onClick={() => togglePlayer(p.id, 1)}
                                  className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${
                                      isSelected 
                                          ? 'bg-primary text-primary-foreground font-bold shadow-md' 
                                          : isInOtherTeam
                                          ? 'bg-red-500/20 opacity-50 cursor-not-allowed'
                                          : 'bg-surface-alt hover:bg-surface-alt/70'
                                  }`}
                              >
                                  <span className="truncate">{p.username}</span>
                                  <span className={`text-sm ml-2 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                      {p.eloRating}
                                  </span>
                              </div>
                          );
                      })}
                    </div>
                  </div>

                  {/* Équipe 2 */}
                  <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                    <label className="font-semibold text-lg flex items-center justify-between text-red-500">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" /> Équipe 2
                      </span>
                      <span className="text-sm">({team2Ids.length}/2)</span>
                    </label>
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                      {availablePlayers.map(p => {
                          const isSelected = team2Ids.includes(p.id);
                          const isInOtherTeam = team1Ids.includes(p.id);
                          return (
                              <div
                                  key={p.id}
                                  onClick={() => togglePlayer(p.id, 2)}
                                  className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${
                                      isSelected 
                                          ? 'bg-red-500 text-primary-foreground font-bold shadow-md' 
                                          : isInOtherTeam
                                          ? 'bg-primary/20 opacity-50 cursor-not-allowed'
                                          : 'bg-surface-alt hover:bg-surface-alt/70'
                                  }`}
                              >
                                  <span className="truncate">{p.username}</span>
                                  <span className={`text-sm ml-2 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                      {p.eloRating}
                                  </span>
                              </div>
                          );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Scores */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <label htmlFor="score1" className="block text-sm font-medium text-primary">
                      Score Équipe 1
                    </label>
                    <Input 
                      id="score1"
                      type="number"
                      value={score1}
                      onChange={(e) => setScore1(Number(e.target.value))}
                      min="0"
                      required
                      className="text-lg font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="score2" className="block text-sm font-medium text-red-500">
                      Score Équipe 2
                    </label>
                    <Input 
                      id="score2"
                      type="number"
                      value={score2}
                      onChange={(e) => setScore2(Number(e.target.value))}
                      min="0"
                      required
                      className="text-lg font-bold"
                    />
                  </div>
                </div>
                
                {/* Boutons */}
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setTeam1Ids([]);
                      setTeam2Ids([]);
                      setScore1(0);
                      setScore2(0);
                    }}
                    disabled={isRecording}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Réinitialiser
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    variant="neon"
                    disabled={isRecording || team1Ids.length === 0 || team2Ids.length === 0}
                  >
                    {isRecording ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Trophy className="mr-2 h-4 w-4" />
                        Enregistrer le Match
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ELO Updates */}
        {showEloUpdates && eloUpdates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Mises à jour ELO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {eloUpdates.map((update) => (
                  <div 
                    key={update.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-alt"
                  >
                    <span className="font-medium">{update.username}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{update.oldElo}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-bold text-primary">{update.newElo}</span>
                      <span 
                        className={`flex items-center gap-1 font-semibold min-w-[80px] justify-end ${
                          update.eloChange > 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {update.eloChange > 0 ? (
                          <>
                            <TrendingUp className="h-4 w-4" />
                            +{update.eloChange}
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4" />
                            {update.eloChange}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default RecordMatchForm;
