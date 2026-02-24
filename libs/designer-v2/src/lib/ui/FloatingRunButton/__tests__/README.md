# Chat Button Test Suite

## Overview
Comprehensive unit tests for the ChatButton component and its child components.

## Test Coverage

### 1. Basic Rendering
- ✅ Renders chat button with split button interface
- ✅ Handles custom tooltips when disabled
- ✅ Displays correct button labels

### 2. Chat Dialog Functionality
- ✅ Opens chat dialog on primary button click
- ✅ Saves workflow before opening dialog
- ✅ Displays iframe when authentication is disabled
- ✅ Opens new tab when authentication is enabled
- ✅ Passes dark mode parameter to iframe
- ✅ Includes API key and OBO token in query params

### 3. Info Dialog - Draft Mode
- ✅ Opens info dialog when menu button is clicked
- ✅ Displays "Chat Availability" as title
- ✅ Shows Development & Testing section
- ✅ Shows Production section
- ✅ Shows Setting up authentication section
- ✅ Does not show tabs (Connect to Agent / Chat Availability)
- ✅ Does not show agent credentials

### 4. Info Dialog - Production Mode
- ✅ Shows tab navigation (Connect to Agent / Chat Availability)
- ✅ Defaults to "Connect to Agent" tab
- ✅ Allows switching between tabs
- ✅ Displays Agent URL field with copy functionality
- ✅ Displays API Key field (password masked) with copy functionality
- ✅ Copies Agent URL to clipboard
- ✅ Copies API Key to clipboard
- ✅ Shows "Copied!" confirmation after copy
- ✅ Shows "Configure Authentication" link when auth is disabled
- ✅ Shows "Open Chat Client" link when auth is enabled
- ✅ Updates dialog title based on active tab

### 5. Child Components
- ✅ **ChatAvailabilitySection**: Renders all availability information
- ✅ **CredentialField**: Handles URL and API key fields with copy functionality
- ✅ **ConnectToAgentSection**: Displays both Option 1 (credentials) and Option 2 (chat client)
- ✅ **SectionTabs**: Manages tab navigation and styling

### 6. useAgentUrl Hook
- ✅ Fetches agent URL for draft mode
- ✅ Fetches agent URL for production mode
- ✅ Caches results for 24 hours
- ✅ Returns correct data structure (agentUrl, chatUrl, authenticationEnabled, queryParams)

### 7. Tooltip Behavior
- ✅ Shows default tooltip when not disabled
- ✅ Shows custom tooltip when provided
- ✅ Shows authentication-specific tooltip in draft mode with auth enabled
- ✅ Shows authentication-specific tooltip in production mode with auth enabled

## Running Tests

```bash
# Run all tests
pnpm --filter @microsoft/logic-apps-designer-v2 test

# Run only chat tests
pnpm --filter @microsoft/logic-apps-designer-v2 test -- chat.test.tsx

# Run with coverage
pnpm --filter @microsoft/logic-apps-designer-v2 test -- --coverage
```

## Test Structure

### Setup
- Mocks WorkflowService.getAgentUrl
- Configures QueryClient for React Query
- Provides IntlProvider for internationalization
- Sets up userEvent for user interactions

### Utilities
- `renderWithProviders`: Wraps component with QueryClient and IntlProvider
- `renderHook`: Helper for testing custom hooks
- Mock clipboard API for copy functionality

## Mock Data

Default mock agent URL response:
```typescript
{
  agentUrl: 'https://test-agent.azurewebsites.net',
  chatUrl: 'https://test-chat.azurewebsites.net',
  hostName: 'test-agent.azurewebsites.net',
  authenticationEnabled: false,
  queryParams: {
    apiKey: 'test-api-key-123',
  },
}
```

## Notes

- Tests use `@testing-library/react` for component testing
- Tests use `@testing-library/user-event` for simulating user interactions
- Tests use `vitest` as the test runner
- All async operations use `waitFor` for proper timing
- Clipboard operations are mocked via navigator.clipboard
