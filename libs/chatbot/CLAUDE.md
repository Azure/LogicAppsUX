# Logic Apps Chatbot

AI-powered chatbot integration for the Logic Apps Designer. Provides conversational assistance for workflow creation and troubleshooting.

**Package**: `@microsoft/logic-apps-chatbot`

## Purpose

- **AI assistant** - Conversational help within the designer
- **Workflow suggestions** - AI-powered operation recommendations
- **Error explanations** - Natural language error descriptions
- **Expression help** - Assistance with workflow expressions

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Architecture

### Entry Point
`src/index.ts` exports chatbot components and hooks.

### Structure
```
/src/lib
  /components/     - Chat UI components
  /hooks/          - React hooks
  /services/       - AI service integration
  /utils/          - Utilities
```

## Key Components

### ChatPanel
Main chatbot panel for the designer:
```tsx
<ChatPanel
  onSend={handleSendMessage}
  messages={chatHistory}
  isLoading={isProcessing}
/>
```

### Message Components
- `UserMessage` - User input display
- `AssistantMessage` - AI response display
- `CodeBlock` - Code snippet rendering
- `SuggestionChips` - Quick action suggestions

## Integration

Used within the designer's side panel:
```tsx
// In designer
import { ChatPanel } from '@microsoft/logic-apps-chatbot'

<DesignerSidePanel>
  <ChatPanel {...chatProps} />
</DesignerSidePanel>
```

## AI Service Integration

The chatbot connects to backend AI services:
- Request/response formatting
- Streaming response handling
- Context management

## Styling

Uses Fluent UI for consistent appearance:
- Chat bubble styling
- Code syntax highlighting
- Loading indicators
- Theme-aware colors

## Dependencies

- `@microsoft/designer-ui` - UI components
- `@microsoft/logic-apps-shared` - Utilities
- `@fluentui/react-components` - UI framework
- `monaco-editor` - Code display

## Development Tips

1. **Testing**: Mock AI responses for unit tests
2. **Streaming**: Handle partial responses
3. **Context**: Manage conversation history
4. **Accessibility**: Screen reader support for chat
