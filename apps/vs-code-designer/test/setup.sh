#!/bin/bash

# VS Code Extension E2E Test Setup Script

echo "🚀 Setting up VS Code Extension E2E Tests..."

# Install test dependencies
echo "📦 Installing test dependencies..."
cd test && pnpm install
cd ..

# Create test workspace if it doesn't exist
echo "📁 Creating test workspace..."
mkdir -p test-workspace

# Create results and screenshots directories
echo "📊 Creating result directories..."
mkdir -p test/results test/screenshots

# Build the extension
echo "🔨 Building extension..."
pnpm run build:extension

echo "✅ E2E Test setup complete!"
echo ""
echo "🎯 Quick Start Commands:"
echo "  Headful (visible): pnpm run test:e2e:headful"
echo "  Headless (CI):     pnpm run test:e2e:headless"
echo "  Commands only:     pnpm run test:e2e:commands"
echo "  Workflows only:    pnpm run test:e2e:workflows"
echo ""
echo "📖 See test/README.md for complete documentation"