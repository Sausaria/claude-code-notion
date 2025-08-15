#!/bin/bash

echo "🚀 Migrating claude-code-notion to v2.0.1 with enterprise hardening..."

# Backup current files
echo "📦 Backing up current version..."
cp src/index.ts src/index-v1-backup.ts
cp bin/claude-code-notion bin/claude-code-notion-v1-backup

# Replace with v2 versions
echo "🔄 Installing v2 architecture..."
mv src/index-v2.ts src/index.ts
mv bin/claude-code-notion-v2 bin/claude-code-notion

# Compile TypeScript
echo "🔨 Building new version..."
npm run build

# Update package.json version
echo "📝 Updating package version..."
npm version patch --no-git-tag-version

# Update exports in package.json
echo "🔧 Updating package exports..."
cat > package-exports.json << 'EOF'
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.js"
    },
    "./errors": {
      "types": "./dist/errors.d.ts",
      "require": "./dist/errors.js"
    },
    "./circuit-breaker": {
      "types": "./dist/circuit-breaker.d.ts",
      "require": "./dist/circuit-breaker.js"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "require": "./dist/utils.js"
    }
  }
}
EOF

# Merge exports into package.json
node -e "
const pkg = require('./package.json');
const exports = require('./package-exports.json');
pkg.exports = exports.exports;
pkg.version = '2.0.1';
require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"
rm package-exports.json

echo "✅ Migration complete!"
echo ""
echo "🎯 New features added:"
echo "  ✓ Request timeouts (configurable per-call and global)"
echo "  ✓ Circuit breaker with automatic recovery"
echo "  ✓ Typed error taxonomy with proper exit codes"
echo "  ✓ Correlation IDs for request tracking"
echo "  ✓ Kill switches (CCN_WRITE_DISABLED, CCN_NETWORK_DISABLED)"
echo "  ✓ Schema validation at startup"
echo "  ✓ Health check endpoint"
echo "  ✓ Idempotency with configurable TTL"
echo ""
echo "📚 Breaking changes:"
echo "  - Errors now use CcnError type with discriminated unions"
echo "  - CLI exit codes standardized (0-8)"
echo "  - New environment variables for configuration"
echo ""
echo "🔄 Next steps:"
echo "  1. Test the new version: npm test"
echo "  2. Commit changes: git add -A && git commit -m 'feat: v2.0.1 enterprise hardening'"
echo "  3. Push and tag: git push && npm version patch && git push --tags"
echo "  4. Publish: npm publish"