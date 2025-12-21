import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Crown, TrendingUp, Gift, Plus, LogOut, Search, X, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { notifyAdminAnnouncement } from "@/lib/firebaseNotifications";
import { notifyFortuneReceived } from "@/lib/firebaseNotifications";
import { toast } from "@/hooks/use-toast";
import { ref, get, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import {
  createClub,
  joinClub,
  contributeToClub,
  buyClubBonus,
  leaveClub,
  onClubDataUpdate,
  type Club,
  type ClubMember,
} from "@/lib/firebaseExtended";

const CLUB_LOGOS = ["⚽", "🏆", "🔥", "⚡", "🎯", "🌟", "💎", "👑"];
const CLUB_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

const CLUB_BONUSES = [
  {
    id: "xpBoost",
    name: "Boost XP",
    description: "+20% d'ELO gagné",
    cost: 500,
    icon: "📈",
  },
  {
    id: "fortuneBoost",
    name: "Boost Fortune",
    description: "+15% de gains",
    cost: 750,
    icon: "💰",
  },
  {
    id: "premiumCards",
    name: "Cartes Premium",
    description: "Double chance de cartes rares",
    cost: 1000,
    icon: "🎴",
  },
];

const Clubs = () => {
  const { user, userProfile } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showContributeDialog, setShowContributeDialog] = useState(false);
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [fortune, setFortune] = useState(0);
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [isLoadingMyClub, setIsLoadingMyClub] = useState(true);

  // Create club form
  const [clubName, setClubName] = useState("");
  const [selectedLogo, setSelectedLogo] = useState(CLUB_LOGOS[0]);
  const [selectedColor, setSelectedColor] = useState(CLUB_COLORS[0]);
  const [contributionAmount, setContributionAmount] = useState("");

  // ✅ CORRECTION: Load user's club data with real-time sync
  useEffect(() => {
    if (!user) {
      setIsLoadingMyClub(false);
      return;
    }

    let unsubscribeClub: (() => void) | null = null;

    const userRef = ref(database, `users/${user.uid}`);
    
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        setIsLoadingMyClub(false);
        return;
      }

      const userData = snapshot.val();
      setFortune(userData.fortune || 0);
      
      // ✅ CORRECTION: Nettoyer l'ancien abonnement au club avant d'en créer un nouveau
      if (unsubscribeClub) {
        unsubscribeClub();
        unsubscribeClub = null;
      }
      
      if (userData.clubId) {
        // Utiliser onClubDataUpdate pour les mises à jour en temps réel
        unsubscribeClub = onClubDataUpdate(userData.clubId, (clubData) => {
          if (clubData) {
            setMyClub(clubData);
            
            // ✅ VALIDATION: Vérifier que members existe avant Object.values
            const membersArray: ClubMember[] = clubData.members && typeof clubData.members === 'object'
              ? Object.values(clubData.members)
              : [];
            setMembers(membersArray);
          } else {
            setMyClub(null);
            setMembers([]);
          }
          setIsLoadingMyClub(false);
        });
      } else {
        setMyClub(null);
        setMembers([]);
        setIsLoadingMyClub(false);
      }
    }, (error) => {
      console.error("Erreur chargement données utilisateur:", error);
      setIsLoadingMyClub(false);
    });

    // ✅ CORRECTION: Cleanup correct
    return () => {
      unsubscribeUser();
      if (unsubscribeClub) {
        unsubscribeClub();
      }
    };
  }, [user]);

  // Load available clubs for joining
  const loadAvailableClubs = async () => {
    setIsLoadingClubs(true);
    try {
      const clubsRef = ref(database, "clubs");
      const snapshot = await get(clubsRef);
      
      if (!snapshot.exists()) {
        setAvailableClubs([]);
        setIsLoadingClubs(false);
        return;
      }

      const clubsData = snapshot.val();
      
      const clubsList: Club[] = Object.entries(clubsData).map(([id, data]: [string, any]) => ({
        id,
        name: data.name || "Club sans nom",
        logo: data.logo || "🏆",
        color: data.color || "#3b82f6",
        founderId: data.founderId || "",
        treasury: data.treasury || 0,
        totalEarnings: data.totalEarnings || 0,
        members: data.members || {},
        bonuses: data.bonuses || {},
        createdAt: data.createdAt || Date.now(),
      }));
      
      // Filter by search term
      let filtered = clubsList;
      if (searchTerm.trim()) {
        filtered = clubsList.filter(club => 
          club.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setAvailableClubs(filtered);
    } catch (error) {
      console.error("Erreur chargement clubs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clubs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClubs(false);
    }
  };

  useEffect(() => {
    if (showJoinDialog) {
      loadAvailableClubs();
    }
  }, [showJoinDialog, searchTerm]);

  const handleCreateClub = async () => {
  if (!user || !userProfile) return;
  if (!clubName.trim()) {
    toast({
      title: "Erreur",
      description: "Veuillez entrer un nom de club",
      variant: "destructive",
    });
    return;
  }

  try {
    const clubId = await createClub(
      user.uid, 
      userProfile.username, 
      clubName, 
      selectedLogo, 
      selectedColor
    );
    
    // ✅ Notifier le fondateur
    await notifyAdminAnnouncement(
      user.uid,
      "🏆 Club créé avec succès",
      `Votre club "${clubName}" est maintenant actif. Invitez des membres !`
    ).catch(error => {
      console.error("Erreur notification création:", error);
    });
    
    toast({
      title: "Club créé! 🎉",
      description: `${clubName} a été créé avec succès`,
    });

    setShowCreateDialog(false);
    setClubName("");
    setSelectedLogo(CLUB_LOGOS[0]);
    setSelectedColor(CLUB_COLORS[0]);
  } catch (error: any) {
    console.error("Erreur création club:", error);
    toast({
      title: "Erreur",
      description: error.message || "Impossible de créer le club",
      variant: "destructive",
    });
  }
};

  const handleJoinClub = async (clubId: string, clubName: string) => {
    if (!user || !userProfile) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    try {
      // Vérifier que le club existe toujours
      const clubRef = ref(database, `clubs/${clubId}`);
      const clubSnapshot = await get(clubRef);
      
      if (!clubSnapshot.exists()) {
        toast({
          title: "Erreur",
          description: "Ce club n'existe plus",
          variant: "destructive",
        });
        await loadAvailableClubs();
        return;
      }

      // Vérifier que l'utilisateur n'est pas déjà dans un club
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists() && userSnapshot.val().clubId) {
        toast({
          title: "Erreur",
          description: "Vous êtes déjà dans un club. Quittez-le d'abord.",
          variant: "destructive",
        });
        return;
      }

      await joinClub(clubId, user.uid, userProfile.username);
      
      toast({
        title: "Club rejoint! 🎉",
        description: `Vous avez rejoint ${clubName}`,
      });

      setShowJoinDialog(false);
      setSearchTerm("");
    } catch (error: any) {
      console.error("Erreur rejoindre club:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejoindre le club",
        variant: "destructive",
      });
    }
  };

  const handleLeaveClub = async () => {
    if (!user || !myClub) return;

    if (myClub.founderId === user.uid) {
      toast({
        title: "Action impossible",
        description: "Le fondateur ne peut pas quitter le club",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir quitter ce club ? Vos contributions resteront dans la trésorerie."
    );

    if (!confirmed) return;

    try {
      await leaveClub(myClub.id, user.uid);
      
      toast({
        title: "Club quitté",
        description: "Vous avez quitté le club avec succès",
      });
    } catch (error: any) {
      console.error("Erreur quitter club:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de quitter le club",
        variant: "destructive",
      });
    }
  };

  const handleContribute = async () => {
    if (!user || !myClub) return;
    const amount = parseInt(contributionAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Montant invalide",
        variant: "destructive",
      });
      return;
    }

    if (amount > fortune) {
      toast({
        title: "Erreur",
        description: "Fonds insuffisants",
        variant: "destructive",
      });
      return;
    }

    try { 
      await contributeToClub(user.uid, myClub.id, amount);
      
      toast({
        title: "Contribution ajoutée! 💰",
        description: `${amount}€ ajoutés à la trésorerie`,
      });

      setShowContributeDialog(false);
      setContributionAmount("");
    } catch (error: any) {
      console.error("Erreur contribution:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de contribuer",
        variant: "destructive",
      });
    }
  };

  const handleBuyBonus = async (bonusId: string, cost: number) => {
  if (!myClub || !user) return;

  if ((myClub.treasury || 0) < cost) {
    toast({
      title: "Fonds insuffisants",
      description: "La trésorerie du club est insuffisante",
      variant: "destructive",
    });
    return;
  }

  try {
    // 1. Acheter le bonus
    await buyClubBonus(myClub.id, bonusId as any, cost);
    
    // 2. ✅ Notifier tous les membres du club
    if (myClub.members) {
      const bonusName = CLUB_BONUSES.find(b => b.id === bonusId)?.name || "Bonus";
      const memberIds = Object.keys(myClub.members);
      
      const notificationPromises = memberIds.map(memberId => 
        notifyAdminAnnouncement(
          memberId,
          "🎁 Nouveau bonus de club",
          `Le bonus "${bonusName}" est maintenant actif pour tous les membres !`
        ).catch(error => {
          console.error(`Erreur notification pour ${memberId}:`, error);
        })
      );
      
      // Envoyer toutes les notifications
      await Promise.allSettled(notificationPromises);
      
      toast({
        title: "Bonus acheté! 🎉",
        description: `${memberIds.length} membre(s) notifié(s)`,
      });
    } else {
      toast({
        title: "Bonus acheté! 🎉",
        description: "Le bonus est maintenant actif",
      });
    }
  } catch (error: any) {
    console.error("Erreur achat bonus:", error);
    toast({
      title: "Erreur",
      description: error.message || "Impossible d'acheter le bonus",
      variant: "destructive",
    });
  }
};
  // Fonction helper pour obtenir le nombre de membres
  const getMembersCount = (club: Club | null): number => {
    if (!club || !club.members) return 0;
    return Object.keys(club.members).length;
  };

  if (isLoadingMyClub) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!myClub) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="text-center p-8 sm:p-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Vous n'avez pas de club</h2>
            <p className="text-muted-foreground mb-6">
              Créez ou rejoignez un club pour profiter des bonus collectifs
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setShowCreateDialog(true)} size="lg" className="w-full sm:w-auto">
                <Plus className="h-5 w-5 mr-2" />
                Créer un club
              </Button>
              <Button onClick={() => setShowJoinDialog(true)} size="lg" variant="outline" className="w-full sm:w-auto">
                <Search className="h-5 w-5 mr-2" />
                Rejoindre un club
              </Button>
            </div>
          </Card>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-50"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fermer</span>
              </button>
              <DialogHeader>
                <DialogTitle>Créer un club</DialogTitle>
                <DialogDescription>Créez votre propre club et invitez d'autres joueurs à vous rejoindre.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nom du club</label>
                  <Input
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Les Champions"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Logo</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CLUB_LOGOS.map((logo) => (
                      <button
                        key={logo}
                        onClick={() => setSelectedLogo(logo)}
                        className={`text-4xl p-4 rounded-lg border-2 transition-all ${
                          selectedLogo === logo
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {logo}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Couleur</label>
                  <div className="grid grid-cols-6 gap-2">
                    {CLUB_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`h-12 rounded-lg border-2 transition-all ${
                          selectedColor === color
                            ? "border-white scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => setShowCreateDialog(false)} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleCreateClub} 
                    className="flex-1"
                  >
                    Créer le club
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <button
                onClick={() => setShowJoinDialog(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-50"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fermer</span>
              </button>
              <DialogHeader>
                <DialogTitle>Rejoindre un club</DialogTitle>
                <DialogDescription>Recherchez et rejoignez un club existant.</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un club..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {isLoadingClubs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : availableClubs.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "Aucun club trouvé" : "Aucun club disponible"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Soyez le premier à créer un club !
                      </p>
                    </div>
                  ) : (
                    availableClubs.map((club) => (
                      <Card key={club.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
                                style={{ backgroundColor: club.color + "20" }}
                              >
                                {club.logo}
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{club.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span>{getMembersCount(club)} membre{getMembersCount(club) > 1 ? 's' : ''}</span>
                                  <span>•</span>
                                  <span>{club.treasury || 0}€ de trésorerie</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleJoinClub(club.id, club.name)}
                              size="sm"
                            >
                              Rejoindre
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
                
                <Button 
                  onClick={() => {
                    setShowJoinDialog(false);
                    setSearchTerm("");
                  }} 
                  variant="outline" 
                  className="w-full mt-4"
                >
                  Fermer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="mb-6" style={{ borderColor: myClub.color }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="text-6xl w-20 h-20 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: myClub.color + "20" }}
                >
                  {myClub.logo}
                </div>
                <div>
                  <CardTitle className="text-2xl">{myClub.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getMembersCount(myClub)} membre{getMembersCount(myClub) > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Trésorerie</p>
                  <p className="text-3xl font-bold text-primary">{myClub.treasury || 0}€</p>
                </div>
                {myClub.founderId !== user?.uid && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleLeaveClub}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Quitter
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Contribuer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Votre fortune: <span className="font-bold text-foreground">{fortune}€</span>
              </p>
              <Button onClick={() => setShowContributeDialog(true)} className="w-full">
                <Gift className="h-4 w-4 mr-2" />
                Faire un don
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total gagné</span>
                <span className="font-bold">{myClub.totalEarnings || 0}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membres actifs</span>
                <span className="font-bold">{getMembersCount(myClub)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bonus actifs</span>
                <span className="font-bold">
                  {myClub.bonuses ? Object.values(myClub.bonuses).filter(Boolean).length : 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bonus du club</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CLUB_BONUSES.map((bonus) => {
                const owned = myClub.bonuses && myClub.bonuses[bonus.id as keyof typeof myClub.bonuses];
                const canAfford = (myClub.treasury || 0) >= bonus.cost;

                return (
                  <Card key={bonus.id} className={owned ? "border-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="text-4xl mb-2 text-center">{bonus.icon}</div>
                      <h3 className="font-bold text-center mb-1">{bonus.name}</h3>
                      <p className="text-xs text-muted-foreground text-center mb-3">
                        {bonus.description}
                      </p>
                      {!owned ? (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleBuyBonus(bonus.id, bonus.cost)}
                          disabled={!canAfford}
                          variant={canAfford ? "default" : "secondary"}
                        >
                          {bonus.cost}€
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full" variant="outline" disabled>
                          Actif ✓
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membres ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun membre</p>
            ) : (
              <div className="space-y-2">
                {members
                  .sort((a, b) => b.contributions - a.contributions)
                  .map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-alt"
                    >
                      <div className="flex items-center gap-3">
                        {member.role === "founder" && (
                          <Crown className="h-5 w-5 text-gold" />
                        )}
                        <div>
                          <p className="font-medium">{member.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.role === "founder" ? "Fondateur" : "Membre"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">
                          {member.contributions}€
                        </p>
                        <p className="text-xs text-muted-foreground">Contributions</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showContributeDialog} onOpenChange={setShowContributeDialog}>
          <DialogContent>
            <button
              onClick={() => setShowContributeDialog(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-50"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fermer</span>
            </button>
            <DialogHeader>
              <DialogTitle>Contribuer à la trésorerie</DialogTitle>
              <DialogDescription>Ajoutez de la fortune à la trésorerie de votre club.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Votre fortune: <span className="font-bold text-foreground">{fortune}€</span>
              </p>
              <Input
                type="number"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="Montant"
                min="1"
                max={fortune}
              />
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => setShowContributeDialog(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button onClick={handleContribute} className="flex-1">
                  Contribuer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
};

export default Clubs;
