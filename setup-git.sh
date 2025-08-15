#!/bin/bash

# Setup script for claude-code-notion Git repository
echo "🚀 Setting up claude-code-notion Git repository..."

# Navigate to package root
cd /Users/danielharris/claude-code-notion

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
else
    echo "✓ Git repository already initialized"
fi

# Add remote origin
echo "🔗 Adding GitHub remote..."
git remote add origin https://github.com/Sausaria/claude-code-notion.git || echo "Remote already exists"

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📋 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Temporary files
*.tmp
*.temp
test-*.js

# Package manager
package-lock.json.backup
EOF
else
    echo "✓ .gitignore already exists"
fi

# Stage all files
echo "📦 Staging files for commit..."
git add .

# Initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial release: claude-code-notion v2.0.0

🚀 Enterprise-grade TypeScript library and CLI for Notion database management

✨ Features:
- Complete Notion database management API
- Enterprise features: retry/backoff, idempotency, dry-run mode
- Full-featured CLI with production flags
- Structured logging and audit trails
- Environment validation and security controls
- TypeScript support and comprehensive documentation

🛡️ Security:
- Automatic token redaction in logs
- Environment validation with placeholder rejection
- No credential storage or caching
- Audit trail support for compliance

🔧 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "✅ Repository setup complete!"
echo "🔗 Repository URL: https://github.com/Sausaria/claude-code-notion"