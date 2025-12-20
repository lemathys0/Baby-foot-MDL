import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, database } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  username: string;
  eloRating: number;
  elo1v1?: number;
  elo2v2?: number;
  eloGlobal?: number;
  wins: number;
  losses: number;
  fortune: number;
  totalEarned: number;
  role: "admin" | "agent" | "player";
  banned?: boolean;
  bannedAt?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async (uid: string) => {
    try {
      const profileRef = ref(database, `users/${uid}`);
      const snapshot = await get(profileRef);
      if (snapshot.exists()) {
        const profile = snapshot.val() as UserProfile;
        
        // ✅ FIX: Vérifier si l'utilisateur est banni
        if (profile.banned === true) {
          // Déconnecter automatiquement l'utilisateur banni
          await signOut(auth);
          
          toast({
            title: "🚫 Compte banni",
            description: "Votre compte a été banni. Contactez un administrateur.",
            variant: "destructive",
          });
          
          setUser(null);
          setUserProfile(null);
          return;
        }
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => {
          fetchUserProfile(currentUser.uid);
        }, 0);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login function with ban check
  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // ✅ FIX: Vérifier immédiatement si l'utilisateur est banni
      const profileRef = ref(database, `users/${uid}`);
      const snapshot = await get(profileRef);
      
      if (snapshot.exists()) {
        const profile = snapshot.val() as UserProfile;
        
        if (profile.banned === true) {
          // Déconnecter immédiatement
          await signOut(auth);
          
          return { 
            error: "🚫 Ce compte a été banni. Contactez un administrateur pour plus d'informations." 
          };
        }
      }
      
      return { error: null };
    } catch (error: any) {
      let errorMessage = "Une erreur est survenue lors de la connexion.";
      
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Adresse email invalide.";
          break;
        case "auth/user-disabled":
          errorMessage = "Ce compte a été désactivé.";
          break;
        case "auth/user-not-found":
          errorMessage = "Aucun compte trouvé avec cette adresse email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Mot de passe incorrect.";
          break;
        case "auth/invalid-credential":
          errorMessage = "Email ou mot de passe incorrect.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Trop de tentatives. Réessayez plus tard.";
          break;
      }
      
      return { error: errorMessage };
    }
  };

  // Signup function
  const signup = async (
    email: string,
    password: string,
    username: string
  ): Promise<{ error: string | null }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Update display name
      await updateProfile(newUser, { displayName: username });

      // Create user profile in database
      const newProfile: UserProfile = {
        username,
        eloRating: 1000,
        wins: 0,
        losses: 0,
        fortune: 100,
        totalEarned: 0,
        role: "player",
        banned: false,
        createdAt: new Date().toISOString(),
      };

      await set(ref(database, `users/${newUser.uid}`), newProfile);
      setUserProfile(newProfile);

      return { error: null };
    } catch (error: any) {
      let errorMessage = "Une erreur est survenue lors de l'inscription.";
      
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Cette adresse email est déjà utilisée.";
          break;
        case "auth/invalid-email":
          errorMessage = "Adresse email invalide.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "L'inscription par email n'est pas activée.";
          break;
        case "auth/weak-password":
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
          break;
      }
      
      return { error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
