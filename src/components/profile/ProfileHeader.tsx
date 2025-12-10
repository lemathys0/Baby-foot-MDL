import { Shield, Crown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SHOP_ITEMS } from "@/lib/firebaseExtended";

interface ProfileHeaderProps {
  username: string;
  role: "player" | "agent" | "admin";
  eloRating: number;
  rank: number;
  equippedAvatar?: string;
  equippedBanner?: string;
}

export const ProfileHeader = ({ 
  username, 
  role, 
  eloRating, 
  rank,
  equippedAvatar,
  equippedBanner 
}: ProfileHeaderProps) => {
  const roleConfig = {
    player: { label: "Joueur", color: "bg-blue-500", icon: Shield },
    agent: { label: "Agent", color: "bg-purple-500", icon: Crown },
    admin: { label: "Admin", color: "bg-yellow-500", icon: Crown },
  };

  const config = roleConfig[role];
  const RoleIcon = config.icon;

  // Récupérer l'emoji de l'avatar équipé
  const avatarItem = equippedAvatar ? SHOP_ITEMS.find(item => item.id === equippedAvatar) : null;
  const avatarEmoji = avatarItem?.icon || "😊";

  // Récupérer la bannière équipée
  const bannerItem = equippedBanner ? SHOP_ITEMS.find(item => item.id === equippedBanner) : null;

  return (
    <Card className="relative overflow-hidden">
      {/* Bannière en arrière-plan */}
      {bannerItem && (
        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30">
          <div className="absolute inset-0 flex items-center justify-center text-9xl opacity-10">
            {bannerItem.icon}
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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{username}</h1>
              <Badge variant="outline" className={`${config.color} text-white border-0`}>
                {config.label}
              </Badge>
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
                  Rang: <span className="font-bold text-foreground">#{rank}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
