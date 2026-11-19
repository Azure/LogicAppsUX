import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ActionNodeCard,
  AgentNodeCard,
  ConditionNodeCard,
  LoopNodeCard,
  NodeFrame,
  NodeHoverCardActiveContext,
  NodeText,
  ToolItemCard,
  defaultNodeStrings,
  nodeMetrics,
} from '../..';

const propertyValues = (element: Element, property: string) => {
  const values: string[] = [];
  for (const sheet of Array.from(element.ownerDocument.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule instanceof CSSStyleRule && !rule.selectorText.includes(':') && element.matches(rule.selectorText)) {
        const value = rule.style.getPropertyValue(property);
        if (value) {
          values.push(value);
        }
      }
    }
  }
  return values;
};

const count = () => document.querySelector<HTMLElement>('[data-node-count]');

describe('collapsed card counts', () => {
  it.each([
    ['actions', <ActionNodeCard key="a" title="Scope" countLabel={{ count: 3, unit: 'actions' }} />, '3 actions'],
    ['cases', <ConditionNodeCard key="c" kind="switch" title="Switch" countLabel={{ count: 2, unit: 'cases' }} />, '2 cases'],
    ['actions', <LoopNodeCard key="l" title="For each" countLabel={{ count: 1, unit: 'actions' }} />, '1 action'],
    ['tools', <AgentNodeCard key="g" title="Agent" countLabel={{ count: 4, unit: 'tools' }} />, '4 tools'],
    ['actions', <ToolItemCard key="t" title="Tool" countLabel={{ count: 2, unit: 'actions' }} />, '2 actions'],
  ])('renders the %s count inside the shared card text', (unit, card, text) => {
    const { container } = render(card);
    expect(count()).toHaveAttribute('data-node-count', unit);
    expect(count()).toHaveTextContent(text);
    // The prop is consumed, never forwarded as an unknown DOM attribute.
    expect(container.querySelector('[countlabel]')).toBeNull();
  });

  it('keeps the subtitle and joins the count with a decorative separator', () => {
    render(<ActionNodeCard title="Scope" subtitle="Control" countLabel={{ count: 0, unit: 'actions' }} />);
    const row = count()!.parentElement!;
    // Subtitle and its separator form one group so a narrow card drops them together instead of ellipsizing.
    expect(row.children).toHaveLength(2);
    expect(row.children[0]).toHaveTextContent('Control');
    expect(row.children[0].lastElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(row).toHaveTextContent('Control·0 actions');
  });

  it('formats with the host frame dictionary', () => {
    const strings = {
      ...defaultNodeStrings,
      frame: { actionCount: (n: number) => `${n} acciones`, counts: { actions: (n: number) => `${n} acciones` } },
    };
    render(<ActionNodeCard title="Ámbito" strings={strings} countLabel={{ count: 5, unit: 'actions' }} />);
    expect(count()).toHaveTextContent('5 acciones');
  });

  it('describes an aria-labelled card with its count and keeps host descriptions', () => {
    render(
      <>
        <span id="host-note">Has errors</span>
        <ActionNodeCard title="Scope" aria-label="Scope card" aria-describedby="host-note" countLabel={{ count: 3, unit: 'actions' }} />
      </>
    );
    expect(screen.getByLabelText('Scope card')).toHaveAccessibleDescription('Has errors 3 actions');
    expect(count()).toHaveAttribute('title', '3 actions');
  });

  it('keeps the count tooltip inside a hover card, which does not repeat the count', () => {
    render(
      <NodeHoverCardActiveContext.Provider value>
        <NodeText title="Scope" subtitle="Control" count="3 actions" countUnit="actions" />
      </NodeHoverCardActiveContext.Provider>
    );
    expect(screen.getByText('Control').parentElement).not.toHaveAttribute('title');
    expect(count()).toHaveAttribute('title', '3 actions');
  });

  it('describes an aria-labelled frame with its count', () => {
    render(<NodeFrame kind="scope" title="Scope" aria-label="Scope frame" collapsed countLabel={{ count: 2, unit: 'actions' }} />);
    expect(screen.getByLabelText('Scope frame')).toHaveAccessibleDescription('2 actions');
  });

  it('leaves the subtitle-only layout untouched without a count', () => {
    render(<ActionNodeCard title="Scope" subtitle="Control" />);
    expect(count()).toBeNull();
    expect(screen.getByText('Control').parentElement).toHaveTextContent('ScopeControl');
  });
});

describe('vertical status badge placement', () => {
  const expectedLeft = `calc(50% + ${nodeMetrics.handle.size / 2 + nodeMetrics.badge.handleGap}px)`;

  it('anchors card badges past the top-centred input handle on the vertical axis', () => {
    render(<ActionNodeCard title="Compose" status="failed" handleAxis="vertical" />);
    const badge = document.querySelector('[data-badge-status]')!;
    expect(propertyValues(badge, 'left')).toContain(expectedLeft);
    expect(propertyValues(badge, 'right')).not.toContain(expect.stringContaining('px'));
  });

  it('keeps the horizontal badge centred', () => {
    render(<ActionNodeCard title="Compose" status="failed" handleAxis="horizontal" />);
    expect(propertyValues(document.querySelector('[data-badge-status]')!, 'left')).not.toContain(expectedLeft);
  });

  it('applies the same handle clearance to vertical frames', () => {
    render(<NodeFrame title="Scope" status="succeeded" handleAxis="vertical" />);
    expect(propertyValues(document.querySelector('[data-badge-status]')!, 'left')).toContain(expectedLeft);
  });

  it('uses contained monitoring status rows without edge badges and keeps the failed inset perimeter', () => {
    render(
      <ActionNodeCard
        title="Compose"
        subtitleKind="status"
        status="failed"
        statusDetail="2s"
        statusDisplay="contained"
        statusTone="danger"
        statusTint="failed"
      />
    );
    const card = screen.getByRole('group');
    expect(card).toHaveAttribute('data-status-display', 'contained');
    expect(card).toHaveAttribute('data-status-tone', 'danger');
    expect(card).toHaveAttribute('data-status-tint', 'failed');
    expect(document.querySelector('[data-badge-status]')).toBeNull();
    expect(document.querySelector('[data-node-status-perimeter]')).toBeInTheDocument();
    const statusLine = document.querySelector('[data-node-subtitle-kind="status"]')!;
    expect(statusLine).toHaveTextContent(/Failed\s*2s/);
    expect(statusLine.querySelector('bdi')).toHaveTextContent('2s');
    expect(statusLine.querySelector('[data-icon-name="DismissRegular"]')).toBeInTheDocument();
  });

  it('removes small-tool overhang only for contained monitoring status', () => {
    const { rerender } = render(<ToolItemCard title="Tool" size="small" status="failed" />);
    const tool = screen.getByRole('group');
    expect(getComputedStyle(tool).marginTop).toBe(`${nodeMetrics.badge.overhang}px`);
    rerender(
      <ToolItemCard
        title="Tool"
        size="small"
        subtitleKind="status"
        status="failed"
        statusDetail="1s"
        statusDisplay="contained"
        statusTone="danger"
        statusTint="failed"
      />
    );
    expect(getComputedStyle(tool).marginTop).not.toBe(`${nodeMetrics.badge.overhang}px`);
    expect(document.querySelector('[data-badge-status]')).toBeNull();
  });

  it('keeps status+count rows in one line with durable duration and independently ellipsized count', () => {
    render(
      <ConditionNodeCard
        kind="switch"
        title="Switch"
        subtitleKind="status"
        status="succeeded"
        statusDetail="10m 0s"
        statusDisplay="contained"
        statusTone="success"
        countLabel={{ count: 12, unit: 'actions' }}
      />
    );
    const row = document.querySelector('[data-node-subtitle-kind="status"]')!.parentElement!;
    expect(getComputedStyle(row).flexWrap).toBe('nowrap');
    expect(row.querySelector('bdi')).toHaveTextContent('10m 0s');
    expect(row.querySelector('[data-node-count]')).toHaveTextContent('12 actions');
    expect(row.querySelector('[data-icon-name="CheckmarkRegular"]')).toBeInTheDocument();
  });
});
