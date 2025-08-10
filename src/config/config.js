require('dotenv').config();

const config = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        actionGroupChatId: process.env.ACTION_GROUP_CHAT_ID,
        adminUserIds: process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id.trim())) : [],
        webhookUrl: process.env.WEBHOOK_URL,
        port: parseInt(process.env.PORT) || 3000,
    },
    bot: {
        name: process.env.BOT_NAME || 'Web3 Security Assistant',
        responseDelay: parseInt(process.env.RESPONSE_DELAY) || 1000,
        description: 'English-only Web3 assistant for blockchain businesses. Powered by Pashov Audit Group expertise (Uniswap, Aave, LayerZero). Get FAQs, crypto prices, or escalate requests.',
    },
    web3: {
        moralisApiKey: process.env.MORALIS_API_KEY,
        etherscanApiKey: process.env.ETHERSCAN_API_KEY,
        coingeckoBaseUrl: 'https://api.coingecko.com/api/v3',
        cacheTtl: 300, // 5 minutes
    },
    keywords: {
        urgent: ['urgent', 'emergency', 'critical', 'asap', 'important', 'crisis', 'immediate'],
        media: ['media', 'interview', 'press', 'journalist', 'reporter', 'news', 'publication'],
        audit: ['audit', 'inspection', 'review', 'compliance', 'examination', 'assessment'],
    },
    auditedProjects: {
        dex: ['Uniswap', 'Sushi', '1inch', 'Bunni', 'Solidly', 'KittenSwap', 'Gains Network', 'Reya Network'],
        lending: ['Aave', 'Hyperlend', 'Blueberry', 'Florence Finance', 'Radiant'],
        stablecoin: ['Ethena', 'Resolv', 'Hyperstable', 'USDV', 'Open Dollar'],
        assetManagement: ['Reserve', 'Cove', 'GammaSwap', 'Arcadia', 'Fyde'],
        fundraising: ['Pump', 'Catalyst', 'Sofamon'],
        game: ['Coinflip', 'Curio', 'Azuro'],
        others: ['LayerZero', 'BOB', 'Karak', 'Cryptex', 'Ambire']
    },
    database: {
        path: 'src/data/bot_analytics.db',
        logsPath: 'src/logs/bot-analytics.log'
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

if (!config.web3.moralisApiKey) {
    console.warn('⚠️  MORALIS_API_KEY not set - wallet queries will be disabled');
}

if (!config.web3.etherscanApiKey) {
    console.warn('⚠️  ETHERSCAN_API_KEY not set - gas price queries will be disabled');
}

module.exports = config;