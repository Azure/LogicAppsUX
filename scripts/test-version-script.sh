#!/bin/bash

# Test script for calculate-next-version.ts
# Usage: ./scripts/test-version-script.sh

echo "🧪 Running tests for calculate-next-version.ts..."
echo ""

# Change to scripts directory and run tests
cd "$(dirname "$0")" && npx vitest run

echo ""
echo "✅ Tests completed!"
echo ""
echo "📋 Available test commands:"
echo "  Run tests in watch mode:    cd scripts && npx vitest"
echo "  Run with coverage:          cd scripts && npx vitest run --coverage"
echo "  Run specific test:          cd scripts && npx vitest run __test__/calculate-next-version.spec.ts"