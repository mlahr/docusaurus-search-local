#!/bin/bash
set -e

echo "📦 Publishing @pdfdancer/docusaurus-cloudflare-search to npm"
echo ""

# Check if logged in to npm
if ! npm whoami &>/dev/null; then
  echo "❌ Not logged in to npm. Please run: npm login"
  exit 1
fi

# Check current npm user
NPM_USER=$(npm whoami)
echo "✓ Logged in as: $NPM_USER"
echo ""

# Check if on clean git state
if [[ -n $(git status -s) ]]; then
  echo "❌ Git working directory is not clean. Please commit or stash changes."
  git status -s
  exit 1
fi

echo "✓ Git working directory is clean"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📌 Current version: $CURRENT_VERSION"
echo ""

# Build the package
echo "🔨 Building package..."
npm run build
echo "✓ Build complete"
echo ""

# Check package contents
echo "📋 Package contents:"
npm pack --dry-run
echo ""

# Confirm publication
read -p "🚀 Publish version $CURRENT_VERSION to npm? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Publication cancelled"
  exit 1
fi

# Publish to npm
echo ""
echo "📤 Publishing to npm..."
npm publish

echo ""
echo "✅ Successfully published @pdfdancer/docusaurus-cloudflare-search@$CURRENT_VERSION"
echo ""
echo "📦 View on npm: https://www.npmjs.com/package/@pdfdancer/docusaurus-cloudflare-search"
echo "📝 Install with: npm install @pdfdancer/docusaurus-cloudflare-search"
