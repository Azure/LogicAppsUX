// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialMapperViewState, type MapEditorVsCodeApi } from '../src/protocol/mapEditorProtocol';
import type * as MapperAppControllerModule from '../webview/src/components/MapperAppController';
import { MappingCanvas, type CanvasCallbacks } from '../webview/src/components/MappingCanvas';

const controllerBoundary = vi.hoisted(() => ({ mount: vi.fn(), dispose: vi.fn(), handleMessage: vi.fn() }));
vi.mock('../webview/src/components/MapperAppController', async (importOriginal) => {
  const { MapperAppController } = await importOriginal<typeof MapperAppControllerModule>();
  return {
    MapperAppController: vi.fn((elements: MapperAppControllerModule.MapperAppElements, vscode: MapEditorVsCodeApi) => {
      const controller = new MapperAppController(elements, vscode);
      return {
        mount: controllerBoundary.mount,
        handleMessage: controllerBoundary.handleMessage,
        dispose: () => {
          controller.dispose();
          controllerBoundary.dispose();
        },
      };
    }),
  };
});
vi.mock('../webview/src/components/CopilotPanel', () => ({}));
vi.mock('../webview/src/components/EmptySchemaPlaceholder', () => ({}));
vi.mock('../webview/src/components/FunctoidConfigDialog', () => ({}));
vi.mock('../webview/src/components/FunctoidPalette', () => ({}));
vi.mock('../webview/src/components/MapperBottomPanel', () => ({}));
vi.mock('../webview/src/components/MapperContextMenu', () => ({}));
vi.mock('../webview/src/components/MapperNotification', () => ({}));
vi.mock('../webview/src/components/MapperPageBar', () => ({}));
vi.mock('../webview/src/components/MapperStatusBar', () => ({}));
vi.mock('../webview/src/components/MapperToolbar', () => ({}));
vi.mock('../webview/src/components/SchemaNodePropertiesDialog', () => ({}));
vi.mock('../webview/src/components/SchemaTreeRenderer', () => ({}));
vi.mock('../webview/src/components/ScriptingConfigDialog', () => ({}));

import { MapperApp, type MapperAppHandle } from '../webview/src/components/MapperApp';

describe('webview component lifecycle in JSDOM', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame: number;
  let root: Root | undefined;
  let disposeController: (() => void) | undefined;
  const disconnect = vi.fn();
  const observe = vi.fn();
  let resizeCallback: ResizeObserverCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    frames.clear();
    nextFrame = 0;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = ++nextFrame;
        frames.set(id, callback);
        return id;
      })
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => frames.delete(id))
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }
        observe = observe;
        disconnect = disconnect;
      }
    );
  });

  afterEach(async () => {
    disposeController?.();
    disposeController = undefined;
    await act(async () => {
      root?.unmount();
      root = undefined;
      document.body.replaceChildren();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('disconnects the real canvas root, cancels scroll work, and reconnects with a fresh render', async () => {
    const canvas = new MappingCanvas();
    canvas.configure(createInitialMapperViewState());
    expect(canvas.childElementCount).toBe(0);
    await act(async () => document.body.append(canvas));
    expect(canvas.querySelector('.canvas-zoom-controls')).not.toBeNull();
    const firstContent = canvas.firstElementChild;
    canvas.dispatchEvent(new Event('scroll'));
    canvas.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(1);
    const pendingFrame = [...frames.keys()][0];
    await act(async () => canvas.remove());
    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame);
    expect(frames.size).toBe(0);
    expect(canvas.childElementCount).toBe(0);
    canvas.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(0);
    await act(async () => document.body.append(canvas));
    expect(canvas.querySelector('.canvas-zoom-controls')).not.toBeNull();
    expect(canvas.firstElementChild).not.toBe(firstContent);
    canvas.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(1);
    await act(async () => canvas.remove());
    expect(frames.size).toBe(0);
  });

  it('mounts the MapperApp controller boundary, forwards messages, and calls real disposal on React unmount', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const onReady = vi.fn<(app: MapperAppHandle | null) => void>();
    const vscode = { postMessage: vi.fn() };
    await act(async () => root?.render(React.createElement(MapperApp, { vscode, onReady })));
    expect(container.querySelector('[data-component="mapper-app"]')).not.toBeNull();
    expect(controllerBoundary.mount).toHaveBeenCalledTimes(1);
    const app = onReady.mock.calls[0][0];
    expect(app).not.toBeNull();
    const message = { type: 'executeCompile' as const, data: {} };
    app?.handleMessage(message);
    expect(controllerBoundary.handleMessage).toHaveBeenCalledExactlyOnceWith(message);
    const menu = container.querySelector<HTMLElement>('biztalk-mapper-context-menu');
    expect(menu).not.toBeNull();
    if (menu) {
      menu.hidden = false;
    }
    await act(async () => root?.unmount());
    root = undefined;
    expect(onReady).toHaveBeenLastCalledWith(null);
    expect(controllerBoundary.dispose).toHaveBeenCalledTimes(1);
    expect(menu?.hidden).toBe(true);
    expect(container.childElementCount).toBe(0);
  });

  it('real controller disposal removes observers, DOM handlers, pending frames, menus, and notification timers', async () => {
    const { MapperAppController } = await vi.importActual<typeof MapperAppControllerModule>(
      '../webview/src/components/MapperAppController'
    );
    const host = () => Object.assign(document.createElement('div'), { configure: vi.fn() });
    const canvas = Object.assign(host(), {
      renderWithPositions: vi.fn(),
      beginLinkPreview: vi.fn(),
      updateLinkPreview: vi.fn(),
      clearLinkPreview: vi.fn(),
    });
    const elements = {
      container: host(),
      copilot: host(),
      toolbar: host(),
      palette: host(),
      mappingArea: host(),
      sourceTree: host(),
      sourceEmpty: host(),
      canvas,
      pageBar: host(),
      targetTree: host(),
      targetEmpty: host(),
      bottomPanel: host(),
      statusBar: host(),
      schemaDialog: host(),
      scriptingDialog: host(),
      functoidDialog: host(),
      contextMenu: host(),
      notification: host(),
    };
    document.body.append(...Object.values(elements));
    const listeners = [
      { target: document as EventTarget, types: ['keydown', 'contextmenu', 'pointermove', 'pointerup'] },
      { target: window as EventTarget, types: ['resize'] },
      { target: elements.sourceTree as EventTarget, types: ['scroll'] },
      { target: elements.targetTree as EventTarget, types: ['scroll'] },
    ].map(({ target, types }) => ({
      types,
      added: vi.spyOn(target, 'addEventListener'),
      removed: vi.spyOn(target, 'removeEventListener'),
    }));
    const postMessage = vi.fn();
    const controller = new MapperAppController(elements as unknown as MapperAppControllerModule.MapperAppElements, { postMessage });
    disposeController = () => controller.dispose();
    controller.mount();
    expect(observe.mock.calls.map(([element]) => element)).toEqual([elements.mappingArea, canvas]);
    const callbacks = canvas.configure.mock.calls[0][1] as CanvasCallbacks;
    callbacks.onLinkPointerDown?.(10, 20);
    expect(canvas.beginLinkPreview).toHaveBeenCalledWith(10, 20);
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 30, clientY: 40 }));
    window.dispatchEvent(new Event('resize'));
    elements.sourceTree.dispatchEvent(new Event('scroll'));
    elements.targetTree.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(2);
    const pendingFrames = [...frames.keys()];
    const menuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 12, clientY: 34 });
    document.dispatchEvent(menuEvent);
    expect(menuEvent.defaultPrevented).toBe(true);
    expect(elements.contextMenu.hidden).toBe(false);
    vi.advanceTimersByTime(0);
    controller.handleMessage({ type: 'compileResult', data: { success: true, errors: [], warnings: [] } });
    expect(elements.notification.hidden).toBe(false);
    expect(elements.notification.configure).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    controller.dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);
    for (const { types, added, removed } of listeners) {
      for (const type of types) {
        const registration = added.mock.calls.find(([eventType]) => eventType === type);
        expect(registration).toBeDefined();
        expect(removed).toHaveBeenCalledWith(type, registration![1]);
      }
    }
    for (const id of pendingFrames) {
      expect(cancelAnimationFrame).toHaveBeenCalledWith(id);
    }
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(elements.contextMenu.hidden).toBe(true);
    const keyEvent = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true });
    const afterMenuEvent = new MouseEvent('contextmenu', { cancelable: true });
    document.dispatchEvent(keyEvent);
    document.dispatchEvent(afterMenuEvent);
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 70, clientY: 80 }));
    document.dispatchEvent(new Event('pointerup'));
    window.dispatchEvent(new Event('resize'));
    elements.sourceTree.dispatchEvent(new Event('scroll'));
    elements.targetTree.dispatchEvent(new Event('scroll'));
    resizeCallback([], {} as ResizeObserver);
    vi.runAllTimers();
    expect(keyEvent.defaultPrevented).toBe(false);
    expect(afterMenuEvent.defaultPrevented).toBe(false);
    expect(frames.size).toBe(0);
    expect(canvas.updateLinkPreview).not.toHaveBeenCalled();
    expect(canvas.clearLinkPreview).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    controller.dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
