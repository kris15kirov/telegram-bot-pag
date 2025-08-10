const natural = require('natural');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

class FAQHandler {
  constructor() {
    this.faqs = [];
    this.fallbackResponses = [];
    this.projectReferences = {};
    this.confidenceThreshold = 0.9; // 90% confidence threshold
    this.jaroWinkler = natural.JaroWinklerDistance;
    this.loadFAQs();
  }

  async loadFAQs() {
    try {
      const faqPath = path.join(__dirname, '../data/faq.json');
      const faqData = await fs.readFile(faqPath, 'utf8');
      const parsed = JSON.parse(faqData);

      this.faqs = parsed.faqs || [];
      this.fallbackResponses = parsed.fallback_responses || [];
      this.projectReferences = parsed.project_references || {};

      logger.info(`FAQ data loaded: ${this.faqs.length} FAQs available`);
    } catch (error) {
      logger.error('Error loading FAQ data:', error.message);
      throw new Error('Failed to load FAQ data');
    }
  }

  async findBestMatch(userQuestion) {
    try {
      if (!userQuestion || userQuestion.trim().length === 0) {
        return this.getRandomFallback();
      }

      const normalizedQuestion = this.normalizeText(userQuestion);
      let bestMatch = null;
      let bestScore = 0;

      // Check direct keyword matches first
      for (const faq of this.faqs) {
        const keywordScore = this.calculateKeywordScore(normalizedQuestion, faq.keywords);
        if (keywordScore > bestScore) {
          bestScore = keywordScore;
          bestMatch = faq;
        }
      }

      // If keyword match is strong enough, return it
      if (bestScore >= this.confidenceThreshold) {
        return {
          faq: bestMatch,
          confidence: bestScore,
          matchType: 'keyword'
        };
      }

      // Use Jaro-Winkler distance for fuzzy matching
      for (const faq of this.faqs) {
        const normalizedFaqQuestion = this.normalizeText(faq.question);
        const jaroScore = this.jaroWinkler(normalizedQuestion, normalizedFaqQuestion);

        // Also check against keywords
        const keywordScore = this.calculateKeywordScore(normalizedQuestion, faq.keywords);

        // Combine scores (weighted average)
        const combinedScore = (jaroScore * 0.7) + (keywordScore * 0.3);

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMatch = faq;
        }
      }

      if (bestScore >= this.confidenceThreshold) {
        return {
          faq: bestMatch,
          confidence: bestScore,
          matchType: 'fuzzy'
        };
      }

      // Check for partial matches
      const partialMatch = this.findPartialMatch(normalizedQuestion);
      if (partialMatch && partialMatch.score >= 0.7) {
        return {
          faq: partialMatch.faq,
          confidence: partialMatch.score,
          matchType: 'partial'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error finding FAQ match:', error.message);
      return null;
    }
  }

  calculateKeywordScore(userText, keywords) {
    if (!keywords || keywords.length === 0) return 0;

    const normalizedUserText = userText.toLowerCase();
    let matchCount = 0;
    let totalKeywords = keywords.length;

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (normalizedUserText.includes(normalizedKeyword)) {
        matchCount++;
      }
    }

    return matchCount / totalKeywords;
  }

  findPartialMatch(userText) {
    let bestPartial = null;
    let bestScore = 0;

    for (const faq of this.faqs) {
      const normalizedFaqQuestion = this.normalizeText(faq.question);
      const words = userText.split(' ').filter(word => word.length > 2);

      let matchCount = 0;
      for (const word of words) {
        if (normalizedFaqQuestion.includes(word)) {
          matchCount++;
        }
      }

      const score = matchCount / words.length;
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestPartial = faq;
      }
    }

    return bestPartial ? { faq: bestPartial, score: bestScore } : null;
  }

  normalizeText(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getRandomFallback() {
    const randomIndex = Math.floor(Math.random() * this.fallbackResponses.length);
    return {
      faq: null,
      confidence: 0,
      matchType: 'fallback',
      response: this.fallbackResponses[randomIndex]
    };
  }

  async addFAQ(question, answer, keywords = []) {
    try {
      const newFAQ = {
        id: `faq_${Date.now()}`,
        keywords: keywords.length > 0 ? keywords : this.extractKeywords(question),
        question: question.trim(),
        answer: answer.trim()
      };

      this.faqs.push(newFAQ);
      await this.saveFAQs();

      logger.info(`New FAQ added: ${question.substring(0, 50)}...`);
      return newFAQ;
    } catch (error) {
      logger.error('Error adding FAQ:', error.message);
      throw new Error('Failed to add FAQ');
    }
  }

  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 2 && !this.isStopWord(word));

    return [...new Set(words)].slice(0, 5);
  }

  isStopWord(word) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'that', 'this', 'these', 'those'];
    return stopWords.includes(word);
  }

  async saveFAQs() {
    try {
      const faqPath = path.join(__dirname, '../data/faq.json');
      const faqData = {
        faqs: this.faqs,
        fallback_responses: this.fallbackResponses,
        project_references: this.projectReferences
      };

      await fs.writeFile(faqPath, JSON.stringify(faqData, null, 2));
      logger.info('FAQ data saved successfully');
    } catch (error) {
      logger.error('Error saving FAQ data:', error.message);
      throw new Error('Failed to save FAQ data');
    }
  }

  async listFAQs() {
    try {
      const faqList = this.faqs.map((faq, index) => {
        const projectRef = this.getProjectReference(faq);
        return `${index + 1}. ${faq.question}${projectRef ? ` (${projectRef})` : ''}`;
      });

      return {
        count: this.faqs.length,
        faqs: faqList,
        formatted: `Available FAQs (${this.faqs.length}):\n\n${faqList.join('\n')}\n\nUse /addfaq <question> | <answer> to add new FAQs.`
      };
    } catch (error) {
      logger.error('Error listing FAQs:', error.message);
      throw new Error('Failed to list FAQs');
    }
  }

  getProjectReference(faq) {
    // Check if FAQ answer contains references to audited projects
    const answer = faq.answer.toLowerCase();
    const projects = [];

    for (const [category, projectList] of Object.entries(this.projectReferences)) {
      for (const project of projectList) {
        if (answer.includes(project.toLowerCase())) {
          projects.push(project);
        }
      }
    }

    return projects.length > 0 ? projects.join(', ') : null;
  }

  async handleFAQCommand(command, args) {
    try {
      switch (command) {
        case 'addfaq':
          if (args.length < 2) {
            throw new Error('Usage: /addfaq <question> | <answer>');
          }

          const input = args.join(' ');
          const parts = input.split('|');

          if (parts.length < 2) {
            throw new Error('Please separate question and answer with |');
          }

          const question = parts[0].trim();
          const answer = parts[1].trim();

          if (!question || !answer) {
            throw new Error('Question and answer cannot be empty');
          }

          const newFAQ = await this.addFAQ(question, answer);
          return {
            success: true,
            message: `FAQ added successfully:\n\nQ: ${newFAQ.question}\nA: ${newFAQ.answer}`,
            faq: newFAQ
          };

        case 'listfaqs':
          return await this.listFAQs();

        case 'search':
          if (!args[0]) {
            throw new Error('Please provide a search term');
          }

          const searchTerm = args.join(' ');
          const match = await this.findBestMatch(searchTerm);

          if (match && match.faq) {
            const projectRef = this.getProjectReference(match.faq);
            return {
              success: true,
              message: `Found FAQ (${(match.confidence * 100).toFixed(1)}% match):\n\nQ: ${match.faq.question}\nA: ${match.faq.answer}${projectRef ? `\n\nReferenced projects: ${projectRef}` : ''}`,
              confidence: match.confidence,
              matchType: match.matchType
            };
          } else {
            return {
              success: false,
              message: 'No matching FAQ found. Try rephrasing your question or use /listfaqs to see available FAQs.'
            };
          }

        default:
          throw new Error('Unknown FAQ command. Use /help for available commands.');
      }
    } catch (error) {
      logger.error(`FAQ command error: ${command}`, error.message);
      throw error;
    }
  }

  async processUserQuestion(userQuestion, userId) {
    try {
      const match = await this.findBestMatch(userQuestion);

      if (match && match.faq) {
        const projectRef = this.getProjectReference(match.faq);
        const response = `${match.faq.answer}${projectRef ? `\n\nReferenced projects: ${projectRef}` : ''}`;

        logger.info(`FAQ match found for user ${userId}`, {
          question: userQuestion,
          confidence: match.confidence,
          matchType: match.matchType,
          projectReference: projectRef
        });

        return {
          success: true,
          answer: response,
          confidence: match.confidence,
          matchType: match.matchType,
          projectReference: projectRef
        };
      } else {
        const fallback = this.getRandomFallback();

        logger.info(`No FAQ match for user ${userId}`, {
          question: userQuestion,
          fallbackUsed: true
        });

        return {
          success: false,
          answer: fallback.response,
          confidence: 0,
          matchType: 'fallback'
        };
      }
    } catch (error) {
      logger.error(`Error processing user question: ${userQuestion}`, error.message);
      return {
        success: false,
        answer: 'I encountered an error processing your question. Please try again or contact support.',
        confidence: 0,
        matchType: 'error'
      };
    }
  }
}

module.exports = FAQHandler;