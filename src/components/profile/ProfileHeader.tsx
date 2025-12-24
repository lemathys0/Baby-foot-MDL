import { Shield, Crown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SHOP_ITEMS } from "@/lib/firebaseExtended";
import { getEloRank } from "@/lib/firebaseMatch";

interface ProfileHeaderProps {
  username: string;
  role: "player" | "agent" | "admin";
  eloRating: number;
  rank: number;
  equippedAvatar?: string;
  equippedBanner?: string;
  equippedTitle?: string;
}

export const ProfileHeader = ({ 
  username, 
  role, 
  eloRating, 
  rank,
  equippedAvatar,
  equippedBanner,
  equippedTitle
}: ProfileHeaderProps) => {
  const roleConfig = {
    player: { label: "Joueur", color: "bg-blue-500", icon: Shield },
    agent: { label: "Agent", color: "bg-purple-500", icon: Crown },
    admin: { label: "Admin", color: "bg-yellow-500", icon: Crown },
  };

  const config = roleConfig[role];
  const RoleIcon = config.icon;

  // Récupérer l'emoji de l'avatar équipé
  const avatarItem = equippedAvatar ? (SHOP_ITEMS.find(item => item && item.id === equippedAvatar) || null) : null;
  const avatarEmoji = avatarItem?.icon || "😊";

  // Récupérer la bannière équipée
  const bannerItem = equippedBanner ? (SHOP_ITEMS.find(item => item && item.id === equippedBanner) || null) : null;

  // Récupérer le titre équipé
  const titleItem = equippedTitle ? (SHOP_ITEMS.find(item => item && item.id === equippedTitle) || null) : null;

  const eloRank = getEloRank(eloRating);

  return (
    <Card className="relative overflow-hidden">
      {/* Bannière en arrière-plan */}
      {bannerItem && (
        <div className="absolute inset-0">
          <div
            className="w-full h-full"
            style={{ background: (bannerItem as any)?.preview || "linear-gradient(135deg, #1e293b 0%, #334155 100%)" }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center text-9xl opacity-20">
            {bannerItem?.icon || "🎪"}
          </div>
        </div>
      )}
      
      <div className="relative p-6">
        <div className="flex items-center gap-6">
          {/* Avatar avec l'emoji équipé */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-5xl shadow-xl border-4 border-background">
              {avatarEmoji}
            </div>
            <div className={`absolute -bottom-1 -right-1 ${config.color} rounded-full p-2 shadow-lg border-2 border-background`}>
              <RoleIcon className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{username}</h1>
                <Badge variant="outline" className={`${config.color} text-white border-0`}>
                  {config.label}
                </Badge>
              </div>
              {titleItem && (
                <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/30 via-cyan-500/30 to-indigo-500/30 border border-cyan-400/60 shadow-md backdrop-blur">
                  <span className="text-lg drop-shadow">{titleItem?.icon || "👑"}</span>
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-cyan-100 drop-shadow-sm">
                    {(titleItem as any)?.preview || titleItem?.name || "Titre"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  ELO: <span className="font-bold text-foreground">{eloRating}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">
                  Rang:{" "}
                  <span
                    className="font-bold"
                    style={{ color: eloRank.color }}
                  >
                    {eloRank.icon} {eloRank.name}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
