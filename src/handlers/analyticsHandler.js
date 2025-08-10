const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

class AnalyticsHandler {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/bot_analytics.db');
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            this.db = new sqlite3.Database(this.dbPath);

            // Create tables if they don't exist
            await this.createTables();

            logger.info('Analytics database initialized successfully');
        } catch (error) {
            logger.error('Error initializing analytics database:', error.message);
            throw error;
        }
    }

    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS user_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                message_type TEXT NOT NULL,
                message_content TEXT,
                response_type TEXT,
                response_content TEXT,
                confidence_score REAL,
                project_reference TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS faq_queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT,
                confidence_score REAL,
                match_type TEXT,
                project_reference TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS web3_queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                query_type TEXT NOT NULL,
                query_params TEXT,
                response_data TEXT,
                cache_hit BOOLEAN DEFAULT FALSE,
                response_time_ms INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS message_forwarding (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                original_message TEXT NOT NULL,
                forwarded_to TEXT NOT NULL,
                forward_reason TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS admin_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                action_type TEXT NOT NULL,
                action_details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.runQuery(table);
        }
    }

    async runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getAllQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async logUserInteraction(userId, userData, messageType, messageContent, responseType, responseContent, confidenceScore = null, projectReference = null) {
        try {
            const sql = `
                INSERT INTO user_interactions 
                (user_id, username, first_name, last_name, message_type, message_content, response_type, response_content, confidence_score, project_reference)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                userId,
                userData.username || null,
                userData.first_name || null,
                userData.last_name || null,
                messageType,
                messageContent,
                responseType,
                responseContent,
                confidenceScore,
                projectReference
            ];

            await this.runQuery(sql, params);
            logger.info(`User interaction logged for user ${userId}`, { messageType, confidenceScore });
        } catch (error) {
            logger.error('Error logging user interaction:', error.message);
        }
    }

    async logFAQQuery(userId, question, answer, confidenceScore, matchType, projectReference) {
        try {
            const sql = `
                INSERT INTO faq_queries 
                (user_id, question, answer, confidence_score, match_type, project_reference)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const params = [userId, question, answer, confidenceScore, matchType, projectReference];
            await this.runQuery(sql, params);

            logger.info(`FAQ query logged for user ${userId}`, { confidenceScore, matchType, projectReference });
        } catch (error) {
            logger.error('Error logging FAQ query:', error.message);
        }
    }

    async logWeb3Query(userId, queryType, queryParams, responseData, cacheHit = false, responseTimeMs = null) {
        try {
            const sql = `
                INSERT INTO web3_queries 
                (user_id, query_type, query_params, response_data, cache_hit, response_time_ms)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const params = [
                userId,
                queryType,
                JSON.stringify(queryParams),
                JSON.stringify(responseData),
                cacheHit ? 1 : 0,
                responseTimeMs
            ];

            await this.runQuery(sql, params);
            logger.info(`Web3 query logged for user ${userId}`, { queryType, cacheHit, responseTimeMs });
        } catch (error) {
            logger.error('Error logging Web3 query:', error.message);
        }
    }

    async logMessageForwarding(userId, originalMessage, forwardedTo, forwardReason) {
        try {
            const sql = `
                INSERT INTO message_forwarding 
                (user_id, original_message, forwarded_to, forward_reason)
                VALUES (?, ?, ?, ?)
            `;

            const params = [userId, originalMessage, forwardedTo, forwardReason];
            await this.runQuery(sql, params);

            logger.info(`Message forwarding logged for user ${userId}`, { forwardedTo, forwardReason });
        } catch (error) {
            logger.error('Error logging message forwarding:', error.message);
        }
    }

    async logAdminAction(adminId, actionType, actionDetails) {
        try {
            const sql = `
                INSERT INTO admin_actions 
                (admin_id, action_type, action_details)
                VALUES (?, ?, ?)
            `;

            const params = [adminId, actionType, JSON.stringify(actionDetails)];
            await this.runQuery(sql, params);

            logger.info(`Admin action logged for admin ${adminId}`, { actionType, actionDetails });
        } catch (error) {
            logger.error('Error logging admin action:', error.message);
        }
    }

    async getAnalyticsStats() {
        try {
            const stats = {};

            // Total interactions
            const totalInteractions = await this.getQuery('SELECT COUNT(*) as count FROM user_interactions');
            stats.totalInteractions = totalInteractions.count;

            // FAQ statistics
            const faqStats = await this.getQuery(`
                SELECT 
                    COUNT(*) as total_queries,
                    AVG(confidence_score) as avg_confidence,
                    COUNT(CASE WHEN confidence_score >= 0.9 THEN 1 END) as high_confidence_queries
                FROM faq_queries
            `);
            stats.faqStats = faqStats;

            // Top FAQ questions
            const topFAQs = await this.getAllQuery(`
                SELECT 
                    question,
                    COUNT(*) as query_count,
                    AVG(confidence_score) as avg_confidence,
                    project_reference
                FROM faq_queries 
                GROUP BY question 
                ORDER BY query_count DESC 
                LIMIT 5
            `);
            stats.topFAQs = topFAQs;

            // Web3 query statistics
            const web3Stats = await this.getQuery(`
                SELECT 
                    COUNT(*) as total_queries,
                    COUNT(CASE WHEN cache_hit = 1 THEN 1 END) as cache_hits,
                    AVG(response_time_ms) as avg_response_time
                FROM web3_queries
            `);
            stats.web3Stats = web3Stats;

            // Top Web3 queries
            const topWeb3Queries = await this.getAllQuery(`
                SELECT 
                    query_type,
                    COUNT(*) as query_count,
                    AVG(response_time_ms) as avg_response_time
                FROM web3_queries 
                GROUP BY query_type 
                ORDER BY query_count DESC 
                LIMIT 5
            `);
            stats.topWeb3Queries = topWeb3Queries;

            // Message forwarding statistics
            const forwardingStats = await this.getQuery(`
                SELECT 
                    COUNT(*) as total_forwards,
                    COUNT(CASE WHEN forward_reason = 'urgent' THEN 1 END) as urgent_forwards,
                    COUNT(CASE WHEN forward_reason = 'media' THEN 1 END) as media_forwards,
                    COUNT(CASE WHEN forward_reason = 'audit' THEN 1 END) as audit_forwards
                FROM message_forwarding
            `);
            stats.forwardingStats = forwardingStats;

            // Recent activity (last 24 hours)
            const recentActivity = await this.getQuery(`
                SELECT COUNT(*) as count 
                FROM user_interactions 
                WHERE timestamp >= datetime('now', '-1 day')
            `);
            stats.recentActivity = recentActivity.count;

            return stats;
        } catch (error) {
            logger.error('Error getting analytics stats:', error.message);
            throw error;
        }
    }

    async getProjectReferenceStats() {
        try {
            const stats = await this.getAllQuery(`
                SELECT 
                    project_reference,
                    COUNT(*) as reference_count,
                    AVG(confidence_score) as avg_confidence
                FROM faq_queries 
                WHERE project_reference IS NOT NULL 
                GROUP BY project_reference 
                ORDER BY reference_count DESC
            `);

            return stats;
        } catch (error) {
            logger.error('Error getting project reference stats:', error.message);
            throw error;
        }
    }

    async getUserStats(userId) {
        try {
            const stats = {};

            // User interaction count
            const interactionCount = await this.getQuery(
                'SELECT COUNT(*) as count FROM user_interactions WHERE user_id = ?',
                [userId]
            );
            stats.interactionCount = interactionCount.count;

            // User FAQ queries
            const faqQueries = await this.getAllQuery(
                'SELECT * FROM faq_queries WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10',
                [userId]
            );
            stats.faqQueries = faqQueries;

            // User Web3 queries
            const web3Queries = await this.getAllQuery(
                'SELECT * FROM web3_queries WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10',
                [userId]
            );
            stats.web3Queries = web3Queries;

            return stats;
        } catch (error) {
            logger.error('Error getting user stats:', error.message);
            throw error;
        }
    }

    async formatStatsForDisplay(stats) {
        try {
            let formatted = '📊 Web3 Assistant Analytics\n\n';

            // Overall statistics
            formatted += `• Total Interactions: ${stats.totalInteractions.toLocaleString()}\n`;
            formatted += `• Recent Activity (24h): ${stats.recentActivity.toLocaleString()}\n\n`;

            // FAQ statistics
            formatted += `📋 FAQ Statistics:\n`;
            formatted += `• Total Queries: ${stats.faqStats.total_queries.toLocaleString()}\n`;
            formatted += `• High Confidence: ${stats.faqStats.high_confidence_queries.toLocaleString()}\n`;
            formatted += `• Avg Confidence: ${(stats.faqStats.avg_confidence * 100).toFixed(1)}%\n\n`;

            // Top FAQs
            formatted += `🔥 Top FAQs:\n`;
            stats.topFAQs.forEach((faq, index) => {
                const projectRef = faq.project_reference ? ` (${faq.project_reference})` : '';
                formatted += `${index + 1}. ${faq.question.substring(0, 50)}... (${faq.query_count} queries${projectRef})\n`;
            });
            formatted += '\n';

            // Web3 statistics
            formatted += `🌐 Web3 Queries:\n`;
            formatted += `• Total Queries: ${stats.web3Stats.total_queries.toLocaleString()}\n`;
            formatted += `• Cache Hits: ${stats.web3Stats.cache_hits.toLocaleString()}\n`;
            formatted += `• Avg Response Time: ${Math.round(stats.web3Stats.avg_response_time || 0)}ms\n\n`;

            // Top Web3 queries
            formatted += `📈 Top Web3 Commands:\n`;
            stats.topWeb3Queries.forEach((query, index) => {
                formatted += `${index + 1}. /${query.query_type} (${query.query_count} uses)\n`;
            });
            formatted += '\n';

            // Forwarding statistics
            formatted += `📤 Message Forwarding:\n`;
            formatted += `• Total Forwards: ${stats.forwardingStats.total_forwards.toLocaleString()}\n`;
            formatted += `• Urgent Requests: ${stats.forwardingStats.urgent_forwards.toLocaleString()}\n`;
            formatted += `• Audit Requests: ${stats.forwardingStats.audit_forwards.toLocaleString()}\n\n`;

            formatted += 'Data powered by Pashov Audit Group analytics.';

            return formatted;
        } catch (error) {
            logger.error('Error formatting stats:', error.message);
            return 'Error formatting analytics data.';
        }
    }

    async cleanupOldData(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const tables = ['user_interactions', 'faq_queries', 'web3_queries', 'message_forwarding'];

            for (const table of tables) {
                const sql = `DELETE FROM ${table} WHERE timestamp < datetime(?, '-${daysToKeep} days')`;
                const result = await this.runQuery(sql);
                logger.info(`Cleaned up ${result.changes} old records from ${table}`);
            }
        } catch (error) {
            logger.error('Error cleaning up old data:', error.message);
        }
    }

    close() {
        if (this.db) {
            this.db.close();
            logger.info('Analytics database connection closed');
        }
    }
}

module.exports = AnalyticsHandler;