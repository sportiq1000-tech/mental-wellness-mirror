#!/usr/bin/env python3
"""
Text-to-Speech Generator using gTTS
Converts text to MP3 audio file
"""

import sys
import os

try:
    from gtts import gTTS
except ImportError:
    print("ERROR: gTTS not installed. Run: pip install gTTS", file=sys.stderr)
    sys.exit(1)

def generate_tts(text, output_file, language='en', slow=False):
    """
    Generate TTS audio file
    """
    try:
        tts = gTTS(text=text, lang=language, slow=slow)
        tts.save(output_file)
        print(f"SUCCESS: Audio saved to {output_file}")
        return True
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return False

def main():
    """
    Main function
    """
    if len(sys.argv) < 3:
        print("Usage: python tts_generator.py <text> <output_file> [language] [slow]", file=sys.stderr)
        sys.exit(1)
    
    text = sys.argv[1]
    output_file = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else 'en'
    slow = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else False
    
    if not text or len(text.strip()) == 0:
        print("ERROR: Empty text provided", file=sys.stderr)
        sys.exit(1)
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    success = generate_tts(text, output_file, language, slow)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()