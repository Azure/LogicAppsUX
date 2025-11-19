# A2A Chat E2E Test Suite Inventory

**Last Updated:** November 3, 2025
**Total Test Files:** 13
**Total Test Scenarios:** 139

---

## 📋 Executive Summary

This document provides a comprehensive inventory of all end-to-end (E2E) tests for the A2A Chat application. The test suite is organized into two main categories: **Smoke Tests** (critical path validation) and **Feature Tests** (comprehensive functional testing organized by domain).

### Test Coverage Areas

- ✅ Authentication & Authorization
- ✅ Chat Messaging & SSE Streaming
- ✅ Session Management & History
- ✅ User Interface & Accessibility
- ✅ Error Handling & Reliability
- ✅ Edge Cases & Boundary Conditions

---

## 🚀 Smoke Tests (11 scenarios)

**Purpose:** Fast, critical path tests that must always pass. These validate the core user journey and are run on every deployment.

### 📄 `smoke/page-load.spec.ts` - 3 tests

Basic application loading and initialization:

- ✓ Page loads without errors
- ✓ Correct page title displayed
- ✓ No JavaScript console errors on load

### 📄 `smoke/basic-chat.spec.ts` - 8 tests

**Critical Chat Flow:**

- ✓ Chat interface displays after starting new chat
- ✓ Messages can be sent and displayed
- ✓ Loading state shown while waiting for response
- ✓ Enter key sends messages
- ✓ Send button enables when text entered
- ✓ User messages appear in chat history

**Accessibility (Critical):**

- ✓ Full keyboard accessibility
- ✓ Proper ARIA labels present

---

## 🎯 Feature Tests by Domain (128 scenarios)

### 🔐 Authentication (14 tests)

Tests covering API key and OBO (On-Behalf-Of) token authentication flows.

#### 📄 `features/authentication/auth-flow.spec.ts` - 9 tests

**Authentication Flows:**

- ✓ Authentication required UI displays correctly
- ✓ Service icon shown when provided
- ✓ Multiple authentication requirements handled
- ✓ Authentication cancellation supported
- ✓ Popup blocker scenarios handled
- ✓ Popup opens when sign-in button clicked
- ✓ Authenticating state shown while popup open
- ✓ Cancel button disabled during authentication

**Authentication Edge Cases:**

- ✓ Rapid authentication attempts handled

#### 📄 `features/authentication/auth-headers.spec.ts` - 10 tests

**API Key Authentication:**

- ✓ API key included in agent card requests
- ✓ API key included in message/stream requests
- ✓ API key included in contexts/list requests

**OBO Token Authentication:**

- ✓ OBO token included in agent card requests
- ✓ OBO token included in message/stream requests
- ✓ OBO token included in contexts/list requests

**Combined Authentication:**

- ✓ Both API key and OBO token sent together
- ✓ Credentials maintained across multiple requests

**Edge Cases:**

- ✓ No API key header when not provided
- ✓ Special characters in API key handled

---

### 💬 Messaging (28 tests)

Tests covering message sending, receiving, and SSE (Server-Sent Events) streaming.

#### 📄 `features/messaging/complete-flow.spec.ts` - 2 tests

**End-to-End Chat Flow:**

- ✓ Complete chat conversation from start to finish
- ✓ Typing indicator shown while waiting for response

#### 📄 `features/messaging/input-validation.spec.ts` - 17 tests

**Input Validation:**

- ✓ Whitespace trimmed from messages
- ✓ Newlines handled in messages
- ✓ Unicode characters supported
- ✓ Numbers and symbols processed
- ✓ Markdown-like syntax handled
- ✓ Input value preserved while typing
- ✓ Messages can be edited before sending
- ✓ Rapid typing handled
- ✓ Pasting text supported
- ✓ Input can be cleared and refilled

**Input State Management:**

- ✓ Focus maintained on input after typing
- ✓ Input cleared after successful send
- ✓ Input disabled while waiting for response
- ✓ Send button state updates based on input
- ✓ Escape key handled without crashing

#### 📄 `features/messaging/sse-responses.spec.ts` - 9 tests

**SSE Response Handling:**

- ✓ Simple text responses received and displayed
- ✓ Code blocks rendered correctly
- ✓ Images displayed correctly
- ✓ Structured data shown correctly
- ✓ Streaming responses handled progressively
- ✓ Error responses handled gracefully
- ✓ Multiple messages processed in sequence
- ✓ Mixed content types in conversation

**SSE Connection Management:**

- ✓ Reconnection if connection lost

---

### 📚 Sessions (25 tests)

Tests for chat session creation, management, and history loading.

#### 📄 `features/sessions/chat-history.spec.ts` - 15 tests

**Chat History Loading:**

- ✓ Existing chat sessions loaded on initial load
- ✓ Sessions displayed in sidebar
- ✓ Empty chat history handled gracefully

**Loading Historical Messages:**

- ✓ Messages loaded when clicking historical session
- ✓ Historical messages displayed in correct order
- ✓ Both user and assistant messages shown from history

**Session Switching:**

- ✓ Switching between different historical sessions
- ✓ Active session indicator preserved

**Authentication with History:**

- ✓ API key included in contexts/list request
- ✓ OBO token included in contexts/list request
- ✓ API key included in tasks/list request

**Error Handling:**

- ✓ contexts/list failure handled gracefully
- ✓ tasks/list failure handled gracefully

**Creating New Chat:**

- ✓ New chat creation allowed with existing history
- ✓ New session created when sending message in new chat

#### 📄 `features/sessions/multi-session.spec.ts` - 8 tests

**Multi-Session Management:**

- ✓ Multiple chat sessions can be created
- ✓ Sessions shown in sidebar after creation
- ✓ Session title based on first message
- ✓ Separate message history per session
- ✓ Empty state shown for new session

**Session Switching:**

- ✓ Switching between sessions via sidebar
- ✓ Input preserved when switching sessions
- ✓ Active session indicator displayed

#### 📄 `features/sessions/session-management.spec.ts` - 10 tests

**Session Management UI:**

- ✓ Empty state when no sessions exist
- ✓ New chat session created via "Start a new chat"
- ✓ "+ New Chat" button always visible in sidebar
- ✓ Message input shown with placeholder text
- ✓ Send button enabled when message typed
- ✓ User message shown in chat after sending
- ✓ "Agent is typing..." indicator displayed
- ✓ Message input cleared after sending
- ✓ Agent name shown in header
- ✓ Agent description shown in header

---

### 🎨 UI & Accessibility (35 tests)

Tests ensuring the interface is accessible, keyboard-navigable, and handles edge cases.

#### 📄 `features/ui/accessibility.spec.ts` - 17 tests

**Keyboard Navigation:**

- ✓ Tab navigates to "Start a new chat" button
- ✓ Enter key activates "Start a new chat"
- ✓ Space key activates "Start a new chat"
- ✓ Chat interface navigable with keyboard
- ✓ Enter key sends message from input
- ✓ Shift+Enter creates new line

**ARIA Labels and Semantics:**

- ✓ Accessible button labels present
- ✓ Proper heading structure
- ✓ Accessible form controls
- ✓ Semantic HTML elements used
- ✓ Proper button types

**Focus Management:**

- ✓ Focus moves to message input when chat opens
- ✓ Input disabled while agent responding
- ✓ Visible focus indicators
- ✓ Keyboard focus not trapped

**Color Contrast:**

- ✓ Readable text in empty state
- ✓ Readable button text

#### 📄 `features/ui/edge-cases.spec.ts` - 18 tests

**Rapid Interactions:**

- ✓ Rapid send button clicks handled
- ✓ Rapid typing and sending handled
- ✓ Rapid "Start a new chat" clicks handled
- ✓ Rapid session switching handled

**Boundary Conditions:**

- ✓ Single character messages processed
- ✓ Messages with only numbers handled
- ✓ Messages with repeated characters handled
- ✓ Messages with only punctuation handled
- ✓ Zero-width characters handled
- ✓ Messages with tab characters handled

**Browser Behavior:**

- ✓ Page refresh during chat handled
- ✓ Browser back button handled
- ✓ Browser forward button handled
- ✓ State maintained when window loses/regains focus
- ✓ Window resize handled

**Race Conditions:**

- ✓ Typing while previous message sending
- ✓ Rapid input changes handled
- ✓ Send button state during rapid typing

---

### 🛡️ Reliability & Error Handling (11 tests)

Tests ensuring graceful degradation and error recovery.

#### 📄 `features/reliability/error-handling.spec.ts` - 11 tests

**Connection & Loading Errors:**

- ✓ Error shown when agent card fails to load
- ✓ Error shown when agent card is invalid JSON
- ✓ Error shown when session list fails to load
- ✓ Network timeout handled gracefully
- ✓ Missing agent card parameter handled

**Message Error Handling:**

- ✓ Empty messages prevented from sending
- ✓ Whitespace-only messages prevented
- ✓ Very long messages handled
- ✓ Special characters in messages processed
- ✓ Emoji in messages supported

---

## 🏗️ Test Infrastructure

### Testing Framework

- **Playwright**: Browser automation and E2E testing
- **TypeScript**: Type-safe test code
- **Fixtures**: Shared SSE mocking and agent card setup

### Test Execution

- Tests run in Chromium by default
- Support for parallel execution (8 workers)
- SSE (Server-Sent Events) mocking for reliable testing
- Cross-browser testing capability (Chromium, Firefox, WebKit)

### Mocking Strategy

- **Agent Card**: Mocked via route interception
- **SSE Streams**: Custom fixture with configurable responses
- **Authentication**: Mock popup windows for OBO flow testing
- **Sessions**: URL parameter-based mocking (`withHistory=true`, `errorHistory=true`, etc.)

---

## 📊 Test Coverage by Category

| Category              | Test Files | Test Scenarios | % of Total |
| --------------------- | ---------- | -------------- | ---------- |
| 🚀 Smoke Tests        | 2          | 11             | 8%         |
| 🔐 Authentication     | 2          | 14             | 10%        |
| 💬 Messaging          | 3          | 28             | 20%        |
| 📚 Sessions           | 3          | 25             | 18%        |
| 🎨 UI & Accessibility | 2          | 35             | 25%        |
| 🛡️ Reliability        | 1          | 11             | 8%         |
| **TOTAL**             | **13**     | **139**        | **100%**   |

---

## 🔍 Key Testing Scenarios

### User Journeys Covered

1. ✅ **First Time User**: Open app → Start chat → Send message → Receive response
2. ✅ **Returning User**: Open app → See history → Resume session → Continue conversation
3. ✅ **Multi-Session User**: Create multiple chats → Switch between them → Manage sessions
4. ✅ **Authenticated User**: Handle OBO token flow → Complete authentication → Chat with credentials
5. ✅ **Error Recovery**: Handle network failures → Show errors → Allow retry

### Protocol Coverage

- ✅ Agent Card loading and validation
- ✅ contexts/list (session listing)
- ✅ tasks/list (message history loading)
- ✅ message/stream (SSE-based chat)
- ✅ Authentication flows (OBO and API key)

### Browser Features Tested

- ✅ Keyboard navigation
- ✅ Focus management
- ✅ ARIA labels and semantics
- ✅ Page lifecycle (refresh, back/forward)
- ✅ Window events (resize, focus)

---

## 🚦 Running the Tests

### Run All Tests

```bash
pnpm test:e2e
```

### Run Smoke Tests Only

```bash
pnpm test:e2e e2e/tests/smoke
```

### Run Specific Feature Area

```bash
pnpm test:e2e e2e/tests/features/authentication
pnpm test:e2e e2e/tests/features/messaging
pnpm test:e2e e2e/tests/features/sessions
pnpm test:e2e e2e/tests/features/ui
pnpm test:e2e e2e/tests/features/reliability
```

### Run Specific Test File

```bash
pnpm test:e2e e2e/tests/features/authentication/auth-flow.spec.ts
```

### Run in Different Browsers

```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

---

## 📝 Test Maintenance Notes

### When to Update Tests

- ✏️ **New Features**: Add tests in appropriate domain directory
- 🔧 **Bug Fixes**: Add regression test before fixing
- 🎯 **UI Changes**: Update selectors and expectations
- 📋 **API Changes**: Update mocks and assertions

### Test Organization Principles

- **Smoke tests**: Must be fast (<30s total) and test critical path only
- **Feature tests**: Organized by domain, can be more comprehensive
- **One assertion per test**: Tests should verify single behavior
- **Test behavior, not implementation**: Focus on user-visible outcomes

### Test File Locations

```
e2e/tests/
├── smoke/              # Critical path tests (fast)
└── features/           # Domain-organized feature tests
    ├── authentication/ # Auth flows and credentials
    ├── messaging/      # Chat and SSE functionality
    ├── sessions/       # Session management and history
    ├── ui/            # UI behavior and accessibility
    └── reliability/    # Error handling and recovery
```

---

## ✅ Test Quality Metrics

- **Total Coverage**: 139 test scenarios
- **Critical Path Tests**: 11 smoke tests
- **Authentication Coverage**: 14 tests (API key + OBO)
- **Accessibility Tests**: 17 tests (WCAG compliance)
- **Error Scenarios**: 11 dedicated error tests
- **Edge Cases**: 18 boundary condition tests

---

**Report Generated:** November 3, 2025
**Test Suite Version:** 1.0
**Maintained By:** A2A Chat Team
