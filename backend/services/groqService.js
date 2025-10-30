/**
 * Groq API Service - AI Response Generation
 */

const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

/**
 * System prompt for the AI
 */
const SYSTEM_PROMPT = `You are a compassionate mental wellness companion called "Mental Wellness Mirror".

Your purpose:
- Provide empathetic, validating responses to users' emotional reflections
- Offer gentle encouragement and support
- Suggest simple, actionable coping strategies when appropriate
- NEVER provide medical advice or diagnose conditions
- NEVER claim to be a therapist or medical professional
- Keep responses concise (2-4 sentences)
- If user mentions self-harm or suicide, encourage them to contact crisis services

Tone: Warm, understanding, non-judgmental, hopeful
Style: Conversational, supportive, human-like`;

/**
 * Generate AI response using Groq API
 */
async function generateAIResponse(userText, recentEntries = []) {
  return new Promise((resolve, reject) => {
    // Build context from recent entries
    let contextPrompt = '';
    if (recentEntries && recentEntries.length > 0) {
      const moodTrend = analyzeMoodTrend(recentEntries);
      contextPrompt = `\n\n[Context: User has been feeling ${moodTrend} lately based on recent reflections.]`;
    }
    
    // Prepare request payload
    const requestBody = JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + contextPrompt
        },
        {
          role: 'user',
          content: userText
        }
      ],
      temperature: 0.7,
      max_tokens: 250,
      top_p: 0.9,
      stream: false
    });
    
    // Parse URL
    const url = new URL(GROQ_API_URL);
    
    // HTTP request options
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 10000 // 10 second timeout
    };
    
    // Make HTTPS request
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            const aiMessage = response.choices[0].message.content.trim();
            resolve(aiMessage);
          } else {
            reject(new Error(`Groq API error: ${response.error?.message || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Groq API response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Groq API request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq API request timeout'));
    });
    
    req.write(requestBody);
    req.end();
  });
}

/**
 * Analyze mood trend from recent entries
 */
function analyzeMoodTrend(recentEntries) {
  if (!recentEntries || recentEntries.length === 0) {
    return 'neutral';
  }
  
  const avgScore = recentEntries.reduce((sum, entry) => sum + entry.sentiment_score, 0) / recentEntries.length;
  
  if (avgScore > 0.2) return 'mostly positive';
  if (avgScore < -0.2) return 'somewhat challenging';
  return 'mixed';
}

/**
 * Fallback response if API fails
 */
function getFallbackResponse() {
  const fallbackResponses = [
    "Thank you for sharing. Your feelings are valid, and it's important to acknowledge them. Remember, it's okay to feel this way.",
    "I hear you. What you're experiencing matters, and taking time to reflect is a positive step. Be gentle with yourself.",
    "Thanks for opening up. Remember that emotions are temporary, and it's okay to feel what you're feeling right now.",
    "I appreciate you sharing this with me. Your feelings are important. Consider taking a moment for self-care today."
  ];
  
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

module.exports = {
  generateAIResponse,
  getFallbackResponse
};