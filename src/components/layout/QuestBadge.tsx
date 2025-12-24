import { useAuth } from "@/contexts/AuthContext";
import { useQuests } from "@/hooks/useQuests";

export const QuestBadge = () => {
  const { user } = useAuth();
  const { quests } = useQuests(user?.uid);

  if (!quests) return null;

  // Compter les quêtes complétées mais non réclamées
  const unclaimedCount = [
    ...quests.daily.filter(q => q.completed && !q.claimedAt),
    ...quests.weekly.filter(q => q.completed && !q.claimedAt),
  ].length;

  if (unclaimedCount === 0) return null;

  return (
    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-card animate-pulse">
      {unclaimedCount > 9 ? '9+' : unclaimedCount}
    </div>
  );
};
