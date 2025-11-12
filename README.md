# Docusaurus Cloudflare Search

Transform your Docusaurus site into a searchable API deployed to Cloudflare Workers. One package, three capabilities: generate indexes, deploy to Cloudflare, serve search API.

## What It Does

1. **Generates** search indexes from your Docusaurus build
2. **Deploys** indexes to Cloudflare KV storage
3. **Serves** a fast JSON search API from Cloudflare Workers

**Not a browser plugin.** This creates a server-side API you can query from anywhere.

## Installation

```bash
npm install @mlahr/docusaurus-cloudflare-search
```

## Quick Start

### 1. Use as Docusaurus Plugin (Index Generation)

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

Build your site:
```bash
npm run build
# Generates search-index-*.json files in build/
```

### 2. Deploy to Cloudflare (CLI)

Set up Cloudflare credentials:
```bash
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token
export CLOUDFLARE_KV_NAMESPACE_ID=your-kv-namespace-id
```

Deploy indexes:
```bash
npx dcs deploy
# or
npx docusaurus-cloudflare-search deploy
```

### 3. Deploy the Worker

```bash
npm run worker:deploy
```

That's it! Your search API is now live at `https://your-worker.workers.dev/search`

## Using the API

### Search Request

```bash
curl -X POST https://your-worker.workers.dev/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "installation",
    "maxResults": 5
  }'
```

### Response

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

## CLI Commands

```bash
# Deploy indexes to Cloudflare KV
dcs deploy

# Deploy with custom build directory
dcs deploy --dir ./dist

# Dry run (show what would be deployed)
dcs deploy --dry-run

# Deploy worker
npm run worker:deploy

# Dev worker locally
npm run worker:dev
```

## Configuration

### Docusaurus Plugin Options

```javascript
{
  // Index configuration
  indexDocs: true,
  indexBlog: true,
  indexPages: false,

  // Language support
  language: "en", // or ["en", "es", "fr"]

  // Search relevance tuning
  lunr: {
    titleBoost: 5,
    contentBoost: 1,
    tagsBoost: 3,
  }
}
```

### CLI Configuration

Create `.searchdeployrc.json`:

```json
{
  "buildDir": "./build",
  "cloudflare": {
    "accountId": "${CLOUDFLARE_ACCOUNT_ID}",
    "apiToken": "${CLOUDFLARE_API_TOKEN}",
    "kvNamespaceId": "${CLOUDFLARE_KV_NAMESPACE_ID}"
  }
}
```

Or use environment variables directly.

### Worker Configuration

Edit `wrangler.toml` in your project:

```toml
name = "your-search-worker"
main = "src/worker/worker.ts"

[[kv_namespaces]]
binding = "SEARCH_INDEXES"
id = "your-kv-namespace-id"

[vars]
ALLOWED_ORIGINS = "https://yourdomain.com"
```

## Cloudflare Setup

### 1. Create KV Namespace

```bash
npx wrangler kv:namespace create SEARCH_INDEXES
```

Copy the namespace ID from the output.

### 2. Get API Credentials

- **Account ID**: Cloudflare Dashboard → Workers & Pages → Overview
- **API Token**: Cloudflare Dashboard → My Profile → API Tokens
  - Use "Edit Cloudflare Workers" template
  - Or create custom token with "Workers KV Storage:Edit" permission

### 3. Set Environment Variables

```bash
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token
export CLOUDFLARE_KV_NAMESPACE_ID=your-kv-namespace-id
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy Search

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
        run: npx dcs deploy
```

### npm Scripts

```json
{
  "scripts": {
    "build": "docusaurus build",
    "postbuild": "dcs deploy"
  }
}
```

## Features

- 🔒 **Self-Hosted** - Your data, your infrastructure
- ⚡ **Edge Performance** - Sub-50ms response times globally
- 💰 **Free Tier** - Cloudflare's generous free limits (100k requests/day)
- 🌍 **Multi-Language** - 20+ languages with proper stemming
- 📚 **Version-Aware** - Multiple indexes for different doc versions
- 🎯 **Simple** - One package, clear workflow
- 🚀 **Production-Ready** - Battle-tested Lunr.js search engine

## How It Works

```
┌──────────────────────────────────────┐
│  npm run build                       │
│  → Docusaurus builds site            │
│  → Plugin generates search indexes   │
│  → Files: build/search-index-*.json  │
└────────────────┬─────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  npx dcs deploy                      │
│  → CLI reads index files             │
│  → Uploads to Cloudflare KV          │
└────────────────┬─────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  npm run worker:deploy               │
│  → Worker deployed to Cloudflare     │
│  → API available globally            │
└────────────────┬─────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  Client queries API                  │
│  → POST /search with JSON            │
│  → Returns search results            │
└──────────────────────────────────────┘
```

## API Endpoints

### POST /search
Execute search query

**Request:**
```json
{
  "query": "getting started",
  "tag": "default",
  "maxResults": 8
}
```

**Response:**
```json
{
  "results": [...],
  "total": 5,
  "query": "getting started",
  "took": 15
}
```

### GET /search?q=query
Same as POST but via URL parameters

### GET /indexes
List available search indexes

### GET /
API documentation

## Multi-Language Support

Supports 20+ languages with proper stemming:

`ar`, `da`, `de`, `en`, `es`, `fi`, `fr`, `hi`, `hu`, `it`, `ja`, `nl`, `no`, `pt`, `ro`, `ru`, `sv`, `th`, `tr`, `vi`, `zh`

**For Chinese (zh):** Install `nodejieba`:
```bash
npm install nodejieba
```

## Troubleshooting

### "No search index files found"

Make sure you built your Docusaurus site first:
```bash
npm run build
```

Check that `build/search-index-*.json` files exist.

### "Authentication error"

Verify your Cloudflare credentials:
1. Check environment variables are set
2. Verify API token has "Workers KV Storage:Edit" permission
3. Confirm account ID is correct

### Search doesn't work in development

The plugin only generates indexes during production build (`npm run build`), not during development (`npm start`).

### Worker deployment fails

1. Install wrangler globally: `npm install -g wrangler`
2. Login: `wrangler login`
3. Check `wrangler.toml` has correct KV namespace ID

## Cost

Typical documentation site on Cloudflare **free tier**:
- ✅ Worker requests: 100,000/day
- ✅ KV storage: 1GB
- ✅ KV reads: 100,000/day

**Total: $0/month** for most documentation sites

## Requirements

- Node.js 18+
- Cloudflare account (free tier works)
- Docusaurus v3+

## License

MIT

## Author

Based on work by Christian Flach ([@cmfcmf](https://github.com/cmfcmf))
Modified by [@mlahr](https://github.com/mlahr)
