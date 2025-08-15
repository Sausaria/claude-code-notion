# Publishing Guide for claude-code-notion

## Version 2.0.0 - Enterprise-Grade Release

### New Features in v2.0.0
- ✅ **Enterprise Features**: Retry/backoff, idempotency, dry-run mode
- ✅ **CLI Interface**: Full-featured command line tool with production flags
- ✅ **Structured Logging**: Pluggable logger interface with audit events
- ✅ **Security Controls**: Token redaction, environment validation
- ✅ **Production Ready**: CI/CD integration, JSON output, error handling
- ✅ **Backward Compatible**: All v1.x code continues to work unchanged

## Build & Test Workflow

### 1. Build the Package
```bash
cd /path/to/claude-code-notion
npm run build
```

### 2. Test the Build
```bash
# Test basic functionality
node -e "const {createRoadmapFromEnv} = require('./dist'); console.log('✅ Package loads successfully')"

# Test CLI
./bin/claude-code-notion --help

# Test enterprise features
node test-extraction.js
```

### 3. Test in Production Environment
```bash
# Set environment variables
export NOTION_API_KEY="secret_your_token"
export NOTION_DATABASE_ID="your-database-id"

# Test CLI commands
npx claude-code-notion search "test" --dry-run --json
npx claude-code-notion complete "Test Task" --dry-run --idempotent
```

## Publishing to NPM

### First-time Setup
```bash
# Login to npm
npm login
# Username: [your npm username]
# Password: [your password]
# Email: [your email]
```

### Publish the Package
```bash
cd /path/to/claude-code-notion

# Ensure clean build
npm run clean
npm run build

# Verify package contents
npm pack --dry-run

# Publish to npm
npm publish --access public

# Or if updating existing package
npm version patch  # or minor/major
npm publish
```

## Using in Other Projects

### Install from NPM
```bash
# In any project directory
npm install claude-code-notion

# Or with specific version
npm install claude-code-notion@2.0.0
```

### Basic Setup (v1.x Compatible)
```javascript
// .env.local
NOTION_API_KEY=secret_your_api_key_here

// index.js
const { createRoadmapFromEnv } = require('claude-code-notion');

const roadmap = createRoadmapFromEnv('your-database-id');
await roadmap.complete('Task Name'); // Works exactly like v1.x
```

### Enterprise Setup (v2.0 Features)
```javascript
const { createRoadmapFromEnv } = require('claude-code-notion');

const roadmap = createRoadmapFromEnv('your-database-id', {
  enterprise: {
    idempotency: { enabled: true },
    retries: { attempts: 5 },
    dryRun: false,
    logger: customLogger
  }
});

// Now with automatic retry, idempotency, and logging
await roadmap.complete('Task Name');
```

### CLI Usage
```bash
# Production automation
export NOTION_API_KEY="secret_your_token"
export NOTION_DATABASE_ID="your-database-id"

# Safe preview
npx claude-code-notion complete "Deploy Feature X" --dry-run --idempotent

# Production execution with audit trail
npx claude-code-notion complete "Deploy Feature X" --json --idempotent > audit.log
```

## Version History

### v2.0.0 (Current - Enterprise Release)
- **Enterprise Features**: Retry/backoff, idempotency, dry-run mode
- **CLI Interface**: Full command line tool with production flags
- **Security Controls**: Token redaction, environment validation
- **Structured Logging**: Audit trails and pluggable loggers
- **Production Ready**: CI/CD integration, comprehensive error handling
- **100% Backward Compatible**: All v1.x code works unchanged

### v1.1.0
- Added `getFullProjectData()` for complete data extraction
- Enhanced content parsing for objectives and user flows
- Added support for all Notion property types
- Improved error handling and type safety

### v1.0.0
- Initial release
- Basic CRUD operations
- Status management
- Search functionality

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### CLI Issues
```bash
# Test CLI directly
./bin/claude-code-notion --help

# Check environment
npx claude-code-notion search "test" --json
```

### Enterprise Feature Issues
```bash
# Test with dry-run mode
npx claude-code-notion complete "Test" --dry-run --json

# Verify token format
echo $NOTION_API_KEY | grep -E '^(secret_|ntn_)'
```

### API Token Issues
- Ensure `NOTION_API_KEY` starts with `secret_` or `ntn_`
- Verify database is shared with integration
- Check token has read/write permissions
- Use environment validation: rejects placeholder tokens automatically

## Production Deployment

### CI/CD Integration
```yaml
# .github/workflows/deploy.yml
- name: Update roadmap on deploy
  run: |
    npm install claude-code-notion
    npx claude-code-notion complete "${{ github.event.head_commit.message }}" --idempotent --json
  env:
    NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
    NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
```

### Environment Setup
```bash
# Required environment variables
export NOTION_API_KEY="secret_your_integration_token"
export NOTION_DATABASE_ID="your-database-uuid"

# Optional: Custom logger endpoint
export AUDIT_WEBHOOK_URL="https://your-monitoring.com/audit"
```

## Support

For issues or questions:
- **GitHub**: https://github.com/Sausaria/claude-code-notion
- **NPM**: https://www.npmjs.com/package/claude-code-notion
- **Documentation**: See README.md for comprehensive API reference
- **Security**: See README.md Security section for enterprise features