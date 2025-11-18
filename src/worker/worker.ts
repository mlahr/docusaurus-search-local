/**
 * Cloudflare Worker for Docusaurus Search Local
 *
 * This worker provides a JSON API endpoint for searching pre-built Lunr indexes.
 * Indexes are stored in Cloudflare KV and loaded on demand.
 */

/// <reference types="@cloudflare/workers-types" />

import lunr from './lunr-bundle';
import {LOG_LEVELS, sendLogToGraylog} from './graylog';

// Types matching the main plugin
type MyDocument = {
    id: number;
    pageTitle: string;
    sectionTitle: string;
    sectionRoute: string;
    sectionContent: string;
    type: 'docs' | 'blog' | 'page';
};

type SearchIndex = {
    documents: MyDocument[];
    index: any; // Serialized Lunr index
};

type SearchRequest = {
    query: string;
    tag?: string;
    maxResults?: number;
    fields?: string[];
};

type SearchResult = {
    id: number;
    pageTitle: string;
    sectionTitle: string;
    sectionRoute: string;
    sectionContent: string;
    type: string;
    score: number;
};

type SearchResponse = {
    results: SearchResult[];
    total: number;
    query: string;
    took: number;
};

type Env = {
    SEARCH_INDEXES: KVNamespace;
    ALLOWED_ORIGINS?: string; // Comma-separated list of allowed origins
    DEFAULT_TAG?: string; // Default search index tag (defaults to "docs-default-current")
};

// Cache for loaded indexes (Worker instance memory)
const indexCache = new Map<string, {documents: MyDocument[]; index: lunr.Index}>();

/**
 * Extract meaningful search terms from a Lunr query
 */
function getSearchTerms(query: string): string[] {
    // Remove Lunr special operators (+, -, ~, *, :, ^, etc.) and clean up
    const cleanQuery = query
        .replace(/[+\-~*:^]/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

    // Split into words, filter out very short terms
    return cleanQuery
        .split(/\s+/)
        .filter(term => term.length > 2)
        .slice(0, 5); // Limit to first 5 terms to avoid over-processing
}

/**
 * Find the best position in content where search terms appear
 */
function findBestMatch(content: string, terms: string[]): number {
    if (terms.length === 0) {
        return 0;
    }

    const lowerContent = content.toLowerCase();

    // Try to find the first occurrence of any search term
    let bestPos = -1;
    for (const term of terms) {
        const pos = lowerContent.indexOf(term);
        if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
            bestPos = pos;
        }
    }

    // If no match found, return start
    return bestPos === -1 ? 0 : bestPos;
}

/**
 * Create a smart excerpt around a match position
 */
function createExcerpt(content: string, matchPos: number, maxLength: number = 200): string {
    if (!content || content.length <= maxLength) {
        return content;
    }

    const halfLength = Math.floor(maxLength / 2);

    // Calculate initial start/end positions centered on match
    let start = Math.max(0, matchPos - halfLength);
    let end = Math.min(content.length, start + maxLength);

    // Adjust start if we're at the end of content
    if (end === content.length) {
        start = Math.max(0, end - maxLength);
    }

    // Try to break at word boundaries for cleaner excerpts
    if (start > 0) {
        // Look for a space within 30 chars after start
        const spacePos = content.indexOf(' ', start);
        if (spacePos !== -1 && spacePos < start + 30) {
            start = spacePos + 1;
        }
    }

    if (end < content.length) {
        // Look for a space within 30 chars before end
        const spacePos = content.lastIndexOf(' ', end);
        if (spacePos !== -1 && spacePos > end - 30) {
            end = spacePos;
        }
    }

    // Extract excerpt and add ellipsis where appropriate
    let excerpt = content.slice(start, end).trim();

    if (start > 0) {
        excerpt = '...' + excerpt;
    }
    if (end < content.length) {
        excerpt = excerpt + '...';
    }

    return excerpt;
}

/**
 * Load and deserialize a search index from KV storage
 */
async function loadIndex(
    kv: KVNamespace,
    tag: string
): Promise<{documents: MyDocument[]; index: lunr.Index} | null> {
    // Check memory cache first
    const cached = indexCache.get(tag);
    if (cached) {
        return cached;
    }

    // Load from KV
    const key = `search-index-${tag}.json`;
    const indexData = await kv.get<SearchIndex>(key, {type: 'json'});

    if (!indexData) {
        return null;
    }

    // Deserialize the Lunr index
    const index = lunr.Index.load(indexData.index);

    // Cache in memory
    const loaded = {
        documents: indexData.documents,
        index,
    };
    indexCache.set(tag, loaded);

    return loaded;
}

/**
 * Execute a search query against a loaded index
 */
async function executeSearch(
    index: lunr.Index,
    documents: MyDocument[],
    query: string,
    maxResults: number = 8
): Promise<SearchResult[]> {
    // Perform the search
    const results = index.search(query);

    // Send log to Graylog (await to ensure it completes before response is sent)
    await sendLogToGraylog(
        `Searching for ${query} returned ${results.length} results`,
        LOG_LEVELS.INFO
    );

    // Extract search terms for smart excerpt generation
    const searchTerms = getSearchTerms(query);

    // Map Lunr results to our document metadata
    const mappedResults = results
        .slice(0, maxResults)
        .map((result: lunr.Index.Result): SearchResult | null => {
            const doc = documents.find(d => d.id === parseInt(result.ref));
            if (!doc) {
                return null;
            }

            // Create smart excerpt around search term matches
            const matchPos = findBestMatch(doc.sectionContent, searchTerms);
            const excerpt = createExcerpt(doc.sectionContent, matchPos, 200);

            return {
                ...doc,
                sectionContent: excerpt, // Replace full content with smart excerpt
                score: result.score,
            };
        })
        .filter((r: SearchResult | null): r is SearchResult => r !== null);

    return mappedResults;
}

/**
 * CORS headers helper
 */
function getCorsHeaders(request: Request, allowedOrigins?: string): Record<string, string> {
    const origin = request.headers.get('Origin');

    // If no allowed origins specified, allow all
    if (!allowedOrigins) {
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
    }

    // Check if origin is in allowed list
    const allowed = allowedOrigins.split(',').map(o => o.trim());
    if (origin && allowed.includes(origin)) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            Vary: 'Origin',
        };
    }

    // Default: no CORS
    return {};
}

/**
 * Handle OPTIONS preflight requests
 */
function handleOptions(request: Request, env: Env): Response {
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env.ALLOWED_ORIGINS),
    });
}

/**
 * Handle search requests
 */
async function handleSearch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();

    try {
        let searchRequest: SearchRequest;

        // Parse request (support both GET and POST)
        const defaultTag = env.DEFAULT_TAG || 'docs-default-current';

        if (request.method === 'GET') {
            const url = new URL(request.url);
            searchRequest = {
                query: url.searchParams.get('q') || url.searchParams.get('query') || '',
                tag: url.searchParams.get('tag') || defaultTag,
                maxResults: parseInt(url.searchParams.get('maxResults') || '8'),
            };
        } else if (request.method === 'POST') {
            searchRequest = (await request.json()) as SearchRequest;
            searchRequest.tag = searchRequest.tag || defaultTag;
            searchRequest.maxResults = searchRequest.maxResults || 8;
        } else {
            return new Response(JSON.stringify({error: 'Method not allowed'}), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                },
            });
        }

        // Validate query
        if (!searchRequest.query || searchRequest.query.trim().length === 0) {
            return new Response(
                JSON.stringify({
                    error: 'Query parameter is required',
                    results: [],
                    total: 0,
                    query: '',
                    took: 0,
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                    },
                }
            );
        }

        // Load the index
        const tag = searchRequest.tag || 'default';
        const loaded = await loadIndex(env.SEARCH_INDEXES, tag);

        if (!loaded) {
            return new Response(
                JSON.stringify({
                    error: `Index not found for tag: ${tag}`,
                    availableTags: 'Use the /indexes endpoint to see available indexes',
                }),
                {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                    },
                }
            );
        }

        // Execute search
        const results = await executeSearch(
            loaded.index,
            loaded.documents,
            searchRequest.query,
            searchRequest.maxResults
        );

        const took = Date.now() - startTime;

        const response: SearchResponse = {
            results,
            total: results.length,
            query: searchRequest.query,
            took,
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
            },
        });
    } catch (error) {
        const took = Date.now() - startTime;
        console.error('Search error:', error);

        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
                took,
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                },
            }
        );
    }
}

/**
 * Handle requests to list available indexes
 */
async function handleListIndexes(request: Request, env: Env): Promise<Response> {
    try {
        // List all keys in KV (limited to search-index-* pattern)
        const list = await env.SEARCH_INDEXES.list({prefix: 'search-index-'});

        const indexes = list.keys.map((key: KVNamespaceListKey<unknown>) => ({
            tag: key.name.replace('search-index-', '').replace('.json', ''),
            key: key.name,
            // @ts-ignore - metadata exists but types may not include it
            metadata: key.metadata,
        }));

        return new Response(JSON.stringify({indexes}), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
            },
        });
    } catch (error) {
        console.error('List indexes error:', error);

        return new Response(
            JSON.stringify({
                error: 'Failed to list indexes',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                },
            }
        );
    }
}

/**
 * Handle requests to list available content files
 */
async function handleListContent(request: Request, env: Env): Promise<Response> {
    try {
        // List all keys with content: prefix
        const list = await env.SEARCH_INDEXES.list({prefix: 'content:'});

        const files = list.keys.map((key: KVNamespaceListKey<unknown>) => ({
            route: key.name.replace('content:', ''),
            key: key.name,
            // @ts-ignore - metadata exists but types may not include it
            metadata: key.metadata || {},
            // @ts-ignore
            size: key.metadata?.size || 0,
            // @ts-ignore
            filePath: key.metadata?.filePath || '',
        }));

        // Sort by route for better readability
        files.sort((a: any, b: any) => a.route.localeCompare(b.route));

        return new Response(
            JSON.stringify({
                files,
                total: files.length,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                    ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                },
            }
        );
    } catch (error) {
        console.error('List content error:', error);

        return new Response(
            JSON.stringify({
                error: 'Failed to list content',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                },
            }
        );
    }
}

/**
 * Handle requests to get full content for a route
 */
async function handleGetContent(request: Request, env: Env): Promise<Response> {
    try {
        const url = new URL(request.url);
        const route = url.searchParams.get('route');

        if (!route) {
            return new Response(
                JSON.stringify({
                    error: 'Route parameter is required',
                    usage: 'GET /content?route=/docs/getting-started',
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                    },
                }
            );
        }

        // Normalize route - strip hash fragment and trailing slashes
        let normalizedRoute = route.split('#')[0]; // Remove hash fragment
        normalizedRoute =
            normalizedRoute.endsWith('/') && normalizedRoute !== '/'
                ? normalizedRoute.slice(0, -1)
                : normalizedRoute;

        // Try to fetch from KV using content: prefix
        const key = `content:${normalizedRoute}`;
        const result = await env.SEARCH_INDEXES.getWithMetadata(key, 'text');

        await sendLogToGraylog(
            `Requested content for ${normalizedRoute}: ${result.value ? 'found' : 'not found'}`,
            LOG_LEVELS.INFO
        );

        if (!result.value) {
            return new Response(
                JSON.stringify({
                    error: 'Content not found for route: ' + normalizedRoute,
                    hint: 'Make sure you have uploaded markdown files using: dcs upload-content',
                }),
                {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                    },
                }
            );
        }

        return new Response(
            JSON.stringify({
                route: normalizedRoute,
                requestedRoute: route,
                content: result.value,
                metadata: result.metadata || {},
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                    ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                },
            }
        );
    } catch (error) {
        console.error('Get content error:', error);

        return new Response(
            JSON.stringify({
                error: 'Failed to retrieve content',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                },
            }
        );
    }
}

/**
 * Main request handler
 */
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
            return handleOptions(request, env);
        }

        // Route to appropriate handler
        if (url.pathname === '/search' || url.pathname === '/api/search') {
            return handleSearch(request, env);
        }

        if (url.pathname === '/indexes' || url.pathname === '/api/indexes') {
            return handleListIndexes(request, env);
        }

        if (url.pathname === '/list-content' || url.pathname === '/api/list-content') {
            return handleListContent(request, env);
        }

        if (url.pathname === '/content' || url.pathname === '/api/content') {
            return handleGetContent(request, env);
        }

        // Root endpoint - return API documentation
        if (url.pathname === '/' || url.pathname === '/api') {
            return new Response(
                JSON.stringify({
                    name: 'Docusaurus Search Local API',
                    version: '1.0.0',
                    endpoints: {
                        'POST /search': 'Search the documentation',
                        'GET /search?q=query&tag=default&maxResults=8':
                            'Search the documentation (GET)',
                        'GET /indexes': 'List available search indexes',
                        'GET /list-content': 'List all available markdown content files',
                        'GET /content?route=/docs/page':
                            'Get full markdown content for a specific route',
                    },
                    usage: {
                        search: {
                            method: 'POST',
                            url: '/search',
                            body: {
                                query: 'string (required)',
                                tag: 'string (optional, default: "docs-default-current")',
                                maxResults: 'number (optional, default: 8)',
                            },
                        },
                        listContent: {
                            method: 'GET',
                            url: '/list-content',
                            description:
                                'List all available markdown files uploaded via upload-content command',
                        },
                        content: {
                            method: 'GET',
                            url: '/content',
                            params: {
                                route: 'string (required) - The page route (e.g., /docs/getting-started)',
                            },
                        },
                    },
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
                    },
                }
            );
        }

        // 404 for unknown routes
        return new Response(JSON.stringify({error: 'Not found'}), {
            status: 404,
            headers: {
                'Content-Type': 'application/json',
                ...getCorsHeaders(request, env.ALLOWED_ORIGINS),
            },
        });
    },
};
