# Claude Code Notion

[![npm version](https://img.shields.io/npm/v/claude-code-notion.svg)](https://www.npmjs.com/package/claude-code-notion)
[![npm downloads](https://img.shields.io/npm/dm/claude-code-notion.svg)](https://www.npmjs.com/package/claude-code-notion)
[![Notion API](https://img.shields.io/badge/Notion%20API-2022--06--28-black.svg)](https://developers.notion.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-brightgreen.svg)](https://nodejs.org)
[![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-green.svg)](https://github.com/Sausaria/claude-code-notion#security)

**Enterprise-grade TypeScript library and CLI for Notion database management with Claude Code integration.**

```bash
npm install claude-code-notion
```

> **Reproducible builds**: `npm install claude-code-notion@^2.0.1`

## ⚡ Quickstart

```bash
# Copy-paste to get started in 30 seconds
npm i claude-code-notion
export NOTION_API_KEY="secret_xxx" 
export NOTION_DATABASE_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Test with dry-run (safe)
npx claude-code-notion complete "Hello World" --dry-run --json
# ✅ Expected: { "success": true, "dryRun": true, "correlationId": "ccn-..." }

# Execute for real
npx claude-code-notion complete "Hello World" --json
```

## 🎬 See It In Action

<details>
<summary><strong>CLI: Complete a task (with idempotency)</strong></summary>

```bash
$ npx claude-code-notion complete "Security Fixes" --idempotent --json
{
  "success": true,
  "result": {
    "id": "24c697dd-0e1b-8079-8a95-cab8bd49eadd",
    "title": "Security Fixes", 
    "status": "Completed",
    "url": "https://notion.so/Security-Fixes-24c697dd0e1b80798a95cab8bd49eadd"
  },
  "correlationId": "ccn-2025-08-15-abc123",
  "operation": "complete",
  "idempotent": false,
  "timestamp": "2025-08-15T10:30:45.123Z"
}
```
</details>

<details>
<summary><strong>CLI: Batch operations with partial failure handling</strong></summary>

```bash
$ cat updates.ndjson
{"task": "API Migration", "status": "Completed"}
{"task": "Security Audit", "status": "In Progress"}  
{"task": "Documentation", "status": "Review"}

$ npx claude-code-notion batch updates.ndjson --json
{
  "success": true,
  "result": {
    "succeeded": 2,
    "failed": 1,
    "totalTime": "1.4s",
    "successfulTasks": [
      { "task": "API Migration", "status": "Completed", "pageId": "abc-123" },
      { "task": "Security Audit", "status": "In Progress", "pageId": "def-456" }
    ],
    "failedTasks": [
      { "task": "Documentation", "error": "NotFound", "message": "Task not found in database" }
    ]
  },
  "correlationId": "ccn-2025-08-15-def456"
}
```
</details>

<details>
<summary><strong>CLI: Health monitoring & circuit breaker status</strong></summary>

```bash
$ npx claude-code-notion health --json
{
  "healthy": true,
  "correlationId": "ccn-2025-08-15-ghi789",
  "circuitBreaker": {
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 47,
    "nextRetryTime": null
  },
  "config": {
    "databaseId": "24c697dd-0e1b-8079-8a95-cab8bd49eadd",
    "dryRun": false,
    "idempotency": true,
    "apiVersion": "2022-06-28"
  },
  "validation": {
    "valid": true,
    "properties": ["Project name", "Status", "Priority", "Date"],
    "missing": []
  }
}
```
</details>

<details>
<summary><strong>SDK: Enterprise configuration</strong></summary>

```typescript
import { createRoadmapFromEnv } from 'claude-code-notion';

const manager = createRoadmapFromEnv(databaseId, {
  enterprise: {
    retries: { attempts: 5 },
    idempotency: { enabled: true, ttlMs: 60000 },
    timeout: { requestTimeoutMs: 20000 },
    circuitBreaker: { enabled: true, failureThreshold: 3 },
    dryRun: false,
    logger: customAuditLogger
  }
});

// Auto-retry with backoff, correlation tracking, idempotency
const result = await manager.complete("Deploy v2.0");
// If rate-limited: auto-retry with Retry-After header
// If unchanged: returns idempotent: true
```
</details>

## Features

🚀 **Production-Ready**: Retry/backoff, idempotency, dry-run mode, structured logging  
📊 **Complete Data Access**: Extract objectives, user flows, and all project metadata  
🔧 **CLI & SDK**: Use programmatically or via command line  
🛡️ **Enterprise Security**: Environment validation, secret redaction, audit trails  
⚡ **Performance**: Page ID-based updates, intelligent caching, rate limiting  
🎯 **Developer UX**: TypeScript support, comprehensive error handling, JSON output

> **🛡️ Security Model**: Token auto-redaction, environment validation, no credential storage, audit trails. [Full Security Details →](#️-security)

### v2.0 Enterprise Features

- 🔄 **Retry/Backoff**: Automatic retry with exponential backoff for API resilience
- 🎯 **Idempotency**: Skip writes when values haven't changed 
- 🧪 **Dry Run Mode**: Preview changes without writing to Notion
- 📝 **Structured Logging**: JSON output, audit trails, secret redaction
- 🖥️ **CLI Interface**: Full-featured command line interface
- 🛡️ **Environment Validation**: Reject placeholder tokens automatically

## Installation

```bash
npm install claude-code-notion
```

## Enterprise Quick Start

**Ready for production in 30 seconds** — get enterprise-grade reliability with minimal setup:

### SDK (Enterprise Mode)
```typescript
import { createRoadmapFromEnv } from 'claude-code-notion';

// Production-ready with all enterprise features
const manager = createRoadmapFromEnv(process.env.NOTION_DATABASE_ID, {
  enterprise: {
    idempotency: { enabled: true },    // Skip duplicate operations
    retries: { attempts: 5 },          // API resilience
    dryRun: false,                     // Set true for safe testing
    logger: auditLogger                // Structured logging
  }
});

// Operations are now idempotent, resilient, and logged
await manager.complete('Security Fixes');
```

### CLI (Production Automation)
```bash
# CI/CD-ready with safety features
export NOTION_API_KEY="secret_your_token"
export NOTION_DATABASE_ID="your-database-id"

# 🔍 Search tasks (always safe)
npx claude-code-notion search "Security Fixes" --json

# 🧪 Preview changes (always run first)
npx claude-code-notion complete "Deploy Feature X" --dry-run --idempotent

# ✅ Execute with safety controls
npx claude-code-notion complete "Deploy Feature X" --idempotent --json --retries=5

# 📋 Update task content safely
npx claude-code-notion update-content "Task" --objective="New goal" --dry-run

# 🔄 Change status with preview
npx claude-code-notion update-status "Task" "In progress" --dry-run

# Result: {"success": true, "result": {...}} - perfect for monitoring
```

**Result**: Automatic retry/backoff, duplicate detection, audit trails, and zero-downtime CI/CD integration out of the box.

> **Migrating from v1.x?** Your existing code works unchanged! Enterprise features are completely opt-in — just add the `enterprise` config object when you're ready to upgrade.

## Basic Usage

```typescript
import { createRoadmapFromEnv } from 'claude-code-notion';

// Using environment variables (recommended)
const roadmap = createRoadmapFromEnv('your-database-id');

// Mark a task as completed
await roadmap.complete("Authentication System");

// Mark a task as in progress  
await roadmap.start("User Dashboard");

// Set custom status
await roadmap.updateTask("API Integration", "Planned");
```

## Configuration

### Method 1: Environment Variables (Recommended)

```bash
# .env
NOTION_API_KEY=your_notion_api_key_here
```

```typescript
import { createRoadmapFromEnv } from 'claude-code-notion';

const roadmap = createRoadmapFromEnv('24c697dd-0e1b-8079-8a95-cab8bd49eadd');
```

### Method 2: Direct Configuration

```typescript
import { createRoadmapManager } from 'claude-code-notion';

const roadmap = createRoadmapManager({
  apiKey: 'your_notion_api_key',
  databaseId: '24c697dd-0e1b-8079-8a95-cab8bd49eadd',
  titleProperty: 'Project name', // Optional: defaults to "Project name"
  statusProperty: 'Status',      // Optional: defaults to "Status"  
  dateProperty: 'Date'          // Optional: defaults to "Date"
});
```

## API Reference

### Core Methods

#### `getFullProjectData(taskIdentifier)` - NEW!
Get complete project information including all properties and page content.

```typescript
const fullData = await roadmap.getFullProjectData("Agent License Renewal");

// Returns:
{
  id: "page-id",
  title: "Agent License Renewal",
  url: "https://notion.so/...",
  properties: {
    status: "In progress",
    priority: "Medium",
    effort: "M",
    team: ["Backend", "Frontend"],
    owner: ["John Smith"],
    category: ["Compliance"],
    role: ["Student"],
    quarter: ["Q1 2025"],
    date: "2025-08-14",
    docs: "Documentation text"
  },
  content: {
    objective: "The primary goal is to enable...",
    userFlow: "Step 1 – Profile Setup...",
    fullText: "Complete page content..."
  }
}
```

#### `updateTask(taskIdentifier, status)`
Update a task's status by name or page ID.

```typescript
await roadmap.updateTask("Feature Name", "Completed");
await roadmap.updateTask("page-id-123", "In progress");
```

#### `complete(taskName)`
Mark a task as completed (automatically sets completion date).

```typescript
await roadmap.complete("Authentication System");
```

#### `start(taskName)`  
Mark a task as in progress (automatically sets start date).

```typescript
await roadmap.start("User Dashboard");
```

#### `plan(taskName)`
Mark a task as planned.

```typescript
await roadmap.plan("Future Feature");
```

### Query Methods

#### `search(query)`
Find tasks containing the search term.

```typescript
const tasks = await roadmap.search("authentication");
console.log(tasks); // Array of matching tasks
```

#### `list()`
Get all tasks in the roadmap.

```typescript
const allTasks = await roadmap.list();
```

#### `getByStatus(status)`
Get all tasks with a specific status.

```typescript
const completedTasks = await roadmap.getByStatus("Completed");
const inProgressTasks = await roadmap.getByStatus("In progress");
```

#### `getTaskDetails(taskIdentifier)`
Get project objective, user flow, and full content.

```typescript
const details = await roadmap.getTaskDetails("Agent License Renewal");
console.log(details.objective);   // Project objective text
console.log(details.userFlow);    // User flow steps
console.log(details.fullContent); // Complete page content
```

#### `updatePageContent(taskIdentifier, content)`
Update project objective and user flow content.

```typescript
await roadmap.updatePageContent("Agent License Renewal", {
  objective: "Updated project objective...",
  userFlow: "Step 1: New user flow...\nStep 2: Next step..."
});
```

#### `createTask(title, status, properties)`
Create a new task in the roadmap.

```typescript
await roadmap.createTask("New Feature", "Planned", {
  Priority: { select: { name: "High" } },
  Effort: { select: { name: "Large" } }
});
```

## Practical Examples

### Complete Project Analysis
```typescript
// Get ALL information about a project
const projectData = await roadmap.getFullProjectData("Agent License Renewal");

// Display comprehensive project info
console.log("=== PROJECT: " + projectData.title + " ===");
console.log("Status:", projectData.properties.status);
console.log("Priority:", projectData.properties.priority);
console.log("Effort:", projectData.properties.effort);
console.log("Due Date:", projectData.properties.date);

console.log("\n📋 OBJECTIVE:");
console.log(projectData.content.objective);

console.log("\n🔄 USER FLOW:");
console.log(projectData.content.userFlow);

console.log("\n👥 TEAM:", projectData.properties.team?.join(", "));
console.log("👤 OWNER:", projectData.properties.owner?.join(", "));
console.log("📂 CATEGORY:", projectData.properties.category?.join(", "));
```

### Project Status Report
```typescript
// Generate status report for all in-progress projects
const allTasks = await roadmap.list();
const inProgress = allTasks.filter(t => t.status === "In progress");

for (const task of inProgress) {
  const fullData = await roadmap.getFullProjectData(task.title);
  
  console.log(`\n📊 ${task.title}`);
  console.log(`   Priority: ${fullData.properties.priority}`);
  console.log(`   Effort: ${fullData.properties.effort}`);
  console.log(`   Objective: ${fullData.content.objective?.substring(0, 100)}...`);
}
```

### Bulk Content Update
```typescript
// Update multiple projects with new format
const projectsToUpdate = ["Agent License Renewal", "Course Licensing", "Student Sign-up"];

for (const projectName of projectsToUpdate) {
  const current = await roadmap.getTaskDetails(projectName);
  
  // Add structured formatting to objectives
  await roadmap.updatePageContent(projectName, {
    objective: `## Main Goal\n${current.objective}\n\n## Success Criteria\n- [ ] Metric 1\n- [ ] Metric 2`,
    userFlow: current.userFlow // Keep existing user flow
  });
}
```

## Multi-Project Usage

```typescript
// Different projects with different databases
const projectARoadmap = createRoadmapFromEnv('project-a-database-id');
const projectBRoadmap = createRoadmapFromEnv('project-b-database-id');

// Update different roadmaps independently
await projectARoadmap.complete("Payment Integration");
await otherProjectRoadmap.start("User Authentication");
```

## Integration Examples

### With npm scripts
Add to your project's `package.json`:

```json
{
  "scripts": {
    "roadmap:complete": "node -e \"require('./scripts/roadmap-update.js').complete(process.argv[2])\"",
    "roadmap:start": "node -e \"require('./scripts/roadmap-update.js').start(process.argv[2])\"" 
  }
}
```

Create `scripts/roadmap-update.js`:
```javascript
const { createRoadmapFromEnv } = require('claude-code-notion');

const roadmap = createRoadmapFromEnv(process.env.NOTION_DATABASE_ID);

module.exports = {
  async complete(taskName) {
    await roadmap.complete(taskName);
    console.log(`✅ "${taskName}" marked as completed!`);
  },
  
  async start(taskName) {
    await roadmap.start(taskName);
    console.log(`🔄 "${taskName}" marked as in progress!`);
  }
};
```

Usage:
```bash
npm run roadmap:complete "Feature Name"
npm run roadmap:start "New Feature"
```

### With CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Update roadmap on deploy
  run: |
    npm install claude-code-notion
    node -e "
      const { createRoadmapFromEnv } = require('claude-code-notion');
      const roadmap = createRoadmapFromEnv('${{ secrets.NOTION_DATABASE_ID }}');
      roadmap.complete('${{ github.event.head_commit.message }}');
    "
  env:
    NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
```

## Setup Guide

### 1. Create Notion Integration
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"  
3. Give it a name (e.g., "Roadmap Manager")
4. Copy the **Internal Integration Token**

### 2. Share Database with Integration
1. Open your roadmap database in Notion
2. Click "Share" → "Add connections"
3. Select your integration

### 3. Get Database ID
From your database URL: `https://notion.so/workspace/DatabaseName-{DATABASE_ID}?v=...`

### 4. Set Environment Variable
```bash
NOTION_API_KEY=ntn_your_token_here
```

## TypeScript Types

```typescript
interface RoadmapTask {
  id: string;
  title: string; 
  status: string;
  priority?: string;
  url: string;
  properties: Record<string, any>;
}

interface RoadmapConfig {
  apiKey: string;
  databaseId: string;
  titleProperty?: string;   // Default: "Project name"
  statusProperty?: string;  // Default: "Status" 
  dateProperty?: string;    // Default: "Date"
}
```

## Error Handling

```typescript
try {
  await roadmap.complete("Non-existent Task");
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('Task does not exist in the roadmap');
  }
}
```

## Requirements

- Node.js 16+
- A Notion integration with database access
- TypeScript 4+ (for TypeScript projects)

## 🛡️ Security

> **Enterprise-Grade Security**: Built for production environments with comprehensive security controls and audit capabilities.

[![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-green.svg)](https://github.com/Sausaria/claude-code-notion#security)

### Security Highlights

- 🔐 **Automatic Token Redaction**: API keys and secrets are automatically masked in all logs
- 🛡️ **Environment Validation**: Placeholder tokens and invalid configurations are rejected at startup
- 📋 **Audit Trail**: All operations are logged with structured metadata for compliance
- 🔄 **Rate Limiting Compliance**: Respects Notion's rate limits and retry-after headers
- 🧪 **Dry Run Protection**: Preview changes without writing to prevent accidental modifications
- 🚫 **No Credential Storage**: Tokens are never persisted or cached locally

### Token Security

All logging automatically redacts sensitive information:

```typescript
// Input
const config = { apiKey: "secret_abc123xyz" };

// Logged output (automatically redacted)
{ "apiKey": "secret_***" }
```

### Environment Safety

The library validates environment variables and rejects common placeholder patterns:

```bash
# ❌ These are automatically rejected
NOTION_API_KEY="your_api_key_here"
NOTION_API_KEY="placeholder_token"

# ✅ Valid format
NOTION_API_KEY="secret_abc123def456"
```

### Audit Logging

Enterprise mode provides comprehensive audit trails:

```typescript
const manager = createRoadmapFromEnv(databaseId, {
  enterprise: {
    logger: {
      info: (msg, meta) => audit.log('info', msg, meta),
      warn: (msg, meta) => audit.log('warn', msg, meta),
      error: (msg, meta) => audit.log('error', msg, meta)
    }
  }
});

// All operations automatically logged with:
// - Operation type and parameters
// - Retry attempts and outcomes  
// - API response metadata
// - Execution timestamps
// - Error details (with secrets redacted)
```

### Production Deployment

For CI/CD and production environments:

```bash
# Environment validation
npx claude-code-notion search "test" --json
# Returns error if tokens are invalid/placeholder

# Safe preview mode
npx claude-code-notion complete "Deploy X" --dry-run --idempotent
# Shows what would change without writing

# Production execution with audit trail
npx claude-code-notion complete "Deploy X" --json --idempotent > audit.log
```

### Security Best Practices

1. **Environment Variables**: Store tokens in environment variables, never in code
2. **Dry Run First**: Use `--dry-run` flag to preview changes in production pipelines  
3. **Structured Logging**: Enable JSON output for automated monitoring and alerting
4. **Idempotency**: Use `--idempotent` flag to prevent duplicate operations
5. **Rate Limiting**: Built-in retry logic respects API limits automatically

### Compliance Features

- **Audit Trail**: All operations logged with structured metadata
- **Data Privacy**: No user data stored or cached locally
- **Access Control**: Integration-based permissions model via Notion
- **Error Handling**: Comprehensive error classification and logging
- **Monitoring Ready**: JSON output integrates with SIEM/monitoring systems

## 🔧 Compatibility

| Component | Supported Versions |
|-----------|-------------------|
| **Node.js** | 18, 20 (tested in CI) |
| **Notion API** | 2022-06-28 (pinned via header) |
| **OS** | macOS, Linux, Windows |
| **TypeScript** | 4.9+ (optional) |

## 🛠️ Troubleshooting

### Get Detailed Logs
```bash
# Export JSON logs with correlation ID
npx claude-code-notion search "example" --json --debug 2>ccn.err.json

# Share the correlationId + redacted error JSON in issues
```

### Verify Installation
```bash
npm view claude-code-notion@latest version dist-tags
# Should show: latest: '2.0.1'
```

### Common Issues

| Error | Solution |
|-------|----------|
| `401 Unauthorized` | Check `NOTION_API_KEY` format: `secret_xxx` |
| `404 Not Found` | Verify database is shared with integration |
| `403 Forbidden` | Database may be archived or access revoked |
| `Circuit Open` | Service recovering from failures, retry in 60s |

## 🔒 Privacy & Security

- **Telemetry**: None - no usage data collected
- **Secrets**: Auto-redacted in all logs and outputs
- **2FA**: NPM account secured with two-factor authentication
- **Idempotency**: Prevents duplicate operations by default in enterprise mode

## 📋 Releases

- **Latest**: [v2.0.1](./CHANGELOG-2.0.1.md) - Enterprise hardening & API best practices
- **Previous**: [v2.0.0](https://github.com/Sausaria/claude-code-notion/releases/tag/v2.0.0) - Enterprise features

## License

MIT