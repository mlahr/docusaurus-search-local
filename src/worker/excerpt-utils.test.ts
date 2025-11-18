import {describe, it, expect} from 'vitest';
import {getSearchTerms, findBestMatch, createExcerpt} from './excerpt-utils';

describe('getSearchTerms', () => {
    it('should extract basic search terms', () => {
        const result = getSearchTerms('hello world');
        expect(result).toEqual(['hello', 'world']);
    });

    it('should remove Lunr operators', () => {
        const result = getSearchTerms('+required -excluded ~fuzzy search* field:value');
        expect(result).toEqual(['required', 'excluded', 'fuzzy', 'search', 'field']);
    });

    it('should convert to lowercase', () => {
        const result = getSearchTerms('UPPERCASE MixedCase');
        expect(result).toEqual(['uppercase', 'mixedcase']);
    });

    it('should filter out short terms (< 3 chars)', () => {
        const result = getSearchTerms('a be cat dog');
        expect(result).toEqual(['cat', 'dog']);
    });

    it('should limit to 5 terms', () => {
        const result = getSearchTerms('one two three four five six seven eight');
        expect(result).toEqual(['one', 'two', 'three', 'four', 'five']);
    });

    it('should handle empty string', () => {
        const result = getSearchTerms('');
        expect(result).toEqual([]);
    });

    it('should handle only operators', () => {
        const result = getSearchTerms('+-~*:^');
        expect(result).toEqual([]);
    });

    it('should handle multiple spaces', () => {
        const result = getSearchTerms('hello    world     test');
        expect(result).toEqual(['hello', 'world', 'test']);
    });

    it('should handle complex Lunr queries', () => {
        const result = getSearchTerms('+authentication -password oauth2~2 api*');
        expect(result).toEqual(['authentication', 'password', 'oauth2', 'api']);
    });

    it('should trim whitespace', () => {
        const result = getSearchTerms('   hello world   ');
        expect(result).toEqual(['hello', 'world']);
    });
});

describe('findBestMatch', () => {
    const content = 'This is a sample document with authentication and security features.';

    it('should find first occurrence of search term', () => {
        const result = findBestMatch(content, ['authentication']);
        expect(result).toBe(31); // Position of 'authentication'
    });

    it('should find first term when multiple terms provided', () => {
        const result = findBestMatch(content, ['security', 'authentication']);
        expect(result).toBe(31); // 'authentication' appears first
    });

    it('should be case insensitive', () => {
        const result = findBestMatch(content, ['AUTHENTICATION']);
        expect(result).toBe(31);
    });

    it('should return 0 when no match found', () => {
        const result = findBestMatch(content, ['nonexistent']);
        expect(result).toBe(0);
    });

    it('should return 0 when terms array is empty', () => {
        const result = findBestMatch(content, []);
        expect(result).toBe(0);
    });

    it('should handle partial word matches', () => {
        const result = findBestMatch(content, ['auth']);
        expect(result).toBe(31); // Finds 'auth' in 'authentication'
    });

    it('should find earliest position when multiple matches', () => {
        const content2 = 'First word appears here. Second word appears there.';
        const result = findBestMatch(content2, ['second', 'first']);
        expect(result).toBe(0); // 'First' at position 0
    });

    it('should handle empty content', () => {
        const result = findBestMatch('', ['test']);
        expect(result).toBe(0);
    });
});

describe('createExcerpt', () => {
    it('should return full content when shorter than maxLength', () => {
        const content = 'Short content';
        const result = createExcerpt(content, 0, 200);
        expect(result).toBe('Short content');
    });

    it('should create excerpt centered on match position', () => {
        const content = 'The quick brown fox jumps over the lazy dog. This is a longer sentence to test excerpt generation with more words.';
        const matchPos = 44; // Position of "This"
        const result = createExcerpt(content, matchPos, 50);

        expect(result).toContain('This');
        expect(result.length).toBeLessThanOrEqual(60); // Including ellipsis
        expect(result).toMatch(/^\.\.\./); // Starts with ellipsis
        expect(result).toMatch(/\.\.\.$/); // Ends with ellipsis
    });

    it('should not add leading ellipsis when excerpt starts at beginning', () => {
        const content = 'The quick brown fox jumps over the lazy dog. This is a longer sentence to test excerpt generation with more words.';
        const result = createExcerpt(content, 0, 50);

        expect(result).not.toMatch(/^\.\.\./);
        expect(result).toMatch(/\.\.\.$/); // Should end with ellipsis
    });

    it('should not add trailing ellipsis when excerpt ends at end', () => {
        const content = 'The quick brown fox jumps over the lazy dog. This is a test.';
        const matchPos = 50; // Near end
        const result = createExcerpt(content, matchPos, 50);

        expect(result).toMatch(/^\.\.\./); // Should start with ellipsis
        expect(result).not.toMatch(/\.\.\.$/);
    });

    it('should attempt to break at word boundaries when possible', () => {
        // Test with content where clean word boundaries are available
        const content = 'The quick brown fox jumps over the lazy dog and runs very fast';
        const matchPos = content.indexOf('dog'); // Position where 'dog' starts
        const result = createExcerpt(content, matchPos, 30);

        // Should contain the match
        expect(result).toContain('dog');
        // Should have ellipsis since content is truncated
        expect(result).toMatch(/\.\.\./);
        // Result should be reasonable length
        expect(result.length).toBeLessThanOrEqual(40);
    });

    it('should handle empty content', () => {
        const result = createExcerpt('', 0, 200);
        expect(result).toBe('');
    });

    it('should handle match position at start', () => {
        const content = 'Start of content with many words that will be truncated because it is very long.';
        const result = createExcerpt(content, 0, 30);

        expect(result).not.toMatch(/^\.\.\./);
        expect(result).toMatch(/\.\.\.$/);
    });

    it('should handle match position at end', () => {
        const content = 'This is a very long piece of content that goes on and on and eventually ends here.';
        const matchPos = content.length - 10;
        const result = createExcerpt(content, matchPos, 30);

        expect(result).toMatch(/^\.\.\./);
        expect(result).not.toMatch(/\.\.\.$/);
    });

    it('should respect custom maxLength', () => {
        const content = 'A'.repeat(500);
        const result = createExcerpt(content, 250, 100);

        // Length should be ~100 + ellipsis (max 106 with ellipsis on both sides)
        expect(result.length).toBeLessThanOrEqual(110);
        expect(result.length).toBeGreaterThanOrEqual(90);
    });

    it('should handle content exactly at maxLength', () => {
        const content = 'A'.repeat(200);
        const result = createExcerpt(content, 0, 200);
        expect(result).toBe(content);
    });

    it('should handle match position in middle of long content', () => {
        const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
        const matchPos = content.indexOf('tempor'); // Middle of content
        const result = createExcerpt(content, matchPos, 80);

        expect(result).toContain('tempor');
        expect(result).toMatch(/^\.\.\./);
        expect(result).toMatch(/\.\.\.$/);
    });

    it('should handle very short maxLength', () => {
        const content = 'This is a test of very short excerpts';
        const result = createExcerpt(content, 10, 20);

        expect(result.length).toBeLessThanOrEqual(30); // 20 + ellipsis
    });

    it('should preserve word spacing in excerpt', () => {
        const content = 'The quick brown fox jumps over the lazy dog';
        const result = createExcerpt(content, 20, 25);

        // Should not have double spaces or weird spacing
        expect(result).not.toMatch(/\s{2,}/);
    });

    it('should handle unicode characters', () => {
        const content = 'Hello 世界 this is a test with émojis 🎉 and special chars';
        const matchPos = content.indexOf('test');
        const result = createExcerpt(content, matchPos, 30);

        expect(result).toContain('test');
    });

    it('should handle newlines in content', () => {
        const content = 'First line\nSecond line\nThird line with more content\nFourth line';
        const matchPos = content.indexOf('Third');
        const result = createExcerpt(content, matchPos, 40);

        expect(result).toContain('Third');
    });
});

describe('Integration: Full excerpt workflow', () => {
    it('should extract terms, find match, and create excerpt', () => {
        const query = 'authentication security';
        const content = 'This document describes the authentication and authorization mechanisms used in the system. Security is a top priority.';

        const terms = getSearchTerms(query);
        expect(terms).toEqual(['authentication', 'security']);

        const matchPos = findBestMatch(content, terms);
        expect(matchPos).toBeGreaterThan(0);

        const excerpt = createExcerpt(content, matchPos, 60);
        expect(excerpt).toContain('authentication');
        expect(excerpt.length).toBeLessThanOrEqual(70);
    });

    it('should handle complex Lunr query with multiple terms', () => {
        const query = '+oauth -password api* config:value';
        const content = 'Configure OAuth authentication for your API. The OAuth flow requires proper configuration of client credentials.';

        const terms = getSearchTerms(query);
        expect(terms).toContain('oauth');
        expect(terms).toContain('password');

        const matchPos = findBestMatch(content, terms);
        const excerpt = createExcerpt(content, matchPos, 80);

        expect(excerpt).toContain('OAuth');
    });

    it('should gracefully handle no matches', () => {
        const query = 'nonexistent terms';
        const content = 'This is some random content about something else entirely.';

        const terms = getSearchTerms(query);
        const matchPos = findBestMatch(content, terms);
        expect(matchPos).toBe(0);

        const excerpt = createExcerpt(content, matchPos, 30);
        expect(excerpt).toBeTruthy();
    });

    it('should handle edge case: very short content with long query', () => {
        const query = 'authentication authorization security permissions roles';
        const content = 'Quick note';

        const terms = getSearchTerms(query);
        const matchPos = findBestMatch(content, terms);
        const excerpt = createExcerpt(content, matchPos, 200);

        expect(excerpt).toBe('Quick note');
    });
});
