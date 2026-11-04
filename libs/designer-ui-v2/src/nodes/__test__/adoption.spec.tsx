import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { tokens } from '@fluentui/react-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as ui from '../..';

afterEach(() => vi.restoreAllMocks());

// Inspect rules attached to the rendered element, not unrelated styles left by another test.
function declarations(element: Element, pseudo = '', media = ''): CSSStyleDeclaration[] {
  const result: CSSStyleDeclaration[] = [];
  const visit = (rules: CSSRuleList, condition = '') => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules, rule.conditionText);
      } else if (rule instanceof CSSStyleRule && condition === media) {
        if (rule.selectorText.includes(':hover') !== (pseudo === ':hover')) {
          continue;
        }
        if (element.matches(rule.selectorText.replaceAll(':hover', '').replaceAll(':focus-visible', ':focus'))) {
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

describe('canonical visual-kind glyphs', () => {
  const cases = [
    ['http', 'Globe'],
    ['response', 'ArrowReply'],
    ['schedule', 'Clock'],
    ['delay', 'Timer'],
    ['compose', 'Braces'],
    ['parseJson', 'DocumentData'],
    ['variables', 'BracesVariable'],
    ['table', 'Table'],
    ['filterArray', 'Filter'],
    ['join', 'Merge'],
    ['dateTime', 'CalendarClock'],
    ['inlineCode', 'Code'],
    ['terminate', 'Prohibited'],
    ['invokeWorkflow', 'Flow'],
  ] as const;

  it.each(cases)('keeps the canonical Regular/Filled pair for %s in the public table', (kind, name) => {
    const pair = ui.getNodeGlyph(kind);
    expect(pair).toBe(ui.NODE_GLYPHS[kind]);
    const { container } = render(
      <>
        <pair.regular />
        <pair.filled />
      </>
    );
    expect(container.querySelector(`[data-icon-name="${name}Regular"]`)).not.toBeNull();
    expect(container.querySelector(`[data-icon-name="${name}Filled"]`)).not.toBeNull();
  });

  it('has only the fourteen visual groups, with no MCP or raw operation membership', () => {
    expect(Object.keys(ui.NODE_GLYPHS).sort()).toEqual(cases.map(([kind]) => kind).sort());
  });
});

describe('confirmed canonical source drift', () => {
  it.each([false, '', 0, null, undefined])('falls back from falsy icon %s without losing explicit selected-icon slots', (icon) => {
    const defaults = { icon: 'default', selectedIcon: 'default-selected' };
    expect(ui.resolveNodeIcons({ icon }, defaults)).toEqual(defaults);
    expect(ui.resolveNodeIcons({ icon, selectedIcon: '' }, defaults)).toEqual({ icon: 'default', selectedIcon: '' });
    expect(ui.resolveNodeIcons({ icon: 'host' }, defaults)).toEqual({ icon: 'host', selectedIcon: 'host' });
  });

  it('keeps the selected Agent footer pressed on hover without removing the root focus ring', () => {
    const { container } = render(<ui.AgentNodeCard title="Agent" selected model="Configured" tabIndex={0} />);
    const root = container.querySelector('[data-node-card="agent"]')!;
    const card = root.firstElementChild!;
    expect(propertyValues(card, ui.nodeCardVars.footerBackground, ':hover')).toEqual([tokens.colorNeutralBackground3Pressed]);
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => rule.cssText)
      .join('\n');
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline/);
  });

  it.each([
    ['true', tokens.colorStatusSuccessBorder2],
    ['false', tokens.colorStatusDangerBorder2],
  ] as const)('uses the canonical 1.5px Border2 dot for the %s branch', (branch, color) => {
    const { container } = render(<ui.NodeLabeledHandle branch={branch} />);
    const dot = container.querySelector('[aria-hidden="true"]')!;
    expect(propertyValues(dot, 'border-top-width')).toContain('1.5px');
    expect(propertyValues(dot, 'border-top-color')).toContain(color);
    expect(propertyValues(dot, 'border-top-color', '', '(forced-colors: active)')).toContain('CanvasText');
  });

  it('preserves the tool connector transition and both motion opt-outs on the actual add button', () => {
    render(
      <div data-reduce-motion="true">
        <ui.NodeToolConnector onAddTool={vi.fn()} />
      </div>
    );
    const button = screen.getByRole('button');
    expect(propertyValues(button, 'transition-property').map((value) => value.replaceAll(' ', ''))).toContain('color,border-color');
    expect(propertyValues(button, 'transition-duration')).toContain(tokens.durationFast);
    expect(propertyValues(button, 'transition-duration')).toContain('0.01ms');
    expect(propertyValues(button, 'transition-duration', '', '(prefers-reduced-motion: reduce)')).toContain('0.01ms');
    expect(propertyValues(button, 'border-top-color', '', '(forced-colors: active)')).toContain('ButtonText');
  });

  it('applies host reduced-motion to the actual card and running icon, not an impossible ancestor selector', () => {
    const { container } = render(
      <div data-reduce-motion="true">
        <ui.ActionNodeCard title="Running" status="running" />
      </div>
    );
    const card = container.querySelector('[data-node-card="action"]')!.lastElementChild!;
    const icon = screen.getByRole('status').querySelector('.fui-Badge__icon')!;
    expect(propertyValues(card, 'transition-duration')).toContain('0.01ms');
    expect(propertyValues(icon, 'animation-name')).toContain('none');
  });

  it('does not squeeze the line inside a flex row', () => {
    const { container } = render(<ui.NodeLine />);
    expect(propertyValues(container.querySelector('svg')!, 'flex-shrink')).toContain('0');
  });
});

describe('admitted canonical components', () => {
  it.each([
    [0, '0', 'items'],
    [1, '1', 'item'],
    [101, '99+', 'items'],
  ] as const)('keeps canonical collapse chip display cap and full accessible count for %s children', (count, display, noun) => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(<ui.CollapseChip ref={ref} collapsed count={count} onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: `Show ${count} ${noun}` });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveTextContent(display);
    expect(button).toHaveClass('nodrag');
    expect(propertyValues(button, 'height')).toContain('24px');
    expect(container.querySelector('[data-icon-name="ChevronRightRegular"]')).not.toBeNull();
    expect(ui.nodeMetrics.collapseChip).toEqual({ height: 24, maxVisibleCount: 99 });
  });

  it('keeps collapse chip toggles controlled and localized without selecting the canvas or replacing an empty resolved label', async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();
    const canvas = vi.fn();
    const context = vi.fn();
    const strings = {
      nounSingular: 'action',
      nounPlural: 'actions',
      show: (count: number, noun: string) => `Afficher ${count} ${noun}`,
      hide: (count: number, noun: string) => `Masquer ${count} ${noun}`,
    };
    const { container, rerender } = render(
      <div onClick={canvas}>
        <ui.CollapseChip collapsed count={2} onToggle={toggle} strings={strings} onContextMenu={context} />
      </div>
    );
    const button = screen.getByRole('button', { name: 'Afficher 2 actions' });
    await user.tab();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveBeenCalledExactlyOnceWith(false);
    expect(canvas).not.toHaveBeenCalled();
    fireEvent.contextMenu(button);
    expect(context).toHaveBeenCalledOnce();
    rerender(<ui.CollapseChip collapsed={false} count={2} onToggle={toggle} strings={strings} />);
    expect(screen.getByRole('button', { name: 'Masquer 2 actions' })).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('[data-icon-name="ChevronDownRegular"]')).not.toBeNull();
    expect(screen.getByRole('button')).not.toHaveTextContent('2');
    rerender(<ui.CollapseChip collapsed count={2} onToggle={toggle} aria-label="" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '');
  });

  it('renders the standalone terminal add button without duplicating routed dots/lines and preserves native activation/ref/disabled', async () => {
    const user = userEvent.setup();
    const activate = vi.fn();
    const canvas = vi.fn();
    const contextMenu = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    const { container, rerender } = render(
      <div onClick={canvas}>
        <ui.NodeAddButton ref={ref} label="Ajouter" onClick={activate} onContextMenu={contextMenu} tabIndex={0} />
      </div>
    );
    const button = screen.getByRole('button', { name: 'Ajouter' });
    expect(ref.current).toBe(button);
    expect(container.querySelector('[data-handle], [data-line]')).toBeNull();
    expect(container.querySelector('[data-icon-name="AddCircle20Regular"]')).not.toBeNull();
    expect(propertyValues(button, 'width')).toContain('20px');
    expect(propertyValues(button, 'height')).toContain('32px');
    await user.tab();
    await user.keyboard('{Enter}');
    expect(activate).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(activate).toHaveBeenCalledTimes(2);
    expect(canvas).not.toHaveBeenCalled();
    fireEvent.contextMenu(button);
    expect(contextMenu).toHaveBeenCalledOnce();
    rerender(<ui.NodeAddButton label="" />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '');
    rerender(<ui.NodeAddButton label="Add" onClick={activate} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(activate).toHaveBeenCalledTimes(2);
  });

  it('keeps the canonical edge pill focusable while hidden and activates once per native Enter/Space without selecting the canvas', async () => {
    const user = userEvent.setup();
    const activate = vi.fn();
    const canvas = vi.fn();
    const canvasKey = vi.fn();
    const hostContext = vi.fn();
    const hostKey = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <div onClick={canvas} onKeyDown={canvasKey}>
        <ui.EdgePillButton
          ref={ref}
          icon={<span>+</span>}
          tooltip="Ajouter"
          ariaLabel="Ajouter une action"
          isRevealed={false}
          onActivate={activate}
          onContextMenu={hostContext}
          onKeyDown={hostKey}
        />
      </div>
    );
    const button = screen.getByRole('button', { name: 'Ajouter une action' });
    expect(ref.current).toBe(button);
    expect(button).not.toBeDisabled();
    expect(propertyValues(button, 'opacity')).toContain('0');
    expect(propertyValues(button, 'pointer-events')).toContain('none');
    await user.tab();
    expect(button).toHaveFocus();
    expect(propertyValues(button, 'opacity')).toContain('1');
    expect(propertyValues(button, 'pointer-events')).toContain('auto');
    await user.keyboard('{Enter}');
    expect(activate).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(activate).toHaveBeenCalledTimes(2);
    expect(canvas).not.toHaveBeenCalled();
    expect(canvasKey).not.toHaveBeenCalled();
    expect(hostKey).toHaveBeenCalledTimes(2);
    fireEvent.contextMenu(button);
    expect(hostContext).toHaveBeenCalledOnce();
  });

  it('retains the canonical edge pill geometry and motion/forced-color rules while respecting disabled and explicit tab order', () => {
    const activate = vi.fn();
    const { rerender } = render(
      <div data-reduce-motion="true">
        <ui.EdgePillButton icon={<span>+</span>} tooltip="" ariaLabel="" isRevealed onActivate={activate} disabled tabIndex={-1} />
      </div>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '');
    expect(button).toHaveAttribute('tabindex', '-1');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(activate).not.toHaveBeenCalled();
    expect(propertyValues(button, 'width')).toContain('24px');
    expect(propertyValues(button, 'transition-duration')).toContain('0.01ms');
    expect(propertyValues(button, 'border-top-color', '', '(forced-colors: active)')).toContain('ButtonText');
    rerender(<ui.EdgePillButton icon={<span>+</span>} tooltip="Add" ariaLabel="Add" isRevealed />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(ui.nodeMetrics.edgeControl).toEqual({ pillSize: 24, hitTargetSize: 32, dualHitTargetWidth: 68, interactionWidth: 20 });
  });

  it('keeps loop body/done handle identity, localized subtitle, refs and mock presentation', () => {
    const ref = createRef<HTMLDivElement>();
    const { container, rerender } = render(
      <ui.LoopNodeCard
        ref={ref}
        title="Orders"
        strings={{ ...ui.defaultNodeStrings, loop: { foreach: 'Pour chaque' } }}
        inputSlot={<button type="button">Input</button>}
        outputSlots={[
          <button type="button" key="body">
            Body
          </button>,
          <button type="button" key="done">
            Done
          </button>,
        ]}
        role="group"
        aria-label="Loop"
      />
    );
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Loop' }));
    expect(screen.getByText('Pour chaque')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="node-output-handles"] [data-handle]')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Input' }).closest('[data-handle]')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByRole('button', { name: 'Body' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    rerender(
      <ui.LoopNodeCard
        title="Orders"
        subtitle=""
        selected
        status="mock"
        strings={{ ...ui.defaultNodeStrings, status: { ...ui.defaultNodeStrings.status, mock: '' } }}
      />
    );
    expect(screen.queryByText('For each')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '');
    expect(container.querySelector('[data-icon-name="ArrowRepeatAllFilled"]')).not.toBeNull();
  });

  it.each(['end', 'bottom', 'none'] as const)('preserves %s loop topology and never requires a body-toggle component', (bodyPlacement) => {
    const { container, rerender } = render(
      <ui.LoopNodeCard title="Loop" bodyPlacement={bodyPlacement} bodySlot={<button type="button">Body port</button>} />
    );
    expect(container.querySelectorAll('[data-testid="node-output-handles"] [data-handle]')).toHaveLength(bodyPlacement === 'end' ? 2 : 1);
    expect(screen.queryByRole('button', { name: 'Body port' }) !== null).toBe(bodyPlacement === 'bottom');
    rerender(<ui.LoopNodeCard title="Loop" bodyPlacement={bodyPlacement} bodyToggle={<button type="button">Host toggle</button>} />);
    expect(screen.getByRole('button', { name: 'Host toggle' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Body port' })).toBeNull();
  });

  it.each([
    ['scope', 'scope', 'BoxMultipleRegular'],
    ['loop', 'loop-frame', 'ArrowRepeatAllRegular'],
    ['condition', 'condition-frame', 'BranchForkRegular'],
    ['switch', 'switch-frame', 'ArrowTurnRightRegular'],
  ] as const)('preserves the %s frame header, pager, selection and localized status', (kind, data, glyph) => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ui.NodeFrame
        ref={ref}
        kind={kind}
        title="Group"
        subtitle="2 actions"
        selected
        status="running"
        statusDetail="1s"
        strings={{ status: { ...ui.defaultNodeStrings.status, running: 'En cours' } }}
        action={<button type="button">Pager</button>}
        aria-label="Frame"
        role="group"
      >
        Child
      </ui.NodeFrame>
    );
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Frame' }));
    expect(ref.current).toHaveAttribute('data-node-card', data);
    expect(ref.current).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('En cours 1s');
    expect(screen.getByRole('button', { name: 'Pager' })).toBeInTheDocument();
    expect(screen.getByText('· 2 actions')).toBeInTheDocument();
    expect(container.querySelector(`[data-icon-name="${glyph}"]`)).not.toBeNull();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it.each(['horizontal', 'vertical'] as const)('aligns real frame handles only on the %s axis', (handleAxis) => {
    const { container } = render(
      <ui.NodeFrame
        kind="loop"
        handleAxis={handleAxis}
        handleTop={89}
        handleLeft={140}
        inputSlot={<button type="button">Input</button>}
        outputSlot={<button type="button">Output</button>}
      >
        Body
      </ui.NodeFrame>
    );
    const handles = container.querySelectorAll<HTMLElement>('[data-node-card="loop-frame"] > [data-handle]');
    expect(handles).toHaveLength(2);
    expect(handles[0]).not.toHaveAttribute('aria-hidden');
    expect(handles[0].style.top).toBe(handleAxis === 'horizontal' ? '89px' : '');
    expect(handles[1].style.left).toBe(handleAxis === 'vertical' ? '140px' : '');
    expect(container.querySelector('[data-icon-name]')).toBeNull();
  });

  it('retains a headerless body, optional decorative frame handles, and the canonical mock badge palette', () => {
    const { container } = render(
      <ui.DesignerUiScope mode="dark" data-testid="scope">
        <ui.NodeFrame kind="scope" title="" subtitle="" handles status="mock">
          Body
        </ui.NodeFrame>
      </ui.DesignerUiScope>
    );
    expect(container.querySelectorAll('[data-node-card="scope"] > [data-handle]')).toHaveLength(2);
    expect(propertyValues(screen.getByRole('status'), 'background-color')).toContain(ui.designerUiTokens.agentNativeBadgeBackground);
    expect(screen.getByTestId('scope').style.getPropertyValue('--designer-ui-v2-agent-native-badge-background')).toBe('#1B2E52');
  });

  it('localizes merge-point names including an intentional empty translation and preserves real ports/ref', () => {
    const ref = createRef<HTMLSpanElement>();
    const { rerender } = render(
      <ui.NodeMergePoint ref={ref} label="Stock" inactive strings={{ label: (name) => `Convergence ${name}` }}>
        <span data-testid="port" />
      </ui.NodeMergePoint>
    );
    expect(ref.current).toBe(screen.getByRole('img', { name: 'Convergence Stock' }));
    expect(ref.current).toContainElement(screen.getByTestId('port'));
    expect(propertyValues(ref.current!, 'opacity')).toContain('0.4');
    rerender(<ui.NodeMergePoint label="Stock" strings={{ label: () => '' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '');
  });

  it('preserves the placeholder prompt, forced-color border and selection outline swap with host activation', () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    const { container, rerender } = render(<ui.PlaceholderTriggerCard ref={ref} role="button" tabIndex={0} onClick={onClick} />);
    expect(ref.current).toBe(screen.getByRole('button', { name: ui.PLACEHOLDER_TRIGGER_TITLE }));
    expect(container.querySelectorAll('[data-testid="node-output-handles"] [data-handle]')).toHaveLength(1);
    expect(container.querySelector('[data-placeholder-outline]')).toHaveAttribute('focusable', 'false');
    const card = ref.current!.firstElementChild!;
    expect(propertyValues(card, ui.nodeCardVars.background)).toContain(tokens.colorNeutralBackground2);
    expect(propertyValues(card, 'border-top-color')).toContain('transparent');
    expect(propertyValues(card, 'border-top-color', '', '(forced-colors: active)')).toContain('CanvasText');
    fireEvent.click(ref.current!);
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<ui.PlaceholderTriggerCard selected strings={{ title: 'Ajouter un déclencheur' }} />);
    expect(screen.getByText('Ajouter un déclencheur')).toBeInTheDocument();
    expect(container.querySelector('[data-placeholder-outline]')).toBeNull();
    expect(container.querySelector('[data-icon-name="FlashFilled"]')).not.toBeNull();
    rerender(<ui.PlaceholderTriggerCard title="" />);
    expect(screen.queryByText(ui.PLACEHOLDER_TRIGGER_TITLE)).toBeNull();
    expect(container.querySelector('[data-placeholder-outline]')).not.toBeNull();
  });

  it('measures placeholder geometry in its owner document without canvas zoom and disconnects its observer', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const owner = iframe.contentDocument!;
    const view = owner.defaultView!;
    const target = owner.createElement('div');
    owner.body.append(target);
    const observer = { observe: vi.fn(), disconnect: vi.fn() };
    let resize: () => void = () => {};
    Object.defineProperty(view, 'ResizeObserver', {
      configurable: true,
      value: class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = observer.observe;
        disconnect = observer.disconnect;
      },
    });
    const computed = vi
      .spyOn(view, 'getComputedStyle')
      .mockReturnValue({ borderTopLeftRadius: '37px', borderTopRightRadius: '12px' } as CSSStyleDeclaration);
    vi.spyOn(view.HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(232);
    vi.spyOn(view.HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(74);
    const { unmount } = render(<ui.PlaceholderTriggerCard />, { container: target });
    const path = target.querySelector('[data-placeholder-outline] path')!;
    expect(computed).toHaveBeenCalled();
    expect(path).toHaveAttribute('stroke-dasharray', '5 5');
    expect(path.getAttribute('d')).toContain('H 219.5');
    expect(path.getAttribute('d')).not.toContain('NaN');
    expect(observer.observe).toHaveBeenCalledWith(target.querySelector('[data-placeholder-outline]')!.parentElement);
    act(() => resize());
    expect(target.querySelector('[data-placeholder-outline] path')).toBe(path);
    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    iframe.remove();
  });
});
