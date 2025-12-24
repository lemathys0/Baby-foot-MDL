# 🏆 Baby-Foot V2

Application web de gestion de tournois et matchs de baby-foot avec système de cartes à collectionner, paris, et économie de jeu complète.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Développement](#-développement)
- [Build & Déploiement](#-build--déploiement)
- [Structure du projet](#-structure-du-projet)
- [Systèmes de jeu](#-systèmes-de-jeu)

## ✨ Fonctionnalités

### 🎮 Gestion des Matchs
- Matchs 1v1 et 2v2
- Système ELO multi-modes (1v1, 2v2, Global)
- 8 rangs de progression (Bronze → Challenger)
- File d'attente de matchmaking
- Historique complet des matchs

### 🃏 Système de Cartes (BabyDex)
- Collection de cartes de joueurs
- 9 raretés différentes (Bronze, Silver, Gold, Espoir, Icône, Future Star, GOD, Créateur, Unknown)
- Système de packs de cartes
- Marketplace pour échanger des cartes
- Statistiques détaillées par carte

### 🏆 Tournois
- Création de tournois personnalisés
- Formats: 1v1, 2v2, Battle Royale
- Système d'inscriptions
- Génération automatique de brackets
- Suivi en temps réel
- Récompenses automatiques

### 💰 Économie
- Système de fortune (monnaie du jeu)
- Paris sur les matchs
- Shop avec items cosmétiques (thèmes, cadres, badges)
- Bonus quotidiens
- Système fiscal (taxes mensuelles progressives)
- Historique des transactions

### 👥 Social
- Système d'amis
- Chat en temps réel
- Clubs (équipes persistantes)
- Profils de joueurs détaillés
- Notifications en temps réel (PWA)

### 🛡️ Administration
- Panel admin complet
- Système anti-triche
- Gestion des joueurs et contenu
- Envoi d'annonces
- Statistiques globales

## 🛠 Technologies

### Frontend
- **React** 18.3.1 - Framework UI
- **TypeScript** 5.5.4 - Typage statique
- **Vite** 5.4.21 - Build tool ultra-rapide
- **Tailwind CSS** 3.4.6 - Styling utilitaire
- **shadcn/ui** - Composants UI (Radix UI)
- **Framer Motion** 12.23.25 - Animations
- **React Router** 6.30.2 - Routing

### Backend & Services
- **Firebase** 10.14.1
  - Authentication (email/password)
  - Realtime Database
  - Cloud Messaging (notifications push)
  - Analytics
  - Hosting

### État & Data
- **React Query** (@tanstack/react-query) - Cache et sync serveur
- **React Hook Form** 7.61.1 - Gestion de formulaires
- **Zod** 3.23.8 - Validation de schémas

### PWA
- **Vite PWA** - Progressive Web App
- Service Workers pour offline
- Notifications push

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Firebase

### Étapes

1. **Cloner le dépôt**
```bash
git clone <repo-url>
cd "V2 app"
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Firebase** (voir section suivante)

4. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Cloud Messaging (VAPID Key)
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### Firebase Setup

1. Créer un projet Firebase sur https://console.firebase.google.com
2. Activer l'Authentication (email/password)
3. Créer une Realtime Database
4. Activer Cloud Messaging
5. Copier les credentials dans `.env.local`
6. Configurer les règles de sécurité (voir `database.rules.json`)

### Déploiement des règles Firebase

```bash
firebase deploy --only database
```

## 💻 Développement

### Scripts disponibles

```bash
# Développement
npm run dev              # Lancer le serveur de dev

# Build
npm run build            # Build de production
npm run preview          # Preview du build

# Qualité du code
npm run lint             # Linter le code
npm run type-check       # Vérifier les types TypeScript

# Firebase
firebase deploy          # Déployer sur Firebase Hosting
firebase serve          # Tester le déploiement localement
```

### Conventions de code

- **Composants** : PascalCase (`ProfileHeader.tsx`)
- **Hooks** : camelCase avec préfixe `use` (`useAuth.ts`)
- **Utils** : camelCase (`firebase.ts`)
- **Imports** : Utiliser les alias `@/` pour les imports absolus

### Architecture des composants

```
src/
├── components/
│   ├── ui/              # Composants shadcn/ui
│   ├── common/          # Composants réutilisables
│   ├── profile/         # Composants du profil
│   │   └── sections/    # Sous-composants extraits
│   ├── leaderboard/     # Composants du classement
│   └── ...              # Autres features
├── pages/               # Pages principales
├── hooks/               # Custom React hooks
├── contexts/            # Context API providers
├── lib/                 # Logique métier & Firebase
└── utils/               # Utilitaires
```

## 📦 Build & Déploiement

### Build de production

```bash
npm run build
```

Le build est créé dans `/dist` avec :
- Code splitting par vendor (Firebase, React, Radix, UI)
- Minification et tree-shaking
- Service Worker PWA
- Assets optimisés

Taille du build : ~1.9 MB (gzipped: ~490 KB)

### Déploiement Firebase

```bash
# Premier déploiement
firebase login
firebase init

# Déploiements suivants
firebase deploy
```

Configuration dans `firebase.json` :
- Hosting sur `/dist`
- Rewrites pour SPA
- Headers de cache
- Database rules

## 🏗 Structure du projet

### Principales pages

| Page | Route | Description |
|------|-------|-------------|
| Auth | `/auth` | Connexion/Inscription |
| Index | `/` | Dashboard principal |
| Profile | `/profile` | Profil utilisateur |
| Match | `/match` | Jouer un match |
| Tournament | `/tournament` | Gestion de tournois |
| Leaderboard | `/leaderboard` | Classements ELO |
| BabyDex | `/babydex` | Collection de cartes |
| CardMarket | `/card-market` | Marketplace |
| BettingMatches | `/betting` | Paris sur matchs |
| Shop | `/shop` | Boutique d'items |
| Clubs | `/clubs` | Système de clubs |
| AdminPanel | `/admin` | Panel administrateur |

### Fichiers de configuration

| Fichier | Utilité |
|---------|---------|
| `vite.config.ts` | Configuration Vite avec code splitting |
| `tailwind.config.ts` | Thème Tailwind personnalisé |
| `tsconfig.json` | Configuration TypeScript |
| `firebase.json` | Configuration Firebase |
| `database.rules.json` | Règles de sécurité Firebase |
| `.env.local` | Variables d'environnement (non versionné) |

## 🎯 Systèmes de jeu

### Système ELO

**Rangs** (par ordre croissant) :
1. Bronze (0-1099)
2. Argent (1100-1299)
3. Or (1300-1499)
4. Platine (1500-1699)
5. Diamant (1700-1899)
6. Maître (1900-2099)
7. Grand Maître (2100-2299)
8. Challenger (2300+)

**K-Factor** : 32 (ajustement rapide)

### Système de Raretés

| Rareté | Couleur | Drop Rate |
|--------|---------|-----------|
| Bronze | #CD7F32 | Commun |
| Silver | #C0C0C0 | Commun |
| Gold | #FFD700 | Peu commun |
| Espoir | Blue | Rare |
| Icône | Purple | Très rare |
| Future Star | Cyan | Épique |
| GOD | Primary | Légendaire |
| Créateur | Secondary | Mythique |

### Système Fiscal

**Barème progressif** (sur gains de paris mensuels) :
- 0-99€ : 10%
- 100-999€ : 15%
- 1000-1999€ : 19%
- 2000€+ : 23%

**Période de paiement** : Dernier week-end du mois uniquement

## 🔧 Optimisations implémentées

### Performance
- ✅ Cache pour `getAvailablePlayers()` (TTL: 30s)
- ✅ Lazy loading des images (LazyImage component)
- ✅ React.memo sur composants de liste (LeaderboardItem, PlayerCard)
- ✅ Code splitting par vendor
- ✅ Service Worker PWA

### Gestion d'erreurs
- ✅ Wrapper `safeFirebaseQuery` avec retry et timeout
- ✅ Détection de connexion réseau
- ✅ Messages d'erreur user-friendly
- ✅ Error boundaries React

### Qualité du code
- ✅ Credentials Firebase déplacés vers `.env.local`
- ✅ Composants volumineux découpés (TaxInfoCard extraite)
- ✅ Types TypeScript pour toutes les interfaces

## 📝 Licence

Projet privé - Tous droits réservés

## 👥 Contributeurs

- Équipe de développement Baby-Foot V2

## 🆘 Support

Pour toute question ou problème :
1. Vérifier la console navigateur pour les erreurs
2. Vérifier les règles Firebase
3. Vérifier que `.env.local` est correctement configuré
4. Consulter la documentation Firebase

---

**Version actuelle** : 2.0
**Dernière mise à jour** : Décembre 2024
