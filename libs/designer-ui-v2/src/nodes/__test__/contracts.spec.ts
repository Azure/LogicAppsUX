import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ReactNode } from 'react';
import * as metricsEntry from '../../metrics';
import { getSwitchNodeSize, nodeHoverCardTiming, nodeMetrics } from '../metrics';
import {
  defaultBranchTakenString,
  defaultNodeFrameCountStrings,
  defaultNodeFrameStrings,
  defaultNodeIterationPagerStrings,
  defaultNodeRunAfterStrings,
  defaultNodeStrings,
} from '../strings';
import type { NodeFrameCountUnit, NodeFrameStrings, NodeInfoCardStrings, NodeStrings } from '../strings';
import { NODE_HOVER_CARD_IGNORE_ATTRIBUTE } from '../..';
import type { AgentNodeCardProps, ConditionNodeCardProps, NodeFrameProps, NodeInfoCardProps } from '../..';

describe('public metrics entrypoint', () => {
  it('exports the typed geometry and timing objects without a visual runtime surface', () => {
    const actionWidth: number = metricsEntry.nodeMetrics.cards.action.width;
    const openDelay: number = metricsEntry.nodeHoverCardTiming.openDelay;

    expect(Object.keys(metricsEntry).sort()).toEqual(['getNodeLineArrowPath', 'getSwitchNodeSize', 'nodeHoverCardTiming', 'nodeMetrics']);
    expect(Object.is(metricsEntry.getSwitchNodeSize, getSwitchNodeSize)).toBe(true);
    expectTypeOf<typeof metricsEntry.getSwitchNodeSize>().toEqualTypeOf<typeof getSwitchNodeSize>();
    expect(Object.is(metricsEntry.nodeMetrics, nodeMetrics)).toBe(true);
    expect(Object.is(metricsEntry.nodeHoverCardTiming, nodeHoverCardTiming)).toBe(true);
    expectTypeOf<typeof metricsEntry.nodeMetrics>().toEqualTypeOf<typeof nodeMetrics>();
    expectTypeOf<typeof metricsEntry.nodeHoverCardTiming>().toEqualTypeOf<typeof nodeHoverCardTiming>();
    expectTypeOf(metricsEntry.nodeMetrics.cards.action.width).toEqualTypeOf<232>();
    expectTypeOf(metricsEntry.nodeHoverCardTiming.openDelay).toEqualTypeOf<600>();
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

describe('additive monitoring string contracts', () => {
  it('provides English defaults for every new optional dictionary', () => {
    expect(defaultNodeStrings.branch.taken?.('True')).toBe('True, branch taken');
    expect(defaultBranchTakenString('Case 1')).toBe('Case 1, branch taken');
    expect(defaultNodeStrings.frame?.actionCount(1)).toBe(defaultNodeFrameStrings.actionCount(1));
    expect(defaultNodeStrings.pager).toBe(defaultNodeIterationPagerStrings);
    expect(defaultNodeStrings.runAfter).toBe(defaultNodeRunAfterStrings);
    expect(defaultNodeIterationPagerStrings.position(2, 5)).toBe('2 of 5');
    expect(defaultNodeRunAfterStrings.collapsed(7)).toBe('Runs after 7 actions');
  });

  it('pluralizes every frame count unit and keeps actionCount equal to the actions unit', () => {
    const expected: Record<NodeFrameCountUnit, [string, string, string]> = {
      actions: ['0 actions', '1 action', '3 actions'],
      cases: ['0 cases', '1 case', '3 cases'],
      tools: ['0 tools', '1 tool', '3 tools'],
      hiddenItems: ['0 hidden items', '1 hidden item', '3 hidden items'],
    };
    for (const unit of Object.keys(expected) as NodeFrameCountUnit[]) {
      expect([0, 1, 3].map((count) => defaultNodeFrameCountStrings[unit](count))).toEqual(expected[unit]);
      expect(defaultNodeFrameStrings.counts?.[unit]?.(2)).toBe(defaultNodeFrameCountStrings[unit](2));
    }
    expect(defaultNodeFrameStrings.actionCount(1)).toBe('1 action');
    expect(defaultNodeFrameStrings.actionCount(4)).toBe('4 actions');
  });

  it('keeps frame dictionaries without unit counts assignable', () => {
    const legacyFrame: NodeFrameStrings = { actionCount: (count) => `${count} Aktionen` };
    const partialFrame: NodeFrameStrings = { actionCount: (count) => `${count}`, counts: { cases: (count) => `${count} Fälle` } };
    expect(legacyFrame.counts).toBeUndefined();
    expect(partialFrame.counts?.tools).toBeUndefined();
    expectTypeOf<NodeFrameProps['countLabel']>().toEqualTypeOf<{ count: number; unit: NodeFrameCountUnit } | undefined>();
  });

  it('keeps hand-written legacy dictionaries (without the new keys) assignable', () => {
    const legacy: NodeStrings = {
      ...defaultNodeStrings,
      branch: { true: 'Vrai', false: 'Faux' },
      frame: undefined,
      pager: undefined,
      runAfter: undefined,
    };
    expectTypeOf(legacy).toMatchTypeOf<NodeStrings>();
    expect(legacy.branch.taken).toBeUndefined();
  });
});

describe('hover and info card additive contracts', () => {
  it('keeps legacy frame, condition and Agent calls assignable without new options', () => {
    const frame: NodeFrameProps = { kind: 'scope' };
    const condition: ConditionNodeCardProps = { kind: 'switch', title: 'Route' };
    const agent: AgentNodeCardProps = { title: 'Agent' };
    expectTypeOf(frame).toMatchTypeOf<NodeFrameProps>();
    expectTypeOf(condition).toMatchTypeOf<ConditionNodeCardProps>();
    expectTypeOf(agent).toMatchTypeOf<AgentNodeCardProps>();
    expectTypeOf<NodeFrameProps['motion']>().toEqualTypeOf<'none' | 'reveal' | undefined>();
    expectTypeOf<ConditionNodeCardProps['mode']>().toEqualTypeOf<'multiOutput' | 'trunk' | undefined>();
    expectTypeOf<AgentNodeCardProps['toolsPlacement']>().toEqualTypeOf<'below' | 'side' | undefined>();
    expectTypeOf<AgentNodeCardProps['onAddTool']>().toEqualTypeOf<((anchor?: HTMLElement | null) => void) | undefined>();
    expect(frame.motion).toBeUndefined();
    expect(condition.mode).toBeUndefined();
    expect(agent.toolsPlacement).toBeUndefined();
  });

  it('keeps a hand-written four-key info dictionary assignable and resolves English defaults', () => {
    const legacyInfo: NodeInfoCardStrings = {
      configured: 'Configuré',
      close: 'Fermer',
      learnMore: 'En savoir plus',
      opensInNewTab: 'nouvel onglet',
    };
    expectTypeOf(legacyInfo).toMatchTypeOf<NodeInfoCardStrings>();
    expectTypeOf<NodeInfoCardStrings['testData']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<NodeInfoCardStrings['testDataDescription']>().toEqualTypeOf<string | undefined>();
    expect(defaultNodeStrings.info.testData).toBe('Using test data');
    expect(defaultNodeStrings.info.testDataDescription).toBe('Test runs return saved output instead of making live calls.');
  });

  it('adds only optional NodeInfoCard props and a root-exported ignore marker', () => {
    expectTypeOf<NodeInfoCardProps['testData']>().toEqualTypeOf<{ description?: string } | undefined>();
    expectTypeOf<NodeInfoCardProps['footer']>().toEqualTypeOf<ReactNode>();
    const minimal: NodeInfoCardProps = { category: 'action', icon: null, title: 'Details' };
    expect(minimal.testData).toBeUndefined();
    expect(NODE_HOVER_CARD_IGNORE_ATTRIBUTE).toBe('data-node-hover-card-ignore');
    expect(metricsEntry.nodeHoverCardTiming).toEqual({ openDelay: 600, closeDelay: 200 });
  });
});
