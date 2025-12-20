// 📁 src/components/layout/AppLayout.tsx
// Layout principal avec NotificationCenter intégré dans la navbar

import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Home, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header avec notifications */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Baby-Foot App</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Centre de notifications */}
            <NotificationCenter />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
            >
              <User className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container px-4 py-6">
        {children}
      </main>

      {/* Navigation du bas */}
      <BottomNav />
    </div>
  );
};
