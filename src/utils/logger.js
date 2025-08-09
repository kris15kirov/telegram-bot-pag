const winston = require('winston');
const path = require('path');

// Create logger instance with proper configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'telegram-bot',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write all bot analytics to separate file
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/bot-analytics.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

// Create specialized loggers for different components
const loggers = {
  // Main bot logger
  bot: logger.child({ component: 'bot' }),
  
  // Web3 operations logger
  web3: logger.child({ component: 'web3' }),
  
  // FAQ operations logger
  faq: logger.child({ component: 'faq' }),
  
  // Analytics logger
  analytics: logger.child({ component: 'analytics' }),
  
  // Database operations logger
  database: logger.child({ component: 'database' }),
  
  // Webhook server logger
  webhook: logger.child({ component: 'webhook' })
};

// Helper functions for common logging patterns
const logUserInteraction = (userId, action, details = {}) => {
  loggers.analytics.info('User interaction', {
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logAPICall = (apiName, endpoint, responseTime, success = true, error = null) => {
  const logData = {
    api: apiName,
    endpoint,
    responseTime,
    success,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    logData.error = error.message;
    loggers.web3.error('API call failed', logData);
  } else {
    loggers.web3.info('API call successful', logData);
  }
};

const logFAQQuery = (userId, query, matchType, confidence, faqId = null) => {
  loggers.faq.info('FAQ query', {
    userId,
    query,
    matchType,
    confidence,
    faqId,
    timestamp: new Date().toISOString()
  });
};

const logError = (component, error, context = {}) => {
  loggers[component] || logger.error('Error occurred', {
    component,
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Performance monitoring helpers
const createTimer = (label) => {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
    log: (component = 'bot') => {
      const duration = Date.now() - start;
      loggers[component].info('Performance timing', {
        label,
        duration,
        timestamp: new Date().toISOString()
      });
      return duration;
    }
  };
};

module.exports = {
  logger,
  loggers,
  logUserInteraction,
  logAPICall,
  logFAQQuery,
  logError,
  createTimer
};
