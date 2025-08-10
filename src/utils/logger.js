const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'web3-telegram-bot' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // Bot analytics log
    new winston.transports.File({
      filename: path.join(logsDir, 'bot-analytics.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `[${timestamp}] ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      )
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create specialized loggers
const web3Logger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'web3-handler' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'web3.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

const faqLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'faq-handler' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'faq.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

const analyticsLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'analytics' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'analytics.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Helper functions for structured logging
const loggers = {
  main: logger,
  web3: web3Logger,
  faq: faqLogger,
  analytics: analyticsLogger
};

// API call logging
const logAPICall = (service, endpoint, responseTime, success, error = null) => {
  const logData = {
    service,
    endpoint,
    responseTime,
    success,
    timestamp: new Date().toISOString()
  };

  if (error) {
    logData.error = error.message;
    logData.status = error.response?.status;
  }

  if (success) {
    web3Logger.info('API call successful', logData);
  } else {
    web3Logger.error('API call failed', logData);
  }
};

// Performance timing
const createTimer = (operation) => {
  const start = Date.now();
  return {
    start,
    end: () => Date.now() - start,
    log: (loggerType = 'main') => {
      const duration = Date.now() - start;
      loggers[loggerType].info(`Operation completed: ${operation}`, {
        operation,
        duration,
        timestamp: new Date().toISOString()
      });
      return duration;
    }
  };
};

// User interaction logging
const logUserInteraction = (userId, action, details = {}) => {
  logger.info('User interaction', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

// Error logging with context
const logError = (error, context = {}) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Web3 specific logging
const logWeb3Query = (queryType, params, result, responseTime) => {
  web3Logger.info('Web3 query executed', {
    queryType,
    params,
    result: result ? 'success' : 'error',
    responseTime,
    timestamp: new Date().toISOString()
  });
};

// FAQ specific logging
const logFAQQuery = (question, answer, confidence, matchType) => {
  faqLogger.info('FAQ query processed', {
    question: question.substring(0, 100), // Truncate long questions
    answerLength: answer ? answer.length : 0,
    confidence,
    matchType,
    timestamp: new Date().toISOString()
  });
};

// Analytics logging
const logAnalyticsEvent = (eventType, data = {}) => {
  analyticsLogger.info('Analytics event', {
    eventType,
    data,
    timestamp: new Date().toISOString()
  });
};

// Rate limiting logging
const logRateLimit = (userId, action, limit) => {
  logger.warn('Rate limit exceeded', {
    userId,
    action,
    limit,
    timestamp: new Date().toISOString()
  });
};

// Security event logging
const logSecurityEvent = (eventType, userId, details = {}) => {
  logger.warn('Security event', {
    eventType,
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Database operation logging
const logDatabaseOperation = (operation, table, result, duration) => {
  logger.info('Database operation', {
    operation,
    table,
    result: result ? 'success' : 'error',
    duration,
    timestamp: new Date().toISOString()
  });
};

// Cache operation logging
const logCacheOperation = (operation, key, hit, duration) => {
  logger.debug('Cache operation', {
    operation,
    key,
    hit,
    duration,
    timestamp: new Date().toISOString()
  });
};

// Export all logging functions
module.exports = {
  logger,
  loggers,
  logAPICall,
  createTimer,
  logUserInteraction,
  logError,
  logWeb3Query,
  logFAQQuery,
  logAnalyticsEvent,
  logRateLimit,
  logSecurityEvent,
  logDatabaseOperation,
  logCacheOperation
};
