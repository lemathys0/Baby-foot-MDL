import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Lock, Sparkles, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getUserBadges, checkAchievements, type Badge as BadgeType } from "@/lib/firebaseExtended";
import { toast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

interface BadgesSectionProps {
  userId: string;
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

const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "tueur_gamelle",
    name: "Tueur de Gamelles",
    description: "Gagner 10 matchs d'affilée",
    icon: "🔥",
    rarity: "epic" as const,
    reward: 100,
  },
  {
    id: "roi_jeudi",
    name: "Roi du Jeudi",
    description: "Gagner 5 matchs un jeudi",
    icon: "👑",
    rarity: "rare" as const,
    reward: 50,
  },
  {
    id: "millionnaire",
    name: "Millionnaire",
    description: "Atteindre 1000€ de fortune",
    icon: "💰",
    rarity: "legendary" as const,
    reward: 200,
  },
  {
    id: "collectionneur",
    name: "Collectionneur",
    description: "Posséder 50 cartes uniques",
    icon: "🎴",
    rarity: "epic" as const,
    reward: 150,
  },
  {
    id: "parieur_fou",
    name: "Parieur Fou",
    description: "Gagner 10 paris",
    icon: "🎲",
    rarity: "rare" as const,
    reward: 75,
  },
];

export function BadgesSection({ userId }: BadgesSectionProps) {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadBadges();
  }, [userId]);

  const loadBadges = async () => {
    try {
      const userBadges = await getUserBadges(userId);
      setBadges(userBadges || []);
    } catch (error) {
      logger.error("Erreur chargement badges:", error);
      setBadges([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAchievements = async () => {
    setIsChecking(true);
    try {
      const newBadges = await checkAchievements(userId);
      
      if (newBadges && newBadges.length > 0) {
        await loadBadges();
        
        newBadges.forEach(badge => {
          const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === badge.id);
          toast({
            title: "🎉 Nouveau badge débloqué !",
            description: `${badge.icon} ${badge.name} - +${achievement?.reward || 0}€`,
          });
        });
      } else {
        toast({
          title: "Aucun nouveau badge",
          description: "Continue à jouer pour débloquer plus de badges !",
        });
      }
    } catch (error) {
      logger.error("Erreur vérification achievements:", error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les achievements",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const unlockedIds = badges.map(b => b.id);
  const completionRate = Math.round((badges.length / ACHIEVEMENT_DEFINITIONS.length) * 100);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle>Badges & Succès</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Complétion</p>
              <p className="text-lg font-bold text-primary">{completionRate}%</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckAchievements}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Vérification...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Vérifier
                </>
              )}
            </Button>
          </div>
        </div>
        <Progress value={completionRate} className="mt-2" />
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            const badge = badges.find(b => b.id === achievement.id);
            const isHovered = hoveredBadge === achievement.id;

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className="relative"
                onMouseEnter={() => setHoveredBadge(achievement.id)}
                onMouseLeave={() => setHoveredBadge(null)}
              >
                <div
                  className={`relative p-3 rounded-lg border-2 transition-all cursor-help ${
                    isUnlocked 
                      ? "border-primary bg-primary/5" 
                      : "border-border bg-surface-alt opacity-60"
                  }`}
                >
                  {/* Badge de rareté */}
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${rarityColors[achievement.rarity]}`} />

                  {/* Icône */}
                  <div className={`text-4xl text-center mb-2 ${!isUnlocked && "grayscale"}`}>
                    {isUnlocked ? achievement.icon : "🔒"}
                  </div>

                  {/* Nom */}
                  <p className="text-xs font-bold text-center mb-1 line-clamp-2">
                    {achievement.name}
                  </p>

                  {/* Status */}
                  {isUnlocked ? (
                    <div className="text-center">
                      <Badge variant="default" className="text-[10px] py-0 px-1 bg-green-500">
                        ✓
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Tooltip au survol - VERSION AMÉLIORÉE */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                  >
                    <div className="bg-popover border-2 border-primary/50 rounded-lg p-3 shadow-2xl whitespace-nowrap min-w-[200px]">
                      {/* En-tête avec icône et nom */}
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                        <span className="text-2xl">{isUnlocked ? achievement.icon : "🔒"}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">{achievement.name}</p>
                          <Badge className={`${rarityColors[achievement.rarity]} text-white text-[10px] mt-0.5`}>
                            {rarityLabels[achievement.rarity]}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        </div>

                        {/* Récompense */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">Récompense</span>
                          <span className="text-sm font-bold text-primary">{achievement.reward}€</span>
                        </div>

                        {/* Date de déblocage si débloqué */}
                        {isUnlocked && badge && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-muted-foreground">Débloqué le</span>
                            <span className="text-xs text-green-400 font-medium">
                              {new Date(badge.unlockedAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Triangle pointant vers le badge */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
                        <div className="border-8 border-transparent border-t-primary/50"></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Message si aucun badge */}
        {badges.length === 0 && (
          <div className="text-center py-8">
            <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-3">
              Aucun badge débloqué pour le moment
            </p>
            <Button onClick={handleCheckAchievements} disabled={isChecking}>
              Vérifier mes accomplissements
            </Button>
          </div>
        )}

        {/* Liste des badges débloqués */}
        {badges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold mb-2">Badges récents</h4>
            <div className="space-y-2">
              {badges
                .sort((a, b) => b.unlockedAt - a.unlockedAt)
                .slice(0, 3)
                .map((badge) => {
                  const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === badge.id);
                  if (!achievement) return null;
                  return (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-surface-alt"
                    >
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {achievement.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(badge.unlockedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={rarityColors[achievement.rarity]}>
                          {rarityLabels[achievement.rarity]}
                        </Badge>
                        <p className="text-xs text-primary font-bold mt-1">
                          +{achievement.reward}€
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
