# Configuration de Sentry pour le monitoring d'erreurs

Sentry a été intégré dans l'application pour surveiller les erreurs en production. Voici comment le configurer :

## 1. Créer un compte Sentry (Gratuit)

1. Allez sur [https://sentry.io/signup/](https://sentry.io/signup/)
2. Créez un compte gratuit (10,000 erreurs/mois incluses)
3. Créez un nouveau projet et sélectionnez **React**
4. Copiez votre **DSN** (Data Source Name)

## 2. Configurer l'application

Ajoutez votre DSN Sentry dans votre fichier `.env.local` :

```env
VITE_SENTRY_DSN=https://votre-dsn@sentry.io/votre-projet-id
VITE_SENTRY_ENVIRONMENT=production
```

**Note:** Sans DSN, Sentry ne sera pas activé (l'app fonctionnera normalement).

## 3. Fonctionnalités intégrées

### Capture automatique des erreurs
Toutes les erreurs loguées avec `logger.error()` sont automatiquement envoyées à Sentry :

```typescript
import { logger } from '@/utils/logger';

try {
  // code risqué
} catch (error) {
  logger.error(error); // Envoyé à Sentry automatiquement
}
```

### Tracking des utilisateurs
Les utilisateurs connectés sont automatiquement trackés dans Sentry avec :
- User ID
- Username
- Email

Cela permet d'identifier quel utilisateur a rencontré quelle erreur.

### Filtrage des erreurs
Certaines erreurs sont filtrées automatiquement :
- Erreurs de permission Firebase (normales dans certains cas)
- Erreurs réseau "Failed to fetch" (mode hors-ligne)

### Performance monitoring
Sentry capture également :
- Les temps de chargement des pages
- Les performances de l'application
- Les replays de session (10% des sessions)

## 4. Environnements

L'intégration Sentry s'adapte automatiquement :

- **Development** : Sentry désactivé par défaut
- **Production** : Sentry activé, 10% des sessions trackées
- **Personnalisable** : Via `VITE_SENTRY_ENVIRONMENT`

## 5. Utilisation avancée

### Capturer manuellement une erreur

```typescript
import { captureError } from '@/lib/sentry';

captureError(new Error("Something went wrong"), {
  context: "additional info"
});
```

### Ajouter des breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb("User clicked button", "user-action", {
  buttonId: "submit-form"
});
```

## 6. Voir les erreurs dans Sentry

1. Connectez-vous sur [https://sentry.io/](https://sentry.io/)
2. Sélectionnez votre projet
3. Consultez les **Issues** pour voir toutes les erreurs
4. Cliquez sur une erreur pour voir :
   - Stack trace
   - Contexte utilisateur
   - Breadcrumbs (actions avant l'erreur)
   - Session replay (si disponible)

## 7. Désactiver Sentry

Pour désactiver Sentry, supprimez simplement `VITE_SENTRY_DSN` de votre `.env.local`.

L'application continuera de fonctionner normalement sans monitoring.

## Support

- Documentation Sentry : [https://docs.sentry.io/platforms/javascript/guides/react/](https://docs.sentry.io/platforms/javascript/guides/react/)
- Support Sentry : [https://sentry.io/support/](https://sentry.io/support/)
