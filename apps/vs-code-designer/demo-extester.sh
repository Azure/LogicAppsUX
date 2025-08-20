#!/bin/bash

# ExTester Demo Script
# This script demonstrates the different ways to run VS Code Extension tests

echo "🚀 ExTester Demo for VS Code Extension Testing"
echo "============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📁 Current directory:${NC} $(pwd)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the vs-code-designer directory."
    exit 1
fi

echo -e "${YELLOW}1. Building test files...${NC}"
echo "pnpm run build:ui"
pnpm run build:ui
echo ""

echo -e "${YELLOW}2. Running standalone tests (no VS Code required)...${NC}"
echo "npx mocha out/test/standalone.test.js --timeout 10000"
npx mocha out/test/standalone.test.js --timeout 10000
echo ""

echo -e "${GREEN}✅ Demo completed!${NC}"
echo ""
echo "🎯 Next steps:"
echo "   1. For UI testing (VS Code visible):"
echo "      pnpm run test:ui"
echo ""
echo "   2. For headless testing (CI/CD friendly):"
echo "      pnpm run test:ui:headless"
echo ""
echo "   3. To setup VS Code test environment:"
echo "      pnpm run test:ui:setup"
echo ""
echo "📖 See README-ExTester.md for detailed documentation"
