// FAQ Database - Frequently Asked Questions and Responses
const faq = {
    // General inquiries
    'working hours': 'Our working hours are Monday - Friday: 9:00 AM - 6:00 PM. For urgent matters, you can reach us through this system.',
    'business hours': 'Our working hours are Monday - Friday: 9:00 AM - 6:00 PM. For urgent matters, you can reach us through this system.',
    'hours': 'Our working hours are Monday - Friday: 9:00 AM - 6:00 PM. For urgent matters, you can reach us through this system.',

    // Contact information
    'contact': 'You can reach us through:\n📞 Phone: +1 (555) 123-4567\n📧 Email: info@company.com\n🌐 Website: www.company.com',
    'contact info': 'You can reach us through:\n📞 Phone: +1 (555) 123-4567\n📧 Email: info@company.com\n🌐 Website: www.company.com',
    'phone': 'Our contact phone: +1 (555) 123-4567',
    'email': 'Our email: info@company.com',

    // Services
    'services': 'We offer the following services:\n• Business consulting\n• Technical support\n• Marketing services\n• Audit services\n\nFor more information, select the appropriate category from the menu.',
    'what do you do': 'We offer the following services:\n• Business consulting\n• Technical support\n• Marketing services\n• Audit services\n\nFor more information, select the appropriate category from the menu.',
    'offerings': 'We offer the following services:\n• Business consulting\n• Technical support\n• Marketing services\n• Audit services\n\nFor more information, select the appropriate category from the menu.',

    // Pricing
    'pricing': 'For pricing information about our services, please contact us directly or select "Urgent" for quick consultation.',
    'price': 'For pricing information about our services, please contact us directly or select "Urgent" for quick consultation.',
    'cost': 'For pricing information about our services, please contact us directly or select "Urgent" for quick consultation.',
    'rates': 'For pricing information about our services, please contact us directly or select "Urgent" for quick consultation.',

    // Support
    'help': 'How can I help you today? Select a category from the menu or describe your question.',
    'support': 'For technical support, select the appropriate category or describe your issue.',
    'assistance': 'How can I help you today? Select a category from the menu or describe your question.',
    'question': 'How can I help you today? Select a category from the menu or describe your question.',

    // Media requests
    'interview': 'For media inquiries and interviews, please select "Media request" to be forwarded to our PR department.',
    'media': 'For media inquiries, select "Media request" from the menu.',
    'press': 'For media inquiries and press requests, please select "Media request" to be forwarded to our PR department.',
    'journalist': 'For media inquiries and interviews, please select "Media request" to be forwarded to our PR department.',

    // Audit requests
    'audit': 'For audit services, select "Audit request" from the menu for quick connection with a specialist.',
    'compliance': 'For audit and compliance services, select "Audit request" from the menu for quick connection with a specialist.',
    'review': 'For audit and review services, select "Audit request" from the menu for quick connection with a specialist.',

    // Emergency
    'emergency': 'For emergency cases, select "Urgent" from the menu for immediate processing of your request.',
    'urgent': 'For urgent matters, select "Urgent" from the menu for immediate processing.',
    'critical': 'For critical issues, select "Urgent" from the menu for immediate processing of your request.',
    'asap': 'For urgent matters, select "Urgent" from the menu for immediate processing.',

    // Default responses
    'thank you': 'You\'re welcome! If you have more questions, I\'m here to help. 😊',
    'thanks': 'You\'re welcome! If you have more questions, I\'m here to help. 😊',
    'thx': 'You\'re welcome! If you have more questions, I\'m here to help. 😊',
    'appreciate': 'You\'re welcome! If you have more questions, I\'m here to help. 😊',
};

// Function to find FAQ response
function findFAQResponse(message) {
    const normalizedMessage = message.toLowerCase().trim();

    // Direct match
    if (faq[normalizedMessage]) {
        return faq[normalizedMessage];
    }

    // Partial match - check if message contains any FAQ keywords
    for (const [keyword, response] of Object.entries(faq)) {
        if (normalizedMessage.includes(keyword)) {
            return response;
        }
    }

    return null;
}

module.exports = {
    faq,
    findFAQResponse
};