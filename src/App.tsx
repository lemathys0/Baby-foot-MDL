import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Leaderboard from "./pages/Leaderboard";
import Match from "./pages/Match";
import BabyDex from "./pages/BabyDex";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
import BettingMatches from "./pages/BettingMatches";
import Shop from "./pages/Shop";
import Clubs from "./pages/Clubs";
import Inventory from "./pages/Inventory";
import Tournament from "./pages/Tournament";
import AdminPanel from "./pages/AdminPanel"; // ✅ AJOUT DE L'IMPORT

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
<Route path="/inventory" element={<Inventory />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/match"
                element={
                  <ProtectedRoute>
                    <Match />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/babydex"
                element={
                  <ProtectedRoute>
                    <BabyDex />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/betting"
                element={
                  <ProtectedRoute>
                    <BettingMatches />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shop"
                element={
                  <ProtectedRoute>
                    <Shop />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clubs"
                element={
                  <ProtectedRoute>
                    <Clubs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournament"
                element={
                  <ProtectedRoute>
                    <Tournament />
                  </ProtectedRoute>
                }
              />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
