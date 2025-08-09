# 🎯 Demo Scenarios for Telegram Business Assistant Bot

## 🚀 Quick Test Scenarios

Once your bot is set up and running, try these scenarios to test its functionality:

### 1. Basic Interaction
```
User: /start
Bot: Shows welcome message with main keyboard menu
```

### 2. FAQ Testing
```
User: "working hours"
Bot: "Our working hours are Monday - Friday: 9:00 AM - 6:00 PM..."

User: "contact"
Bot: Shows complete contact information

User: "help"
Bot: "How can I help you today? Select a category..."
```

### 3. Urgent Request Handling
```
User: "Urgent problem with server!"
Bot: Automatically detects urgency, forwards to action group
Bot: "🚨 Your message has been marked as urgent..."

User: Clicks "🚨 Urgent" button
Bot: Shows urgent submenu with escalation options
```

### 4. Media Request Flow
```
User: "I need to schedule an interview"
Bot: Detects media request, forwards to action group
Bot: "📺 Your message appears to be a media request..."

User: Clicks "📺 Media request"
Bot: Shows media-specific options (Press Release, Interview, etc.)
```

### 5. Audit Request Flow
```
User: "We need a security audit"
Bot: Detects audit request, forwards to action group

User: Clicks "📊 Audit request"
Bot: Shows audit types (Financial, Security, Compliance, Internal)
```

### 6. Smart Message Analysis
```
User: "Emergency! Our website is down and we have a press conference tomorrow!"
Bot: Detects multiple keywords (emergency + media)
Bot: Auto-forwards with high confidence score
Bot: Provides appropriate response and menu options
```

### 7. Admin Commands (if configured)
```
Admin: /status
Bot: Shows bot statistics, active users, uptime information
```

## 📋 Test Checklist

### Basic Functionality ✅
- [ ] Bot responds to /start command
- [ ] Main menu keyboard appears
- [ ] All menu buttons work correctly
- [ ] FAQ responses work in Bulgarian and English
- [ ] Help command shows proper information

### Smart Features ✅
- [ ] Urgent keywords trigger auto-forwarding
- [ ] Media-related messages are properly categorized
- [ ] Audit requests are detected and forwarded
- [ ] Contact information is extracted from messages
- [ ] Priority levels are assigned correctly

### Integration ✅
- [ ] Messages forward to action group (if configured)
- [ ] Forward messages include proper metadata
- [ ] Inline keyboards work in forwarded messages
- [ ] Admin commands work for authorized users
- [ ] Bot handles errors gracefully

### User Experience ✅
- [ ] Response times are reasonable (~1 second)
- [ ] Messages are properly formatted
- [ ] Keyboards are user-friendly
- [ ] English language support works properly
- [ ] Navigation is intuitive

## 🔧 Troubleshooting Test Cases

### Error Handling
```
# Test with invalid/unknown input
User: "random gibberish xyz123"
Expected: Bot provides helpful guidance and shows menu

# Test with long messages
User: [Send a very long message 500+ characters]
Expected: Bot processes and categorizes appropriately

# Test with special characters
User: "Problem with ñáñá symbols!!!"
Expected: Bot handles encoding correctly
```

### Edge Cases
```
# Test rapid message sending
User: [Send 5 messages quickly]
Expected: Bot handles all messages without crashing

# Test menu navigation
User: Navigate through all menu levels
Expected: All "Back" buttons work correctly

# Test mixed content
User: "Help with urgent problem!!!"
Expected: Bot detects urgency and responds appropriately
```

## 📊 Performance Metrics

Track these metrics during testing:

- **Response Time**: Average time for bot to respond
- **Accuracy**: % of messages correctly categorized
- **Forward Rate**: % of important messages forwarded
- **User Engagement**: Menu interaction vs direct messaging
- **Error Rate**: Failed operations or crashes

## 🎯 Success Criteria

The bot should:
1. ✅ Respond to all user inputs within 2 seconds
2. ✅ Correctly identify urgent messages 90%+ of the time
3. ✅ Successfully forward high-priority messages
4. ✅ Provide relevant FAQ responses
5. ✅ Handle multiple concurrent users
6. ✅ Maintain uptime without crashes
7. ✅ Provide intuitive user experience

## 📱 Real-world Usage Examples

### Customer Service Scenario
```
Customer: "Hi, I'm having trouble with my account login"
Bot: Provides login help FAQ + offers urgent escalation if needed

Customer: "It's really urgent, I have a meeting in 10 minutes!"
Bot: Detects urgency, auto-forwards to support team
```

### Media Inquiry Scenario
```
Journalist: "I'd like to request an interview with your CEO about the new product launch"
Bot: Detects media request, forwards to PR team with full context
Bot: Provides immediate acknowledgment and next steps
```

### Business Partner Scenario
```
Partner: "We need a compliance audit for our Q4 partnership review"
Bot: Categorizes as audit request, forwards to compliance team
Bot: Shows audit-specific options and timeline expectations
```

---

**💡 Pro Tip**: Monitor the forwarded messages in your action group to see how well the bot categorizes and prioritizes different types of requests!