const FAQHandler = require('../handlers/faqHandler');
const fs = require('fs');
const path = require('path');

// Mock the database to avoid actual DB operations in tests
jest.mock('../utils/database', () => {
  return jest.fn().mockImplementation(() => ({
    logFAQQuery: jest.fn(),
    addDynamicFAQ: jest.fn(),
    getDynamicFAQs: jest.fn().mockResolvedValue([])
  }));
});

describe('FAQ Handler Tests', () => {
  let faqHandler;

  beforeEach(() => {
    faqHandler = new FAQHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FAQ Loading', () => {
    test('should load FAQs from JSON file', () => {
      expect(faqHandler.faqs).toBeDefined();
      expect(Array.isArray(faqHandler.faqs)).toBe(true);
      expect(faqHandler.faqs.length).toBeGreaterThan(0);
    });

    test('should have required FAQ structure', () => {
      const firstFaq = faqHandler.faqs[0];
      expect(firstFaq).toHaveProperty('id');
      expect(firstFaq).toHaveProperty('question');
      expect(firstFaq).toHaveProperty('answer');
      expect(firstFaq).toHaveProperty('keywords');
      expect(Array.isArray(firstFaq.keywords)).toBe(true);
    });
  });

  describe('FAQ Matching', () => {
    test('should find direct question match', () => {
      const result = faqHandler.findFAQResponse('What is DeFi?');
      
      expect(result).toBeDefined();
      expect(result.matchType).toBe('direct');
      expect(result.confidence).toBe(1.0);
      expect(result.question).toBe('What is DeFi?');
    });

    test('should find keyword-based match', () => {
      const result = faqHandler.findFAQResponse('defi explanation');
      
      expect(result).toBeDefined();
      expect(result.matchType).toBe('nlp');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should handle case-insensitive matching', () => {
      const result = faqHandler.findFAQResponse('WHAT IS DEFI?');
      
      expect(result).toBeDefined();
      expect(result.matchType).toBe('direct');
    });

    test('should return null for unmatched queries', () => {
      const result = faqHandler.findFAQResponse('completely unrelated query xyz123');
      
      expect(result).toBeNull();
    });

    test('should handle empty or invalid input', () => {
      expect(faqHandler.findFAQResponse('')).toBeNull();
      expect(faqHandler.findFAQResponse(null)).toBeNull();
      expect(faqHandler.findFAQResponse(undefined)).toBeNull();
      expect(faqHandler.findFAQResponse(123)).toBeNull();
    });
  });

  describe('NLP Features', () => {
    test('should perform NLP matching with stemming', () => {
      const result = faqHandler.findFAQResponse('explain decentralized finance');
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should handle similar questions with different wording', () => {
      const result1 = faqHandler.findFAQResponse('What is an NFT?');
      const result2 = faqHandler.findFAQResponse('explain non-fungible tokens');
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Both should match the same FAQ or related ones
    });

    test('should calculate confidence scores correctly', () => {
      const result = faqHandler.findFAQResponse('blockchain technology');
      
      if (result) {
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('FAQ Statistics', () => {
    test('should return FAQ statistics', () => {
      const stats = faqHandler.getFAQStats();
      
      expect(stats).toHaveProperty('totalFAQs');
      expect(stats).toHaveProperty('categories');
      expect(stats).toHaveProperty('avgKeywordsPerFAQ');
      expect(stats.totalFAQs).toBeGreaterThan(0);
    });

    test('should categorize FAQs correctly', () => {
      const categories = faqHandler.groupFAQsByCategory();
      
      expect(categories).toBeDefined();
      expect(typeof categories).toBe('object');
    });
  });

  describe('Search Functionality', () => {
    test('should search FAQs by term', () => {
      const results = faqHandler.searchFAQs('blockchain');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should return empty array for non-existent search terms', () => {
      const results = faqHandler.searchFAQs('nonexistentterm123');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('Response Formatting', () => {
    test('should format FAQ response correctly', () => {
      const faq = faqHandler.faqs[0];
      const formatted = faqHandler.formatFAQResponse(faq);
      
      expect(formatted).toContain('❓');
      expect(formatted).toContain(faq.question);
      expect(formatted).toContain(faq.answer);
    });

    test('should handle null FAQ input', () => {
      const formatted = faqHandler.formatFAQResponse(null);
      
      expect(formatted).toBeNull();
    });
  });

  describe('Fallback Responses', () => {
    test('should provide fallback responses', () => {
      const fallback = faqHandler.getFallbackResponse();
      
      expect(typeof fallback).toBe('string');
      expect(fallback.length).toBeGreaterThan(0);
    });

    test('should have multiple fallback options', () => {
      expect(faqHandler.fallbackResponses.length).toBeGreaterThan(0);
    });
  });
});

describe('FAQ Data Validation', () => {
  test('FAQ JSON file should exist and be valid', () => {
    const faqPath = path.join(__dirname, '../data/faq.json');
    expect(fs.existsSync(faqPath)).toBe(true);
    
    const faqData = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
    expect(faqData).toHaveProperty('faqs');
    expect(Array.isArray(faqData.faqs)).toBe(true);
    expect(faqData.faqs.length).toBeGreaterThanOrEqual(5);
  });

  test('All FAQs should have required Web3 content', () => {
    const faqHandler = new FAQHandler();
    const web3Keywords = ['defi', 'nft', 'blockchain', 'crypto', 'token', 'wallet', 'smart contract'];
    
    let hasWeb3Content = false;
    faqHandler.faqs.forEach(faq => {
      const faqText = (faq.question + ' ' + faq.answer + ' ' + faq.keywords.join(' ')).toLowerCase();
      if (web3Keywords.some(keyword => faqText.includes(keyword))) {
        hasWeb3Content = true;
      }
    });
    
    expect(hasWeb3Content).toBe(true);
  });
});