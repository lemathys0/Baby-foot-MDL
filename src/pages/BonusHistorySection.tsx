import { motion } from 'framer-motion';
import { Gift, Calendar, Flame, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyBonus } from '@/hooks/useDailyBonus';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export default function BonusHistorySection() {
  const { user } = useAuth();
  const { bonusStatus, isLoading } = useDailyBonus(user?.uid);

  if (isLoading || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Bonus Quotidien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ Vérification de sécurité pour bonusStatus
  if (!bonusStatus) {
    logger.warn('⚠️ [BonusHistory] bonusStatus non disponible');
    return null;
  }

  // ✅ Valeurs sécurisées avec fallbacks
  const totalClaimed = bonusStatus.totalClaimed || 0;
  const streak = bonusStatus.streak || 0;
  const bonusAmount = bonusStatus.bonusAmount || 5;
  const canClaim = bonusStatus.canClaim === true;

  const stats = [
    {
      icon: Gift,
      label: 'Total reçu',
      value: `${totalClaimed}₣`,
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      icon: Flame,
      label: 'Série actuelle',
      value: `${streak} jour${streak > 1 ? 's' : ''}`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
    },
    {
      icon: Calendar,
      label: 'Par jour',
      value: `${bonusAmount}₣`,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      icon: Award,
      label: 'Prochain bonus',
      value: canClaim ? 'Disponible !' : 'En attente',
      color: canClaim ? 'text-green-500' : 'text-muted-foreground',
      bgColor: canClaim ? 'bg-green-500/20' : 'bg-muted/20',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Statistiques Bonus Quotidien
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            // ✅ Vérification de sécurité AVANT d'utiliser l'icône
            if (!stat || !stat.icon) {
              logger.warn('⚠️ [BonusHistory] Stat ou icône manquante:', index);
              return null;
            }

            const Icon = stat.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden rounded-lg border border-border p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    {Icon && <Icon className={`h-5 w-5 ${stat.color}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-lg font-bold ${stat.color} truncate`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Série de connexion
          </h4>
          <p className="text-sm text-muted-foreground">
            Connectez-vous chaque jour pour maintenir votre série et gagner {bonusAmount}₣ !
            {streak > 0 && (
              <span className="block mt-2 text-orange-500 font-medium">
                🔥 Vous avez une série de {streak} jour{streak > 1 ? 's' : ''} !
              </span>
            )}
          </p>
          
          {streak >= 7 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30"
            >
              <p className="text-sm font-bold text-orange-500 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Incroyable ! 7 jours consécutifs !
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Continue comme ça pour devenir un joueur légendaire ! 🏆
              </p>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
