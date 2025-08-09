const fs = require('fs');
const path = require('path');
const natural = require('natural');
const DatabaseManager = require('../utils/database');

class FAQHandler {
  constructor() {
    this.faqs = [];
    this.fallbackResponses = [];
    this.dynamicFAQs = [];
    this.db = new DatabaseManager();
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.loadFAQs();
    this.loadDynamicFAQs();
  }

  // Load FAQs from JSON file
  loadFAQs() {
    try {
      const faqPath = path.join(__dirname, '../data/faq.json');
      const faqData = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
      this.faqs = faqData.faqs || [];
      this.fallbackResponses = faqData.fallback_responses || [];
      console.log(`✅ Loaded ${this.faqs.length} FAQs from database`);
    } catch (error) {
      console.error('❌ Error loading FAQ data:', error.message);
      this.faqs = [];
      this.fallbackResponses = ['Sorry, I encountered an error loading the FAQ database.'];
    }
  }

  // Load dynamic FAQs from database
  async loadDynamicFAQs() {
    try {
      this.dynamicFAQs = await this.db.getDynamicFAQs();
      console.log(`✅ Loaded ${this.dynamicFAQs.length} dynamic FAQs from database`);
    } catch (error) {
      console.error('❌ Error loading dynamic FAQs:', error.message);
      this.dynamicFAQs = [];
    }
  }

  // Reload FAQs (useful for updates without restart)
  async reloadFAQs() {
    this.loadFAQs();
    await this.loadDynamicFAQs();
  }

  // Add new FAQ dynamically
  async addFAQ(question, answer, keywords = [], createdBy = null) {
    try {
      const faqId = await this.db.addDynamicFAQ(question, answer, keywords, createdBy);
      await this.loadDynamicFAQs(); // Reload to include new FAQ
      return faqId;
    } catch (error) {
      throw new Error(`Failed to add FAQ: ${error.message}`);
    }
  }

  // Enhanced FAQ matching with NLP
  findFAQResponse(userInput, userId = null) {
    if (!userInput || typeof userInput !== 'string') {
      return null;
    }

    const normalizedInput = userInput.toLowerCase().trim();
    
    // Combine static and dynamic FAQs
    const allFAQs = [...this.faqs, ...this.dynamicFAQs];
    
    // Direct question match
    const directMatch = allFAQs.find(faq => 
      faq.question.toLowerCase() === normalizedInput
    );
    
    if (directMatch) {
      // Log successful match
      if (userId) {
        this.db.logFAQQuery(userId, userInput, directMatch.id, 'direct', 1.0);
      }
      return {
        ...directMatch,
        matchType: 'direct',
        confidence: 1.0
      };
    }

    // Enhanced NLP matching
    const nlpMatches = this.performNLPMatching(userInput, allFAQs);
    
    if (nlpMatches.length > 0 && nlpMatches[0].confidence >= 0.6) {
      const bestMatch = nlpMatches[0];
      
      // Log successful match
      if (userId) {
        this.db.logFAQQuery(userId, userInput, bestMatch.id, bestMatch.matchType, bestMatch.confidence);
      }
      
      return bestMatch;
    }

    // Log failed match
    if (userId) {
      this.db.logFAQQuery(userId, userInput, null, 'no_match', 0);
    }

    return null;
  }

  // NLP-based matching using Natural library
  performNLPMatching(userInput, faqs) {
    const inputTokens = this.tokenizer.tokenize(userInput.toLowerCase());
    const inputStems = inputTokens.map(token => this.stemmer.stem(token));
    
    const matches = faqs.map(faq => {
      let confidence = 0;
      
      // Keyword matching with stemming
      const keywords = faq.keywords || [];
      for (const keyword of keywords) {
        const keywordTokens = this.tokenizer.tokenize(keyword.toLowerCase());
        const keywordStems = keywordTokens.map(token => this.stemmer.stem(token));
        
        for (const stem of keywordStems) {
          if (inputStems.includes(stem)) {
            confidence += 0.3;
          }
        }
      }
      
      // Question similarity using Jaro-Winkler distance
      const questionSimilarity = natural.JaroWinklerDistance(
        userInput.toLowerCase(), 
        faq.question.toLowerCase()
      );
      confidence += questionSimilarity * 0.5;
      
      // Answer keywords matching
      const answerTokens = this.tokenizer.tokenize(faq.answer.toLowerCase());
      const answerStems = answerTokens.map(token => this.stemmer.stem(token));
      
      const commonStems = inputStems.filter(stem => answerStems.includes(stem));
      confidence += (commonStems.length / Math.max(inputStems.length, 1)) * 0.2;
      
      // Ensure confidence doesn't exceed 1.0
      confidence = Math.min(confidence, 1.0);
      
      return {
        ...faq,
        confidence,
        matchType: 'nlp'
      };
    }).filter(faq => faq.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  // Get all FAQs for display
  getAllFAQs() {
    return this.faqs.map(faq => ({
      id: faq.id,
      question: faq.question
    }));
  }

  // Get FAQ by ID
  getFAQById(id) {
    return this.faqs.find(faq => faq.id === id);
  }

  // Get random fallback response
  getFallbackResponse() {
    if (this.fallbackResponses.length === 0) {
      return "I'm sorry, I couldn't understand your question. Please try selecting an option from the menu.";
    }
    
    const randomIndex = Math.floor(Math.random() * this.fallbackResponses.length);
    return this.fallbackResponses[randomIndex];
  }

  // Get FAQ statistics
  getFAQStats() {
    return {
      totalFAQs: this.faqs.length,
      categories: this.groupFAQsByCategory(),
      avgKeywordsPerFAQ: this.calculateAvgKeywords()
    };
  }

  // Group FAQs by category (inferred from keywords)
  groupFAQsByCategory() {
    const categories = {};
    
    this.faqs.forEach(faq => {
      const category = this.inferCategory(faq.keywords);
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
    });

    return categories;
  }

  // Infer category from keywords
  inferCategory(keywords) {
    if (!keywords || keywords.length === 0) return 'General';
    
    const keyword = keywords[0].toLowerCase();
    
    if (keyword.includes('defi') || keyword.includes('yield') || keyword.includes('staking')) {
      return 'DeFi';
    } else if (keyword.includes('nft') || keyword.includes('token')) {
      return 'NFTs';
    } else if (keyword.includes('blockchain') || keyword.includes('smart contract')) {
      return 'Blockchain';
    } else if (keyword.includes('wallet') || keyword.includes('security')) {
      return 'Security';
    } else if (keyword.includes('gas') || keyword.includes('fee')) {
      return 'Fees';
    }
    
    return 'General';
  }

  // Calculate average keywords per FAQ
  calculateAvgKeywords() {
    const totalKeywords = this.faqs.reduce((sum, faq) => 
      sum + (faq.keywords ? faq.keywords.length : 0), 0
    );
    
    return this.faqs.length > 0 ? (totalKeywords / this.faqs.length).toFixed(1) : 0;
  }

  // Format FAQ response for display
  formatFAQResponse(faq, includeMetadata = false) {
    if (!faq) return null;

    let response = `❓ **${faq.question}**\n\n${faq.answer}`;
    
    if (includeMetadata && faq.matchType) {
      response += `\n\n_Match type: ${faq.matchType}_`;
      if (faq.score) {
        response += ` _(score: ${faq.score})_`;
      }
    }

    return response;
  }

  // Search FAQs (for admin use)
  searchFAQs(searchTerm) {
    if (!searchTerm) return [];

    const term = searchTerm.toLowerCase();
    
    return this.faqs.filter(faq => 
      faq.question.toLowerCase().includes(term) ||
      faq.answer.toLowerCase().includes(term) ||
      (faq.keywords && faq.keywords.some(keyword => 
        keyword.toLowerCase().includes(term)
      ))
    );
  }
}

module.exports = FAQHandler;