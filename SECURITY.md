# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public issue
2. Email security concerns to: [your-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Features

### Automatic Token Protection
- API keys are automatically redacted in all logs
- Environment validation rejects placeholder tokens
- No credential storage or caching

### Enterprise Security Controls
- Structured audit logging for compliance
- Rate limiting with backoff strategies  
- Dry-run mode for safe operation preview
- Idempotency to prevent duplicate operations

### Supply Chain Security
- Minimal dependencies (only `@notionhq/client`)
- NPM provenance signatures
- SBOM generation for dependency tracking

## Security Best Practices

### For Developers
```bash
# Use environment variables, never hardcode tokens
export NOTION_API_KEY="secret_your_token"

# Always test with dry-run first
npx claude-code-notion complete "Task" --dry-run

# Enable structured logging for audit trails
npx claude-code-notion complete "Task" --json > audit.log
```

### For CI/CD
```yaml
# Store secrets securely
env:
  NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}

# Use idempotent operations
run: npx claude-code-notion complete "Deploy" --idempotent
```

## Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours  
- **Fix Timeline**: Varies by severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next planned release