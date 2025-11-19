# Chat History via PostMessage Feature

## Overview

The iframe app now supports receiving chat history via postMessage from parent blades, providing a more reliable way to populate chat history in the Azure Portal context compared to browser storage.

## Key Benefits

1. **More Reliable**: PostMessage is more reliable than localStorage, especially in cross-origin scenarios
2. **Secure**: Messages are validated for origin and signature
3. **Flexible**: Parent blade can send history at any time after iframe is ready
4. **Portal-Friendly**: Designed specifically for Azure Portal blade integration

## Implementation Details

### 1. Message Format

The chat history is sent using the Frame Blade protocol:

```typescript
{
  signature: 'FxFrameBlade',
  kind: 'chatHistory',
  data: {
    contextId: string,
    messages: Array<{
      id: string,
      role: 'user' | 'assistant' | 'system',
      content: string,
      timestamp: string | Date,
      metadata?: { artifacts?: Array<...>, [key: string]: any }
    }>,
    sessionMetadata?: { ... }
  }
}
```

### 2. Processing Flow

1. Parent blade embeds iframe with `inPortal=true` and `trustedAuthority`
2. Iframe sends 'ready' message when loaded
3. Parent blade sends chat history via postMessage
4. Iframe validates origin and signature
5. If in single-session mode:
   - Stores contextId in localStorage
   - Stores formatted messages in localStorage
   - Chat widget loads from localStorage automatically

### 3. Security

- Origin validation ensures messages only from trusted sources
- Frame Blade signature verification
- Trusted authority validation for portal contexts

## Usage Example

```javascript
// In parent blade
const iframe = document.getElementById('a2a-chat-frame');

// Wait for ready signal
window.addEventListener('message', (event) => {
  if (event.data.kind === 'ready') {
    // Send chat history
    iframe.contentWindow.postMessage({
      signature: 'FxFrameBlade',
      kind: 'chatHistory',
      data: {
        contextId: 'ctx-123',
        messages: [...],
        sessionMetadata: {...}
      }
    }, iframeOrigin);
  }
});
```

## Integration with Existing Features

- Works seamlessly with URL-based contextId parameter
- PostMessage history takes precedence over URL contextId
- Compatible with both single and multi-session modes
- Maintains backward compatibility

## Files Modified

1. `src/lib/types/chat-history.ts` - Type definitions
2. `src/lib/hooks/useFrameBlade.ts` - Added chat history handler
3. `src/components/IframeWrapper.tsx` - Process and store chat history
4. `docs/parent-blade-integration.md` - Complete integration guide
5. `docs/examples/parent-blade-integration.ts` - TypeScript example

## Testing

- Unit tests added for Frame Blade chat history handling
- Tests verify message validation, origin checking, and data processing
- All tests passing
