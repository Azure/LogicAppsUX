/**
 * Iframe integration for A2A Chat Widget
 *
 * Security: This component implements origin verification for postMessage communication.
 * To configure allowed origins, use one of these methods:
 *
 * 1. URL parameter: ?allowedOrigins=https://example.com,https://app.example.com
 * 2. Data attribute: <html data-allowed-origins="https://example.com,https://app.example.com">
 * 3. Wildcard subdomains: ?allowedOrigins=*.example.com
 *
 * If no origins are specified, the iframe will:
 * - Allow messages from its own origin
 * - Allow messages from the document referrer (parent frame)
 * - In development (localhost), allow common development ports
 */

import { useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { IframeWrapper } from '../components/IframeWrapper';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { parseIframeConfig, type IframeConfig } from './utils/config-parser';
import { IntlProvider } from '@microsoft/logic-apps-shared';
import '../styles/base.css';
import type { OnErrorFn } from '@formatjs/intl';

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

  const onError = useCallback<OnErrorFn>((err) => {
    if (err.code === 'MISSING_TRANSLATION' || err.code === 'MISSING_DATA') {
      console.error(`IntlProvider error ${err.code} - ${err.message} - ${err.stack}`);
      return;
    }
    throw err;
  }, []);

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
      <IntlProvider locale={'en-US'} defaultLocale={'en-US'} onError={onError}>
        <IframeWrapper config={config} />
      </IntlProvider>
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
