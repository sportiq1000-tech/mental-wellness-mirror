#!/usr/bin/env python3
"""
VADER Sentiment Analysis Script
Analyzes text sentiment and returns JSON output
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

def analyze_sentiment(text):
    """
    Analyze sentiment using VADER
    """
    analyzer = SentimentIntensityAnalyzer()
    scores = analyzer.polarity_scores(text)
    
    # Determine label and emoji based on compound score
    compound = scores['compound']
    
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
        "emoji": emoji
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