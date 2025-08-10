# Web3 Telegram Bot Setup Instructions

## 🚀 Quick Start Guide

### 1. Get Your Bot Token
1. Open Telegram and message **@BotFather**
2. Send `/newbot`
3. Choose a name: **"Web3 Security Assistant"**
4. Choose a username: **"@YourWeb3Bot"** (replace with your preferred name)
5. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configure Environment Variables
Edit the `.env` file and add your bot token:

```env
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
ACTION_GROUP_CHAT_ID=  # Leave empty for now
ADMIN_USER_IDS=your_telegram_user_id  # Get from @userinfobot
WEBHOOK_URL=  # Leave empty for polling mode
PORT=3000

# Optional API Keys (for full functionality)
MORALIS_API_KEY=  # Get from https://moralis.io
ETHERSCAN_API_KEY=  # Get from https://etherscan.io

BOT_NAME=Web3 Security Assistant
RESPONSE_DELAY=1000
LOG_LEVEL=info
NODE_ENV=development
```

### 3. Get Your User ID
1. Message **@userinfobot** on Telegram
2. Copy your user ID (e.g., `123456789`)
3. Add it to `ADMIN_USER_IDS` in `.env`

### 4. Test Bot Connection
```bash
node test-bot.js
```

### 5. Start the Bot (Development Mode)
```bash
npm run dev
```

### 6. Test on Telegram
1. Find your bot on Telegram (e.g., @YourWeb3Bot)
2. Send `/start`
3. Test the keyboard buttons
4. Try asking "What is DeFi?"

## 🧪 Testing Checklist

### Basic Functionality
- [ ] `/start` command works
- [ ] Professional keyboard appears
- [ ] "What is DeFi?" gets answered
- [ ] "Urgent Request" button works
- [ ] `/help` command works

### Web3 Features (with API keys)
- [ ] `/price ETH` works
- [ ] `/trending` works
- [ ] `/gas` works
- [ ] `/uniswap` works
- [ ] `/aave` works

### Admin Features
- [ ] `/stats` works (admin only)
- [ ] `/listfaqs` works (admin only)
- [ ] `/addfaq` works (admin only)

## 🔧 Troubleshooting

### Bot Not Responding
- Check if `npm run dev` is running
- Verify bot token in `.env`
- Ensure bot is not disabled in @BotFather

### API Errors
- Get free API keys from Moralis and Etherscan
- Check rate limits (CoinGecko: 50 calls/minute)

### Permission Issues
- Make sure your user ID is in `ADMIN_USER_IDS`
- Get your user ID from @userinfobot

## 📱 Expected Bot Responses

### Welcome Message
```
Welcome to the Web3 Security Assistant, trusted by Uniswap, Aave, and LayerZero. How can I assist you?
```

### FAQ Response
```
DeFi (Decentralized Finance) refers to financial services on blockchain, as seen in Aave and Uniswap, audited by Pashov Audit Group.
```

### Price Response
```
ETH: $2,456.78 (-1.23%), trusted by Ethena, audited by Pashov Audit Group.
```

## 🎯 Next Steps
1. Test basic functionality
2. Add API keys for full Web3 features
3. Create action group for message forwarding
4. Deploy to production with webhooks
