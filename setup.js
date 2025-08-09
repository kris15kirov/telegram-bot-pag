#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🤖 Telegram Business Assistant Bot Setup\n');

async function promptUser(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function setup() {
    try {
        console.log('Let\'s configure your bot!\n');

        // Get bot token
        const botToken = await promptUser('📱 Enter your Telegram Bot Token (from @BotFather): ');
        if (!botToken) {
            console.log('❌ Bot token is required!');
            process.exit(1);
        }

        // Get action group ID (optional)
        const actionGroupId = await promptUser('📋 Enter Action Group Chat ID (optional, press Enter to skip): ');

        // Get admin user IDs (optional)
        const adminIds = await promptUser('👤 Enter Admin User IDs (comma-separated, optional): ');

        // Get bot name (optional)
        const botName = await promptUser('🏷️  Enter Bot Name (default: Business Assistant Bot): ') || 'Business Assistant Bot';

        // Create .env file
        const envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${botToken}

# Action Group Chat ID (where important messages will be forwarded)
${actionGroupId ? `ACTION_GROUP_CHAT_ID=${actionGroupId}` : '# ACTION_GROUP_CHAT_ID=your_action_group_chat_id_here'}

# Optional: Admin user IDs (comma separated)
${adminIds ? `ADMIN_USER_IDS=${adminIds}` : '# ADMIN_USER_IDS=user_id_1,user_id_2'}

# Bot Configuration
BOT_NAME=${botName}
RESPONSE_DELAY=1000
`;

        fs.writeFileSync('.env', envContent);
        console.log('\n✅ Configuration saved to .env file!');

        // Check if dependencies are installed
        if (!fs.existsSync('node_modules')) {
            console.log('\n📦 Installing dependencies...');
            const { exec } = require('child_process');

            exec('npm install', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Error installing dependencies:', error);
                    return;
                }

                console.log('✅ Dependencies installed successfully!');
                console.log('\n🚀 Setup complete! You can now start your bot with:');
                console.log('   npm start        # Production mode');
                console.log('   npm run dev      # Development mode with auto-restart\n');

                console.log('📚 Next steps:');
                console.log('1. Test your bot by sending /start to it on Telegram');
                console.log('2. Add the bot to your action group (if configured)');
                console.log('3. Make the bot an admin in the action group');
                console.log('4. Customize FAQ responses in src/data/faq.js');
                console.log('\n🎉 Happy chatting!');

                rl.close();
            });
        } else {
            console.log('\n🚀 Setup complete! You can now start your bot with:');
            console.log('   npm start        # Production mode');
            console.log('   npm run dev      # Development mode with auto-restart\n');

            console.log('📚 Next steps:');
            console.log('1. Test your bot by sending /start to it on Telegram');
            console.log('2. Add the bot to your action group (if configured)');
            console.log('3. Make the bot an admin in the action group');
            console.log('4. Customize FAQ responses in src/data/faq.js');
            console.log('\n🎉 Happy chatting!');

            rl.close();
        }

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        rl.close();
    }
}

setup();