import { logger } from "@/utils/logger";
// 🛡️ Wrapper pour les requêtes Firebase avec gestion d'erreurs améliorée

export interface FirebaseQueryResult<T> {
  data: T | null;
  error: string | null;
  isTimeout: boolean;
  isNetworkError: boolean;
}

/**
 * Wrapper sécurisé pour les requêtes Firebase avec:
 * - Timeout configurable
 * - Gestion d'erreurs réseau
 * - Messages d'erreur user-friendly
 * - Retry automatique optionnel
 */
export async function safeFirebaseQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    timeout?: number;
    errorMessage?: string;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<FirebaseQueryResult<T>> {
  const {
    timeout = 10000,
    errorMessage = "Une erreur est survenue",
    retries = 0,
    retryDelay = 1000,
  } = options;

  let lastError: any = null;

  // Fonction de retry
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Ajouter un timeout à la requête
      const data = await Promise.race<T>([
        queryFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), timeout)
        ),
      ]);

      return {
        data,
        error: null,
        isTimeout: false,
        isNetworkError: false,
      };
    } catch (error: any) {
      lastError = error;

      // Si c'est le dernier essai, on arrête
      if (attempt === retries) {
        break;
      }

      // Attendre avant de réessayer (backoff exponentiel)
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt))
      );
    }
  }

  // Gestion des erreurs
  logger.error("Firebase error:", lastError);

  let message = errorMessage;
  let isTimeout = false;
  let isNetworkError = false;

  if (lastError?.message === "TIMEOUT") {
    message = "La requête a pris trop de temps, veuillez réessayer";
    isTimeout = true;
  } else if (lastError?.code === "unavailable" || lastError?.message?.includes("network")) {
    message = "Pas de connexion internet";
    isNetworkError = true;
  } else if (lastError?.code === "permission-denied") {
    message = "Permission refusée - Vérifiez vos droits d'accès";
  } else if (lastError?.code === "not-found") {
    message = "Données introuvables";
  } else if (lastError?.code === "cancelled") {
    message = "Opération annulée";
  } else if (lastError?.code === "data-loss" || lastError?.code === "internal") {
    message = "Erreur serveur, veuillez réessayer";
  }

  return {
    data: null,
    error: message,
    isTimeout,
    isNetworkError,
  };
}

/**
 * Hook-like helper pour retry automatique avec backoff exponentiel
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Ne pas attendre après le dernier essai
      if (attempt < maxRetries - 1) {
        // Backoff exponentiel: 1s, 2s, 4s, etc.
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Détecte si l'utilisateur est en ligne
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Écoute les changements de connexion
 */
export function onConnectionChange(
  callback: (isOnline: boolean) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Vérifie la santé de la connexion Firebase
 */
export async function checkFirebaseConnection(): Promise<boolean> {
  try {
    // Test simple: essayer de lire .info/connected
    const { database } = await import("./firebase");
    const { ref, get } = await import("firebase/database");

    const connectedRef = ref(database, ".info/connected");
    const snapshot = await Promise.race([
      get(connectedRef),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);

    return snapshot.val() === true;
  } catch (error) {
    logger.warn("Firebase connection check failed:", error);
    return false;
  }
}
