import React from 'react';
import { ChatWidget } from '../react';

/**
 * Example showing how to use a custom username in the chat widget.
 *
 * In a real application, you might get the username from:
 * - User authentication system
 * - User profile data
 * - Global window variable (like window.LOGGED_IN_USER_NAME)
 * - Props passed from parent component
 */
export function CustomUsernameExample() {
  // Example 1: Static custom username
  return (
    <ChatWidget
      agentCard="https://agent.example.com/agent-card.json"
      userName="John Doe"
      welcomeMessage="Hello John! How can I help you today?"
    />
  );
}

export function DynamicUsernameExample() {
  // Example 2: Username from global variable (like in iframe)
  const userName = (window as any).LOGGED_IN_USER_NAME || 'You';

  return (
    <ChatWidget
      agentCard="https://agent.example.com/agent-card.json"
      userName={userName}
      welcomeMessage={`Hello ${userName}! How can I help you today?`}
    />
  );
}

export function AuthenticatedUsernameExample({ user }: { user?: { name: string; email: string } }) {
  // Example 3: Username from authenticated user object
  return (
    <ChatWidget
      agentCard="https://agent.example.com/agent-card.json"
      userName={user?.name || 'Guest'}
      userId={user?.email}
      welcomeMessage={
        user
          ? `Welcome back, ${user.name}!`
          : 'Welcome! Please sign in for a personalized experience.'
      }
    />
  );
}
