# API Documentation

This directory contains machine-readable API documentation for the Docusaurus Cloudflare Search API in OpenAPI 3.0 format.

## Files

- **openapi.yaml** - OpenAPI 3.0 specification in YAML format (recommended for human reading)
- **openapi.json** - OpenAPI 3.0 specification in JSON format (for tool compatibility)

## What is OpenAPI?

OpenAPI (formerly Swagger) is an industry-standard specification for describing REST APIs. It provides a machine-readable format that can be used by various tools for:

- **API Documentation** - Generate interactive documentation
- **Code Generation** - Automatically generate client SDKs and server stubs
- **API Testing** - Import into testing tools like Postman or Insomnia
- **Validation** - Validate requests and responses
- **Mocking** - Create mock servers for testing

## Using the Documentation

### 1. View Interactive Documentation

#### Using Swagger UI (Online)
Visit [Swagger Editor](https://editor.swagger.io/) and paste the contents of `openapi.yaml`

#### Using Redoc (Online)
Visit [Redoc Try It](https://redocly.github.io/redoc/) and paste the contents of `openapi.yaml`

#### Run Swagger UI Locally
```bash
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml -v $(pwd)/openapi.yaml:/openapi.yaml swaggerapi/swagger-ui
```
Then visit http://localhost:8080

### 2. Import into API Testing Tools

#### Postman
1. Open Postman
2. Click **Import**
3. Select `openapi.yaml` or `openapi.json`
4. The entire API collection will be created automatically

#### Insomnia
1. Open Insomnia
2. Click **Create** → **Import**
3. Select `openapi.yaml` or `openapi.json`

#### Bruno
1. Open Bruno
2. Click **Import Collection**
3. Select `openapi.yaml`

### 3. Generate Client Code

#### Using OpenAPI Generator

Install the generator:
```bash
npm install -g @openapitools/openapi-generator-cli
```

Generate a TypeScript client:
```bash
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./generated/typescript-client
```

Generate a Python client:
```bash
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./generated/python-client
```

Other supported languages: java, go, rust, ruby, php, csharp, kotlin, swift, and many more.

### 4. Validate the API Specification

Using Swagger CLI:
```bash
npx @apidevtools/swagger-cli validate openapi.yaml
```

Using Spectral (more comprehensive):
```bash
npx @stoplight/spectral-cli lint openapi.yaml
```

### 5. Create Mock Server

Using Prism:
```bash
npx @stoplight/prism-cli mock openapi.yaml
```

This will create a mock server at http://localhost:4010 that responds with example data.

## API Overview

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API metadata and documentation |
| GET/POST | `/search` | Search documentation |
| GET/POST | `/api/search` | Search documentation (alternate path) |
| GET | `/indexes` | List available search indexes |
| GET | `/api/indexes` | List available search indexes (alternate path) |
| GET | `/list-content` | List all markdown content files |
| GET | `/api/list-content` | List all markdown content files (alternate path) |
| GET | `/content?route={route}` | Get full markdown content for a route |
| GET | `/api/content?route={route}` | Get full markdown content (alternate path) |

### Quick Examples

#### Search Documentation
```bash
# GET request
curl "https://your-worker.workers.dev/search?q=getting%20started&maxResults=5"

# POST request
curl -X POST "https://your-worker.workers.dev/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "getting started", "maxResults": 5}'
```

#### Get Content
```bash
curl "https://your-worker.workers.dev/content?route=/docs/intro"
```

#### List Indexes
```bash
curl "https://your-worker.workers.dev/indexes"
```

## Configuration

The API supports the following environment variables:

- **ALLOWED_ORIGINS** - Comma-separated list of allowed CORS origins (default: `*`)
- **DEFAULT_TAG** - Default search index tag (default: `docs-default-current`)

If `tag` is omitted from a search request, the worker selects `docs-default-1`
when the query contains an explicit v1 or legacy marker (`v1`, `API v1`,
`version 1`, `legacy`, or `/v1/`). Other queries use `DEFAULT_TAG`, which
defaults to `docs-default-current`. An explicit `tag` always takes precedence.

## Cache Strategy

- **Search results**: 5 minutes (`max-age=300`)
- **Index listings**: 1 hour (`max-age=3600`)
- **Content**: 1 hour (`max-age=3600`)

## Storage

All data is stored in Cloudflare KV with the following key patterns:

- **Search indexes**: `search-index-{tag}.json`
- **Content files**: `content:{route}`

## Logging

The API includes built-in logging to Graylog:
- **URL**: https://logs.thefamouscat.com/gelf
- **Format**: GELF (Graylog Extended Log Format)
- **Events**: Search requests, content requests

## Framework

This API runs on **Cloudflare Workers** - a serverless edge computing platform that provides:
- Global distribution
- Low latency
- Automatic scaling
- Built-in DDoS protection

## Development

The API is implemented in TypeScript:
- **Main worker**: `src/worker/worker.ts`
- **Graylog logging**: `src/worker/graylog.ts`
- **Configuration**: `wrangler.toml`

## Support

For issues or questions, please visit the [GitHub repository](https://github.com/mlahr/docusaurus-cloudflare-search).

## Standards Compliance

This API documentation follows:
- OpenAPI Specification 3.0.3
- JSON Schema
- RFC 7231 (HTTP Semantics)
- GELF 1.1 (Graylog Extended Log Format)
