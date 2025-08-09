const fs = require('fs');
const path = require('path');

class AnalyticsHandler {
    constructor() {
        this.logsDir = path.join(__dirname, '../logs');
        this.logsFile = path.join(this.logsDir, 'bot-analytics.log');
        this.sessionsFile = path.join(this.logsDir, 'user-sessions.json');

        // Ensure logs directory exists
        this.ensureLogsDirectory();

        // In-memory analytics data
        this.analytics = {
            totalMessages: 0,
            totalUsers: new Set(),
            commandCounts: {},
            faqQueries: {},
            web3Queries: {},
            urgentMessages: 0,
            mediaRequests: 0,
            auditRequests: 0,
            errorCount: 0,
            startTime: Date.now()
        };

        // Load existing analytics if available
        this.loadAnalytics();
    }

    // Ensure logs directory exists
    ensureLogsDirectory() {
        try {
            if (!fs.existsSync(this.logsDir)) {
                fs.mkdirSync(this.logsDir, { recursive: true });
                console.log('📁 Created logs directory');
            }
        } catch (error) {
            console.error('❌ Error creating logs directory:', error.message);
        }
    }

    // Log user interaction
    logInteraction(user, messageType, data = {}) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username || 'N/A',
                firstName: user.first_name || 'Unknown',
                messageType,
                data
            };

            // Write to log file
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.logsFile, logLine);

            // Update in-memory analytics
            this.updateAnalytics(user, messageType, data);

        } catch (error) {
            console.error('❌ Error logging interaction:', error.message);
        }
    }

    // Update in-memory analytics
    updateAnalytics(user, messageType, data) {
        this.analytics.totalMessages++;
        this.analytics.totalUsers.add(user.id);

        // Track message types
        switch (messageType) {
            case 'command':
                const command = data.command || 'unknown';
                this.analytics.commandCounts[command] = (this.analytics.commandCounts[command] || 0) + 1;
                break;

            case 'faq_query':
                const faqId = data.faqId || 'unknown';
                this.analytics.faqQueries[faqId] = (this.analytics.faqQueries[faqId] || 0) + 1;
                break;

            case 'web3_query':
                const queryType = data.queryType || 'unknown';
                this.analytics.web3Queries[queryType] = (this.analytics.web3Queries[queryType] || 0) + 1;
                break;

            case 'urgent':
                this.analytics.urgentMessages++;
                break;

            case 'media_request':
                this.analytics.mediaRequests++;
                break;

            case 'audit_request':
                this.analytics.auditRequests++;
                break;

            case 'error':
                this.analytics.errorCount++;
                break;
        }
    }

    // Log error
    logError(error, context = {}) {
        try {
            const errorEntry = {
                timestamp: new Date().toISOString(),
                type: 'error',
                message: error.message,
                stack: error.stack,
                context
            };

            const logLine = JSON.stringify(errorEntry) + '\n';
            fs.appendFileSync(this.logsFile, logLine);

            this.analytics.errorCount++;

        } catch (logError) {
            console.error('❌ Error logging error:', logError.message);
        }
    }

    // Get analytics summary
    getAnalyticsSummary() {
        const uptime = Date.now() - this.analytics.startTime;
        const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(1);

        return {
            summary: {
                totalMessages: this.analytics.totalMessages,
                uniqueUsers: this.analytics.totalUsers.size,
                uptimeHours: parseFloat(uptimeHours),
                messagesPerHour: (this.analytics.totalMessages / (uptime / (1000 * 60 * 60))).toFixed(1)
            },
            messageTypes: {
                urgentMessages: this.analytics.urgentMessages,
                mediaRequests: this.analytics.mediaRequests,
                auditRequests: this.analytics.auditRequests,
                errorCount: this.analytics.errorCount
            },
            topCommands: this.getTopItems(this.analytics.commandCounts, 5),
            topFAQs: this.getTopItems(this.analytics.faqQueries, 5),
            topWeb3Queries: this.getTopItems(this.analytics.web3Queries, 5)
        };
    }

    // Get top items from an object
    getTopItems(obj, limit = 5) {
        return Object.entries(obj)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([key, value]) => ({ item: key, count: value }));
    }

    // Format analytics for display
    formatAnalyticsReport() {
        const stats = this.getAnalyticsSummary();

        let report = `📊 **Bot Analytics Report**\n\n`;

        // Summary
        report += `**📈 Summary**\n`;
        report += `• Total Messages: ${stats.summary.totalMessages}\n`;
        report += `• Unique Users: ${stats.summary.uniqueUsers}\n`;
        report += `• Uptime: ${stats.summary.uptimeHours} hours\n`;
        report += `• Messages/Hour: ${stats.summary.messagesPerHour}\n\n`;

        // Message Types
        report += `**📋 Message Types**\n`;
        report += `• 🚨 Urgent: ${stats.messageTypes.urgentMessages}\n`;
        report += `• 📺 Media Requests: ${stats.messageTypes.mediaRequests}\n`;
        report += `• 📊 Audit Requests: ${stats.messageTypes.auditRequests}\n`;
        report += `• ❌ Errors: ${stats.messageTypes.errorCount}\n\n`;

        // Top Commands
        if (stats.topCommands.length > 0) {
            report += `**🔝 Top Commands**\n`;
            stats.topCommands.forEach((cmd, i) => {
                report += `${i + 1}. /${cmd.item}: ${cmd.count} times\n`;
            });
            report += '\n';
        }

        // Top FAQs
        if (stats.topFAQs.length > 0) {
            report += `**❓ Popular FAQs**\n`;
            stats.topFAQs.forEach((faq, i) => {
                report += `${i + 1}. ${faq.item}: ${faq.count} queries\n`;
            });
            report += '\n';
        }

        // Top Web3 Queries
        if (stats.topWeb3Queries.length > 0) {
            report += `**🌐 Web3 Queries**\n`;
            stats.topWeb3Queries.forEach((query, i) => {
                report += `${i + 1}. ${query.item}: ${query.count} times\n`;
            });
            report += '\n';
        }

        report += `_Report generated: ${new Date().toLocaleString()}_`;

        return report;
    }

    // Save analytics data to file
    saveAnalytics() {
        try {
            const analyticsData = {
                ...this.analytics,
                totalUsers: Array.from(this.analytics.totalUsers), // Convert Set to Array for JSON
                lastSaved: new Date().toISOString()
            };

            fs.writeFileSync(this.sessionsFile, JSON.stringify(analyticsData, null, 2));
            console.log('💾 Analytics data saved');
        } catch (error) {
            console.error('❌ Error saving analytics:', error.message);
        }
    }

    // Load analytics data from file
    loadAnalytics() {
        try {
            if (fs.existsSync(this.sessionsFile)) {
                const data = JSON.parse(fs.readFileSync(this.sessionsFile, 'utf8'));

                // Restore analytics data
                this.analytics = {
                    ...this.analytics,
                    ...data,
                    totalUsers: new Set(data.totalUsers || []), // Convert Array back to Set
                    startTime: data.startTime || Date.now()
                };

                console.log('📊 Previous analytics data loaded');
            }
        } catch (error) {
            console.error('❌ Error loading analytics:', error.message);
        }
    }

    // Get recent activity (last N log entries)
    getRecentActivity(limit = 10) {
        try {
            if (!fs.existsSync(this.logsFile)) {
                return [];
            }

            const logs = fs.readFileSync(this.logsFile, 'utf8')
                .split('\n')
                .filter(line => line.trim())
                .slice(-limit)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(entry => entry !== null)
                .reverse(); // Most recent first

            return logs;
        } catch (error) {
            console.error('❌ Error reading recent activity:', error.message);
            return [];
        }
    }

    // Format recent activity for display
    formatRecentActivity(limit = 5) {
        const activity = this.getRecentActivity(limit);

        if (activity.length === 0) {
            return 'No recent activity found.';
        }

        let report = `🕐 **Recent Activity** (Last ${activity.length} interactions)\n\n`;

        activity.forEach((entry, i) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const user = entry.firstName || 'Unknown';
            const type = entry.messageType || 'unknown';

            report += `${i + 1}. **${time}** - ${user} (${type})\n`;

            if (entry.data && Object.keys(entry.data).length > 0) {
                const dataStr = Object.entries(entry.data)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                report += `   _${dataStr}_\n`;
            }
            report += '\n';
        });

        return report;
    }

    // Clear all analytics data
    clearAnalytics() {
        this.analytics = {
            totalMessages: 0,
            totalUsers: new Set(),
            commandCounts: {},
            faqQueries: {},
            web3Queries: {},
            urgentMessages: 0,
            mediaRequests: 0,
            auditRequests: 0,
            errorCount: 0,
            startTime: Date.now()
        };

        // Clear log files
        try {
            if (fs.existsSync(this.logsFile)) {
                fs.writeFileSync(this.logsFile, '');
            }
            if (fs.existsSync(this.sessionsFile)) {
                fs.unlinkSync(this.sessionsFile);
            }
            console.log('🗑️ Analytics data cleared');
        } catch (error) {
            console.error('❌ Error clearing analytics:', error.message);
        }
    }

    // Auto-save analytics periodically
    startAutoSave(intervalMinutes = 30) {
        setInterval(() => {
            this.saveAnalytics();
        }, intervalMinutes * 60 * 1000);

        console.log(`💾 Auto-save enabled (every ${intervalMinutes} minutes)`);
    }
}

module.exports = AnalyticsHandler;