/**
 * AI-Enhanced Sentiment Analysis
 * Uses Groq to validate and enhance VADER results
 */

const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

/**
 * Ask AI to analyze sentiment as a validation layer
 */
async function getAISentiment(text) {
    if (!GROQ_API_KEY) {
        console.log('⚠️  Groq API key not configured, skipping AI sentiment analysis');
        return null;
    }

    const prompt = `Analyze the emotional sentiment of this text. Respond ONLY with a JSON object in this exact format:
{
  "sentiment": "positive" or "neutral" or "negative",
  "confidence": 0.0 to 1.0,
  "primary_emotion": "joy" or "sadness" or "anxiety" or "anger" or "fear" or "neutral",
  "is_sarcastic": true or false,
  "reasoning": "brief explanation in one sentence"
}

Text to analyze: "${text}"

Respond with JSON only, no additional text.`;

    return new Promise((resolve, reject) => {
        const requestBody = JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a sentiment analysis expert specializing in mental health and emotional intelligence. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3, // Lower temperature for consistent results
            max_tokens: 200,
            top_p: 0.9
        });

        const url = new URL(GROQ_API_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Length': Buffer.byteLength(requestBody)
            },
            timeout: 5000 // 5 second timeout
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 200 && response.choices && response.choices[0]) {
                        const aiMessage = response.choices[0].message.content.trim();
                        
                        // Try to extract JSON from response
                        const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const aiSentiment = JSON.parse(jsonMatch[0]);
                            console.log('✅ AI sentiment analysis successful');
                            resolve(aiSentiment);
                        } else {
                            console.warn('⚠️  Could not parse AI sentiment JSON');
                            resolve(null);
                        }
                    } else {
                        console.warn('⚠️  AI sentiment API error:', response.error || 'Unknown error');
                        resolve(null);
                    }
                } catch (error) {
                    console.warn('⚠️  Failed to parse AI sentiment response:', error.message);
                    resolve(null); // Fail gracefully
                }
            });
        });

        req.on('error', (error) => {
            console.warn('⚠️  AI sentiment request failed:', error.message);
            resolve(null);
        });

        req.on('timeout', () => {
            req.destroy();
            console.warn('⚠️  AI sentiment request timeout');
            resolve(null);
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Combine VADER and AI sentiment for best results
 */
async function getHybridSentiment(text, vaderResult) {
    // Try to get AI analysis
    const aiResult = await getAISentiment(text);

    if (!aiResult) {
        // AI failed or not available, use VADER only
        return {
            ...vaderResult,
            method: 'vader_only',
            aiEnhanced: false
        };
    }

    // Map AI sentiment to compound score range
    const aiCompoundMap = {
        'positive': 0.6,
        'negative': -0.6,
        'neutral': 0.0
    };
    
    const aiCompound = aiCompoundMap[aiResult.sentiment] || 0.0;

    // Start with VADER's compound score
    let finalCompound = vaderResult.compound;
    let adjustmentReason = 'none';

    // ADJUSTMENT 1: Sarcasm Detection
    if (aiResult.is_sarcastic && vaderResult.compound > 0.1) {
        // AI detected sarcasm and VADER thought it was positive
        // Flip to negative and reduce intensity
        finalCompound = -Math.abs(vaderResult.compound) * 0.7;
        adjustmentReason = 'sarcasm_detected';
        console.log('🔄 Sarcasm detected, flipping sentiment');
    }

    // ADJUSTMENT 2: Significant AI-VADER Disagreement
    const scoreDifference = Math.abs(vaderResult.compound - aiCompound);
    const disagreementThreshold = 0.4;

    if (scoreDifference > disagreementThreshold && adjustmentReason === 'none') {
        // AI and VADER strongly disagree
        // Use weighted average favoring AI slightly (40% VADER, 60% AI)
        finalCompound = (vaderResult.compound * 0.4) + (aiCompound * 0.6);
        adjustmentReason = 'ai_vader_disagreement';
        console.log(`🔄 Large disagreement detected (diff: ${scoreDifference.toFixed(2)}), using weighted average`);
    }

    // ADJUSTMENT 3: Mental Health Context Boost
    const mentalHealthKeywords = ['anxious', 'depressed', 'suicidal', 'hopeless', 'panic', 'overwhelmed'];
    const hasStrongMentalHealthContext = mentalHealthKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
    );

    if (hasStrongMentalHealthContext && finalCompound > -0.5 && finalCompound < 0) {
        // Amplify negative sentiment for mental health keywords
        finalCompound = finalCompound * 1.3;
        adjustmentReason = adjustmentReason === 'none' ? 'mental_health_context' : adjustmentReason + '+mental_health';
        console.log('🔄 Mental health context detected, amplifying negative sentiment');
    }

    // Ensure compound stays within valid range
    finalCompound = Math.max(-1.0, Math.min(1.0, finalCompound));

    // Determine final label based on adjusted compound
    let finalLabel, finalEmoji;
    if (finalCompound >= 0.05) {
        finalLabel = "Positive";
        finalEmoji = "😊";
    } else if (finalCompound <= -0.05) {
        finalLabel = "Negative";
        finalEmoji = "😔";
    } else {
        finalLabel = "Neutral";
        finalEmoji = "😐";
    }

    // Return enhanced result
    return {
        positive: vaderResult.positive,
        neutral: vaderResult.neutral,
        negative: vaderResult.negative,
        compound: parseFloat(finalCompound.toFixed(3)),
        label: finalLabel,
        emoji: finalEmoji,
        method: 'hybrid_ai_vader',
        aiEnhanced: true,
        aiInsights: {
            primaryEmotion: aiResult.primary_emotion,
            sarcasmDetected: aiResult.is_sarcastic,
            confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            adjustmentMade: adjustmentReason,
            originalVaderScore: vaderResult.compound,
            finalScore: parseFloat(finalCompound.toFixed(3))
        }
    };
}

module.exports = {
    getAISentiment,
    getHybridSentiment
};