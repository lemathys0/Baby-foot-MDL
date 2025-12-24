import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationSystem } from "@/components/NotificationSystem";
import { useNotifications } from "@/hooks/useNotifications";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import Leaderboard from "./pages/Leaderboard";
import Match from "./pages/Match";
import BabyDex from "./pages/BabyDex";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
import BettingMatches from "./pages/BettingMatches";
import CardMarket from "./pages/CardMarket";
import Shop from "./pages/Shop";
import Clubs from "./pages/Clubs";
import Inventory from "./pages/Inventory";
import Tournament from "./pages/Tournament";
import AdminPanel from "./pages/AdminPanel";
import RecordMatchForm from "./pages/RecordMatchForm";
import Chat from "./pages/Chat";
import MyOffers from "./pages/MyOffers";
import CardStatistics from "./pages/CardStatistics";
import Quests from "./pages/Quests";

const queryClient = new QueryClient();

// Composant interne pour gérer les notifications (nécessite AuthContext)
const AppContent = () => {
  // Initialiser les notifications
  useNotifications();
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/reset-password/:token" element={<PageTransition><ResetPassword /></PageTransition>} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><PageTransition><Index /></PageTransition></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><PageTransition><Inventory /></PageTransition></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><PageTransition><AdminPanel /></PageTransition></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><PageTransition><Leaderboard /></PageTransition></ProtectedRoute>} />
          <Route path="/match" element={<ProtectedRoute><PageTransition><Match /></PageTransition></ProtectedRoute>} />
          <Route path="/record-match" element={<ProtectedRoute><PageTransition><RecordMatchForm /></PageTransition></ProtectedRoute>} />
          <Route path="/babydex" element={<ProtectedRoute><PageTransition><BabyDex /></PageTransition></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><PageTransition><CardMarket /></PageTransition></ProtectedRoute>} />
          <Route path="/my-offers" element={<ProtectedRoute><PageTransition><MyOffers /></PageTransition></ProtectedRoute>} />
          <Route path="/card-statistics" element={<ProtectedRoute><PageTransition><CardStatistics /></PageTransition></ProtectedRoute>} />
          <Route path="/betting" element={<ProtectedRoute><PageTransition><BettingMatches /></PageTransition></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
          <Route path="/shop" element={<ProtectedRoute><PageTransition><Shop /></PageTransition></ProtectedRoute>} />
          <Route path="/clubs" element={<ProtectedRoute><PageTransition><Clubs /></PageTransition></ProtectedRoute>} />
          <Route path="/tournament" element={<ProtectedRoute><PageTransition><Tournament /></PageTransition></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><PageTransition><Chat /></PageTransition></ProtectedRoute>} />
          <Route path="/quests" element={<ProtectedRoute><PageTransition><Quests /></PageTransition></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>

      {/* Centre de notifications (visible uniquement si connecté) */}
      <NotificationSystem />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
