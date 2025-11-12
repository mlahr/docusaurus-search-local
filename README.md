# Lunr Search API Stack

Transform your static site into a searchable API with Lunr.js indexes deployed to Cloudflare Workers.

**What is this?** A complete toolkit that converts your documentation (Docusaurus, VitePress, etc.) into a fast, globally-distributed search API endpoint. No UI, no browser dependency - just a JSON API you can consume from anywhere.

**Key Difference:** Unlike traditional "local search" plugins that run in the browser, this creates a proper search API on Cloudflare's edge network that you can query from web apps, mobile apps, CLIs, or any HTTP client.

## What This Is (and Isn't)

❌ **NOT a Docusaurus plugin** - No UI components, no browser search bar
❌ **NOT client-side search** - Search runs on Cloudflare's edge, not in the browser
❌ **NOT coupled to your site** - The API is separate and can be used by any client

✅ **IS an index generator** - Extracts content from your built site
✅ **IS a deployment tool** - Uploads indexes to Cloudflare automatically
✅ **IS a search API** - RESTful JSON endpoint for querying your content

**Use Case:** You want a search API for your docs that can be consumed by your website, mobile app, Slack bot, CLI tool, or anything that makes HTTP requests.

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
│     GET/POST https://your-worker.workers.dev/search         │
└─────────────────────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Consume from ANYWHERE                                   │
│     - Web UI (your own search component)                    │
│     - Mobile apps (iOS/Android)                             │
│     - CLI tools                                              │
│     - Chatbots (Slack, Discord, etc.)                       │
│     - VS Code extensions                                     │
└─────────────────────────────────────────────────────────────┘
```

## Packages

### 1. [@mlahr/docusaurus-cloudflare-search](./packages/docusaurus-search-local/)
**Lunr Index Generator** (Docusaurus Plugin)

Extracts content from your Docusaurus site and generates `search-index-*.json` files during build. Can also be used standalone to index any HTML output.

```bash
npm install @mlahr/docusaurus-cloudflare-search
```

**Features:**
- Parses HTML to extract content
- Creates Lunr.js search indexes
- Multi-language support (20+ languages)
- Version/tag support for multiple indexes
- Configurable field boosting

**Output:** `build/search-index-{tag}.json`

---

### 2. [@mlahr/docusaurus-cloudflare-search-deploy](./packages/search-deploy-cli/)
**CLI Tool for Automated Deployment**

Framework-agnostic CLI that uploads search indexes to Cloudflare KV.

```bash
npm install --save-dev @mlahr/docusaurus-cloudflare-search-deploy
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

**Example Request:**
```bash
curl -X POST https://your-worker.workers.dev/search \
  -H "Content-Type: application/json" \
  -d '{"query": "installation", "maxResults": 5}'
```

**Example Response:**
```json
{
  "results": [
    {
      "id": 1,
      "pageTitle": "Getting Started",
      "sectionTitle": "Installation",
      "sectionRoute": "/docs/intro#installation",
      "type": "docs",
      "score": 2.456
    }
  ],
  "total": 1,
  "query": "installation",
  "took": 12
}
```

## Quick Start

### 1. Generate Indexes

**With Docusaurus:**

```javascript
// docusaurus.config.js
module.exports = {
  plugins: [
    [
      '@mlahr/docusaurus-cloudflare-search',
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
npm install --save-dev @mlahr/docusaurus-cloudflare-search-deploy

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

### 🚀 API-First Architecture
- **RESTful JSON API** - Query from any HTTP client
- **No UI Coupling** - Build your own search interface
- **Universal Access** - Web, mobile, CLI, bots - anything with HTTP
- **Headless Search** - Backend-as-a-Service for your docs

### ⚡ Edge Performance
- **Cloudflare Workers** - Deployed to 200+ global locations
- **Sub-50ms Response** - Worldwide edge execution
- **KV Storage** - Fast, globally replicated index storage
- **In-Memory Cache** - Hot indexes stay in Worker memory

### 🔄 Automated Pipeline
- **Build Integration** - Index generation during build process
- **Auto-Deploy** - CLI uploads indexes via postbuild hook
- **Zero Manual Steps** - Set it up once, forget about it
- **CI/CD Ready** - Works with GitHub Actions, GitLab CI, etc.

### 💰 Cost Effective
- **Free Tier Generous** - 100k requests/day free
- **No Hidden Costs** - KV storage & reads included
- **Predictable Pricing** - Pay-as-you-grow beyond free tier
- **Typical Cost: $0/month** for documentation sites

### 🛠️ Developer Experience
- **Framework Agnostic** - Docusaurus, VitePress, or any HTML generator
- **TypeScript Support** - Full type definitions included
- **Multi-Language** - 20+ languages supported (stemming, tokenization)
- **Version Aware** - Multiple indexes for different versions/locales

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

Based on work by Christian Flach ([@cmfcmf](https://github.com/cmfcmf))
Modified by [@mlahr](https://github.com/mlahr)
