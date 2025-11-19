# Context ID Feature

## Overview

The iframe app now supports passing a `contextId` parameter to link conversations to specific sessions and maintain conversation history. This feature is designed for single-session mode only.

## Usage

### URL Parameter

```
https://your-domain.com/iframe.html?agentCard=...&contextId=unique-context-123
```

### Data Attribute

```html
<html data-agent-card="..." data-context-id="unique-context-123"></html>
```

## How It Works

1. **Single-Session Mode Only**: The contextId is only used when the chat is in single-session mode (`singleSession=true` or multi-session not enabled).

2. **Session Persistence**: When a contextId is provided:
   - It's stored in localStorage with the key `a2a-context-{sessionKey}`
   - The chat widget will use this contextId for all messages
   - Conversation history associated with this contextId will be loaded

3. **Existing Sessions**: If a contextId already exists in localStorage for the session, the new contextId from the URL will NOT overwrite it. This prevents accidentally losing active conversations.

## Implementation Details

- The contextId is parsed in `config-parser.ts` along with other configuration options
- The `IframeWrapper` component pre-populates localStorage with the contextId before the ChatWidget initializes
- The a2a-core library's `useA2a` hook automatically picks up the contextId from localStorage
- All messages sent to the agent will include this contextId

## Example

```html
<!-- Embed iframe with specific context -->
<iframe
  src="https://your-domain.com/iframe.html?agentCard=https://api.example.com/agent-card.json&contextId=customer-12345-session-001"
  width="400"
  height="600"
></iframe>
```

This will ensure that all conversations in this iframe are linked to the context `customer-12345-session-001`, allowing the agent to maintain conversation history and context across page reloads.
