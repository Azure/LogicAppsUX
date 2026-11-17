import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionNodeCard, AgentNodeCard, ConditionNodeCard, NodeInfoCard, TriggerNodeCard } from '../..';
import type { BaseNodeCardProps, NodeInfoCardStrings } from '../..';

const categories = [
  { category: 'action', regular: 'FlashRegular', filled: 'FlashFilled', card: (props: BaseNodeCardProps) => <ActionNodeCard {...props} /> },
  {
    category: 'trigger',
    regular: 'GlobeRegular',
    filled: 'GlobeFilled',
    card: (props: BaseNodeCardProps) => <TriggerNodeCard {...props} />,
  },
  {
    category: 'control',
    regular: 'BranchForkRegular',
    filled: 'BranchForkFilled',
    card: (props: BaseNodeCardProps) => <ConditionNodeCard {...props} kind="if" />,
  },
  { category: 'agent', regular: 'AgentsRegular', filled: 'AgentsFilled', card: (props: BaseNodeCardProps) => <AgentNodeCard {...props} /> },
] as const;

describe.each(categories)('info icon fallback for $category', ({ category, regular, filled, card }) => {
  it.each([false, null, undefined])('matches the canonical regular card fallback for absent icon %s', (icon) => {
    render(
      <>
        <div data-testid="node">{card({ title: 'Node', icon })}</div>
        <NodeInfoCard data-testid="info" category={category} title="Details" icon={icon} />
      </>
    );
    const nodeTile = screen.getByTestId('node').querySelector(`[data-category="${category}"]`)!;
    const infoTile = screen.getByTestId('info').querySelector(`[data-category="${category}"]`)!;
    expect(nodeTile.querySelector(`[data-icon-name="${regular}"]`)).not.toBeNull();
    expect(infoTile.querySelector(`[data-icon-name="${regular}"]`)).not.toBeNull();
    expect(infoTile.querySelector(`[data-icon-name="${filled}"]`)).toBeNull();
    expect(infoTile).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps an explicit custom info icon rather than replacing it with a category fallback', () => {
    render(<NodeInfoCard category={category} title="Details" icon={<span data-testid="custom">Custom</span>} />);
    expect(screen.getByTestId('custom').closest('[data-category]')).toHaveAttribute('data-category', category);
    expect(document.querySelector(`[data-icon-name="${regular}"]`)).toBeNull();
  });

  it('keeps explicit selected icons and intentional empty selected slots independent of the regular info fallback', () => {
    const tree = (selectedIcon: BaseNodeCardProps['selectedIcon']) => (
      <>
        <div data-testid="node">{card({ title: 'Node', icon: false, selected: true, selectedIcon })}</div>
        <NodeInfoCard data-testid="info" category={category} title="Details" icon={undefined} />
      </>
    );
    const { rerender } = render(tree(<span data-testid="selected">Selected</span>));
    expect(within(screen.getByTestId('node')).getByTestId('selected')).toBeInTheDocument();
    expect(screen.getByTestId('info').querySelector(`[data-icon-name="${regular}"]`)).not.toBeNull();
    rerender(tree(''));
    expect(screen.getByTestId('node').querySelector(`[data-category="${category}"]`)?.textContent).toBe('');
    expect(screen.getByTestId('node').querySelector(`[data-icon-name="${filled}"]`)).toBeNull();
    rerender(tree(undefined));
    expect(screen.getByTestId('node').querySelector(`[data-icon-name="${filled}"]`)).not.toBeNull();
    expect(screen.getByTestId('info').querySelector(`[data-icon-name="${regular}"]`)).not.toBeNull();
  });
});

const legacyInfoStrings: NodeInfoCardStrings = {
  configured: 'Configuré',
  close: 'Fermer',
  learnMore: 'Documentation',
  opensInNewTab: 'nouvel onglet',
};
const cssValues = (element: Element, property: string, forcedColors = false) => {
  const values: string[] = [];
  const visit = (rules: CSSRuleList, isForcedColors = false) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules, rule.conditionText === '(forced-colors: active)');
      } else if (rule instanceof CSSStyleRule && isForcedColors === forcedColors && element.matches(rule.selectorText)) {
        values.push(rule.style.getPropertyValue(property));
      }
    }
  };
  Array.from(element.ownerDocument.styleSheets).forEach((sheet) => visit(sheet.cssRules));
  return values.filter(Boolean);
};

describe('NodeInfoCard test data and footer (I01-I05)', () => {
  it('I02 keeps ordinary content absent testData and replaces confirmation and description for an explicit object', () => {
    const view = (testData?: { description?: string }) => (
      <NodeInfoCard
        category="action"
        icon={null}
        title="Details"
        subtitle="Outlook"
        configured
        description="Ordinary operation"
        testData={testData}
      />
    );
    const { rerender } = render(view());
    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByText('Ordinary operation')).toBeInTheDocument();
    expect(screen.getByText('·')).toBeInTheDocument();
    expect(document.querySelector('[data-test-data]')).toBeNull();
    rerender(view({}));
    expect(screen.queryByText('Configured')).toBeNull();
    expect(screen.queryByText('Ordinary operation')).toBeNull();
    expect(screen.queryByText('·')).toBeNull();
    expect(screen.getByText('Using test data')).toBeInTheDocument();
    expect(screen.getByText('Test runs return saved output instead of making live calls.')).toBeInTheDocument();
    const badge = document.querySelector('[data-node-info-test-data]')!;
    expect(badge.querySelector('[data-icon-name="BeakerRegular"]')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('[data-category="action"]')).toHaveAttribute('data-test-data', 'true');
  });

  it('I02 uses host-specific copy as escaped text rather than HTML', () => {
    const description = '<img src=x onerror="alert(1)"> Test output';
    render(<NodeInfoCard category="action" icon={null} title="Details" description="Ordinary" testData={{ description }} />);
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.queryByText('Ordinary')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('I03 uses optional English defaults for a legacy dictionary and preserves custom and empty translations', () => {
    const view = (strings: NodeInfoCardStrings, description?: string) => (
      <NodeInfoCard category="action" icon={false} title="Details" configured strings={strings} testData={{ description }} />
    );
    const { rerender } = render(view(legacyInfoStrings));
    expect(screen.getByText('Using test data')).toBeInTheDocument();
    expect(screen.getByText('Test runs return saved output instead of making live calls.')).toBeInTheDocument();
    const localized = { ...legacyInfoStrings, testData: 'Données de test', testDataDescription: 'Sortie enregistrée' };
    rerender(view(localized));
    expect(screen.getByText('Données de test')).toBeInTheDocument();
    expect(screen.getByText('Sortie enregistrée')).toBeInTheDocument();
    rerender(view(localized, ''));
    expect(screen.queryByText('Sortie enregistrée')).toBeNull();
    rerender(view({ ...localized, testData: '', testDataDescription: '' }));
    expect(document.querySelector('[data-node-info-test-data]')).toHaveTextContent('');
    expect(screen.queryByText('Using test data')).toBeNull();
    expect(screen.queryByText('Test runs return saved output instead of making live calls.')).toBeNull();
  });

  it('I04 keeps the footer outside the clamp and native header/footer actions keyboard reachable', async () => {
    const edit = vi.fn();
    const pin = vi.fn();
    const dismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <NodeInfoCard
        category="action"
        icon={null}
        title="Details"
        description="Long description"
        learnMoreHref="https://example.com/help"
        actions={
          <button type="button" onClick={pin}>
            Pin
          </button>
        }
        onDismiss={dismiss}
        footer={
          <button type="button" onClick={edit}>
            Edit test data
          </button>
        }
      />
    );
    const footer = screen.getByRole('button', { name: 'Edit test data' }).parentElement!;
    const description = screen.getByText('Long description');
    expect(footer).toHaveAttribute('data-node-info-footer');
    expect(description).not.toContainElement(footer);
    expect(description.nextElementSibling).toBe(footer);
    expect(cssValues(description, '-webkit-line-clamp')).toContain('2');
    expect(cssValues(footer, '-webkit-line-clamp')).toEqual([]);
    expect(edit).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Pin' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(pin).toHaveBeenCalledOnce();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Edit test data' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(edit).toHaveBeenCalledOnce();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('I04 renders a numeric-zero footer without any description', () => {
    render(<NodeInfoCard category="action" icon={null} title="Details" footer={0} />);
    expect(screen.getByText('0')).toHaveAttribute('data-node-info-footer');
    expect(document.querySelector('[data-node-info-footer]')?.previousElementSibling).toHaveClass('fui-CardHeader');
  });

  it.each([undefined, null, false, ''])('I04 omits empty footer wrappers for %s', (footer) => {
    render(<NodeInfoCard category="action" icon={null} title="Details" footer={footer} />);
    expect(document.querySelector('[data-node-info-footer]')).toBeNull();
  });

  it.each(['javascript:alert(1)', 'data:text/html,test', '/relative', 'malformed'])(
    'I05 rejects unsafe links in test-data mode: %s',
    (learnMoreHref) => {
      render(<NodeInfoCard category="action" icon={null} title="Details" testData={{}} learnMoreHref={learnMoreHref} />);
      expect(screen.queryByRole('link')).toBeNull();
    }
  );

  it.each(['https://example.com/help', 'http://example.com/help'])(
    'I05 keeps a safe link even with an intentionally empty description: %s',
    (learnMoreHref) => {
      render(
        <NodeInfoCard
          category="action"
          icon={null}
          title="Details"
          strings={legacyInfoStrings}
          testData={{ description: '' }}
          learnMoreHref={learnMoreHref}
        />
      );
      const link = screen.getByRole('link', { name: 'Documentation nouvel onglet' });
      expect(link).toHaveAttribute('href', learnMoreHref);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(screen.queryByText('Test runs return saved output instead of making live calls.')).toBeNull();
    }
  );

  it('I01/I05 preserves fallback identity, refs, HTML handlers, localized close and forced-color non-color cues', async () => {
    const ref = createRef<HTMLDivElement>();
    const onContextMenu = vi.fn();
    const onDismiss = vi.fn();
    const { container, unmount } = render(
      <NodeInfoCard
        ref={ref}
        category="action"
        icon={false}
        title="Details"
        role="region"
        className="host-info"
        data-testid="info"
        onContextMenu={onContextMenu}
        onDismiss={onDismiss}
        strings={legacyInfoStrings}
        testData={{}}
        footer="Follow up"
      />
    );
    const info = screen.getByRole('region');
    expect(ref.current).toBe(info);
    expect(info).toHaveClass('host-info');
    expect(info).toHaveAttribute('data-testid', 'info');
    expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toBeInTheDocument();
    expect(container.querySelector('[data-icon-name="FlashRegular"]')).not.toBeNull();
    const tile = container.querySelector('[data-category="action"]')!;
    expect(tile).toHaveAttribute('aria-hidden', 'true');
    expect(cssValues(tile, 'border-top-color', true)).toContain('CanvasText');
    expect(cssValues(container.querySelector('[data-node-info-test-data]')!, 'color', true)).toContain('CanvasText');
    const close = screen.getByRole('button', { name: 'Fermer' });
    for (const property of ['min-width', 'width', 'height']) {
      expect(cssValues(close, property)).toContain('24px');
    }
    const user = userEvent.setup();
    await user.pointer({ target: info, keys: '[MouseRight]' });
    expect(onContextMenu).toHaveBeenCalledOnce();
    await user.click(close);
    expect(onDismiss).toHaveBeenCalledOnce();
    unmount();
    expect(ref.current).toBeNull();
  });
});

describe('trigger sample input versus action output (I06)', () => {
  it('never applies action mock paint to a trigger while retaining action mock paint and trigger geometry/status', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <>
        <TriggerNodeCard ref={ref} data-testid="trigger" title="Request" status="mock" selected handleAxis="vertical" />
        <ActionNodeCard data-testid="action" title="Action" status="mock" />
        <NodeInfoCard category="trigger" icon={null} title="Trigger details" description="Sample input" />
      </>
    );
    const trigger = screen.getByTestId('trigger');
    const action = screen.getByTestId('action');
    expect(ref.current).toBe(trigger);
    expect(trigger).toHaveAttribute('data-status', 'mock');
    expect(trigger.querySelector('[data-test-data], [data-icon-name="BeakerRegular"]')).toBeNull();
    expect(cssValues(trigger.firstElementChild!, 'border-top-left-radius')).toContain('37px');
    expect(trigger.querySelector('[data-testid="node-output-handles"][data-axis="vertical"]')).not.toBeNull();
    expect(trigger.querySelector('[data-handle="input"]')).toBeNull();
    expect(action.querySelector('[data-test-data="true"]')).not.toBeNull();
    expect(within(action).getByRole('img', { name: 'Using test data' })).toBeInTheDocument();
    expect(screen.queryByText('Test runs return saved output instead of making live calls.')).toBeNull();
    expect(screen.queryByText('Edit test data')).toBeNull();
    rerender(<TriggerNodeCard ref={ref} title="Request" handles={false} status="succeeded" statusLabel="Completed" />);
    expect(ref.current?.querySelector('[data-handle]')).toBeNull();
    expect(ref.current?.querySelector('[data-badge-status="succeeded"]')).toHaveTextContent('Completed');
  });
});
