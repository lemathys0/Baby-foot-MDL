import { useState, useEffect, useCallback } from "react";

/**
 * ✅ Hook pour exécuter une requête avec retry automatique
 * Utile pour les connexions mobiles instables
 */
export function useRetryableQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    enabled?: boolean;
  } = {}
) {
  const { retries = 3, delay = 1000, enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const execute = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    let currentAttempt = 0;

    while (currentAttempt < retries) {
      try {
        const result = await Promise.race([
          queryFn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout après 10 secondes")), 10000)
          )
        ]);
        
        setData(result);
        setError(null);
        setIsLoading(false);
        setAttempt(currentAttempt + 1);
        return;
      } catch (err) {
        currentAttempt++;
        setAttempt(currentAttempt);
        
        if (currentAttempt >= retries) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          return;
        }
        
        // Attendre avant de réessayer (backoff exponentiel)
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(2, currentAttempt - 1))
        );
      }
    }
  }, [queryFn, retries, delay, enabled]);

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, error, isLoading, attempt, refetch };
}

