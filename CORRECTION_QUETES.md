# 🔧 Correction du Système de Quêtes

## Problème Identifié

Les quêtes spécifiques aux modes de jeu (1v1 et 2v2) ne se mettaient pas à jour correctement après un match.

### Cause Racine

Le système utilisait une seule catégorie `'match'` pour toutes les quêtes de match, ce qui empêchait de différencier:
- "Jouer X matchs" (tous modes confondus)
- "Gagner X matchs en 1v1" (uniquement 1v1)
- "Gagner X matchs en 2v2" (uniquement 2v2)

## Solution Implémentée

### 1. Nouvelles Catégories de Quêtes

**Fichier**: `src/lib/questSystem.ts`

Ajout de 3 nouvelles catégories:
```typescript
export type QuestCategory = 
  | 'match'      // Jouer un match (tous modes)
  | 'win_1v1'    // Gagner un match 1v1
  | 'win_2v2'    // Gagner un match 2v2
  | 'win_any'    // Gagner un match (tous modes)
  | 'social'
  | 'collection'
  | 'progression';
```

### 2. Mise à Jour des Templates de Quêtes

**Quêtes quotidiennes:**
- ✅ "Jouer 3 matchs" → catégorie: `'match'` (inchangé)
- ✅ "Gagner 2 matchs en 1v1" → catégorie: `'win_1v1'` (corrigé)
- ✅ "Gagner 2 matchs en 2v2" → catégorie: `'win_2v2'` (corrigé)

**Quêtes hebdomadaires:**
- ✅ "Gagner 10 matchs" → catégorie: `'win_any'` (corrigé)

### 3. Logique de Progression dans recordMatch()

**Fichier**: `src/lib/firebaseMatch.ts` (lignes 1059-1075)

**Ancienne logique** (bugguée):
```typescript
// Jouer un match
await updateQuestProgress(playerId, 'match', 1);

if (won) {
  // ❌ PROBLÈME: Même catégorie 'match' pour tous les modes
  await updateQuestProgress(playerId, 'match', 1);
}
```

**Nouvelle logique** (corrigée):
```typescript
// Jouer un match
await updateQuestProgress(playerId, 'match', 1);

if (won) {
  // ✅ Mettre à jour la quête spécifique au mode
  if (matchType === '1v1') {
    await updateQuestProgress(playerId, 'win_1v1', 1);
  } else if (matchType === '2v2') {
    await updateQuestProgress(playerId, 'win_2v2', 1);
  }
  // ✅ Aussi mettre à jour la quête générale "Gagner X matchs"
  await updateQuestProgress(playerId, 'win_any', 1);
}
```

## Résultat

Maintenant, quand tu joues et gagnes un match:

### Exemple: Match 2v2 gagné

1. ✅ Quête "Jouer 3 matchs" → +1 progression
2. ✅ Quête "Gagner 2 matchs en 2v2" → +1 progression
3. ✅ Quête "Gagner 10 matchs" (hebdomadaire) → +1 progression

### Exemple: Match 1v1 gagné

1. ✅ Quête "Jouer 3 matchs" → +1 progression
2. ✅ Quête "Gagner 2 matchs en 1v1" → +1 progression
3. ✅ Quête "Gagner 10 matchs" (hebdomadaire) → +1 progression

## Déploiement

✅ Code corrigé et déployé sur https://baby-footv2.web.app

## Test

Pour tester:
1. Va sur https://baby-footv2.web.app/quests
2. Note les quêtes actives
3. Joue et gagne un match 2v2
4. Retourne sur /quests
5. Vérifie que la quête "Esprit d'équipe" (Gagner 2 matchs en 2v2) a bien progressé
