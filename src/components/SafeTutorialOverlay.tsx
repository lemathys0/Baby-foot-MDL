import { Component, ReactNode } from 'react';
import TutorialOverlay from './TutorialOverlay';
import { logger } from '@/utils/logger';

interface Props {
  onComplete: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class TutorialErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    logger.error('❌ [TutorialErrorBoundary] Erreur capturée:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('❌ [TutorialErrorBoundary] Détails:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      logger.warn('⚠️ Le composant tutoriel a rencontré une erreur et sera désactivé');
      
      // Compléter automatiquement le tutoriel pour éviter de bloquer l'utilisateur
      setTimeout(() => {
        try {
          this.props.onComplete();
        } catch (err) {
          logger.error('❌ Erreur lors de la complétion automatique:', err);
        }
      }, 100);
      
      return null;
    }

    return <TutorialOverlay onComplete={this.props.onComplete} />;
  }
}

export default function SafeTutorialOverlay({ onComplete }: Props) {
  // Vérification de sécurité
  if (!onComplete || typeof onComplete !== 'function') {
    logger.error('❌ [SafeTutorialOverlay] onComplete invalide');
    return null;
  }

  return (
    <TutorialErrorBoundary onComplete={onComplete}>
      <TutorialOverlay onComplete={onComplete} />
    </TutorialErrorBoundary>
  );
}
