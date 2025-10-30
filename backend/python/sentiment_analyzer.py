#!/usr/bin/env python3
"""
VADER Sentiment Analysis Script with Mental Health Context
"""

import sys
import json

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
except ImportError:
    print(json.dumps({
        "error": "vaderSentiment not installed. Run: pip install vaderSentiment"
    }))
    sys.exit(1)

# Mental health keyword adjustments
MENTAL_HEALTH_KEYWORDS = {
    # Negative mental health terms that VADER might underestimate
    'depressed': -0.3,
    'suicidal': -0.5,
    'hopeless': -0.3,
    'worthless': -0.3,
    'panic': -0.2,
    'anxiety': -0.2,
    'anxious': -0.2,
    'overwhelmed': -0.2,
    'burnout': -0.3,
    'exhausted': -0.2,
    'isolated': -0.2,
    'lonely': -0.2,
    'numb': -0.2,
    'empty': -0.2,
    
    # Positive mental health terms
    'hopeful': 0.2,
    'grateful': 0.2,
    'accomplished': 0.2,
    'peaceful': 0.2,
    'calm': 0.2,
    'relaxed': 0.2,
    'confident': 0.2,
    'proud': 0.2,
}

# Sarcasm indicators
SARCASM_INDICATORS = [
    'yeah right', 'oh great', 'just what i needed', 'perfect',
    'wonderful', 'fantastic', 'brilliant', 'amazing'
]

def detect_sarcasm(text):
    """
    Simple sarcasm detection based on common patterns
    """
    text_lower = text.lower()
    
    # Check for sarcasm indicators
    for indicator in SARCASM_INDICATORS:
        if indicator in text_lower:
            # Check for negative context words nearby
            negative_context = ['another', 'just', 'oh', 'yeah', 'sure']
            if any(word in text_lower for word in negative_context):
                return True
    
    # Check for emoji sarcasm indicators
    sarcasm_emojis = ['🙄', '😒', '🤦', '🤷', '😑']
    if any(emoji in text for emoji in sarcasm_emojis):
        return True
    
    return False

def adjust_for_mental_health(text, base_compound):
    """
    Adjust sentiment score based on mental health context
    """
    text_lower = text.lower()
    adjustment = 0.0
    
    # Count mental health keywords
    for keyword, weight in MENTAL_HEALTH_KEYWORDS.items():
        if keyword in text_lower:
            adjustment += weight
    
    # Apply adjustment (max ±0.3)
    adjustment = max(-0.3, min(0.3, adjustment))
    
    return base_compound + adjustment

def analyze_sentiment(text):
    """
    Enhanced sentiment analysis with context awareness
    """
    analyzer = SentimentIntensityAnalyzer()
    scores = analyzer.polarity_scores(text)
    
    # Get base compound score
    compound = scores['compound']
    
    # Check for sarcasm (flip positive to negative)
    if detect_sarcasm(text) and compound > 0:
        compound = -abs(compound) * 0.7  # Flip and dampen
    
    # Apply mental health context adjustments
    compound = adjust_for_mental_health(text, compound)
    
    # Ensure compound stays in valid range
    compound = max(-1.0, min(1.0, compound))
    
    # Determine label and emoji based on adjusted compound score
    if compound >= 0.05:
        label = "Positive"
        emoji = "😊"
    elif compound <= -0.05:
        label = "Negative"
        emoji = "😔"
    else:
        label = "Neutral"
        emoji = "😐"
    
    # Return formatted result
    result = {
        "positive": round(scores['pos'], 3),
        "neutral": round(scores['neu'], 3),
        "negative": round(scores['neg'], 3),
        "compound": round(compound, 3),
        "label": label,
        "emoji": emoji,
        "adjustments": {
            "sarcasm_detected": detect_sarcasm(text),
            "mental_health_context": True
        }
    }
    
    return result

def main():
    """
    Main function - reads text from command line argument
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "No text provided for analysis"
        }))
        sys.exit(1)
    
    text = sys.argv[1]
    
    if not text or len(text.strip()) == 0:
        print(json.dumps({
            "error": "Empty text provided"
        }))
        sys.exit(1)
    
    try:
        sentiment = analyze_sentiment(text)
        print(json.dumps(sentiment))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({
            "error": f"Analysis failed: {str(e)}"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()