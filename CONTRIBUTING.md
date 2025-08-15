# Contributing to claude-code-notion

Thank you for your interest in contributing! This document provides guidelines for contributing to this enterprise-grade Notion integration.

## Development Setup

### Prerequisites
- Node.js 16+
- npm 7+
- TypeScript 5+
- A Notion integration token for testing

### Quick Start
```bash
# Clone the repository
git clone https://github.com/Sausaria/claude-code-notion.git
cd claude-code-notion

# Install dependencies
npm install

# Build the project
npm run build

# Test the CLI
./bin/claude-code-notion --help
```

### Environment Setup
```bash
# Create .env.local for testing
echo "NOTION_API_KEY=secret_your_test_token" > .env.local
echo "NOTION_DATABASE_ID=your_test_database_id" >> .env.local
```

## Development Workflow

### Building
```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm run clean      # Clean build artifacts
```

### Testing
```bash
# Basic functionality test
node -e "const {createRoadmapFromEnv} = require('./dist'); console.log('✅ Package loads')"

# CLI testing
./bin/claude-code-notion search "test" --dry-run --json

# Enterprise features
node test-extraction.js
```

### Code Style
- Use TypeScript strict mode
- Follow existing patterns for error handling
- Implement enterprise features as opt-in only
- Maintain backward compatibility

## Contributing Guidelines

### Feature Requests
1. Open an issue with the `enhancement` label
2. Describe the use case and expected behavior
3. Consider enterprise vs. basic feature classification

### Bug Reports
1. Use the bug report template
2. Include:
   - Node.js version
   - Package version
   - Minimal reproduction case
   - Expected vs. actual behavior

### Pull Requests
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Ensure builds pass: `npm run build`
7. Open a pull request

### Code Review Process
- All PRs require review
- Maintain backward compatibility
- Security features require additional review
- Documentation updates for new features

## Enterprise Features

### Design Principles
- **Opt-in**: Enterprise features must be explicitly enabled
- **Backward Compatible**: Existing code must continue working
- **Secure by Default**: Implement security best practices
- **Observable**: Provide comprehensive logging and monitoring

### Adding Enterprise Features
```typescript
// Follow this pattern for new enterprise features
interface NewFeatureConfig {
  enabled?: boolean;
  // ... feature-specific options
}

interface EnterpriseOptions {
  newFeature?: NewFeatureConfig;
  // ... existing options
}
```

## Security Considerations

### Token Handling
- Never log tokens in plain text
- Use automatic redaction patterns
- Validate environment variables

### Error Handling
- Don't expose internal details in error messages
- Log security events appropriately
- Follow responsible disclosure practices

## Release Process

### Version Strategy
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

### Release Checklist
1. Update CHANGELOG.md
2. Run full test suite
3. Update documentation
4. Create GitHub release
5. Publish to NPM with provenance

## Documentation

### Requirements
- Update README.md for new features
- Add TypeScript type definitions
- Include practical examples
- Update security documentation

### Style Guide
- Use clear, concise language
- Include code examples
- Highlight enterprise features
- Provide migration guides

## Community

### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on the project's goals

### Getting Help
- Check existing issues and documentation
- Open a GitHub issue for bugs/questions
- Join discussions for feature planning

## License

By contributing, you agree that your contributions will be licensed under the MIT License.