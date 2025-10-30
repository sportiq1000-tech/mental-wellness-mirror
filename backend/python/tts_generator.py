#!/usr/bin/env python3
"""
Text-to-Speech Generator using pyttsx3 (offline)
Supports male/female voices and speech speed control
"""

import sys
import os

try:
    import pyttsx3
except ImportError:
    print("ERROR: pyttsx3 not installed. Run: pip install pyttsx3", file=sys.stderr)
    sys.exit(1)

def generate_tts(text, output_file, language='en', slow=False, gender='female'):
    """
    Generate TTS audio file using pyttsx3 (offline engine)
    """
    try:
        # Initialize TTS engine
        engine = pyttsx3.init()
        
        # Get available voices
        voices = engine.getProperty('voices')
        
        # Select voice based on gender
        # Windows typically has:
        # - voices[0] = Male voice
        # - voices[1] = Female voice (if available)
        
        if gender == 'male':
            # Use first voice (usually male on Windows)
            if len(voices) > 0:
                engine.setProperty('voice', voices[0].id)
        else:  # female
            # Try to use second voice if available, otherwise use first
            if len(voices) > 1:
                engine.setProperty('voice', voices[1].id)
            elif len(voices) > 0:
                engine.setProperty('voice', voices[0].id)
        
        # Set speech rate
        rate = engine.getProperty('rate')
        if slow:
            engine.setProperty('rate', rate - 50)  # Slower
        elif gender == 'male':
            engine.setProperty('rate', rate - 20)  # Slightly slower for male
        
        # Set volume (0.0 to 1.0)
        engine.setProperty('volume', 0.9)
        
        # Ensure output directory exists
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        # Save to file
        engine.save_to_file(text, output_file)
        engine.runAndWait()
        
        print(f"SUCCESS: Audio saved to {output_file}")
        return True
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return False

def main():
    """
    Main function - accepts command line arguments
    """
    if len(sys.argv) < 3:
        print("Usage: python tts_generator.py <text> <output_file> [language] [slow] [gender]", file=sys.stderr)
        sys.exit(1)
    
    text = sys.argv[1]
    output_file = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else 'en'
    slow = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else False
    gender = sys.argv[5].lower() if len(sys.argv) > 5 else 'female'
    
    # Validate gender
    if gender not in ['male', 'female']:
        gender = 'female'
    
    if not text or len(text.strip()) == 0:
        print("ERROR: Empty text provided", file=sys.stderr)
        sys.exit(1)
    
    success = generate_tts(text, output_file, language, slow, gender)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()