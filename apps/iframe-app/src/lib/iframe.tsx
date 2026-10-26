/**
 * Iframe integration for A2A Chat Widget
 *
 * Security: This component implements origin verification for postMessage communication.
 * To configure allowed origins, use one of these trusted methods:
 *
 * 1. Render a data attribute inside the served iframe document:
 *    <html data-allowed-origins="https://example.com,https://app.example.com">
 * 2. Use the validated trustedAuthority configuration for Azure Portal.
 *
 * If no origins are specified, the iframe will:
 * - Allow messages from its own origin
 * - In development (localhost), allow common development ports
 *
 * Query parameters and document.referrer never authorize inbound messages.
 */

import { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { IframeWrapper } from '../components/IframeWrapper';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { parseIframeConfig, type IframeConfig } from './utils/config-parser';
import '../styles/base.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Main application component that uses the configuration
function App() {
  const [error, setError] = useState<Error | null>(null);

  const config = useMemo<IframeConfig | null>(() => {
    try {
      return parseIframeConfig();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }, []);

  const queryClient = useMemo(() => new QueryClient(), []);

  if (error) {
    return (
      <ErrorDisplay
        title="Configuration error"
        message={error.message}
        details={{
          url: window.location.href,
          parameters: window.location.search || 'none',
        }}
      />
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div style={{ height: '100vh' }}>
      <QueryClientProvider client={queryClient}>
        <IframeWrapper config={config} />
      </QueryClientProvider>
    </div>
  );
}

// Initialize the widget
function init() {
  try {
    const container = document.getElementById('chat-root');
    if (!container) {
      throw new Error('Chat root element not found');
    }

    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      location: window.location.href,
      search: window.location.search,
    };

    // Display error to user
    const root = createRoot(document.body);
    root.render(
      <ErrorDisplay
        title="Failed to load chat widget"
        message={errorDetails.message}
        details={{
          url: errorDetails.location,
          parameters: errorDetails.search || 'none',
        }}
      />
    );
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
