// ============================================
// SYSTÈME DE LOGGING STRUCTURÉ
// ============================================
// Production-ready logging avec niveaux, contexte et formatage

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

interface LogContext {
  [key: string]: any
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context?: LogContext
  environment: string
}

class Logger {
  private environment: string
  private minLevel: LogLevel

  constructor() {
    this.environment = process.env.NODE_ENV || "development"
    this.minLevel = this.environment === "production" ? LogLevel.INFO : LogLevel.DEBUG
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]
    const currentLevelIndex = levels.indexOf(this.minLevel)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex <= currentLevelIndex
  }

  private formatLog(entry: LogEntry): string {
    // En développement: format lisible avec couleurs
    if (this.environment === "development") {
      const colors = {
        error: "\x1b[31m", // Rouge
        warn: "\x1b[33m",  // Jaune
        info: "\x1b[36m",  // Cyan
        debug: "\x1b[90m", // Gris
        reset: "\x1b[0m",
      }
      
      const color = colors[entry.level] || colors.reset
      let output = `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${colors.reset}`
      
      if (entry.error) {
        output += `\n${colors.error}Error: ${entry.error.name}: ${entry.error.message}${colors.reset}`
        if (entry.error.stack) {
          output += `\n${entry.error.stack}`
        }
      }
      
      if (entry.context && Object.keys(entry.context).length > 0) {
        output += `\n${colors.debug}Context: ${JSON.stringify(entry.context, null, 2)}${colors.reset}`
      }
      
      return output
    }
    
    // En production: format JSON pour parsing
    return JSON.stringify(entry)
  }

  private log(level: LogLevel, message: string, error?: Error, context?: LogContext) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    if (context) {
      entry.context = context
    }

    const formatted = this.formatLog(entry)
    
    // Output selon le niveau
    if (level === LogLevel.ERROR) {
      console.error(formatted)
    } else if (level === LogLevel.WARN) {
      console.warn(formatted)
    } else {
      console.log(formatted)
    }

    // TODO: En production, envoyer à un service externe (Sentry, CloudWatch, etc.)
    if (this.environment === "production" && level === LogLevel.ERROR) {
      // this.sendToExternalService(entry)
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, error, context)
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, undefined, context)
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, undefined, context)
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, undefined, context)
  }

  // Helper pour logger les requêtes API
  apiRequest(method: string, path: string, userId?: string, duration?: number) {
    this.info(`API ${method} ${path}`, {
      method,
      path,
      userId,
      duration: duration ? `${duration}ms` : undefined,
    })
  }

  // Helper pour logger les actions utilisateur
  userAction(action: string, userId: string, details?: LogContext) {
    this.info(`User action: ${action}`, {
      action,
      userId,
      ...details,
    })
  }

  // Helper pour performances
  performance(operation: string, duration: number, context?: LogContext) {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG
    this.log(level, `Performance: ${operation} took ${duration}ms`, undefined, context)
  }
}

// Export singleton
export const logger = new Logger()

// Helper pour mesurer les performances
export function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const start = Date.now()
  
  const measure = (result: T) => {
    const duration = Date.now() - start
    logger.performance(operation, duration)
    return result
  }

  const result = fn()
  
  if (result instanceof Promise) {
    return result.then(measure).catch((error) => {
      const duration = Date.now() - start
      logger.error(`${operation} failed after ${duration}ms`, error)
      throw error
    })
  }
  
  return Promise.resolve(measure(result))
}
