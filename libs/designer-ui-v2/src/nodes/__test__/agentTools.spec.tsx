import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokens } from '@fluentui/react-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AgentNodeCard,
  AgentToolsDecoration,
  AgentToolsPanel,
  DesignerUiScope,
  NODE_HOVER_CARD_IGNORE_ATTRIBUTE,
  NodeHoverCard,
  NodeInfoCard,
  NodeToolConnector,
  ToolItemCard,
  nodeMetrics,
} from '../..';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function declarations(element: Element, pseudo = '', media = ''): CSSStyleDeclaration[] {
  const result: CSSStyleDeclaration[] = [];
  const visit = (rules: CSSRuleList, condition = '') => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules, rule.conditionText);
      } else if (rule instanceof CSSStyleRule && condition === media) {
        const hasBefore = rule.selectorText.includes('::before');
        const hasHover = rule.selectorText.includes(':hover');
        if (hasBefore !== (pseudo === '::before') || hasHover !== (pseudo === ':hover')) {
          continue;
        }
        const selector = rule.selectorText.replaceAll('::before', '').replaceAll(':hover', '').replaceAll(':focus-visible', ':focus');
        if (element.matches(selector)) {
          result.push(rule.style);
        }
      }
    }
  };
  for (const sheet of Array.from(element.ownerDocument.styleSheets)) {
    visit(sheet.cssRules);
  }
  return result;
}

const propertyValues = (element: Element, property: string, pseudo = '', media = '') =>
  declarations(element, pseudo, media)
    .map((style) => style.getPropertyValue(property))
    .filter(Boolean);

describe('W07: Agent side-tools, connector, and tools panel', () => {
  describe('AC1, AC5, AC6, AC7: connector visibility and tools presence', () => {
    it.each([
      { handleAxis: 'vertical', toolsPlacement: 'side' },
      { handleAxis: 'horizontal', toolsPlacement: 'side' },
    ] as const)('keeps empty monitoring Agents connector-free with $handleAxis/$toolsPlacement', (placement) => {
      const { container } = render(
        <AgentNodeCard title="Completed agent" status="succeeded" tools={[null, false]} toolsPanelSlot={false} {...placement} />
      );
      expect(screen.queryByTestId('node-tool-connector')).toBeNull();
      expect(screen.queryByTestId('agent-tools-panel')).toBeNull();
      expect(screen.queryByTestId('agent-tools-side')).toBeNull();
      expect(container.querySelectorAll('[data-handle]')).toHaveLength(2);
    });

    it.each(['horizontal', 'vertical'] as const)(
      'omits NodeToolConnector and AgentToolsPanel for an empty read-only Agent on %s axis',
      (handleAxis) => {
        const { container } = render(<AgentNodeCard title="Read-only agent" handleAxis={handleAxis} />);
        expect(screen.queryByTestId('node-tool-connector')).toBeNull();
        expect(screen.queryByTestId('agent-tools-panel')).toBeNull();
        expect(screen.queryByText('Tools')).toBeNull();
        // Main input and output handles still render.
        expect(container.querySelectorAll('[data-handle]')).toHaveLength(2);
      }
    );

    it('renders the connector with its Add button (and no panel) for an empty editable Agent', () => {
      const onAddTool = vi.fn();
      render(<AgentNodeCard title="Editable agent" onAddTool={onAddTool} />);
      const connector = screen.getByTestId('node-tool-connector');
      expect(connector).toHaveAttribute('data-orientation', 'vertical');
      expect(screen.queryByTestId('agent-tools-panel')).toBeNull();
      const addButton = screen.getByRole('button', { name: 'Add tool' });
      expect(connector).toContainElement(addButton);
    });

    it('renders the attached connector dot and tools panel without Add buttons for a populated read-only Agent', () => {
      render(<AgentNodeCard title="Populated read-only agent" tools={[<ToolItemCard key="t1" title="Search docs" size="small" />]} />);
      const connector = screen.getByTestId('node-tool-connector');
      expect(connector.querySelector('[data-handle="neutral"]')).not.toBeNull();
      expect(screen.getByTestId('agent-tools-panel')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add tool' })).toBeNull();
    });

    it('treats empty arrays, booleans, and null/undefined as empty tools', () => {
      const { rerender } = render(<AgentNodeCard title="Agent" tools={[]} />);
      expect(screen.queryByTestId('node-tool-connector')).toBeNull();
      expect(screen.queryByTestId('agent-tools-panel')).toBeNull();

      rerender(<AgentNodeCard title="Agent" tools={[false, null, undefined]} toolsPanelSlot={null} />);
      expect(screen.queryByTestId('node-tool-connector')).toBeNull();
      expect(screen.queryByTestId('agent-tools-panel')).toBeNull();
    });

    it('suppresses the built-in connector when handles=false while retaining tools or toolsPanelSlot', () => {
      const { rerender } = render(
        <AgentNodeCard title="Agent" handles={false} onAddTool={vi.fn()} tools={<ToolItemCard title="Built-in tool" size="small" />} />
      );
      expect(screen.queryByTestId('node-tool-connector')).toBeNull();
      expect(screen.getByTestId('agent-tools-panel')).toBeInTheDocument();
      expect(screen.getByText('Built-in tool')).toBeInTheDocument();

      rerender(<AgentNodeCard title="Agent" handles={false} toolsPanelSlot={<div data-testid="host-slot">Host slot</div>} />);
      expect(screen.queryByTestId('node-tool-connector')).toBeNull();
      expect(screen.getByTestId('host-slot')).toBeInTheDocument();
    });
  });

  describe('AC2, AC3, AC4, AC7: toolsPlacement below vs side and axis invariants', () => {
    it.each(['below', 'side'] as const)('preserves host input focus and slot identity across %s card updates', (toolsPlacement) => {
      const slot = <input aria-label="Tool draft" defaultValue="Original" />;
      const cardRef = createRef<HTMLDivElement>();
      const { rerender } = render(
        <AgentNodeCard ref={cardRef} title="Agent" handleAxis="vertical" toolsPlacement={toolsPlacement} toolsPanelSlot={slot} />
      );
      const input = screen.getByRole('textbox', { name: 'Tool draft' });
      input.focus();
      fireEvent.change(input, { target: { value: 'Host-owned edit' } });
      rerender(
        <AgentNodeCard
          ref={cardRef}
          title="Updated agent"
          selected
          status="running"
          handleAxis="vertical"
          toolsPlacement={toolsPlacement}
          toolsPanelSlot={slot}
        />
      );
      expect(screen.getByRole('textbox', { name: 'Tool draft' })).toBe(input);
      expect(input).toHaveFocus();
      expect(input).toHaveValue('Host-owned edit');
      expect(cardRef.current).toContainElement(input);
      expect(screen.queryByTestId('agent-tools-panel')).toBeNull();
      expect(input.closest(`[${NODE_HOVER_CARD_IGNORE_ATTRIBUTE}]`)).not.toBeNull();
    });

    it('keeps supplied vertical workflow handles outside side tools and retains footer/after ownership', () => {
      render(
        <AgentNodeCard
          title="Slotted agent"
          handleAxis="vertical"
          toolsPlacement="side"
          inputVariant="success"
          inputSlot={<button type="button">Workflow input</button>}
          outputSlot={<button type="button">Workflow output</button>}
          footerAction={<button type="button">Model details</button>}
          after={<span>Host reserve</span>}
          tools={<span>Existing tool</span>}
        />
      );
      const side = screen.getByTestId('agent-tools-side');
      const input = screen.getByRole('button', { name: 'Workflow input' });
      const output = screen.getByRole('button', { name: 'Workflow output' });
      const outputs = screen.getByTestId('node-output-handles');
      expect(side).not.toContainElement(input);
      expect(side).not.toContainElement(output);
      expect(input.closest('[data-handle]')).toHaveAttribute('data-handle', 'success');
      expect(input.closest('[data-handle]')).not.toHaveAttribute('aria-hidden');
      expect(outputs).toContainElement(output);
      expect(outputs).toHaveAttribute('data-axis', 'vertical');
      expect(outputs.nextElementSibling).toBe(screen.getByText('Host reserve'));
      expect(side).not.toContainElement(screen.getByRole('button', { name: 'Model details' }));
    });

    it.each(['horizontal', 'vertical'] as const)(
      'produces identical markup when toolsPlacement is omitted vs explicitly set to "below" on %s axis',
      (handleAxis) => {
        const renderAgent = (toolsPlacement?: 'below' | 'side') => (
          <AgentNodeCard
            title="Customer agent"
            model="gpt-4o"
            handleAxis={handleAxis}
            toolsPlacement={toolsPlacement}
            onAddTool={vi.fn()}
            tools={<ToolItemCard title="Lookup order" size="small" />}
          />
        );
        const { container, rerender } = render(renderAgent());
        const omittedHtml = container.innerHTML;
        rerender(renderAgent('below'));
        expect(container.innerHTML).toBe(omittedHtml);
        // Default placement keeps the pre-W07 DOM contract: no placement marker on the card root.
        expect(container.querySelector('[data-node-card="agent"]')).not.toHaveAttribute('data-tools-placement');
      }
    );

    it('renders side placement on a vertical card with horizontal connector, 10px panel offset, and vertical main output handle', () => {
      const { container } = render(
        <AgentNodeCard
          title="Vertical side agent"
          handleAxis="vertical"
          toolsPlacement="side"
          onAddTool={vi.fn()}
          tools={<ToolItemCard title="Query DB" size="small" />}
        />
      );
      const agent = container.querySelector<HTMLElement>('[data-node-card="agent"]')!;
      expect(agent).toHaveAttribute('data-handle-axis', 'vertical');
      expect(agent).toHaveAttribute('data-tools-placement', 'side');

      const side = screen.getByTestId('agent-tools-side');
      expect(side).toHaveAttribute(NODE_HOVER_CARD_IGNORE_ATTRIBUTE, '');
      expect(propertyValues(side, 'position')).toContain('absolute');
      expect(propertyValues(side, 'top')).toContain('0');
      expect(propertyValues(side, 'left')).toContain('100%');
      expect(propertyValues(side, 'flex-direction')).toContain('row');

      const connector = screen.getByTestId('node-tool-connector');
      expect(side).toContainElement(connector);
      expect(connector).toHaveAttribute('data-orientation', 'horizontal');
      expect(propertyValues(connector, 'height')).toContain(`${nodeMetrics.toolConnector.sideRowHeight}px`);

      const panel = screen.getByTestId('agent-tools-panel');
      expect(side).toContainElement(panel);
      expect(propertyValues(panel, 'margin-top')).toContain(`${nodeMetrics.toolsPanel.sideOffset}px`);

      // Main Agent output handle remains vertical on the bottom of the Agent card itself.
      const outputs = screen.getByTestId('node-output-handles');
      expect(outputs).toHaveAttribute('data-axis', 'vertical');
      expect(side).not.toContainElement(outputs);
      expect(propertyValues(outputs, 'position')).toContain('absolute');
      expect(propertyValues(outputs, 'bottom')).toContain(`${nodeMetrics.handle.edgeOffset}px`);
      expect(propertyValues(outputs, 'left')).toContain('50%');
    });

    it('falls back safely to below placement when toolsPlacement="side" is passed on a horizontal card', () => {
      const { container } = render(
        <AgentNodeCard
          title="Horizontal agent"
          handleAxis="horizontal"
          toolsPlacement="side"
          onAddTool={vi.fn()}
          tools={<ToolItemCard title="Send email" size="small" />}
        />
      );
      const agent = container.querySelector<HTMLElement>('[data-node-card="agent"]')!;
      expect(agent).toHaveAttribute('data-handle-axis', 'horizontal');
      expect(agent).not.toHaveAttribute('data-tools-placement');
      expect(screen.queryByTestId('agent-tools-side')).toBeNull();
      expect(screen.getByTestId('node-tool-connector')).toHaveAttribute('data-orientation', 'vertical');
      expect(screen.getByTestId('node-output-handles')).toHaveAttribute('data-axis', 'horizontal');
    });

    it.each(['below', 'side'] as const)(
      'renders host toolsPanelSlot without mounting a duplicate AgentToolsPanel in %s placement',
      (toolsPlacement) => {
        render(
          <AgentNodeCard
            title="Host-slotted agent"
            handleAxis="vertical"
            toolsPlacement={toolsPlacement}
            tools={<ToolItemCard title="Unused built-in child" size="small" />}
            toolsPanelSlot={
              <AgentToolsPanel surface="transparent" data-testid="host-tools-panel">
                <ToolItemCard title="Host tool 1" size="small" />
                <ToolItemCard title="Host tool 2" size="small" />
              </AgentToolsPanel>
            }
          />
        );
        expect(screen.queryByText('Unused built-in child')).toBeNull();
        expect(screen.getAllByTestId('host-tools-panel')).toHaveLength(1);
        expect(screen.getByText('Tools (2)')).toBeInTheDocument();
        expect(screen.getByTestId('node-output-handles')).toHaveAttribute('data-axis', 'vertical');
        if (toolsPlacement === 'side') {
          expect(screen.getByTestId('agent-tools-side')).toContainElement(screen.getByTestId('host-tools-panel'));
        }
      }
    );
  });

  describe('AC8 & AC9: onAddTool anchor forwarding and NodeToolConnector geometry', () => {
    it('activates native connector Add via Enter/Space and permits normal keyboard exit', async () => {
      const user = userEvent.setup();
      const onAddTool = vi.fn();
      const canvasClick = vi.fn();
      render(
        <div onClick={canvasClick}>
          <AgentNodeCard title="Agent" handleAxis="vertical" toolsPlacement="side" onAddTool={onAddTool} />
          <button type="button">Next control</button>
        </div>
      );
      const add = screen.getByRole('button', { name: 'Add tool' });
      await user.tab();
      expect(add).toHaveFocus();
      expect(add).toHaveAttribute('type', 'button');
      expect(propertyValues(add, 'outline')).toContain(`${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`);
      await user.keyboard('{Enter}');
      expect(onAddTool).toHaveBeenCalledExactlyOnceWith(add);
      onAddTool.mockClear();
      await user.keyboard(' ');
      expect(onAddTool).toHaveBeenCalledExactlyOnceWith(add);
      await user.tab();
      expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
      expect(canvasClick).not.toHaveBeenCalled();
    });

    it('supports native keyboard Add/toggle controls without changing caller-controlled expansion', async () => {
      const user = userEvent.setup();
      const onAddTool = vi.fn();
      const onToggleExpanded = vi.fn();
      render(
        <AgentToolsPanel onAddTool={onAddTool} onToggleExpanded={onToggleExpanded}>
          <span>Keyboard tool</span>
        </AgentToolsPanel>
      );
      const header = screen.getByRole('button', { name: 'Add tools' });
      const toggle = screen.getByRole('button', { name: 'Collapse tools' });
      const bottom = screen.getByRole('button', { name: 'Add' });
      await user.tab();
      expect(header).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onAddTool).toHaveBeenCalledExactlyOnceWith(header);
      await user.tab();
      expect(toggle).toHaveFocus();
      await user.keyboard(' ');
      expect(onToggleExpanded).toHaveBeenCalledOnce();
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('list')).toBeInTheDocument();
      await user.tab();
      expect(bottom).toHaveFocus();
      onAddTool.mockClear();
      await user.keyboard(' ');
      expect(onAddTool).toHaveBeenCalledExactlyOnceWith(bottom);
    });

    it('forwards the clicked HTMLButtonElement as anchor from the empty-state connector Add button', () => {
      const onAddTool = vi.fn();
      const canvasClick = vi.fn();
      const canvasMouseDown = vi.fn();
      render(
        <div onClick={canvasClick} onMouseDown={canvasMouseDown}>
          <AgentNodeCard title="Agent" onAddTool={onAddTool} />
        </div>
      );
      const addButton = screen.getByRole('button', { name: 'Add tool' });
      fireEvent.mouseDown(addButton);
      fireEvent.click(addButton);
      expect(onAddTool).toHaveBeenCalledExactlyOnceWith(addButton);
      expect(canvasClick).not.toHaveBeenCalled();
      expect(canvasMouseDown).not.toHaveBeenCalled();
    });

    it('forwards the clicked HTMLButtonElement as anchor from both header and bottom Add buttons in AgentToolsPanel', () => {
      const onAddTool = vi.fn();
      const canvasClick = vi.fn();
      const canvasMouseDown = vi.fn();
      render(
        <div onClick={canvasClick} onMouseDown={canvasMouseDown}>
          <AgentNodeCard title="Agent" onAddTool={onAddTool} tools={<ToolItemCard title="Existing tool" size="small" />} />
        </div>
      );
      const headerAdd = screen.getByRole('button', { name: 'Add tools' });
      const bottomAdd = screen.getByRole('button', { name: 'Add' });
      expect(headerAdd).not.toBe(bottomAdd);

      fireEvent.mouseDown(headerAdd);
      fireEvent.click(headerAdd);
      expect(onAddTool).toHaveBeenLastCalledWith(headerAdd);

      fireEvent.mouseDown(bottomAdd);
      fireEvent.click(bottomAdd);
      expect(onAddTool).toHaveBeenLastCalledWith(bottomAdd);
      expect(onAddTool).toHaveBeenCalledTimes(2);
      expect(canvasClick).not.toHaveBeenCalled();
      expect(canvasMouseDown).not.toHaveBeenCalled();
    });

    it('matches canonical vertical and horizontal NodeToolConnector geometry, 40x40 hit target, and forced-colors rules', () => {
      const ref = createRef<HTMLDivElement>();
      const onAddTool = vi.fn();
      const { rerender } = render(<NodeToolConnector ref={ref} onAddTool={onAddTool} data-custom="connector" />);
      const connector = screen.getByTestId('node-tool-connector');
      expect(ref.current).toBe(connector);
      expect(connector).toHaveAttribute('data-custom', 'connector');
      expect(connector).toHaveAttribute('data-orientation', 'vertical');

      const diamond = connector.children[0] as HTMLElement;
      const label = connector.children[1] as HTMLElement;
      const line = connector.children[2] as HTMLElement;
      const addButton = screen.getByRole('button', { name: 'Add tool' });

      expect(propertyValues(diamond, 'width')).toContain('12px');
      expect(propertyValues(diamond, 'height')).toContain('12px');
      expect(propertyValues(diamond, 'border-radius')).toContain(tokens.borderRadiusSmall);
      expect(propertyValues(diamond, 'border-top-width')).toContain(tokens.strokeWidthThick);
      expect(propertyValues(diamond, 'border-top-color')).toContain(tokens.colorNeutralStroke1);
      expect(propertyValues(diamond, 'border-top-color', '', '(forced-colors: active)')).toContain('CanvasText');
      expect(propertyValues(diamond, 'background-color', '', '(forced-colors: active)')).toContain('Canvas');
      expect(propertyValues(diamond, 'margin-top')).toContain('-6px');
      expect(propertyValues(diamond, 'margin-bottom')).toContain('9px');

      expect(propertyValues(line, 'width')).toContain(tokens.strokeWidthThin);
      expect(propertyValues(line, 'height')).toContain('20px');

      expect(propertyValues(addButton, 'width')).toContain('20px');
      expect(propertyValues(addButton, 'height')).toContain('20px');
      expect(propertyValues(addButton, 'inset', '::before')).toContain(
        `calc(-1 * ${tokens.spacingHorizontalS} - ${tokens.strokeWidthThick})`
      );

      rerender(<NodeToolConnector hasTools orientation="horizontal" />);
      expect(connector).toHaveAttribute('data-orientation', 'horizontal');
      expect(propertyValues(connector, 'flex-direction')).toContain('row');
      expect(propertyValues(connector, 'height')).toContain('74px');
      expect(propertyValues(diamond, 'margin-left')).toContain('-6px');
      expect(propertyValues(diamond, 'margin-right')).toContain('9px');
      expect(propertyValues(label, 'margin-right')).toContain(tokens.spacingHorizontalS);
      expect(propertyValues(line, 'width')).toContain('20px');
      expect(propertyValues(line, 'height')).toContain(tokens.strokeWidthThin);
      const attachedHandle = connector.querySelector<HTMLElement>('[data-handle="neutral"]')!;
      expect(propertyValues(attachedHandle, 'margin-right')).toContain('-6px');
    });
  });

  describe('AC10, AC11, AC12, AC13: AgentToolsPanel header chrome, collapse/reveal motion, and decoration layer', () => {
    it('keeps panel semantics/localization and compact Add glyphs while count changes', () => {
      const strings = {
        heading: (count: number) => `Outils (${count})`,
        addTools: 'Ajouter des outils',
        collapseTools: 'Réduire',
        expandTools: 'Développer',
        add: 'Ajouter',
      };
      const ref = createRef<HTMLElement>();
      const props = { ref, strings, onAddTool: vi.fn(), onToggleExpanded: vi.fn(), 'aria-owns': 'external-tool' };
      const { rerender } = render(
        <AgentToolsPanel {...props}>
          <span>Premier outil</span>
        </AgentToolsPanel>
      );
      const panel = screen.getByTestId('agent-tools-panel');
      const heading = screen.getByRole('heading', { level: 3, name: 'Outils (1)' });
      expect(ref.current).toBe(panel);
      expect(panel.tagName).toBe('SECTION');
      expect(panel).toHaveAttribute('aria-labelledby', heading.id);
      expect(panel).toHaveAttribute('aria-owns', 'external-tool');
      expect(propertyValues(panel, 'width')).toContain('280px');
      expect(propertyValues(panel, 'padding')).toContain(tokens.spacingHorizontalL);
      expect(propertyValues(panel, 'border-radius')).toContain(tokens.borderRadius2XLarge);
      expect(propertyValues(heading.parentElement!, 'height')).toContain('20px');
      const bottom = screen.getByRole('button', { name: 'Ajouter' });
      expect(bottom).toHaveClass('fui-Button');
      expect(propertyValues(bottom.querySelector('.fui-Button__icon')!, 'font-size')).toContain('16px');
      expect(propertyValues(heading.parentElement!, 'gap')).toContain(tokens.spacingHorizontalS);
      expect(screen.getByRole('button', { name: 'Ajouter des outils' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Réduire' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      rerender(
        <AgentToolsPanel {...props}>
          <span>Premier outil</span>
          <span>Deuxième outil</span>
        </AgentToolsPanel>
      );
      expect(screen.getByRole('heading', { name: 'Outils (2)' })).toBe(heading);
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(panel.querySelector('[aria-live]')).toBeNull();
    });

    it('retargets an interrupted panel collapse without hiding the reopened tools', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => window.setTimeout(() => callback(performance.now()), 16));
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => window.clearTimeout(id));
      const tool = <input aria-label="Animated draft" defaultValue="Preserved during interruption" />;
      const { rerender, unmount } = render(<AgentToolsPanel>{tool}</AgentToolsPanel>);
      const panel = screen.getByTestId('agent-tools-panel');
      const draft = screen.getByRole('textbox', { name: 'Animated draft' });
      Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 180 });
      rerender(<AgentToolsPanel expanded={false}>{tool}</AgentToolsPanel>);
      act(() => vi.advanceTimersByTime(80));
      const interruptedClip = panel.style.clipPath;
      expect(interruptedClip).not.toBe('');
      rerender(<AgentToolsPanel expanded>{tool}</AgentToolsPanel>);
      expect(panel.style.clipPath).toBe(interruptedClip);
      expect(screen.getByRole('textbox', { name: 'Animated draft' })).toBe(draft);
      expect(draft.closest('[inert]')).toBeNull();
      act(() => vi.advanceTimersByTime(240));
      expect(panel.style.clipPath).toBe('');
      expect(draft).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(400));
      expect(draft).toBeInTheDocument();
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('honors OS reduced motion immediately for panel collapse and expansion', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (media) =>
          ({
            matches: media === '(prefers-reduced-motion: reduce)',
            media,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList
      );
      const tool = <span>OS instant tool</span>;
      const { rerender } = render(<AgentToolsPanel>{tool}</AgentToolsPanel>);
      const panel = screen.getByTestId('agent-tools-panel');
      rerender(<AgentToolsPanel expanded={false}>{tool}</AgentToolsPanel>);
      expect(screen.queryByText('OS instant tool')).toBeNull();
      expect(panel.style.clipPath).toBe('');
      rerender(<AgentToolsPanel expanded>{tool}</AgentToolsPanel>);
      expect(screen.getByText('OS instant tool')).toBeInTheDocument();
      expect(panel.style.clipPath).toBe('');
    });

    it('renders tabular-nums heading, 20x20 header controls, rotating ChevronUpRegular, and 40px tall bottom Add target', () => {
      const { container, rerender } = render(
        <AgentToolsPanel onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
          <ToolItemCard title="Tool A" size="small" />
          <ToolItemCard title="Tool B" size="small" />
        </AgentToolsPanel>
      );
      const heading = screen.getByRole('heading', { level: 3, name: 'Tools (2)' });
      expect(propertyValues(heading, 'font-variant-numeric')).toContain('tabular-nums');

      const collapseBtn = screen.getByRole('button', { name: 'Collapse tools' });
      expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
      expect(collapseBtn).toHaveAttribute('aria-controls', screen.getByRole('list').id);
      expect(propertyValues(collapseBtn, 'width')).toContain('20px');
      expect(propertyValues(collapseBtn, 'height')).toContain('20px');

      // Single ChevronUpRegular icon that rotates 180deg when collapsed.
      expect(container.querySelector('[data-icon-name="ChevronUpRegular"]')).not.toBeNull();
      expect(container.querySelector('[data-icon-name="ChevronDownRegular"]')).toBeNull();
      const iconSlot = collapseBtn.querySelector('.fui-Button__icon')!;
      expect(propertyValues(iconSlot, 'transform')).not.toContain('rotate(180deg)');

      const bottomAdd = screen.getByRole('button', { name: 'Add' });
      expect(propertyValues(bottomAdd, 'inset', '::before')).toContain(
        `calc(-1 * ${tokens.spacingVerticalS} - ${tokens.strokeWidthThick}) 0`
      );

      rerender(
        <AgentToolsPanel expanded={false} onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
          <ToolItemCard title="Tool A" size="small" />
        </AgentToolsPanel>
      );
      const expandBtn = screen.getByRole('button', { name: 'Expand tools' });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
      expect(container.querySelector('[data-icon-name="ChevronUpRegular"]')).not.toBeNull();
      expect(propertyValues(expandBtn.querySelector('.fui-Button__icon')!, 'transform')).toContain('rotate(180deg)');
    });

    it('animates clip-path and revealEdge during collapse/expand and unmounts the body after settling', () => {
      vi.useFakeTimers();
      const { container, rerender } = render(
        <AgentToolsPanel onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
          <ToolItemCard title="Animated tool" size="small" />
        </AgentToolsPanel>
      );
      const panel = screen.getByTestId('agent-tools-panel');
      Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 180 });

      // Collapse: body stays mounted with aria-hidden + inert while clip-path and revealEdge animate for 180ms.
      rerender(
        <AgentToolsPanel expanded={false} onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
          <ToolItemCard title="Animated tool" size="small" />
        </AgentToolsPanel>
      );
      const listDuringCollapse = container.querySelector('ul');
      expect(listDuringCollapse).not.toBeNull();
      const bodyWrapper = listDuringCollapse!.parentElement!;
      expect(bodyWrapper).toHaveAttribute('aria-hidden', 'true');
      expect(bodyWrapper).toHaveAttribute('inert');
      expect(panel.style.clipPath).toContain('inset(');
      const revealEdge = panel.querySelector<HTMLElement>('span[aria-hidden="true"]')!;
      expect(revealEdge.style.display).toBe('block');

      // After 180ms collapse completes, the body unmounts and clip-path / revealEdge reset.
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(container.querySelector('ul')).toBeNull();
      expect(screen.getByRole('button', { name: 'Expand tools' })).not.toHaveAttribute('aria-controls');
      expect(panel.style.clipPath).toBe('');
      expect(revealEdge.style.display).toBe('none');

      // Expand: body mounts immediately and animates clip-path for 240ms before clearing.
      rerender(
        <AgentToolsPanel expanded onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
          <ToolItemCard title="Animated tool" size="small" />
        </AgentToolsPanel>
      );
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(panel.style.clipPath).toContain('inset(');
      act(() => {
        vi.advanceTimersByTime(360);
      });
      expect(panel.style.clipPath).toBe('');
      expect(revealEdge.style.display).toBe('none');
      expect(screen.getByText('Animated tool')).toBeInTheDocument();
    });

    it('collapses and expands immediately with no clip-path animation when reduced motion is active', () => {
      const { rerender } = render(
        <div data-reduce-motion="true">
          <AgentToolsPanel onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
            <ToolItemCard title="Instant tool" size="small" />
          </AgentToolsPanel>
        </div>
      );
      const panel = screen.getByTestId('agent-tools-panel');
      rerender(
        <div data-reduce-motion="true">
          <AgentToolsPanel expanded={false} onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
            <ToolItemCard title="Instant tool" size="small" />
          </AgentToolsPanel>
        </div>
      );
      expect(panel.style.clipPath).toBe('');
      expect(screen.queryByText('Instant tool')).toBeNull();
      rerender(
        <div data-reduce-motion="true">
          <AgentToolsPanel expanded onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
            <ToolItemCard title="Instant tool" size="small" />
          </AgentToolsPanel>
        </div>
      );
      expect(screen.getByText('Instant tool')).toBeInTheDocument();
      expect(panel.style.clipPath).toBe('');
    });

    it('never renders an opaque revealEdge or surface fill when surface="transparent"', () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <AgentToolsPanel surface="transparent" onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
          <ToolItemCard title="Transparent tool" size="small" />
        </AgentToolsPanel>
      );
      const panel = screen.getByTestId('agent-tools-panel');
      expect(propertyValues(panel, 'background-color')).toContain('transparent');
      expect(propertyValues(panel, 'border-top-color')).toContain('transparent');

      rerender(
        <AgentToolsPanel surface="transparent" expanded={false} onAddTool={vi.fn()} onToggleExpanded={vi.fn()}>
          <ToolItemCard title="Transparent tool" size="small" />
        </AgentToolsPanel>
      );
      // No revealEdge element is mounted on a transparent foreground panel.
      expect(panel.querySelectorAll(':scope > span[aria-hidden="true"]')).toHaveLength(0);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const decorationRef = createRef<HTMLElement>();
      render(
        <AgentToolsDecoration
          ref={decorationRef}
          data-testid="agent-tools-decoration"
          data-agent-tools-decoration="true"
          style={{ width: 280, height: 54 }}
        />
      );
      expect(decorationRef.current).toBe(screen.getByTestId('agent-tools-decoration'));
      expect(decorationRef.current).toHaveAttribute('data-agent-tools-decoration', 'true');
    });
  });

  describe('AC14: NodeHoverCard ignore boundary on Agent tools region', () => {
    it.each(['below', 'side'] as const)(
      'does not open the parent Agent NodeHoverCard when hovering or focusing inside %s tools',
      (toolsPlacement) => {
        vi.useFakeTimers();
        render(
          <DesignerUiScope>
            <NodeHoverCard openDelay={100} card={<NodeInfoCard category="agent" icon={null} title="Agent hover card" />}>
              <AgentNodeCard
                title="Main agent"
                handleAxis="vertical"
                toolsPlacement={toolsPlacement}
                onAddTool={vi.fn()}
                tools={
                  <ToolItemCard
                    title="Nested tool"
                    size="small"
                    tabIndex={0}
                    icon={
                      <svg data-testid="nested-tool-icon" aria-hidden="true">
                        <path d="M0 0h1v1H0z" />
                      </svg>
                    }
                  />
                }
              />
            </NodeHoverCard>
          </DesignerUiScope>
        );

        const headerAdd = screen.getByRole('button', { name: 'Add tools' });
        fireEvent.focus(headerAdd);
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(screen.queryByText('Agent hover card')).toBeNull();
        fireEvent.blur(headerAdd);
        fireEvent.mouseOver(screen.getByTestId('nested-tool-icon').firstElementChild!);
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(screen.queryByText('Agent hover card')).toBeNull();
        fireEvent.mouseOver(headerAdd);
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(screen.queryByText('Agent hover card')).toBeNull();

        const nestedTool = screen.getByText('Nested tool');
        fireEvent.mouseOver(nestedTool);
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(screen.queryByText('Agent hover card')).toBeNull();

        // Hovering the Agent card itself still opens the Agent hover card.
        fireEvent.mouseOver(screen.getByText('Main agent'));
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(screen.getByText('Agent hover card')).toBeInTheDocument();
      }
    );
  });
});
