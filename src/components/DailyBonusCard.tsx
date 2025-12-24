import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Clock, Flame, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDailyBonus } from '@/hooks/useDailyBonus';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export default function DailyBonusCard() {
  const { user } = useAuth();
  const { bonusStatus, isLoading, isClaiming, claimDailyBonus, formatTimeRemaining } = useDailyBonus(user?.uid);

  const handleClaim = async () => {
    try {
      const result = await claimDailyBonus();
      
      if (result.success) {
        toast({
          title: "🎉 Bonus quotidien réclamé !",
          description: `+${bonusStatus?.bonusAmount || 5}₣ ajoutés à votre compte`,
        });
      } else {
        toast({
          title: "❌ Erreur",
          description: result.error || "Impossible de réclamer le bonus",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Erreur réclamation bonus:', error);
      toast({
        title: "❌ Erreur",
        description: "Une erreur inattendue est survenue",
        variant: "destructive",
      });
    }
  };

  // ✅ Vérifications de sécurité renforcées
  if (isLoading || !user) {
    return null;
  }

  // ✅ Vérification stricte de bonusStatus
  if (!bonusStatus) {
    logger.warn('⚠️ [DailyBonus] bonusStatus non initialisé');
    return null;
  }

  // ✅ Vérification que toutes les propriétés nécessaires existent
  if (typeof bonusStatus.canClaim !== 'boolean') {
    logger.warn('⚠️ [DailyBonus] bonusStatus.canClaim manquant');
    return null;
  }

  // Vérification de sécurité supplémentaire
  const safeFormatTime = (ms: number | undefined) => {
    if (!ms || ms <= 0) return 'Calcul...';
    try {
      return formatTimeRemaining(ms);
    } catch (error) {
      logger.error('Erreur formatage temps:', error);
      return 'N/A';
    }
  };

  // ✅ Valeurs sécurisées avec fallbacks
  const canClaim = bonusStatus.canClaim === true;
  const bonusAmount = bonusStatus.bonusAmount || 5;
  const streak = bonusStatus.streak || 0;
  const totalClaimed = bonusStatus.totalClaimed || 0;
  const timeUntilNext = bonusStatus.timeUntilNext || 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="mb-6"
      >
        <Card className={`overflow-hidden transition-all ${
          canClaim 
            ? 'border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10' 
            : 'border-border/50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Icône */}
              <motion.div
                animate={canClaim ? { 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ 
                  duration: 2, 
                  repeat: canClaim ? Infinity : 0 
                }}
                className={`rounded-xl p-3 ${
                  canClaim 
                    ? 'bg-green-500/20' 
                    : 'bg-muted/50'
                }`}
              >
                <Gift className={`h-8 w-8 ${
                  canClaim 
                    ? 'text-green-500' 
                    : 'text-muted-foreground'
                }`} />
              </motion.div>

              {/* Contenu */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">
                    Bonus Quotidien
                  </h3>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 rounded-full">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-xs font-bold text-orange-500">
                        {streak}
                      </span>
                    </div>
                  )}
                </div>

                {canClaim ? (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    💰 {bonusAmount}₣ disponibles !
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Prochain bonus dans {safeFormatTime(timeUntilNext)}
                    </span>
                  </div>
                )}

                {/* Stats */}
                {totalClaimed > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Total reçu: {totalClaimed}₣</span>
                  </div>
                )}
              </div>

              {/* Bouton */}
              <Button
                onClick={handleClaim}
                disabled={!canClaim || isClaiming}
                variant={canClaim ? "default" : "outline"}
                size="sm"
                className={canClaim ? 
                  "bg-green-500 hover:bg-green-600 text-white" : 
                  ""
                }
              >
                {isClaiming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Réclamation...
                  </>
                ) : canClaim ? (
                  'Réclamer'
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Barre de progression jusqu'au prochain bonus */}
            {!canClaim && timeUntilNext > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.max(0, Math.min(100, ((24 * 60 * 60 * 1000 - timeUntilNext) / (24 * 60 * 60 * 1000)) * 100))}%` 
                    }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
