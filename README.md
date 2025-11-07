# Lunr Search Stack for Static Sites

A complete solution for adding search to static sites using Lunr.js indexes deployed to Cloudflare Workers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  1. Build Site → Generate Lunr Search Indexes               │
│     (Docusaurus plugin or custom generator)                 │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Upload Indexes to Cloudflare KV                         │
│     (CLI tool - automated via postbuild hook)               │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Serve Search API from Cloudflare Workers                │
│     (Edge function - global, fast, free tier)               │
└─────────────────────────────────────────────────────────────┘
```

## Packages

### 1. [@cmfcmf/docusaurus-search-local](./packages/docusaurus-search-local/)
**Lunr Index Generator for Docusaurus**

Docusaurus plugin that generates `search-index-*.json` files during build.

```bash
npm install @cmfcmf/docusaurus-search-local
```

**Features:**
- Parses HTML to extract content
- Creates Lunr.js search indexes
- Multi-language support (20+ languages)
- Version/tag support for multiple indexes
- Configurable field boosting

**Output:** `build/search-index-{tag}.json`

---

### 2. [@cmfcmf/docusaurus-search-deploy](./packages/search-deploy-cli/)
**CLI Tool for Automated Deployment**

Framework-agnostic CLI that uploads search indexes to Cloudflare KV.

```bash
npm install --save-dev @cmfcmf/docusaurus-search-deploy
```

**Features:**
- Auto-detects `search-index-*.json` files
- Uploads to Cloudflare KV storage
- Integrates with build process (postbuild hook)
- Environment variable configuration
- Works with any static site generator

**Usage:**
```bash
# Setup
npx search-deploy init

# Add to package.json
{
  "scripts": {
    "build": "docusaurus build",
    "postbuild": "search-deploy"
  }
}

# Build & deploy
npm run build
```

---

### 3. [Cloudflare Worker](./packages/cloudflare-worker/)
**Search API Endpoint**

Lightweight Cloudflare Worker that serves search results as JSON.

```bash
cd packages/cloudflare-worker
npm install
npm run deploy
```

**API Endpoints:**
- `POST /search` - Execute search query
- `GET /search?q=query` - Execute search (GET)
- `GET /indexes` - List available indexes

**Features:**
- Loads indexes from KV storage
- In-memory caching for fast responses
- CORS support (configurable)
- Global edge deployment (~20-50ms response time)

**Example:**
```bash
curl -X POST https://your-worker.workers.dev/search \
  -H "Content-Type: application/json" \
  -d '{"query": "installation"}'
```

## Quick Start

### 1. Generate Indexes

**With Docusaurus:**

```javascript
// docusaurus.config.js
module.exports = {
  plugins: [
    [
      '@cmfcmf/docusaurus-search-local',
      {
        indexDocs: true,
        indexBlog: true,
      },
    ],
  ],
};
```

**With other static site generators:**

Generate files matching this format:

```json
{
  "documents": [
    {
      "id": 1,
      "pageTitle": "Getting Started",
      "sectionTitle": "Installation",
      "sectionRoute": "/docs/intro#installation",
      "type": "docs"
    }
  ],
  "index": {
    // Serialized Lunr.js index
  }
}
```

### 2. Set Up Deployment

```bash
# Install CLI
npm install --save-dev @cmfcmf/docusaurus-search-deploy

# Initialize
npx search-deploy init

# Set environment variables
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token
export CLOUDFLARE_KV_NAMESPACE_ID=your-kv-namespace-id

# Add to package.json
{
  "scripts": {
    "postbuild": "search-deploy"
  }
}
```

### 3. Deploy Worker

```bash
cd packages/cloudflare-worker
npm install
npm run deploy
```

### 4. Use the API

```javascript
async function search(query) {
  const response = await fetch('https://your-worker.workers.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
}

const results = await search('getting started');
```

## Features

### ✅ Complete Solution
- Index generation ✓
- Automated deployment ✓
- JSON Search API ✓

### ✅ Framework Agnostic
- Works with Docusaurus
- Works with any Lunr.js implementation
- No UI coupling - pure API

### ✅ Fast & Free
- Cloudflare edge deployment
- Global CDN (200+ locations)
- Free tier sufficient for most sites
- ~20-50ms response times worldwide

### ✅ Developer Friendly
- Zero manual steps after setup
- Automatic index updates
- CI/CD ready
- Comprehensive documentation

## CI/CD Example

```yaml
# .github/workflows/deploy.yml
name: Deploy Site

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run build

      - name: Deploy search indexes
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_KV_NAMESPACE_ID: ${{ secrets.CLOUDFLARE_KV_NAMESPACE_ID }}
        run: npx search-deploy
```

## Documentation

- **Index Generator:** [packages/docusaurus-search-local/README.md](./packages/docusaurus-search-local/README.md)
- **CLI Tool:** [packages/search-deploy-cli/README.md](./packages/search-deploy-cli/README.md)
- **Worker API:** [packages/cloudflare-worker/README.md](./packages/cloudflare-worker/README.md)

## Requirements

- **Node.js:** 18+
- **Cloudflare Account:** Free tier works
- **Static Site:** Generating HTML pages

## Cost

Typical documentation site on Cloudflare free tier:
- Worker requests: 100,000/day (free)
- KV storage: 1GB (free)
- KV reads: 100,000/day (free)

**Total: $0/month** ✅

## License

MIT

## Author

Christian Flach ([@cmfcmf](https://github.com/cmfcmf))
