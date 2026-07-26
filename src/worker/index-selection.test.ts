import {describe, expect, it} from 'vitest';
import {selectIndex, V1_INDEX_TAG, V3_INDEX_TAG} from './index-selection';

describe('selectIndex', () => {
    it.each([
        'v1 Python PDFDancer',
        'API v1 page builder',
        'version 1',
        'legacy SDK',
        '/v1/reference',
    ])('selects v1 for explicit marker: %s', query => {
        expect(selectIndex(query, undefined)).toEqual({
            tag: V1_INDEX_TAG,
            source: 'keyword',
        });
    });

    it.each(['Python PDFDancer page size', 'v3 TypeScript API', 'version 3'])(
        'uses v3 for ordinary or v3 query: %s',
        query => {
            expect(selectIndex(query, undefined)).toEqual({
                tag: V3_INDEX_TAG,
                source: 'default',
            });
        }
    );

    it('preserves an explicitly requested tag', () => {
        expect(selectIndex('v1 Python', 'docs-default-current')).toEqual({
            tag: V3_INDEX_TAG,
            source: 'explicit',
        });
    });

    it('uses the default for an ambiguous query', () => {
        expect(selectIndex('v1 and v3 migration', undefined)).toEqual({
            tag: V3_INDEX_TAG,
            source: 'default',
        });
    });

    it('uses a configured default when no marker matches', () => {
        expect(selectIndex('Python PDFDancer', undefined, 'custom-index')).toEqual({
            tag: 'custom-index',
            source: 'default',
        });
    });
});
