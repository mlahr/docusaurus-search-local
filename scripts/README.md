# Publishing Scripts

## Quick Publish

```bash
npm run publish
```

This runs the interactive publish script that will:
1. ✅ Check you're logged in to npm
2. ✅ Verify git working directory is clean
3. 🔨 Build the package
4. 📋 Show what will be published
5. 🚀 Prompt for confirmation
6. 📤 Publish to npm

## Manual Steps

If you prefer to publish manually:

### 1. Login to npm

```bash
npm login
```

### 2. Build the package

```bash
npm run build
```

### 3. Verify package contents

```bash
npm pack --dry-run
```

### 4. Publish

```bash
npm publish
```

## Version Bumping

Before publishing a new version, update the version number:

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

This will:
- Update `package.json`
- Create a git commit
- Create a git tag

Then push:

```bash
git push --follow-tags
```

## Pre-publish Checklist

- [ ] All changes committed and pushed
- [ ] Version number updated
- [ ] README.md is up to date
- [ ] Build succeeds (`npm run build`)
- [ ] Tests pass (when added)
- [ ] CHANGELOG.md updated (if maintaining one)

## Post-publish

After publishing, verify:

1. Package appears on npm: https://www.npmjs.com/package/@mlahr/docusaurus-cloudflare-search
2. Install works: `npm install @mlahr/docusaurus-cloudflare-search`
3. CLI works: `npx dcs --help`
