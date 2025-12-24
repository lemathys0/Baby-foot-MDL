/**
 * Sentry configuration for error monitoring
 *
 * To use Sentry:
 * 1. Create a free account at https://sentry.io/
 * 2. Create a new React project
 * 3. Copy your DSN from the project settings
 * 4. Add VITE_SENTRY_DSN to your .env.local file
 * 5. Optionally set VITE_SENTRY_ENVIRONMENT (default: development)
 */

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;

export const initSentry = () => {
  // Only initialize Sentry if DSN is provided
  if (!SENTRY_DSN) {
    console.warn(
      "Sentry DSN not found. Error monitoring is disabled. " +
      "Add VITE_SENTRY_DSN to your .env.local to enable Sentry."
    );
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Set sample rate based on environment
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,

    // Capture 100% of errors in all environments
    sampleRate: 1.0,

    // Enable performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Capture 10% of all sessions in production
        sessionSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
        // Capture 100% of sessions with errors
        errorSampleRate: 1.0,
      }),
    ],

    // Filter out expected errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Filter out Firebase permission errors (expected in some cases)
      if (error instanceof Error && error.message?.includes("PERMISSION_DENIED")) {
        return null;
      }

      // Filter out network errors (common in offline PWA)
      if (error instanceof Error && error.message?.includes("Failed to fetch")) {
        return null;
      }

      return event;
    },

    // Don't send errors in development by default
    enabled: ENVIRONMENT !== "development",
  });
};

/**
 * Capture an error manually
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  if (context) {
    Sentry.setContext("error_context", context);
  }
  Sentry.captureException(error);
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (userId: string, username: string, email?: string) => {
  Sentry.setUser({
    id: userId,
    username,
    email,
  });
};

/**
 * Clear user context (on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
};
