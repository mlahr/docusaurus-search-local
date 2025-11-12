import fs from 'fs';
import path from 'path';
import { Config } from './config';
import matter from 'gray-matter';

interface UploadOptions {
  dryRun?: boolean;
}

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir: string, baseDir: string = dir): Array<{ filePath: string; relativePath: string }> {
  const results: Array<{ filePath: string; relativePath: string }> = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      results.push(...findMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      const relativePath = path.relative(baseDir, fullPath);
      results.push({ filePath: fullPath, relativePath });
    }
  }

  return results;
}

/**
 * Convert file path to route
 * Examples:
 *   docs/getting-started.md -> /getting-started
 *   docs/guides/installation.md -> /guides/installation
 *   docs/index.md -> /
 */
function filePathToRoute(relativePath: string): string {
  // Remove file extension
  let route = relativePath.replace(/\.(md|mdx)$/, '');

  // Replace backslashes with forward slashes (Windows)
  route = route.replace(/\\/g, '/');

  // Handle index files
  if (route.endsWith('/index') || route === 'index') {
    route = route.replace(/\/?index$/, '');
  }

  // Ensure leading slash
  if (!route.startsWith('/')) {
    route = '/' + route;
  }

  // Ensure at least /
  if (route === '') {
    route = '/';
  }

  return route;
}

/**
 * Upload markdown content files to Cloudflare KV
 */
export async function uploadContent(config: Config, options: UploadOptions = {}) {
  console.log('📄 Uploading markdown content to Cloudflare KV...');

  // Determine content directory
  const contentDir = config.contentDir || path.join(process.cwd(), 'docs');

  if (!fs.existsSync(contentDir)) {
    throw new Error(`Content directory not found: ${contentDir}`);
  }

  console.log(`📂 Scanning for markdown files in: ${contentDir}`);

  // Find all markdown files
  const markdownFiles = findMarkdownFiles(contentDir);

  if (markdownFiles.length === 0) {
    console.log('⚠️  No markdown files found');
    return;
  }

  console.log(`📝 Found ${markdownFiles.length} markdown file(s)`);

  // Prepare bulk write payload
  const kvEntries = [];

  for (const { filePath, relativePath } of markdownFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse frontmatter to get custom slug/permalink if available
    const { data: frontmatter } = matter(content);

    // Determine the route
    let route = filePathToRoute(relativePath);

    // Override with frontmatter slug or permalink if present
    if (frontmatter.slug) {
      route = frontmatter.slug.startsWith('/') ? frontmatter.slug : '/' + frontmatter.slug;
    } else if (frontmatter.permalink) {
      route = frontmatter.permalink;
    }

    // Create KV key - prefix with "content:" to separate from search indexes
    const key = `content:${route}`;

    kvEntries.push({
      key,
      value: content,
      metadata: {
        filePath: relativePath,
        size: Buffer.byteLength(content, 'utf-8'),
      }
    });

    console.log(`  • ${relativePath} → ${key}`);
  }

  if (options.dryRun) {
    console.log('\n🏃 Dry run - would upload the following:');
    console.log(`   Total files: ${kvEntries.length}`);
    const totalSize = kvEntries.reduce((sum, entry) => sum + (entry.metadata?.size || 0), 0);
    console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
    return;
  }

  // Upload to Cloudflare KV using bulk write API
  console.log(`\n☁️  Uploading to Cloudflare KV...`);

  const url = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.accountId}/storage/kv/namespaces/${config.cloudflare.kvNamespaceId}/bulk`;

  // KV bulk write has a limit, so we need to chunk if there are many files
  const chunkSize = 10000; // KV limit is 10k per request

  for (let i = 0; i < kvEntries.length; i += chunkSize) {
    const chunk = kvEntries.slice(i, i + chunkSize);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.cloudflare.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload content: ${response.status} ${response.statusText}\n${error}`);
    }

    console.log(`  ✓ Uploaded ${chunk.length} file(s) (batch ${Math.floor(i / chunkSize) + 1})`);
  }

  console.log(`\n✅ Successfully uploaded ${kvEntries.length} markdown file(s)`);
}
