// src/hooks/useClubBonuses.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserClubBonuses } from "@/lib/clubBonusSystem";
import { logger } from "@/utils/logger";

interface ClubBonuses {
  xpBoost: boolean;
  fortuneBonus: boolean;
  premiumCards: boolean;
}

export function useClubBonuses() {
  const { user } = useAuth();
  const [bonuses, setBonuses] = useState<ClubBonuses>({
    xpBoost: false,
    fortuneBonus: false,
    premiumCards: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadBonuses = async () => {
      setIsLoading(true);
      try {
        const userBonuses = await getUserClubBonuses(user.uid);
        setBonuses(userBonuses);
      } catch (error) {
        logger.error("Erreur chargement bonus:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBonuses();
  }, [user]);

  return { bonuses, isLoading };
}
