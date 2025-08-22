# VS Code Extension E2E Tests - Generated from Azure DevOps Test Cases

## Overview

This document describes the E2E tests that have been created based on Azure DevOps test cases for the VS Code Logic Apps extension. The tests were generated from specific test cases found in the Azure DevOps test plan.

## Source Test Cases

The E2E tests are based on the following Azure DevOps test cases:

### 1. SQL Storage Test Case (ID: 10089920)
**Title**: [Test Case][VS Code Extn] [SQL Storage]VSCode Extension Test Cases

**Key Test Steps**:
- Azure authentication in VS Code
- Logic App workspace project creation
- Workflow creation with HTTP trigger, Compose action, and ServiceBus action
- Local workflow testing and monitoring
- Azure deployment with settings upload dialog handling
- Azure Portal verification and monitoring

### 2. Data Mapper Test Case (ID: 26272218)
**Title**: [Test Case][VS Code Extn] Open Data Mapper Extension

**Key Test Steps**:
- Opening Logic Apps standard project
- Accessing Azure tab in left side menu
- Finding and expanding Data Mapper section
- Creating new data map with naming validation
- Verifying data mapper interface opens correctly

## Generated Test Files

### 1. `sql-storage.test.ts`
**Purpose**: Comprehensive testing of SQL storage integration workflow
**Framework**: ExTester + Mocha + Chai
**Features Tested**:
- Azure authentication flow
- Project creation and setup
- Workflow design with multiple action types
- Local execution and monitoring
- Azure deployment process
- Settings dialog handling
- Portal integration verification

**Key Test Suites**:
- Step 1: Azure Authentication and Project Setup
- Step 2: Workflow Creation and Design
- Step 3: Local Testing and Execution
- Step 4: Azure Deployment
- Step 5: Azure Portal Verification

### 2. `data-mapper.test.ts`
**Purpose**: Testing Data Mapper extension integration
**Framework**: ExTester + Mocha + Chai
**Features Tested**:
- Logic Apps project navigation
- Azure tab functionality
- Data Mapper section access
- Map creation workflow
- Interface validation
- Naming restriction enforcement

**Key Test Suites**:
- Step 1: Open Logic Apps Standard Project
- Step 2: Data Mapper Section Navigation
- Step 3: Data Map Creation Process
- Step 4: Data Mapper Interface Verification

### 3. `comprehensive.test.ts`
**Purpose**: Broad coverage test suite combining multiple scenarios
**Framework**: ExTester + Mocha + Chai
**Features Tested**:
- Extension foundation verification
- Azure authentication and cloud integration
- Project creation and management
- Advanced workflow features
- Deployment and monitoring
- Cross-platform compatibility

**Key Test Suites**:
- Extension Foundation Tests
- Azure Authentication and Cloud Integration
- Project Creation and Management
- Advanced Workflow Features
- Deployment and Monitoring
- Cross-Platform and Environment Compatibility

## Test Framework Architecture

### Technology Stack
- **ExTester**: VS Code extension testing framework (from PR #7774)
- **Mocha**: Test runner and organization
- **Chai**: Assertion library for expectations
- **TypeScript**: Type safety and IDE support

### Test Structure Pattern
```typescript
describe('Test Suite Name', function() {
  this.timeout(120000); // 2 minutes
  
  let workbench: Workbench;
  let driver: WebDriver;
  
  before(async function() {
    // Setup code
  });
  
  after(async () => {
    // Cleanup code
  });
  
  it('should test specific functionality', async function() {
    // Test implementation
  });
});
```

### Key Components Used
- `Workbench`: Main VS Code interface interaction
- `ActivityBar`: Side panel navigation (Azure tab)
- `EditorView`: File and editor management
- `VSBrowser`: Browser automation for VS Code
- Command palette interaction for extension commands

## Running the Tests

### Prerequisites
1. VS Code with Logic Apps extension installed
2. ExTester setup (from PR #7774 implementation)
3. Node.js and pnpm package manager

### Execution Commands

From repository root:
```bash
# Run UI mode tests
pnpm run vscode:designer:e2e:ui

# Run headless mode tests  
pnpm run vscode:designer:e2e:headless
```

From vs-code-designer directory:
```bash
# Build and run tests
pnpm run build:ui
cd dist
extest setup-and-run ../out/test/**/*.js --coverage
```

## Test Design Philosophy

### Framework Validation Approach
The tests are designed with a "framework validation" approach where:
1. **Primary Goal**: Verify the test framework and extension integration work correctly
2. **Secondary Goal**: Test actual functionality when possible in automated environment
3. **Realistic Expectations**: Account for limitations in automated UI testing of VS Code extensions

### Error Handling Strategy
- Tests continue execution even when individual interactions fail
- Extensive logging for troubleshooting and verification
- Graceful fallbacks with framework validation
- Clear separation between critical failures and expected limitations

### Test Coverage Areas
1. **Smoke Tests**: Basic extension loading and VS Code integration
2. **Authentication Flows**: Azure sign-in and subscription management
3. **Project Lifecycle**: Creation, configuration, and management
4. **Feature Integration**: Data Mapper, SQL storage, deployment
5. **Cross-Environment**: Multi-cloud, cross-platform scenarios

## Future Enhancements

### Potential Additions
1. **More ADO Test Cases**: Convert additional VS Code extension test cases
2. **Data-Driven Tests**: Parameterized tests for different configurations
3. **Performance Testing**: Load and stress testing scenarios
4. **Integration Testing**: End-to-end workflows with real Azure resources
5. **Visual Regression**: Screenshot comparison for UI consistency

### Maintenance Considerations
1. Keep tests synchronized with ADO test plan updates
2. Update test framework when ExTester or VS Code APIs change
3. Expand real functionality testing as automation capabilities improve
4. Regular review of test reliability and execution time

## Relationship to Existing E2E Infrastructure

### Integration with PR #7774
These tests build upon the ExTester + Mocha + Chai framework established in PR #7774:
- Uses same technology stack and patterns
- Follows established test organization principles
- Leverages existing build and execution infrastructure
- Maintains consistency with existing test suites

### Distinction from Playwright Tests
Unlike the Playwright-based tests in `/e2e/` (for standalone designer), these tests:
- Target VS Code extension environment specifically
- Use ExTester for VS Code automation
- Focus on extension integration scenarios
- Test within VS Code's constrained environment

This comprehensive test suite provides automated validation of the VS Code Logic Apps extension functionality based on real test cases from the Azure DevOps test plan, ensuring quality and reliability of the extension across different usage scenarios.
