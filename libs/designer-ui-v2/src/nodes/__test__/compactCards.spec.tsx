import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ActionNodeCard,
  LoopNodeCard,
  TriggerNodeCard,
  compactNodeMetrics,
  getCompactNodeHeight,
  getCompactTitleLines,
  nodeMetrics,
} from '../..';
import { resolveCardDensity } from '../cards/shared';

// Without a status there is no badge, so the sized card surface is the root's first child.
const surfaceOf = (cardType: string) => {
  const root = document.querySelector<HTMLElement>(`[data-node-card="${cardType}"]`)!;
  return { root, surface: root.firstElementChild as HTMLElement };
};

describe('Standard compact preset', () => {
  it('grows only by the second title line', () => {
    expect(getCompactNodeHeight()).toBe(compactNodeMetrics.card.height);
    expect(getCompactNodeHeight(1)).toBe(52);
    expect(getCompactNodeHeight(2)).toBe(68);
  });

  it('estimates title lines against the compact text column', () => {
    expect(getCompactTitleLines(undefined)).toBe(1);
    expect(getCompactTitleLines('')).toBe(1);
    expect(getCompactTitleLines('Compose')).toBe(1);
    expect(getCompactTitleLines('Send an email notification to the on-call engineer')).toBe(2);
    // Cached results stay stable for repeated layout passes.
    expect(getCompactTitleLines('Send an email notification to the on-call engineer')).toBe(2);
  });

  it('narrows the estimate by a host text-end reserve without polluting the unreserved cache', () => {
    // 17 characters fit the full 142px column but not one narrowed by a 20px corner control.
    expect(getCompactTitleLines('Update order info', 20)).toBe(2);
    expect(getCompactTitleLines('Update order info')).toBe(1);
    expect(getCompactTitleLines('Update order info', 20)).toBe(2);
  });

  it('keeps the default density on the Standard card contract', () => {
    expect(resolveCardDensity({})).toEqual({ width: 'standard', size: 'medium', body: 'default', tile: 'medium', titleLines: 1 });
    expect(resolveCardDensity({ titleLines: 2 }).titleLines).toBe(1);
    expect(resolveCardDensity({ density: 'compact' })).toMatchObject({ width: 'standardCompact', size: 'compact', titleLines: 1 });
    expect(resolveCardDensity({ density: 'compact', titleLines: 2 })).toMatchObject({ size: 'compactWrapped', titleLines: 2 });
  });

  it('renders compact action cards at the preset width and height', () => {
    render(<ActionNodeCard title="Compose" density="compact" />);
    const { root, surface } = surfaceOf('action');
    expect(getComputedStyle(root).width).toBe(`${compactNodeMetrics.card.width}px`);
    expect(getComputedStyle(surface).minHeight).toBe(`${compactNodeMetrics.card.height}px`);
  });

  it('renders wrapped compact titles with the matching height and clamp', () => {
    render(<ActionNodeCard title="A title that wraps" density="compact" titleLines={2} />);
    const { surface } = surfaceOf('action');
    expect(getComputedStyle(surface).minHeight).toBe(`${compactNodeMetrics.card.wrappedHeight}px`);
    const title = getComputedStyle(screen.getByText('A title that wraps'));
    expect(title.display).toBe('-webkit-box');
    expect(title.whiteSpace).toBe('normal');
  });

  it('keeps compact trigger pills semicircular at either height', () => {
    const { unmount } = render(<TriggerNodeCard title="When a request is received" density="compact" />);
    expect(getComputedStyle(surfaceOf('trigger').surface).borderTopLeftRadius).toBe(`${compactNodeMetrics.card.height / 2}px`);
    unmount();
    render(<TriggerNodeCard title="When a request is received" density="compact" titleLines={2} />);
    expect(getComputedStyle(surfaceOf('trigger').surface).borderTopLeftRadius).toBe(`${compactNodeMetrics.card.wrappedHeight / 2}px`);
  });

  it('leaves default action cards on the Standard metrics', () => {
    render(<ActionNodeCard title="Compose" />);
    const { root, surface } = surfaceOf('action');
    expect(getComputedStyle(root).width).toBe(`${nodeMetrics.cards.action.width}px`);
    expect(getComputedStyle(surface).minHeight).toBe(`${nodeMetrics.cards.action.height}px`);
  });

  it('lets compact loops wrap while preserving the default Otto loop treatment', () => {
    const { rerender } = render(<LoopNodeCard title="Until Nested" />);
    expect(getComputedStyle(surfaceOf('foreach').surface).minHeight).toBe(`${nodeMetrics.cards.loop.height}px`);
    expect(getComputedStyle(screen.getByText('Until Nested')).whiteSpace).toBe('nowrap');
    expect(surfaceOf('foreach').root).not.toHaveAttribute('data-node-header-tint');

    rerender(<LoopNodeCard title="Until Nested" density="compact" titleLines={2} headerTint="loop" />);
    const { root, surface } = surfaceOf('foreach');
    expect(root).toHaveAttribute('data-node-header-tint', 'loop');
    expect(getComputedStyle(root).width).toBe(`${nodeMetrics.cards.loop.width}px`);
    expect(getComputedStyle(surface).minHeight).toBe(`${compactNodeMetrics.card.wrappedHeight}px`);
    expect(getComputedStyle(screen.getByText('Until Nested')).whiteSpace).toBe('normal');
  });
});
