const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Simple test script to verify bot token
async function testBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || token === 'your_telegram_bot_token_here') {
        console.log('❌ Please set your TELEGRAM_BOT_TOKEN in .env file');
        console.log('📝 Get your token from @BotFather on Telegram');
        return;
    }

    try {
        const bot = new TelegramBot(token, { polling: false });
        const me = await bot.getMe();
        console.log('✅ Bot connection successful!');
        console.log(`🤖 Bot name: ${me.first_name}`);
        console.log(`🔗 Bot username: @${me.username}`);
        console.log(`🆔 Bot ID: ${me.id}`);
        console.log('');
        console.log('🎉 Your bot is ready! You can now:');
        console.log('1. Run: npm run dev (for polling mode)');
        console.log('2. Message your bot on Telegram');
        console.log('3. Send /start to test');

    } catch (error) {
        console.log('❌ Bot connection failed!');
        console.log('Error:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Check your TELEGRAM_BOT_TOKEN in .env');
        console.log('2. Make sure the token is correct from @BotFather');
        console.log('3. Ensure the bot is not disabled');
    }
}

testBot();
