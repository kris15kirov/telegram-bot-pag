require('dotenv').config();

const config = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        actionGroupChatId: process.env.ACTION_GROUP_CHAT_ID,
        adminUserIds: process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id.trim())) : [],
    },
    bot: {
        name: process.env.BOT_NAME || 'Business Assistant Bot',
        responseDelay: parseInt(process.env.RESPONSE_DELAY) || 1000,
    },
    keywords: {
        urgent: ['urgent', 'emergency', 'critical', 'asap', 'important', 'crisis', 'immediate'],
        media: ['media', 'interview', 'press', 'journalist', 'reporter', 'news', 'publication'],
        audit: ['audit', 'inspection', 'review', 'compliance', 'examination', 'assessment'],
    }
};

// Validation
if (!config.telegram.botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is required in environment variables');
    process.exit(1);
}

if (!config.telegram.actionGroupChatId) {
    console.warn('⚠️  ACTION_GROUP_CHAT_ID not set - auto-forwarding will be disabled');
}

module.exports = config;