const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/bot_analytics.db');
    this.db = null;
    this.initializeDatabase();
  }

  // Initialize SQLite database
  async initializeDatabase() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
        } else {
          console.log('📊 Connected to SQLite database');
          this.createTables();
        }
      });
    } catch (error) {
      console.error('❌ Database initialization error:', error.message);
    }
  }

  // Create database tables
  createTables() {
    const tables = [
      // User interactions table
      `CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT,
        first_name TEXT,
        message_type TEXT NOT NULL,
        query_text TEXT,
        response_type TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // FAQ queries table
      `CREATE TABLE IF NOT EXISTS faq_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        faq_id TEXT,
        match_type TEXT,
        confidence_score REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Web3 queries table
      `CREATE TABLE IF NOT EXISTS web3_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        query_type TEXT NOT NULL,
        symbol TEXT,
        success BOOLEAN,
        response_time_ms INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Bot metrics table
      `CREATE TABLE IF NOT EXISTS bot_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Dynamic FAQs table
      `CREATE TABLE IF NOT EXISTS dynamic_faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL UNIQUE,
        answer TEXT NOT NULL,
        keywords TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    tables.forEach(table => {
      this.db.run(table, (err) => {
        if (err) {
          console.error('❌ Error creating table:', err.message);
        }
      });
    });
  }

  // Log user interaction
  logInteraction(userId, username, firstName, messageType, queryText = null, responseType = null) {
    if (!this.db) return;

    const query = `INSERT INTO interactions (user_id, username, first_name, message_type, query_text, response_type) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
    
    this.db.run(query, [userId, username, firstName, messageType, queryText, responseType], (err) => {
      if (err) {
        console.error('❌ Error logging interaction:', err.message);
      }
    });
  }

  // Log FAQ query
  logFAQQuery(userId, question, faqId = null, matchType = null, confidenceScore = 0) {
    if (!this.db) return;

    const query = `INSERT INTO faq_queries (user_id, question, faq_id, match_type, confidence_score) 
                   VALUES (?, ?, ?, ?, ?)`;
    
    this.db.run(query, [userId, question, faqId, matchType, confidenceScore], (err) => {
      if (err) {
        console.error('❌ Error logging FAQ query:', err.message);
      }
    });
  }

  // Log Web3 query
  logWeb3Query(userId, queryType, symbol = null, success = true, responseTime = 0) {
    if (!this.db) return;

    const query = `INSERT INTO web3_queries (user_id, query_type, symbol, success, response_time_ms) 
                   VALUES (?, ?, ?, ?, ?)`;
    
    this.db.run(query, [userId, queryType, symbol, success, responseTime], (err) => {
      if (err) {
        console.error('❌ Error logging Web3 query:', err.message);
      }
    });
  }

  // Add dynamic FAQ
  async addDynamicFAQ(question, answer, keywords = [], createdBy = null) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not available'));
        return;
      }

      const keywordsStr = Array.isArray(keywords) ? keywords.join(',') : keywords;
      const query = `INSERT INTO dynamic_faqs (question, answer, keywords, created_by) 
                     VALUES (?, ?, ?, ?)`;
      
      this.db.run(query, [question, answer, keywordsStr, createdBy], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Get dynamic FAQs
  async getDynamicFAQs() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const query = `SELECT * FROM dynamic_faqs ORDER BY created_at DESC`;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            ...row,
            keywords: row.keywords ? row.keywords.split(',') : []
          })));
        }
      });
    });
  }

  // Get analytics summary
  async getAnalyticsSummary() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const queries = {
        totalInteractions: `SELECT COUNT(*) as count FROM interactions`,
        uniqueUsers: `SELECT COUNT(DISTINCT user_id) as count FROM interactions`,
        topFAQs: `SELECT faq_id, COUNT(*) as count FROM faq_queries WHERE faq_id IS NOT NULL GROUP BY faq_id ORDER BY count DESC LIMIT 5`,
        topWeb3Queries: `SELECT query_type, COUNT(*) as count FROM web3_queries GROUP BY query_type ORDER BY count DESC LIMIT 5`,
        recentActivity: `SELECT message_type, COUNT(*) as count FROM interactions WHERE timestamp > datetime('now', '-24 hours') GROUP BY message_type`
      };

      const results = {};
      let completed = 0;
      const total = Object.keys(queries).length;

      Object.entries(queries).forEach(([key, query]) => {
        this.db.all(query, [], (err, rows) => {
          if (err) {
            console.error(`❌ Error in ${key} query:`, err.message);
            results[key] = [];
          } else {
            results[key] = rows;
          }
          
          completed++;
          if (completed === total) {
            resolve(results);
          }
        });
      });
    });
  }

  // Get popular FAQs
  async getPopularFAQs(limit = 10) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const query = `SELECT question, COUNT(*) as query_count 
                     FROM faq_queries 
                     WHERE timestamp > datetime('now', '-30 days')
                     GROUP BY question 
                     ORDER BY query_count DESC 
                     LIMIT ?`;
      
      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get user activity
  async getUserActivity(userId, days = 7) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const query = `SELECT message_type, query_text, timestamp 
                     FROM interactions 
                     WHERE user_id = ? AND timestamp > datetime('now', '-${days} days')
                     ORDER BY timestamp DESC`;
      
      this.db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
        } else {
          console.log('📊 Database connection closed');
        }
      });
    }
  }
}

module.exports = DatabaseManager;