# Release v2.0.1 - Enterprise Hardening & API Best Practices

## 🚀 Major Improvements

### Production Hardening (from your excellent plan)
✅ **Request Timeouts** - Configurable per-request (15s) and global (120s) timeouts
✅ **Circuit Breaker** - Fails fast after 5 consecutive failures, auto-recovers after 60s
✅ **Typed Errors** - Discriminated union `CcnError` with proper exit codes (0-8)
✅ **Correlation IDs** - Every operation tracked with `ccn-{timestamp}-{hash}`
✅ **Kill Switches** - `CCN_WRITE_DISABLED` and `CCN_NETWORK_DISABLED` env vars
✅ **Schema Validation** - Validates database properties at startup
✅ **Idempotency** - Deduplicates operations within 60s window
✅ **Health Checks** - `health()` method and CLI command

### Notion API Best Practices (from official docs)
✅ **Pinned API Version** - `NOTION_VERSION` env var (default: 2022-06-28)
✅ **Cursor Pagination** - `paginate()` helper handles all `has_more`/`next_cursor` loops
✅ **Property IDs** - Uses stable IDs instead of names (resilient to renames)
✅ **Preflight Checks** - Validates pages aren't archived before updates
✅ **Enhanced Search** - Filters, sorts, and archived exclusion
✅ **User-Agent** - Descriptive header: `claude-code-notion/2.0.1 (app=X; env=Y)`
✅ **Retry-After** - Already honored in retry logic for 429s

### New Features
✅ **Batch Operations** - `batchUpdate()` with concurrency control and partial failure handling
✅ **Statistics** - `getStats()` returns counts by status, priority, archived
✅ **Export** - `exportCSV()` for data extraction
✅ **List Statuses** - `getUniqueStatuses()` discovers all status values
✅ **CLI Enhancements** - batch, stats, export, statuses commands

## 🔧 Configuration

### Environment Variables
```bash
# Core (required)
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# API Version (recommended)
NOTION_VERSION=2022-06-28

# Kill Switches
CCN_WRITE_DISABLED=1      # Force dry-run
CCN_NETWORK_DISABLED=1    # Disable network ops

# Circuit Breaker
CCN_CIRCUIT_BREAKER=true
CCN_CIRCUIT_THRESHOLD=5
CCN_CIRCUIT_RESET=60000

# Timeouts
CCN_REQUEST_TIMEOUT=15000
CCN_GLOBAL_TIMEOUT=120000

# Idempotency
CCN_IDEMPOTENCY=true
CCN_IDEMPOTENCY_TTL=60000

# User-Agent
APP_NAME=your-app
NODE_ENV=production
```

### Exit Codes
- `0` - Success
- `1` - Generic error
- `2` - Validation error
- `3` - Authentication error
- `4` - Rate limit error
- `5` - Network error
- `6` - Timeout error
- `7` - Circuit open error
- `8` - Not found error

## 💡 Usage Examples

### Enterprise Setup
```typescript
const manager = createRoadmapFromEnv(databaseId, {
  enterprise: {
    retries: { attempts: 5 },
    idempotency: { enabled: true },
    timeout: { requestTimeoutMs: 20000 },
    dryRun: false
  }
});
```

### Batch Operations
```bash
# Create batch file
cat > updates.ndjson << EOF
{"task": "Security Audit", "status": "Completed"}
{"task": "API Migration", "status": "In Progress"}
{"task": "Documentation", "status": "Review"}
EOF

# Execute batch with partial failure handling
npx claude-code-notion batch updates.ndjson --json
```

### Health Monitoring
```bash
# Check system health
npx claude-code-notion health --json

# Response includes:
# - Circuit breaker state
# - Database validation
# - Configuration status
# - Correlation ID
```

### Statistics & Export
```bash
# Get task statistics
npx claude-code-notion stats --json

# Export all tasks to CSV
npx claude-code-notion export csv > tasks.csv

# List all unique statuses
npx claude-code-notion statuses --json
```

## 🔄 Migration from v2.0.0

100% backward compatible! New features are opt-in:

```typescript
// Old code still works
const manager = createRoadmapFromEnv(databaseId);

// Add enterprise features when ready
const manager = createRoadmapFromEnv(databaseId, {
  enterprise: { /* options */ }
});
```

## 🛡️ Security Improvements

- **Placeholder Detection** - Rejects obvious placeholder API keys
- **Secret Redaction** - Automatic masking in logs
- **Correlation Tracking** - Full request tracing
- **Archived Page Protection** - Prevents updates to archived content
- **Property ID Resilience** - Survives column renames

## 📊 Performance Improvements

- **Cursor Pagination** - Handles large datasets efficiently
- **Circuit Breaker** - Prevents cascade failures
- **Request Timeouts** - No hanging operations
- **Batch Processing** - Concurrent updates with rate limiting
- **Property ID Cache** - Reduces API calls

## 🎯 What's Next

Medium-term improvements to consider:
- Contract tests against sandbox DB
- Offline queue for network failures
- Chaos testing with latency injection
- Typed error handlers per error type
- Stream processing for large exports

This release makes claude-code-notion truly production-ready with enterprise-grade resilience, following Notion API best practices, and providing powerful new capabilities for automation and monitoring.