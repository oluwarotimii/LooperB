import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
  userId?: string;
  businessId?: string;
  requestId?: string;
  stack?: string;
}

class Logger {
  private logDir: string;
  private errorLogFile: string;
  private appLogFile: string;
  private logLevel: LogLevel;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.errorLogFile = path.join(this.logDir, 'error.log');
    this.appLogFile = path.join(this.logDir, 'app.log');
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
    
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private writeToFile(filename: string, entry: LogEntry): void {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(filename, logLine);
  }

  private createLogEntry(level: LogLevel, message: string, metadata?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      requestId: this.getRequestId(),
      stack: level === LogLevel.ERROR ? new Error().stack : undefined
    };
  }

  private getRequestId(): string | undefined {
    // This would be set by middleware in a real application
    return process.env.REQUEST_ID;
  }

  error(message: string, error?: Error, metadata?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });

    console.error(`[${entry.timestamp}] ERROR: ${message}`, metadata);
    this.writeToFile(this.errorLogFile, entry);
    this.writeToFile(this.appLogFile, entry);
  }

  warn(message: string, metadata?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
    console.warn(`[${entry.timestamp}] WARN: ${message}`, metadata);
    this.writeToFile(this.appLogFile, entry);
  }

  info(message: string, metadata?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
    console.log(`[${entry.timestamp}] INFO: ${message}`, metadata);
    this.writeToFile(this.appLogFile, entry);
  }

  debug(message: string, metadata?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
    console.log(`[${entry.timestamp}] DEBUG: ${message}`, metadata);
    this.writeToFile(this.appLogFile, entry);
  }

  // Specific logging methods for different contexts
  userAction(userId: string, action: string, metadata?: any): void {
    this.info(`User action: ${action}`, { userId, ...metadata });
  }

  businessAction(businessId: string, action: string, metadata?: any): void {
    this.info(`Business action: ${action}`, { businessId, ...metadata });
  }

  orderEvent(orderId: string, event: string, metadata?: any): void {
    this.info(`Order event: ${event}`, { orderId, ...metadata });
  }

  paymentEvent(paymentId: string, event: string, metadata?: any): void {
    this.info(`Payment event: ${event}`, { paymentId, ...metadata });
  }

  apiRequest(method: string, path: string, userId?: string, responseTime?: number, statusCode?: number): void {
    this.info(`API Request: ${method} ${path}`, {
      method,
      path,
      userId,
      responseTime,
      statusCode
    });
  }

  securityEvent(event: string, userId?: string, ip?: string, metadata?: any): void {
    this.warn(`Security event: ${event}`, {
      userId,
      ip,
      ...metadata
    });
  }

  // Get recent logs for admin dashboard
  getRecentLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    try {
      const logFile = level === LogLevel.ERROR ? this.errorLogFile : this.appLogFile;
      
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const data = fs.readFileSync(logFile, 'utf-8');
      const lines = data.trim().split('\n');
      
      return lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null)
        .reverse();
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  // Get log statistics for monitoring
  getLogStats(hours: number = 24): any {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const logs = this.getRecentLogs(undefined, 10000);
      
      const stats = {
        total: 0,
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        timeRange: `Last ${hours} hours`,
        topErrors: [] as string[]
      };

      const errorMessages = new Map<string, number>();

      logs.forEach(log => {
        const logTime = new Date(log.timestamp);
        if (logTime >= cutoffTime) {
          stats.total++;
          stats[log.level.toLowerCase()]++;
          
          if (log.level === LogLevel.ERROR) {
            const count = errorMessages.get(log.message) || 0;
            errorMessages.set(log.message, count + 1);
          }
        }
      });

      // Get top 5 error messages
      stats.topErrors = Array.from(errorMessages.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([message, count]) => `${message} (${count}x)`);

      return stats;
    } catch (error) {
      console.error('Failed to get log stats:', error);
      return null;
    }
  }
}

export const logger = new Logger();