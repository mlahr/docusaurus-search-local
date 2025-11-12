#!/bin/bash
set -e

echo "🧪 Testing package locally"
echo ""

# Build first
echo "🔨 Building package..."
npm run build
echo "✓ Build complete"
echo ""

# Create tarball
echo "📦 Creating package tarball..."
TARBALL=$(npm pack 2>&1 | tail -n 1)
echo "✓ Created: $TARBALL"
echo ""

# Show package size
SIZE=$(du -h "$TARBALL" | cut -f1)
echo "📊 Package size: $SIZE"
echo ""

# Show package contents
echo "📋 Package contents:"
tar -tzf "$TARBALL" | head -n 30
TOTAL_FILES=$(tar -tzf "$TARBALL" | wc -l)
echo "... ($TOTAL_FILES total files)"
echo ""

# Instructions
echo "✅ Package created successfully!"
echo ""
echo "To test installation locally:"
echo "  cd /path/to/test/project"
echo "  npm install /path/to/this/repo/$TARBALL"
echo ""
echo "To link for development:"
echo "  npm link                    # in this directory"
echo "  npm link @mlahr/docusaurus-cloudflare-search  # in test project"
echo ""
echo "Clean up:"
echo "  rm $TARBALL"
