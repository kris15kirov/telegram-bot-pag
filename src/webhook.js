const express = require('express');
const rateLimit = require('express-rate-limit');
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
const { loggers, logUserInteraction, logError } = require('./utils/logger');

// Environment variables for webhook
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g., https://yourapp.herokuapp.com
const WEBHOOK_PATH = `/webhook/${config.telegram.botToken}`;

// Initialize Express app
const app = express();

// Rate limiting for webhook endpoints
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        loggers.webhook.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(429).json({
            error: 'Too many requests from this IP, please try again later.'
        });
    }
});

// API rate limiting for analytics endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
        error: 'Too many API requests, please try again later.'
    }
});

app.use(express.json({ limit: '10mb' }));
app.use('/webhook', webhookLimiter);
app.use('/api', apiLimiter);

// Initialize bot with webhook
const bot = new TelegramBot(config.telegram.botToken);
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

// Set webhook
if (WEBHOOK_URL) {
    bot.setWebHook(`${WEBHOOK_URL}${WEBHOOK_PATH}`);
    console.log(`🔗 Webhook set to: ${WEBHOOK_URL}${WEBHOOK_PATH}`);
} else {
    console.log('⚠️ WEBHOOK_URL not set, webhook not configured');
}

// Webhook endpoint
app.post(WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Analytics endpoint (for monitoring)
app.get('/analytics', (req, res) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey !== process.env.ANALYTICS_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = analyticsHandler.getAnalyticsSummary();
    res.json(stats);
});

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

    try {
        // Analyze message
        const analysis = messageAnalyzer.analyzeMessage(text);

        // Handle different types of messages
        if (text) {
            await handleMessage(chatId, text, user, analysis);
        }
    } catch (error) {
        analyticsHandler.logError(error, {
            context: 'message_handling',
            userId: user.id,
            message: text
        });

        await bot.sendMessage(chatId,
            'Sorry, I encountered an error processing your message. Please try again.',
            mainKeyboard
        );
    }
});

// Main message handler
async function handleMessage(chatId, text, user, analysis) {
    await delay(config.bot.responseDelay);

    // Check for Web3 price queries first
    if (web3Handler.isPriceQuery(text)) {
        await handlePriceQuery(chatId, text, user);
        return;
    }

    // Check for keyboard button actions
    if (await handleKeyboardAction(chatId, text, user, analysis)) {
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

// Handle keyboard actions
async function handleKeyboardAction(chatId, text, user, analysis) {
    switch (text) {
        case '🚨 Urgent':
            await handleUrgentRequest(chatId, user);
            return true;

        case '🌐 Web3':
            await handleWeb3Menu(chatId, user);
            return true;

        case '📈 Live Prices':
            await handleLivePrices(chatId, user);
            return true;

        case '🔥 Trending':
            await handleTrendingCryptos(chatId, user);
            return true;

        case '🌍 Market Data':
            await handleMarketData(chatId, user);
            return true;

        case '🏠 Main Menu':
        case '🔙 Back to Main':
            await handleMainMenu(chatId);
            return true;

        default:
            return false;
    }
}

// Web3 handler functions
async function handleWeb3Menu(chatId, user) {
    const message = `
🌐 **Web3 & Crypto Hub**

Get real-time cryptocurrency data and market insights:

📈 **Live Prices** - Check any crypto price
🔥 **Trending** - See what's hot right now
🌍 **Market Data** - Global crypto market overview

Just type a crypto symbol (BTC, ETH, SOL) for instant prices!
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...web3Keyboard
    });

    analyticsHandler.logInteraction(user, 'web3_menu', { action: 'menu_accessed' });
}

async function handleLivePrices(chatId, user) {
    const message = `
📈 **Live Crypto Prices**

Type any cryptocurrency symbol to get real-time prices:

**Popular Symbols:**
• BTC (Bitcoin)
• ETH (Ethereum) 
• ADA (Cardano)
• SOL (Solana)
• DOT (Polkadot)
• MATIC (Polygon)

Just type the symbol (e.g., "BTC" or "eth price") and I'll fetch the latest data!
`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...web3Keyboard
    });

    analyticsHandler.logInteraction(user, 'web3_query', { queryType: 'live_prices_menu' });
}

async function handleTrendingCryptos(chatId, user) {
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
        await bot.sendMessage(chatId, `❌ ${error.message}`, web3Keyboard);
    }
}

async function handleMarketData(chatId, user) {
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
        await bot.sendMessage(chatId, `❌ ${error.message}`, web3Keyboard);
    }
}

async function handleUrgentRequest(chatId, user) {
    const message = `
🚨 **Urgent Request**

Your request has been marked as urgent and will be processed immediately.

Please describe your issue in detail:
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

async function handleMainMenu(chatId) {
    await bot.sendMessage(chatId, '🏠 Main Menu\n\nSelect a category:', mainKeyboard);
}

async function handleWeb3Keywords(chatId, text, user) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('trending') || lowerText.includes('hot crypto')) {
        await handleTrendingCryptos(chatId, user);
        return true;
    }

    if (lowerText.includes('market') && (lowerText.includes('data') || lowerText.includes('cap'))) {
        await handleMarketData(chatId, user);
        return true;
    }

    return false;
}

async function handleGeneralMessage(chatId, text, user, analysis) {
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
        // Enhanced fallback for Web3 bot
        const generalResponse = faqHandler.getFallbackResponse();
        const enhancedResponse = `${generalResponse}\n\n💡 **Quick tip:** Try typing a crypto symbol like "BTC" or "ETH" for instant price data!`;

        await bot.sendMessage(chatId, enhancedResponse, mainKeyboard);
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
*Auto-forwarded by Web3 Business Assistant Bot*
`;

    try {
        await bot.sendMessage(config.telegram.actionGroupChatId, forwardMessage, {
            parse_mode: 'Markdown',
            ...inlineQuickActions
        });
        console.log(`✅ Message forwarded to action group: ${category}`);
    } catch (error) {
        analyticsHandler.logError(error, { action: 'forward_message', category, userId: user.id });
    }
}

// Auto-save analytics periodically
analyticsHandler.startAutoSave(30);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Web3 webhook server gracefully...');
    analyticsHandler.saveAnalytics();
    process.exit(0);
});

// Start the server
app.listen(PORT, () => {
    console.log('🚀 Web3 Business Assistant Bot (Webhook) starting...');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📡 Bot name: ${config.bot.name}`);
    console.log(`🔗 Action group: ${config.telegram.actionGroupChatId ? 'Configured' : 'Not configured'}`);
    console.log('✅ Web3 Bot webhook server is running!');
});

module.exports = app;