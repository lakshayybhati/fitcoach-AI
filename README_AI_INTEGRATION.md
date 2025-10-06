# AI Integration Guide for FitCoach App

## Table of Contents
1. [Overview](#overview)
2. [Current AI Implementation](#current-ai-implementation)
3. [Switching to Custom AI APIs](#switching-to-custom-ai-apis)
4. [Environment Setup](#environment-setup)
5. [API Integration Methods](#api-integration-methods)
6. [Error Handling & Fallbacks](#error-handling--fallbacks)
7. [Testing & Validation](#testing--validation)
8. [Production Deployment](#production-deployment)
9. [Scaling & Performance](#scaling--performance)

---

## Overview

This app uses AI to generate personalized fitness plans based on user data. The AI system has two main components:

1. **Base Plan Generation** (`app/generating-base-plan.tsx`) - Creates a 7-day weekly template
2. **Daily Plan Adjustment** (`app/generating-plan.tsx`) - Adapts the base plan based on daily check-ins

### Current AI Provider
- **Endpoint**: `https://toolkit.rork.com/text/llm/`
- **Model**: Google Gemini (via Rork Toolkit proxy)
- **Purpose**: Development/prototyping with free tier

---

## Current AI Implementation

### How It Works

#### 1. Base Plan Generation Flow
```
User completes onboarding → 
User profile collected (goals, equipment, diet, etc.) → 
AI generates 7-day base plan → 
Plan stored in AsyncStorage → 
User previews plan
```

**Location**: `app/generating-base-plan.tsx`

**Input Data**:
- Fitness goal (weight loss, muscle gain, maintenance)
- Available equipment (gym, dumbbells, bodyweight)
- Dietary preferences (vegetarian, eggitarian, non-veg)
- Training days per week
- Session length
- Preferred/avoided exercises
- Injuries/limitations
- Special requests

**Output**: JSON structure with 7 days of workout, nutrition, and recovery plans

#### 2. Daily Plan Adjustment Flow
```
User completes daily check-in → 
Check-in data (energy, sleep, soreness, stress) → 
AI adjusts today's plan from base plan → 
Adjusted plan stored → 
User views personalized daily plan
```

**Location**: `app/generating-plan.tsx`

**Input Data**:
- Today's check-in (energy, sleep, stress, soreness, mood)
- Recent check-in history (15 days)
- Current base plan for today
- User profile

**Output**: Adjusted daily plan with workout, nutrition, recovery, and motivation

---

## Switching to Custom AI APIs

### Supported AI Providers

You can integrate any of these providers:

1. **Google Gemini** (Recommended for production)
2. **OpenAI GPT-4/GPT-3.5**
3. **Anthropic Claude**
4. **DeepSeek**
5. **Custom LLM endpoints**

### Why Switch?

- **Production reliability**: Direct API access without proxy
- **Rate limits**: Higher limits with paid tiers
- **Customization**: Fine-tune models for fitness domain
- **Data privacy**: Direct control over data flow
- **Cost optimization**: Pay only for what you use

---

## Environment Setup

### Step 1: Create Environment Variables

Create or update your `.env` file:

```bash
# Supabase (existing)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Provider Configuration
EXPO_PUBLIC_AI_PROVIDER=gemini  # Options: gemini, openai, claude, deepseek, custom
EXPO_PUBLIC_AI_API_KEY=your-api-key-here
EXPO_PUBLIC_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta  # Optional for custom endpoints
EXPO_PUBLIC_AI_MODEL=gemini-2.0-flash-exp  # Model name

# Fallback Configuration (optional)
EXPO_PUBLIC_ENABLE_FALLBACK=true
EXPO_PUBLIC_FALLBACK_PROVIDER=rork  # Falls back to toolkit.rork.com if primary fails
```

### Step 2: Install Required Dependencies

```bash
# No additional packages needed - uses native fetch API
# All AI providers use REST APIs
```

### Step 3: Secure Your API Keys

**CRITICAL**: Never commit API keys to version control

```bash
# Add to .gitignore (already included)
.env
.env.local
.env.production
```

**For production builds**:
- Use Expo Secrets or EAS Secrets
- Set environment variables in your CI/CD pipeline
- Use environment-specific .env files

---

## API Integration Methods

### Method 1: Google Gemini (Recommended)

#### Setup

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Update `.env`:

```bash
EXPO_PUBLIC_AI_PROVIDER=gemini
EXPO_PUBLIC_AI_API_KEY=AIzaSy...your-key
EXPO_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
```

#### Implementation

Create `utils/ai-client.ts`:

```typescript
import { Platform } from 'react-native';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  completion: string;
}

export async function generateWithGemini(messages: Message[]): Promise<AIResponse> {
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
  const model = process.env.EXPO_PUBLIC_AI_MODEL || 'gemini-2.0-flash-exp';
  
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_AI_API_KEY is not set');
  }

  // Combine system and user messages for Gemini
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  const combinedPrompt = `${systemMessage}\n\n${userMessage}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log('🤖 Calling Gemini API...');
  console.log('Model:', model);
  console.log('Prompt length:', combinedPrompt.length);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: combinedPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini');
    }

    const completion = data.candidates[0].content.parts[0].text;
    console.log('✅ Gemini response received, length:', completion.length);

    return { completion };
  } catch (error) {
    console.error('❌ Gemini API call failed:', error);
    throw error;
  }
}
```

#### Update Plan Generation Files

In `app/generating-plan.tsx` and `app/generating-base-plan.tsx`, replace:

```typescript
// OLD CODE
const response = await fetch('https://toolkit.rork.com/text/llm/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
});

// NEW CODE
import { generateWithGemini } from '@/utils/ai-client';

const data = await generateWithGemini(requestBody.messages);
```

---

### Method 2: OpenAI GPT-4

#### Setup

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update `.env`:

```bash
EXPO_PUBLIC_AI_PROVIDER=openai
EXPO_PUBLIC_AI_API_KEY=sk-...your-key
EXPO_PUBLIC_AI_MODEL=gpt-4-turbo-preview
```

#### Implementation

Add to `utils/ai-client.ts`:

```typescript
export async function generateWithOpenAI(messages: Message[]): Promise<AIResponse> {
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
  const model = process.env.EXPO_PUBLIC_AI_MODEL || 'gpt-4-turbo-preview';
  
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_AI_API_KEY is not set');
  }

  const url = 'https://api.openai.com/v1/chat/completions';

  console.log('🤖 Calling OpenAI API...');
  console.log('Model:', model);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response structure from OpenAI');
    }

    const completion = data.choices[0].message.content;
    console.log('✅ OpenAI response received, length:', completion.length);

    return { completion };
  } catch (error) {
    console.error('❌ OpenAI API call failed:', error);
    throw error;
  }
}
```

---

### Method 3: DeepSeek

#### Setup

1. Get API key from [DeepSeek Platform](https://platform.deepseek.com/)
2. Update `.env`:

```bash
EXPO_PUBLIC_AI_PROVIDER=deepseek
EXPO_PUBLIC_AI_API_KEY=sk-...your-key
EXPO_PUBLIC_AI_MODEL=deepseek-chat
```

#### Implementation

Add to `utils/ai-client.ts`:

```typescript
export async function generateWithDeepSeek(messages: Message[]): Promise<AIResponse> {
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
  const model = process.env.EXPO_PUBLIC_AI_MODEL || 'deepseek-chat';
  
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_AI_API_KEY is not set');
  }

  const url = 'https://api.deepseek.com/v1/chat/completions';

  console.log('🤖 Calling DeepSeek API...');
  console.log('Model:', model);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API Error:', response.status, errorText);
      throw new Error(`DeepSeek API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response structure from DeepSeek');
    }

    const completion = data.choices[0].message.content;
    console.log('✅ DeepSeek response received, length:', completion.length);

    return { completion };
  } catch (error) {
    console.error('❌ DeepSeek API call failed:', error);
    throw error;
  }
}
```

---

### Universal AI Client with Provider Selection

Create `utils/ai-client.ts` with automatic provider selection:

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  completion: string;
}

type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'rork';

export async function generateAICompletion(messages: Message[]): Promise<AIResponse> {
  const provider = (process.env.EXPO_PUBLIC_AI_PROVIDER || 'rork') as AIProvider;
  
  console.log(`🤖 Using AI provider: ${provider}`);

  try {
    switch (provider) {
      case 'gemini':
        return await generateWithGemini(messages);
      case 'openai':
        return await generateWithOpenAI(messages);
      case 'deepseek':
        return await generateWithDeepSeek(messages);
      case 'rork':
      default:
        return await generateWithRork(messages);
    }
  } catch (error) {
    console.error(`❌ ${provider} failed, attempting fallback...`);
    
    // Fallback to Rork if enabled
    if (provider !== 'rork' && process.env.EXPO_PUBLIC_ENABLE_FALLBACK === 'true') {
      console.log('🔄 Falling back to Rork toolkit...');
      return await generateWithRork(messages);
    }
    
    throw error;
  }
}

// Rork toolkit (current implementation)
async function generateWithRork(messages: Message[]): Promise<AIResponse> {
  const response = await fetch('https://toolkit.rork.com/text/llm/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Rork API failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Add other provider functions here (generateWithGemini, generateWithOpenAI, etc.)
```

---

## Error Handling & Fallbacks

### Comprehensive Error Handling Strategy

The app has **three layers of protection**:

#### Layer 1: API Error Handling

```typescript
try {
  const data = await generateAICompletion(requestBody.messages);
  
  if (!data.completion) {
    throw new Error('No completion in API response');
  }
  
  // Parse and validate response
  const parsedPlan = parseAndValidatePlan(data.completion);
  
} catch (apiError) {
  console.error('❌ API Error:', apiError);
  // Falls through to Layer 2
  throw apiError;
}
```

#### Layer 2: JSON Parsing & Validation

The app includes robust JSON parsing with:
- Markdown code block removal
- Brace matching and extraction
- Common JSON error fixes
- Truncation detection
- Structure validation

```typescript
// Clean response
let cleanedResponse = data.completion.trim();
cleanedResponse = cleanedResponse.replace(/```json\s*\n?|```\s*\n?/g, '');

// Extract JSON
const jsonStart = cleanedResponse.indexOf('{');
let jsonEnd = findMatchingBrace(cleanedResponse, jsonStart);

// Fix common issues
jsonString = jsonString.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
jsonString = jsonString.replace(/'/g, '"'); // Fix quotes

// Parse and validate
const parsedPlan = JSON.parse(jsonString);

if (!parsedPlan.workout || !parsedPlan.nutrition || !parsedPlan.recovery) {
  throw new Error('Invalid plan structure');
}
```

#### Layer 3: Adaptive Fallback Plans

If AI fails completely, the app generates an **intelligent fallback plan** based on user data:

```typescript
catch (error) {
  console.error('❌ AI generation failed, using adaptive fallback');
  
  // Generate plan based on user preferences
  const fallbackPlan = generateAdaptiveFallback(user, checkin);
  
  // Fallback respects:
  // - User's equipment
  // - Dietary preferences
  // - Energy levels
  // - Injuries/limitations
  // - Preferred exercises
  
  await addPlan(fallbackPlan);
  router.replace('/plan');
}
```

### Fallback Plan Features

The adaptive fallback is **NOT a generic template**. It:

✅ Uses only user's available equipment
✅ Respects dietary preferences (vegetarian, eggitarian, non-veg)
✅ Adjusts intensity based on energy levels
✅ Includes preferred exercises
✅ Avoids exercises user wants to skip
✅ Considers injuries and limitations
✅ Matches user's fitness goals

**Example**: If user has only bodyweight equipment and is vegetarian with low energy:
- Workout: Gentle bodyweight exercises (no gym equipment)
- Nutrition: Plant-based meals only
- Intensity: Reduced volume, higher RIR
- Recovery: Emphasized mobility and rest

---

## Testing & Validation

### Pre-Production Testing Checklist

#### 1. API Connection Test

Create `utils/test-ai.ts`:

```typescript
import { generateAICompletion } from './ai-client';

export async function testAIConnection() {
  console.log('🧪 Testing AI connection...');
  
  try {
    const response = await generateAICompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant. Respond with a simple JSON: {"status": "ok", "message": "Connection successful"}'
      },
      {
        role: 'user',
        content: 'Test connection'
      }
    ]);
    
    console.log('✅ AI connection successful');
    console.log('Response:', response.completion.substring(0, 200));
    return true;
  } catch (error) {
    console.error('❌ AI connection failed:', error);
    return false;
  }
}
```

Run in your app:

```typescript
// In app/index.tsx or a test screen
import { testAIConnection } from '@/utils/test-ai';

useEffect(() => {
  testAIConnection();
}, []);
```

#### 2. Plan Generation Test

Test with real user data:

```typescript
export async function testPlanGeneration() {
  const testUser = {
    goal: 'MUSCLE_GAIN',
    equipment: ['Gym'],
    dietaryPrefs: ['Non-veg'],
    trainingDays: 4,
    weight: 75,
    height: 175,
  };
  
  const testCheckin = {
    energy: 7,
    stress: 3,
    sleepHrs: 7,
    wokeFeeling: 'Refreshed',
    soreness: [],
    motivation: 8,
  };
  
  try {
    console.log('🧪 Testing plan generation...');
    const plan = await generateAdjustedDailyPlan(testUser, testCheckin, [], basePlan);
    
    console.log('✅ Plan generated successfully');
    console.log('Workout focus:', plan.workout.focus);
    console.log('Calories:', plan.nutrition.total_kcal);
    console.log('Protein:', plan.nutrition.protein_g);
    
    return true;
  } catch (error) {
    console.error('❌ Plan generation failed:', error);
    return false;
  }
}
```

#### 3. Error Scenario Testing

Test fallback mechanisms:

```typescript
export async function testErrorHandling() {
  console.log('🧪 Testing error handling...');
  
  // Test 1: Invalid API key
  const originalKey = process.env.EXPO_PUBLIC_AI_API_KEY;
  process.env.EXPO_PUBLIC_AI_API_KEY = 'invalid-key';
  
  try {
    await generateAICompletion([{ role: 'user', content: 'test' }]);
    console.log('❌ Should have failed with invalid key');
  } catch (error) {
    console.log('✅ Correctly handled invalid API key');
  }
  
  process.env.EXPO_PUBLIC_AI_API_KEY = originalKey;
  
  // Test 2: Fallback plan generation
  try {
    const fallbackPlan = generateAdaptiveFallback(testUser, testCheckin);
    console.log('✅ Fallback plan generated');
    console.log('Fallback workout:', fallbackPlan.workout.focus);
  } catch (error) {
    console.log('❌ Fallback generation failed:', error);
  }
}
```

#### 4. JSON Parsing Test

Test with malformed responses:

```typescript
export function testJSONParsing() {
  const testCases = [
    '```json\n{"workout": {...}}```',  // Markdown wrapped
    '{"workout": {...},}',              // Trailing comma
    "{'workout': {...}}",               // Single quotes
    '{"workout": {...}}\n\nExtra text', // Extra content
  ];
  
  testCases.forEach((testCase, i) => {
    try {
      const cleaned = cleanAndParseJSON(testCase);
      console.log(`✅ Test case ${i + 1} passed`);
    } catch (error) {
      console.log(`❌ Test case ${i + 1} failed:`, error);
    }
  });
}
```

---

## Production Deployment

### Step 1: Environment Configuration

Create environment-specific files:

**`.env.development`**:
```bash
EXPO_PUBLIC_AI_PROVIDER=rork
# Use free tier for development
```

**`.env.production`**:
```bash
EXPO_PUBLIC_AI_PROVIDER=gemini
EXPO_PUBLIC_AI_API_KEY=your-production-key
EXPO_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
EXPO_PUBLIC_ENABLE_FALLBACK=true
```

### Step 2: Secure API Keys

**Option A: EAS Secrets** (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Set secrets
eas secret:create --scope project --name EXPO_PUBLIC_AI_API_KEY --value "your-key"
eas secret:create --scope project --name EXPO_PUBLIC_AI_PROVIDER --value "gemini"
```

**Option B: Environment Variables in CI/CD**

For GitHub Actions, Vercel, etc.:

```yaml
# .github/workflows/deploy.yml
env:
  EXPO_PUBLIC_AI_API_KEY: ${{ secrets.AI_API_KEY }}
  EXPO_PUBLIC_AI_PROVIDER: gemini
```

### Step 3: Build Configuration

Update `app.json`:

```json
{
  "expo": {
    "extra": {
      "aiProvider": process.env.EXPO_PUBLIC_AI_PROVIDER,
      "enableFallback": process.env.EXPO_PUBLIC_ENABLE_FALLBACK
    }
  }
}
```

### Step 4: Monitoring & Logging

Add production logging:

```typescript
// utils/logger.ts
export function logAIRequest(provider: string, promptLength: number) {
  if (__DEV__) {
    console.log(`🤖 AI Request: ${provider}, prompt: ${promptLength} chars`);
  } else {
    // Send to analytics service (e.g., Sentry, Firebase)
    analytics.logEvent('ai_request', {
      provider,
      promptLength,
      timestamp: new Date().toISOString(),
    });
  }
}

export function logAIError(provider: string, error: Error) {
  if (__DEV__) {
    console.error(`❌ AI Error: ${provider}`, error);
  } else {
    // Send to error tracking service
    Sentry.captureException(error, {
      tags: { provider, feature: 'ai_generation' },
    });
  }
}
```

---

## Scaling & Performance

### Rate Limits & Quotas

#### Google Gemini
- **Free tier**: 15 requests/minute, 1,500 requests/day
- **Paid tier**: 1,000 requests/minute, unlimited daily
- **Cost**: ~$0.00025 per request (2.0 Flash)

#### OpenAI GPT-4
- **Free tier**: None
- **Paid tier**: 10,000 requests/minute (Tier 1)
- **Cost**: ~$0.03 per request (GPT-4 Turbo)

#### DeepSeek
- **Free tier**: 60 requests/minute
- **Paid tier**: Higher limits available
- **Cost**: ~$0.001 per request

### Optimization Strategies

#### 1. Request Caching

Cache base plans to reduce API calls:

```typescript
// utils/plan-cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'ai_plan_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getCachedBasePlan(userId: string) {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (!cached) return null;
    
    const { plan, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log('✅ Using cached base plan');
      return plan;
    }
    
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export async function setCachedBasePlan(userId: string, plan: any) {
  try {
    await AsyncStorage.setItem(
      `${CACHE_KEY}_${userId}`,
      JSON.stringify({ plan, timestamp: Date.now() })
    );
    console.log('✅ Base plan cached');
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
```

Use in generation:

```typescript
// Check cache first
const cachedPlan = await getCachedBasePlan(user.id);
if (cachedPlan) {
  await addBasePlan(cachedPlan);
  router.replace('/plan-preview');
  return;
}

// Generate new plan if not cached
const basePlan = await generateWeeklyBasePlan(user);
await setCachedBasePlan(user.id, basePlan);
```

#### 2. Request Batching

Batch multiple requests when possible:

```typescript
// Instead of generating each day separately, generate full week in one request
// This is already implemented in the app
```

#### 3. Prompt Optimization

Reduce token usage:

```typescript
// Before: Verbose prompt
const prompt = `
  The user's goal is to lose weight.
  The user has access to gym equipment.
  The user prefers vegetarian diet.
  ...
`;

// After: Concise prompt
const prompt = `Goal: WEIGHT_LOSS | Equipment: Gym | Diet: Vegetarian | ...`;
```

#### 4. Response Streaming (Advanced)

For real-time feedback:

```typescript
// Note: Requires streaming-capable API
async function generateWithStreaming(messages: Message[]) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ /* ... */, stream: true }),
  });

  const reader = response.body?.getReader();
  let completion = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = new TextDecoder().decode(value);
    completion += chunk;
    
    // Update UI in real-time
    onProgress(completion);
  }

  return { completion };
}
```

### Cost Estimation

**Typical usage per user per month**:
- Base plan generation: 1 request (7-day plan)
- Daily adjustments: 30 requests (1 per day)
- Total: ~31 requests/month

**Monthly costs**:
- **Gemini 2.0 Flash**: ~$0.008/user/month
- **GPT-4 Turbo**: ~$0.93/user/month
- **DeepSeek**: ~$0.031/user/month

**For 1,000 active users**:
- **Gemini**: ~$8/month
- **GPT-4**: ~$930/month
- **DeepSeek**: ~$31/month

---

## Troubleshooting

### Common Issues

#### Issue 1: "API key not found"

**Solution**:
```bash
# Check .env file exists
ls -la .env

# Verify key is set
echo $EXPO_PUBLIC_AI_API_KEY

# Restart development server
npm start -- --clear
```

#### Issue 2: "Invalid JSON response"

**Solution**:
- Check console logs for raw AI response
- Verify prompt is requesting JSON format
- Ensure JSON cleaning logic is working
- Test with simpler prompts first

#### Issue 3: "Rate limit exceeded"

**Solution**:
- Implement request caching (see above)
- Add retry logic with exponential backoff
- Upgrade to paid tier
- Switch to provider with higher limits

#### Issue 4: "Fallback plan always used"

**Solution**:
- Check API key is valid
- Verify network connectivity
- Check provider is correctly set in .env
- Review error logs for specific API errors

---

## Summary

### Quick Start Checklist

- [ ] Choose AI provider (Gemini recommended)
- [ ] Get API key from provider
- [ ] Update `.env` with provider and key
- [ ] Create `utils/ai-client.ts` with provider functions
- [ ] Update plan generation files to use new client
- [ ] Test connection with sample requests
- [ ] Test plan generation with real user data
- [ ] Test error handling and fallbacks
- [ ] Set up production environment variables
- [ ] Deploy and monitor

### Key Takeaways

1. **Current system works**: Rork toolkit is fine for development
2. **Switch for production**: Use direct API for reliability and control
3. **Gemini recommended**: Best balance of cost, performance, and features
4. **Fallbacks are critical**: App never breaks, always generates a plan
5. **Security first**: Never commit API keys, use environment variables
6. **Test thoroughly**: Validate all scenarios before production
7. **Monitor usage**: Track costs and rate limits

### Support

For issues or questions:
- Check console logs for detailed error messages
- Review this guide's troubleshooting section
- Test with the provided test functions
- Verify environment variables are set correctly

---

**Last Updated**: 2025-01-06
**App Version**: 1.0.0
**Compatible with**: Expo SDK 53, React Native 0.76
