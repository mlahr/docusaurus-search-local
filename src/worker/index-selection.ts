export const V1_INDEX_TAG = 'docs-default-1';
export const V3_INDEX_TAG = 'docs-default-current';

export type IndexSelectionSource = 'explicit' | 'keyword' | 'default';

export interface IndexSelection {
    tag: string;
    source: IndexSelectionSource;
}

const V1_QUERY_MARKERS = [
    /\bv1\b/i,
    /\bapi[\s_-]*version[\s_-]*1\b/i,
    /\bapi[\s_-]*v?1\b/i,
    /\bversion[\s_-]*1\b/i,
    /\blegacy\b/i,
];

const V3_QUERY_MARKERS = [
    /\bv3\b/i,
    /\bapi[\s_-]*version[\s_-]*3\b/i,
    /\bapi[\s_-]*v3\b/i,
    /\bversion[\s_-]*3\b/i,
];

function matchesAny(query: string, markers: RegExp[]): boolean {
    return markers.some(marker => marker.test(query));
}

/**
 * Select a documentation index while preserving an explicitly requested tag.
 * Ambiguous queries containing both v1 and v3 markers use the configured default.
 */
export function selectIndex(
    query: string,
    explicitTag: string | undefined,
    defaultTag: string = V3_INDEX_TAG
): IndexSelection {
    const requestedTag = explicitTag?.trim();
    if (requestedTag) {
        return {tag: requestedTag, source: 'explicit'};
    }

    const hasV1Marker = matchesAny(query, V1_QUERY_MARKERS);
    const hasV3Marker = matchesAny(query, V3_QUERY_MARKERS);

    if (hasV1Marker && !hasV3Marker) {
        return {tag: V1_INDEX_TAG, source: 'keyword'};
    }

    return {
        tag: defaultTag,
        source: 'default',
    };
}
