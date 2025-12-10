// src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";

interface ThemeContextType {
  currentTheme: string;
  currentBanner: string;
  currentEffect: string;
  applyTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Définition des thèmes
const THEMES = {
  theme_purple: {
    primary: "270 100% 50%",
    secondary: "280 100% 50%",
    background: "270 20% 5%",
  },
  theme_green: {
    primary: "142 76% 36%",
    secondary: "142 76% 46%",
    background: "142 20% 5%",
  },
  theme_gold: {
    primary: "38 92% 50%",
    secondary: "45 93% 58%",
    background: "38 20% 5%",
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState("");
  const [currentBanner, setCurrentBanner] = useState("");
  const [currentEffect, setCurrentEffect] = useState("");

  // Charger les items équipés
  useEffect(() => {
    if (!user) return;

    const loadEquippedItems = async () => {
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const theme = data.equippedTheme || "";
          const banner = data.equippedBanner || "";
          const effect = data.equippedEffect || "";
          
          setCurrentTheme(theme);
          setCurrentBanner(banner);
          setCurrentEffect(effect);
          
          // Appliquer le thème
          if (theme && THEMES[theme as keyof typeof THEMES]) {
            applyTheme(theme);
          }
        }
      } catch (error) {
        console.error("Erreur chargement items équipés:", error);
      }
    };

    loadEquippedItems();
  }, [user]);

  const applyTheme = (themeId: string) => {
    const theme = THEMES[themeId as keyof typeof THEMES];
    if (!theme) return;

    // Appliquer les couleurs CSS personnalisées
    document.documentElement.style.setProperty("--primary", theme.primary);
    document.documentElement.style.setProperty("--secondary", theme.secondary);
    document.documentElement.style.setProperty("--background", theme.background);
    
    setCurrentTheme(themeId);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        currentBanner,
        currentEffect,
        applyTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
