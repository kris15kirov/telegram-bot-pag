const config = require('../config/config');

class MessageAnalyzer {
  constructor() {
    this.urgentKeywords = config.keywords.urgent;
    this.mediaKeywords = config.keywords.media;
    this.auditKeywords = config.keywords.audit;
  }

  // Analyze message priority and category
  analyzeMessage(text) {
    const normalizedText = text.toLowerCase();

    const analysis = {
      isUrgent: false,
      isMedia: false,
      isAudit: false,
      priority: 'normal',
      suggestedAction: null,
      confidence: 0
    };

    // Check for urgent keywords
    const urgentMatches = this.urgentKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );

    if (urgentMatches.length > 0) {
      analysis.isUrgent = true;
      analysis.priority = 'high';
      analysis.suggestedAction = 'forward_urgent';
      analysis.confidence += urgentMatches.length * 0.3;
    }

    // Check for media keywords
    const mediaMatches = this.mediaKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );

    if (mediaMatches.length > 0) {
      analysis.isMedia = true;
      analysis.suggestedAction = 'forward_media';
      analysis.confidence += mediaMatches.length * 0.25;
    }

    // Check for audit keywords
    const auditMatches = this.auditKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );

    if (auditMatches.length > 0) {
      analysis.isAudit = true;
      analysis.suggestedAction = 'forward_audit';
      analysis.confidence += auditMatches.length * 0.25;
    }

    // Additional urgency indicators
    const urgencyIndicators = [
      'help', 'problem', 'error', 'issue', 'trouble', 'broken',
      'down', 'not working', 'failed', 'crash', 'bug', 'outage'
    ];

    const urgencyMatches = urgencyIndicators.filter(indicator =>
      normalizedText.includes(indicator)
    );

    if (urgencyMatches.length > 0) {
      analysis.confidence += urgencyMatches.length * 0.1;
      if (analysis.priority === 'normal') {
        analysis.priority = 'medium';
      }
    }

    // Determine if message should be auto-forwarded
    analysis.shouldAutoForward = analysis.confidence > 0.5 || analysis.isUrgent;

    return analysis;
  }

  // Check if message contains contact information
  containsContactInfo(text) {
    const contactPatterns = [
      /\+\d{1,3}\s?\d{6,14}/, // Phone numbers
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
      /@[a-zA-Z0-9_]+/, // Social media handles
    ];

    return contactPatterns.some(pattern => pattern.test(text));
  }

  // Extract key information from message
  extractKeyInfo(text) {
    const info = {
      phoneNumbers: [],
      emails: [],
      socialHandles: [],
      urgentWords: [],
      mediaWords: [],
      auditWords: []
    };

    // Extract phone numbers
    const phoneRegex = /\+\d{1,3}\s?\d{6,14}/g;
    info.phoneNumbers = text.match(phoneRegex) || [];

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    info.emails = text.match(emailRegex) || [];

    // Extract social handles
    const socialRegex = /@[a-zA-Z0-9_]+/g;
    info.socialHandles = text.match(socialRegex) || [];

    const normalizedText = text.toLowerCase();

    // Extract matched keywords
    info.urgentWords = this.urgentKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );

    info.mediaWords = this.mediaKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );

    info.auditWords = this.auditKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );

    return info;
  }

  // Generate summary for forwarded messages
  generateMessageSummary(text, userInfo, analysis) {
    const summary = [];

    summary.push(`📨 **New Message Summary**`);
    summary.push(`👤 From: ${userInfo.first_name || 'Unknown'} ${userInfo.last_name || ''}`);
    summary.push(`🆔 User ID: ${userInfo.id}`);
    summary.push(`📱 Username: ${userInfo.username ? '@' + userInfo.username : 'Not set'}`);
    summary.push(`⏰ Time: ${new Date().toLocaleString('en-US')}`);
    summary.push('');

    if (analysis.priority !== 'normal') {
      summary.push(`🚨 **Priority: ${analysis.priority.toUpperCase()}**`);
    }

    if (analysis.isUrgent) {
      summary.push(`🔥 **URGENT MESSAGE**`);
    }

    if (analysis.isMedia) {
      summary.push(`📺 **Media Request**`);
    }

    if (analysis.isAudit) {
      summary.push(`📊 **Audit Request**`);
    }

    summary.push('');
    summary.push(`📝 **Message:**`);
    summary.push(text);

    const keyInfo = this.extractKeyInfo(text);

    if (keyInfo.phoneNumbers.length > 0) {
      summary.push('');
      summary.push(`📞 **Phone Numbers:** ${keyInfo.phoneNumbers.join(', ')}`);
    }

    if (keyInfo.emails.length > 0) {
      summary.push(`📧 **Emails:** ${keyInfo.emails.join(', ')}`);
    }

    return summary.join('\n');
  }
}

module.exports = MessageAnalyzer;