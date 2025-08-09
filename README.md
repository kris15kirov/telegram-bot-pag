# 🚀 Web3 Telegram Business Assistant Bot

A comprehensive Telegram bot solution with **Web3 integration**, designed for modern blockchain businesses. Features real-time cryptocurrency data, intelligent FAQ responses, and automated customer support with smart message forwarding.

## 🌟 **Two Bot Versions Available:**
- **`src/bot.js`** - Original English business bot
- **`src/bot-web3.js`** - Enhanced Web3 bot with crypto features
- **`src/webhook.js`** - Production webhook server

## 🎯 **Quick Demo**
```bash
npm install
node demo-web3.js  # Test all Web3 features
```

## ✨ Features

### 🔄 Core Functionality
- **🌐 Web3 Integration** - Real-time crypto prices via CoinGecko API
- **💰 Live Cryptocurrency Data** - BTC, ETH, SOL, ADA and 100+ cryptocurrencies
- **📈 Market Analytics** - Global crypto market data and trending coins
- **📚 JSON-based FAQ** - Comprehensive Web3/DeFi/NFT knowledge base
- **📊 Analytics Dashboard** - Complete user interaction tracking
- **🔄 Smart Message Filtering** - AI-powered categorization and auto-forwarding
- **🎛️ Interactive Keyboards** - Professional menu navigation
- **🚀 Production Ready** - Webhook support with multiple deployment options

### 📋 Request Categories
- **🚨 Urgent** - Critical issues and high-priority requests
- **📺 Media Requests** - Press releases, interviews, photo/video requests
- **📊 Audit Requests** - Financial, security, compliance, and internal audits
- **❓ FAQ** - Frequently asked questions and general information
- **📞 Contact** - Company contact information and working hours

### 🤖 Smart Features
- **Message Analysis** - AI-powered message categorization and priority detection
- **Contact Detection** - Automatically extracts phone numbers, emails, and social handles
- **Session Management** - Tracks user interactions and maintains conversation context
- **Admin Commands** - Special commands for administrators to monitor bot status
- **Professional Interface** - Clean, intuitive English-language user experience

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd telegram-bot-pag
npm install
```

### 2. Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env file with your configuration
nano .env
```

### 3. Get Bot Token
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token to your `.env` file

### 4. Set Up Action Group (Optional)
1. Create a Telegram group for receiving forwarded messages
2. Add your bot to the group as admin
3. Get the group chat ID and add it to `.env`

### 5. Run the Bot
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Required: Your bot token from BotFather
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional: Group chat ID for forwarding important messages
ACTION_GROUP_CHAT_ID=your_action_group_chat_id_here

# Optional: Admin user IDs (comma separated)
ADMIN_USER_IDS=user_id_1,user_id_2

# Optional: Bot configuration
BOT_NAME=Business Assistant Bot
RESPONSE_DELAY=1000
```

### Getting Chat IDs

#### For Action Group:
1. Add your bot to the group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":-XXXXXXXXX}` in the JSON response

#### For Admin User IDs:
1. Message [@userinfobot](https://t.me/userinfobot)
2. It will reply with your user ID

## 📁 Project Structure

```
telegram-bot-pag/
├── src/
│   ├── bot.js                 # Main bot application
│   ├── config/
│   │   └── config.js          # Configuration management
│   ├── data/
│   │   └── faq.js             # FAQ responses database
│   └── utils/
│       ├── keyboards.js       # Telegram keyboard layouts
│       └── messageAnalyzer.js # Message analysis and categorization
├── package.json               # Dependencies and scripts
├── env.example               # Environment variables template
└── README.md                 # This file
```

## 🎯 Usage Guide

### User Commands
- `/start` - Initialize the bot and show main menu
- `/help` - Display help information
- `/status` - Show bot status (admin only)

### Main Menu Options
- **🚨 Urgent** - For critical issues and emergencies
- **📺 Media request** - For press and media inquiries
- **📊 Audit request** - For audit and compliance services
- **❓ FAQ** - Browse frequently asked questions
- **📞 Contact** - Get company contact information

### Smart Features
The bot automatically:
- Detects urgent keywords and escalates messages
- Identifies media and audit requests
- Extracts contact information from messages
- Forwards high-priority messages to action groups
- Provides contextual English responses based on message content

## 🛠 Development

### Adding New FAQ Responses
Edit `src/data/faq.js` to add new questions and answers:

```javascript
const faq = {
  'new question': 'New answer here',
  'another question': 'Another answer here'
};
```

### Customizing Keywords
Modify `src/config/config.js` to adjust keyword detection:

```javascript
keywords: {
  urgent: ['urgent', 'emergency', 'critical', 'asap'],
  media: ['media', 'interview', 'press', 'journalist'],
  audit: ['audit', 'inspection', 'review', 'compliance']
}
```

### Adding New Keyboards
Create new keyboard layouts in `src/utils/keyboards.js`:

```javascript
const customKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: 'Option 1' }, { text: 'Option 2' }]
    ],
    resize_keyboard: true
  }
};
```

## 📊 Monitoring

### Admin Commands
Administrators can use special commands:

```bash
/status  # View bot statistics and active users
```

### Logs
The bot logs important events to console:
- User interactions
- Message forwards
- Error handling
- System status

## 🔒 Security Features

- **Admin Verification** - Admin commands require user ID verification
- **Input Validation** - All user inputs are properly sanitized
- **Error Handling** - Graceful error handling with user-friendly messages
- **Rate Limiting** - Built-in delays prevent spam
- **Secure Configuration** - Sensitive data stored in environment variables

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
```bash
npm start
```

### Using PM2 (Recommended for production)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/bot.js --name "telegram-bot"

# Monitor
pm2 monit

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Docker Deployment
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY .env ./

CMD ["npm", "start"]
```

## 🔧 Troubleshooting

### Common Issues

#### Bot not responding
- Check if bot token is correct
- Verify bot is not stopped in BotFather
- Check console for error messages

#### Messages not forwarding to action group
- Verify `ACTION_GROUP_CHAT_ID` is correct
- Ensure bot is admin in the target group
- Check bot has message sending permissions

#### FAQ not working
- Verify message text matches FAQ keywords
- Check for typos in FAQ database
- Ensure proper encoding for Bulgarian characters

### Debug Mode
Enable detailed logging by modifying the console.log statements in the code.

## 📈 Performance

- **Response Time**: ~1 second average response
- **Concurrent Users**: Supports multiple users simultaneously
- **Memory Usage**: ~50MB average
- **Uptime**: Designed for 24/7 operation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Create an issue on GitHub
- Contact the development team
- Check the FAQ section

## 🔄 Updates

Check the repository regularly for updates and improvements. The bot is actively maintained and enhanced with new features.

---

**Made with ❤️ for efficient business communication**