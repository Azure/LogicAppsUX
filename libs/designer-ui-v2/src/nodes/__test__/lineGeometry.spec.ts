// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getNodeLineArrowPath, nodeMetrics, type NodeLineArrowDirection } from '../../metrics';
import { getNodeLineArrowPath as getNodeLineArrowPathFromNodes } from '../lineGeometry';

describe('getNodeLineArrowPath', () => {
  it.each([
    ['right', 'M 8 18 L 10 20 L 8 22'],
    ['down', 'M 12 18 L 10 20 L 8 18'],
    ['left', 'M 12 22 L 10 20 L 12 18'],
    ['up', 'M 8 22 L 10 20 L 12 22'],
  ] as const)('points %s with its tip at the supplied endpoint', (direction, expected) => {
    expect(getNodeLineArrowPath(10, 20, direction, 2)).toBe(expected);
  });

  it('defaults to the canonical size and rightward direction including when optional args are undefined', () => {
    expect(nodeMetrics.lineArrowSize).toBe(3.18);
    expect(Object.is(getNodeLineArrowPath, getNodeLineArrowPathFromNodes)).toBe(true);
    expect(getNodeLineArrowPath(0, 0)).toBe('M -3.18 -3.18 L 0 0 L -3.18 3.18');
    expect(getNodeLineArrowPath(0, 0, undefined, undefined)).toBe('M -3.18 -3.18 L 0 0 L -3.18 3.18');
    expect(getNodeLineArrowPath(0, 0, 'down')).toBe('M 3.18 -3.18 L 0 0 L -3.18 -3.18');
  });

  it.each([
    ['right', 85, 10, 'M 81.82 6.82 L 85 10 L 81.82 13.18'],
    ['down', 10, 85, 'M 13.18 81.82 L 10 85 L 6.82 81.82'],
    ['left', 10, 20, 'M 13.18 23.18 L 10 20 L 13.18 16.82'],
    ['up', 10, 20, 'M 6.82 23.18 L 10 20 L 13.18 23.18'],
  ] satisfies readonly [NodeLineArrowDirection, number, number, string][])(
    'computes canonical 3.18px chevron wings for %s at (%d, %d)',
    (direction, x, y, expected) => {
      expect(getNodeLineArrowPath(x, y, direction)).toBe(expected);
    }
  );

  it('honors a zero size instead of substituting the default', () => {
    expect(getNodeLineArrowPath(-10, -20, 'up', 0)).toBe('M -10 -20 L -10 -20 L -10 -20');
  });
});
