/**
 * Text-to-Speech Service using gTTS
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const TTS_SCRIPT = path.join(__dirname, '../python/tts_generator.py');
const AUDIO_DIR = path.join(__dirname, '../temp/audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}


/**
 * Generate audio file from text using gTTS
 */
async function generateVoice(text, language = 'en', slow = false, gender = 'female') {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const filename = `tts_${timestamp}_${randomId}.mp3`;
        const outputPath = path.join(AUDIO_DIR, filename);
        
        // Validate gender parameter
        const validGender = ['male', 'female'].includes(gender) ? gender : 'female';
        
        // Spawn Python process with gender parameter
        const pythonArgs = [
            TTS_SCRIPT, 
            text, 
            outputPath, 
            language, 
            slow ? 'true' : 'false',
            validGender  // ✅ NEW: Pass gender to Python
        ];
        
        const pythonProcess = spawn(PYTHON_PATH, pythonArgs);
        
        let outputData = '';
        let errorData = '';
        
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
                // Schedule cleanup after 10 minutes
                setTimeout(() => {
                    cleanupAudioFile(outputPath);
                }, 10 * 60 * 1000);
                
                resolve(filename);
            } else {
                console.error('TTS generation failed:', errorData);
                reject(new Error(`TTS generation failed with code ${code}`));
            }
        });
        
        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start TTS process: ${error.message}`));
        });
        
        // Set timeout
        setTimeout(() => {
            pythonProcess.kill();
            reject(new Error('TTS generation timeout'));
        }, 15000); // 15 second timeout
    });
}

/**
 * Get audio file path
 */
function getAudioPath(filename) {
    return path.join(AUDIO_DIR, filename);
}

/**
 * Cleanup old audio files
 */
function cleanupAudioFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Cleaned up audio file:', filePath);
        }
    } catch (error) {
        console.error('Failed to cleanup audio file:', error);
    }
}

/**
 * Cleanup all old audio files (run periodically)
 */
function cleanupOldAudioFiles() {
    try {
        const files = fs.readdirSync(AUDIO_DIR);
        const now = Date.now();
        
        files.forEach(file => {
            const filePath = path.join(AUDIO_DIR, file);
            const stats = fs.statSync(filePath);
            const fileAge = now - stats.mtimeMs;
            
            // Delete files older than 10 minutes
            if (fileAge > 10 * 60 * 1000) {
                cleanupAudioFile(filePath);
            }
        });
    } catch (error) {
        console.error('Error during audio cleanup:', error);
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldAudioFiles, 5 * 60 * 1000);

module.exports = {
    generateVoice,
    getAudioPath,
    cleanupOldAudioFiles
};