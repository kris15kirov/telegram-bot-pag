// Keyboard layouts for the bot

const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [
                { text: '🚨 Urgent' },
                { text: '📺 Media request' }
            ],
            [
                { text: '📊 Audit request' },
                { text: '❓ FAQ' }
            ],
            [
                { text: '🌐 Web3' },
                { text: '📞 Contact' }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        persistent: true
    }
};

const faqKeyboard = {
    reply_markup: {
        keyboard: [
            [
                { text: '⏰ Working Hours' },
                { text: '📋 Services' }
            ],
            [
                { text: '💰 Pricing' },
                { text: '🛠 Support' }
            ],
            [
                { text: '📞 Contact Info' },
                { text: '🔙 Back to Main' }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const urgentKeyboard = {
    reply_markup: {
        keyboard: [
            [
                { text: '🔥 Critical Issue' },
                { text: '⚡ High Priority' }
            ],
            [
                { text: '📞 Request Callback' },
                { text: '🔙 Back to Main' }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const mediaKeyboard = {
    reply_markup: {
        keyboard: [
            [
                { text: '📰 Press Release' },
                { text: '🎤 Interview Request' }
            ],
            [
                { text: '📸 Photo Request' },
                { text: '📺 Video Request' }
            ],
            [
                { text: '🔙 Back to Main' }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const auditKeyboard = {
    reply_markup: {
        keyboard: [
            [
                { text: '🏢 Financial Audit' },
                { text: '🔒 Security Audit' }
            ],
            [
                { text: '📊 Compliance Audit' },
                { text: '🔍 Internal Audit' }
            ],
            [
                { text: '🔙 Back to Main' }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

// Inline keyboards for quick actions
const inlineQuickActions = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '🚨 Mark as Urgent', callback_data: 'urgent_mark' },
                { text: '📋 Create Ticket', callback_data: 'create_ticket' }
            ],
            [
                { text: '📤 Forward to Team', callback_data: 'forward_team' }
            ]
        ]
    }
};

// Web3 keyboard for crypto features
const web3Keyboard = {
    reply_markup: {
        keyboard: [
            [
                { text: '📈 Live Prices' },
                { text: '🔥 Trending' }
            ],
            [
                { text: '🌍 Market Data' },
                { text: '💰 Portfolio' }
            ],
            [
                { text: '🔙 Back to Main' }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

module.exports = {
    mainKeyboard,
    faqKeyboard,
    urgentKeyboard,
    mediaKeyboard,
    auditKeyboard,
    inlineQuickActions,
    web3Keyboard
};