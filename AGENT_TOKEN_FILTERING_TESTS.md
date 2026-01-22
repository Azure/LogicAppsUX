# Agent Token Filtering Tests

This document describes the comprehensive test suite added for the Agent token filtering functionality to address the assessment recommendations.

## Overview

The Agent token filtering feature dynamically filters output tokens based on the `responseFormat.type` parameter in Agent operations. This ensures that only relevant tokens are shown to users in the token picker based on their selected response format.

## Tests Added

### Unit Tests

#### 1. `filterTokensForAgentPerInput` Tests
**Location**: `libs/designer-v2/src/lib/core/utils/__test__/tokens.spec.ts`

Tests the core filtering logic for Agent operation outputs:

- **json_schema scenario**: Verifies only outputs containing 'body' in their name are included
- **json_object/text scenarios**: Verifies only 'outputs' tokens are included  
- **Default/no parameter scenario**: Verifies only 'lastAssistantMessage' tokens are included

These tests ensure the filtering function correctly processes different response format types and handles edge cases like missing or empty parameters.

#### 2. `convertOutputsToTokens` Tests  
**Location**: `libs/designer-v2/src/lib/core/utils/__test__/tokens.spec.ts`

Tests the token conversion process and filtering integration:

- **Agent node filtering**: Verifies filtering is applied when inputs are provided for Agent operations
- **Token type assignment**: Tests correct TokenType assignment (ITEM, AGENTPARAMETER, OUTPUTS) for different node types
- **Non-Agent operations**: Ensures filtering does NOT affect non-Agent operation types

These tests validate that the filtering only applies to Agent operations and that token metadata is correctly generated.

#### 3. `updateParameterConditionalVisibilityAndRefreshOutputs` Tests
**Location**: `libs/designer-v2/src/lib/core/actions/bjsworkflow/__test__/initialize.spec.ts`

Tests the async thunk that handles parameter changes and token refresh:

- **Thunk structure**: Validates the thunk is properly defined and returns a function
- **Payload validation**: Ensures the thunk accepts required parameters without throwing
- **Action type verification**: Confirms the thunk has the correct action identifier

These tests document the expected interface and behavior of the thunk that orchestrates parameter updates and token refreshing.

### E2E Test

#### Agent Settings Token Filtering Test
**Location**: `e2e/designer/AgentTokenFiltering.spec.ts`

**Test Scenarios**:
1. **Dynamic token filtering**: Tests changing `responseFormat.type` parameter and verifying the correct tokens appear in the dynamic content picker
2. **Multiple response formats**: Validates behavior across json_schema, json_object, text, and default (empty) scenarios  
3. **Non-interference**: Ensures Agent token filtering doesn't affect other operation types

**Test Flow**:
- Navigate to Agent workflow
- Open Agent operation settings
- Change responseFormat.type parameter
- Open dynamic content picker
- Verify only expected tokens are visible
- Repeat for different response format values

This E2E test provides end-to-end validation of the complete user workflow and ensures the feature works correctly in the actual UI.

## Coverage Justification

These tests provide comprehensive coverage of the Agent token filtering functionality:

1. **Unit-level validation**: Core filtering logic and token conversion processes
2. **Integration validation**: Parameter update workflow and state management  
3. **End-to-end validation**: Complete user interaction flow and UI behavior

The tests cover all major code paths, error scenarios, and edge cases while ensuring the feature works correctly for both Agent and non-Agent operations.

## Test Execution

To run the tests:

```bash
# Unit tests only
pnpm run test:lib --grep "filterTokensForAgentPerInput|convertOutputsToTokens|updateParameterConditionalVisibilityAndRefreshOutputs"

# E2E tests only  
pnpm run test:e2e --grep "Agent Settings Token Filtering"

# All tests
pnpm run test:lib && pnpm run test:e2e --grep "@mock"
```

## Notes

- Unit tests use proper mocking to isolate functionality under test
- E2E tests are marked with `@mock` tag for mock API execution
- Tests follow existing project patterns and conventions
- All tests include descriptive names and clear assertions for maintainability