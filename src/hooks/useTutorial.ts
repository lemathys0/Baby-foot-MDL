import { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';

export const useTutorial = (userId: string | undefined) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const checkTutorialStatus = async () => {
      try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          // Vérifier si l'utilisateur a déjà vu le tutoriel
          const hasSeenTutorial = userData.hasSeenTutorial || false;
          
          // Si c'est la première connexion (pas de tutoriel vu)
          if (!hasSeenTutorial) {
            setShowTutorial(true);
          }
        }
      } catch (error) {
        console.error('Erreur vérification tutoriel:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTutorialStatus();
  }, [userId]);

  const completeTutorial = async () => {
    if (!userId) return;

    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        hasSeenTutorial: true,
        tutorialCompletedAt: Date.now(),
      });
      
      setShowTutorial(false);
    } catch (error) {
      console.error('Erreur completion tutoriel:', error);
    }
  };

  const resetTutorial = async () => {
    if (!userId) return;

    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        hasSeenTutorial: false,
      });
      
      setShowTutorial(true);
    } catch (error) {
      console.error('Erreur reset tutoriel:', error);
    }
  };

  return {
    showTutorial,
    isLoading,
    completeTutorial,
    resetTutorial,
  };
};
