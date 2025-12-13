// ============================================
// SENTRY CONFIGURATION
// ============================================
// Pour activer Sentry:
// 1. npm install @sentry/nextjs
// 2. Définir NEXT_PUBLIC_SENTRY_DSN dans .env
// 3. Décommenter le code ci-dessous

/*
import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      
      // Taux d'échantillonnage pour les performances
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Filtrer les informations sensibles
      beforeSend(event, hint) {
        // Ne pas envoyer les mots de passe
        if (event.request?.data) {
          const data = event.request.data
          if (typeof data === 'object' && 'password' in data) {
            data.password = '[REDACTED]'
          }
        }
        
        return event
      },
      
      // Ignorer certaines erreurs non critiques
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
      
      // Configuration pour Next.js
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com/],
        }),
      ],
    })
  }
}

// Helper pour capturer des erreurs manuellement
export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    })
  }
}

// Helper pour capturer des messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, level)
  }
}

// Helper pour définir le contexte utilisateur
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    })
  }
}

// Helper pour nettoyer le contexte utilisateur (logout)
export function clearUserContext() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null)
  }
}
*/

// Placeholder functions (à remplacer quand Sentry est activé)
export function initSentry() {
  console.log('ℹ️ Sentry non configuré. Installez @sentry/nextjs et configurez NEXT_PUBLIC_SENTRY_DSN pour activer.')
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('❌ Error:', error.message, context)
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`📝 [${level}]`, message)
}

export function setUserContext(user: { id: string; email?: string; role?: string }) {
  // No-op sans Sentry
}

export function clearUserContext() {
  // No-op sans Sentry
}
