import winston from 'winston';
import path from 'path';
import { config } from '../config/environment';
import { LOGGING } from '../config/constants';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
    const categoryStr = category ? `[${category}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${categoryStr}${message}${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, category }) => {
          const categoryStr = category ? `[${category}] ` : '';
          return `${timestamp} ${level} ${categoryStr}${message}`;
        })
      ),
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Separate error log file
    new winston.transports.File({
      filename: path.join(path.dirname(config.logging.file), 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Category-specific loggers
export const scraperLogger = {
  info: (message: string, meta?: any) => logger.info(message, { category: LOGGING.CATEGORIES.SCRAPER, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { category: LOGGING.CATEGORIES.SCRAPER, ...meta }),
  error: (message: string, meta?: any) => logger.error(message, { category: LOGGING.CATEGORIES.SCRAPER, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { category: LOGGING.CATEGORIES.SCRAPER, ...meta }),
};

export const processorLogger = {
  info: (message: string, meta?: any) => logger.info(message, { category: LOGGING.CATEGORIES.PROCESSOR, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { category: LOGGING.CATEGORIES.PROCESSOR, ...meta }),
  error: (message: string, meta?: any) => logger.error(message, { category: LOGGING.CATEGORIES.PROCESSOR, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { category: LOGGING.CATEGORIES.PROCESSOR, ...meta }),
};

export const analyzerLogger = {
  info: (message: string, meta?: any) => logger.info(message, { category: LOGGING.CATEGORIES.ANALYZER, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { category: LOGGING.CATEGORIES.ANALYZER, ...meta }),
  error: (message: string, meta?: any) => logger.error(message, { category: LOGGING.CATEGORIES.ANALYZER, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { category: LOGGING.CATEGORIES.ANALYZER, ...meta }),
};

export const databaseLogger = {
  info: (message: string, meta?: any) => logger.info(message, { category: LOGGING.CATEGORIES.DATABASE, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { category: LOGGING.CATEGORIES.DATABASE, ...meta }),
  error: (message: string, meta?: any) => logger.error(message, { category: LOGGING.CATEGORIES.DATABASE, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { category: LOGGING.CATEGORIES.DATABASE, ...meta }),
};

export const systemLogger = {
  info: (message: string, meta?: any) => logger.info(message, { category: LOGGING.CATEGORIES.SYSTEM, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { category: LOGGING.CATEGORIES.SYSTEM, ...meta }),
  error: (message: string, meta?: any) => logger.error(message, { category: LOGGING.CATEGORIES.SYSTEM, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { category: LOGGING.CATEGORIES.SYSTEM, ...meta }),
};

// Main logger export
export default logger;

// Utility functions
export function logError(error: Error, category?: string, additionalData?: any): void {
  const logData = {
    error: error.message,
    stack: error.stack,
    category,
    ...additionalData,
  };
  
  logger.error(`Error occurred: ${error.message}`, logData);
}

export function logPerformance(operation: string, duration: number, category?: string): void {
  logger.info(`Performance: ${operation} completed in ${duration}ms`, {
    operation,
    duration,
    category,
    performance: true,
  });
}

export function logHighScoreRFP(rfpId: string, score: number, title: string): void {
  logger.info(`🎯 HIGH SCORE RFP FOUND: ${title} (Score: ${score})`, {
    rfpId,
    score,
    title,
    highScore: true,
    alert: true,
  });
}