const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const KeyboardManager = require('./utils/keyboards');
const FAQHandler = require('./handlers/faqHandler');
const Web3Handler = require('./handlers/web3Handler');
const AnalyticsHandler = require('./handlers/analyticsHandler');
const logger = require('./utils/logger');

class Web3TelegramBot {
    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
        this.keyboardManager = new KeyboardManager();
        this.faqHandler = new FAQHandler();
        this.web3Handler = new Web3Handler();
        this.analyticsHandler = new AnalyticsHandler();

        this.setupEventHandlers();
        logger.info('Web3 Telegram Bot initialized successfully');
    }

    setupEventHandlers() {
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

            // Log user interaction
            await this.analyticsHandler.logUserInteraction(
                user.id,
                user,
                'start_command',
                '/start',
                'welcome_message',
                welcomeMessage
            );

            logger.info(`User ${user.id} started the bot`);
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

                // Log FAQ query
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

            // Log user interaction
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

            // Check if message should be forwarded
            if (['Urgent Request', 'Media Inquiry', 'Audit Request'].includes(buttonText)) {
                await this.forwardMessage(msg, buttonText.toLowerCase().replace(' ', '_'));
            }

            await this.bot.sendMessage(chatId, response);

            // Log interaction
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

            // Log interaction
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

            // Check if user is admin
            if (!config.telegram.adminUserIds.includes(user.id)) {
                await this.bot.sendMessage(chatId, 'Access denied. Admin privileges required.');
                return;
            }

            const args = msg.text.replace('/addfaq', '').trim();
            const result = await this.faqHandler.handleFAQCommand('addfaq', [args]);

            if (result.success) {
                await this.bot.sendMessage(chatId, result.message);

                // Log admin action
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

            // Log Web3 query
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

            // Check if user is admin
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
            const user = msg.from;

            if (!config.telegram.actionGroupChatId || config.telegram.actionGroupChatId === 'your_action_group_chat_id_here') {
                // If no action group configured, just log the request
                logger.info(`Urgent request from user ${user.id}: ${msg.text} (reason: ${reason})`);

                // Send confirmation to user
                const confirmationMessage = `✅ Your ${reason.replace('_', ' ')} request has been logged. 

Since this is a development environment, your request has been recorded in our logs. For immediate assistance, please contact @pashovkrum directly.

Pashov Audit Group - Trusted by Uniswap, Aave, and LayerZero.`;

                await this.bot.sendMessage(msg.chat.id, confirmationMessage);
                return;
            }

            const forwardMessage = `🚨 ${reason.replace('_', ' ').toUpperCase()} REQUEST

From: ${user.first_name} ${user.last_name || ''} (@${user.username || 'no_username'})
User ID: ${user.id}
Time: ${new Date().toLocaleString()}

Message: ${msg.text}

Forwarded to Pashov Audit Group (@pashovkrum), trusted by Sushi and Ethena.`;

            await this.bot.sendMessage(config.telegram.actionGroupChatId, forwardMessage);

            // Log forwarding
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

    start() {
        logger.info('Starting Web3 Telegram Bot...');
        this.bot.startPolling();
    }

    stop() {
        logger.info('Stopping Web3 Telegram Bot...');
        this.bot.stopPolling();
        this.analyticsHandler.close();
    }
}

// Start the bot if this file is run directly
if (require.main === module) {
    const bot = new Web3TelegramBot();
    bot.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        bot.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        bot.stop();
        process.exit(0);
    });
}

module.exports = Web3TelegramBot;