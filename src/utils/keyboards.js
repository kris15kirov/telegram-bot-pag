const TelegramBot = require('node-telegram-bot-api');

class KeyboardManager {
    constructor() {
        this.mainKeyboard = {
            reply_markup: {
                keyboard: [
                    ['Urgent Request', 'Media Inquiry'],
                    ['Audit Request', 'Web3 FAQs'],
                    ['Crypto Data', 'Contact Support']
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        };

        this.web3Keyboard = {
            reply_markup: {
                keyboard: [
                    ['Live Prices', 'Trending Tokens'],
                    ['Market Overview', 'Wallet Query'],
                    ['Back to Main']
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        };

        this.inlineWeb3Keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Uniswap', callback_data: 'project_uniswap' },
                        { text: 'Aave', callback_data: 'project_aave' }
                    ],
                    [
                        { text: 'LayerZero', callback_data: 'project_layerzero' },
                        { text: 'Ethena', callback_data: 'project_ethena' }
                    ],
                    [
                        { text: 'Sushi', callback_data: 'project_sushi' },
                        { text: 'More Projects', callback_data: 'more_projects' }
                    ]
                ]
            }
        };

        this.helpKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Commands', callback_data: 'help_commands' },
                        { text: 'FAQ', callback_data: 'help_faq' }
                    ],
                    [
                        { text: 'Web3 Data', callback_data: 'help_web3' },
                        { text: 'Contact Support', callback_data: 'help_contact' }
                    ]
                ]
            }
        };
    }

    getMainKeyboard() {
        return this.mainKeyboard;
    }

    getWeb3Keyboard() {
        return this.web3Keyboard;
    }

    getInlineWeb3Keyboard() {
        return this.inlineWeb3Keyboard;
    }

    getHelpKeyboard() {
        return this.helpKeyboard;
    }

    getRemoveKeyboard() {
        return {
            reply_markup: {
                remove_keyboard: true
            }
        };
    }

    createCustomKeyboard(buttons, options = {}) {
        const keyboard = {
            reply_markup: {
                keyboard: buttons,
                resize_keyboard: options.resize !== false,
                one_time_keyboard: options.oneTime || false
            }
        };

        if (options.remove) {
            keyboard.reply_markup.remove_keyboard = true;
        }

        return keyboard;
    }

    createInlineKeyboard(buttons, options = {}) {
        return {
            reply_markup: {
                inline_keyboard: buttons
            }
        };
    }

    // Professional response messages for keyboard interactions
    getKeyboardResponseMessage(button) {
        const responses = {
            'Urgent Request': 'Your urgent request has been noted. Pashov Audit Group, trusted by Uniswap, Aave, and LayerZero, will review your query. Please provide additional details or contact @pashovkrum directly.',
            'Media Inquiry': 'Media inquiry received. Our team will review your request and respond promptly. For immediate assistance, contact @pashovkrum.',
            'Audit Request': 'Audit request forwarded to Pashov Audit Group (@pashovkrum), trusted by Sushi and Ethena. Please provide project details for a comprehensive security review.',
            'Web3 FAQs': 'Explore Web3 FAQs:\n\n• What is DeFi? (Aave, Uniswap)\n• Why are smart contract audits important? (Sushi, Ethena)\n• What is cross-chain messaging? (LayerZero)\n• How to secure my crypto wallet? (Ambire)\n\nAsk any specific question or use /help for commands.',
            'Crypto Data': 'Access real-time crypto data:\n\n• /price <symbol> - Get current prices\n• /trending - Top trending tokens\n• /gas - Ethereum gas prices\n• /checkbalance <address> - Wallet balance\n\nSelect an option below:',
            'Contact Support': 'For professional support:\n\n• Telegram: @pashovkrum\n• Website: https://www.pashov.net\n• GitHub: https://github.com/pashov/audits\n\nPashov Audit Group - Securing Web3 protocols since 2023.'
        };

        return responses[button] || 'Option selected. How can I assist you further?';
    }

    getWeb3SubmenuResponse(button) {
        const responses = {
            'Live Prices': 'Get live cryptocurrency prices:\n\nUse /price <symbol> for specific tokens:\n• /price ETH\n• /price BTC\n• /price USDC\n\nTrusted by Ethena and audited by Pashov Audit Group.',
            'Trending Tokens': 'Fetch trending tokens:\n\nUse /trending for top 5 trending tokens on CoinGecko, referenced by Uniswap trading data.',
            'Market Overview': 'Market overview available via:\n\n• /price BTC - Bitcoin dominance\n• /trending - Market trends\n• /gas - Network activity\n\nData sourced from trusted APIs.',
            'Wallet Query': 'Query wallet information:\n\n• /checkbalance <address> - ETH balance\n• /nfts <address> - NFT holdings\n\nWallet security ensured by Ambire, audited by Pashov Audit Group.',
            'Back to Main': 'Returned to main menu. Select an option or ask a question about Web3 security and DeFi protocols.'
        };

        return responses[button] || 'Web3 data option selected. How can I help?';
    }
}

module.exports = KeyboardManager;