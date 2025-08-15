#!/bin/bash

# Fix package-lock.json to reflect correct package name
echo "🔧 Fixing package-lock.json..."

cd "$(dirname "$0")"

# Remove old package-lock.json
echo "📝 Removing old package-lock.json..."
rm -f package-lock.json

# Regenerate with correct package name
echo "🔄 Regenerating package-lock.json..."
npm install

echo "✅ Package-lock.json updated successfully!"