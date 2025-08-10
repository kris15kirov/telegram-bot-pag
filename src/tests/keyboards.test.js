const KeyboardManager = require('../utils/keyboards');

describe('KeyboardManager', () => {
  let keyboardManager;

  beforeEach(() => {
    keyboardManager = new KeyboardManager();
  });

  describe('getMainKeyboard', () => {
    it('should return main keyboard configuration', () => {
      const keyboard = keyboardManager.getMainKeyboard();

      expect(keyboard).toHaveProperty('reply_markup');
      expect(keyboard.reply_markup).toHaveProperty('keyboard');
      expect(keyboard.reply_markup.keyboard).toHaveLength(3);
      expect(keyboard.reply_markup.keyboard[0]).toContain('Urgent Request');
      expect(keyboard.reply_markup.keyboard[0]).toContain('Media Inquiry');
      expect(keyboard.reply_markup.keyboard[1]).toContain('Audit Request');
      expect(keyboard.reply_markup.keyboard[1]).toContain('Web3 FAQs');
      expect(keyboard.reply_markup.keyboard[2]).toContain('Crypto Data');
      expect(keyboard.reply_markup.keyboard[2]).toContain('Contact Support');
    });

    it('should have correct keyboard properties', () => {
      const keyboard = keyboardManager.getMainKeyboard();

      expect(keyboard.reply_markup.resize_keyboard).toBe(true);
      expect(keyboard.reply_markup.one_time_keyboard).toBe(false);
    });
  });

  describe('getWeb3Keyboard', () => {
    it('should return Web3 keyboard configuration', () => {
      const keyboard = keyboardManager.getWeb3Keyboard();

      expect(keyboard).toHaveProperty('reply_markup');
      expect(keyboard.reply_markup).toHaveProperty('keyboard');
      expect(keyboard.reply_markup.keyboard).toHaveLength(3);
      expect(keyboard.reply_markup.keyboard[0]).toContain('Live Prices');
      expect(keyboard.reply_markup.keyboard[0]).toContain('Trending Tokens');
      expect(keyboard.reply_markup.keyboard[1]).toContain('Market Overview');
      expect(keyboard.reply_markup.keyboard[1]).toContain('Wallet Query');
      expect(keyboard.reply_markup.keyboard[2]).toContain('Back to Main');
    });

    it('should have correct keyboard properties', () => {
      const keyboard = keyboardManager.getWeb3Keyboard();

      expect(keyboard.reply_markup.resize_keyboard).toBe(true);
      expect(keyboard.reply_markup.one_time_keyboard).toBe(false);
    });
  });

  describe('getInlineWeb3Keyboard', () => {
    it('should return inline Web3 keyboard configuration', () => {
      const keyboard = keyboardManager.getInlineWeb3Keyboard();

      expect(keyboard).toHaveProperty('reply_markup');
      expect(keyboard.reply_markup).toHaveProperty('inline_keyboard');
      expect(keyboard.reply_markup.inline_keyboard).toHaveLength(3);
    });

    it('should contain project buttons', () => {
      const keyboard = keyboardManager.getInlineWeb3Keyboard();
      const buttons = keyboard.reply_markup.inline_keyboard.flat();

      const projectButtons = buttons.filter(button =>
        button.text === 'Uniswap' ||
        button.text === 'Aave' ||
        button.text === 'LayerZero' ||
        button.text === 'Ethena' ||
        button.text === 'Sushi' ||
        button.text === 'More Projects'
      );

      expect(projectButtons).toHaveLength(6);
    });

    it('should have correct callback data', () => {
      const keyboard = keyboardManager.getInlineWeb3Keyboard();
      const buttons = keyboard.reply_markup.inline_keyboard.flat();

      const uniswapButton = buttons.find(button => button.text === 'Uniswap');
      const aaveButton = buttons.find(button => button.text === 'Aave');

      expect(uniswapButton.callback_data).toBe('project_uniswap');
      expect(aaveButton.callback_data).toBe('project_aave');
    });
  });

  describe('getHelpKeyboard', () => {
    it('should return help keyboard configuration', () => {
      const keyboard = keyboardManager.getHelpKeyboard();

      expect(keyboard).toHaveProperty('reply_markup');
      expect(keyboard.reply_markup).toHaveProperty('inline_keyboard');
      expect(keyboard.reply_markup.inline_keyboard).toHaveLength(2);
    });

    it('should contain help options', () => {
      const keyboard = keyboardManager.getHelpKeyboard();
      const buttons = keyboard.reply_markup.inline_keyboard.flat();

      const helpButtons = buttons.filter(button =>
        button.text === 'Commands' ||
        button.text === 'FAQ' ||
        button.text === 'Web3 Data' ||
        button.text === 'Contact Support'
      );

      expect(helpButtons).toHaveLength(4);
    });

    it('should have correct callback data', () => {
      const keyboard = keyboardManager.getHelpKeyboard();
      const buttons = keyboard.reply_markup.inline_keyboard.flat();

      const commandsButton = buttons.find(button => button.text === 'Commands');
      const faqButton = buttons.find(button => button.text === 'FAQ');

      expect(commandsButton.callback_data).toBe('help_commands');
      expect(faqButton.callback_data).toBe('help_faq');
    });
  });

  describe('getRemoveKeyboard', () => {
    it('should return remove keyboard configuration', () => {
      const keyboard = keyboardManager.getRemoveKeyboard();

      expect(keyboard).toHaveProperty('reply_markup');
      expect(keyboard.reply_markup).toHaveProperty('remove_keyboard');
      expect(keyboard.reply_markup.remove_keyboard).toBe(true);
    });
  });

  describe('createCustomKeyboard', () => {
    it('should create custom keyboard with default options', () => {
      const buttons = [['Button 1', 'Button 2'], ['Button 3']];
      const keyboard = keyboardManager.createCustomKeyboard(buttons);

      expect(keyboard.reply_markup.keyboard).toEqual(buttons);
      expect(keyboard.reply_markup.resize_keyboard).toBe(true);
      expect(keyboard.reply_markup.one_time_keyboard).toBe(false);
    });

    it('should create custom keyboard with custom options', () => {
      const buttons = [['Button 1']];
      const options = {
        resize: false,
        oneTime: true
      };
      const keyboard = keyboardManager.createCustomKeyboard(buttons, options);

      expect(keyboard.reply_markup.keyboard).toEqual(buttons);
      expect(keyboard.reply_markup.resize_keyboard).toBe(false);
      expect(keyboard.reply_markup.one_time_keyboard).toBe(true);
    });

    it('should create remove keyboard when remove option is true', () => {
      const buttons = [['Button 1']];
      const options = { remove: true };
      const keyboard = keyboardManager.createCustomKeyboard(buttons, options);

      expect(keyboard.reply_markup.remove_keyboard).toBe(true);
    });
  });

  describe('createInlineKeyboard', () => {
    it('should create inline keyboard', () => {
      const buttons = [
        [{ text: 'Button 1', callback_data: 'data1' }],
        [{ text: 'Button 2', callback_data: 'data2' }]
      ];
      const keyboard = keyboardManager.createInlineKeyboard(buttons);

      expect(keyboard.reply_markup.inline_keyboard).toEqual(buttons);
    });
  });

  describe('getKeyboardResponseMessage', () => {
    it('should return response for Urgent Request', () => {
      const response = keyboardManager.getKeyboardResponseMessage('Urgent Request');

      expect(response).toContain('urgent request has been noted');
      expect(response).toContain('Pashov Audit Group');
      expect(response).toContain('Uniswap');
      expect(response).toContain('Aave');
      expect(response).toContain('LayerZero');
    });

    it('should return response for Media Inquiry', () => {
      const response = keyboardManager.getKeyboardResponseMessage('Media Inquiry');

      expect(response).toContain('Media inquiry received');
      expect(response).toContain('contact @pashovkrum');
    });

    it('should return response for Audit Request', () => {
      const response = keyboardManager.getKeyboardResponseMessage('Audit Request');

      expect(response).toContain('Audit request forwarded');
      expect(response).toContain('Pashov Audit Group');
      expect(response).toContain('Sushi');
      expect(response).toContain('Ethena');
    });

    it('should return response for Web3 FAQs', () => {
      const response = keyboardManager.getKeyboardResponseMessage('Web3 FAQs');

      expect(response).toContain('Explore Web3 FAQs');
      expect(response).toContain('What is DeFi?');
      expect(response).toContain('Aave');
      expect(response).toContain('Uniswap');
      expect(response).toContain('LayerZero');
      expect(response).toContain('Ambire');
    });

    it('should return response for Crypto Data', () => {
      const response = keyboardManager.getKeyboardResponseMessage('Crypto Data');

      expect(response).toContain('Access real-time crypto data');
      expect(response).toContain('/price');
      expect(response).toContain('/trending');
      expect(response).toContain('/gas');
      expect(response).toContain('/checkbalance');
    });

    it('should return response for Contact Support', () => {
      const response = keyboardManager.getKeyboardResponseMessage('Contact Support');

      expect(response).toContain('For professional support');
      expect(response).toContain('@pashovkrum');
      expect(response).toContain('https://www.pashov.net');
      expect(response).toContain('https://github.com/pashov/audits');
      expect(response).toContain('Pashov Audit Group');
    });

    it('should return default response for unknown button', () => {
      const response = keyboardManager.getKeyboardResponseMessage('Unknown Button');

      expect(response).toBe('Option selected. How can I assist you further?');
    });
  });

  describe('getWeb3SubmenuResponse', () => {
    it('should return response for Live Prices', () => {
      const response = keyboardManager.getWeb3SubmenuResponse('Live Prices');

      expect(response).toContain('Get live cryptocurrency prices');
      expect(response).toContain('/price ETH');
      expect(response).toContain('/price BTC');
      expect(response).toContain('/price USDC');
      expect(response).toContain('Trusted by Ethena');
      expect(response).toContain('Pashov Audit Group');
    });

    it('should return response for Trending Tokens', () => {
      const response = keyboardManager.getWeb3SubmenuResponse('Trending Tokens');

      expect(response).toContain('Fetch trending tokens');
      expect(response).toContain('/trending');
      expect(response).toContain('CoinGecko');
      expect(response).toContain('Uniswap');
    });

    it('should return response for Market Overview', () => {
      const response = keyboardManager.getWeb3SubmenuResponse('Market Overview');

      expect(response).toContain('Market overview available');
      expect(response).toContain('/price BTC');
      expect(response).toContain('/trending');
      expect(response).toContain('/gas');
    });

    it('should return response for Wallet Query', () => {
      const response = keyboardManager.getWeb3SubmenuResponse('Wallet Query');

      expect(response).toContain('Query wallet information');
      expect(response).toContain('/checkbalance');
      expect(response).toContain('/nfts');
      expect(response).toContain('Ambire');
      expect(response).toContain('Pashov Audit Group');
    });

    it('should return response for Back to Main', () => {
      const response = keyboardManager.getWeb3SubmenuResponse('Back to Main');

      expect(response).toContain('Returned to main menu');
      expect(response).toContain('Web3 security');
      expect(response).toContain('DeFi protocols');
    });

    it('should return default response for unknown submenu button', () => {
      const response = keyboardManager.getWeb3SubmenuResponse('Unknown Submenu');

      expect(response).toBe('Web3 data option selected. How can I help?');
    });
  });

  describe('Professional tone validation', () => {
    it('should not contain excessive emojis in main keyboard', () => {
      const keyboard = keyboardManager.getMainKeyboard();
      const buttonTexts = keyboard.reply_markup.keyboard.flat();

      // Check that buttons don't start with emojis
      buttonTexts.forEach(button => {
        expect(button).not.toMatch(/^[🚨📺📊❓🌐📞]/);
      });
    });

    it('should not contain excessive emojis in Web3 keyboard', () => {
      const keyboard = keyboardManager.getWeb3Keyboard();
      const buttonTexts = keyboard.reply_markup.keyboard.flat();

      // Check that buttons don't start with emojis
      buttonTexts.forEach(button => {
        expect(button).not.toMatch(/^[📈🔥🌍💰🔙]/);
      });
    });

    it('should use professional language in responses', () => {
      const urgentResponse = keyboardManager.getKeyboardResponseMessage('Urgent Request');
      const mediaResponse = keyboardManager.getKeyboardResponseMessage('Media Inquiry');

      // Check for professional language
      expect(urgentResponse).toContain('noted');
      expect(urgentResponse).toContain('review');
      expect(mediaResponse).toContain('received');
      expect(mediaResponse).toContain('promptly');
    });

    it('should reference audited projects in responses', () => {
      const responses = [
        keyboardManager.getKeyboardResponseMessage('Urgent Request'),
        keyboardManager.getKeyboardResponseMessage('Audit Request'),
        keyboardManager.getKeyboardResponseMessage('Web3 FAQs'),
        keyboardManager.getKeyboardResponseMessage('Contact Support')
      ];

      // Check that responses reference audited projects
      responses.forEach(response => {
        expect(response).toMatch(/(Uniswap|Aave|LayerZero|Ethena|Sushi|Ambire)/);
      });
    });
  });

  describe('Keyboard structure validation', () => {
    it('should have consistent keyboard structure', () => {
      const mainKeyboard = keyboardManager.getMainKeyboard();
      const web3Keyboard = keyboardManager.getWeb3Keyboard();

      // Both should have the same structure
      expect(mainKeyboard.reply_markup).toHaveProperty('keyboard');
      expect(mainKeyboard.reply_markup).toHaveProperty('resize_keyboard');
      expect(mainKeyboard.reply_markup).toHaveProperty('one_time_keyboard');

      expect(web3Keyboard.reply_markup).toHaveProperty('keyboard');
      expect(web3Keyboard.reply_markup).toHaveProperty('resize_keyboard');
      expect(web3Keyboard.reply_markup).toHaveProperty('one_time_keyboard');
    });

    it('should have consistent inline keyboard structure', () => {
      const inlineKeyboard = keyboardManager.getInlineWeb3Keyboard();
      const helpKeyboard = keyboardManager.getHelpKeyboard();

      // Both should have the same structure
      expect(inlineKeyboard.reply_markup).toHaveProperty('inline_keyboard');
      expect(helpKeyboard.reply_markup).toHaveProperty('inline_keyboard');
    });
  });
});