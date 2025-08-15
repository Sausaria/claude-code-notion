# Publishing Guide for @danielharris/notion-roadmap-manager

## Version 1.1.0 - Enhanced with Full Data Extraction

### New Features in v1.1.0
- ✅ `getFullProjectData()` - Extract ALL project information
- ✅ `getTaskDetails()` - Get objective, user flow, and content
- ✅ `updatePageContent()` - Edit project objectives and user flows
- ✅ Enhanced search with automatic content extraction
- ✅ Support for multi-select, people, and date properties

## Build & Test Workflow

### 1. Build the Package
```bash
cd /Users/danielharris/notion-roadmap-manager
npm run build
```

### 2. Test the Build
```bash
# Test extraction capabilities
node test-extraction.js

# Expected output:
# ✅ Roadmap manager initialized
# ✅ All tests completed successfully!
```

### 3. Test in Lurnor Project
```bash
cd /Users/danielharris/LMS/project

# Update to latest build
npm link @danielharris/notion-roadmap-manager

# Test with npm scripts
npm run notion:search "Agent License Renewal"
```

## Publishing to NPM

### First-time Setup
```bash
# Login to npm
npm login
# Username: danielharris
# Password: [your password]
# Email: [your email]
```

### Publish the Package
```bash
cd /Users/danielharris/notion-roadmap-manager

# Ensure clean build
npm run clean
npm run build

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
npm install @danielharris/notion-roadmap-manager

# Or with specific version
npm install @danielharris/notion-roadmap-manager@1.1.0
```

### Basic Setup
```javascript
// .env.local
NOTION_API_KEY=ntn_your_api_key_here

// index.js
const { createRoadmapFromEnv } = require('@danielharris/notion-roadmap-manager');

const roadmap = createRoadmapFromEnv('your-database-id');

// Use all features
const fullData = await roadmap.getFullProjectData('Project Name');
```

## Version History

### v1.1.0 (Current)
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

### Link Issues
```bash
# Unlink and relink
npm unlink @danielharris/notion-roadmap-manager
npm link @danielharris/notion-roadmap-manager
```

### API Token Issues
- Ensure `NOTION_API_KEY` starts with `ntn_` or `secret_`
- Verify database is shared with integration
- Check token has read/write permissions

## Support

For issues or questions:
- GitHub: https://github.com/danielharris/notion-roadmap-manager
- NPM: https://www.npmjs.com/package/@danielharris/notion-roadmap-manager