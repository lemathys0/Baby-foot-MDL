import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Trophy, 
  Users, 
  Layers, 
  ShoppingBag,
  Coins,
  MessageCircle,
  Check,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Étapes du tutoriel
const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Baby-Foot App ! ⚽',
    description: 'Découvrez comment profiter au maximum de votre expérience de jeu',
    icon: Sparkles,
    image: '🎉',
    tips: [
      'Affrontez d\'autres joueurs',
      'Collectionnez des cartes uniques',
      'Participez aux tournois quotidiens',
      'Gagnez de la fortune'
    ]
  },
  {
    id: 'fortune',
    title: 'Votre Fortune 💰',
    description: 'La monnaie virtuelle pour progresser dans le jeu',
    icon: Coins,
    image: '💵',
    tips: [
      'Gagnez 100€ de départ',
      'Gagnez en jouant des matchs',
      'Pariez sur les matchs',
      'Achetez des items et des boosters'
    ]
  },
  {
    id: 'matches',
    title: 'Système de Matchs 🎮',
    description: 'Affrontez d\'autres joueurs et gagnez de l\'ELO',
    icon: Users,
    image: '⚔️',
    tips: [
      'Rejoignez la file d\'attente',
      'Matchs 1v1 et 2v2',
      'Système ELO dynamique',
      'Enregistrez vos victoires'
    ]
  },
  {
    id: 'babydex',
    title: 'Le BabyDex 🃏',
    description: 'Collectionnez des cartes de joueurs',
    icon: Layers,
    image: '🎴',
    tips: [
      'Ouvrez des boosters (50€)',
      'Pack gratuit toutes les 2h',
      'Raretés variées : Bronze à Créateur',
      'Échangez sur le marché'
    ]
  },
  {
    id: 'shop',
    title: 'La Boutique 🛍️',
    description: 'Personnalisez votre profil',
    icon: ShoppingBag,
    image: '✨',
    tips: [
      'Avatars et thèmes',
      'Bannières et titres',
      'Effets spéciaux',
      'Lootboxes mystères'
    ]
  },
  {
    id: 'social',
    title: 'Aspect Social 👥',
    description: 'Connectez-vous avec d\'autres joueurs',
    icon: MessageCircle,
    image: '💬',
    tips: [
      'Ajoutez des amis',
      'Créez des groupes de discussion',
      'Rejoignez ou créez un club',
      'Partagez vos victoires'
    ]
  },
  {
    id: 'tournament',
    title: 'Tournois Quotidiens 🏆',
    description: 'Participez aux compétitions',
    icon: Trophy,
    image: '🎖️',
    tips: [
      'Chaque jour : 13h - 14h15',
      'Inscription : 50€ solo / 25€ duo',
      'Élimination directe',
      'Cagnotte redistribuée aux gagnants'
    ]
  }
];

export default function TutorialOverlay({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  if (!isVisible) return null;

  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-2 border-primary/50 shadow-2xl overflow-hidden">
            {/* Header avec progression */}
            <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="bg-background/50">
                  Étape {currentStep + 1}/{tutorialSteps.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Barre de progression */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                />
              </div>
            </div>

            <CardContent className="p-6">
              {/* Icône et titre */}
              <div className="text-center mb-6">
                <motion.div
                  key={step.id}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="text-6xl mb-4"
                >
                  {step.image}
                </motion.div>
                
                <motion.div
                  key={`title-${step.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                    <Icon className="h-6 w-6 text-primary" />
                    {step.title}
                  </h2>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              </div>

              {/* Liste des tips */}
              <motion.div
                key={`tips-${step.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 mb-6"
              >
                {step.tips.map((tip, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-sm flex-1">{tip}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Boutons de navigation */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>
                
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {isLastStep ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Commencer à jouer
                    </>
                  ) : (
                    <>
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {/* Indicateur de skip */}
              {!isLastStep && (
                <div className="text-center mt-4">
                  <button
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Passer le tutoriel
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
