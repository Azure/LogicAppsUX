import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SharedAgentScopeCard, SharedBranchCard, SharedScopeCard } from '../SharedFamilyCards';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import type { ActionCardProps } from '../actionCard';
import { PreviewOperationCard } from '../../../../panel/multiSelectPanel/SharedExtractionPreviewNode';
const modelParameter = vi.hoisted(() => ({ current: undefined as { value: { value: string }[] } | undefined }));
vi.mock('../../../../../core/state/operation/operationSelector', () => ({
  useOperationParameterByName: () => modelParameter.current,
}));

afterEach(cleanup);
const props = (): ActionCardProps => ({
  id: 'real-id',
  title: 'Renamed operation',
  drag: vi.fn(),
  dragPreview: vi.fn(),
  onClick: vi.fn(),
  onDeleteClick: vi.fn(),
  onCopyClick: vi.fn(),
  handleCollapse: vi.fn(),
  nodeIndex: 2,
});

const getMatchedStyleRules = (element: HTMLElement): CSSStyleRule[] => {
  const classes = new Set(element.className.split(/\s+/).filter(Boolean));
  if (!classes.size) {
    return [];
  }
  return Array.from(document.styleSheets).flatMap((sheet) => {
    let cssRules: CSSRule[] = [];
    try {
      cssRules = Array.from(sheet.cssRules);
    } catch {
      return [];
    }
    const rules = cssRules.filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    return rules.filter((rule) =>
      rule.selectorText
        .split(',')
        .map((selector) => selector.trim())
        .some((selector) => {
          const className = selector.startsWith('.') ? selector.slice(1).split(/[:\s.[#>+~]/)[0] : '';
          return className ? classes.has(className) : false;
        })
    );
  });
};

describe('shared family interaction adapters', () => {
  it('keeps the extraction Scope header identical to the actual main Scope header', () => {
    const input = props();
    const { container } = render(
      <>
        <SharedScopeCard {...input} family="scope" operationType="Scope" />
        <PreviewOperationCard
          node={{
            id: input.id,
            label: input.title,
            position: { x: 0, y: 0 },
            operation: { type: 'Scope', actions: {} },
            isTrigger: false,
          }}
          domId="preview-scope"
        />
      </>
    );
    const main = within(container.querySelector('#msla-node-real-id')!).getByText(input.title).parentElement!;
    const preview = within(container.querySelector('#preview-scope')!).getByText(input.title).parentElement!;
    expect(main.textContent).toBe(input.title);
    expect(Array.from(preview.children, (line) => line.textContent)).toEqual(Array.from(main.children, (line) => line.textContent));
  });

  it.each([
    ['if', 'if'],
    ['switch', 'switch'],
    ['loop', 'foreach'],
    ['agent', 'agent'],
    ['scope', 'action'],
  ] as const)('uses the canonical %s surface for the actual admitted family', (family, surface) => {
    const { container } = render(<SharedScopeCard {...props()} family={family} />);
    expect(container.querySelector(`[data-node-card="${surface}"]`)).not.toBeNull();
    expect(screen.getByTestId('card-Renamed operation')).toHaveAttribute('id', 'msla-node-real-id');
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('id', 'real-id-collapse-toggle');
  });

  it.each(['Until', 'Until_Nested'])('keeps unique legacy Until Do/footer identities for %s', (id) => {
    const footer = { ...props(), id, title: `${id} footer`, onContextMenu: vi.fn() };
    const collapseDo = vi.fn();
    const doContextMenu = vi.fn();
    const { container } = render(
      <>
        <SharedBranchCard
          id={id}
          title={`Do ${id}`}
          subgraphType={SUBGRAPH_TYPES.UNTIL_DO}
          onClick={vi.fn()}
          onContextMenu={doContextMenu}
          onCollapse={collapseDo}
        />
        <SharedScopeCard {...footer} family="loop" operationType="Until" />
      </>
    );
    const doCard = screen.getByTestId(`card-Do ${id}`);
    const footerCard = screen.getByTestId(`card-${id} footer`);
    expect(doCard).not.toHaveAttribute('id');
    expect(footerCard).toHaveAttribute('id', `msla-node-${id}`);
    expect(doCard).toHaveAttribute('data-node-id', id);
    expect(footerCard).toHaveAttribute('data-node-id', id);
    expect(doCard).toHaveAttribute('data-automation-id', `${id}-collapse-toggle-small`);
    expect(footerCard).toHaveAttribute('data-automation-id', `card-${id.toLowerCase()}_footer`);
    const doToggle = within(doCard).getByRole('button', { name: 'Collapse' });
    const footerToggle = within(footerCard).getByRole('button', { name: 'Collapse' });
    expect(doToggle).toHaveAttribute('id', id);
    expect(footerToggle).toHaveAttribute('id', `${id}-collapse-toggle`);
    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    fireEvent.click(doToggle, { shiftKey: true });
    expect(collapseDo).toHaveBeenCalledTimes(1);
    expect(collapseDo).toHaveBeenCalledWith(true);
    expect(footer.handleCollapse).not.toHaveBeenCalled();
    fireEvent.click(footerToggle, { shiftKey: true });
    expect(footer.handleCollapse).toHaveBeenCalledTimes(1);
    expect(footer.handleCollapse).toHaveBeenCalledWith(true);
    expect(footer.onClick).not.toHaveBeenCalled();
    fireEvent.contextMenu(doCard);
    fireEvent.contextMenu(footerCard);
    expect(doContextMenu).toHaveBeenCalledTimes(1);
    expect(footer.onContextMenu).toHaveBeenCalledTimes(1);
  });

  it('retains DnD refs, focus and host keyboard commands without activating nested collapse twice', () => {
    const input = props();
    render(<SharedScopeCard {...input} family="loop" setFocus />);
    const card = screen.getByTestId('card-Renamed operation');
    expect(input.drag).toHaveBeenCalledWith(card);
    expect(input.dragPreview).toHaveBeenCalledWith(card);
    expect(card).toHaveFocus();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(input.onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(card, { key: 'Delete' });
    expect(input.onDeleteClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(card, { key: 'c', ctrlKey: true });
    expect(input.onCopyClick).toHaveBeenCalledTimes(1);
    const collapse = screen.getByRole('button', { name: 'Collapse' });
    fireEvent.keyDown(collapse, { key: 'Enter' });
    fireEvent.click(collapse, { shiftKey: true });
    expect(input.handleCollapse).toHaveBeenCalledWith(true);
    expect(input.onClick).toHaveBeenCalledTimes(1);
  });

  it('renders only the real configured model, and does not invent a model from the Agent title', () => {
    const view = render(<SharedScopeCard {...props()} family="agent" model="deployment-from-inputs" />);
    expect(screen.getByText('deployment-from-inputs')).toBeInTheDocument();
    view.rerender(<SharedScopeCard {...props()} family="agent" />);
    expect(screen.queryByText('deployment-from-inputs')).not.toBeInTheDocument();
    expect(screen.getByText('Configure model')).toBeInTheDocument();
  });

  it('keeps canonical glyphs with absent branding and explicit loading state', () => {
    const { container } = render(<SharedScopeCard {...props()} family="loop" isLoading icon={undefined} />);
    expect(container.querySelector('[data-node-card="foreach"]')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('suppresses legacy Agent image branding while retaining the canonical Agent glyph', () => {
    const { container } = render(<SharedScopeCard {...props()} family="agent" icon="legacy-curly-braces.svg" />);
    const agent = container.querySelector('[data-node-card="agent"]')!;
    expect(agent.querySelector('img')).toBeNull();
    expect(agent.querySelector('[data-icon-name="AgentsRegular"]')).not.toBeNull();
  });

  it('composes the real tools panel inside the Agent before its output without cloning tool rows', () => {
    const { container } = render(
      <SharedScopeCard
        {...props()}
        family="agent"
        outputSlots={[<span key="output" data-testid="real-agent-output" />]}
        toolsPanel={{
          width: 304,
          height: 300,
          bottomPadding: 20,
          items: [{ id: 'real-tool' }],
        }}
      />
    );
    const agent = container.querySelector('[data-node-card="agent"]')!;
    const panel = agent.querySelector('[data-testid="agent-tools-panel"]')!;
    expect(panel).toHaveAttribute('aria-owns', 'msla-node-real-tool');
    expect(panel).toHaveTextContent('Tools (1)');
    expect(agent.querySelectorAll('[data-testid="agent-tools-panel"]')).toHaveLength(1);
    expect(agent.querySelectorAll('[data-node-card="tool"]')).toHaveLength(0);
    expect(panel).toHaveStyle({ width: '304px', height: '300px' });
    expect(panel.parentElement).toHaveStyle({ paddingBottom: '20px' });
    expect(panel.compareDocumentPosition(agent.querySelector('[data-testid="real-agent-output"]')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('prevents the foreground Agent tools panel from repainting an opaque frame over shared-graph edges', () => {
    const { container } = render(
      <SharedScopeCard
        {...props()}
        family="agent"
        toolsPanel={{
          width: 304,
          height: 300,
          bottomPadding: 20,
          items: [{ id: 'real-tool' }],
        }}
      />
    );
    const panel = container.querySelector<HTMLElement>('[data-testid="agent-tools-panel"]')!;
    expect(panel).toHaveStyle({ width: '304px', height: '300px' });
    expect(panel.parentElement).toHaveStyle({ paddingBottom: '20px' });
    expect(panel).toHaveTextContent('Tools (1)');
    expect(panel).toHaveAttribute('data-agent-id', 'real-id');
    expect(panel).not.toHaveAttribute('data-agent-tools-decoration');
    const matchedRules = getMatchedStyleRules(panel);
    expect(matchedRules.length).toBeGreaterThan(0);
    expect(
      matchedRules.some((rule) => rule.style.getPropertyValue('box-sizing').trim() === 'border-box'),
      'foreground panel must keep border-box reservation contract'
    ).toBe(true);
    expect(
      matchedRules.some((rule) => {
        const borderColor = rule.style.getPropertyValue('border-color').trim();
        const borderTopColor = rule.style.getPropertyValue('border-top-color').trim();
        const borderLeftColor = rule.style.getPropertyValue('border-left-color').trim();
        const borderRightColor = rule.style.getPropertyValue('border-right-color').trim();
        const borderBottomColor = rule.style.getPropertyValue('border-bottom-color').trim();
        return [borderColor, borderTopColor, borderLeftColor, borderRightColor, borderBottomColor].includes('transparent');
      }),
      'foreground panel must keep a transparent border reservation'
    ).toBe(true);
    const foregroundOpaqueRules = matchedRules.filter((rule) =>
      /--designer-ui-v2-node-agent-surface/.test(rule.style.getPropertyValue('background-color'))
    );
    expect(foregroundOpaqueRules).toHaveLength(0);
  });

  it.each([1120, 576, 280])('centers the canonical Agent header within its accepted %ipx tools frame', (width) => {
    const { container } = render(
      <div style={{ width }}>
        <SharedScopeCard {...props()} family="agent" toolsPanel={{ width, height: 300, bottomPadding: 20, items: [{ id: 'real-tool' }] }} />
      </div>
    );
    const agent = container.querySelector<HTMLElement>('[data-node-card="agent"]')!;
    const hoverTrigger = agent.parentElement!;
    const panel = agent.querySelector<HTMLElement>('[data-testid="agent-tools-panel"]')!;
    // JSDOM cannot measure canvas geometry; guard the CSS contract that the native frame relies on.
    expect(getComputedStyle(hoverTrigger).width).toBe('100%');
    expect(getComputedStyle(agent).width).toBe('280px');
    expect(agent).toHaveStyle({ marginInline: 'auto' });
    expect(panel).toHaveStyle({ width: `${width}px` });
  });

  it('does not stretch an Agent without an accepted tools frame', () => {
    const { container } = render(<SharedScopeCard {...props()} family="agent" />);
    const agent = container.querySelector<HTMLElement>('[data-node-card="agent"]')!;
    expect(getComputedStyle(agent.parentElement!).width).not.toBe('100%');
    expect(getComputedStyle(agent).width).toBe('280px');
  });

  it('uses explicit false-branch metadata after a misleading rename and preserves compact-branch collapse semantics', () => {
    const open = vi.fn();
    const collapse = vi.fn();
    const { container } = render(
      <SharedBranchCard
        id="actual-false"
        title="True"
        subgraphType={SUBGRAPH_TYPES.CONDITIONAL_FALSE}
        onClick={open}
        onCollapse={collapse}
      />
    );
    expect(container.querySelector('[data-branch="false"]')).toHaveTextContent('False');
    expect(screen.getByRole('button', { name: 'False' })).toHaveAttribute('id', 'msla-node-actual-false');
    fireEvent.click(screen.getByRole('button', { name: 'False' }));
    expect(open).not.toHaveBeenCalled();
    expect(collapse).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(collapse).toHaveBeenCalledWith(false);
    expect(collapse).toHaveBeenCalledTimes(2);
    expect(open).not.toHaveBeenCalled();
  });

  it('keeps collapsed Agent tool counts without claiming ownership of absent cards and preserves real expand', () => {
    const input = props();
    render(
      <SharedScopeCard
        {...input}
        family="agent"
        collapsed
        toolsPanel={{
          width: 280,
          height: 54,
          bottomPadding: 0,
          collapsed: true,
          items: [{ id: 'real-collapsed-tool' }],
        }}
      />
    );
    expect(screen.getByTestId('agent-tools-panel')).toHaveTextContent('Tools (1)');
    expect(screen.getByTestId('agent-tools-panel')).not.toHaveAttribute('aria-owns');
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(input.handleCollapse).toHaveBeenCalledWith(false);
    expect(input.onClick).not.toHaveBeenCalled();
  });

  it('uses live model parameter edits and never restores a stale configured deployment after it is cleared', () => {
    modelParameter.current = { value: [{ value: 'edited-deployment' }] };
    const view = render(<SharedAgentScopeCard {...props()} family="agent" model="stale-definition-deployment" />);
    expect(screen.getByText('edited-deployment')).toBeInTheDocument();
    modelParameter.current = { value: [{ value: '' }] };
    view.rerender(<SharedAgentScopeCard {...props()} family="agent" model="stale-definition-deployment" />);
    expect(screen.getByText('Configure model')).toBeInTheDocument();
    expect(screen.queryByText('stale-definition-deployment')).not.toBeInTheDocument();
    modelParameter.current = undefined;
  });

  it('adopts real MCP/subworkflow tool roles without cloning their editor identity', () => {
    const { container } = render(
      <SharedBranchCard id="tool-run-identity" title="Renamed tool" subgraphType={SUBGRAPH_TYPES.MCP_CLIENT} selected onClick={vi.fn()} />
    );
    expect(container.querySelector('[data-tool-kind="mcp"]')).toHaveAttribute('id', 'msla-node-tool-run-identity');
    expect(container.querySelectorAll('[data-node-card="tool"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'MCP tool: Renamed tool' })).toHaveAttribute('aria-pressed', 'true');
  });

  it.each(['Wait', 'Send_teams_message_for_PR_details', 'Post_or_Patch_Azure_DevOps_REST_API', 'Long tool label '.repeat(12)])(
    'constrains the tool hover trigger to accepted geometry without losing the full label: %s',
    (title) => {
      const { container, getByText, getByRole } = render(
        <div style={{ width: nodeMetrics.cards.tool.width }}>
          <SharedBranchCard
            id="named-tool"
            title={title}
            subgraphType={SUBGRAPH_TYPES.AGENT_CONDITION}
            handleAxis="horizontal"
            onClick={vi.fn()}
          />
        </div>
      );
      const card = container.querySelector<HTMLElement>('[data-node-card="tool"]')!;
      const trigger = card.parentElement!;
      // The real ToolItem is fill-width; only a bounded hover trigger makes ellipsis honor ELK's width.
      expect(getComputedStyle(trigger).width).toBe('100%');
      expect(getComputedStyle(card).width).toBe('100%');
      expect(getComputedStyle(card).boxSizing).toBe('border-box');
      const label = getByText(title.trim());
      expect(getComputedStyle(label)).toMatchObject({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
      expect(getByRole('button', { name: `Tool: ${title.trim()}` })).toBe(card);
    }
  );

  it('renders tool-row continuation slots on the horizontal axis when ELK accepts rightward branch flow', () => {
    const { container } = render(
      <SharedBranchCard
        id="tool-run-identity"
        title="Renamed tool"
        subgraphType={SUBGRAPH_TYPES.MCP_CLIENT}
        selected
        handleAxis="horizontal"
        inputSlot={<span data-testid="tool-input-slot" />}
        outputSlot={<span data-testid="tool-output-slot" />}
        onClick={vi.fn()}
      />
    );
    const tool = container.querySelector('[data-node-card="tool"]')!;
    expect(tool).toHaveAttribute('data-handle-axis', 'horizontal');
    expect(screen.getByTestId('tool-input-slot')).toBeInTheDocument();
    expect(screen.getByTestId('tool-output-slot')).toBeInTheDocument();
  });

  it('does not overlay tool validation errors on an actual run-status badge', () => {
    const input = {
      id: 'tool-with-status',
      title: 'Tool with validation and run data',
      subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
      onClick: vi.fn(),
      errorMessages: ['Invalid connection'],
    };
    const { container, rerender } = render(<SharedBranchCard {...input} runData={{ status: 'Succeeded' }} />);
    expect(container.querySelector('[data-node-card="tool"]')).toHaveAttribute('data-status', 'succeeded');
    expect(screen.queryByAltText('Errors')).not.toBeInTheDocument();
    rerender(<SharedBranchCard {...input} runData={undefined} />);
    expect(screen.getByAltText('Errors')).toBeInTheDocument();
  });
});
