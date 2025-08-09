const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const {
    mainKeyboard,
    faqKeyboard,
    urgentKeyboard,
    mediaKeyboard,
    auditKeyboard,
    inlineQuickActions,
    web3Keyboard
} = require('./utils/keyboards');
const MessageAnalyzer = require('./utils/messageAnalyzer');
const FAQHandler = require('./handlers/faqHandler');
const Web3Handler = require('./handlers/web3Handler');
const AnalyticsHandler = require('./handlers/analyticsHandler');

// Initialize bot and handlers
const bot = new TelegramBot(config.telegram.botToken, { polling: true });
const messageAnalyzer = new MessageAnalyzer();
const faqHandler = new FAQHandler();
const web3Handler = new Web3Handler();
const analyticsHandler = new AnalyticsHandler();

// Store user sessions
const userSessions = new Map();

// Welcome message for Web3 Business Bot
const WELCOME_MESSAGE = `
🚀 **Welcome to Web3 Business Assistant!**

I'm your intelligent Web3 assistant, ready to help with:

🚨 **Urgent** - Critical issues and emergencies
📺 **Media request** - Press inquiries and interviews  
📊 **Audit request** - Audit services and compliance
❓ **FAQ** - Web3 and blockchain questions
🌐 **Web3** - Real-time crypto prices and market data
📞 **Contact** - Get in touch with our team

Type a crypto symbol (like "BTC" or "ETH") for instant price data, or select a category from the menu! 👇
`;

// Utility function to delay responses
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

    // Log interaction
    analyticsHandler.logInteraction(user, 'command', { command: 'start' });

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
    const user = msg.from;

    analyticsHandler.logInteraction(user, 'command', { command: 'help' });

    const helpMessage = `
🆘 **Web3 Business Assistant Help**

**Basic Commands:**
/start - Start over
/help - Show this help
/stats - Show bot statistics (admin only)
/trending - Show trending cryptocurrencies
/market - Show global market data

**Web3 Features:**
• Type any crypto symbol for prices (BTC, ETH, SOL, etc.)
• "trending" - See what's hot in crypto
• "market" - Global crypto market overview

**Quick Actions:**
• Select a category from the menu
• Type your question directly
• For urgent cases: press "🚨 Urgent"

**Supported Language:**
🇬🇧 English with Web3 focus

If you need help, just ask! I understand Web3 and crypto terminology.
`;

    await bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

// Stats command (for admins)
bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = msg.from;

    analyticsHandler.logInteraction(user, 'command', { command: 'stats' });

    // Check if user is admin
    if (!config.telegram.adminUserIds.includes(userId)) {
        await bot.sendMessage(chatId, '❌ You do not have permission to access this command.');
        return;
    }

    const statsReport = analyticsHandler.formatAnalyticsReport();
    await bot.sendMessage(chatId, statsReport, { parse_mode: 'Markdown' });
});

// Trending command
bot.onText(/\/trending/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    analyticsHandler.logInteraction(user, 'command', { command: 'trending' });

    try {
        const trending = await web3Handler.getTrendingCryptos();
        const response = web3Handler.formatTrendingResponse(trending);

        analyticsHandler.logInteraction(user, 'web3_query', { queryType: 'trending' });

        await bot.sendMessage(chatId, response, {
            parse_mode: 'Markdown',
            ...web3Keyboard
        });
    } catch (error) {
        analyticsHandler.logError(error, { command: 'trending', userId: user.id });
        await bot.sendMessage(chatId, `❌ ${error.message}`, mainKeyboard);
    }
});

// Market command
bot.onText(/\/market/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    analyticsHandler.logInteraction(user, 'command', { command: 'market' });

    try {
        const marketData = await web3Handler.getMarketData();
        const response = web3Handler.formatMarketResponse(marketData);

        analyticsHandler.logInteraction(user, 'web3_query', { queryType: 'market' });

        await bot.sendMessage(chatId, response, {
            parse_mode: 'Markdown',
            ...web3Keyboard
        });
    } catch (error) {
        analyticsHandler.logError(error, { command: 'market', userId: user.id });
        await bot.sendMessage(chatId, `❌ ${error.message}`, mainKeyboard);
    }
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

    // Handle different types of messages
    if (text) {
        await handleMessage(chatId, text, user, analysis);
    }
});

// Main message handler
async function handleMessage(chatId, text, user, analysis) {
    await delay(config.bot.responseDelay);

    // Check for keyboard button actions first
    if (await handleKeyboardAction(chatId, text, user, analysis)) {
        return;
    }

    // Check for Web3 price queries
    if (web3Handler.isPriceQuery(text)) {
        await handlePriceQuery(chatId, text, user);
        return;
    }

    // Check for Web3 keywords
    if (await handleWeb3Keywords(chatId, text, user)) {
        return;
    }

    // Check for FAQ queries
    const faqMatch = faqHandler.findFAQResponse(text);
    if (faqMatch) {
        const response = faqHandler.formatFAQResponse(faqMatch);
        await bot.sendMessage(chatId, response, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });

        analyticsHandler.logInteraction(user, 'faq_query', {
            faqId: faqMatch.id,
            question: faqMatch.question,
            matchType: faqMatch.matchType
        });
        return;
    }

    // Handle general message with auto-forwarding logic
    await handleGeneralMessage(chatId, text, user, analysis);
}

// Handle keyboard actions
async function handleKeyboardAction(chatId, text, user, analysis) {
    switch (text) {
        case '🚨 Urgent':
            await handleUrgentRequest(chatId, user);
            return true;

        case '📺 Media request':
            await handleMediaRequest(chatId, user);
            return true;

        case '📊 Audit request':
            await handleAuditRequest(chatId, user);
            return true;

        case '❓ FAQ':
            await handleFAQRequest(chatId, user);
            return true;

        case '🌐 Web3':
            await handleWeb3Menu(chatId, user);
            return true;

        case '📞 Contact':
            await handleContactRequest(chatId);
            return true;

        case '🏠 Main Menu':
        case '🔙 Back to Main':
            await handleMainMenu(chatId);
            return true;

        // FAQ sub-menu
        case '⏰ Working Hours':
        case '📋 Services':
        case '💰 Pricing':
        case '🛠 Support':
        case '📞 Contact Info':
            await handleFAQSubMenu(chatId, text, user);
            return true;

        // Web3 sub-menu
        case '📈 Live Prices':
            await handleLivePrices(chatId, user);
            return true;
        case '🔥 Trending':
            await handleTrendingCryptos(chatId, user);
            return true;
        case '🌍 Market Data':
            await handleMarketData(chatId, user);
            return true;

        // Urgent sub-menu
        case '🔥 Critical Issue':
        case '⚡ High Priority':
        case '📞 Request Callback':
            await handleUrgentSubMenu(chatId, user, text);
            return true;

        // Media and Audit sub-menus
        case '📰 Press Release':
        case '🎤 Interview Request':
        case '📸 Photo Request':
        case '📺 Video Request':
            await handleSpecificMediaRequest(chatId, user, text);
            return true;

        case '🏢 Financial Audit':
        case '🔒 Security Audit':
        case '📊 Compliance Audit':
        case '🔍 Internal Audit':
            await handleSpecificAuditRequest(chatId, user, text);
            return true;

        default:
            return false;
    }
}

// Handle price queries
async function handlePriceQuery(chatId, text, user) {
    try {
        const symbol = web3Handler.extractSymbol(text);
        const priceData = await web3Handler.getCryptoPrice(symbol);
        const response = web3Handler.formatPriceResponse(priceData);

        analyticsHandler.logInteraction(user, 'web3_query', {
            queryType: 'price',
            symbol: symbol.toUpperCase()
        });

        await bot.sendMessage(chatId, response, {
            parse_mode: 'Markdown',
            ...web3Keyboard
        });
    } catch (error) {
        analyticsHandler.logError(error, { query: 'price', symbol: text, userId: user.id });
        await bot.sendMessage(chatId, `❌ ${error.message}`, mainKeyboard);
    }
}

// Handle Web3 keywords
async function handleWeb3Keywords(chatId, text, user) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('trending') || lowerText.includes('hot crypto')) {
        try {
            const trending = await web3Handler.getTrendingCryptos();
            const response = web3Handler.formatTrendingResponse(trending);

            analyticsHandler.logInteraction(user, 'web3_query', { queryType: 'trending' });

            await bot.sendMessage(chatId, response, {
                parse_mode: 'Markdown',
                ...web3Keyboard
            });
            return true;
        } catch (error) {
            analyticsHandler.logError(error, { query: 'trending', userId: user.id });
            await bot.sendMessage(chatId, `❌ ${error.message}`, mainKeyboard);
            return true;
        }
    }

    if (lowerText.includes('market') && (lowerText.includes('data') || lowerText.includes('cap'))) {
        try {
            const marketData = await web3Handler.getMarketData();
            const response = web3Handler.formatMarketResponse(marketData);

            analyticsHandler.logInteraction(user, 'web3_query', { queryType: 'market' });

            await bot.sendMessage(chatId, response, {
                parse_mode: 'Markdown',
                ...web3Keyboard
            });
            return true;
        } catch (error) {
            analyticsHandler.logError(error, { query: 'market', userId: user.id });
            await bot.sendMessage(chatId, `❌ ${error.message}`, mainKeyboard);
            return true;
        }
    }

    return false;
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

    analyticsHandler.logInteraction(user, 'urgent', { action: 'menu_accessed' });

    // Auto-forward to action group
    if (config.telegram.actionGroupChatId) {
        const forwardMessage = `🚨 **URGENT REQUEST INITIATED**\n\n👤 User: ${user.first_name} ${user.last_name || ''}\n🆔 ID: ${user.id}\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\nUser accessed urgent menu.`;

        try {
            await bot.sendMessage(config.telegram.actionGroupChatId, forwardMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            analyticsHandler.logError(error, { action: 'forward_urgent', userId: user.id });
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

    analyticsHandler.logInteraction(user, 'media_request', { action: 'menu_accessed' });
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

    analyticsHandler.logInteraction(user, 'audit_request', { action: 'menu_accessed' });
}

async function handleFAQRequest(chatId, user) {
    const message = `
❓ **Frequently Asked Questions**

Browse our Web3 and blockchain FAQ, or ask your question directly:
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...faqKeyboard
    });

    analyticsHandler.logInteraction(user, 'faq_menu', { action: 'menu_accessed' });
}

async function handleWeb3Menu(chatId, user) {
    const message = `
🌐 **Web3 & Crypto Hub**

Get real-time cryptocurrency data and market insights:
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...web3Keyboard
    });

    analyticsHandler.logInteraction(user, 'web3_menu', { action: 'menu_accessed' });
}

async function handleContactRequest(chatId) {
    const contactMessage = `
📞 **Contact Information**

🏢 **Company:** Web3 Business Solutions
📍 **Address:** 123 Blockchain Avenue, Crypto City, CC 10001

📞 **Phone Numbers:**
• Main: +1 (555) 123-4567
• Emergency: +1 (555) 999-0000

📧 **Email:**
• General inquiries: info@web3business.com
• Support: support@web3business.com
• Media: press@web3business.com

🌐 **Online:**
• Website: www.web3business.com
• Twitter: @Web3Business
• Discord: discord.gg/web3business

⏰ **Business Hours:**
Monday - Friday: 9:00 AM - 6:00 PM EST
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

// Continue in next part due to length...
// [Additional handler functions would continue here]

// Error handling
bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error.message);
    analyticsHandler.logError(error, { type: 'polling_error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Web3 bot gracefully...');
    analyticsHandler.saveAnalytics();
    bot.stopPolling();
    process.exit(0);
});

// Auto-save analytics periodically
analyticsHandler.startAutoSave(30);

// Start message
console.log('🚀 Web3 Business Assistant Bot starting...');
console.log(`📡 Bot name: ${config.bot.name}`);
console.log(`🔗 Action group: ${config.telegram.actionGroupChatId ? 'Configured' : 'Not configured'}`);
console.log('✅ Web3 Bot is running! Press Ctrl+C to stop.');

module.exports = bot;