const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const { findFAQResponse } = require('./data/faq');
const {
    mainKeyboard,
    faqKeyboard,
    urgentKeyboard,
    mediaKeyboard,
    auditKeyboard,
    inlineQuickActions
} = require('./utils/keyboards');
const MessageAnalyzer = require('./utils/messageAnalyzer');

// Initialize bot
const bot = new TelegramBot(config.telegram.botToken, { polling: true });
const messageAnalyzer = new MessageAnalyzer();

// Store user sessions
const userSessions = new Map();

// Welcome message
const WELCOME_MESSAGE = `
🤖 **Welcome to Business Assistant Bot!**

I'm your virtual assistant and I can help you with:

🚨 **Urgent** - Critical issues and emergencies
📺 **Media request** - Press inquiries and interviews  
📊 **Audit request** - Audit services and compliance
❓ **FAQ** - Frequently asked questions
📞 **Contact** - Contact information

Select a category from the menu or simply type your question! 👇
`;

// Utility function to delay responses for natural feel
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Initialize user session
    userSessions.set(chatId, {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        currentMenu: 'main',
        lastActivity: new Date()
    });

    console.log(`👤 New user started: ${user.first_name} ${user.last_name || ''} (@${user.username || 'no_username'}) - ID: ${user.id}`);

    await delay(config.bot.responseDelay);

    await bot.sendMessage(chatId, WELCOME_MESSAGE, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

// Help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
🆘 **Business Assistant Bot Help**

**Basic Commands:**
/start - Start over
/help - Show this help
/status - Show bot status

**Quick Actions:**
• Select a category from the menu
• Type your question directly
• For urgent cases: press "🚨 Urgent"

**Supported Language:**
🇬🇧 English

If you have problems, type "help" for assistance.
`;

    await bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

// Status command (for admins)
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if user is admin
    if (!config.telegram.adminUserIds.includes(userId)) {
        await bot.sendMessage(chatId, '❌ You do not have permission to access this command.');
        return;
    }

    const status = `
📊 **Bot Status**

🔌 Status: Online ✅
👥 Active Users: ${userSessions.size}
⏰ Uptime: ${process.uptime().toFixed(0)} seconds
🤖 Bot Name: ${config.bot.name}
📡 Action Group: ${config.telegram.actionGroupChatId ? 'Configured ✅' : 'Not configured ❌'}

**Recent Activity:**
${Array.from(userSessions.values()).slice(-3).map(session =>
        `• ${session.firstName} - ${session.lastActivity.toLocaleTimeString('en-US')}`
    ).join('\n')}
`;

    await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
});

// Handle text messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const user = msg.from;

    // Skip if message is a command
    if (text && text.startsWith('/')) return;

    // Update user session
    const session = userSessions.get(chatId) || {};
    session.lastActivity = new Date();
    userSessions.set(chatId, session);

    console.log(`📨 Message from ${user.first_name}: ${text}`);

    // Analyze message
    const analysis = messageAnalyzer.analyzeMessage(text);

    // Handle keyboard buttons
    if (text) {
        await handleKeyboardAction(chatId, text, user, analysis);
    }
});

// Handle keyboard actions
async function handleKeyboardAction(chatId, text, user, analysis) {
    await delay(config.bot.responseDelay);

    switch (text) {
        case '🚨 Urgent':
            await handleUrgentRequest(chatId, user);
            break;

        case '📺 Media request':
            await handleMediaRequest(chatId, user);
            break;

        case '📊 Audit request':
            await handleAuditRequest(chatId, user);
            break;

        case '❓ FAQ':
            await handleFAQRequest(chatId);
            break;

        case '📞 Contact':
            await handleContactRequest(chatId);
            break;

        case '🏠 Main Menu':
        case '🔙 Back to Main':
            await handleMainMenu(chatId);
            break;

        // FAQ sub-menu
        case '⏰ Working Hours':
            await bot.sendMessage(chatId, findFAQResponse('working hours'), faqKeyboard);
            break;

        case '📋 Services':
            await bot.sendMessage(chatId, findFAQResponse('services'), faqKeyboard);
            break;

        case '💰 Pricing':
            await bot.sendMessage(chatId, findFAQResponse('pricing'), faqKeyboard);
            break;

        case '🛠 Support':
            await bot.sendMessage(chatId, findFAQResponse('support'), faqKeyboard);
            break;

        case '📞 Contact Info':
            await bot.sendMessage(chatId, findFAQResponse('contact'), faqKeyboard);
            break;

        case '🔙 Back to Main':
            await handleMainMenu(chatId);
            break;

        // Urgent sub-menu
        case '🔥 Critical Issue':
            await handleCriticalIssue(chatId, user, text);
            break;

        case '⚡ High Priority':
            await handleHighPriority(chatId, user, text);
            break;

        case '📞 Request Callback':
            await handleCallbackRequest(chatId, user, text);
            break;

        // Media sub-menu
        case '📰 Press Release':
        case '🎤 Interview Request':
        case '📸 Photo Request':
        case '📺 Video Request':
            await handleSpecificMediaRequest(chatId, user, text);
            break;

        // Audit sub-menu
        case '🏢 Financial Audit':
        case '🔒 Security Audit':
        case '📊 Compliance Audit':
        case '🔍 Internal Audit':
            await handleSpecificAuditRequest(chatId, user, text);
            break;

        default:
            await handleGeneralMessage(chatId, text, user, analysis);
    }
}

// Handler functions
async function handleUrgentRequest(chatId, user) {
    const message = `
🚨 **Urgent Request**

Your request has been marked as urgent and will be processed immediately.

Please describe your issue in detail or select a category:
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...urgentKeyboard
    });

    // Auto-forward to action group
    if (config.telegram.actionGroupChatId) {
        const forwardMessage = `🚨 **URGENT REQUEST INITIATED**\n\n👤 User: ${user.first_name} ${user.last_name || ''}\n🆔 ID: ${user.id}\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\nUser accessed urgent menu.`;

        try {
            await bot.sendMessage(config.telegram.actionGroupChatId, forwardMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Error forwarding to action group:', error.message);
        }
    }
}

async function handleMediaRequest(chatId, user) {
    const message = `
📺 **Media Request**

Directing you to our PR department for media inquiries.

Select the type of your request:
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...mediaKeyboard
    });
}

async function handleAuditRequest(chatId, user) {
    const message = `
📊 **Audit Request**

Connecting you with our audit specialist.

Select the type of audit you're interested in:
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...auditKeyboard
    });
}

async function handleFAQRequest(chatId) {
    const message = `
❓ **Frequently Asked Questions**

Select a category or type your question directly:
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...faqKeyboard
    });
}

async function handleContactRequest(chatId) {
    const contactMessage = `
📞 **Contact Information**

🏢 **Company:** Your Company Name
📍 **Address:** 123 Business Street, New York, NY 10001

📞 **Phone Numbers:**
• Main: +1 (555) 123-4567
• Emergency: +1 (555) 999-0000

📧 **Email:**
• General inquiries: info@company.com
• Support: support@company.com
• Media: press@company.com

🌐 **Online:**
• Website: www.company.com
• LinkedIn: /company/your-company

⏰ **Business Hours:**
Monday - Friday: 9:00 AM - 6:00 PM
Saturday - Sunday: Closed

For emergencies outside business hours, use this bot! 🤖
`;

    await bot.sendMessage(chatId, contactMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
}

async function handleMainMenu(chatId) {
    await bot.sendMessage(chatId, '🏠 Main Menu\n\nSelect a category:', mainKeyboard);
}

async function handleCriticalIssue(chatId, user, originalText) {
    const message = `
🔥 **CRITICAL ISSUE**

Your request has been marked as critical. Our team has been notified and will contact you as soon as possible.

Please describe the problem in maximum detail:
`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    await forwardToActionGroup(user, originalText, 'CRITICAL ISSUE', chatId);
}

async function handleHighPriority(chatId, user, originalText) {
    const message = `
⚡ **HIGH PRIORITY**

Your request has high priority and will be processed with priority.

Please provide more details:
`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    await forwardToActionGroup(user, originalText, 'HIGH PRIORITY', chatId);
}

async function handleCallbackRequest(chatId, user, originalText) {
    const message = `
📞 **CALLBACK REQUEST**

Your callback request has been received. We will contact you within 30 minutes.

Please confirm your phone number or provide preferred contact time:
`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    await forwardToActionGroup(user, originalText, 'CALLBACK REQUEST', chatId);
}

async function handleSpecificMediaRequest(chatId, user, requestType) {
    const message = `
📺 **${requestType}**

Your media request has been received and forwarded to our PR department.

They will contact you as soon as possible. Please provide:
• Request details
• Preferred time
• Contact information
• Deadline (if any)
`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    await forwardToActionGroup(user, requestType, 'MEDIA REQUEST', chatId);
}

async function handleSpecificAuditRequest(chatId, user, auditType) {
    const message = `
📊 **${auditType}**

Your audit request has been received and forwarded to our audit department.

A specialist will contact you to clarify details. Please be ready with:
• Audit scope
• Preferred dates
• Specific requirements
• Contact information
`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    await forwardToActionGroup(user, auditType, 'AUDIT REQUEST', chatId);
}

async function handleGeneralMessage(chatId, text, user, analysis) {
    // First, try to find FAQ response
    const faqResponse = findFAQResponse(text);

    if (faqResponse) {
        await bot.sendMessage(chatId, faqResponse, mainKeyboard);
        return;
    }

    // If message should be auto-forwarded based on analysis
    if (analysis.shouldAutoForward || analysis.isUrgent) {
        await forwardToActionGroup(user, text, analysis.priority.toUpperCase(), chatId);

        let responseMessage = '';

        if (analysis.isUrgent) {
            responseMessage = '🚨 Your message has been marked as urgent and forwarded to our team for immediate processing.';
        } else if (analysis.isMedia) {
            responseMessage = '📺 Your message appears to be a media request and has been forwarded to our PR department.';
        } else if (analysis.isAudit) {
            responseMessage = '📊 Your message appears to be an audit request and has been forwarded to our audit department.';
        } else {
            responseMessage = '📨 Your message has been received and forwarded to the appropriate department for processing.';
        }

        responseMessage += '\n\nYou will receive a response as soon as possible. You can use the menu for other requests:';

        await bot.sendMessage(chatId, responseMessage, mainKeyboard);

    } else {
        // General response for unclassified messages
        const generalResponse = `
Thank you for your message! 😊

I couldn't identify a specific category for your request. Please select the appropriate category from the menu or:

• For urgent cases: 🚨 Urgent
• For media inquiries: 📺 Media request  
• For audit services: 📊 Audit request
• For general questions: ❓ FAQ

Or simply clarify your question! 📝
`;

        await bot.sendMessage(chatId, generalResponse, mainKeyboard);
    }
}

// Forward message to action group
async function forwardToActionGroup(user, originalMessage, category, chatId) {
    if (!config.telegram.actionGroupChatId) {
        console.log('⚠️  Action group not configured, skipping forward');
        return;
    }

    const analysis = messageAnalyzer.analyzeMessage(originalMessage);
    const summary = messageAnalyzer.generateMessageSummary(originalMessage, user, analysis);

    const forwardMessage = `
🔔 **${category} - NEW MESSAGE**

${summary}

**Category:** ${category}
**Chat ID:** ${chatId}
**Confidence:** ${(analysis.confidence * 100).toFixed(1)}%

---
*Auto-forwarded by Business Assistant Bot*
`;

    try {
        await bot.sendMessage(config.telegram.actionGroupChatId, forwardMessage, {
            parse_mode: 'Markdown',
            ...inlineQuickActions
        });
        console.log(`✅ Message forwarded to action group: ${category}`);
    } catch (error) {
        console.error('❌ Error forwarding to action group:', error.message);
    }
}

// Handle callback queries from inline keyboards
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    switch (data) {
        case 'urgent_mark':
            await bot.answerCallbackQuery(query.id, { text: 'Marked as urgent!' });
            break;
        case 'create_ticket':
            await bot.answerCallbackQuery(query.id, { text: 'Ticket created!' });
            break;
        case 'forward_team':
            await bot.answerCallbackQuery(query.id, { text: 'Forwarded to team!' });
            break;
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot gracefully...');
    bot.stopPolling();
    process.exit(0);
});

// Start message
console.log('🤖 Business Assistant Bot starting...');
console.log(`📡 Bot name: ${config.bot.name}`);
console.log(`🔗 Action group: ${config.telegram.actionGroupChatId ? 'Configured' : 'Not configured'}`);
console.log('✅ Bot is running! Press Ctrl+C to stop.');

module.exports = bot;