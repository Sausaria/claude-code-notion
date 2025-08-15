# Changelog

All notable changes to claude-code-notion will be documented in this file.

## [2.0.0] - 2025-08-15

### 🚀 Major Release: Enterprise-Grade Features

This release transforms `claude-code-notion` from a basic API wrapper into a production-ready enterprise integration platform. **All changes are backward compatible** — existing v1.x code continues to work unchanged.

### ✨ New Features

#### Enterprise SDK Options
- **Retry/Backoff**: Automatic retry with exponential backoff and jitter
- **Idempotency**: Skip operations when values haven't changed  
- **Dry Run Mode**: Preview changes without writing to Notion
- **Structured Logging**: Pluggable logger interface with audit events
- **Secret Protection**: Automatic token redaction in logs
- **Environment Validation**: Reject placeholder tokens automatically

#### CLI Interface
- **Full CLI**: `npx claude-code-notion <command>` with enterprise features
- **Production Flags**: `--dry-run`, `--json`, `--idempotent`, `--retries=N`
- **CI/CD Ready**: Structured JSON output perfect for automation
- **Environment Guard**: Validates tokens and database IDs

### 📖 Enterprise Quick Start

**SDK (Enterprise Mode)**:
```typescript
const manager = createRoadmapFromEnv(databaseId, {
  enterprise: {
    idempotency: { enabled: true },
    retries: { attempts: 5 },
    logger: auditLogger
  }
});
```

**CLI (Production)**:
```bash
npx claude-code-notion complete "Task" --idempotent --json --retries=5
```

### 🔧 Technical Details

#### API Enhancements
- Added `EnterpriseOptions` interface for opt-in features
- Added `Logger` interface for structured logging
- Added `RetryConfig` and `IdempotencyConfig` interfaces
- Enhanced all core methods with retry logic and idempotency checks

#### CLI Features
- Environment validation with placeholder detection
- Structured JSON output mode
- Comprehensive help system
- Production-ready error handling

#### Developer Experience
- Full TypeScript support for all new features
- Comprehensive documentation and examples
- Zero breaking changes for existing users
- Clear migration path to enterprise features

### 🛡️ Security & Reliability

- **Token Security**: Automatic secret redaction in all logs
- **Rate Limiting**: Respects Notion's retry-after headers
- **Error Classification**: Smart retry logic (don't retry 4xx except 429)
- **Environment Safety**: Validates and rejects placeholder values

### 📦 Package Updates

- **Version**: `2.0.0` (major due to new features, but backward compatible)
- **CLI Binary**: Added `bin/claude-code-notion` executable
- **Dependencies**: No new dependencies (still just `@notionhq/client`)
- **Bundle Size**: Minimal increase despite major feature additions

### 🔄 Migration Guide

**v1.x code continues to work unchanged:**
```typescript
// This still works exactly the same
const manager = createRoadmapFromEnv(databaseId);
await manager.complete('Task');
```

**To enable enterprise features:**
```typescript
// Add enterprise config when ready
const manager = createRoadmapFromEnv(databaseId, {
  enterprise: {
    idempotency: { enabled: true },
    retries: { attempts: 3 }
  }
});
```

### 🎯 Breaking Changes

**None!** This is a fully backward-compatible release. All v1.x code continues to function exactly as before.

### 📝 Notes

This release represents a fundamental upgrade in capability while maintaining 100% backward compatibility. Teams can adopt enterprise features incrementally as confidence and requirements grow.

## [1.1.0] - 2025-08-14

### Added
- 🎉 **New Method: `getFullProjectData()`** - Extract complete project information including all properties and page content
- 📋 **Enhanced `getTaskDetails()`** - Now extracts objective and user flow from page content
- ✏️ **New Method: `updatePageContent()`** - Edit project objectives and user flows programmatically
- 🔍 **Enhanced Search** - `search()` method now fetches and includes page content (objective, user flow)
- 📊 **Multi-select Support** - Added `extractMultiSelect()` for team, category, role properties
- 👥 **People Property Support** - Added `extractPeople()` for owner assignments
- 📅 **Better Date Handling** - Improved date extraction and automatic date setting

### Enhanced
- 🚀 **Performance** - List method optimized to skip content fetching for better performance
- 📝 **Content Parsing** - Improved extraction of objectives and user flows from various page formats
- 🔧 **Type Safety** - Enhanced TypeScript interfaces with complete property definitions
- 📚 **Documentation** - Comprehensive examples and API documentation

### Fixed
- 🐛 Fixed duplicate property extraction issues
- 🐛 Resolved content parsing for multi-line objectives and user flows
- 🐛 Fixed edge cases in title extraction from rich text

## [1.0.0] - 2025-08-13

### Initial Release
- ✅ Basic CRUD operations for roadmap tasks
- 📝 Status management (complete, start, plan)
- 🔍 Search functionality
- 📋 List all tasks
- 🏷️ Filter by status
- 📅 Automatic date setting for status changes
- 🔐 Environment-based configuration
- 📘 TypeScript support

## Example Usage (v1.1.0)

```typescript
// Get ALL project data
const fullData = await roadmap.getFullProjectData("Agent License Renewal");

console.log(fullData.properties.status);      // "In progress"
console.log(fullData.properties.priority);    // "Medium"
console.log(fullData.properties.team);        // ["Backend", "Frontend"]
console.log(fullData.content.objective);      // Full objective text
console.log(fullData.content.userFlow);       // Complete user flow

// Edit project content
await roadmap.updatePageContent("Agent License Renewal", {
  objective: "Updated objective...",
  userFlow: "New Step 1: ...\nNew Step 2: ..."
});
```

## Migration Guide

### From 1.0.0 to 1.1.0

No breaking changes! All existing methods work exactly the same. New features are additive:

```typescript
// Old way (still works)
const tasks = await roadmap.search("keyword");
console.log(tasks[0].title);  // Works as before

// New way (enhanced)
const tasks = await roadmap.search("keyword");
console.log(tasks[0].objective);  // NEW: Now includes objective
console.log(tasks[0].userFlow);   // NEW: Now includes user flow

// Brand new capability
const fullData = await roadmap.getFullProjectData("Project Name");
```