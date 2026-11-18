import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitNativeDesignerViewport, fitSharedDesignerViewport } from '../designerViewport';
import type { ReactFlowInstance } from '@xyflow/react';

afterEach(() => document.body.replaceChildren());
const rect = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
  left: x,
  right: x + width,
  top: y,
  bottom: y + height,
  toJSON: () => ({}),
});

describe('shared usable viewport fitting', () => {
  it('fits accepted root/terminal extents above an explicitly registered overlapping host footer', () => {
    const canvas = document.createElement('div');
    const footer = document.createElement('div');
    footer.dataset.designerViewportInset = 'bottom';
    document.body.append(canvas, footer);
    canvas.getBoundingClientRect = () => rect(100, 50, 1440, 1100);
    footer.getBoundingClientRect = () => rect(400, 1078, 780, 48);
    const setViewport = vi.fn();
    const instance = {
      getNodes: () => [],
      getNodesBounds: () => rect(20, 0, 232, 1040),
      setViewport,
    } as unknown as ReactFlowInstance;
    fitSharedDesignerViewport(instance, canvas, [272, 1080]);
    const viewport = setViewport.mock.calls[0][0];
    expect(viewport.y + 1080 * viewport.zoom).toBeLessThan(1028);
    expect(viewport.x + 272 * viewport.zoom).toBeLessThanOrEqual(1440);
  });

  describe('native V2 usable viewport fitting', () => {
    const fit = fitNativeDesignerViewport;
    it('fits culled adopted nodes above the footer and excludes hidden nodes', () => {
      const canvas = document.createElement('div');
      const footer = document.createElement('div');
      footer.dataset.designerViewportInset = 'bottom';
      document.body.append(canvas, footer);
      canvas.getBoundingClientRect = () => rect(0, 0, 1280, 720);
      footer.getBoundingClientRect = () => rect(300, 640, 680, 80);
      const visible = { id: 'culled', position: { x: 20, y: 0 }, initialWidth: 200, initialHeight: 556, data: {} };
      const getNodesBounds = vi.fn(() => rect(20, 0, 200, 556));
      const setViewport = vi.fn();
      const instance = {
        getNodes: () => [visible, { ...visible, id: 'hidden', hidden: true }],
        getNodesBounds,
        setViewport,
      } as unknown as ReactFlowInstance;
      fit(instance, canvas);
      expect(getNodesBounds).toHaveBeenCalledWith([visible]);
      const viewport = setViewport.mock.calls[0][0];
      expect(viewport.y + 556 * viewport.zoom).toBeLessThan(640);
      expect(viewport.y).toBeGreaterThan(0);
    });

    it('does not move the viewport for an empty graph', () => {
      const setViewport = vi.fn();
      fit({ getNodes: () => [], setViewport } as unknown as ReactFlowInstance, document.createElement('div'));
      expect(setViewport).not.toHaveBeenCalled();
    });

    it('ignores a footer outside this canvas and leaves an unusable canvas unchanged', () => {
      const canvas = document.createElement('div');
      const footer = document.createElement('div');
      footer.dataset.designerViewportInset = 'bottom';
      document.body.append(canvas, footer);
      const setViewport = vi.fn();
      const instance = {
        getNodes: () => [{ id: 'real', data: {}, position: { x: 0, y: 0 } }],
        getNodesBounds: () => rect(0, 0, 200, 556),
        setViewport,
      } as unknown as ReactFlowInstance;
      // Not yet adopted by the host.
      fit(instance, canvas);
      expect(setViewport).not.toHaveBeenCalled();
      canvas.getBoundingClientRect = () => rect(0, 0, 1280, 720);
      footer.getBoundingClientRect = () => rect(1300, 0, 100, 720);
      fit(instance, canvas);
      expect(setViewport).toHaveBeenCalledOnce();
      const viewport = setViewport.mock.calls[0][0];
      expect(viewport.y + 556 * viewport.zoom).toBeGreaterThan(640);
      setViewport.mockClear();
      footer.getBoundingClientRect = () => rect(0, 0, 1280, 720);
      fit(instance, canvas);
      expect(setViewport).not.toHaveBeenCalled();
    });
  });

  it('includes notes beyond graph bounds without borrowing a nonoverlapping designer footer', () => {
    const canvas = document.createElement('div');
    const footer = document.createElement('div');
    footer.dataset.designerViewportInset = 'bottom';
    document.body.append(canvas, footer);
    canvas.getBoundingClientRect = () => rect(0, 0, 800, 600);
    footer.getBoundingClientRect = () => rect(900, 0, 100, 100);
    const setViewport = vi.fn();
    const instance = {
      getNodes: () => [],
      getNodesBounds: () => rect(-100, -100, 1200, 1400),
      setViewport,
    } as unknown as ReactFlowInstance;
    fitSharedDesignerViewport(instance, canvas, [272, 1080]);
    const viewport = setViewport.mock.calls[0][0];
    expect(viewport.y - 100 * viewport.zoom).toBeGreaterThanOrEqual(0);
    expect(viewport.y + 1300 * viewport.zoom).toBeLessThanOrEqual(600);
  });
});
