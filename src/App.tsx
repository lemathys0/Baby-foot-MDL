import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";
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

const queryClient = new QueryClient();

// Composant interne pour gérer les notifications (nécessite AuthContext)
const AppContent = () => {
  // Initialiser les notifications
  useNotifications();

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/match" element={<ProtectedRoute><Match /></ProtectedRoute>} />
        <Route path="/record-match" element={<ProtectedRoute><RecordMatchForm /></ProtectedRoute>} />
        <Route path="/babydex" element={<ProtectedRoute><BabyDex /></ProtectedRoute>} />
        <Route path="/market" element={<ProtectedRoute><CardMarket /></ProtectedRoute>} />
        <Route path="/my-offers" element={<ProtectedRoute><MyOffers /></ProtectedRoute>} />
        <Route path="/card-statistics" element={<ProtectedRoute><CardStatistics /></ProtectedRoute>} />
        <Route path="/betting" element={<ProtectedRoute><BettingMatches /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
        <Route path="/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
        <Route path="/tournament" element={<ProtectedRoute><Tournament /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Centre de notifications (visible uniquement si connecté) */}
      <NotificationCenter />
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
