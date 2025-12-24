import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Crown, TrendingUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { type Club } from "@/lib/firebaseExtended";
import { useNavigate } from "react-router-dom";
import { logger } from '@/utils/logger';

interface ClubCardProps {
  userId: string;
}

export function ClubCard({ userId }: ClubCardProps) {
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    loadClubData();
  }, [userId]);

  const loadClubData = async () => {
    setIsLoading(true);
    try {
      // Récupérer l'ID du club de l'utilisateur
      const userRef = ref(database, `users/${userId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        
        if (userData.clubId) {
          // Récupérer les données du club
          const clubRef = ref(database, `clubs/${userData.clubId}`);
          const clubSnapshot = await get(clubRef);
          
          if (clubSnapshot.exists()) {
            const clubData = clubSnapshot.val();
            setClub({ id: userData.clubId, ...clubData });
            setMemberCount(clubData.members?.length || 0);
          }
        }
      }
    } catch (error) {
      logger.error("Erreur chargement club:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Si pas de club
  if (!club) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Mon Club
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-3">
            Tu ne fais partie d'aucun club
          </p>
          <Button onClick={() => navigate("/clubs")} variant="neon">
            Créer ou rejoindre un club
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Compter les bonus actifs (avec vérification)
  const activeBonuses = club.bonuses ? Object.values(club.bonuses).filter(Boolean).length : 0;

  return (
    <Card className="relative overflow-hidden">
      {/* Bordure colorée du club */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: club.color }}
      />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Mon Club</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/clubs")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* En-tête du club */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-surface-alt">
            <div
              className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: club.color + "20" }}
            >
              {club.logo}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{club.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {memberCount} membre{memberCount > 1 ? 's' : ''}
                </div>
                {club.founderId === userId && (
                  <Badge variant="outline" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Fondateur
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Statistiques du club */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-surface-alt">
              <p className="text-xs text-muted-foreground">Trésorerie</p>
              <p className="text-xl font-bold text-primary">{club.treasury || 0}€</p>
            </div>

            <div className="p-3 rounded-lg bg-surface-alt">
              <p className="text-xs text-muted-foreground">Total gagné</p>
              <p className="text-xl font-bold text-green-500">{club.totalEarnings || 0}€</p>
            </div>
          </div>

          {/* Bonus actifs */}
          {activeBonuses > 0 ? (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Bonus actifs</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {club.bonuses?.xpBoost && (
                  <Badge variant="default" className="text-xs">
                    +20% ELO
                  </Badge>
                )}
                {club.bonuses?.fortuneBoost && (
                  <Badge variant="default" className="text-xs">
                    +15% Fortune
                  </Badge>
                )}
                {club.bonuses?.premiumCards && (
                  <Badge variant="default" className="text-xs">
                    x2 Cartes rares
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-surface-alt">
              <p className="text-xs text-muted-foreground text-center">
                Aucun bonus actif • Contribuez pour débloquer des avantages
              </p>
            </div>
          )}

          {/* Bouton vers la page club */}
          <Button 
            onClick={() => navigate("/clubs")} 
            variant="outline"
            className="w-full"
          >
            Voir le club
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
