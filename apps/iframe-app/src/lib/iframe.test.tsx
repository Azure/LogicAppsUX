import { act, cleanup, screen, waitFor } from '@testing-library/react';
import type * as TestingLibraryReact from '@testing-library/react';
import type * as ReactDomClient from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IframeConfig } from './utils/config-parser';

const { createdRoots, errorDisplayMock, iframeWrapperMock, parseIframeConfigMock } = vi.hoisted(() => ({
  createdRoots: [] as Array<{ unmount: () => void }>,
  errorDisplayMock: vi.fn(
    ({ details, message, title }: { details?: { parameters?: string; url?: string }; message: string; title: string }) => (
      <div data-testid="error-display">
        <span>{title}</span>
        <span>{message}</span>
        <span>{details?.url}</span>
        <span>{details?.parameters}</span>
      </div>
    )
  ),
  iframeWrapperMock: vi.fn(({ config }: { config: IframeConfig }) => (
    <div data-testid="iframe-wrapper">
      {typeof config.props.agentCard === 'string' ? config.props.agentCard : config.props.agentCard.url}
    </div>
  )),
  parseIframeConfigMock: vi.fn(),
}));

vi.mock('react-dom/client', async () => {
  const { act: rtlAct } = await vi.importActual<typeof TestingLibraryReact>('@testing-library/react');
  const actual = await vi.importActual<typeof ReactDomClient>('react-dom/client');

  return {
    ...actual,
    createRoot: (container: Parameters<typeof actual.createRoot>[0], options?: Parameters<typeof actual.createRoot>[1]) => {
      const root = actual.createRoot(container, options);
      const wrappedRoot = {
        render: (node: Parameters<typeof root.render>[0]) => {
          rtlAct(() => {
            root.render(node);
          });
        },
        unmount: () => {
          root.unmount();
        },
      };

      createdRoots.push(wrappedRoot);
      return wrappedRoot;
    },
  };
});

vi.mock('../components/ErrorDisplay', () => ({
  ErrorDisplay: errorDisplayMock,
}));

vi.mock('../components/IframeWrapper', () => ({
  IframeWrapper: iframeWrapperMock,
}));

vi.mock('./utils/config-parser', () => ({
  parseIframeConfig: parseIframeConfigMock,
}));

vi.mock('../styles/base.css', () => ({}));

describe('iframe initialization', () => {
  const validAgentCardUrl = 'https://api.example.com/agent-card.json';
  const validConfig: IframeConfig = {
    inPortal: false,
    mode: 'light',
    multiSession: false,
    props: {
      agentCard: validAgentCardUrl,
    },
  };

  const importIframe = async () => {
    await act(async () => {
      await import('./iframe');
    });
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createdRoots.length = 0;
    document.body.innerHTML = '<div id="chat-root"></div>';
    window.history.replaceState({}, '', '/iframe?foo=bar');

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();

    while (createdRoots.length > 0) {
      const root = createdRoots.pop();
      root?.unmount();
    }

    document.body.innerHTML = '';
  });

  it('renders the iframe wrapper when configuration parses successfully', async () => {
    parseIframeConfigMock.mockReturnValue(validConfig);

    await importIframe();

    expect(await screen.findByTestId('iframe-wrapper')).toHaveTextContent(validAgentCardUrl);
    expect(parseIframeConfigMock).toHaveBeenCalledTimes(1);
    expect(errorDisplayMock).not.toHaveBeenCalled();
    expect(iframeWrapperMock.mock.calls[0][0]).toMatchObject({ config: validConfig });
  });

  it('renders a configuration error when parsing throws', async () => {
    parseIframeConfigMock.mockImplementation(() => {
      throw new Error('Invalid iframe configuration');
    });

    await importIframe();

    const errorDisplay = await screen.findByTestId('error-display');

    expect(errorDisplay).toHaveTextContent('Configuration error');
    expect(errorDisplay).toHaveTextContent('Invalid iframe configuration');
    expect(errorDisplay).toHaveTextContent('http://localhost:3000/iframe?foo=bar');
    expect(errorDisplay).toHaveTextContent('?foo=bar');
    expect(parseIframeConfigMock).toHaveBeenCalledTimes(1);
    expect(iframeWrapperMock).not.toHaveBeenCalled();
  });

  it('renders nothing when parsing returns null without throwing', async () => {
    parseIframeConfigMock.mockReturnValue(null);

    await importIframe();

    await waitFor(() => {
      expect(parseIframeConfigMock).toHaveBeenCalledTimes(1);
    });

    expect(document.getElementById('chat-root')?.innerHTML).toBe('');
    expect(screen.queryByTestId('iframe-wrapper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
  });

  it('renders a load error when the chat root element is missing', async () => {
    document.body.innerHTML = '';

    await importIframe();

    const errorDisplay = await screen.findByTestId('error-display');

    expect(errorDisplay).toHaveTextContent('Failed to load chat widget');
    expect(errorDisplay).toHaveTextContent('Chat root element not found');
    expect(errorDisplay).toHaveTextContent('http://localhost:3000/iframe?foo=bar');
    expect(errorDisplay).toHaveTextContent('?foo=bar');
    expect(parseIframeConfigMock).not.toHaveBeenCalled();
  });

  it('waits for DOMContentLoaded when the document is still loading', async () => {
    parseIframeConfigMock.mockReturnValue(validConfig);

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
      writable: true,
    });

    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    await importIframe();

    const domContentLoadedHandler = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === 'DOMContentLoaded'
    )?.[1] as EventListener;

    expect(domContentLoadedHandler).toBeTypeOf('function');
    expect(screen.queryByTestId('iframe-wrapper')).not.toBeInTheDocument();

    act(() => {
      domContentLoadedHandler(new Event('DOMContentLoaded'));
    });

    expect(await screen.findByTestId('iframe-wrapper')).toHaveTextContent(validAgentCardUrl);

    addEventListenerSpy.mockRestore();
  });
});
