import { Home, Trophy, Users, Layers, User, Coins, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { QuestBadge } from "./QuestBadge";

const navItems = [
  { to: "/", icon: Home, label: "Accueil", badge: null },
  { to: "/leaderboard", icon: Trophy, label: "Classement", badge: null },
  { to: "/match", icon: Users, label: "Match", badge: null },
  { to: "/quests", icon: Target, label: "Quêtes", badge: QuestBadge },
  { to: "/babydex", icon: Layers, label: "BabyDex", badge: null },
  { to: "/profile", icon: User, label: "Profil", badge: null },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto max-w-lg overflow-x-auto">
        <div className="flex h-16 items-center justify-around px-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-all",
                        isActive && "text-glow-cyan"
                      )}
                    />
                    {item.badge && <item.badge />}
                  </div>
                  <span className="relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

