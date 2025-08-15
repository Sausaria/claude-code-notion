# Post-Publish Verification

Drop this command into the GitHub release or NPM page:

```bash
# One-line verification - tests install, CLI, and core functionality
npx claude-code-notion@2.0.1 --help && echo "✅ Installation verified" || echo "❌ Installation failed"
```

For full verification with a test workspace:

```bash
# Full verification with your test Notion workspace
export NOTION_API_KEY="secret_your_test_key"
export NOTION_DATABASE_ID="your-test-db-id"
npx claude-code-notion@2.0.1 health --json && echo "✅ Full functionality verified"
```

Expected output:
```json
{
  "healthy": true,
  "circuitBreaker": { "state": "CLOSED" },
  "validation": { "valid": true }
}
```