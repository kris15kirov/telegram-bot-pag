# Web3 Telegram Business Assistant Bot

A production-ready Telegram bot for Web3 businesses, powered by Pashov Audit Group's expertise in securing protocols like Uniswap, Aave, and LayerZero. This bot automates customer support, provides real-time crypto data, and offers intelligent FAQ responses with a professional tone.

## Features

### 🤖 Core Functionality
- **Web3 FAQs**: Intelligent FAQ system with NLP-based matching, referencing audited projects like Aave, Uniswap, and Ethena
- **Crypto Data**: Real-time prices (CoinGecko), wallet queries (Moralis), and gas prices (Etherscan)
- **Quick Responses**: Professional keyboard with options: Urgent Request, Audit Request, Web3 FAQs
- **Message Forwarding**: Escalate urgent queries to Pashov Audit Group's Action group
- **Analytics**: Track interactions with SQLite database and view metrics via `/stats`

### 🌐 Web3 Integrations
- **Price Queries**: `/price ETH` - Get real-time crypto prices with project references
- **Trending Tokens**: `/trending` - Top 5 trending tokens from CoinGecko
- **Gas Prices**: `/gas` - Ethereum gas prices via Etherscan
- **Wallet Queries**: `/checkbalance <address>` - Check ETH balances
- **NFT Holdings**: `/nfts <address>` - View NFT collections
- **Project Info**: `/uniswap`, `/aave`, `/layerzero`, `/ethena`, `/sushi` - Detailed project information

### 📊 Analytics & Monitoring
- **SQLite Database**: Store user interactions, FAQ queries, and Web3 data usage
- **Structured Logging**: Winston-based logging with rotation and multiple levels
- **Performance Tracking**: Response times, cache hits, and API call monitoring
- **Admin Dashboard**: `/stats` command for comprehensive analytics

### 🔒 Security & Professionalism
- **Rate Limiting**: Express rate limiting for API endpoints
- **Admin Controls**: Restricted commands for authorized users only
- **Professional Tone**: English-only responses with minimal emojis
- **Audited Project References**: All responses reference Pashov Audit Group's portfolio

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Optional: Moralis API key, Etherscan API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kris15kirov/telegram-bot-pag.git
   cd telegram-bot-pag
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Test bot connection**
   ```bash
   node test-bot.js
   ```

5. **Start the bot**
   ```bash
   # Development (polling)
   npm run dev
   
   # Production (webhook)
   npm run webhook
   ```

### Quick Testing Guide

For detailed testing instructions, see [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md).

**Basic Test Flow:**
1. Get bot token from @BotFather
2. Get your user ID from @userinfobot
3. Update `.env` file
4. Run `node test-bot.js` to verify connection
5. Start bot with `npm run dev`
6. Message your bot on Telegram and send `/start`

## Configuration

### Environment Variables

```bash
# Required
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ACTION_GROUP_CHAT_ID=your_action_group_chat_id_here
ADMIN_USER_IDS=123456789,987654321

# Optional (for Web3 features)
MORALIS_API_KEY=your_moralis_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Deployment
WEBHOOK_URL=https://your-domain.com
PORT=3000

# Bot Configuration
BOT_NAME=Web3 Security Assistant
RESPONSE_DELAY=1000
LOG_LEVEL=info
NODE_ENV=production
```

### Getting API Keys

1. **Telegram Bot Token**: Message [@BotFather](https://t.me/botfather) on Telegram
2. **Moralis API Key**: Sign up at [moralis.io](https://moralis.io) (free tier available)
3. **Etherscan API Key**: Register at [etherscan.io](https://etherscan.io) (free tier available)

## Usage

### Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Initialize the bot | `/start` |
| `/help` | Show help information | `/help` |
| `/price <symbol>` | Get crypto price | `/price ETH` |
| `/trending` | Show trending tokens | `/trending` |
| `/gas` | Ethereum gas prices | `/gas` |
| `/checkbalance <address>` | Check wallet balance | `/checkbalance 0x123...` |
| `/nfts <address>` | View NFT holdings | `/nfts 0x123...` |
| `/uniswap` | Uniswap project info | `/uniswap` |
| `/aave` | Aave project info | `/aave` |
| `/stats` | View analytics (admin) | `/stats` |

### Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/addfaq <question> \| <answer>` | Add new FAQ | `/addfaq What is DeFi? \| DeFi is...` |
| `/listfaqs` | List all FAQs | `/listfaqs` |
| `/searchfaq <term>` | Search FAQs | `/searchfaq DeFi` |

### Keyboard Interactions

The bot provides professional keyboard options:
- **Urgent Request** - Forward to action group
- **Media Inquiry** - Handle press requests
- **Audit Request** - Connect with audit team
- **Web3 FAQs** - Access FAQ system
- **Crypto Data** - Web3 data submenu
- **Contact Support** - Get contact information

## Deployment

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Environment variables in Docker**
   ```bash
   # Set environment variables
   export TELEGRAM_BOT_TOKEN=your_token
   export ACTION_GROUP_CHAT_ID=your_group_id
   # ... other variables
   
   # Start services
   docker-compose up -d
   ```

### Render Deployment

1. **Connect your repository to Render**
2. **Configure environment variables in Render dashboard**
3. **Deploy automatically** - Render will use the `render.yaml` configuration

### Manual Deployment

1. **Set up webhook**
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://your-domain.com/bot"}'
   ```

2. **Start the webhook server**
   ```bash
   npm run webhook
   ```

## Development

### Project Structure

```
telegram-bot-pag/
├── src/
│   ├── bot-web3.js          # Main bot (polling mode)
│   ├── webhook.js           # Webhook server
│   ├── config/
│   │   └── config.js        # Configuration management
│   ├── data/
│   │   ├── faq.json         # FAQ database
│   │   └── bot_analytics.db # SQLite analytics
│   ├── handlers/
│   │   ├── faqHandler.js    # FAQ processing
│   │   ├── web3Handler.js   # Web3 integrations
│   │   └── analyticsHandler.js # Analytics tracking
│   ├── utils/
│   │   ├── keyboards.js     # Keyboard layouts
│   │   └── logger.js        # Logging system
│   └── logs/                # Application logs
├── tests/                   # Test files
├── test-bot.js              # Bot connection test script
├── SETUP_INSTRUCTIONS.md    # Detailed setup guide
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose setup
├── render.yaml             # Render deployment
└── README.md              # This file
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Adding New Features

1. **FAQ Management**: Edit `src/data/faq.json` or use `/addfaq` command
2. **Web3 Integrations**: Extend `src/handlers/web3Handler.js`
3. **Keyboard Options**: Modify `src/utils/keyboards.js`
4. **Analytics**: Add new tracking in `src/handlers/analyticsHandler.js`

## Monitoring & Analytics

### Log Files

- `src/logs/combined.log` - All application logs
- `src/logs/error.log` - Error logs only
- `src/logs/bot-analytics.log` - Bot interaction logs
- `src/logs/web3.log` - Web3 API calls
- `src/logs/faq.log` - FAQ queries

### Database Schema

The SQLite database (`src/data/bot_analytics.db`) includes:

- **user_interactions**: All user interactions
- **faq_queries**: FAQ search and response data
- **web3_queries**: Web3 API calls and responses
- **message_forwarding**: Forwarded message tracking
- **admin_actions**: Administrative actions

### Health Checks

- **Endpoint**: `GET /health`
- **Docker**: Built-in health check
- **Render**: Automatic health monitoring

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check `TELEGRAM_BOT_TOKEN` is correct
   - Verify webhook URL is accessible
   - Check logs for errors

2. **Web3 features not working**
   - Verify API keys are set correctly
   - Check API rate limits
   - Review network connectivity

3. **Database errors**
   - Ensure `src/data/` directory exists
   - Check file permissions
   - Verify SQLite is working

### Log Analysis

```bash
# View recent logs
tail -f src/logs/combined.log

# Check for errors
grep "ERROR" src/logs/error.log

# Monitor bot activity
tail -f src/logs/bot-analytics.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Telegram**: @pashovkrum
- **Website**: https://www.pashov.net
- **GitHub**: https://github.com/pashov/audits

## Trusted By

This bot is powered by Pashov Audit Group's expertise, trusted by leading Web3 protocols:

- **Uniswap** - V4 Periphery contracts audit
- **Aave** - v3.2 upgrade and GHO stablecoin audit
- **LayerZero** - Six cross-chain messaging audits
- **Ethena** - Long-term partnership since 2023
- **Sushi** - RouteProcessor V6 audit

*Securing over $20 billion in TVL across 150+ audits*