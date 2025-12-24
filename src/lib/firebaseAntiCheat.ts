import { ref, get, set, update, remove, push, query, orderByChild, limitToLast } from "firebase/database";
import { database } from "./firebase";
import { logger } from "@/utils/logger";

export interface SuspiciousActivity {
  id: string;
  userId: string;
  username: string;
  type: "fortune_spike" | "elo_spike" | "rapid_actions" | "negative_value" | "unusual_pattern";
  severity: "low" | "medium" | "high";
  description: string;
  oldValue?: number;
  newValue?: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface AntiCheatStats {
  total: number;
  unresolved: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
  };
  byType: {
    [key: string]: number;
  };
}

/**
 * Récupère toutes les activités suspectes
 */
export const getSuspiciousActivities = async (): Promise<SuspiciousActivity[]> => {
  try {
    const activitiesRef = ref(database, 'suspicious_activities');
    const snapshot = await get(activitiesRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const activitiesData = snapshot.val();
    const activities: SuspiciousActivity[] = Object.entries(activitiesData).map(
      ([id, data]: [string, any]) => ({
        id,
        ...data,
      })
    );

    // Trier par timestamp décroissant (plus récent en premier)
    return activities.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error("Erreur récupération activités suspectes:", error);
    throw new Error("Impossible de récupérer les activités suspectes");
  }
};

/**
 * Récupère les statistiques anti-cheat
 */
export const getAntiCheatStats = async (): Promise<AntiCheatStats> => {
  try {
    const activities = await getSuspiciousActivities();
    
    const stats: AntiCheatStats = {
      total: activities.length,
      unresolved: activities.filter(a => !a.resolved).length,
      bySeverity: {
        low: activities.filter(a => a.severity === "low").length,
        medium: activities.filter(a => a.severity === "medium").length,
        high: activities.filter(a => a.severity === "high").length,
      },
      byType: {},
    };

    // Compter par type
    activities.forEach(activity => {
      if (!stats.byType[activity.type]) {
        stats.byType[activity.type] = 0;
      }
      stats.byType[activity.type]++;
    });

    return stats;
  } catch (error) {
    logger.error("Erreur récupération stats anti-cheat:", error);
    throw new Error("Impossible de récupérer les statistiques");
  }
};

/**
 * Crée une nouvelle activité suspecte
 */
export const createSuspiciousActivity = async (
  activity: Omit<SuspiciousActivity, "id" | "timestamp" | "resolved">
): Promise<string> => {
  try {
    const activitiesRef = ref(database, 'suspicious_activities');
    const newActivityRef = push(activitiesRef);
    
    const newActivity: Omit<SuspiciousActivity, "id"> = {
      ...activity,
      timestamp: Date.now(),
      resolved: false,
    };

    await set(newActivityRef, newActivity);
    
    return newActivityRef.key!;
  } catch (error) {
    logger.error("Erreur création activité suspecte:", error);
    throw new Error("Impossible de créer l'activité suspecte");
  }
};

/**
 * Marque une activité comme résolue
 */
export const resolveActivity = async (activityId: string, resolvedBy?: string): Promise<void> => {
  try {
    const activityRef = ref(database, `suspicious_activities/${activityId}`);
    const snapshot = await get(activityRef);
    
    if (!snapshot.exists()) {
      throw new Error("Activité introuvable");
    }

    await update(activityRef, {
      resolved: true,
      resolvedAt: Date.now(),
      resolvedBy: resolvedBy || "admin",
    });
  } catch (error) {
    logger.error("Erreur résolution activité:", error);
    throw new Error("Impossible de résoudre l'activité");
  }
};

/**
 * Supprime une activité suspecte
 */
export const deleteActivity = async (activityId: string): Promise<void> => {
  try {
    const activityRef = ref(database, `suspicious_activities/${activityId}`);
    await remove(activityRef);
  } catch (error) {
    logger.error("Erreur suppression activité:", error);
    throw new Error("Impossible de supprimer l'activité");
  }
};

/**
 * Vérifie si une variation de fortune est suspecte
 */
export const checkFortuneSuspicious = async (
  userId: string,
  username: string,
  oldFortune: number,
  newFortune: number
): Promise<void> => {
  const change = newFortune - oldFortune;
  const absChange = Math.abs(change);
  
  // Seuils de détection
  const SUSPICIOUS_THRESHOLD = 5000; // Changement de plus de 5000€
  const CRITICAL_THRESHOLD = 10000; // Changement de plus de 10000€
  
  let severity: "low" | "medium" | "high" | null = null;
  let description = "";

  if (absChange >= CRITICAL_THRESHOLD) {
    severity = "high";
    description = `Variation critique de fortune : ${change > 0 ? '+' : ''}${change}€`;
  } else if (absChange >= SUSPICIOUS_THRESHOLD) {
    severity = "medium";
    description = `Variation importante de fortune : ${change > 0 ? '+' : ''}${change}€`;
  }

  // Vérifier aussi les valeurs négatives
  if (newFortune < 0) {
    severity = "high";
    description = `Fortune négative détectée : ${newFortune}€`;
  }

  if (severity) {
    await createSuspiciousActivity({
      userId,
      username,
      type: newFortune < 0 ? "negative_value" : "fortune_spike",
      severity,
      description,
      oldValue: oldFortune,
      newValue: newFortune,
      metadata: {
        change,
        absChange,
      },
    });
  }
};

/**
 * Vérifie si une variation d'ELO est suspecte
 */
export const checkEloSuspicious = async (
  userId: string,
  username: string,
  oldElo: number,
  newElo: number
): Promise<void> => {
  const change = newElo - oldElo;
  const absChange = Math.abs(change);
  
  // Seuils de détection
  const SUSPICIOUS_THRESHOLD = 200; // Changement de plus de 200 ELO
  const CRITICAL_THRESHOLD = 500; // Changement de plus de 500 ELO
  
  let severity: "low" | "medium" | "high" | null = null;
  let description = "";

  if (absChange >= CRITICAL_THRESHOLD) {
    severity = "high";
    description = `Variation critique d'ELO : ${change > 0 ? '+' : ''}${change} points`;
  } else if (absChange >= SUSPICIOUS_THRESHOLD) {
    severity = "medium";
    description = `Variation importante d'ELO : ${change > 0 ? '+' : ''}${change} points`;
  }

  // Vérifier aussi les valeurs négatives
  if (newElo < 0) {
    severity = "high";
    description = `ELO négatif détecté : ${newElo}`;
  }

  if (severity) {
    await createSuspiciousActivity({
      userId,
      username,
      type: newElo < 0 ? "negative_value" : "elo_spike",
      severity,
      description,
      oldValue: oldElo,
      newValue: newElo,
      metadata: {
        change,
        absChange,
      },
    });
  }
};

/**
 * Détecte les actions rapides suspectes (plusieurs modifications en peu de temps)
 */
export const checkRapidActions = async (
  userId: string,
  username: string,
  actionType: string,
  count: number
): Promise<void> => {
  // Seuils de détection
  const SUSPICIOUS_THRESHOLD = 10; // Plus de 10 actions en peu de temps
  const CRITICAL_THRESHOLD = 20; // Plus de 20 actions en peu de temps
  
  let severity: "low" | "medium" | "high" | null = null;
  let description = "";

  if (count >= CRITICAL_THRESHOLD) {
    severity = "high";
    description = `Actions rapides critiques détectées : ${count} ${actionType} en peu de temps`;
  } else if (count >= SUSPICIOUS_THRESHOLD) {
    severity = "medium";
    description = `Actions rapides suspectes : ${count} ${actionType} en peu de temps`;
  }

  if (severity) {
    await createSuspiciousActivity({
      userId,
      username,
      type: "rapid_actions",
      severity,
      description,
      metadata: {
        actionType,
        count,
      },
    });
  }
};

/**
 * Nettoie les anciennes activités résolues (plus de 30 jours)
 */
export const cleanOldResolvedActivities = async (): Promise<number> => {
  try {
    const activities = await getSuspiciousActivities();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const activity of activities) {
      if (activity.resolved && activity.resolvedAt && activity.resolvedAt < thirtyDaysAgo) {
        await deleteActivity(activity.id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (error) {
    logger.error("Erreur nettoyage activités:", error);
    throw new Error("Impossible de nettoyer les activités");
  }
};
