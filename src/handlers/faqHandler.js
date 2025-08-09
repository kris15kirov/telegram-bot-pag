const fs = require('fs');
const path = require('path');

class FAQHandler {
  constructor() {
    this.faqs = [];
    this.fallbackResponses = [];
    this.loadFAQs();
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

  // Reload FAQs (useful for updates without restart)
  reloadFAQs() {
    this.loadFAQs();
  }

  // Find FAQ response using keyword matching
  findFAQResponse(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return null;
    }

    const normalizedInput = userInput.toLowerCase().trim();
    
    // Direct question match
    const directMatch = this.faqs.find(faq => 
      faq.question.toLowerCase() === normalizedInput
    );
    
    if (directMatch) {
      return {
        ...directMatch,
        matchType: 'direct'
      };
    }

    // Keyword matching with scoring
    const matches = this.faqs.map(faq => {
      let score = 0;
      const keywords = faq.keywords || [];
      
      for (const keyword of keywords) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          // Exact keyword match gets higher score
          if (normalizedInput === keyword.toLowerCase()) {
            score += 10;
          } else {
            score += 5;
          }
        }
      }

      // Check if any words from the question appear in user input
      const questionWords = faq.question.toLowerCase().split(' ');
      for (const word of questionWords) {
        if (word.length > 3 && normalizedInput.includes(word)) {
          score += 2;
        }
      }

      return { ...faq, score, matchType: 'keyword' };
    }).filter(faq => faq.score > 0)
      .sort((a, b) => b.score - a.score);

    // Return best match if score is high enough
    if (matches.length > 0 && matches[0].score >= 5) {
      return matches[0];
    }

    return null;
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