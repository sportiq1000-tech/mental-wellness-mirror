/**
 * Sentiment Analysis Service - VADER Integration
 */

const { spawn } = require('child_process');
const path = require('path');

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const SENTIMENT_SCRIPT = path.join(__dirname, '../python/sentiment_analyzer.py');

/**
 * Analyze sentiment using VADER (Python)
 */
async function analyzeSentiment(text) {
  return new Promise((resolve, reject) => {
    // Spawn Python process
    const pythonProcess = spawn(PYTHON_PATH, [SENTIMENT_SCRIPT, text]);
    
    let outputData = '';
    let errorData = '';
    
    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const sentiment = JSON.parse(outputData.trim());
          resolve(sentiment);
        } catch (error) {
          console.error('Failed to parse sentiment output:', outputData);
          reject(new Error('Failed to parse sentiment analysis result'));
        }
      } else {
        console.error('Sentiment analysis error:', errorData);
        reject(new Error(`Sentiment analysis failed with code ${code}`));
      }
    });
    
    // Handle process errors
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start sentiment analysis: ${error.message}`));
    });
    
    // Set timeout (5 seconds)
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Sentiment analysis timeout'));
    }, 5000);
  });
}

/**
 * Fallback sentiment analysis (simple keyword-based)
 */
function fallbackSentimentAnalysis(text) {
  const lowerText = text.toLowerCase();
  
  const positiveWords = ['happy', 'good', 'great', 'excellent', 'love', 'wonderful', 'excited', 'joy', 'amazing', 'better', 'best', 'grateful', 'thankful'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'depressed', 'anxious', 'worried', 'stressed', 'upset', 'hurt', 'pain'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  const score = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
  
  let label, emoji;
  if (score > 0.2) {
    label = 'Positive';
    emoji = '😊';
  } else if (score < -0.2) {
    label = 'Negative';
    emoji = '😔';
  } else {
    label = 'Neutral';
    emoji = '😐';
  }
  
  return {
    positive: positiveCount / Math.max(positiveCount + negativeCount, 1),
    neutral: 0.5,
    negative: negativeCount / Math.max(positiveCount + negativeCount, 1),
    compound: score,
    label,
    emoji
  };
}

/**
 * Analyze sentiment with fallback
 */
async function analyzeSentimentSafe(text) {
  try {
    return await analyzeSentiment(text);
  } catch (error) {
    console.warn('VADER analysis failed, using fallback:', error.message);
    return fallbackSentimentAnalysis(text);
  }
}

module.exports = {
  analyzeSentiment,
  analyzeSentimentSafe,
  fallbackSentimentAnalysis
};