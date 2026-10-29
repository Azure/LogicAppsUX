import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionNodeCard, AgentNodeCard, ConditionNodeCard, NodeInfoCard, TriggerNodeCard } from '../..';
import type { BaseNodeCardProps } from '../..';

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
