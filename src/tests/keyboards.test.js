const keyboards = require('../utils/keyboards');

describe('Keyboard Configuration Tests', () => {
  
  describe('Main Keyboard', () => {
    test('should have correct structure', () => {
      expect(keyboards.mainKeyboard).toBeDefined();
      expect(keyboards.mainKeyboard.reply_markup).toBeDefined();
      expect(keyboards.mainKeyboard.reply_markup.keyboard).toBeDefined();
      expect(Array.isArray(keyboards.mainKeyboard.reply_markup.keyboard)).toBe(true);
    });

    test('should contain required buttons', () => {
      const keyboard = keyboards.mainKeyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const requiredButtons = ['🚨 Urgent', '📺 Media request', '📊 Audit request', '❓ FAQ', '🌐 Web3', '📞 Contact'];
      
      requiredButtons.forEach(buttonText => {
        expect(allButtons).toContain(buttonText);
      });
    });

    test('should have proper keyboard settings', () => {
      const settings = keyboards.mainKeyboard.reply_markup;
      
      expect(settings.resize_keyboard).toBe(true);
      expect(settings.one_time_keyboard).toBe(false);
      expect(settings.persistent).toBe(true);
    });
  });

  describe('FAQ Keyboard', () => {
    test('should have correct structure', () => {
      expect(keyboards.faqKeyboard).toBeDefined();
      expect(keyboards.faqKeyboard.reply_markup).toBeDefined();
      expect(keyboards.faqKeyboard.reply_markup.keyboard).toBeDefined();
    });

    test('should contain FAQ-specific buttons', () => {
      const keyboard = keyboards.faqKeyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const expectedButtons = ['⏰ Working Hours', '📋 Services', '💰 Pricing', '🛠 Support', '📞 Contact Info', '🔙 Back to Main'];
      
      expectedButtons.forEach(buttonText => {
        expect(allButtons).toContain(buttonText);
      });
    });
  });

  describe('Web3 Keyboard', () => {
    test('should have correct structure', () => {
      expect(keyboards.web3Keyboard).toBeDefined();
      expect(keyboards.web3Keyboard.reply_markup).toBeDefined();
      expect(keyboards.web3Keyboard.reply_markup.keyboard).toBeDefined();
    });

    test('should contain Web3-specific buttons', () => {
      const keyboard = keyboards.web3Keyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const expectedButtons = ['📈 Live Prices', '🔥 Trending', '🌍 Market Data', '💰 Portfolio', '🔙 Back to Main'];
      
      expectedButtons.forEach(buttonText => {
        expect(allButtons).toContain(buttonText);
      });
    });
  });

  describe('Urgent Keyboard', () => {
    test('should have escalation options', () => {
      const keyboard = keyboards.urgentKeyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const expectedButtons = ['🔥 Critical Issue', '⚡ High Priority', '📞 Request Callback', '🔙 Back to Main'];
      
      expectedButtons.forEach(buttonText => {
        expect(allButtons).toContain(buttonText);
      });
    });
  });

  describe('Media Keyboard', () => {
    test('should have media-specific options', () => {
      const keyboard = keyboards.mediaKeyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const expectedButtons = ['📰 Press Release', '🎤 Interview Request', '📸 Photo Request', '📺 Video Request', '🔙 Back to Main'];
      
      expectedButtons.forEach(buttonText => {
        expect(allButtons).toContain(buttonText);
      });
    });
  });

  describe('Audit Keyboard', () => {
    test('should have audit-specific options', () => {
      const keyboard = keyboards.auditKeyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const expectedButtons = ['🏢 Financial Audit', '🔒 Security Audit', '📊 Compliance Audit', '🔍 Internal Audit', '🔙 Back to Main'];
      
      expectedButtons.forEach(buttonText => {
        expect(allButtons).toContain(buttonText);
      });
    });
  });

  describe('Inline Quick Actions', () => {
    test('should have correct inline keyboard structure', () => {
      expect(keyboards.inlineQuickActions).toBeDefined();
      expect(keyboards.inlineQuickActions.reply_markup).toBeDefined();
      expect(keyboards.inlineQuickActions.reply_markup.inline_keyboard).toBeDefined();
      expect(Array.isArray(keyboards.inlineQuickActions.reply_markup.inline_keyboard)).toBe(true);
    });

    test('should contain callback data for buttons', () => {
      const inlineKeyboard = keyboards.inlineQuickActions.reply_markup.inline_keyboard;
      const allButtons = inlineKeyboard.flat();
      
      allButtons.forEach(button => {
        expect(button).toHaveProperty('text');
        expect(button).toHaveProperty('callback_data');
        expect(typeof button.text).toBe('string');
        expect(typeof button.callback_data).toBe('string');
      });
    });
  });

  describe('Keyboard Validation', () => {
    test('all keyboards should have valid structure', () => {
      const keyboardNames = ['mainKeyboard', 'faqKeyboard', 'urgentKeyboard', 'mediaKeyboard', 'auditKeyboard', 'web3Keyboard'];
      
      keyboardNames.forEach(keyboardName => {
        const keyboard = keyboards[keyboardName];
        expect(keyboard).toBeDefined();
        expect(keyboard.reply_markup).toBeDefined();
        expect(keyboard.reply_markup.keyboard).toBeDefined();
        expect(Array.isArray(keyboard.reply_markup.keyboard)).toBe(true);
        expect(keyboard.reply_markup.keyboard.length).toBeGreaterThan(0);
      });
    });

    test('all regular keyboards should have resize_keyboard enabled', () => {
      const keyboardNames = ['mainKeyboard', 'faqKeyboard', 'urgentKeyboard', 'mediaKeyboard', 'auditKeyboard', 'web3Keyboard'];
      
      keyboardNames.forEach(keyboardName => {
        const keyboard = keyboards[keyboardName];
        expect(keyboard.reply_markup.resize_keyboard).toBe(true);
      });
    });

    test('all keyboards should have at least one back navigation option', () => {
      const keyboardNames = ['faqKeyboard', 'urgentKeyboard', 'mediaKeyboard', 'auditKeyboard', 'web3Keyboard'];
      
      keyboardNames.forEach(keyboardName => {
        const keyboard = keyboards[keyboardName];
        const allButtons = keyboard.reply_markup.keyboard.flat().map(button => button.text);
        
        const hasBackButton = allButtons.some(text => 
          text.includes('🔙') || text.includes('Back') || text.includes('Main')
        );
        
        expect(hasBackButton).toBe(true);
      });
    });

    test('button text should be in English', () => {
      const allKeyboards = Object.values(keyboards);
      
      allKeyboards.forEach(keyboard => {
        if (keyboard.reply_markup && keyboard.reply_markup.keyboard) {
          const allButtons = keyboard.reply_markup.keyboard.flat().map(button => button.text);
          
          allButtons.forEach(buttonText => {
            // Check that button text contains English words or common emoji
            expect(typeof buttonText).toBe('string');
            expect(buttonText.length).toBeGreaterThan(0);
            
            // Should not contain Cyrillic characters (Bulgarian)
            expect(buttonText).not.toMatch(/[а-яё]/i);
          });
        }
      });
    });

    test('button layout should be reasonable (max 3 buttons per row)', () => {
      const keyboardNames = ['mainKeyboard', 'faqKeyboard', 'urgentKeyboard', 'mediaKeyboard', 'auditKeyboard', 'web3Keyboard'];
      
      keyboardNames.forEach(keyboardName => {
        const keyboard = keyboards[keyboardName];
        const rows = keyboard.reply_markup.keyboard;
        
        rows.forEach((row, index) => {
          expect(row.length).toBeLessThanOrEqual(3);
          expect(row.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Button Content Validation', () => {
    test('urgent buttons should indicate priority levels', () => {
      const keyboard = keyboards.urgentKeyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const priorityIndicators = ['Critical', 'High Priority', 'Callback'];
      const hasPriorityButtons = priorityIndicators.some(indicator => 
        allButtons.some(button => button.includes(indicator))
      );
      
      expect(hasPriorityButtons).toBe(true);
    });

    test('web3 buttons should indicate crypto functionality', () => {
      const keyboard = keyboards.web3Keyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      const web3Indicators = ['Prices', 'Trending', 'Market', 'Portfolio'];
      const hasWeb3Buttons = web3Indicators.some(indicator => 
        allButtons.some(button => button.includes(indicator))
      );
      
      expect(hasWeb3Buttons).toBe(true);
    });

    test('emojis should be appropriate for button context', () => {
      const keyboard = keyboards.mainKeyboard.reply_markup.keyboard;
      const allButtons = keyboard.flat().map(button => button.text);
      
      // Check that buttons have relevant emojis
      const urgentButton = allButtons.find(button => button.includes('Urgent'));
      const mediaButton = allButtons.find(button => button.includes('Media'));
      const web3Button = allButtons.find(button => button.includes('Web3'));
      
      expect(urgentButton).toContain('🚨');
      expect(mediaButton).toContain('📺');
      expect(web3Button).toContain('🌐');
    });
  });
});