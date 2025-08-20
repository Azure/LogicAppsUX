# 🚀 ExTester Execution Steps

Follow these steps to run the VS Code Extension tests we've implemented.

## Prerequisites ✅

Make sure you're in the correct directory:
```bash
cd /Users/carloscastrotrejo/Documents/static/LogicAppsUX/apps/vs-code-designer
```

## Step-by-Step Execution Guide

### 1. Basic Test Execution (Recommended First Step)

#### Run Standalone Tests (No VS Code Required)
```bash
# Build the test files
pnpm run build:ui

# Run basic framework validation
npx mocha out/test/standalone.test.js --timeout 10000
```

**Expected Output:**
```
Simple Test Suite (No VS Code Required)
  ✔ should run basic assertion
  ✔ should test string operations  
  ✔ should test array operations
  ✔ should demonstrate async test
  
4 passing (105ms)
```

### 2. Quick Demo Script

Run our complete demo script:
```bash
./demo-extester.sh
```

This will:
- Build all test files
- Run standalone tests
- Show you next steps

### 3. Full VS Code UI Testing

#### Option A: UI Mode (Visual Testing)
```bash
# Setup VS Code test environment (one-time setup)
pnpm run test:ui:setup

# Run tests with VS Code UI visible
pnpm run test:ui
```

#### Option B: Headless Mode (CI/CD Style)
```bash
# Run tests without UI (faster)
pnpm run test:ui:headless
```

## 📋 Command Reference

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `pnpm run build:ui` | Compiles TypeScript test files | Before running any tests |
| `npx mocha out/test/standalone.test.js` | Runs framework validation | Test setup works |
| `pnpm run test:ui:setup` | Downloads VS Code & ChromeDriver | One-time setup |
| `pnpm run test:ui` | Runs visual tests | Development/debugging |
| `pnpm run test:ui:headless` | Runs headless tests | CI/CD pipelines |
| `./demo-extester.sh` | Runs complete demo | Quick validation |

## 🎯 Recommended Execution Order

### For First Time Setup:
```bash
# 1. Validate framework works
pnpm run build:ui
npx mocha out/test/standalone.test.js --timeout 10000

# 2. Run demo script
./demo-extester.sh

# 3. Setup VS Code environment (optional)
pnpm run test:ui:setup

# 4. Try UI tests (optional)
pnpm run test:ui
```

### For Daily Development:
```bash
# Quick test after making changes
pnpm run build:ui && npx mocha out/test/standalone.test.js

# Full test suite
pnpm run test:ui:headless
```

## 🔍 What Each Test File Does

| Test File | Description | Complexity |
|-----------|-------------|------------|
| `standalone.test.ts` | Basic framework validation (no VS Code) | ⭐ Simple |
| `demo.test.ts` | Basic VS Code functionality tests | ⭐⭐ Medium |
| `smoke.test.ts` | Extension loading and basic checks | ⭐⭐ Medium |
| `commands.test.ts` | Logic Apps specific command tests | ⭐⭐⭐ Advanced |
| `basic.test.ts` | Extended UI interaction tests | ⭐⭐⭐ Advanced |

## 📁 File Structure After Execution

```
apps/vs-code-designer/
├── src/test/ui/           # Source test files (TypeScript)
├── out/test/              # Compiled test files (JavaScript)
├── test-resources/        # ExTester downloads (VS Code, ChromeDriver)
├── .extester.json         # ExTester configuration
├── demo-extester.sh       # Demo script
└── README-ExTester.md     # Detailed documentation
```

## ⚠️ Troubleshooting

### Common Issues & Solutions

1. **Tests don't build:**
   ```bash
   # Check TypeScript errors
   npx tsc --noEmit
   
   # Clean and rebuild
   rm -rf out/test/
   pnpm run build:ui
   ```

2. **VS Code setup fails:**
   ```bash
   # Clean test resources
   rm -rf test-resources/
   
   # Try setup again
   pnpm run test:ui:setup
   ```

3. **Extension packaging errors:**
   - The full VS Code tests require the extension to be built
   - Standalone tests work without the extension
   - Use standalone tests for framework validation

4. **Node.js version warning:**
   - ExTester officially supports Node.js 20.x.x
   - Tests should still work with newer versions
   - Warning can be ignored for development

## 🎉 Success Indicators

### ✅ Framework Working:
- Standalone tests pass (4 passing tests)
- Build completes without errors
- Demo script runs successfully

### ✅ Full Setup Working:
- VS Code launches in test mode
- UI tests interact with VS Code elements
- Tests complete with results

### ✅ Ready for Production:
- Headless tests run in CI/CD
- All test files pass
- No timeout or WebDriver errors

## 🚀 Next Steps After Setup

1. **Write Your Own Tests:**
   - Copy `standalone.test.ts` as a template
   - Add your Logic Apps specific test cases
   - Use ExTester Page Objects for VS Code interaction

2. **Integrate with CI/CD:**
   - Use `pnpm run test:ui:headless` in pipelines
   - Add test results reporting
   - Set up screenshot capture on failures

3. **Expand Test Coverage:**
   - Test extension commands
   - Test UI workflows
   - Test error scenarios

---

**Start here:** Run `./demo-extester.sh` to see everything in action! 🎯
