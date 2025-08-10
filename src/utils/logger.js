const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple fallback logger
const fallbackLogger = {
  info: (message, meta) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, meta || '');
  },
  error: (message, meta) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, meta || '');
  },
  warn: (message, meta) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, meta || '');
  },
  debug: (message, meta) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG] ${message}`, meta || '');
  }
};

// Try to create winston logger, fallback to simple logger if it fails
let logger;

try {
  // Create a simple winston logger
  logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log')
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error'
      })
    ]
  });

  // Add console transport for development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
  }
} catch (error) {
  console.error('Failed to initialize winston logger, using fallback:', error.message);
  logger = fallbackLogger;
}

// Create specialized loggers (simplified)
const web3Logger = logger;
const faqLogger = logger;
const analyticsLogger = logger;

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

// Export logger directly for backward compatibility
module.exports = logger;

// Also export all logging functions
module.exports.loggers = loggers;
module.exports.logAPICall = logAPICall;
module.exports.createTimer = createTimer;
module.exports.logUserInteraction = logUserInteraction;
module.exports.logError = logError;
module.exports.logWeb3Query = logWeb3Query;
module.exports.logFAQQuery = logFAQQuery;
module.exports.logAnalyticsEvent = logAnalyticsEvent;
module.exports.logRateLimit = logRateLimit;
module.exports.logSecurityEvent = logSecurityEvent;
module.exports.logDatabaseOperation = logDatabaseOperation;
module.exports.logCacheOperation = logCacheOperation;
