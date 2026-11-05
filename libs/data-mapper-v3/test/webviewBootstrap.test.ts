// @vitest-environment jsdom
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ReactDomClient from 'react-dom/client';
import type { MapEditorVsCodeApi } from '../src/protocol/mapEditorProtocol';
import type { MapperAppHandle } from '../webview/src/components/MapperApp';

interface AppBoundaryProps {
  vscode: MapEditorVsCodeApi;
  onAppReady(app: MapperAppHandle | null): void;
}

const boundary = vi.hoisted(() => ({ props: undefined as AppBoundaryProps | undefined, roots: [] as ReactDomClient.Root[] }));

vi.mock('../webview/src/ReactMapperRoot', () => ({
  ReactMapperRoot: (props: AppBoundaryProps) => {
    boundary.props = props;
    return React.createElement('div', { 'data-testid': 'mapper-root' });
  },
}));

vi.mock('react-dom/client', async (importOriginal) => {
  const original = await importOriginal<typeof ReactDomClient>();
  return {
    ...original,
    createRoot: vi.fn((container: HTMLElement) => {
      const root = original.createRoot(container);
      boundary.roots.push(root);
      return root;
    }),
  };
});

import { createRoot } from 'react-dom/client';

describe('webview synchronous bootstrap boundary (mock VS Code API)', () => {
  let messageListeners: EventListener[];
  const postMessage = vi.fn();
  const acquireApi = vi.fn(() => ({ postMessage }));

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    boundary.props = undefined;
    boundary.roots = [];
    messageListeners = [];
    document.body.innerHTML = '<div id="app"></div>';
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    acquireApi.mockReset().mockReturnValue({ postMessage });
    vi.stubGlobal('acquireVsCodeApi', acquireApi);
    const addEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'message') {
        messageListeners.push(listener as EventListener);
      }
      addEventListener(type, listener, options);
    });
  });

  afterEach(async () => {
    await act(async () => {
      for (const root of boundary.roots) {
        root.unmount();
      }
    });
    for (const listener of messageListeners) {
      window.removeEventListener('message', listener);
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  async function bootstrap(): Promise<void> {
    await act(async () => {
      await import('../webview/src/index');
    });
  }

  it.each([new Error('API unavailable'), Object.assign(new Error('API unavailable'), { stack: '' }), 'API unavailable'])(
    'renders a caught API failure: %s',
    async (failure) => {
      acquireApi.mockImplementation(() => {
        throw failure;
      });
      await bootstrap();
      expect(document.querySelector('h3')?.textContent).toBe('Logic App Data Mapper - Error');
      expect(document.querySelector('pre')?.textContent).toContain('API unavailable');
      if (failure instanceof Error) {
        expect(document.querySelector('pre')?.textContent).toContain(failure.stack);
      } else {
        expect(document.querySelector('pre')?.textContent).toBe(failure);
      }
      expect(postMessage).not.toHaveBeenCalled();
    }
  );

  it('does not mount or announce readiness without the app container', async () => {
    document.body.replaceChildren();
    await bootstrap();
    expect(createRoot).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(boundary.props).toBeUndefined();
  });

  it('recovers from a synchronous createRoot failure with a second root', async () => {
    vi.mocked(createRoot).mockImplementationOnce(() => {
      throw new Error('root creation failed');
    });
    await bootstrap();
    expect(createRoot).toHaveBeenCalledTimes(2);
    expect(document.querySelector('pre')?.textContent).toContain('root creation failed');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('announces readiness and forwards only validated messages to the current app', async () => {
    await bootstrap();
    expect(document.querySelector('[data-testid="mapper-root"]')).not.toBeNull();
    expect(postMessage).not.toHaveBeenCalled();
    const message = {
      type: 'init',
      data: { map: {}, functoids: [], availableSchemas: [], sourceSchema: null, targetSchema: null },
    };
    window.dispatchEvent(new MessageEvent('message', { data: message }));
    const app = { handleMessage: vi.fn() };
    boundary.props?.onAppReady(app);
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'ready' });
    expect(app.handleMessage).not.toHaveBeenCalled();
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'unknown' } }));
    window.dispatchEvent(new MessageEvent('message', { data: message }));
    expect(app.handleMessage).toHaveBeenCalledExactlyOnceWith(message);
    boundary.props?.onAppReady(null);
    window.dispatchEvent(new MessageEvent('message', { data: message }));
    expect(app.handleMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it('does not catch a later React render failure in the synchronous bootstrap guard', async () => {
    await bootstrap();
    const failure = new Error('later React render failed');
    function LaterRenderFailure(): never {
      throw failure;
    }
    const handleExpectedError = (event: ErrorEvent): void => {
      if (event.error === failure) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleExpectedError);
    try {
      await expect(
        act(async () => {
          boundary.roots[0].render(React.createElement(LaterRenderFailure));
        })
      ).rejects.toThrow(failure);
      expect(createRoot).toHaveBeenCalledTimes(1);
      expect(document.querySelector('h3')).toBeNull();
      expect(document.querySelector('pre')).toBeNull();
      expect(postMessage).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('error', handleExpectedError);
    }
  });
});
