import { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { logger } from "@/utils/logger";
import { addFortuneHistoryEntry } from '@/lib/firebaseExtended';

const DAILY_BONUS_AMOUNT = 5;
const BONUS_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 heures

export interface DailyBonusStatus {
  canClaim: boolean;
  nextBonusTime: number | null;
  timeUntilNext: number;
  bonusAmount: number;
  totalClaimed: number;
  streak: number;
}

export const useDailyBonus = (userId: string | undefined) => {
  const [bonusStatus, setBonusStatus] = useState<DailyBonusStatus>({
    canClaim: false,
    nextBonusTime: null,
    timeUntilNext: 0,
    bonusAmount: DAILY_BONUS_AMOUNT,
    totalClaimed: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const checkBonusStatus = async () => {
      try {
        logger.log('🎁 [DailyBonus] Vérification statut pour:', userId);
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          logger.log('🎁 [DailyBonus] Données utilisateur:', {
            hasLastBonusClaim: !!userData.lastBonusClaim,
            hasCreatedAt: !!userData.createdAt,
            lastBonusClaim: userData.lastBonusClaim,
            createdAt: userData.createdAt
          });
          
          const now = Date.now();
          
          // ✅ Si les données sont manquantes, les initialiser
          if (!userData.lastBonusClaim || !userData.createdAt) {
            logger.log('⚠️ [DailyBonus] Données manquantes, initialisation...');
            const initTimestamp = now;

            await update(userRef, {
              createdAt: initTimestamp,
              lastBonusClaim: initTimestamp - BONUS_INTERVAL_MS, // Permettre le premier bonus immédiatement
              totalDailyBonus: 0,
              dailyBonusStreak: 0,
            });

            logger.log('✅ [DailyBonus] Données initialisées, bonus disponible immédiatement');
          }
          
          // Vérifier si les données existent, sinon utiliser des valeurs par défaut
          const createdAt = userData.createdAt ? 
            (typeof userData.createdAt === 'string' ? new Date(userData.createdAt).getTime() : userData.createdAt) 
            : now;
          
          const lastBonusClaim = userData.lastBonusClaim || createdAt;
          const nextBonusTime = lastBonusClaim + BONUS_INTERVAL_MS;
          const canClaim = now >= nextBonusTime;
          const timeUntilNext = canClaim ? 0 : nextBonusTime - now;

          logger.log('🎁 [DailyBonus] Calculs:', {
            now,
            lastBonusClaim,
            nextBonusTime,
            canClaim,
            timeUntilNext
          });

          // Calculer le streak (jours consécutifs)
          const lastClaimDate = new Date(lastBonusClaim).toDateString();
          const todayDate = new Date(now).toDateString();
          const yesterdayDate = new Date(now - BONUS_INTERVAL_MS).toDateString();
          
          let currentStreak = userData.dailyBonusStreak || 0;
          
          // Si le dernier claim était hier, continuer le streak
          if (lastClaimDate === yesterdayDate && canClaim) {
            // Le streak sera incrémenté lors du claim
          }
          // Si le dernier claim était aujourd'hui, garder le streak
          else if (lastClaimDate === todayDate) {
            // Streak actuel maintenu
          }
          // Si le dernier claim était avant-hier ou plus, reset le streak
          else if (canClaim) {
            currentStreak = 0;
          }

          setBonusStatus({
            canClaim,
            nextBonusTime,
            timeUntilNext,
            bonusAmount: DAILY_BONUS_AMOUNT,
            totalClaimed: userData.totalDailyBonus || 0,
            streak: currentStreak,
          });
        }
      } catch (error) {
        logger.error('❌ Erreur vérification bonus quotidien:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkBonusStatus();

    // Vérifier toutes les minutes si le bonus est disponible
    const interval = setInterval(checkBonusStatus, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  const claimDailyBonus = async (): Promise<{ success: boolean; error?: string; newBalance?: number }> => {
    if (!userId || !bonusStatus.canClaim || isClaiming) {
      return { success: false, error: 'Bonus non disponible' };
    }

    setIsClaiming(true);

    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      const userData = snapshot.val();
      const now = Date.now();
      
      // Vérifier une dernière fois que le bonus est disponible
      const lastBonusClaim = userData.lastBonusClaim || userData.createdAt || now;
      if (now < lastBonusClaim + BONUS_INTERVAL_MS) {
        return { success: false, error: 'Bonus déjà réclamé' };
      }

      // Calculer le nouveau streak
      const lastClaimDate = new Date(lastBonusClaim).toDateString();
      const yesterdayDate = new Date(now - BONUS_INTERVAL_MS).toDateString();
      
      let newStreak = userData.dailyBonusStreak || 0;
      if (lastClaimDate === yesterdayDate) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      const currentFortune = userData.fortune || 0;
      const newFortune = currentFortune + DAILY_BONUS_AMOUNT;
      const totalBonus = (userData.totalDailyBonus || 0) + DAILY_BONUS_AMOUNT;

      await update(userRef, {
        fortune: newFortune,
        lastBonusClaim: now,
        totalDailyBonus: totalBonus,
        dailyBonusStreak: newStreak,
      });

      // Enregistrer dans l'historique
      await addFortuneHistoryEntry(
        userId,
        newFortune,
        DAILY_BONUS_AMOUNT,
        `Bonus quotidien (Série: ${newStreak} jours)`
      );

      logger.log(`✅ Bonus quotidien réclamé: +${DAILY_BONUS_AMOUNT}₣ (Nouveau solde: ${newFortune}₣)`);

      // Mettre à jour l'état local
      setBonusStatus({
        canClaim: false,
        nextBonusTime: now + BONUS_INTERVAL_MS,
        timeUntilNext: BONUS_INTERVAL_MS,
        bonusAmount: DAILY_BONUS_AMOUNT,
        totalClaimed: totalBonus,
        streak: newStreak,
      });

      return { success: true, newBalance: newFortune };
    } catch (error) {
      logger.error('❌ Erreur réclamation bonus:', error);
      return { success: false, error: 'Erreur lors de la réclamation' };
    } finally {
      setIsClaiming(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    try {
      if (!ms || ms <= 0) return '0m';
      
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch (error) {
      logger.error('Erreur formatage temps:', error);
      return 'N/A';
    }
  };

  return {
    bonusStatus,
    isLoading,
    isClaiming,
    claimDailyBonus,
    formatTimeRemaining,
  };
};
