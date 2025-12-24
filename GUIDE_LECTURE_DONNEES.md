# 📖 GUIDE DE LECTURE DES DONNÉES OPTIMISÉES

## ⚠️ IMPORTANT

Depuis la version 2.2.0, **toutes les nouvelles données** sont stockées dans un format optimisé avec des clés abrégées.

## 🔄 Compatibilité

Les fonctions de lecture sont **rétrocompatibles** et fonctionnent avec:
- ✅ Les anciennes données (clés longues)
- ✅ Les nouvelles données (clés abrégées)

Vous n'avez **RIEN à modifier** dans votre code de lecture actuel. Les données sont automatiquement déoptimisées lors de la lecture.

---

## 📊 Format des Données dans Firebase

### Utilisateurs (`users/`)

**Ancien format (avant v2.2.0)**:
```json
{
  "username": "Alice",
  "fortune": 1500,
  "elo1v1": 1200,
  "wins1v1": 10,
  "role": "player",
  "banned": false,
  "createdAt": 1704067200000
}
```

**Nouveau format (v2.2.0+)**:
```json
{
  "un": "Alice",
  "f": 1500,
  "e1": 1200,
  "w1": 10,
  "r": 0,
  "b": 0,
  "ca": 1704067200
}
```

### Matchs (`matches/`)

**Ancien format**:
```json
{
  "team1": ["uid1"],
  "team2": ["uid2"],
  "team1Names": ["Alice"],
  "team2Names": ["Bob"],
  "matchType": "1v1",
  "score1": 10,
  "score2": 5,
  "timestamp": 1704067200000,
  "suspicious": false
}
```

**Nouveau format**:
```json
{
  "t1": ["uid1"],
  "t2": ["uid2"],
  "mt": 0,
  "s1": 10,
  "s2": 5,
  "ts": 1704067200,
  "su": 0
}
```

**Note**: Les `team1Names` et `team2Names` sont **supprimés** pour économiser de l'espace. Récupérez les noms depuis `users/` lors de l'affichage.

### Historique Fortune (`fortuneHistory/`)

**Ancien format**:
```json
{
  "timestamp": 1704067200000,
  "fortune": 1500,
  "change": 100,
  "reason": "Daily bonus"
}
```

**Nouveau format**:
```json
{
  "ts": 1704067200,
  "f": 1500,
  "c": 100,
  "rs": 0
}
```

### Badges (`userBadges/`)

**Ancien format**:
```json
{
  "tueur_gamelle": {
    "id": "tueur_gamelle",
    "name": "Tueur de Gamelles",
    "icon": "🔥",
    "unlocked": true,
    "unlockedAt": 1704067200000,
    "progress": 100
  }
}
```

**Nouveau format**:
```json
{
  "tg": {
    "u": 1,
    "ua": 1704067200,
    "p": 100
  }
}
```

---

## 🔧 Utilisation des Fonctions de Déoptimisation

### Pour lire un utilisateur

```typescript
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { deoptimizeUserData } from "@/lib/dbOptimization";

const userRef = ref(database, `users/${userId}`);
const snapshot = await get(userRef);

if (snapshot.exists()) {
  const rawData = snapshot.val();

  // Si les données sont optimisées, les déoptimiser
  const userData = rawData.un ? deoptimizeUserData(rawData) : rawData;

  console.log(userData.username); // Fonctionne dans les deux cas
  console.log(userData.fortune);  // Fonctionne dans les deux cas
}
```

### Pour lire un match

```typescript
import { deoptimizeMatchData } from "@/lib/dbOptimization";

const matchRef = ref(database, `matches/${matchId}`);
const snapshot = await get(matchRef);

if (snapshot.exists()) {
  const rawData = snapshot.val();

  // Si les données sont optimisées, les déoptimiser
  const matchData = rawData.t1 ? deoptimizeMatchData(rawData) : rawData;

  console.log(matchData.team1);     // Array de userIds
  console.log(matchData.matchType); // "1v1", "2v2", ou "mixed"
  console.log(matchData.timestamp); // Milliseconds

  // ⚠️ team1Names et team2Names ne sont PLUS stockés
  // Récupérez-les depuis users/ si nécessaire
}
```

### Pour lire l'historique de fortune

```typescript
import { deoptimizeFortuneHistoryEntry } from "@/lib/dbOptimization";

const historyRef = ref(database, `fortuneHistory/${userId}`);
const snapshot = await get(historyRef);

if (snapshot.exists()) {
  const rawEntries = snapshot.val();

  const entries = Object.entries(rawEntries).map(([key, rawEntry]: [string, any]) => {
    // Si optimisé, déoptimiser
    const entry = rawEntry.ts ? deoptimizeFortuneHistoryEntry(rawEntry) : rawEntry;

    return {
      id: key,
      timestamp: entry.timestamp,
      fortune: entry.fortune,
      change: entry.change,
      reason: entry.reason
    };
  });

  console.log(entries);
}
```

### Pour lire les badges

```typescript
import { deoptimizeBadgeData, BADGE_MAP } from "@/lib/dbOptimization";

const badgesRef = ref(database, `userBadges/${userId}`);
const snapshot = await get(badgesRef);

if (snapshot.exists()) {
  const rawBadges = snapshot.val();

  const badges = Object.entries(rawBadges).map(([badgeCode, rawBadge]: [string, any]) => {
    // Si optimisé, déoptimiser
    const badge = rawBadge.u !== undefined
      ? deoptimizeBadgeData(rawBadge, badgeCode)
      : rawBadge;

    return badge;
  });

  console.log(badges);
}
```

---

## 📋 Référence Rapide des Clés

### Utilisateurs
| Ancien | Nouveau | Type |
|--------|---------|------|
| username | un | string |
| fortune | f | number |
| elo1v1 | e1 | number |
| elo2v2 | e2 | number |
| eloGlobal | eg | number |
| wins1v1 | w1 | number |
| losses1v1 | l1 | number |
| wins2v2 | w2 | number |
| losses2v2 | l2 | number |
| winsMixed | wm | number |
| lossesMixed | lm | number |
| role | r | 0=player, 1=agent, 2=admin |
| banned | b | 0=false, 1=true |
| createdAt | ca | secondes (au lieu de ms) |

### Matchs
| Ancien | Nouveau | Type |
|--------|---------|------|
| team1 | t1 | string[] |
| team2 | t2 | string[] |
| matchType | mt | 0=1v1, 1=2v2, 2=mixed |
| score1 | s1 | number |
| score2 | s2 | number |
| timestamp | ts | secondes |
| recordedBy | rb | string |
| suspicious | su | 0=false, 1=true |
| fromBetting | fb | 0=false, 1=true |

### Fortune History
| Ancien | Nouveau | Type |
|--------|---------|------|
| timestamp | ts | secondes |
| fortune | f | number |
| change | c | number |
| reason | rs | 0-15 (enum) |

### Badges
| ID complet | Code court |
|------------|-----------|
| tueur_gamelle | tg |
| roi_jeudi | rj |
| millionnaire | ml |
| collectionneur | cl |
| parieur_fou | pf |

---

## 🎯 Bonnes Pratiques

### ✅ À FAIRE

1. **Utiliser les fonctions de déoptimisation** lors de la lecture
2. **Vérifier si les données sont optimisées** avant de déoptimiser
3. **Mettre à jour vos composants** pour récupérer les noms d'utilisateurs dynamiquement
4. **Tester avec les deux formats** (ancien et nouveau) pendant la migration

### ❌ À NE PAS FAIRE

1. **Ne jamais écrire directement** les structures optimisées manuellement
2. **Ne pas supposer** que `team1Names`/`team2Names` existent dans les matchs
3. **Ne pas mélanger** les formats optimisés et non-optimisés dans une même écriture

---

## 🚀 Migration Progressive

La migration est **automatique** et **progressive**:

1. ✅ Les **nouvelles données** sont automatiquement optimisées
2. ✅ Les **anciennes données** restent lisibles
3. ✅ Pas besoin de migration manuelle
4. ✅ Les fonctions de lecture fonctionnent avec les deux formats

**Recommandation**: Après quelques semaines, vous pouvez exécuter un script de migration pour convertir toutes les anciennes données au nouveau format si vous voulez un gain d'espace immédiat.

---

## 📞 Support

Si vous rencontrez des problèmes de lecture de données:

1. Vérifiez que vous utilisez bien les fonctions de déoptimization
2. Consultez les logs de la console
3. Vérifiez le format des données dans Firebase Console

**Fichier source**: `src/lib/dbOptimization.ts`
