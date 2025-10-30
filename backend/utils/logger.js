/**
 * Logger Utility - Simple logging with timestamps
 */

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

class Logger {
    constructor(context = 'APP') {
        this.context = context;
    }
    
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;
        
        if (data) {
            logMessage += `\n${JSON.stringify(data, null, 2)}`;
        }
        
        return logMessage;
    }
    
    error(message, data = null) {
        console.error(this.formatMessage(LOG_LEVELS.ERROR, message, data));
    }
    
    warn(message, data = null) {
        console.warn(this.formatMessage(LOG_LEVELS.WARN, message, data));
    }
    
    info(message, data = null) {
        console.log(this.formatMessage(LOG_LEVELS.INFO, message, data));
    }
    
    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, data));
        }
    }
}

// Create default logger instance
const logger = new Logger();

module.exports = {
    Logger,
    logger
};