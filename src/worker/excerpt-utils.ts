/**
 * Utility functions for creating smart excerpts from search results
 */

/**
 * Extract meaningful search terms from a Lunr query
 */
export function getSearchTerms(query: string): string[] {
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
export function findBestMatch(content: string, terms: string[]): number {
    if (terms.length === 0) {
        return 0;
    }

    const lowerContent = content.toLowerCase();

    // Try to find the first occurrence of any search term
    let bestPos = -1;
    for (const term of terms) {
        const pos = lowerContent.indexOf(term.toLowerCase());
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
export function createExcerpt(content: string, matchPos: number, maxLength: number = 200): string {
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
