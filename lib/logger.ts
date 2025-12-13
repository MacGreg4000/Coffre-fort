// ============================================
// STRUCTURED LOGGING
// ============================================
// Note: Pour production, installer winston: npm install winston

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'
  private isTest = process.env.NODE_ENV === 'test'

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
    }[level]

    let log = `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`
    
    if (context && Object.keys(context).length > 0) {
      log += `\n  Context: ${JSON.stringify(context, null, 2)}`
    }
    
    if (error) {
      log += `\n  Error: ${error.message}`
      if (this.isDev && error.stack) {
        log += `\n  Stack: ${error.stack}`
      }
    }
    
    return log
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>, error?: Error) {
    // Skip logs in test environment (sauf erreurs)
    if (this.isTest && level !== 'error') {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: meta,
      error,
    }

    const formattedLog = this.formatLog(entry)

    // Console output (en dev) ou JSON (en prod)
    if (this.isDev) {
      switch (level) {
        case 'error':
          console.error(formattedLog)
          break
        case 'warn':
          console.warn(formattedLog)
          break
        case 'debug':
          console.debug(formattedLog)
          break
        default:
          console.log(formattedLog)
      }
    } else {
      // En production, JSON structuré pour agrégation
      console.log(JSON.stringify(entry))
    }

    // TODO: En production, envoyer aussi à un service externe
    // - Sentry pour les erreurs
    // - Datadog/CloudWatch pour les métriques
    // - Slack/Discord pour les alertes critiques
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error)
    
    // En production, envoyer à Sentry
    if (!this.isDev && !this.isTest && typeof window === 'undefined') {
      // TODO: Sentry.captureException(error, { contexts: { custom: context } })
    }
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.isDev) {
      this.log('debug', message, context)
    }
  }

  // Helpers pour logging API
  apiRequest(method: string, path: string, meta?: Record<string, any>) {
    this.info(`API ${method} ${path}`, meta)
  }

  apiError(method: string, path: string, error: Error, meta?: Record<string, any>) {
    this.error(`API ${method} ${path} failed`, error, meta)
  }

  // Helper pour timing
  timeStart(label: string): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.debug(`${label} took ${duration}ms`)
    }
  }
}

// Export singleton
export const logger = new Logger()

// Helpers pour utilisation directe
export const logInfo = logger.info.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logError = logger.error.bind(logger)
export const logDebug = logger.debug.bind(logger)
