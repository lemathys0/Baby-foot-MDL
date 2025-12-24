# 🎮 Nouveaux Systèmes Implémentés

## Vue d'ensemble

Trois nouveaux systèmes majeurs ont été ajoutés à l'application Baby-Foot:

1. **Système de Défis Directs** - Lancez des défis personnalisés à vos amis
2. **Système de Rivalités Automatiques** - Suivi automatique des rivalités basé sur l'historique de matchs
3. **Notifications Push Enrichies** - Notifications améliorées avec priorités et actions

---

## 🥊 Système de Défis Directs

### Fonctionnalités

#### Création de Défis
- Défier un ami en 1v1 ou 2v2
- Ajouter un message personnalisé (optionnel)
- Miser de la fortune sur le résultat (optionnel)
- Les défis expirent automatiquement après 24h

#### Gestion des Défis
- **Accepter** - Accepter le défi et jouer le match
- **Refuser** - Décliner poliment le défi
- **Annuler** - Le créateur peut annuler avant acceptation
- Notifications en temps réel pour tous les événements

#### Interface Utilisateur
- Page dédiée `/challenges`
- Vue des défis en attente
- Vue des défis actifs
- Historique des défis passés
- Statistiques rapides (en attente, actifs, terminés)

### Utilisation

1. Allez sur la page "Défis"
2. Cliquez sur "Nouveau défi"
3. Sélectionnez un ami
4. Choisissez 1v1 ou 2v2
5. Ajoutez un message (optionnel)
6. Ajoutez une mise (optionnel)
7. Envoyez le défi

Votre ami recevra une notification et pourra accepter ou refuser le défi.

### Intégration avec les Matchs

Lorsqu'un match est joué entre deux joueurs ayant un défi actif:
- Le défi est automatiquement marqué comme "terminé"
- Le gagnant est enregistré
- Si une mise était impliquée, la fortune est transférée automatiquement
- Les deux joueurs reçoivent une notification du résultat

### Fichiers Concernés
- `src/lib/challengeSystem.ts` - Logique du système
- `src/pages/Challenges.tsx` - Interface utilisateur
- `database.rules.json` - Règles de sécurité pour `/challenges`

---

## 🔥 Système de Rivalités Automatiques

### Fonctionnalités

#### Suivi Automatique
- Les rivalités se créent automatiquement après le premier match 1v1
- Mise à jour automatique après chaque match 1v1
- Calcul en temps réel des statistiques

#### Niveaux d'Intensité
- **Casual** 🟢 - 1 à 9 matchs
- **Intense** 🟡 - 10 à 19 matchs
- **Légendaire** 🔥 - 20+ matchs

#### Statistiques par Rivalité
- Nombre total de matchs
- Victoires/défaites pour chaque joueur
- Taux de victoire
- Date du dernier match
- Statut (Dominant, Favori, Équilibré, Challengé, En difficulté)

#### Notifications de Milestones
Notifications automatiques envoyées à:
- 10 matchs (passage en "Intense")
- 20 matchs (passage en "Légendaire")
- 50 matchs (rivalité épique)

### Interface Utilisateur

#### Onglet "Mes Rivalités"
- Liste de toutes vos rivalités personnelles
- Triées par intensité et nombre de matchs
- Affichage de votre taux de victoire
- Statistiques personnalisées

#### Onglet "Top Rivalités"
- Classement des 10 rivalités les plus intenses du système
- Affichage neutre (sans perspective personnelle)
- Permet de voir les grandes rivalités de la communauté

### Utilisation

1. Jouez des matchs en 1v1
2. Les rivalités se créent automatiquement
3. Consultez vos rivalités sur `/rivalries`
4. Suivez l'évolution de votre domination (ou souffrance 😅)

### Intégration Automatique

Le système est complètement automatique:
- Chaque match 1v1 met à jour ou crée une rivalité
- Les statistiques sont calculées en temps réel
- Les notifications de milestones sont envoyées automatiquement
- Aucune action manuelle requise

### Fichiers Concernés
- `src/lib/rivalrySystem.ts` - Logique du système
- `src/pages/Rivalries.tsx` - Interface utilisateur
- `src/lib/firebaseMatch.ts:1088-1128` - Intégration automatique
- `database.rules.json` - Règles de sécurité pour `/rivalries`

---

## 📢 Notifications Push Enrichies

### Nouvelles Fonctionnalités

#### Types de Notifications Ajoutés
- `challenge_received` - Nouveau défi reçu
- `challenge_accepted` - Défi accepté
- `challenge_declined` - Défi refusé
- `challenge_won` - Défi gagné
- `challenge_lost` - Défi perdu
- `rivalry_milestone` - Milestone de rivalité atteint
- `quest_completed` - Quête terminée
- `achievement_unlocked` - Succès débloqué

#### Enrichissements

**Niveaux de Priorité**
- `low` - Notifications non urgentes
- `normal` - Notifications standard (par défaut)
- `high` - Notifications importantes

**Action URLs**
- Redirection automatique vers la page concernée
- `/challenges` pour les défis
- `/rivalries` pour les rivalités
- `/quests` pour les quêtes
- `/profile` pour les succès

**Support d'Images** (préparé pour l'avenir)
- Champ `imageUrl` ajouté
- Permet d'afficher des images dans les notifications
- Non utilisé actuellement mais infrastructure en place

### Exemples d'Utilisation

```typescript
// Notification de défi avec priorité haute et stake
await notifyChallengeReceived(
  userId,
  "Mathys",
  "1v1",
  500, // 500€ en jeu
  challengeId
);

// Notification de milestone de rivalité
await notifyRivalryMilestone(
  userId,
  "Maxence",
  "LÉGENDAIRE",
  20
);

// Notification de quête complétée
await notifyQuestCompleted(
  userId,
  "Maître du duel",
  15 // Récompense en €
);
```

### Nouvelles Fonctions Disponibles

#### Défis
- `notifyChallengeReceived()`
- `notifyChallengeAccepted()`
- `notifyChallengeDeclined()`
- `notifyChallengeWon()`
- `notifyChallengeLost()`

#### Rivalités
- `notifyRivalryMilestone()`

#### Quêtes et Succès
- `notifyQuestCompleted()`
- `notifyAchievementUnlocked()`

### Fichiers Concernés
- `src/lib/firebaseNotifications.ts` - Système enrichi
- Interface `Notification` mise à jour avec nouveaux champs

---

## 🎯 Prochaines Étapes Suggérées

### Améliorations Possibles

1. **Défis**
   - Défis d'équipe en 2v2 avec sélection des coéquipiers
   - Tournois à élimination directe basés sur des défis
   - Système de classement des défis gagnés

2. **Rivalités**
   - Graphiques d'évolution de la rivalité
   - Historique détaillé des matchs de la rivalité
   - "Rival du mois" basé sur le nombre de matchs
   - Badges spéciaux pour les rivalités légendaires

3. **Notifications**
   - Notifications push natives (FCM)
   - Sons personnalisés par type de notification
   - Groupement des notifications similaires
   - Centre de notifications avec filtres

4. **Intégrations**
   - Lier les défis aux tournois
   - Quêtes spéciales pour les rivalités
   - Succès pour les défis et rivalités
   - Statistiques avancées par rivalité

---

## 📊 Structure de Données

### Challenges
```typescript
{
  id: string
  challengerId: string
  challengerUsername: string
  challengedId: string
  challengedUsername: string
  type: "1v1" | "2v2"
  message?: string
  stake?: number
  status: "pending" | "accepted" | "declined" | "expired" | "completed"
  createdAt: number
  expiresAt: number
  acceptedAt?: number
  completedAt?: number
  winnerId?: string
}
```

### Rivalries
```typescript
{
  id: string
  player1Id: string
  player2Id: string
  player1Username: string
  player2Username: string
  player1Wins: number
  player2Wins: number
  totalMatches: number
  lastMatchDate: number
  createdAt: number
  intensity: "casual" | "heated" | "legendary"
}
```

### Notifications (Enrichies)
```typescript
{
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string
  read: boolean
  createdAt: number
  imageUrl?: string      // NOUVEAU
  actionUrl?: string     // NOUVEAU
  priority?: string      // NOUVEAU
}
```

---

## 🔒 Sécurité Firebase

Les règles de sécurité ont été mises à jour pour protéger les nouveaux systèmes:

### Challenges
- Lecture: Tous les utilisateurs authentifiés
- Écriture: Uniquement les participants (challenger ou challenged)

### Rivalries
- Lecture: Tous les utilisateurs authentifiés
- Écriture: Tous les utilisateurs authentifiés (pour les mises à jour automatiques)

---

## ✅ Tests Recommandés

1. **Défis**
   - [ ] Créer un défi sans mise
   - [ ] Créer un défi avec mise
   - [ ] Accepter un défi
   - [ ] Refuser un défi
   - [ ] Annuler un défi avant acceptation
   - [ ] Vérifier l'expiration après 24h
   - [ ] Jouer un match avec défi actif

2. **Rivalités**
   - [ ] Jouer 1 match 1v1 (création rivalité)
   - [ ] Jouer 10+ matchs (passage "Intense")
   - [ ] Jouer 20+ matchs (passage "Légendaire")
   - [ ] Vérifier les statistiques
   - [ ] Vérifier les notifications de milestones

3. **Notifications**
   - [ ] Recevoir notification de défi
   - [ ] Recevoir notification de milestone
   - [ ] Cliquer sur actionUrl
   - [ ] Vérifier les priorités

---

## 📝 Notes Importantes

- Les rivalités ne se créent que pour les matchs **1v1** (pas 2v2)
- Les défis expirent après **24 heures** si non acceptés
- Les milestones de rivalité sont à **10, 20, et 50 matchs**
- La fortune est transférée **automatiquement** quand un défi avec mise est terminé
- Les notifications ont une **priorité normale** par défaut

---

## 🚀 Déploiement

Tous les systèmes ont été déployés sur:
- **Hosting**: https://baby-footv2.web.app
- **Database Rules**: Déployées et actives
- **Status**: ✅ Production Ready

Profitez des nouvelles fonctionnalités! 🎉
