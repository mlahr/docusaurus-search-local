/**
 * Functions for sending logs to Graylog
 */

/// <reference types="@cloudflare/workers-types" />

/**
 * Log levels matching our application levels
 */
export const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    NOTICE: 'NOTICE',
    WARNING: 'WARNING',
    WARN: 'WARN',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL',
    FATAL: 'FATAL',
    ALERT: 'ALERT',
    EMERGENCY: 'EMERGENCY',
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

/**
 * Log entry structure
 */
export interface LogEntry {
    message: string;
    level?: LogLevel;
    host?: string;
    environment?: string;
    timestamp?: number;
    priority?: number;
    [key: string]: any; // Allow additional custom fields
}

/**
 * GELF (Graylog Extended Log Format) entry structure
 * Spec: https://docs.graylog.org/docs/gelf
 */
interface GELFEntry {
    version: string;
    host: string;
    short_message: string;
    level: number;
    _environment: string;
    [key: string]: any; // Additional fields with _ prefix
}

/**
 * Convert log entry to GELF format for Graylog
 * @param logEntry - The log entry to convert
 * @returns The log entry in GELF format
 */
function convertToGELF(logEntry: LogEntry): GELFEntry {
    const gelfEntry: GELFEntry = {
        version: '1.1',
        host: logEntry.host || 'cloudflare-worker',
        short_message: logEntry.message,
        level: mapLogLevel(logEntry.level || 'INFO'),
        _environment: logEntry.environment || 'production',
    };

    // Add any additional fields with _ prefix
    for (const [key, value] of Object.entries(logEntry)) {
        if (!['message', 'timestamp', 'level', 'priority', 'host', 'environment'].includes(key)) {
            gelfEntry[`_${key}`] = value;
        }
    }

    return gelfEntry;
}

/**
 * Map our log levels to syslog levels used by GELF
 * @param level - Our log level
 * @returns Syslog level (0-7)
 */
export function mapLogLevel(level: LogLevel | string): number {
    const levels: Record<string, number> = {
        DEBUG: 7, // Debug
        INFO: 6, // Informational
        NOTICE: 5, // Notice
        WARNING: 4, // Warning
        WARN: 4, // Map our WARN to WARNING
        ERROR: 3, // Error
        CRITICAL: 2, // Critical
        FATAL: 2, // Map our FATAL to CRITICAL
        ALERT: 1, // Alert
        EMERGENCY: 0, // Emergency
    };
    return levels[level.toUpperCase()] || 6; // Default to Informational
}

/**
 * Send a single log to Graylog
 * @param logEntry - The log entry to send
 * @param graylogUrl - Graylog GELF HTTP endpoint URL
 * @param level - The log level (optional, defaults to INFO)
 * @returns Promise that resolves when the log is sent
 */
export async function sendLogToGraylog(
    logEntry: LogEntry | string,
    graylogUrl?: string,
    level: LogLevel = 'INFO'
): Promise<void> {
    if (!graylogUrl) {
        console.warn('GRAYLOG_URL not provided, falling back to console logging');
        console.log(typeof logEntry === 'string' ? logEntry : JSON.stringify(logEntry));
        return;
    }

    // If logEntry is a string, convert it to an object
    const entry: LogEntry =
        typeof logEntry === 'string'
            ? {message: logEntry, level}
            : {...logEntry, level: logEntry.level || level};

    // Convert to GELF format
    const gelfEntry = convertToGELF(entry);

    // Debug log the GELF entry
    console.log(`Sending GELF entry to Graylog at ${graylogUrl}:`, JSON.stringify(gelfEntry));

    // Send to Graylog and await the response
    try {
        const response = await fetch(graylogUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gelfEntry),
        });

        console.log(`Status: ${response.status}, StatusText: ${response.statusText}`);

        if (!response.ok) {
            throw new Error(
                `HTTP error! Status: ${response.status}, StatusText: ${response.statusText}`
            );
        }
    } catch (error) {
        console.error('Graylog Error:', error);
        // Fallback to console logging
        console.log(typeof logEntry === 'string' ? logEntry : JSON.stringify(logEntry));
    }
}

/**
 * Send multiple logs to Graylog
 * @param entries - Array of log entries
 * @param graylogUrl - Graylog GELF HTTP endpoint URL
 * @returns Promise that resolves when all logs are sent
 */
export async function sendToGraylog(entries: LogEntry[], graylogUrl?: string): Promise<void> {
    // Send each entry to Graylog and wait for all to complete
    for (const entry of entries) {
        await sendLogToGraylog(entry, graylogUrl, entry.level);
    }
}
