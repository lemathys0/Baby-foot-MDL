import { Component, ReactNode } from 'react';
import DailyBonusCard from './DailyBonusCard';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class DailyBonusErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ Erreur DailyBonus:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // En cas d'erreur, ne rien afficher (fail silently)
      console.warn('⚠️ Le composant bonus quotidien a rencontré une erreur et a été désactivé');
      return null;
    }

    return this.props.children;
  }
}

export default function SafeDailyBonusCard() {
  return (
    <DailyBonusErrorBoundary>
      <DailyBonusCard />
    </DailyBonusErrorBoundary>
  );
}
