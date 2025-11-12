# Docusaurus Cloudflare Search

Transform your Docusaurus site into a searchable API deployed to Cloudflare Workers. One package, three capabilities: generate indexes, deploy to Cloudflare, serve search API.

## What It Does

1. **Generates** search indexes from your Docusaurus build
2. **Deploys** indexes to Cloudflare KV storage
3. **Serves** a fast JSON search API from Cloudflare Workers

**Not a browser plugin.** This creates a server-side API you can query from anywhere.

## Installation

**In your Docusaurus project directory:**

```bash
npm install @mlahr/docusaurus-cloudflare-search
```

## Quick Start

### Step 1: Configure Docusaurus Plugin

**📁 In your Docusaurus project** - Edit `docusaurus.config.js`:

```javascript
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

### Step 2: Build Your Site

**📁 In your Docusaurus project:**

```bash
npm run build
# ✓ Generates search-index-*.json files in build/
```

### Step 3: Set Up Cloudflare (One-Time)

Create a KV namespace:

```bash
npx wrangler kv:namespace create SEARCH_INDEXES
# Copy the namespace ID from output
```

Set environment variables:

```bash
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token
export CLOUDFLARE_KV_NAMESPACE_ID=your-kv-namespace-id
```

### Step 4: Deploy Search Indexes

**📁 In your Docusaurus project:**

```bash
npx dcs deploy
# ✓ Uploads search indexes to Cloudflare KV
```

### Step 5: Deploy the Worker

**📁 In the package directory** (or copy `wrangler.toml` to your project):

First, update `wrangler.toml` with your KV namespace ID:

```toml
[[kv_namespaces]]
binding = "SEARCH_INDEXES"
id = "your-kv-namespace-id"  # From Step 3
```

Then deploy:

```bash
npx wrangler deploy
# ✓ Worker live at https://your-worker.workers.dev
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

**📁 In your Docusaurus project directory:**

```bash
# Deploy indexes to Cloudflare KV
npx dcs deploy

# Deploy with custom build directory
npx dcs deploy --dir ./dist

# Dry run (show what would be deployed)
npx dcs deploy --dry-run
```

**📁 For worker management:**

```bash
# Deploy worker to Cloudflare
npx wrangler deploy

# Test worker locally
npx wrangler dev
```

## Configuration

### Docusaurus Plugin Options

**📁 In your Docusaurus project** - `docusaurus.config.js`:

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

### CLI Configuration (Optional)

**📁 In your Docusaurus project** - Create `.searchdeployrc.json`:

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

**Or use environment variables** (recommended for CI/CD):

```bash
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token
export CLOUDFLARE_KV_NAMESPACE_ID=your-kv-namespace-id
```

### Worker Configuration

**📁 Copy `wrangler.toml` from this package** to your project root, or create your own:

```toml
name = "your-search-worker"
main = "node_modules/@mlahr/docusaurus-cloudflare-search/src/worker/worker.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "SEARCH_INDEXES"
id = "your-kv-namespace-id"  # From wrangler kv:namespace create

[vars]
ALLOWED_ORIGINS = "https://yourdomain.com"  # Optional: restrict CORS
DEFAULT_TAG = "docs-default-current"  # Optional: default search index (defaults to "docs-default-current")
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
  "tag": "docs-default-current",
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

## Understanding Search Index Tags

Docusaurus can generate multiple search indexes based on your site structure. Each index has a "tag" that identifies it:

- **docs-default-current**: Your main documentation (most common)
- **blog-default**: Your blog posts (if indexBlog is enabled)
- **default**: Fallback/other pages

The worker defaults to searching `docs-default-current` since that's where most content lives.

### Finding Available Tags

To see what indexes are available:

```bash
curl https://your-worker.workers.dev/indexes
```

### Searching a Specific Tag

```bash
# Search in docs
curl https://your-worker.workers.dev/search?q=installation&tag=docs-default-current

# Search in blog
curl https://your-worker.workers.dev/search?q=announcement&tag=blog-default
```

### Changing the Default Tag

If you want to change which index is searched by default, set the `DEFAULT_TAG` environment variable in your `wrangler.toml`:

```toml
[vars]
DEFAULT_TAG = "blog-default"  # Or any other tag
```

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

## Development & Testing

> **Note:** This section is for package developers only. If you're using this package in your Docusaurus site, you don't need this section.

### Testing Locally Before Publishing

**📁 For package developers** - There are several ways to test the package locally before publishing to npm:

#### Option 1: Using npm pack (Recommended)

This creates a tarball exactly like npm would publish, giving you the most realistic test:

```bash
# In the package directory
npm run build
npm pack
```

This creates `mlahr-docusaurus-cloudflare-search-1.0.0.tgz`. Install it in your test project:

```bash
# In your test Docusaurus project
npm install /path/to/docusaurus-cloudflare-search/mlahr-docusaurus-cloudflare-search-1.0.0.tgz
```

#### Option 2: Using npm link

For faster iteration during development:

```bash
# In the package directory
npm run build
npm link

# In your test Docusaurus project
npm link @mlahr/docusaurus-cloudflare-search
```

Changes you make will be reflected immediately after rebuilding. To unlink:

```bash
# In the test project
npm unlink @mlahr/docusaurus-cloudflare-search

# In the package directory
npm unlink
```

#### Option 3: Using File Path

In your test project's `package.json`:

```json
{
  "dependencies": {
    "@mlahr/docusaurus-cloudflare-search": "file:../docusaurus-cloudflare-search"
  }
}
```

Then run `npm install`.

### Testing Checklist

**1. Test as Docusaurus Plugin**

```javascript
// docusaurus.config.js
module.exports = {
  plugins: [
    ['@mlahr/docusaurus-cloudflare-search', {
      indexDocs: true,
      indexBlog: true,
      language: 'en',
    }],
  ],
};
```

Build your site and verify indexes are generated:
```bash
npm run build
ls build/search-index-*.json
```

**2. Test CLI Commands**

```bash
# Check CLI is accessible
npx docusaurus-cloudflare-search --version
npx dcs --version

# Test commands
npx dcs init
npx dcs deploy --dry-run
```

**3. Test Worker Build**

```bash
npm run build:worker
```

## Requirements

- Node.js 18+
- Cloudflare account (free tier works)
- Docusaurus v3+

## License

MIT

## Author

Based on work by Christian Flach ([@cmfcmf](https://github.com/cmfcmf))
Modified by [@mlahr](https://github.com/mlahr)
