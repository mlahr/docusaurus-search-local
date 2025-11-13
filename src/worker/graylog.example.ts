/**
 * Example usage of Graylog logging in Cloudflare Worker
 *
 * This file demonstrates how to integrate Graylog structured logging
 * into your worker endpoints.
 */

import {sendLogToGraylog, sendToGraylog, LOG_LEVELS} from './graylog';

// Example 1: Log a simple message
async function exampleSimpleLog() {
    await sendLogToGraylog('Search index loaded successfully', LOG_LEVELS.INFO);
}

// Example 2: Log with structured data
async function exampleStructuredLog() {
    await sendLogToGraylog(
        {
            message: 'Search query executed',
            level: LOG_LEVELS.INFO,
            query: 'getting started',
            tag: 'docs-default-current',
            resultCount: 10,
            executionTime: 45,
            host: 'search-worker-001',
            environment: 'production',
        },
        LOG_LEVELS.INFO
    );
}

// Example 3: Log an error
async function exampleErrorLog(error: Error) {
    await sendLogToGraylog(
        {
            message: `Failed to load search index: ${error.message}`,
            level: LOG_LEVELS.ERROR,
            errorName: error.name,
            errorStack: error.stack,
            tag: 'docs-default-current',
        },
        LOG_LEVELS.ERROR
    );
}

// Example 4: Batch logging
async function exampleBatchLog() {
    const logs = [
        {
            message: 'Worker started',
            level: LOG_LEVELS.INFO,
        },
        {
            message: 'KV namespace connected',
            level: LOG_LEVELS.INFO,
            kvNamespace: 'SEARCH_INDEXES',
        },
        {
            message: 'Cache initialized',
            level: LOG_LEVELS.DEBUG,
            cacheSize: 0,
        },
    ];

    await sendToGraylog(logs);
}

// Example 5: Integration in a worker endpoint
export async function handleSearchWithLogging(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
        // Log request received
        await sendLogToGraylog(
            {
                message: 'Search request received',
                level: LOG_LEVELS.INFO,
                method: request.method,
                url: request.url,
            },
            LOG_LEVELS.INFO
        );

        // ... perform search logic here ...
        const results: any[] = []; // Your search results

        const executionTime = Date.now() - startTime;

        // Log successful search
        await sendLogToGraylog(
            {
                message: 'Search completed successfully',
                level: LOG_LEVELS.INFO,
                resultCount: results.length,
                executionTime,
            },
            LOG_LEVELS.INFO
        );

        return new Response(JSON.stringify({results}), {
            status: 200,
            headers: {'Content-Type': 'application/json'},
        });
    } catch (error) {
        // Log error
        await sendLogToGraylog(
            {
                message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                level: LOG_LEVELS.ERROR,
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                executionTime: Date.now() - startTime,
            },
            LOG_LEVELS.ERROR
        );

        return new Response(JSON.stringify({error: 'Internal server error'}), {
            status: 500,
            headers: {'Content-Type': 'application/json'},
        });
    }
}

/**
 * Graylog URL is hardcoded in graylog.ts:
 * const GRAYLOG_URL = 'https://logs.thefamouscat.com/gelf';
 *
 * No configuration needed in wrangler.toml
 */
