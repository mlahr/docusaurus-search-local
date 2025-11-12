# Technical Architecture - Docusaurus Search Local

## Overview

This is a Docusaurus plugin that provides client-side, self-hosted search functionality. It consists of two main components: a build-time indexer and a runtime search interface.

## Architecture

### Build-Time (Server-Side) - `src/server/`

**When it runs:** During `npm run build` (Docusaurus production build)

**What it does:**

1. **HTML Parsing** (`parse.ts`)
   - Reads all generated HTML files from Docusaurus build output
   - Uses `cheerio` (jQuery-like HTML parser) to extract content
   - Parses different page types: docs, blog posts, static pages
   - Extracts:
     - Page titles
     - Section headings (h1, h2, h3)
     - Text content (with proper spacing for block elements)
     - Tags/categories
     - Sidebar parent categories
   - Removes noise: copy buttons, version badges, hash links

2. **Index Generation** (`index.ts`)
   - Creates lunr.js search indexes (one per `docusaurus_tag`)
   - `docusaurus_tag` represents version/locale combinations
   - Each document is split into sections (by heading)
   - Indexes multiple fields with different boost weights:
     - `title` (default boost: 5)
     - `content` (default boost: 1)
     - `tags` (default boost: 3)
     - `sidebarParentCategories` (default boost: 2)

3. **Output**
   - Generates `search-index-{tag}.json` files in build directory
   - Each file contains:
     - Serialized lunr.js index
     - Document metadata (titles, routes, types)
   - These are deployed as static assets alongside your site

### Runtime (Client-Side) - `src/client/`

**When it runs:** In the user's browser when they visit your site

**What it does:**

1. **Search UI** (`theme/SearchBar/index.tsx`)
   - Uses Algolia Autocomplete component (UI library only, no API calls)
   - Renders search box in navigation bar
   - Integrates with Docusaurus theming and i18n

2. **Index Loading**
   - Lazy loads search index JSON files via fetch()
   - Uses Docusaurus contextual filters to determine which index to load
   - Caches loaded indexes in memory
   - Only works in production builds (not `npm start`)

3. **Search Execution**
   - Tokenizes user's search query
   - Runs lunr.js query in browser against loaded index
   - Performs searches with:
     - Exact matches
     - Trailing wildcard matches
     - Field-specific boosting
   - Sorts results by relevance score
   - Limits to `maxSearchResults` (default: 8)

4. **Search Highlighting** (`HighlightSearchResults.tsx`)
   - Uses mark.js to highlight search terms on result pages
   - Activated when navigating from search results
   - Highlights terms in the page content

## Key Technologies

- **lunr.js**: Client-side full-text search library
- **cheerio**: Server-side HTML parsing
- **Algolia Autocomplete**: Search UI component library (no API/backend)
- **mark.js**: Text highlighting library
- **lunr-languages**: Multi-language stemming support

## What "Local" Means

The term "local" in this context means:

1. **Self-Hosted Index**: The search index is built during your build process and deployed with your site (not sent to a third-party service)

2. **Client-Side Execution**: Search queries run entirely in the user's browser using JavaScript (no API calls to search servers)

3. **No External Dependencies**: No runtime dependencies on third-party search services like Algolia, Elasticsearch, etc.

4. **Firewall-Friendly**: Works in air-gapped environments or behind corporate firewalls since no external connections are needed

**Contrast with Algolia DocSearch:**
- Algolia: You send docs → They index → Users query their API → Results from their servers
- This plugin: You index → Deploy with site → Users query in browser → Results from local computation

## Data Flow

### Build Time
```
Docusaurus Build
  ↓
HTML Files Generated
  ↓
Plugin postBuild Hook
  ↓
Parse HTML (cheerio)
  ↓
Extract Content
  ↓
Build lunr.js Indexes
  ↓
Write search-index-{tag}.json
  ↓
Deploy to Static Hosting
```

### Runtime
```
User Opens Site
  ↓
SearchBar Component Loads
  ↓
User Types Query
  ↓
Fetch search-index-{tag}.json (lazy, cached)
  ↓
Parse JSON & Load lunr.js Index
  ↓
Tokenize Query
  ↓
lunr.js Query Execution (in browser)
  ↓
Sort & Limit Results
  ↓
Display in Autocomplete UI
  ↓
Navigate to Result
  ↓
Highlight Search Terms (mark.js)
```

## Multi-Language Support

### Build Time
- **Chinese (zh)**: Uses `nodejieba` for word segmentation during indexing
- **Japanese (ja)**: Uses `tinyseg` tokenizer
- **Thai (th), Hindi (hi)**: Uses `wordcut` tokenizer
- **Other languages**: Uses lunr-languages stemmer support

### Runtime
- **Chinese**: Custom tokenizer splits on whitespace/separator (nodejieba only works in Node.js)
- **Japanese/Thai**: Uses lunr language-specific tokenizers
- **Other languages**: Uses lunr.tokenizer

## Configuration Options

### Indexing Options
- `indexDocs`: Index documentation pages (default: true)
- `indexBlog`: Index blog posts (default: true)
- `indexPages`: Index static pages (default: false)
- `indexDocSidebarParentCategories`: Include parent category breadcrumbs in index (default: 0)
- `includeParentCategoriesInPageTitle`: Show category path in results (default: false)

### Search Behavior
- `language`: Language(s) for stemming/tokenization (default: "en")
- `maxSearchResults`: Maximum results to display (default: 8)
- `lunr.tokenizerSeparator`: Regex for splitting text into tokens (default: /[\s\-]+/)

### Relevance Tuning (lunr.js BM25 parameters)
- `lunr.b`: Document length normalization (0-1, default: 0.75)
- `lunr.k1`: Term frequency saturation (default: 1.2)
- `lunr.titleBoost`: Title match weight (default: 5)
- `lunr.contentBoost`: Content match weight (default: 1)
- `lunr.tagsBoost`: Tag match weight (default: 3)
- `lunr.parentCategoriesBoost`: Category match weight (default: 2)

## Why Search Doesn't Work in Development

The plugin only generates indexes during production build (`postBuild` hook). During development (`npm start`):
- No HTML files are generated to disk
- No search indexes are created
- The plugin returns an empty index to avoid errors

To test search locally:
```bash
npm run build  # Generate indexes
npm run serve  # Serve built site
```

## File Structure

```
packages/docusaurus-search-local/
├── src/
│   ├── server/           # Build-time code (Node.js)
│   │   ├── index.ts      # Main plugin, index generation
│   │   ├── parse.ts      # HTML parsing logic
│   │   └── logger.ts     # Debug logging
│   ├── client/           # Runtime code (Browser)
│   │   └── theme/
│   │       └── SearchBar/
│   │           ├── index.tsx              # Search UI component
│   │           ├── HighlightSearchResults.tsx
│   │           └── d-s-l-a-generated.js  # Generated lunr config
│   ├── types.ts          # TypeScript types
│   └── lunr.js           # Bundled lunr.js library
├── codeTranslations/     # i18n translations for UI
└── lib/                  # Compiled output
```

## Performance Characteristics

### Index Size
- Depends on documentation size
- Typical: 100-500 KB per index (compressed)
- Splits by version/locale to keep indexes smaller

### Search Speed
- Extremely fast (< 50ms typically)
- All computation happens in browser memory
- No network latency for queries

### Initial Load
- Index fetched lazily (when user first opens search)
- Cached in memory for session
- Negligible impact on initial page load

## Debugging

Set `DEBUG=1` environment variable during build:
```bash
DEBUG=1 npm run build
```

This enables detailed logging of:
- Which pages are being indexed
- Content extraction process
- Index generation progress
