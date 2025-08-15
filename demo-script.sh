#!/bin/bash

# Demo script for claude-code-notion v2.0.1
# Record this with asciinema or terminalizer for GIF creation

clear
echo "🚀 Claude Code Notion - Enterprise Demo"
echo "======================================="
echo ""
sleep 1

echo "1️⃣ Install the package:"
echo "$ npm install claude-code-notion"
echo ""
sleep 2

echo "2️⃣ Configure environment:"
echo "$ export NOTION_API_KEY=\"secret_xxx\""
echo "$ export NOTION_DATABASE_ID=\"xxx\""
echo ""
sleep 2

echo "3️⃣ Update task with enterprise resilience:"
echo "$ npx claude-code-notion update-status \"Security Audit\" \"Completed\" --json"
sleep 1
cat << 'EOF'
{
  "success": true,
  "result": {
    "id": "abc-123-def-456",
    "title": "Security Audit",
    "status": "Completed",
    "url": "https://notion.so/Security-Audit-abc123"
  },
  "correlationId": "ccn-1702934567-8a9b",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
EOF
echo ""
sleep 2

echo "4️⃣ Handle failures gracefully (circuit breaker demo):"
echo "$ npx claude-code-notion update-status \"Network Test\" \"Failed\" --json"
sleep 1
cat << 'EOF'
{
  "success": false,
  "error": true,
  "type": "CircuitOpen",
  "message": "Circuit breaker is open. Service unavailable until 10:35:45",
  "retryable": true,
  "correlationId": "ccn-1702934570-9b2c"
}
EOF
echo "Exit code: 7 (Circuit Open)"
echo ""
sleep 2

echo "5️⃣ Batch process with partial failures:"
echo "$ npx claude-code-notion batch updates.ndjson --json"
sleep 1
echo "Processing 50 tasks..."
echo "⠋ Task 1/50: Authentication System [Completed]"
sleep 0.2
echo "⠙ Task 2/50: Database Migration [In Progress]"
sleep 0.2
echo "⠹ Task 3/50: API Gateway [Completed]"
sleep 0.2
echo "..."
sleep 1
cat << 'EOF'
{
  "success": true,
  "result": {
    "succeeded": 47,
    "failed": 3,
    "totalTime": "4.2s",
    "failedTasks": [
      { "task": "Legacy API", "error": "NotFound" },
      { "task": "Deprecated Service", "error": "Archived" },
      { "task": "Test Task", "error": "Timeout" }
    ]
  },
  "correlationId": "ccn-1702934575-3d4e"
}
EOF
echo ""
sleep 2

echo "6️⃣ Monitor health in real-time:"
echo "$ npx claude-code-notion health --json"
sleep 1
cat << 'EOF'
{
  "healthy": true,
  "circuitBreaker": {
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 47
  },
  "config": {
    "databaseId": "24c697dd-xxx",
    "dryRun": false,
    "idempotency": true
  },
  "validation": {
    "valid": true,
    "properties": ["Project name", "Status", "Priority", "Date"]
  },
  "correlationId": "ccn-1702934580-5f6g"
}
EOF
echo ""
sleep 2

echo "✅ Enterprise-ready Notion automation in production!"
echo ""
echo "Key benefits demonstrated:"
echo "• Circuit breaker prevents cascade failures"
echo "• Batch operations with partial failure recovery"  
echo "• Correlation IDs for full traceability"
echo "• Exit codes for CI/CD integration"
echo "• Real-time health monitoring"
echo ""
echo "Learn more: https://github.com/Sausaria/claude-code-notion"