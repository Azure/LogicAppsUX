import { describe, expect, expectTypeOf, it } from 'vitest';
import * as metricsEntry from '../../metrics';
import { nodeHoverCardTiming, nodeMetrics } from '../metrics';
import { defaultNodeStrings } from '../strings';

describe('public metrics entrypoint', () => {
  it('exports the typed geometry and timing objects without a visual runtime surface', () => {
    const actionWidth: number = metricsEntry.nodeMetrics.cards.action.width;
    const openDelay: number = metricsEntry.nodeHoverCardTiming.openDelay;

    expect(Object.keys(metricsEntry).sort()).toEqual(['nodeHoverCardTiming', 'nodeMetrics']);
    expect(Object.is(metricsEntry.nodeMetrics, nodeMetrics)).toBe(true);
    expect(Object.is(metricsEntry.nodeHoverCardTiming, nodeHoverCardTiming)).toBe(true);
    expectTypeOf<typeof metricsEntry.nodeMetrics>().toEqualTypeOf<typeof nodeMetrics>();
    expectTypeOf<typeof metricsEntry.nodeHoverCardTiming>().toEqualTypeOf<typeof nodeHoverCardTiming>();
    expectTypeOf(metricsEntry.nodeMetrics.cards.action.width).toEqualTypeOf<232>();
    expectTypeOf(metricsEntry.nodeHoverCardTiming.openDelay).toEqualTypeOf<400>();
    expect(actionWidth).toBeGreaterThan(0);
    expect(actionWidth).toBe(metricsEntry.nodeMetrics.cards.trigger.width);
    expect(openDelay).toBeGreaterThan(metricsEntry.nodeHoverCardTiming.closeDelay);
  });
});

describe('default node string contracts', () => {
  it.each([
    [0, 'Tools (0)'],
    [1, 'Tools (1)'],
    [12, 'Tools (12)'],
  ] as const)('labels the actual tools count %s', (count, label) => {
    expect(defaultNodeStrings.tools.heading(count)).toBe(label);
  });

  it('retains the supplied operation name in the merge-point accessible label', () => {
    expect(defaultNodeStrings.merge.label('Renamed operation')).toBe('Merge point for Renamed operation');
    expect(defaultNodeStrings.merge.label('')).toBe('Merge point for ');
  });

  it.each([
    [0, 'items'],
    [1, 'item'],
    [12, 'actions'],
  ] as const)('retains count %s and the caller-selected noun %s in collapse controls', (count, noun) => {
    expect(defaultNodeStrings.collapse.show(count, noun)).toBe(`Show ${count} ${noun}`);
    expect(defaultNodeStrings.collapse.hide(count, noun)).toBe(`Hide ${count} ${noun}`);
  });

  it('provides a distinct label for every supported run state', () => {
    expect(defaultNodeStrings.status).toEqual({
      pending: 'Pending',
      running: 'Running',
      succeeded: 'Succeeded',
      skipped: 'Skipped',
      failed: 'Failed',
      error: 'Error',
      warning: 'Warning',
      cancelled: 'Cancelled',
      mock: 'Using test data',
    });
  });
});
