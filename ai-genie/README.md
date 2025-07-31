# 🧞‍♂️ AI Genie - Pluggable AI Module

A modular AI assistant for multi-industry platforms with smart search, booking assistance, and business insights.

## 🚀 Quick Start

### Installation
```bash
# In your main app
npm install ./ai-genie

# Or if published to npm
npm install @desibazaar/ai-genie
```

### Basic Setup
```typescript
// In your server/index.ts
import { initializeAIGenie, createAIRoutes } from '@desibazaar/ai-genie';

// Initialize AI module
const aiGenie = initializeAIGenie({
  enabled: true,
  provider: 'mock', // or 'openai' with API key
  features: {
    smartSearch: true,
    bookingAssistant: true,
    businessInsights: true,
    messageAI: false
  }
});

// Add AI routes
app.use('/api/ai', createAIRoutes());
```

## 🎛️ Feature Toggles

### Environment Variables
```bash
AI_ENABLED=true
AI_PROVIDER=mock
AI_SMART_SEARCH=true
AI_BOOKING_ASSISTANT=true
AI_BUSINESS_INSIGHTS=true
```

### Runtime Control
```typescript
// Toggle individual features
aiGenie.toggleFeature('smartSearch', false);

// Completely disable AI
aiGenie.setEnabled(false);

// Check feature status
if (aiGenie.config.isFeatureEnabled('smartSearch')) {
  // Feature is enabled
}
```

## 📦 Modular Architecture

### Server Integration (Optional)
```typescript
import { createAIRoutes } from '@desibazaar/ai-genie/server';
app.use('/api/ai', createAIRoutes());
```

### Client Integration (Optional)
```typescript
import { useAISearch, AISearchBox } from '@desibazaar/ai-genie/client';

function MySearchComponent() {
  return <AISearchBox placeholder="Ask me anything..." />;
}
```

## 🔧 Providers

1. **Mock Provider** (`AI_PROVIDER=mock`)
   - Perfect for development
   - No API keys needed
   - Realistic responses

2. **OpenAI Provider** (`AI_PROVIDER=openai`)
   - Requires `OPENAI_API_KEY`
   - Production-ready
   - Uses GPT-4-mini for cost efficiency

3. **Disabled Provider** (`AI_PROVIDER=disabled`)
   - Completely turns off AI
   - Graceful fallbacks
   - Zero overhead

## 🎯 Features

### Smart Search
- Natural language queries
- Business matching with reasons
- Location-aware suggestions

### Booking Assistant  
- Conversational booking
- Smart rescheduling
- Availability optimization

### Business Insights
- Performance analytics
- Optimization recommendations
- Trend analysis

## 🛡️ Production Considerations

- Graceful degradation when AI is disabled
- Error handling and fallbacks
- Cost-effective model usage (GPT-4-mini)
- Optional features can be toggled independently

## 📊 Publishing

```bash
# Build the module
npm run build

# Publish to npm
npm publish --access public
```

## 🔐 Security

- API keys stored in environment variables
- No sensitive data logged
- Rate limiting recommended for production
- Optional feature isolation