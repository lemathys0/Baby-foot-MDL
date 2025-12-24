import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import {
  getUserQuests,
  updateQuestProgress,
  claimQuestReward,
  UserQuests,
  Quest,
  QuestType,
  QuestCategory,
} from '@/lib/questSystem';
import { logger } from '@/utils/logger';
import { toast } from './use-toast';

export const useQuests = (userId: string | undefined) => {
  const [quests, setQuests] = useState<UserQuests | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadQuests = async () => {
      try {
        const userQuests = await getUserQuests(userId);
        setQuests(userQuests);
      } catch (error) {
        logger.error('Erreur chargement quêtes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuests();

    // Écouter les mises à jour en temps réel
    const questsRef = ref(database, `quests/${userId}`);
    const unsubscribe = onValue(questsRef, (snapshot) => {
      if (snapshot.exists()) {
        setQuests(snapshot.val());
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const claimReward = async (questType: QuestType, questId: string) => {
    if (!userId || isClaiming) return;

    setIsClaiming(true);
    try {
      const result = await claimQuestReward(userId, questType, questId);

      if (result.success && result.reward) {
        toast({
          title: '🎉 Récompense récupérée !',
          description: `${result.reward.fortune ? `+${result.reward.fortune} Fortune` : ''}${
            result.reward.packs ? ` +${result.reward.packs} Pack(s)` : ''
          }${result.reward.badge ? ' +Badge spécial' : ''}`,
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de récupérer la récompense',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Erreur récupération récompense:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculer les statistiques
  const stats = quests
    ? {
        dailyCompleted: quests.daily.filter((q) => q.completed).length,
        dailyTotal: quests.daily.length,
        weeklyCompleted: quests.weekly.filter((q) => q.completed).length,
        weeklyTotal: quests.weekly.length,
        dailyProgress: Math.round(
          (quests.daily.filter((q) => q.completed).length / quests.daily.length) * 100
        ),
        weeklyProgress: Math.round(
          (quests.weekly.filter((q) => q.completed).length / quests.weekly.length) * 100
        ),
      }
    : null;

  return {
    quests,
    isLoading,
    isClaiming,
    claimReward,
    stats,
  };
};

// Hook pour mettre à jour la progression des quêtes
export const useQuestProgress = () => {
  const updateProgress = async (userId: string, category: QuestCategory, increment: number = 1) => {
    await updateQuestProgress(userId, category, increment);
  };

  return { updateProgress };
};
