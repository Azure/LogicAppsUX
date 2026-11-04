import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActionNodeCard,
  AgentNodeCard,
  AgentToolsPanel,
  ConditionNodeCard,
  DesignerUiScope,
  NodeHoverCard,
  NodeInfoCard,
  NodeStatusBadge,
  NodeActionAdd,
  NodeLabeledHandle,
  NodeLine,
  NodeToolConnector,
  TriggerNodeCard,
  ToolItemCard,
  defaultNodeStrings,
} from '../..';
import { nodeMetrics } from '../../metrics';

afterEach(() => vi.useRealTimers());

const parseCssColor = (value: string): [number, number, number] => {
  const color = value.trim().toLowerCase();
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
  }

  throw new Error(`Unsupported color format: ${value}`);
};

const relativeLuminance = ([red, green, blue]: [number, number, number]): number => {
  const normalize = (channel: number) => {
    const linear = channel / 255;
    return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
  };

  const r = normalize(red);
  const g = normalize(green);
  const b = normalize(blue);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(parseCssColor(foreground));
  const backgroundLuminance = relativeLuminance(parseCssColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const getBoundColorSemanticToken = (element: HTMLElement): string => {
  const classNames = element.className.split(/\s+/).filter(Boolean);
  const hasMatchingClass = (selectorText: string) =>
    classNames.some(
      (className) =>
        selectorText === `.${className}` || selectorText.startsWith(`.${className}:`) || selectorText.includes(`.${className}.`)
    );
  const findInRules = (rules: CSSRuleList): string | undefined => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const selectors = rule.selectorText.split(',').map((selector) => selector.trim());
        if (!selectors.some(hasMatchingClass)) {
          continue;
        }

        const colorValue = rule.style.color?.trim();
        if (!colorValue) {
          continue;
        }

        const semanticTokenMatch = colorValue.match(/^var\((--[A-Za-z0-9-]+)\)$/);
        if (semanticTokenMatch?.[1]) {
          return semanticTokenMatch[1];
        }
      } else if (rule instanceof CSSMediaRule) {
        const nested = findInRules(rule.cssRules);
        if (nested) {
          return nested;
        }
      }
    }

    return undefined;
  };

  for (const styleSheet of Array.from(document.styleSheets)) {
    const token = findInRules(styleSheet.cssRules);
    if (token) {
      return token;
    }
  }

  throw new Error('Unable to resolve bound subtitle color semantic token from CSS rules');
};

const resolveThemeColor = (theme: Record<string, string>, semanticToken: string): string => {
  const themeToken = semanticToken.replace('--', '');
  const resolved = theme[themeToken];
  if (!resolved) {
    throw new Error(`Unable to resolve theme token: ${themeToken}`);
  }

  return resolved;
};

describe('shared node presentation', () => {
  it('keeps children and focus mounted when the scope activates and deactivates', () => {
    const tree = (enabled: boolean) => (
      <DesignerUiScope enabled={enabled}>
        <input aria-label="Scope draft" defaultValue="draft" />
      </DesignerUiScope>
    );
    const { rerender, container } = render(tree(false));
    const input = screen.getByRole('textbox');
    input.focus();
    expect(input.closest('[data-designer-ui-v2]')).toBeNull();
    expect(container.firstElementChild).not.toHaveAttribute('style', expect.stringContaining('--designer-ui-v2'));
    rerender(tree(true));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveFocus();
    expect(input.closest('[data-designer-ui-v2]')).not.toBeNull();
    rerender(tree(false));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('draft');
    expect(input).toHaveFocus();
    expect(input.closest('[data-designer-ui-v2]')).toBeNull();
  });

  it('uses the selected condition glyph without dropping the branch label', () => {
    const { container } = render(<ConditionNodeCard title="Selected condition" kind="if" selected />);
    expect(screen.getByText('Selected condition')).toBeInTheDocument();
    expect(container.querySelector('[data-icon-name="BranchForkFilled"]')).toBeInTheDocument();
  });
  it('forwards canvas ref, keyboard, ARIA and host badges without rewriting literal titles', () => {
    const ref = createRef<HTMLDivElement>();
    const onKeyDown = vi.fn();
    render(
      <ActionNodeCard
        ref={ref}
        title="HTTP_a-b"
        role="button"
        tabIndex={4}
        aria-label="Localized"
        onKeyDown={onKeyDown}
        after={<span>Host badge</span>}
      />
    );
    expect(ref.current).toBe(screen.getByRole('button'));
    expect(ref.current).toHaveAttribute('tabindex', '4');
    expect(ref.current).toHaveAccessibleName('Localized');
    expect(screen.getByText('HTTP_a-b')).toBeInTheDocument();
    expect(screen.getByText('Host badge')).toBeInTheDocument();
    fireEvent.keyDown(ref.current!, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it('keeps the live-region element mounted across running to succeeded', () => {
    const { rerender } = render(<NodeStatusBadge status="running" />);
    const status = screen.getByRole('status');
    rerender(<NodeStatusBadge status="succeeded" strings={{ ...defaultNodeStrings.status, succeeded: 'Réussi' }} />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Réussi');
  });

  it('preserves intentionally empty translated strings and uses the beaker instead of a duplicate mock status pill', () => {
    render(<ActionNodeCard title="Mock" status="mock" strings={{ status: { ...defaultNodeStrings.status, mock: '' } }} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '');
  });

  it('keeps existing card dimensions unchanged when admitting canonical structural metrics', () => {
    expect(nodeMetrics.cards.action).toEqual({ width: 232, height: 74 });
    expect(nodeMetrics.cards.condition).toEqual({ width: 160, height: 74 });
    expect(nodeMetrics.cards.switch).toEqual({ width: 160, height: 103 });
    expect(nodeMetrics.cards.loop).toEqual({ width: 160, height: 74 });
    expect(nodeMetrics.frame).toEqual({ minWidth: 232, minBodyHeight: 106 });
    expect(nodeMetrics.mergePoint).toEqual({ size: 16, dot: 6 });
  });

  it('keeps controlled tools expansion and add actions from selecting the canvas', () => {
    const parent = vi.fn();
    const onToggleTools = vi.fn();
    const onAddTool = vi.fn();
    const { rerender } = render(
      <div onClick={parent}>
        <AgentNodeCard
          title="Agent"
          tools={<ToolItemCard title="Tool" size="small" />}
          toolsExpanded={false}
          onToggleTools={onToggleTools}
          onAddTool={onAddTool}
        />
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand tools' }));
    expect(onToggleTools).toHaveBeenCalledOnce();
    expect(screen.queryByText('Tool')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add tools' }));
    expect(onAddTool).toHaveBeenCalledOnce();
    expect(parent).not.toHaveBeenCalled();
    rerender(<AgentNodeCard title="Agent" tools={<ToolItemCard title="Tool" size="small" />} toolsExpanded />);
    expect(screen.getByText('Tool')).toBeInTheDocument();
  });

  it('places a supplied tools panel before the vertical output without an empty-agent add button or copied tool rows', () => {
    const ref = createRef<HTMLDivElement>();
    const add = vi.fn();
    const toggle = vi.fn();
    const canvas = vi.fn();
    const { container } = render(
      <div onClick={canvas}>
        <AgentNodeCard
          ref={ref}
          title="Agent"
          handleAxis="vertical"
          onAddTool={add}
          toolsPanelSlot={
            <AgentToolsPanel aria-owns="real-tool" onAddTool={add} onToggleExpanded={toggle}>
              <input aria-label="Panel draft" defaultValue="preserved" />
            </AgentToolsPanel>
          }
          outputSlot={<button type="button">Real source</button>}
          after={<span>Host bottom reserve</span>}
        />
        <div id="real-tool">External tool</div>
      </div>
    );
    const panel = screen.getByTestId('agent-tools-panel');
    const connector = screen.getByTestId('node-tool-connector');
    const output = screen.getByTestId('node-output-handles');
    expect(ref.current).toContainElement(panel);
    expect(panel).toHaveAttribute('aria-owns', 'real-tool');
    expect(panel).not.toContainElement(screen.getByText('External tool'));
    expect(connector.querySelector('button')).toBeNull();
    expect(connector.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(panel.compareDocumentPosition(output) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(output).toContainElement(screen.getByRole('button', { name: 'Real source' }));
    expect(output.nextElementSibling).toBe(screen.getByText('Host bottom reserve'));
    expect(container.querySelectorAll('[data-testid="node-output-handles"]')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Add tools' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse tools' }));
    expect(add).toHaveBeenCalledOnce();
    expect(toggle).toHaveBeenCalledOnce();
    expect(canvas).not.toHaveBeenCalled();
  });

  it('replaces rather than duplicates the built-in tools panel and retains supplied panel state across card updates', () => {
    const panel = (
      <AgentToolsPanel>
        <input aria-label="Panel draft" defaultValue="preserved" />
      </AgentToolsPanel>
    );
    const { rerender } = render(<AgentNodeCard title="Agent" tools={<ToolItemCard title="Not copied" />} toolsPanelSlot={panel} />);
    const draft = screen.getByRole('textbox', { name: 'Panel draft' });
    draft.focus();
    fireEvent.change(draft, { target: { value: 'edited' } });
    expect(screen.queryByText('Not copied')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('agent-tools-panel')).toHaveLength(1);
    rerender(<AgentNodeCard title="Renamed" selected tools={<ToolItemCard title="Not copied" />} toolsPanelSlot={panel} />);
    expect(screen.getByRole('textbox', { name: 'Panel draft' })).toBe(draft);
    expect(draft).toHaveValue('edited');
    expect(draft).toHaveFocus();
  });

  it.each([undefined, null, false])('keeps built-in tools composition for an absent panel slot (%s)', (toolsPanelSlot) => {
    render(
      <AgentNodeCard title="Agent" tools={<ToolItemCard title="Built-in row" />} toolsPanelSlot={toolsPanelSlot} handleAxis="vertical" />
    );
    const panel = screen.getByTestId('agent-tools-panel');
    expect(panel).toContainElement(screen.getByText('Built-in row'));
    expect(panel.compareDocumentPosition(screen.getByTestId('node-output-handles')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sanitizes nonfinite switch counts and leaves interactive host handle slots accessible', () => {
    const { container } = render(
      <ConditionNodeCard
        title="Switch"
        kind="switch"
        caseCount={Number.NaN}
        handleAxis="vertical"
        inputSlot={<button type="button">Connect</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Connect' }).closest('[data-handle]')).not.toHaveAttribute('aria-hidden');
    expect(container.querySelectorAll('[data-testid="node-output-handles"] [data-handle]')).toHaveLength(1);
  });

  it('keeps differently themed scopes isolated and inherits the host font', () => {
    render(
      <>
        <DesignerUiScope mode="light" data-testid="light">
          <ActionNodeCard title="Light" />
        </DesignerUiScope>
        <DesignerUiScope mode="dark" data-testid="dark">
          <ActionNodeCard title="Dark" />
        </DesignerUiScope>
      </>
    );
    expect(screen.getByTestId('light').style.getPropertyValue('--designer-ui-v2-node-surface')).not.toBe(
      screen.getByTestId('dark').style.getPropertyValue('--designer-ui-v2-node-surface')
    );
    expect(document.documentElement.style.getPropertyValue('--designer-ui-v2-node-surface')).toBe('');
    expect(screen.getByTestId('light').style.fontFamily).toBe('');
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', '/relative'])('rejects unsafe documentation href %s', (href) => {
    render(<NodeInfoCard category="action" icon={null} title="Info" learnMoreHref={href} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps a safe documentation link, descriptions and host info-card actions', () => {
    render(
      <NodeInfoCard
        category="action"
        icon={null}
        title="Info"
        learnMoreHref="https://example.com/doc"
        description="Description"
        configured
        actions={<button type="button">Edit</button>}
      />
    );
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('opens on focus in the scoped outlet without stealing focus and closes with Escape', async () => {
    vi.useFakeTimers();
    render(
      <FluentProvider theme={webLightTheme}>
        <DesignerUiScope mode="dark" data-testid="scope">
          <NodeHoverCard card={<NodeInfoCard category="action" icon={null} title="Details" />}>
            <ActionNodeCard title="Focus me" role="button" tabIndex={0} aria-describedby="existing" />
          </NodeHoverCard>
        </DesignerUiScope>
      </FluentProvider>
    );
    const button = screen.getByRole('button', { name: 'Focus me' });
    act(() => button.focus());
    act(() => vi.advanceTimersByTime(400));
    expect(button).toHaveFocus();
    expect(button.getAttribute('aria-describedby')).toContain('existing');
    expect(screen.getByTestId('scope')).toContainElement(screen.getByText('Details'));
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-describedby', 'existing');
  });

  it('respects OS and host reduced-motion settings for running status and transitions', () => {
    render(<ActionNodeCard title="Running" status="running" />);
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => rule.cssText)
      .join('\n');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('data-reduce-motion="true"');
    expect(css).toMatch(/animation-name:\s*none/);
  });

  it('retains tool row identity across reordering keyed children', () => {
    const { rerender } = render(
      <AgentNodeCard title="Agent" tools={[<ToolItemCard key="one" title="One" />, <ToolItemCard key="two" title="Two" />]} />
    );
    const one = screen.getByText('One');
    rerender(<AgentNodeCard title="Agent" tools={[<ToolItemCard key="two" title="Two" />, <ToolItemCard key="one" title="One" />]} />);
    expect(screen.getByText('One')).toBe(one);
  });

  it.each([
    ['light', webLightTheme],
    ['dark', webDarkTheme],
  ] as const)('keeps the Agent subtitle caption at WCAG AA contrast in %s stock surfaces', (mode, theme) => {
    const { container } = render(
      <FluentProvider theme={theme}>
        <DesignerUiScope mode={mode}>
          <AgentNodeCard title="Triage assistant" subtitle="Agent" />
        </DesignerUiScope>
      </FluentProvider>
    );

    const subtitle = screen.getByText('Agent');
    const scope = container.querySelector('[data-designer-ui-v2]');
    expect(scope).not.toBeNull();

    const subtitleSemanticToken = getBoundColorSemanticToken(subtitle);
    expect(subtitleSemanticToken).toBe('--colorNeutralForeground2');
    const subtitleColor = resolveThemeColor(theme as Record<string, string>, subtitleSemanticToken);

    const backgroundColor = (scope as HTMLElement).style.getPropertyValue('--designer-ui-v2-node-agent-surface').trim();
    expect(backgroundColor).toBeTruthy();
    expect(contrastRatio(subtitleColor, backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });

  it('cleans external focus descriptions and cancels pending hover when disabled', () => {
    vi.useFakeTimers();
    const external = document.createElement('button');
    external.setAttribute('aria-describedby', 'host-description');
    document.body.append(external);
    const { rerender, unmount } = render(
      <DesignerUiScope>
        <NodeHoverCard externalFocusTarget={external} card="External details">
          <ActionNodeCard title="Card" />
        </NodeHoverCard>
      </DesignerUiScope>
    );
    fireEvent.focusIn(external);
    act(() => vi.advanceTimersByTime(400));
    expect(external.getAttribute('aria-describedby')).toContain('host-description');
    expect(screen.getByText('External details')).toBeInTheDocument();
    rerender(
      <DesignerUiScope>
        <NodeHoverCard externalFocusTarget={external} card="External details" disabled>
          <ActionNodeCard title="Card" />
        </NodeHoverCard>
      </DesignerUiScope>
    );
    expect(external).toHaveAttribute('aria-describedby', 'host-description');
    expect(screen.queryByText('External details')).toBeNull();
    unmount();
    external.remove();
  });

  it('mounts a hover portal in its iframe scope rather than the global document', async () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const owner = iframe.contentDocument!;
    const container = owner.createElement('div');
    owner.body.append(container);
    const result = render(
      <DesignerUiScope data-testid="iframe-scope">
        <NodeHoverCard openDelay={0} card="Iframe details">
          <ActionNodeCard title="Iframe card" role="button" tabIndex={0} />
        </NodeHoverCard>
      </DesignerUiScope>,
      { container }
    );
    fireEvent.focus(within(container).getByRole('button'));
    const details = await within(container).findByText('Iframe details');
    expect(details.ownerDocument).toBe(owner);
    expect(within(container).getByTestId('iframe-scope')).toContainElement(details);
    expect(screen.queryByText('Iframe details')).toBeNull();
    result.unmount();
    iframe.remove();
  });

  it('forwards trigger refs and suppresses only decorative handles when the host supplies real handles', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(<TriggerNodeCard ref={ref} title="Request" role="button" status="mock" />);
    expect(ref.current).toBe(screen.getByRole('button'));
    expect(ref.current).toHaveAttribute('data-node-card', 'trigger');
    expect(ref.current?.querySelector('[data-handle]')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Using test data' })).toBeInTheDocument();
    rerender(<TriggerNodeCard ref={ref} title="Request" role="button" handles={false} selected status="succeeded" />);
    expect(ref.current?.querySelector('[data-handle]')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Succeeded');
  });

  it('retains the disabled insertion affordance without a callback and respects canvas propagation', () => {
    const onClick = vi.fn();
    const canvas = vi.fn();
    const ref = createRef<HTMLSpanElement>();
    const { rerender } = render(<NodeActionAdd ref={ref} data-testid="add" />);
    expect(ref.current).toBe(screen.getByTestId('add'));
    expect(screen.getByRole('button', { name: 'Add action' })).toBeDisabled();
    rerender(
      <div onClick={canvas}>
        <NodeActionAdd onClick={onClick} label="Ajouter" disabled />
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onClick).not.toHaveBeenCalled();
    canvas.mockClear();
    rerender(
      <div onClick={canvas}>
        <NodeActionAdd onClick={onClick} label="Ajouter" />
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(canvas).not.toHaveBeenCalled();
  });

  it('keeps the empty tool-connector add action out of canvas click and drag handlers', () => {
    const onAddTool = vi.fn();
    const canvasClick = vi.fn();
    const canvasDrag = vi.fn();
    const { rerender } = render(
      <div onClick={canvasClick} onMouseDown={canvasDrag}>
        <NodeToolConnector onAddTool={onAddTool} label="Outils" addToolLabel="Ajouter un outil" />
      </div>
    );
    const button = screen.getByRole('button', { name: 'Ajouter un outil' });
    fireEvent.mouseDown(button);
    fireEvent.click(button);
    expect(onAddTool).toHaveBeenCalledOnce();
    expect(canvasClick).not.toHaveBeenCalled();
    expect(canvasDrag).not.toHaveBeenCalled();
    rerender(<NodeToolConnector hasTools onAddTool={onAddTool} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('preserves branch-label overrides and exact vertical connector geometry with forwarded refs', () => {
    const ref = createRef<SVGSVGElement>();
    render(
      <>
        <ConditionNodeCard title="Condition" kind="if" />
        <NodeLabeledHandle branch="true" label="" />
        <NodeLabeledHandle branch="false" label="Non" />
        <NodeLine ref={ref} orientation="vertical" length={37} />
      </>
    );
    expect(screen.getByText('Non')).toBeInTheDocument();
    expect(document.querySelector('[data-branch="true"]')).toHaveTextContent('');
    expect(ref.current).toHaveAttribute('viewBox', '0 0 20 37');
    expect(ref.current?.querySelector('path')).toHaveAttribute('d', 'M10 0 V37');
    expect(ref.current).toHaveAttribute('aria-hidden', 'true');
  });

  it('cancels a pending hover and cancels delayed close when the pointer returns', () => {
    vi.useFakeTimers();
    render(
      <DesignerUiScope>
        <NodeHoverCard openDelay={100} closeDelay={100} card="Hover details" data-testid="hover-trigger">
          <ActionNodeCard title="Hover target" />
        </NodeHoverCard>
      </DesignerUiScope>
    );
    const trigger = screen.getByTestId('hover-trigger');
    fireEvent.mouseEnter(trigger);
    act(() => vi.advanceTimersByTime(50));
    fireEvent.mouseLeave(trigger);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByText('Hover details')).toBeNull();
    fireEvent.mouseEnter(trigger);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText('Hover details')).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    act(() => vi.advanceTimersByTime(50));
    fireEvent.mouseEnter(trigger);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText('Hover details')).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByText('Hover details')).toBeNull();
  });
});
