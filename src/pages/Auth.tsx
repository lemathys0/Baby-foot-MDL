import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { z } from "zod";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { ref, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

const signupSchema = z.object({
  username: z.string().min(3, "Le pseudo doit contenir au moins 3 caractères").max(20, "Le pseudo ne peut pas dépasser 20 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setError(null);
    setValidationErrors({});
    setShowForgotPassword(false);
    setResetEmail("");
    setResetSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate form
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ username, email, password, confirmPassword });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            errors[e.path[0] as string] = e.message;
          }
        });
        setValidationErrors(errors);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.error) {
          setError(result.error);
        }
      } else {
        const result = await signup(email, password, username);
        if (result.error) {
          setError(result.error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔧 FONCTION TEMPORAIRE - Créer un compte admin
  const handleCreateAdminAccount = async () => {
    if (!confirm("⚠️ Créer un compte administrateur de test ?\n\nEmail: admin@test.com\nPassword: admin123")) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. Créer le compte
      const result = await signup("admin@test.com", "admin123", "Admin");
      
      if (result.error) {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // 2. Attendre que l'utilisateur soit créé
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Ajouter le rôle admin
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        await update(userRef, {
          role: "admin"
        });

        toast({
          title: "✅ Compte admin créé!",
          description: "Email: admin@test.com | Password: admin123",
        });

        // Rediriger vers /admin
        setTimeout(() => {
          navigate("/admin");
        }, 1500);
      }
    } catch (error: any) {
      console.error("Erreur création admin:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le compte admin",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    try {
      z.string().email().parse(resetEmail);
    } catch {
      setValidationErrors({ resetEmail: "Adresse email invalide" });
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError("Aucun compte avec cet email");
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mb-8 text-center"
        >
          <motion.span
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mb-4 inline-block text-6xl"
          >
            ⚽
          </motion.span>
          <h1 className="text-3xl font-bold text-foreground">
            Baby-Foot <span className="text-primary text-glow-cyan">App</span>
          </h1>
        </motion.div>

        {/* 🔧 BOUTON ADMIN TEMPORAIRE - À SUPPRIMER EN PRODUCTION */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <Button
            onClick={handleCreateAdminAccount}
            disabled={isLoading}
            className="w-full bg-yellow-600 hover:bg-yellow-700"
            size="sm"
          >
            <Shield className="mr-2 h-4 w-4" />
            🔧 Créer un compte admin de test
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-1">
            ⚠️ Bouton de développement - À supprimer en production
          </p>
        </motion.div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {showForgotPassword
                ? "Mot de passe oublié"
                : isLogin
                ? "Connexion"
                : "Inscription"}
            </CardTitle>
            <CardDescription>
              {showForgotPassword
                ? "Entrez votre email pour réinitialiser votre mot de passe"
                : isLogin
                ? "Connectez-vous pour accéder à votre compte"
                : "Créez votre compte pour rejoindre la communauté"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {showForgotPassword ? (
              // Forgot Password Form
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {!resetSuccess ? (
                  <>
                    <div className="space-y-2">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                      {validationErrors.resetEmail && (
                        <p className="text-xs text-destructive">{validationErrors.resetEmail}</p>
                      )}
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        "Envoyer le lien de réinitialisation"
                      )}
                    </Button>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg bg-green-500/10 p-4 text-center"
                  >
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Un email de réinitialisation a été envoyé à {resetEmail}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Vérifiez votre boîte mail (et les spams)
                    </p>
                  </motion.div>
                )}

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail("");
                      setResetSuccess(false);
                      setError(null);
                      setValidationErrors({});
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    ← Retour à la connexion
                  </button>
                </div>
              </form>
            ) : (
              // Login/Signup Form
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="username"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Pseudo"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                      {validationErrors.username && (
                        <p className="text-xs text-destructive">{validationErrors.username}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-xs text-destructive">{validationErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-xs text-destructive">{validationErrors.password}</p>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="confirmPassword"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirmer le mot de passe"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                      {validationErrors.confirmPassword && (
                        <p className="text-xs text-destructive">{validationErrors.confirmPassword}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? "Connexion..." : "Inscription..."}
                    </>
                  ) : (
                    <>{isLogin ? "Se connecter" : "S'inscrire"}</>
                  )}
                </Button>

                {isLogin && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                      disabled={isLoading}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}
              </form>
            )}

            {!showForgotPassword && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
                </p>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="mt-1 text-sm font-medium text-primary hover:underline"
                  disabled={isLoading}
                >
                  {isLogin ? "Créer un compte" : "Se connecter"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center"
        >
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour à l'accueil
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
