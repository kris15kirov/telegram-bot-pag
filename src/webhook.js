const express = require('express');
const rateLimit = require('express-rate-limit');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const KeyboardManager = require('./utils/keyboards');
const FAQHandler = require('./handlers/faqHandler');
const Web3Handler = require('./handlers/web3Handler');
const AnalyticsHandler = require('./handlers/analyticsHandler');
const logger = require('./utils/logger');

class Web3WebhookServer {
    constructor() {
        this.app = express();
        this.bot = new TelegramBot(config.telegram.botToken, { webHook: { port: config.telegram.port } });
        this.keyboardManager = new KeyboardManager();
        this.faqHandler = new FAQHandler();
        this.web3Handler = new Web3Handler();
        this.analyticsHandler = new AnalyticsHandler();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupBotHandlers();

        logger.info('Web3 Webhook Server initialized');
    }

    setupMiddleware() {
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
        });

        this.app.use(limiter);
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Logging middleware
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                service: 'web3-telegram-bot',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Bot webhook endpoint
        this.app.post('/bot', (req, res) => {
            this.bot.handleUpdate(req.body);
            res.sendStatus(200);
        });

        // Stats endpoint (admin only)
        this.app.get('/stats', async (req, res) => {
            try {
                const adminKey = req.headers['x-admin-key'];
                if (!adminKey || !config.telegram.adminUserIds.includes(parseInt(adminKey))) {
                    return res.status(403).json({ error: 'Access denied' });
                }

                const stats = await this.analyticsHandler.getAnalyticsStats();
                res.json(stats);
            } catch (error) {
                logger.error('Error getting stats via API:', error.message);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Error handling middleware
        this.app.use((err, req, res, next) => {
            logger.error('Express error:', err.message);
            res.status(500).json({ error: 'Internal server error' });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    setupBotHandlers() {
        // Handle /start command
        this.bot.onText(/\/start/, this.handleStart.bind(this));

        // Handle /help command
        this.bot.onText(/\/help/, this.handleHelp.bind(this));

        // Handle FAQ commands
        this.bot.onText(/\/addfaq(.+)/, this.handleAddFAQ.bind(this));
        this.bot.onText(/\/listfaqs/, this.handleListFAQs.bind(this));
        this.bot.onText(/\/searchfaq(.+)/, this.handleSearchFAQ.bind(this));

        // Handle Web3 commands
        this.bot.onText(/\/price (.+)/, this.handlePrice.bind(this));
        this.bot.onText(/\/trending/, this.handleTrending.bind(this));
        this.bot.onText(/\/gas/, this.handleGas.bind(this));
        this.bot.onText(/\/checkbalance (.+)/, this.handleCheckBalance.bind(this));
        this.bot.onText(/\/nfts (.+)/, this.handleNFTs.bind(this));
        this.bot.onText(/\/uniswap/, this.handleUniswap.bind(this));
        this.bot.onText(/\/aave/, this.handleAave.bind(this));
        this.bot.onText(/\/layerzero/, this.handleLayerZero.bind(this));
        this.bot.onText(/\/ethena/, this.handleEthena.bind(this));
        this.bot.onText(/\/sushi/, this.handleSushi.bind(this));

        // Handle analytics command
        this.bot.onText(/\/stats/, this.handleStats.bind(this));

        // Handle callback queries
        this.bot.on('callback_query', this.handleCallbackQuery.bind(this));

        // Handle text messages
        this.bot.on('message', this.handleMessage.bind(this));

        // Handle errors
        this.bot.on('error', this.handleError.bind(this));
    }

    async handleStart(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            const welcomeMessage = `Welcome to the Web3 Security Assistant, ${user.first_name}! 

Trusted by leading protocols like Uniswap, Aave, and LayerZero, I'm here to answer your Web3 questions, provide real-time crypto data, or escalate urgent requests.

How can I assist you today?`;

            await this.bot.sendMessage(chatId, welcomeMessage, this.keyboardManager.getMainKeyboard());

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'start_command',
                '/start',
                'welcome_message',
                welcomeMessage
            );

            logger.info(`User ${user.id} started the bot via webhook`);
        } catch (error) {
            logger.error('Error handling start command:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handleHelp(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            const helpMessage = `Welcome to the Web3 Assistant, powered by Pashov Audit Group (trusted by Uniswap, Aave, LayerZero).

**Available Commands:**
• /price <symbol> - Get real-time crypto prices (e.g., ETH, BTC)
• /trending - Top trending tokens
• /gas - Ethereum gas prices
• /checkbalance <address> - Check wallet balances
• /nfts <address> - View NFT holdings
• /uniswap, /aave, /layerzero, /ethena, /sushi - Project information
• /stats - View analytics (admin-only)

**Quick Actions:**
Use the keyboard below for quick access to common features.

Select an option below or contact @pashovkrum for audit inquiries.`;

            await this.bot.sendMessage(chatId, helpMessage, this.keyboardManager.getHelpKeyboard());

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'help_command',
                '/help',
                'help_message',
                helpMessage
            );
        } catch (error) {
            logger.error('Error handling help command:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handleMessage(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;
            const text = msg.text;

            if (!text) return;

            // Check if it's a keyboard button
            const keyboardResponse = this.keyboardManager.getKeyboardResponseMessage(text);
            if (keyboardResponse) {
                await this.handleKeyboardButton(msg, text, keyboardResponse);
                return;
            }

            // Check if it's a Web3 submenu button
            const web3Response = this.keyboardManager.getWeb3SubmenuResponse(text);
            if (web3Response) {
                await this.handleWeb3Submenu(msg, text, web3Response);
                return;
            }

            // Try to find FAQ match
            const faqResult = await this.faqHandler.processUserQuestion(text, user.id);

            if (faqResult.success) {
                await this.bot.sendMessage(chatId, faqResult.answer);

                await this.analyticsHandler.logFAQQuery(
                    user.id,
                    text,
                    faqResult.answer,
                    faqResult.confidence,
                    faqResult.matchType,
                    faqResult.projectReference
                );
            } else {
                await this.bot.sendMessage(chatId, faqResult.answer);
            }

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'text_message',
                text,
                'faq_response',
                faqResult.answer,
                faqResult.confidence,
                faqResult.projectReference
            );

        } catch (error) {
            logger.error('Error handling message:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handleKeyboardButton(msg, buttonText, response) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            if (['Urgent Request', 'Media Inquiry', 'Audit Request'].includes(buttonText)) {
                await this.forwardMessage(msg, buttonText.toLowerCase().replace(' ', '_'));
            }

            await this.bot.sendMessage(chatId, response);

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'keyboard_button',
                buttonText,
                'button_response',
                response
            );

        } catch (error) {
            logger.error('Error handling keyboard button:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handleWeb3Submenu(msg, buttonText, response) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            if (buttonText === 'Back to Main') {
                await this.bot.sendMessage(chatId, response, this.keyboardManager.getMainKeyboard());
            } else {
                await this.bot.sendMessage(chatId, response, this.keyboardManager.getWeb3Keyboard());
            }

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'web3_submenu',
                buttonText,
                'submenu_response',
                response
            );

        } catch (error) {
            logger.error('Error handling Web3 submenu:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handleCallbackQuery(callbackQuery) {
        try {
            const data = callbackQuery.data;
            const chatId = callbackQuery.message.chat.id;
            const user = callbackQuery.from;

            switch (data) {
                case 'project_uniswap':
                case 'project_aave':
                case 'project_layerzero':
                case 'project_ethena':
                case 'project_sushi':
                    const project = data.replace('project_', '');
                    const projectInfo = this.web3Handler.getProjectInfo(project);
                    await this.bot.sendMessage(chatId, projectInfo.formatted);
                    break;

                case 'help_commands':
                    await this.handleHelp({ chat: { id: chatId }, from: user });
                    break;

                case 'help_faq':
                    const faqList = await this.faqHandler.listFAQs();
                    await this.bot.sendMessage(chatId, faqList.formatted);
                    break;

                case 'help_web3':
                    const web3Help = `Web3 Data Commands:\n\n• /price <symbol> - Get crypto prices\n• /trending - Trending tokens\n• /gas - Gas prices\n• /checkbalance <address> - Wallet balance\n• /nfts <address> - NFT holdings`;
                    await this.bot.sendMessage(chatId, web3Help);
                    break;

                case 'help_contact':
                    const contactInfo = `Contact Pashov Audit Group:\n\n• Telegram: @pashovkrum\n• Website: https://www.pashov.net\n• GitHub: https://github.com/pashov/audits`;
                    await this.bot.sendMessage(chatId, contactInfo);
                    break;

                default:
                    await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown action' });
            }

            await this.bot.answerCallbackQuery(callbackQuery.id);

        } catch (error) {
            logger.error('Error handling callback query:', error.message);
            await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Error processing request' });
        }
    }

    async handleAddFAQ(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            if (!config.telegram.adminUserIds.includes(user.id)) {
                await this.bot.sendMessage(chatId, 'Access denied. Admin privileges required.');
                return;
            }

            const args = msg.text.replace('/addfaq', '').trim();
            const result = await this.faqHandler.handleFAQCommand('addfaq', [args]);

            if (result.success) {
                await this.bot.sendMessage(chatId, result.message);

                await this.analyticsHandler.logAdminAction(
                    user.id,
                    'add_faq',
                    { question: result.faq.question, answer: result.faq.answer }
                );
            } else {
                await this.bot.sendMessage(chatId, result.message);
            }

        } catch (error) {
            logger.error('Error handling add FAQ:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handleListFAQs(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            const result = await this.faqHandler.handleFAQCommand('listfaqs', []);
            await this.bot.sendMessage(chatId, result.formatted);

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'list_faqs',
                '/listfaqs',
                'faq_list',
                result.formatted
            );

        } catch (error) {
            logger.error('Error handling list FAQs:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handleSearchFAQ(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            const searchTerm = msg.text.replace('/searchfaq', '').trim();
            const result = await this.faqHandler.handleFAQCommand('search', [searchTerm]);

            await this.bot.sendMessage(chatId, result.message);

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'search_faq',
                searchTerm,
                'search_result',
                result.message
            );

        } catch (error) {
            logger.error('Error handling search FAQ:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async handlePrice(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;
            const symbol = msg.text.replace('/price', '').trim();

            const startTime = Date.now();
            const result = await this.web3Handler.handleWeb3Command('price', [symbol]);
            const responseTime = Date.now() - startTime;

            await this.bot.sendMessage(chatId, result.formatted);

            await this.analyticsHandler.logWeb3Query(
                user.id,
                'price',
                { symbol },
                result,
                false,
                responseTime
            );

        } catch (error) {
            logger.error('Error handling price command:', error.message);
            await this.bot.sendMessage(msg.chat.id, `Error: ${error.message}`);
        }
    }

    async handleTrending(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            const startTime = Date.now();
            const result = await this.web3Handler.handleWeb3Command('trending', []);
            const responseTime = Date.now() - startTime;

            await this.bot.sendMessage(chatId, `${result.formatted}\n\n${result.reference}`);

            await this.analyticsHandler.logWeb3Query(
                user.id,
                'trending',
                {},
                result,
                false,
                responseTime
            );

        } catch (error) {
            logger.error('Error handling trending command:', error.message);
            await this.bot.sendMessage(msg.chat.id, `Error: ${error.message}`);
        }
    }

    async handleGas(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            const startTime = Date.now();
            const result = await this.web3Handler.handleWeb3Command('gas', []);
            const responseTime = Date.now() - startTime;

            await this.bot.sendMessage(chatId, result.formatted);

            await this.analyticsHandler.logWeb3Query(
                user.id,
                'gas',
                {},
                result,
                false,
                responseTime
            );

        } catch (error) {
            logger.error('Error handling gas command:', error.message);
            await this.bot.sendMessage(msg.chat.id, `Error: ${error.message}`);
        }
    }

    async handleCheckBalance(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;
            const address = msg.text.replace('/checkbalance', '').trim();

            const startTime = Date.now();
            const result = await this.web3Handler.handleWeb3Command('checkbalance', [address]);
            const responseTime = Date.now() - startTime;

            await this.bot.sendMessage(chatId, result.formatted);

            await this.analyticsHandler.logWeb3Query(
                user.id,
                'checkbalance',
                { address },
                result,
                false,
                responseTime
            );

        } catch (error) {
            logger.error('Error handling check balance command:', error.message);
            await this.bot.sendMessage(msg.chat.id, `Error: ${error.message}`);
        }
    }

    async handleNFTs(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;
            const address = msg.text.replace('/nfts', '').trim();

            const startTime = Date.now();
            const result = await this.web3Handler.handleWeb3Command('nfts', [address]);
            const responseTime = Date.now() - startTime;

            await this.bot.sendMessage(chatId, result.formatted);

            await this.analyticsHandler.logWeb3Query(
                user.id,
                'nfts',
                { address },
                result,
                false,
                responseTime
            );

        } catch (error) {
            logger.error('Error handling NFTs command:', error.message);
            await this.bot.sendMessage(msg.chat.id, `Error: ${error.message}`);
        }
    }

    async handleUniswap(msg) {
        await this.handleProjectInfo(msg, 'uniswap');
    }

    async handleAave(msg) {
        await this.handleProjectInfo(msg, 'aave');
    }

    async handleLayerZero(msg) {
        await this.handleProjectInfo(msg, 'layerzero');
    }

    async handleEthena(msg) {
        await this.handleProjectInfo(msg, 'ethena');
    }

    async handleSushi(msg) {
        await this.handleProjectInfo(msg, 'sushi');
    }

    async handleProjectInfo(msg, project) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            const projectInfo = this.web3Handler.getProjectInfo(project);
            await this.bot.sendMessage(chatId, projectInfo.formatted);

            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'project_info',
                `/${project}`,
                'project_response',
                projectInfo.formatted
            );

        } catch (error) {
            logger.error(`Error handling ${project} command:`, error.message);
            await this.bot.sendMessage(msg.chat.id, `Error: ${error.message}`);
        }
    }

    async handleStats(msg) {
        try {
            const chatId = msg.chat.id;
            const user = msg.from;

            if (!config.telegram.adminUserIds.includes(user.id)) {
                await this.bot.sendMessage(chatId, 'Access denied. Admin privileges required.');
                return;
            }

            const stats = await this.analyticsHandler.getAnalyticsStats();
            const formattedStats = await this.analyticsHandler.formatStatsForDisplay(stats);

            await this.bot.sendMessage(chatId, formattedStats);

            await this.analyticsHandler.logAdminAction(
                user.id,
                'view_stats',
                { stats }
            );

        } catch (error) {
            logger.error('Error handling stats command:', error.message);
            await this.sendErrorMessage(msg.chat.id);
        }
    }

    async forwardMessage(msg, reason) {
        try {
            if (!config.telegram.actionGroupChatId) {
                logger.warn('Action group chat ID not configured, skipping message forwarding');
                return;
            }

            const user = msg.from;
            const forwardMessage = `🚨 ${reason.replace('_', ' ').toUpperCase()} REQUEST

From: ${user.first_name} ${user.last_name || ''} (@${user.username || 'no_username'})
User ID: ${user.id}
Time: ${new Date().toLocaleString()}

Message: ${msg.text}

Forwarded to Pashov Audit Group (@pashovkrum), trusted by Sushi and Ethena.`;

            await this.bot.sendMessage(config.telegram.actionGroupChatId, forwardMessage);

            await this.analyticsHandler.logMessageForwarding(
                user.id,
                msg.text,
                config.telegram.actionGroupChatId,
                reason
            );

            logger.info(`Message forwarded for user ${user.id}, reason: ${reason}`);

        } catch (error) {
            logger.error('Error forwarding message:', error.message);
        }
    }

    async handleError(error) {
        logger.error('Bot error:', error.message);
    }

    async sendErrorMessage(chatId) {
        try {
            await this.bot.sendMessage(
                chatId,
                'I encountered an error processing your request. Please try again or contact support.',
                this.keyboardManager.getMainKeyboard()
            );
        } catch (error) {
            logger.error('Error sending error message:', error.message);
        }
    }

    async setupWebhook() {
        try {
            if (!config.telegram.webhookUrl) {
                throw new Error('WEBHOOK_URL not configured');
            }

            const webhookUrl = `${config.telegram.webhookUrl}/bot`;
            await this.bot.setWebHook(webhookUrl);

            logger.info(`Webhook set to: ${webhookUrl}`);
        } catch (error) {
            logger.error('Error setting webhook:', error.message);
            throw error;
        }
    }

    start() {
        const port = config.telegram.port;

        this.app.listen(port, () => {
            logger.info(`Web3 Webhook Server running on port ${port}`);
        });

        // Setup webhook after server starts
        setTimeout(async () => {
            try {
                await this.setupWebhook();
            } catch (error) {
                logger.error('Failed to setup webhook:', error.message);
            }
        }, 2000);
    }

    stop() {
        logger.info('Stopping Web3 Webhook Server...');
        this.analyticsHandler.close();
        process.exit(0);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const server = new Web3WebhookServer();
    server.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        server.stop();
    });

    process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        server.stop();
    });
}

module.exports = Web3WebhookServer;