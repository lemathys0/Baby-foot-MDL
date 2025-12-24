// src/components/profile/FriendProfileDialog.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, X, Percent, Coins, Users, Award, Zap, Star, Crown, Shield, Loader2, UserMinus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { getUserBadges, type Badge as BadgeType } from "@/lib/firebaseExtended";
import { getCardStats } from "@/lib/firebaseCards";
import { toast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

interface FriendProfileDialogProps {
  friendId: string;
  friendUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onRemoveFriend?: (friendId: string, friendUsername: string) => void;
  canRemove?: boolean;
}

interface FriendProfile {
  username: string;
  role: "player" | "agent" | "admin";
  eloRating: number;
  wins: number;
  losses: number;
  fortune: number;
  totalEarned: number;
  createdAt: string;
  clubId?: string;
}

interface ClubInfo {
  name: string;
  logo: string;
  color: string;
  memberCount: number;
}

const rarityColors = {
  common: "bg-gray-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-orange-500",
};

const rarityLabels = {
  common: "Commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

export function FriendProfileDialog({
  friendId,
  friendUsername,
  isOpen,
  onClose,
  onRemoveFriend,
  canRemove = true,
}: FriendProfileDialogProps) {
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [cardStats, setCardStats] = useState({ totalCards: 0, uniqueCards: 0, rareCards: 0 });
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !friendId) return;
    loadFriendData();
  }, [isOpen, friendId]);

  const loadFriendData = async () => {
    setIsLoading(true);
    try {
      // Charger le profil de l'ami
      const userRef = ref(database, `users/${friendId}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        setProfile({
          username: userData.username || friendUsername,
          role: userData.role || "player",
          eloRating: userData.eloRating || 1000,
          wins: userData.wins || 0,
          losses: userData.losses || 0,
          fortune: userData.fortune || 0,
          totalEarned: userData.totalEarned || 0,
          createdAt: userData.createdAt || new Date().toISOString(),
          clubId: userData.clubId,
        });

        // Charger les badges
        const userBadges = await getUserBadges(friendId);
        setBadges(userBadges || []);

        // Charger les stats de cartes
        const stats = await getCardStats(friendId);
        setCardStats(stats);

        // Charger les infos du club si membre
        if (userData.clubId) {
          const clubRef = ref(database, `clubs/${userData.clubId}`);
          const clubSnapshot = await get(clubRef);
          
          if (clubSnapshot.exists()) {
            const clubData = clubSnapshot.val();
            setClubInfo({
              name: clubData.name,
              logo: clubData.logo,
              color: clubData.color,
              memberCount: clubData.members?.length || 0,
            });
          }
        } else {
          setClubInfo(null);
        }
      }
    } catch (error) {
      logger.error("Erreur chargement profil ami:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    if (onRemoveFriend && profile) {
      onRemoveFriend(friendId, profile.username);
      onClose();
    }
  };

  if (!isOpen) return null;

  const roleLabels = {
    player: { label: "Joueur", icon: Trophy, color: "text-primary" },
    agent: { label: "Agent", icon: Star, color: "text-yellow-500" },
    admin: { label: "Admin", icon: Crown, color: "text-gold" },
  };

  const winRate = profile && profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
    : 0;

  const badgeCompletion = Math.round((badges.length / 5) * 100); // 5 achievements totaux

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Profil de {friendUsername}</span>
            {canRemove && onRemoveFriend && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Retirer
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header avec avatar et infos principales */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold shadow-lg">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  </motion.div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{profile.username}</h2>
                      <Badge variant="outline" className="gap-1">
                      {/* CORRECTION: Extraction du composant à une variable locale en majuscule pour la syntaxe JSX */}
                      {(() => {
                        const IconComponent = roleLabels[profile.role].icon;
                        if (!IconComponent) return null;
                        return (
                          <IconComponent className={`h-3 w-3 ${roleLabels[profile.role].color}`} />
                        );
                      })()}
                      {roleLabels[profile.role].label}
                    </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">ELO:</span>
                        <span className="font-bold text-primary">{profile.eloRating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-primary/10">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Victoires</p>
                    <p className="text-xl font-bold text-primary">{profile.wins}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-secondary/10">
                    <X className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Défaites</p>
                    <p className="text-xl font-bold text-secondary">{profile.losses}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-gold/10">
                    <Percent className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-xl font-bold text-gold">{winRate}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-primary/10">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fortune</p>
                    <p className="text-xl font-bold text-primary">{profile.fortune}€</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Collection de cartes */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Collection de Cartes
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-surface-alt">
                    <p className="text-2xl font-bold text-primary">{cardStats.totalCards}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-surface-alt">
                    <p className="text-2xl font-bold text-primary">{cardStats.uniqueCards}</p>
                    <p className="text-xs text-muted-foreground">Uniques</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-surface-alt">
                    <p className="text-2xl font-bold text-gold">{cardStats.rareCards}</p>
                    <p className="text-xs text-muted-foreground">Rares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Club */}
            {clubInfo && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Club
                  </h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-alt">
                    <div
                      className="text-3xl w-12 h-12 flex items-center justify-center rounded-lg"
                      style={{ backgroundColor: clubInfo.color + "20" }}
                    >
                      {clubInfo.logo}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{clubInfo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {clubInfo.memberCount} membre{clubInfo.memberCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Badges & Succès */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Badges & Succès
                  </h3>
                  <span className="text-xs text-muted-foreground">{badgeCompletion}% complet</span>
                </div>
                <Progress value={badgeCompletion} className="mb-4" />
                
                {badges.length > 0 ? (
                  <div className="grid grid-cols-5 gap-2">
                    {badges.map((badge) => (
                      <motion.div
                        key={badge.id}
                        whileHover={{ scale: 1.05 }}
                        className="relative p-2 rounded-lg border-2 border-primary bg-primary/5"
                      >
                        <div className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${rarityColors[badge.rarity]}`} />
                        <div className="text-2xl text-center mb-1">{badge.icon}</div>
                        <p className="text-[10px] font-bold text-center line-clamp-1">{badge.name}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Aucun badge débloqué
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Informations supplémentaires */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Informations
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Membre depuis</span>
                    <span className="font-medium">
                      {new Date(profile.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total gagné</span>
                    <span className="font-medium text-green-500">{profile.totalEarned}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Matchs joués</span>
                    <span className="font-medium">{profile.wins + profile.losses}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Profil introuvable</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
