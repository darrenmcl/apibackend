const pino = require('pino');
const path = require('path');
const fs = require('fs');
const isProduction = process.env.NODE_ENV === 'production';

// Set default log level, can be overridden by environment variable
const defaultLogLevel = isProduction ? 'info' : 'debug';
const logLevel = process.env.LOG_LEVEL || defaultLogLevel;

// --- Define Transports (How logs are output) ---
let transport;
if (isProduction) {
    // In production (like Docker), log structured JSON to standard output (stdout).
    // Let the container orchestrator (Docker) handle capturing/rotating stdout.
    transport = pino.transport({
        target: 'pino/file', // Built-in target that writes to stream
        options: { destination: 1 } // 1 = stdout
    });
    console.log(`Production logging initialized to stdout (Level: ${logLevel})`); // Initial console message
} else {
    // In development, use pino-pretty for readable console logs AND write to a file.
    const logDir = path.join(__dirname, '../logs');
    const logFilePath = path.join(logDir, 'backend-api-dev.log'); // Dev log file
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
            console.log(`Created log directory: ${logDir}`);
        } catch (err) {
            console.error(`Failed to create log directory: ${err.message}`);
        }
    }

    // Ensure log file exists with proper permissions
    if (!fs.existsSync(logFilePath)) {
        try {
            // Create an empty file with read/write permissions for user and group
            fs.writeFileSync(logFilePath, '', { mode: 0o664 });
            console.log(`Created log file: ${logFilePath}`);
        } catch (err) {
            console.error(`Failed to create log file: ${err.message}`);
        }
    }

    transport = pino.transport({
        targets: [
            { // Pretty print to console
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // Readable timestamp
                    ignore: 'pid,hostname' // Hide noise
                },
                level: logLevel // Use the determined log level for console
            },
            { // Also write JSON logs to a file for persistence during dev
                target: 'pino/file',
                options: { 
                    destination: logFilePath,
                    append: true 
                },
                level: logLevel // Use the determined log level for file
            }
        ]
    });
    console.log(`Development logging initialized to console and file: ${logFilePath} (Level: ${logLevel})`);
}

// --- Create Logger Instance ---
const logger = pino(
    {
        level: logLevel,
        // Optional: Add custom serializers if needed later
        // serializers: { req: pino.stdSerializers.req, res: pino.stdSerializers.res }
    },
    transport // Use the configured transport
);

// Export the configured logger instance
module.exports = logger;
