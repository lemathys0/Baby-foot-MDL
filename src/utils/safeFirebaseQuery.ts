/**
 * ✅ Wrapper pour les requêtes Firebase avec gestion d'erreurs améliorée
 * Gère les timeouts, erreurs réseau, et permissions
 */
export async function safeFirebaseQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    timeout?: number;
    errorMessage?: string;
    retries?: number;
  } = {}
): Promise<{ data: T | null; error: string | null }> {
  const { timeout = 10000, errorMessage = "Une erreur est survenue", retries = 1 } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const data = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        )
      ]);
      
      return { data, error: null };
    } catch (error: any) {
      lastError = error;
      logger.error(`Firebase query attempt ${attempt + 1}/${retries} failed:`, error);
      
      // Si ce n'est pas la dernière tentative, attendre avant de réessayer
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  
  // Gérer les différents types d'erreurs
  let message = errorMessage;
  
  if (lastError) {
    if (lastError.message === "Timeout") {
      message = "La requête a pris trop de temps. Vérifiez votre connexion.";
    } else if (lastError.code === 'unavailable' || lastError.code === 'network-request-failed') {
      message = "Pas de connexion internet. Vérifiez votre réseau.";
    } else if (lastError.code === 'permission-denied') {
      message = "Permission refusée. Vous n'avez pas accès à cette ressource.";
    } else if (lastError.code === 'unauthenticated') {
      message = "Vous devez être connecté pour effectuer cette action.";
    } else if (lastError.message) {
      message = lastError.message;
    }
  }
  
  return { data: null, error: message };
}

