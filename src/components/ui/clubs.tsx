import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Crown, TrendingUp, Gift, Plus, LogOut } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import {
  createClub,
  joinClub,
  contributeToClub,
  buyClubBonus,
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
  const [showContributeDialog, setShowContributeDialog] = useState(false);
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [fortune, setFortune] = useState(0);

  // Create club form
  const [clubName, setClubName] = useState("");
  const [selectedLogo, setSelectedLogo] = useState(CLUB_LOGOS[0]);
  const [selectedColor, setSelectedColor] = useState(CLUB_COLORS[0]);
  const [contributionAmount, setContributionAmount] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadClubData = async () => {
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setFortune(data.fortune || 0);
        
        if (data.clubId) {
          const clubRef = ref(database, `clubs/${data.clubId}`);
          const clubSnapshot = await get(clubRef);
          
          if (clubSnapshot.exists()) {
            setMyClub({ id: data.clubId, ...clubSnapshot.val() });

            const membersRef = ref(database, `clubMembers/${data.clubId}`);
            const membersSnapshot = await get(membersRef);
            
            if (membersSnapshot.exists()) {
              setMembers(Object.values(membersSnapshot.val()));
            }
          }
        }
      }
    };

    loadClubData();
  }, [user]);

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
      await createClub(user.uid, userProfile.username, clubName, selectedLogo, selectedColor);
      
      toast({
        title: "Club créé! 🎉",
        description: `${clubName} a été créé avec succès`,
      });

      setShowCreateDialog(false);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
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
      await contributeToClub(user.uid, myClub.id,  amount);
      
      setFortune(fortune - amount);
      setMyClub({
        ...myClub,
        treasury: (myClub.treasury || 0) + amount,
      });

      toast({
        title: "Contribution ajoutée! 💰",
        description: `${amount}€ ajoutés à la trésorerie`,
      });

      setShowContributeDialog(false);
      setContributionAmount("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBuyBonus = async (bonusId: string, cost: number) => {
    if (!myClub) return;

    try {
      await buyClubBonus(myClub.id, bonusId as any, cost);
      
      setMyClub({
        ...myClub,
        treasury: myClub.treasury - cost,
        bonuses: {
          ...myClub.bonuses,
          [bonusId]: true,
        },
      });

      toast({
        title: "Bonus acheté! 🎁",
        description: "Le bonus est maintenant actif pour tous les membres",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!myClub) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="text-center p-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Vous n'avez pas de club</h2>
            <p className="text-muted-foreground mb-6">
              Créez ou rejoignez un club pour profiter des bonus collectifs
            </p>
            <Button onClick={() => setShowCreateDialog(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Créer un club
            </Button>
          </Card>

          {/* Create Club Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un club</DialogTitle>
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

                <Button onClick={handleCreateClub} className="w-full">
                  Créer le club
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
        {/* Club Header */}
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
                    {myClub.members.length} membre{myClub.members.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Trésorerie</p>
                <p className="text-3xl font-bold text-primary">{myClub.treasury}€</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Contributions */}
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

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total gagné</span>
                <span className="font-bold">{myClub.totalEarnings}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membres actifs</span>
                <span className="font-bold">{myClub.members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bonus actifs</span>
                <span className="font-bold">
                  {Object.values(myClub.bonuses).filter(Boolean).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bonuses */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bonus du club</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CLUB_BONUSES.map((bonus) => {
                const owned = myClub.bonuses[bonus.id as keyof typeof myClub.bonuses];
                const canAfford = myClub.treasury >= bonus.cost;

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

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle>Membres ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Contribute Dialog */}
        <Dialog open={showContributeDialog} onOpenChange={setShowContributeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contribuer à la trésorerie</DialogTitle>
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
              <Button onClick={handleContribute} className="w-full">
                Contribuer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
};

export default Clubs;
