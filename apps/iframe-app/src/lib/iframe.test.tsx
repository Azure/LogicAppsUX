import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';

// Mock dependencies
vi.mock('react-dom/client');
vi.mock('@microsoft/logicAppsChat', () => ({
  ChatWidget: vi.fn(() => null),
}));
vi.mock('../styles/base.css', () => ({}));
vi.mock('./hooks/useIframeConfig', () => ({
  useIframeConfig: vi.fn(() => ({
    apiUrl: 'http://localhost:3000',
    allowedOrigins: ['*'],
    contextId: 'test-context',
  })),
}));
vi.mock('../components/IframeWrapper', () => ({
  IframeWrapper: vi.fn(() => null),
}));
vi.mock('../components/ErrorDisplay', () => ({
  ErrorDisplay: vi.fn(() => null),
}));

describe('iframe initialization', () => {
  let mockCreateRoot: ReturnType<typeof vi.fn>;
  let mockRoot: { render: ReturnType<typeof vi.fn> };
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear module cache to allow re-importing
    vi.resetModules();

    // Mock createRoot
    mockRoot = { render: vi.fn() };
    mockCreateRoot = vi.fn().mockReturnValue(mockRoot);
    vi.mocked(createRoot).mockImplementation(mockCreateRoot);

    // Mock console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create chat-root element
    document.body.innerHTML = '<div id="chat-root"></div>';

    // Mock document.readyState
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('initializes successfully when chat-root element exists', async () => {
    await import('./iframe');

    // Wait a bit for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('chat-root'));
    expect(mockRoot.render).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  }, 10000);

  it('displays error when chat-root element is missing', async () => {
    document.body.innerHTML = '';

    await import('./iframe');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize chat widget:',
      expect.any(Error)
    );
    expect(mockCreateRoot).toHaveBeenCalledWith(document.body);
    expect(mockRoot.render).toHaveBeenCalled();
  });

  it.skip('handles non-error objects gracefully', async () => {
    document.body.innerHTML = '';

    let callCount = 0;
    // Mock createRoot to throw on first call, succeed on second
    vi.mocked(createRoot).mockImplementation((element) => {
      callCount++;
      if (callCount === 1) {
        throw 'String error';
      }
      // Return a mock root for the error display
      return mockRoot;
    });

    await import('./iframe');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize chat widget:',
      'String error'
    );

    // Should render error display
    expect(mockRoot.render).toHaveBeenCalled();
  });

  it('waits for DOMContentLoaded when document is still loading', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
      configurable: true,
    });

    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    await import('./iframe');

    expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    expect(mockCreateRoot).not.toHaveBeenCalled();

    // Simulate DOMContentLoaded
    const handler = addEventListenerSpy.mock.calls[0][1] as EventListener;
    handler(new Event('DOMContentLoaded'));

    expect(mockCreateRoot).toHaveBeenCalled();
    expect(mockRoot.render).toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });
});
