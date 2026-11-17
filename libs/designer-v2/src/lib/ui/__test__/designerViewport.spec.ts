import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitSharedDesignerViewport } from '../designerViewport';
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
