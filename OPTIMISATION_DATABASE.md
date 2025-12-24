# 📊 OPTIMISATION DE LA BASE DE DONNÉES

## Résumé des Optimisations Implémentées

### ✅ Limitation de l'historique de fortune (30 jours)

**Gain estimé**: 60-70% de réduction sur `fortuneHistory`

La base de données conserve maintenant uniquement les 30 derniers jours d'historique de fortune pour chaque utilisateur. Les entrées plus anciennes sont automatiquement supprimées.

---

## 🛠️ Script de Nettoyage Manuel

### Nettoyer l'historique d'un utilisateur spécifique

```typescript
import { cleanupOldFortuneHistory } from '@/lib/firebaseExtended';

// Dans la console du navigateur ou un script admin
const result = await cleanupOldFortuneHistory('USER_ID_HERE');
console.log(`Supprimé: ${result.deleted}, Conservé: ${result.kept}`);
```

### Nettoyer l'historique de TOUS les utilisateurs

```typescript
import { cleanupAllFortuneHistories } from '@/lib/firebaseExtended';

// ⚠️ ATTENTION: Cette opération peut prendre du temps
await cleanupAllFortuneHistories();
```

---

## 📈 Estimation des Gains

### Pour une base de 1000 utilisateurs actifs:

#### Avant optimisation:
- **fortuneHistory**: 12.5 MB (1000 utilisateurs × 50 entrées × 250 bytes)

#### Après optimisation (limitation 30 jours):
- **fortuneHistory**: 3.75 MB (1000 utilisateurs × 15 entrées × 250 bytes)

### **Gain: 8.75 MB économisés (70% de réduction)**

---

## 🔄 Automatisation Recommandée

### Option 1: Cloud Function Planifiée (Recommandé)

Créer une Cloud Function qui s'exécute quotidiennement:

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const dailyCleanup = functions.pubsub
  .schedule('every day 03:00')
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    const db = admin.database();
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val();

    let totalDeleted = 0;
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (const userId of Object.keys(users)) {
      const historySnapshot = await db.ref(`fortuneHistory/${userId}`).once('value');

      if (!historySnapshot.exists()) continue;

      const updates: { [key: string]: null } = {};

      historySnapshot.forEach((child) => {
        const entry = child.val();
        if (entry.timestamp < cutoffDate) {
          updates[`fortuneHistory/${userId}/${child.key}`] = null;
          totalDeleted++;
        }
      });

      if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
      }
    }

    console.log(`Cleanup terminé: ${totalDeleted} entrées supprimées`);
    return null;
  });
```

### Option 2: Script Manuel Mensuel

Exécuter manuellement une fois par mois:

```bash
# Dans la console Firebase ou via un script Node.js
node scripts/cleanup-database.js
```

---

## ✅ Optimisations Implémentées (Version 2.2.0)

### 1. ✅ Suppression des redondances dans les matchs
**Gain estimé**: 35%

Les `team1Names` et `team2Names` sont **supprimés** des matchs. Les noms sont maintenant récupérés à la volée depuis `users/` lors de la lecture.

### 2. ✅ Compression des timestamps
**Gain estimé**: 12%

Tous les timestamps sont maintenant stockés en **secondes** au lieu de millisecondes:
- `fortuneHistory/*/timestamp` → `fortuneHistory/*/ts` (secondes)
- `matches/*/timestamp` → `matches/*/ts` (secondes)
- `userBadges/*/unlockedAt` → `userBadges/*/ua` (secondes)
- `users/*/createdAt` → `users/*/ca` (secondes)
- `users/*/lastBonusClaim` → converti en secondes

### 3. ✅ Enum numériques
**Gain estimé**: 8%

Toutes les strings sont remplacées par des nombres:
- `role: "player"` → `r: 0`
- `matchType: "1v1"` → `mt: 0`
- `status: "open"` → `st: 0`
- `reason: "Daily bonus"` → `rs: 0`
- `badgeId: "tueur_gamelle"` → `tg`
- `banned: true` → `b: 1`
- `hasSeenTutorial: false` → `hasSeenTutorial: 0`

### 4. ✅ Abréviations des clés
**Gain estimé**: 20%

Toutes les clés sont abrégées:
- `username` → `un`
- `fortune` → `f`
- `elo1v1` → `e1`, `elo2v2` → `e2`, `eloGlobal` → `eg`
- `wins1v1` → `w1`, `losses1v1` → `l1`
- `team1` → `t1`, `team2` → `t2`
- `timestamp` → `ts`, `change` → `c`, `reason` → `rs`
- Et 50+ autres clés...

---

## ⚠️ Précautions

1. **Toujours faire un backup** avant d'exécuter des opérations de nettoyage massif
2. **Tester sur un environnement de développement** d'abord
3. **Surveiller les logs** pendant le nettoyage
4. **Ne pas exécuter plusieurs fois** le même script sans vérifier les résultats

---

## 📊 Monitoring

### Vérifier la taille de la base de données:

1. Aller dans Firebase Console → Realtime Database
2. Consulter l'onglet "Usage"
3. Noter la taille totale avant/après nettoyage

### Logs de nettoyage:

Les fonctions de nettoyage loguent leurs actions dans la console:

```
🗑️ [Cleanup] Supprimé 35 entrées d'historique pour uid123, conservé 15
✅ [Cleanup Global] Terminé: 1500 entrées supprimées, 500 conservées
```

---

## 🚀 Déploiement

Les fonctions de nettoyage sont maintenant disponibles dans `/src/lib/firebaseExtended.ts`:

- `cleanupOldFortuneHistory(userId)` - Nettoie l'historique d'un utilisateur
- `cleanupAllFortuneHistories()` - Nettoie tous les historiques

**Version déployée**: index-bwdQMTUJ.js
**URL**: https://baby-footv2.web.app

---

## 📝 Changelog

### Version 2.2.0 (2024-12-24) - OPTIMISATION COMPLÈTE
- ✅ **Fichier créé**: `src/lib/dbOptimization.ts` (486 lignes)
  - Mappings de toutes les clés (KEY_MAP, REVERSE_KEY_MAP)
  - Enums numériques (ROLE_ENUM, MATCH_TYPE_ENUM, STATUS_ENUM, FORTUNE_REASON_ENUM, BADGE_ENUM)
  - Fonctions de conversion (toSeconds, toMilliseconds, boolToNum, numToBool)
  - Fonctions optimize/deoptimize pour tous les types de données
- ✅ **Optimisé**: `addFortuneHistoryEntry()` - Structure compactée (ts, f, c, rs)
- ✅ **Optimisé**: `recordMatch()` - Matchs avec clés abrégées et sans redondances
- ✅ **Optimisé**: `finishMatch()` - Matchs optimisés également pour les paris
- ✅ **Optimisé**: `checkAchievements()` - Badges avec structure compactée
- ✅ **Optimisé**: `AuthContext.signup()` - Création utilisateur avec structure compactée
- ✅ **Gain total estimé**: 54% de réduction de taille

### Version 2.1.0 (2025-01-XX)
- ✅ Ajout fonction `cleanupOldFortuneHistory()`
- ✅ Ajout fonction `cleanupAllFortuneHistories()`
- ✅ Limitation automatique à 30 jours dans `addFortuneHistoryEntry()`
- ✅ Documentation complète de l'optimisation

---

## 💡 Recommandations Futures

1. **Automatiser le nettoyage** avec une Cloud Function quotidienne
2. **Implémenter l'archivage** des données > 30 jours dans Cloud Storage
3. **Monitorer l'espace utilisé** et ajuster la rétention si nécessaire
4. **Documenter les patterns d'utilisation** pour identifier d'autres optimisations
