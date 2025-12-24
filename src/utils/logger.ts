/**
 * Logger utility that only logs in development mode
 * Replaces console.log/warn/error throughout the app
 * Automatically sends errors to Sentry in production
 */

import * as Sentry from "@sentry/react";

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors to console
    console.error(...args);

    // Send to Sentry if it's an Error object
    if (args[0] instanceof Error) {
      Sentry.captureException(args[0], {
        extra: {
          additionalData: args.slice(1),
        },
      });
    } else if (typeof args[0] === 'string') {
      // If it's a string message, capture it as a message
      Sentry.captureMessage(args[0], {
        level: 'error',
        extra: {
          additionalData: args.slice(1),
        },
      });
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};
