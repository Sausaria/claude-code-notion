# Changelog

## [2.0.1] - 2025-08-15

### 🛡️ Production Hardening
- **Request Timeouts**: Added configurable per-request (15s) and global (120s) timeouts
- **Circuit Breaker**: Implemented with auto-recovery after 5 consecutive failures  
- **Typed Error System**: New `CcnError` discriminated union with proper CLI exit codes (0-8)
- **Correlation IDs**: Every operation now includes `ccn-{timestamp}-{hash}` for traceability
- **Kill Switches**: Added `CCN_WRITE_DISABLED` and `CCN_NETWORK_DISABLED` env vars
- **Health Checks**: New `health()` method and CLI command for monitoring
- **Enhanced Idempotency**: TTL-based deduplication with configurable 60s window

### 📋 Notion API Best Practices  
- **API Version Pinning**: `NOTION_VERSION` header (default: 2022-06-28) for stable behavior
- **Cursor Pagination**: Automatic `has_more`/`next_cursor` handling in all list operations
- **Property ID Resolution**: Uses stable property IDs instead of names for rename resilience
- **Preflight Validation**: Checks for archived pages and permissions before writes
- **Enhanced Search**: Added filters, sorts, and archived exclusion options
- **Rate Limit Compliance**: Improved `Retry-After` header handling

### ⚡ New Features
- **Batch Operations**: `batchUpdate()` with concurrency control and partial failure handling
- **Statistics API**: `getStats()` returns task counts by status, priority, archived state
- **CSV Export**: `exportCSV()` method for data extraction
- **Status Discovery**: `getUniqueStatuses()` discovers all status values in database
- **Enhanced CLI**: Added `batch`, `stats`, `export`, `statuses` commands

### 🔧 Configuration Enhancements
- **Environment Variables**: 15+ new env vars for fine-grained control
- **Schema Validation**: Startup validation of required database properties
- **User-Agent**: Descriptive headers with app/environment context
- **Debug Mode**: Comprehensive logging with `--debug` flag

### 🛠️ Breaking Changes
- None! 100% backward compatible with v2.0.0

### 📦 Internal Improvements
- Modular architecture with separate error, utils, and circuit-breaker modules
- Enhanced TypeScript definitions with better inference
- Improved test coverage and documentation
- Optimized bundle size (29KB compressed vs 40KB in v2.0.0)

### 🔗 Links
- **NPM**: https://www.npmjs.com/package/claude-code-notion
- **GitHub**: https://github.com/Sausaria/claude-code-notion
- **Documentation**: See README.md for comprehensive examples