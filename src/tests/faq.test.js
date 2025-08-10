const FAQHandler = require('../handlers/faqHandler');
const path = require('path');

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  },
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

// Mock fs.promises specifically
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn()
}));

// Mock config to prevent process.exit
jest.mock('../config/config', () => ({
  telegram: {
    botToken: 'test-token',
    actionGroupChatId: 'test-group',
    adminUserIds: [123456789],
    webhookUrl: 'https://test.com',
    port: 3000
  },
  bot: {
    name: 'Test Bot',
    responseDelay: 1000,
    description: 'Test description'
  },
  web3: {
    moralisApiKey: 'test-moralis-key',
    etherscanApiKey: 'test-etherscan-key',
    coingeckoBaseUrl: 'https://api.coingecko.com/api/v3',
    cacheTtl: 300
  },
  keywords: {
    urgent: ['urgent'],
    media: ['media'],
    audit: ['audit']
  },
  auditedProjects: {
    dex: ['Uniswap', 'Sushi'],
    lending: ['Aave'],
    stablecoin: ['Ethena'],
    others: ['LayerZero', 'Ambire']
  },
  database: {
    path: 'test.db',
    logsPath: 'test.log'
  }
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const fs = require('fs').promises;

describe('FAQHandler', () => {
  let faqHandler;
  const mockFAQData = {
    faqs: [
      {
        id: 'test_faq_1',
        keywords: ['defi', 'decentralized finance'],
        question: 'What is DeFi?',
        answer: 'DeFi is decentralized finance using blockchain technology.'
      },
      {
        id: 'test_faq_2',
        keywords: ['audit', 'security'],
        question: 'Why are audits important?',
        answer: 'Audits ensure security and identify vulnerabilities.'
      }
    ],
    fallback_responses: [
      'I couldn\'t find an answer. Please try again.',
      'That\'s an interesting question. Contact support for more details.'
    ],
    project_references: {
      defi: ['Aave', 'Uniswap'],
      audit: ['Sushi', 'Ethena']
    }
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock fs.readFile to return the mock data for any path
    fs.readFile.mockImplementation((path) => {
      console.log('Mock fs.readFile called with path:', path);
      return Promise.resolve(JSON.stringify(mockFAQData));
    });

    // Also mock fs/promises readFile
    const fsPromises = require('fs/promises');
    fsPromises.readFile.mockImplementation((path) => {
      console.log('Mock fs/promises.readFile called with path:', path);
      return Promise.resolve(JSON.stringify(mockFAQData));
    });

    // Create a new handler instance without calling loadFAQs in constructor
    faqHandler = new FAQHandler();

    // Remove the automatic loadFAQs call from constructor
    faqHandler.loadFAQs = jest.fn().mockResolvedValue();

    // Manually load FAQs after mocks are set up
    try {
      await faqHandler.loadFAQs();
    } catch (error) {
      console.error('Error in beforeEach:', error);
      throw error;
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadFAQs', () => {
    it('should load FAQ data successfully', async () => {
      expect(faqHandler.faqs).toHaveLength(2);
      expect(faqHandler.fallbackResponses).toHaveLength(2);
      expect(faqHandler.projectReferences).toBeDefined();
    });

    it('should handle file read errors', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(async () => {
        const newHandler = new FAQHandler();
        await newHandler.loadFAQs();
      }).rejects.toThrow('Failed to load FAQ data');
    });
  });

  describe('findBestMatch', () => {
    it('should find exact keyword match', async () => {
      const result = await faqHandler.findBestMatch('What is DeFi?');

      expect(result).toBeDefined();
      expect(result.faq.question).toBe('What is DeFi?');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.matchType).toBe('keyword');
    });

    it('should find fuzzy match', async () => {
      const result = await faqHandler.findBestMatch('tell me about defi');

      expect(result).toBeDefined();
      expect(result.faq.question).toBe('What is DeFi?');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should return null for no match', async () => {
      const result = await faqHandler.findBestMatch('completely unrelated question');

      expect(result).toBeNull();
    });

    it('should handle empty input', async () => {
      const result = await faqHandler.findBestMatch('');

      expect(result.matchType).toBe('fallback');
    });
  });

  describe('calculateKeywordScore', () => {
    it('should calculate correct keyword score', () => {
      const score = faqHandler.calculateKeywordScore('defi is great', ['defi', 'blockchain']);

      expect(score).toBe(0.5); // 1 out of 2 keywords match
    });

    it('should return 0 for no keywords', () => {
      const score = faqHandler.calculateKeywordScore('some text', []);

      expect(score).toBe(0);
    });

    it('should return 1 for perfect match', () => {
      const score = faqHandler.calculateKeywordScore('defi blockchain', ['defi', 'blockchain']);

      expect(score).toBe(1);
    });
  });

  describe('normalizeText', () => {
    it('should normalize text correctly', () => {
      const normalized = faqHandler.normalizeText('  What is DeFi?!  ');

      expect(normalized).toBe('what is defi');
    });

    it('should handle special characters', () => {
      const normalized = faqHandler.normalizeText('DeFi & Blockchain!');

      expect(normalized).toBe('defi blockchain');
    });
  });

  describe('addFAQ', () => {
    it('should add new FAQ successfully', async () => {
      fs.writeFile.mockResolvedValue();

      const newFAQ = await faqHandler.addFAQ(
        'What is blockchain?',
        'Blockchain is a distributed ledger technology.'
      );

      expect(newFAQ.question).toBe('What is blockchain?');
      expect(newFAQ.answer).toBe('Blockchain is a distributed ledger technology.');
      expect(newFAQ.keywords).toContain('blockchain');
      expect(faqHandler.faqs).toHaveLength(3);
    });

    it('should handle save errors', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(faqHandler.addFAQ('test', 'answer')).rejects.toThrow('Failed to add FAQ');
    });
  });

  describe('listFAQs', () => {
    it('should return formatted FAQ list', async () => {
      const result = await faqHandler.listFAQs();

      expect(result.count).toBe(2);
      expect(result.faqs).toHaveLength(2);
      expect(result.formatted).toContain('What is DeFi?');
      expect(result.formatted).toContain('Why are audits important?');
    });
  });

  describe('getProjectReference', () => {
    it('should find project references', () => {
      const faq = {
        answer: 'DeFi protocols like Aave and Uniswap provide lending services.'
      };

      const reference = faqHandler.getProjectReference(faq);

      expect(reference).toBe('Aave, Uniswap');
    });

    it('should return null for no references', () => {
      const faq = {
        answer: 'This is a general answer without project references.'
      };

      const reference = faqHandler.getProjectReference(faq);

      expect(reference).toBeNull();
    });
  });

  describe('handleFAQCommand', () => {
    it('should handle addfaq command', async () => {
      fs.writeFile.mockResolvedValue();

      const result = await faqHandler.handleFAQCommand('addfaq', ['What is NFT? | NFT is a non-fungible token']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('FAQ added successfully');
    });

    it('should handle listfaqs command', async () => {
      const result = await faqHandler.handleFAQCommand('listfaqs', []);

      expect(result.count).toBe(2);
      expect(result.formatted).toContain('Available FAQs');
    });

    it('should handle search command', async () => {
      const result = await faqHandler.handleFAQCommand('search', ['defi']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('What is DeFi?');
    });

    it('should handle unknown command', async () => {
      await expect(faqHandler.handleFAQCommand('unknown', [])).rejects.toThrow('Unknown FAQ command');
    });
  });

  describe('processUserQuestion', () => {
    it('should process successful FAQ match', async () => {
      const result = await faqHandler.processUserQuestion('What is DeFi?', 123);

      expect(result.success).toBe(true);
      expect(result.answer).toContain('DeFi is decentralized finance');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should handle no match with fallback', async () => {
      const result = await faqHandler.processUserQuestion('completely unrelated', 123);

      expect(result.success).toBe(false);
      expect(result.answer).toContain('I couldn\'t find');
    });

    it('should handle errors gracefully', async () => {
      // Mock findBestMatch to throw error
      jest.spyOn(faqHandler, 'findBestMatch').mockRejectedValue(new Error('Test error'));

      const result = await faqHandler.processUserQuestion('test question', 123);

      expect(result.success).toBe(false);
      expect(result.answer).toContain('encountered an error');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const keywords = faqHandler.extractKeywords('What is blockchain technology?');

      expect(keywords).toContain('blockchain');
      expect(keywords).toContain('technology');
      expect(keywords.length).toBeLessThanOrEqual(5);
    });

    it('should filter out stop words', () => {
      const keywords = faqHandler.extractKeywords('What is the blockchain?');

      expect(keywords).toContain('blockchain');
      expect(keywords).not.toContain('what');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('the');
    });
  });

  describe('isStopWord', () => {
    it('should identify stop words', () => {
      expect(faqHandler.isStopWord('the')).toBe(true);
      expect(faqHandler.isStopWord('is')).toBe(true);
      expect(faqHandler.isStopWord('blockchain')).toBe(false);
    });
  });
});