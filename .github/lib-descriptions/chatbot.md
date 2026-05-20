# libs/chatbot — AI Chatbot Integration

## Purpose
AI-powered chatbot integration for the Logic Apps Designer. Provides
conversational assistance for workflow authoring — helping users with expression
syntax, error explanations, operation suggestions, and workflow editing.

## NPM Package
`@microsoft/logic-apps-chatbot`

## Key Components
- `ChatPanel` — Main chat UI panel for general AI assistance
- `CopilotChatbot` — Copilot-specific chatbot variant for workflow editing
  (uses `BaseCopilotWorkflowEditorService` from `logic-apps-shared`)
- `UserMessage` / `AssistantMessage` — Message rendering
- `CodeBlock` — Code snippet display with syntax highlighting
- `SuggestionChips` — Quick-action suggestions

## Key Exports
- Chat panel components
- `Query` model — Structured chat query type
- Chat message types and utilities

## Architecture
- `core/` — AI service integration and message handling
- `ui/` — Chat UI components
- `common/` — Shared utilities and message types

## Dependencies
- `logic-apps-shared` — Utilities
- `designer-ui` — Shared UI components

## Common Issue Patterns

### Issues that belong HERE:
- Chat panel rendering issues
- AI response formatting problems
- Suggestion chip behavior
- Chat history management bugs
- CopilotChatbot UI issues (not the service — see `logic-apps-shared`)

### Issues that are often MISATTRIBUTED here:
- Copilot workflow editing **service logic** (tool calling, prompt engineering,
  discover_connectors) → `logic-apps-shared` copilot service
- General AI/Azure Copilot integration → Portal extension, not this library
- Expression help accuracy → may be the AI model, not this library's code
- A2A protocol chat → `a2a-core` library, not this one
