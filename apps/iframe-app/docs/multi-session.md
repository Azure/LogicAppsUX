# Multi-Session Chat Feature

The iframe app now supports multiple concurrent chat sessions, similar to Discord or Microsoft Teams. Each session maintains its own conversation history and context ID.

## How to Enable

Add the `multiSession=true` parameter to the iframe URL:

```html
<iframe src="https://your-domain.com/iframe.html?multiSession=true&agentCard=..."></iframe>
```

Or via data attribute:

```html
<iframe
  src="https://your-domain.com/iframe.html"
  data-multi-session="true"
  data-agent-card="..."
></iframe>
```

## Features

### Session Management

- **Multiple Sessions**: Users can have multiple chat sessions open simultaneously
- **Session Persistence**: All sessions are saved to localStorage and persist across browser refreshes
- **Context ID Tracking**: Each session is linked to its unique context ID after the first message exchange

### User Interface

- **Session List Sidebar**: Discord/Teams-like sidebar showing all chat sessions
- **Session Switching**: Click any session to switch to it instantly
- **New Session**: Click the "+" button to start a new chat session
- **Session Renaming**: Click the edit icon to rename any session
- **Session Deletion**: Delete sessions you no longer need (requires at least one session)

### Session Details

- Each session displays:
  - Custom session name
  - Last message preview
  - Time since last activity
  - Active session highlighting

## Technical Implementation

### Data Structure

Sessions are stored in localStorage with the following structure:

- Session ID: Unique identifier generated on creation
- Context ID: Set after first message exchange with the agent
- Messages: Complete conversation history
- Metadata: Creation time, last update time, session name

### Session Lifecycle

1. **Creation**: New sessions start without a context ID
2. **First Message**: Context ID is assigned by the server and linked to the session
3. **Persistence**: All changes are immediately saved to localStorage
4. **Switching**: Previous session state is preserved when switching

## Styling

The multi-session UI uses CSS variables for theming and supports both light and dark modes. Key variables:

- `--chat-bg-secondary`: Sidebar background
- `--chat-bg-hover`: Hover state for session items
- `--chat-bg-active`: Active session background
- `--chat-primary`: Primary action color

## Example Usage

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Multi-Session Chat</title>
  </head>
  <body>
    <iframe
      src="https://your-domain.com/iframe.html?multiSession=true&agentCard=https://api.example.com/agent-card.json"
      style="width: 100%; height: 600px; border: none;"
    >
    </iframe>
  </body>
</html>
```
