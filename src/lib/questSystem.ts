import { ref, get, set, update } from 'firebase/database';
import { database } from './firebase';
import { logger } from '@/utils/logger';

export type QuestType = 'daily' | 'weekly' | 'special';
export type QuestCategory = 'match' | 'win_1v1' | 'win_2v2' | 'win_any' | 'social' | 'collection' | 'progression';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  category: QuestCategory;
  progress: number;
  target: number;
  reward: {
    fortune?: number;
    packs?: number;
    badge?: string;
  };
  completed: boolean;
  claimedAt?: number;
  expiresAt: number;
}

export interface UserQuests {
  daily: Quest[];
  weekly: Quest[];
  special: Quest[];
  lastDailyReset: number;
  lastWeeklyReset: number;
}

// Templates de quêtes quotidiennes
const DAILY_QUEST_TEMPLATES = [
  {
    id: 'daily_play_matches',
    title: 'Joueur actif',
    description: 'Jouer 3 matchs',
    category: 'match' as QuestCategory,
    target: 3,
    reward: { fortune: 10 },
  },
  {
    id: 'daily_win_1v1',
    title: 'Maître du duel',
    description: 'Gagner 2 matchs en 1v1',
    category: 'win_1v1' as QuestCategory,
    target: 2,
    reward: { fortune: 15 },
  },
  {
    id: 'daily_win_2v2',
    title: 'Esprit d\'équipe',
    description: 'Gagner 2 matchs en 2v2',
    category: 'win_2v2' as QuestCategory,
    target: 2,
    reward: { fortune: 15 },
  },
  {
    id: 'daily_claim_bonus',
    title: 'Assidu',
    description: 'Récupérer le bonus quotidien',
    category: 'progression' as QuestCategory,
    target: 1,
    reward: { fortune: 5 },
  },
  {
    id: 'daily_open_pack',
    title: 'Collectionneur',
    description: 'Ouvrir 1 pack de cartes',
    category: 'collection' as QuestCategory,
    target: 1,
    reward: { fortune: 20 },
  },
  {
    id: 'daily_chat_message',
    title: 'Social',
    description: 'Envoyer 5 messages dans le chat',
    category: 'social' as QuestCategory,
    target: 5,
    reward: { fortune: 8 },
  },
];

// Templates de quêtes hebdomadaires
const WEEKLY_QUEST_TEMPLATES = [
  {
    id: 'weekly_win_matches',
    title: 'Champion de la semaine',
    description: 'Gagner 10 matchs',
    category: 'win_any' as QuestCategory,
    target: 10,
    reward: { fortune: 100, packs: 1 },
  },
  {
    id: 'weekly_elo_gain',
    title: 'Ascension',
    description: 'Gagner 50 points d\'ELO',
    category: 'progression' as QuestCategory,
    target: 50,
    reward: { fortune: 80, badge: 'weekly_climber' },
  },
  {
    id: 'weekly_tournament',
    title: 'Compétiteur',
    description: 'Participer au tournoi hebdomadaire',
    category: 'match' as QuestCategory,
    target: 1,
    reward: { fortune: 50 },
  },
  {
    id: 'weekly_collection',
    title: 'Maître collectionneur',
    description: 'Collecter 5 nouvelles cartes',
    category: 'collection' as QuestCategory,
    target: 5,
    reward: { fortune: 150, packs: 2 },
  },
];

/**
 * Génère les quêtes quotidiennes pour un utilisateur
 */
export function generateDailyQuests(): Quest[] {
  const now = Date.now();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Sélectionner 4 quêtes aléatoires parmi les templates
  const selectedTemplates = DAILY_QUEST_TEMPLATES
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  return selectedTemplates.map(template => ({
    ...template,
    id: `${template.id}_${now}`,
    type: 'daily' as QuestType,
    progress: 0,
    completed: false,
    expiresAt: endOfDay.getTime(),
  }));
}

/**
 * Génère les quêtes hebdomadaires pour un utilisateur
 */
export function generateWeeklyQuests(): Quest[] {
  const now = Date.now();
  const endOfWeek = new Date();
  const daysUntilMonday = (8 - endOfWeek.getDay()) % 7 || 7;
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilMonday);
  endOfWeek.setHours(23, 59, 59, 999);

  return WEEKLY_QUEST_TEMPLATES.map(template => ({
    ...template,
    id: `${template.id}_${now}`,
    type: 'weekly' as QuestType,
    progress: 0,
    completed: false,
    expiresAt: endOfWeek.getTime(),
  }));
}

/**
 * Vérifie et réinitialise les quêtes si nécessaire
 */
export async function checkAndResetQuests(userId: string): Promise<UserQuests> {
  try {
    const questsRef = ref(database, `quests/${userId}`);
    const snapshot = await get(questsRef);

    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const thisWeekMonday = getThisWeekMonday();

    let userQuests: UserQuests;

    if (!snapshot.exists()) {
      // Première fois - créer les quêtes
      userQuests = {
        daily: generateDailyQuests(),
        weekly: generateWeeklyQuests(),
        special: [],
        lastDailyReset: today,
        lastWeeklyReset: thisWeekMonday,
      };
    } else {
      userQuests = snapshot.val();

      // Réinitialiser les quêtes quotidiennes si nécessaire
      if (userQuests.lastDailyReset < today) {
        logger.log('🔄 Réinitialisation quêtes quotidiennes pour:', userId);
        userQuests.daily = generateDailyQuests();
        userQuests.lastDailyReset = today;
      }

      // Réinitialiser les quêtes hebdomadaires si nécessaire
      if (userQuests.lastWeeklyReset < thisWeekMonday) {
        logger.log('🔄 Réinitialisation quêtes hebdomadaires pour:', userId);
        userQuests.weekly = generateWeeklyQuests();
        userQuests.lastWeeklyReset = thisWeekMonday;
      }
    }

    await set(questsRef, userQuests);
    return userQuests;
  } catch (error) {
    logger.error('Erreur checkAndResetQuests:', error);
    throw error;
  }
}

/**
 * Met à jour la progression d'une quête
 */
export async function updateQuestProgress(
  userId: string,
  questCategory: QuestCategory,
  increment: number = 1
): Promise<void> {
  try {
    const userQuests = await checkAndResetQuests(userId);
    let updated = false;

    // Mettre à jour toutes les quêtes correspondantes
    ['daily', 'weekly', 'special'].forEach((type) => {
      const quests = userQuests[type as keyof Pick<UserQuests, 'daily' | 'weekly' | 'special'>];
      quests.forEach((quest) => {
        if (quest.category === questCategory && !quest.completed) {
          quest.progress = Math.min(quest.progress + increment, quest.target);
          if (quest.progress >= quest.target) {
            quest.completed = true;
            logger.log('✅ Quête complétée:', quest.title);
          }
          updated = true;
        }
      });
    });

    if (updated) {
      const questsRef = ref(database, `quests/${userId}`);
      await set(questsRef, userQuests);
    }
  } catch (error) {
    logger.error('Erreur updateQuestProgress:', error);
  }
}

/**
 * Réclamer la récompense d'une quête
 */
export async function claimQuestReward(
  userId: string,
  questType: QuestType,
  questId: string
): Promise<{ success: boolean; reward?: Quest['reward']; error?: string }> {
  try {
    const userQuests = await checkAndResetQuests(userId);
    const quests = userQuests[questType];
    const questIndex = quests.findIndex(q => q.id === questId);

    if (questIndex === -1) {
      return { success: false, error: 'Quête introuvable' };
    }

    const quest = quests[questIndex];

    if (!quest.completed) {
      return { success: false, error: 'Quête non complétée' };
    }

    if (quest.claimedAt) {
      return { success: false, error: 'Récompense déjà réclamée' };
    }

    // Marquer comme réclamée
    quest.claimedAt = Date.now();

    // Donner les récompenses
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      const updates: any = {};

      if (quest.reward.fortune) {
        updates.fortune = (userData.fortune || 0) + quest.reward.fortune;
        updates.totalEarned = (userData.totalEarned || 0) + quest.reward.fortune;
      }

      if (quest.reward.packs) {
        updates[`inventory/packs/common`] = (userData.inventory?.packs?.common || 0) + quest.reward.packs;
      }

      if (quest.reward.badge) {
        updates[`badges/${quest.reward.badge}`] = {
          unlockedAt: Date.now(),
          type: 'quest',
        };
      }

      await update(userRef, updates);
    }

    // Sauvegarder
    const questsRef = ref(database, `quests/${userId}`);
    await set(questsRef, userQuests);

    return { success: true, reward: quest.reward };
  } catch (error) {
    logger.error('Erreur claimQuestReward:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Obtenir le lundi de cette semaine
 */
function getThisWeekMonday(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * Obtenir les quêtes d'un utilisateur
 */
export async function getUserQuests(userId: string): Promise<UserQuests> {
  return checkAndResetQuests(userId);
}
