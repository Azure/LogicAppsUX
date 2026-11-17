import { createRef, useContext } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mergeClasses, tokens } from '@fluentui/react-components';
import { describe, expect, it, vi } from 'vitest';
import * as ui from '../..';
import type { NodeLineVariant } from '../..';

function declarations(element: Element, pseudo = '', media = ''): CSSStyleDeclaration[] {
  const result: CSSStyleDeclaration[] = [];
  const visit = (rules: CSSRuleList, condition = '') => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules, rule.conditionText);
      } else if (rule instanceof CSSStyleRule && condition === media) {
        if (
          rule.selectorText.includes(':hover') !== (pseudo === ':hover') ||
          rule.selectorText.includes(':active') !== (pseudo === ':active')
        ) {
          continue;
        }
        if (element.matches(rule.selectorText.replaceAll(':hover', '').replaceAll(':active', '').replaceAll(':focus-visible', ':focus'))) {
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

function expectProperties(element: Element, properties: Record<string, string>) {
  for (const [property, value] of Object.entries(properties)) {
    expect(propertyValues(element, property), property).toEqual([value]);
  }
}

const axes = ['horizontal', 'vertical'] as const;

function NodeLineStyleProbe({ variant }: { variant: NodeLineVariant }) {
  const line = ui.useNodeLineStyles();
  return (
    <svg aria-hidden="true">
      <path data-testid={`line-style-${variant}`} className={mergeClasses(line.base, line[variant])} />
    </svg>
  );
}

describe('NodeBranchOutputs', () => {
  it.each(axes)('preserves exact tick → literal caption → host children order on the %s axis', (axis) => {
    const ref = createRef<HTMLSpanElement>();
    const portRef = createRef<HTMLButtonElement>();
    const activate = vi.fn();
    const keyDown = vi.fn();
    const contextMenu = vi.fn();
    render(
      <ui.NodeHandleAxisContext.Provider value={axis}>
        <ui.NodeBranchOutputs
          ref={ref}
          branches={['false', 'true']}
          labels={['', 'Host_True — literal']}
          slots={[
            <button type="button" key="false-slot" ref={portRef} onClick={activate}>
              False port
            </button>,
            <span key="true-slot" data-testid="true-port">
              True port
            </span>,
          ]}
          role="group"
          aria-label="Branch outputs"
          id="host-outputs"
          className="host-outputs"
          tabIndex={3}
          onKeyDown={keyDown}
          onContextMenu={contextMenu}
        />
      </ui.NodeHandleAxisContext.Provider>
    );
    const root = screen.getByRole('group', { name: 'Branch outputs' });
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe('SPAN');
    expect(root).toHaveAttribute('data-axis', axis);
    expect(root).toHaveAttribute('id', 'host-outputs');
    expect(root).toHaveClass('host-outputs');
    expect(root).toHaveAttribute('tabindex', '3');
    const outputs = root.querySelectorAll<HTMLElement>('[data-branch]');
    expect(Array.from(root.childNodes)).toEqual(Array.from(outputs));
    expect(Array.from(outputs, (output) => output.getAttribute('data-branch'))).toEqual(['false', 'true']);
    outputs.forEach((output, index) => {
      const parts = output.querySelectorAll<HTMLElement>(':scope > span');
      expect(parts).toHaveLength(3);
      expect(Array.from(output.childNodes)).toEqual(Array.from(parts));
      expect(parts[0]).toHaveAttribute('aria-hidden', 'true');
      expect(parts[0].childNodes).toHaveLength(0);
      expect(parts[1].textContent).toBe(index === 0 ? '' : 'Host_True — literal');
      expect(parts[2].childNodes).toHaveLength(1);
      expect(parts[2].firstChild).toBe(index === 0 ? portRef.current : screen.getByTestId('true-port'));
    });
    expect(root.querySelector('[data-handle], [data-line], svg')).toBeNull();
    expect(screen.getAllByRole('button')).toEqual([portRef.current]);
    fireEvent.click(screen.getByRole('button', { name: 'False port' }));
    fireEvent.keyDown(root, { key: 'Enter' });
    fireEvent.contextMenu(root);
    expect(activate).toHaveBeenCalledOnce();
    expect(keyDown).toHaveBeenCalledOnce();
    expect(contextMenu).toHaveBeenCalledOnce();
  });

  it.each([{ branches: ['true', 'false'] }, { branches: ['false', 'true'] }] as const)(
    'uses default labels in host order $branches and never fabricates missing slot children',
    ({ branches }) => {
      const { rerender } = render(<ui.NodeBranchOutputs branches={branches} data-testid="branch-outputs" />);
      const root = screen.getByTestId('branch-outputs');
      expect(root).toHaveAttribute('data-axis', 'horizontal');
      const outputs = root.querySelectorAll<HTMLElement>('[data-branch]');
      expect(Array.from(outputs, (output) => output.getAttribute('data-branch'))).toEqual(branches);
      outputs.forEach((output, index) => {
        expect(output.children[1].textContent).toBe(ui.defaultNodeStrings.branch[branches[index]]);
        expect(output.children[2].childNodes).toHaveLength(0);
      });
      expect(root.querySelector('[data-handle], [data-line], button, [role], svg')).toBeNull();
      rerender(<ui.NodeBranchOutputs branches={branches} labels={['']} data-testid="branch-outputs" />);
      expect(root.children[0].children[1].textContent).toBe('');
      expect(root.children[1].children[1].textContent).toBe(ui.defaultNodeStrings.branch[branches[1]]);
    }
  );

  it.each(axes.flatMap((axis) => [0, 1, undefined].map((activeIndex) => ({ axis, activeIndex }))))(
    'dims only the nonmatching index on $axis with activeIndex=$activeIndex',
    ({ axis, activeIndex }) => {
      const tree = (index?: number) => (
        <ui.NodeHandleAxisContext.Provider value={axis}>
          <ui.NodeBranchOutputs branches={['false', 'true']} activeIndex={index} data-testid="branch-outputs" />
        </ui.NodeHandleAxisContext.Provider>
      );
      const { rerender } = render(tree(activeIndex));
      const root = screen.getByTestId('branch-outputs');
      expect(root).toHaveAttribute('data-axis', axis);
      const outputs = root.querySelectorAll<HTMLElement>('[data-branch]');
      expect(outputs).toHaveLength(2);
      outputs.forEach((output, index) => {
        const inactive = activeIndex !== undefined && index !== activeIndex;
        expect(output.getAttribute('data-inactive')).toBe(inactive ? 'true' : null);
        expect(propertyValues(output, 'opacity')).toEqual(inactive ? ['0.4'] : []);
      });
      rerender(tree());
      outputs.forEach((output) => {
        expect(output).not.toHaveAttribute('data-inactive');
        expect(propertyValues(output, 'opacity')).toEqual([]);
      });
    }
  );

  it('does not render outputs for an empty branch list', () => {
    render(<ui.NodeBranchOutputs branches={[]} data-testid="branch-outputs" />);
    expect(screen.getByTestId('branch-outputs').childNodes).toHaveLength(0);
  });

  it('uses axis context to switch canonical root, output, tick and slot CSS rules', () => {
    const { rerender } = render(<ui.NodeBranchOutputs branches={['true']} slots={[<span key="slot" />]} data-testid="branch-outputs" />);
    const horizontalRoot = screen.getByTestId('branch-outputs');
    const horizontalOutput = horizontalRoot.querySelector<HTMLElement>('[data-branch="true"]')!;
    const horizontalTick = horizontalOutput.querySelector<HTMLElement>('[aria-hidden="true"]')!;
    const horizontalSlot = horizontalOutput.querySelector<HTMLElement>(':scope > span:last-child')!;
    expect(propertyValues(horizontalRoot, 'left')).toContain(`calc(100% + ${tokens.strokeWidthThin} + ${tokens.spacingHorizontalXXS})`);
    expect(propertyValues(horizontalRoot, 'top')).toContain('50%');
    expect(propertyValues(horizontalRoot, 'transform')).toContain('translateY(-50%)');
    expect(propertyValues(horizontalRoot, 'flex-direction')).toContain('column');
    expect(propertyValues(horizontalRoot, 'gap')).toContain(tokens.spacingVerticalS);
    // inline-flex uses its initial row direction; only the vertical variant overrides it.
    expect(propertyValues(horizontalOutput, 'flex-direction')).toEqual([]);
    expect(propertyValues(horizontalOutput, 'gap')).toEqual([tokens.spacingHorizontalS]);
    expect(propertyValues(horizontalOutput, 'height')).toContain(`${ui.nodeMetrics.handle.labeledHeight}px`);
    expect(propertyValues(horizontalTick, 'width')).toContain(tokens.strokeWidthThick);
    expect(propertyValues(horizontalTick, 'height')).toContain(`${ui.nodeMetrics.handle.size}px`);
    expect(propertyValues(horizontalSlot, 'margin-inline-start')).toContain(`calc(-1 * ${tokens.spacingHorizontalXS})`);
    expect(propertyValues(horizontalSlot, 'margin-top')).toEqual([]);

    rerender(
      <ui.NodeHandleAxisContext.Provider value="vertical">
        <ui.NodeBranchOutputs branches={['true']} slots={[<span key="slot" />]} data-testid="branch-outputs" />
      </ui.NodeHandleAxisContext.Provider>
    );
    const verticalRoot = screen.getByTestId('branch-outputs');
    const verticalOutput = verticalRoot.querySelector<HTMLElement>('[data-branch="true"]')!;
    const verticalTick = verticalOutput.querySelector<HTMLElement>('[aria-hidden="true"]')!;
    const verticalSlot = verticalOutput.querySelector<HTMLElement>(':scope > span:last-child')!;
    expect(verticalRoot).toHaveAttribute('data-axis', 'vertical');
    expect(propertyValues(verticalRoot, 'top')).toContain(`calc(100% + ${tokens.strokeWidthThin} + ${tokens.spacingVerticalXXS})`);
    expect(propertyValues(verticalRoot, 'left')).toContain('50%');
    expect(propertyValues(verticalRoot, 'transform')).toContain('translateX(-50%)');
    expect(propertyValues(verticalRoot, 'flex-direction')).toContain('row');
    expect(propertyValues(verticalRoot, 'gap')).toContain(tokens.spacingHorizontalL);
    expect(propertyValues(verticalOutput, 'flex-direction')).toContain('column');
    expect(propertyValues(verticalOutput, 'height')).toContain('auto');
    expect(propertyValues(verticalOutput, 'gap')).toEqual([tokens.spacingVerticalXS]);
    expect(propertyValues(verticalTick, 'width')).toContain(`${ui.nodeMetrics.handle.size}px`);
    expect(propertyValues(verticalTick, 'height')).toContain(tokens.strokeWidthThick);
    expect(propertyValues(verticalSlot, 'margin-inline-start')).toContain('0');
    expect(propertyValues(verticalSlot, 'margin-top')).toContain(`calc(-1 * ${tokens.spacingVerticalXXS})`);
    for (const root of [horizontalRoot, verticalRoot]) {
      expectProperties(root, { position: 'absolute', display: 'flex' });
    }
    for (const output of [horizontalOutput, verticalOutput]) {
      expectProperties(output, {
        display: 'inline-flex',
        'align-items': 'center',
        'font-family': 'inherit',
        'font-size': tokens.fontSizeBase200,
        'line-height': tokens.lineHeightBase200,
        color: tokens.colorNeutralForeground3,
        'white-space': 'nowrap',
      });
    }
    for (const tick of [horizontalTick, verticalTick]) {
      expectProperties(tick, { 'flex-shrink': '0', 'border-radius': tokens.borderRadiusCircular });
    }
    for (const slot of [horizontalSlot, verticalSlot]) {
      expectProperties(slot, {
        position: 'relative',
        display: 'block',
        'flex-shrink': '0',
        width: `${ui.nodeMetrics.handle.size}px`,
        height: `${ui.nodeMetrics.handle.size}px`,
      });
    }
  });

  it('uses status border colors for branch ticks and preserves forced-colors fallback', () => {
    render(<ui.NodeBranchOutputs branches={['true', 'false']} data-testid="branch-outputs" />);
    const outputs = screen.getByTestId('branch-outputs').querySelectorAll<HTMLElement>('[data-branch]');
    const trueTick = outputs[0].querySelector<HTMLElement>('[aria-hidden="true"]')!;
    const falseTick = outputs[1].querySelector<HTMLElement>('[aria-hidden="true"]')!;
    expect(propertyValues(trueTick, 'background-color')).toContain(tokens.colorStatusSuccessBorder2);
    expect(propertyValues(falseTick, 'background-color')).toContain(tokens.colorStatusDangerBorder2);
    expect(propertyValues(trueTick, 'background-color', '', '(forced-colors: active)')).toContain('CanvasText');
    expect(propertyValues(falseTick, 'background-color', '', '(forced-colors: active)')).toContain('CanvasText');
  });
});

describe('NodeFrame branch presentation', () => {
  const tones = {
    neutral: tokens.colorNeutralStroke1,
    success: tokens.colorStatusSuccessBorder2,
    danger: tokens.colorStatusDangerBorder2,
  } as const;
  const branchCases = (['neutral', 'success', 'danger'] as const).flatMap((tone) =>
    [false, true].flatMap((collapsed) =>
      (['inline', 'below'] as const).map((subtitlePlacement) => ({ tone, collapsed, subtitlePlacement }))
    )
  );

  it.each(branchCases)(
    'keeps glyphless $tone branch anatomy with collapsed=$collapsed and $subtitlePlacement subtitle',
    ({ tone, collapsed, subtitlePlacement }) => {
      const activate = vi.fn();
      const { container } = render(
        <ui.NodeFrame
          kind="branch"
          tone={tone}
          title="False"
          subtitle="Did not run"
          subtitlePlacement={subtitlePlacement}
          collapsed={collapsed}
          action={
            <button type="button" aria-expanded={!collapsed} onClick={activate}>
              Toggle branch
            </button>
          }
        >
          <button type="button">Body action</button>
        </ui.NodeFrame>
      );
      const frame = container.querySelector<HTMLElement>('[data-node-card="branch-frame"]')!;
      const header = frame.firstElementChild!;
      const body = frame.lastElementChild!;
      const title = screen.getByText('False');
      const subtitle = screen.getByText(subtitlePlacement === 'below' ? 'Did not run' : '· Did not run');
      const action = screen.getByRole('button', { name: 'Toggle branch' });
      const bodyButton = screen.getByText('Body action');
      expect(Array.from(frame.children)).toEqual([header, body]);
      // Check real SVGs, mock icons AND the otherwise-empty decorative wrapper.
      expect(frame.querySelector('svg, [data-icon-name], [aria-hidden]')).toBeNull();
      expect(frame.querySelector('[data-handle]')).toBeNull();
      expect(frame.getAttribute('data-collapsed')).toBe(collapsed ? 'true' : null);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        expectProperties(frame, {
          [`border-${side}-color`]: tones[tone],
          [`border-${side}-style`]: 'dashed',
          [`border-${side}-width`]: tokens.strokeWidthThin,
        });
        expect(propertyValues(frame, `border-${side}-color`, '', '(forced-colors: active)')).toEqual(['CanvasText']);
      }
      expectProperties(header, {
        display: 'flex',
        'align-items': subtitlePlacement === 'below' ? 'flex-start' : 'center',
        'min-height': '24px',
        // Griffel emits paddingInline as a shorthand, not two inline longhands.
        'padding-inline': tokens.spacingHorizontalL,
        'padding-block': tokens.spacingVerticalS,
        'font-family': 'inherit',
        'font-size': tokens.fontSizeBase300,
        'line-height': tokens.lineHeightBase300,
      });
      expectProperties(title, {
        'font-weight': tokens.fontWeightRegular,
        overflow: 'hidden',
        'text-overflow': 'ellipsis',
        'white-space': 'nowrap',
      });
      if (subtitlePlacement === 'below') {
        const stack = title.parentElement!;
        expect(Array.from(header.children)).toEqual([stack, action.parentElement]);
        expect(Array.from(stack.childNodes)).toEqual([title, subtitle]);
        expectProperties(stack, { display: 'flex', 'flex-direction': 'column', 'min-width': '0' });
        expect(subtitle).toHaveAttribute('title', 'Did not run');
        expectProperties(subtitle, {
          'font-size': tokens.fontSizeBase200,
          'line-height': tokens.lineHeightBase200,
          color: tokens.colorNeutralForeground3,
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
        });
      } else {
        expect(Array.from(header.childNodes)).toEqual([title, subtitle, action.parentElement]);
        expect(subtitle.textContent).toBe('· Did not run');
        expect(subtitle).not.toHaveAttribute('title');
      }
      expectProperties(body, {
        display: collapsed ? 'none' : 'flex',
        'min-height': `${ui.nodeMetrics.frame.minBodyHeight}px`,
        'padding-inline': tokens.spacingHorizontalXXL,
        'padding-bottom': tokens.spacingVerticalL,
        gap: tokens.spacingHorizontalXXL,
      });
      expect(Array.from(body.childNodes)).toEqual([bodyButton]);
      // display:none must remove an actual interactive descendant from accessible queries.
      expect(screen.queryByRole('button', { name: 'Body action' })).toBe(collapsed ? null : bodyButton);
      expect(action).toBeVisible();
      expect(action).toHaveAttribute('aria-expanded', String(!collapsed));
      fireEvent.click(action);
      expect(activate).toHaveBeenCalledOnce();
    }
  );

  it('defaults branches to neutral/expanded/inline and keeps body state while the host controls collapse', () => {
    const tree = (props: Partial<ui.NodeFrameProps> = {}) => (
      <ui.NodeFrame kind="branch" title="Branch" subtitle="1 action" action={<button type="button">Toggle</button>} {...props}>
        <input aria-label="Draft" defaultValue="retained" />
      </ui.NodeFrame>
    );
    const { container, rerender } = render(tree());
    const defaultMarkup = container.innerHTML;
    const draft = screen.getByRole('textbox', { name: 'Draft' });
    const action = screen.getByRole('button', { name: 'Toggle' });
    rerender(tree({ tone: 'neutral', collapsed: false, subtitlePlacement: 'inline' }));
    expect(container.innerHTML).toBe(defaultMarkup);
    fireEvent.change(draft, { target: { value: 'edited' } });
    rerender(tree({ collapsed: true }));
    expect(screen.queryByRole('textbox', { name: 'Draft' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Toggle' })).toBe(action);
    rerender(tree());
    expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(draft);
    expect(draft).toHaveValue('edited');
  });

  it.each(['success', 'danger'] as const)('keeps selection and forced colors above the %s tone', (tone) => {
    const { container } = render(<ui.NodeFrame kind="branch" tone={tone} title="Selected" selected />);
    const frame = container.firstElementChild!;
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expectProperties(frame, { [`border-${side}-style`]: 'solid', [`border-${side}-color`]: ui.designerUiTokens.nodeBorderSelected });
      expect(propertyValues(frame, `border-${side}-color`, '', '(forced-colors: active)')).toEqual(['Highlight']);
    }
  });

  // adoption.spec.tsx already covers glyph identity, selected/status behavior and headerless frames.
  it.each((['scope', 'loop', 'condition', 'switch'] as const).flatMap((kind) => axes.map((handleAxis) => ({ kind, handleAxis }))))(
    'preserves omitted presentation defaults, HTML forwarding and real $handleAxis ports for $kind',
    ({ kind, handleAxis }) => {
      const ref = createRef<HTMLDivElement>();
      const click = vi.fn();
      const keyDown = vi.fn();
      const contextMenu = vi.fn();
      const tree = (overrides: Partial<ui.NodeFrameProps> = {}) => (
        <ui.NodeFrame
          ref={ref}
          kind={kind}
          handleAxis={handleAxis}
          title="Group"
          subtitle="2 actions"
          role="group"
          aria-label="Host frame"
          id="host-frame"
          className="host-frame"
          tabIndex={4}
          onClick={click}
          onKeyDown={keyDown}
          onContextMenu={contextMenu}
          {...overrides}
        >
          <button type="button">Child action</button>
        </ui.NodeFrame>
      );
      const { rerender } = render(tree());
      const frame = screen.getByRole('group', { name: 'Host frame' });
      const title = screen.getByText('Group');
      const header = title.parentElement!;
      expect(ref.current).toBe(frame);
      expect(frame).toHaveAttribute('id', 'host-frame');
      expect(frame).toHaveClass('host-frame');
      expect(frame).toHaveAttribute('tabindex', '4');
      expect(frame).not.toHaveAttribute('data-collapsed');
      expect(frame.querySelector('[data-handle]')).toBeNull();
      expect(header.firstElementChild).toHaveAttribute('aria-hidden', 'true');
      expect(header.children).toHaveLength(3);
      expect(screen.getByText('· 2 actions').parentElement).toBe(header);
      expectProperties(frame, { 'border-top-color': tokens.colorNeutralStroke1, 'border-top-style': 'dashed' });
      expectProperties(header, {
        'padding-inline': tokens.spacingHorizontalM,
        'font-size': tokens.fontSizeBase200,
        'align-items': 'center',
      });
      expect(propertyValues(header, 'min-height')).toEqual([]);
      expectProperties(title, { 'font-weight': tokens.fontWeightSemibold });
      expect(screen.getByRole('button', { name: 'Child action' })).toBeVisible();
      fireEvent.click(frame);
      fireEvent.keyDown(frame, { key: 'Enter' });
      fireEvent.contextMenu(frame);
      expect(click).toHaveBeenCalledOnce();
      expect(keyDown).toHaveBeenCalledOnce();
      expect(contextMenu).toHaveBeenCalledOnce();
      const omittedMarkup = frame.outerHTML;
      rerender(tree({ tone: 'neutral', collapsed: false, subtitlePlacement: 'inline' }));
      expect(frame.outerHTML).toBe(omittedMarkup);
      rerender(
        tree({
          handleTop: 89,
          handleLeft: 140,
          inputSlot: <button type="button">Input port</button>,
          outputSlot: <button type="button">Output port</button>,
        })
      );
      expect(ref.current).toBe(frame);
      const handles = frame.querySelectorAll<HTMLElement>(':scope > [data-handle]');
      expect(handles).toHaveLength(2);
      handles.forEach((handle, index) => {
        expect(handle).not.toHaveAttribute('aria-hidden');
        expect(handle).toHaveAttribute('data-handle', 'neutral');
        expect(handle.style.top).toBe(handleAxis === 'horizontal' ? '88px' : '');
        expect(handle.style.left).toBe(handleAxis === 'vertical' ? '139px' : '');
        expect(handle.childNodes).toHaveLength(1);
        expect(handle.firstChild).toBe(screen.getByRole('button', { name: index === 0 ? 'Input port' : 'Output port' }));
      });
    }
  );

  it('renders actionCount independently from subtitle and supports zero through frame strings', () => {
    const customStrings = { ...ui.defaultNodeStrings, frame: { actionCount: (count: number) => `Actions: ${count}` } };
    const { rerender } = render(
      <ui.NodeFrame kind="scope" title="Scope" subtitle="Details" actionCount={0} strings={customStrings}>
        Body
      </ui.NodeFrame>
    );
    expect(screen.getByText('Actions: 0')).toBeInTheDocument();
    expect(screen.getByText('· Details')).toBeInTheDocument();
    rerender(
      <ui.NodeFrame kind="scope" title="Scope" subtitle="Details" strings={customStrings}>
        Body
      </ui.NodeFrame>
    );
    expect(screen.queryByText('Actions: 0')).toBeNull();
  });

  it('hides only the input handle when showInputHandle is false', () => {
    const { container } = render(
      <ui.NodeFrame
        kind="loop"
        handles
        showInputHandle={false}
        inputSlot={<button type="button">Input slot</button>}
        outputSlot={<button type="button">Output slot</button>}
      >
        <ui.NodeMergePoint label="Merge" showCircle={false} data-testid="merge">
          <button type="button">Convergence</button>
        </ui.NodeMergePoint>
      </ui.NodeFrame>
    );
    const handles = container.querySelectorAll(':scope > [data-handle], [data-node-card="loop-frame"] > [data-handle]');
    expect(screen.queryByRole('button', { name: 'Input slot' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Output slot' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-node-card="loop-frame"] > [data-handle]')).toHaveLength(1);
    expect(screen.getByTestId('merge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convergence' })).toBeInTheDocument();
    expect(handles.length).toBeGreaterThan(0);
  });

  it('keeps loop glyph by default and removes it for plain header appearance', () => {
    const { container, rerender } = render(<ui.NodeFrame kind="loop" title="Loop" />);
    expect(container.querySelector('[data-icon-name="ArrowRepeatAllRegular"]')).not.toBeNull();
    rerender(<ui.NodeFrame kind="loop" title="Loop" headerAppearance="plain" />);
    expect(container.querySelector('[data-icon-name="ArrowRepeatAllRegular"]')).toBeNull();
    const header = container.querySelector('[data-node-card="loop-frame"] > div') as HTMLElement;
    expect(propertyValues(header, 'min-height')).toContain('24px');
    expect(propertyValues(header, 'font-size')).toEqual([tokens.fontSizeBase300]);
    expect(propertyValues(header, 'padding-inline')).toEqual([tokens.spacingHorizontalL]);
    expect(propertyValues(screen.getByText('Loop'), 'font-weight')).toContain(tokens.fontWeightRegular);
  });

  it('keeps instant collapse mounted by default and hides reveal mode with inert semantics after animation', () => {
    const { container, rerender } = render(
      <ui.NodeFrame kind="branch" title="False" collapsed>
        <input aria-label="Draft value" defaultValue="retained" />
      </ui.NodeFrame>
    );
    const body = container.querySelector('[data-node-card="branch-frame"] > div:last-child') as HTMLElement;
    expect(getComputedStyle(body).display).toBe('none');
    expect(screen.queryByRole('textbox', { name: 'Draft value' })).toBeNull();
    rerender(
      <ui.NodeFrame kind="branch" title="False" motion="reveal" collapsed>
        <input aria-label="Draft value" defaultValue="retained" />
      </ui.NodeFrame>
    );
    const revealBody = container.querySelector('[data-node-card="branch-frame"] > div:last-child') as HTMLElement;
    expect(revealBody).toHaveAttribute('aria-hidden', 'true');
    expect(revealBody).toHaveAttribute('inert');
    expect(screen.getByRole('textbox', { name: 'Draft value', hidden: true })).toBeInTheDocument();
  });
});

describe('NodeLine branch variants', () => {
  it.each(axes)('paints the solid arrow at the shaft endpoint on the %s axis', (orientation) => {
    render(<ui.NodeLine orientation={orientation} length={37} data-testid="arrow-line" />);
    const svg = screen.getByTestId('arrow-line');
    const arrow = ui.getNodeLineArrowPath(
      orientation === 'vertical' ? 10 : 37,
      orientation === 'vertical' ? 37 : 10,
      orientation === 'vertical' ? 'down' : 'right'
    );
    expect(svg.querySelector('path')).toHaveAttribute('d', `${orientation === 'vertical' ? 'M10 0 V37' : 'M0 10 H37'} ${arrow}`);
    expect(svg).toHaveAttribute('width', orientation === 'vertical' ? '20' : '37');
    expect(svg).toHaveAttribute('height', orientation === 'vertical' ? '37' : '20');
  });

  it.each(
    (['dashedNeutral', 'dashedSuccess', 'dashedDanger'] as const).flatMap((variant) =>
      axes.map((orientation) => ({ variant, orientation }))
    )
  )('keeps $variant shaft-only on the $orientation axis', ({ variant, orientation }) => {
    render(<ui.NodeLine variant={variant} orientation={orientation} length={37} data-testid="dashed-line" />);
    expect(screen.getByTestId('dashed-line').querySelector('path')).toHaveAttribute(
      'd',
      orientation === 'vertical' ? 'M10 0 V37' : 'M0 10 H37'
    );
  });

  describe('edge and handle chrome', () => {
    it.each(['default', 'taken', 'notTaken', 'highlighted', 'running'] as const)(
      'preserves the solid arrow path and state styling when state=%s while keeping solidSuccess/solidDanger shaft-only',
      (state) => {
        const { unmount } = render(
          <>
            <ui.NodeLine variant="solid" state={state} length={85} data-testid="solid-state-line" />
            <ui.NodeLine variant="solidSuccess" state={state} length={85} data-testid="success-state-line" />
            <ui.NodeLine variant="solidDanger" state={state} length={85} data-testid="danger-state-line" />
          </>
        );
        const solidSvg = screen.getByTestId('solid-state-line');
        const solidPath = solidSvg.querySelector('path')!;
        if (state === 'default') {
          expect(solidSvg).not.toHaveAttribute('data-state');
        } else {
          expect(solidSvg).toHaveAttribute('data-state', state);
        }
        expect(solidPath).toHaveAttribute('d', `M0 10 H85 ${ui.getNodeLineArrowPath(85, 10, 'right')}`);
        expect(screen.getByTestId('success-state-line').querySelector('path')).toHaveAttribute('d', 'M0 10 H85');
        expect(screen.getByTestId('danger-state-line').querySelector('path')).toHaveAttribute('d', 'M0 10 H85');
        if (state === 'running') {
          expect(propertyValues(solidPath, 'animation-duration', '', '(prefers-reduced-motion: no-preference)')).toContain('600ms');
          expect(propertyValues(solidPath, 'stroke', '', '(forced-colors: active)')).toEqual(['CanvasText']);
        }
        if (state === 'highlighted' || state === 'taken') {
          expect(propertyValues(solidPath, 'stroke', '', '(forced-colors: active)')).toContain('Highlight');
        }
        if (state === 'notTaken') {
          expect(propertyValues(solidPath, 'opacity')).toEqual([String(ui.nodeMetrics.inactiveOpacity)]);
          expect(propertyValues(solidPath, 'stroke', '', '(forced-colors: active)')).toEqual(['CanvasText']);
        }
        unmount();
      }
    );

    it('uses a 32px terminal control without changing the dashed connector length', () => {
      expect(ui.nodeMetrics.actionAdd).toEqual({ buttonWidth: 32, buttonHeight: 32, containerHeight: 44 });
      expect(ui.nodeMetrics.edgeControl).toEqual({
        pillSize: 24,
        hitTargetSize: 32,
        dualHitTargetWidth: 68,
        interactionWidth: 20,
      });
      render(<ui.NodeActionAdd onClick={vi.fn()} data-testid="terminal" />);
      const button = screen.getByRole('button', { name: 'Add action' });
      expectProperties(button, { width: '32px', height: '32px' });
      const line = screen.getByTestId('terminal').querySelector('[data-line]')!;
      expect(line).toHaveAttribute('width', '85');
      expect(line.querySelector('path')).toHaveAttribute('d', 'M0 10 H85');
    });

    it.each([
      { inactive: false, hoverable: undefined, ancestorInactive: false, isHoverable: true },
      { inactive: false, hoverable: true, ancestorInactive: false, isHoverable: true },
      { inactive: false, hoverable: false, ancestorInactive: false, isHoverable: false },
      { inactive: true, hoverable: true, ancestorInactive: false, isHoverable: false },
      { inactive: true, hoverable: false, ancestorInactive: false, isHoverable: false },
      { inactive: false, hoverable: true, ancestorInactive: true, isHoverable: false },
      { inactive: true, hoverable: true, ancestorInactive: true, isHoverable: false },
    ])(
      'resolves hover with inactive=$inactive, hoverable=$hoverable, ancestor=$ancestorInactive',
      ({ inactive, hoverable, ancestorInactive, isHoverable }) => {
        render(
          <ui.NodeInactiveContext.Provider value={ancestorInactive}>
            <ui.NodeHandle inactive={inactive} hoverable={hoverable} data-testid="handle" />
          </ui.NodeInactiveContext.Provider>
        );
        const handle = screen.getByTestId('handle');
        expect(propertyValues(handle, 'border-top-color', ':hover')).toEqual(isHoverable ? [tokens.colorBrandStroke1] : []);
        expect(propertyValues(handle, 'background-color', ':hover')).toEqual(isHoverable ? [tokens.colorNeutralBackground1Hover] : []);
        expect(propertyValues(handle, 'transition-property')).toEqual(isHoverable ? ['border-color,background-color'] : []);
        expect(propertyValues(handle, 'transition-duration', '', '(prefers-reduced-motion: reduce)')).toEqual(
          isHoverable ? ['0.01ms'] : []
        );
        expect(propertyValues(handle, 'opacity')).toEqual(inactive && !ancestorInactive ? ['0.4'] : []);
        expect(handle).not.toHaveAttribute('hoverable');
        expect(propertyValues(handle, 'border-top-color', '', '(forced-colors: active)')).toEqual(['CanvasText']);
        expect(propertyValues(handle, 'background-color', '', '(forced-colors: active)')).toEqual(['Canvas']);
      }
    );

    it.each(axes)('keeps input handles non-hoverable and output handles hoverable on the %s axis', (axis) => {
      render(
        <ui.NodeHandleAxisContext.Provider value={axis}>
          <ui.NodeInputHandle hoverable data-testid="input" />
          <ui.NodeOutputHandles handles={['neutral', 'success', 'danger']} activeIndex={1} />
        </ui.NodeHandleAxisContext.Provider>
      );
      expect(propertyValues(screen.getByTestId('input'), 'background-color', ':hover')).toEqual([]);
      const outputs = screen.getByTestId('node-output-handles').querySelectorAll('[data-handle]');
      expect(propertyValues(outputs[0], 'background-color', ':hover')).toEqual([]);
      expect(propertyValues(outputs[1], 'background-color', ':hover')).toEqual([tokens.colorNeutralBackground1Hover]);
      expect(propertyValues(outputs[2], 'background-color', ':hover')).toEqual([]);
    });

    it('keeps all output handles hoverable by default and suppresses hover when an ancestor is inactive', () => {
      const { rerender } = render(<ui.NodeOutputHandles handles={['neutral', 'success']} />);
      for (const handle of screen.getByTestId('node-output-handles').querySelectorAll('[data-handle]')) {
        expect(propertyValues(handle, 'background-color', ':hover')).toEqual([tokens.colorNeutralBackground1Hover]);
        expect(propertyValues(handle, 'opacity')).toEqual([]);
      }
      rerender(
        <ui.NodeInactiveContext.Provider value={true}>
          <ui.NodeOutputHandles handles={['neutral', 'success']} activeIndex={0} />
        </ui.NodeInactiveContext.Provider>
      );
      for (const handle of screen.getByTestId('node-output-handles').querySelectorAll('[data-handle]')) {
        expect(propertyValues(handle, 'background-color', ':hover')).toEqual([]);
        expect(propertyValues(handle, 'opacity')).toEqual([]);
      }
    });

    it('preserves hidden edge keyboard reveal, native activation and canvas key containment', async () => {
      const user = userEvent.setup();
      const activate = vi.fn();
      const outerKey = vi.fn();
      const outerClick = vi.fn();
      const ref = createRef<HTMLButtonElement>();
      render(
        <div onKeyDown={outerKey} onKeyUp={outerKey} onClick={outerClick}>
          <ui.EdgePillButton ref={ref} icon={<span>+</span>} tooltip="Add" ariaLabel="Add" isRevealed={false} onActivate={activate} />
          <button type="button">Next</button>
        </div>
      );
      const button = screen.getByRole('button', { name: 'Add' });
      expect(ref.current).toBe(button);
      expect(propertyValues(button, 'opacity')).toContain('0');
      await user.tab();
      expect(button).toHaveFocus();
      expect(propertyValues(button, 'opacity')).toContain('1');
      expect(propertyValues(button, 'pointer-events')).toContain('auto');
      expect(outerKey).toHaveBeenCalledWith(expect.objectContaining({ key: 'Tab' }));
      outerKey.mockClear();
      await user.keyboard('{Enter} ');
      expect(activate).toHaveBeenCalledTimes(2);
      expect(outerKey).not.toHaveBeenCalled();
      expect(outerClick).not.toHaveBeenCalled();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    });

    it('masks the line in every interaction state without overriding forced colors or host styles', () => {
      const props = { icon: <span>+</span>, tooltip: 'Add', ariaLabel: 'Add', isRevealed: true, onActivate: vi.fn() };
      const { rerender } = render(<ui.EdgePillButton {...props} style={{ marginTop: 7 }} maskColor="rgb(12, 34, 56)" />);
      const button = screen.getByRole('button', { name: 'Add' });
      expect(button.style.getPropertyValue('--node-edge-mask-color')).toBe('rgb(12, 34, 56)');
      expect(button.style.marginTop).toBe('7px');
      for (const pseudo of ['', ':hover', ':active']) {
        expect(propertyValues(button, 'background-color', pseudo)).toContain('var(--node-edge-mask-color)');
        expect(propertyValues(button, 'background-color', pseudo, '(forced-colors: active)')).toContain('Canvas');
      }
      expect(propertyValues(button, 'border-top-color', '', '(forced-colors: active)')).toContain('ButtonText');
      expect(propertyValues(button, 'color', '', '(forced-colors: active)')).toContain('ButtonText');
      expect(propertyValues(button, 'transition-duration', '', '(prefers-reduced-motion: reduce)')).toContain('0.01ms');
      rerender(<ui.EdgePillButton {...props} />);
      expect(propertyValues(button, 'background-color')).toContain(tokens.colorNeutralBackground1);
      expect(button.style.getPropertyValue('--node-edge-mask-color')).toBe('');
      expect(button).not.toHaveAttribute('maskColor');
    });
  });

  it('keeps existing stroke records unchanged while adding exact solidSuccess/solidDanger records', () => {
    expect(ui.nodeLineStrokes.solid).toEqual({ stroke: tokens.colorNeutralStroke1, strokeWidth: tokens.strokeWidthThin });
    expect(ui.nodeLineStrokes.dashedNeutral).toEqual({
      stroke: tokens.colorNeutralStroke1,
      strokeWidth: tokens.strokeWidthThin,
      strokeDasharray: '5 5',
    });
    expect(ui.nodeLineStrokes.dashedSuccess).toEqual({
      stroke: tokens.colorStatusSuccessBorder2,
      strokeWidth: tokens.strokeWidthThin,
      strokeDasharray: '5 5',
    });
    expect(ui.nodeLineStrokes.dashedDanger).toEqual({
      stroke: tokens.colorStatusDangerBorder2,
      strokeWidth: tokens.strokeWidthThin,
      strokeDasharray: '5 5',
    });
    expect(ui.nodeLineStrokes.solidSuccess).toEqual({
      stroke: tokens.colorStatusSuccessBorder2,
      strokeWidth: tokens.strokeWidthThin,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    });
    expect(ui.nodeLineStrokes.solidDanger).toEqual({
      stroke: tokens.colorStatusDangerBorder2,
      strokeWidth: tokens.strokeWidthThin,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    });
  });

  it.each((['solidSuccess', 'solidDanger'] as const).flatMap((variant) => axes.map((orientation) => ({ variant, orientation }))))(
    'applies exact $variant strokes through NodeLine and host classes on the $orientation axis',
    ({ variant, orientation }) => {
      const ref = createRef<SVGSVGElement>();
      render(
        <>
          <ui.NodeLine ref={ref} data-testid="preview-line" variant={variant} orientation={orientation} length={37} />
          <NodeLineStyleProbe variant={variant} />
        </>
      );
      const svg = screen.getByTestId('preview-line');
      expect(ref.current).toBe(svg);
      expect(svg).toHaveAttribute('data-line', variant);
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('viewBox', orientation === 'vertical' ? '0 0 20 37' : '0 0 37 20');
      const path = svg.querySelector('path')!;
      expect(path).toHaveAttribute('d', orientation === 'vertical' ? 'M10 0 V37' : 'M0 10 H37');
      for (const styledPath of [path, screen.getByTestId(`line-style-${variant}`)]) {
        expectProperties(styledPath, {
          fill: 'none',
          stroke: variant === 'solidSuccess' ? tokens.colorStatusSuccessBorder2 : tokens.colorStatusDangerBorder2,
          'stroke-width': tokens.strokeWidthThin,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        });
        expect(propertyValues(styledPath, 'stroke-dasharray')).toEqual([]);
        expect(styledPath).not.toHaveAttribute('stroke-dasharray');
        expect(propertyValues(styledPath, 'stroke', '', '(forced-colors: active)')).toEqual(['CanvasText']);
      }
    }
  );

  it.each([
    ['solid', tokens.colorNeutralStroke1, undefined],
    ['dashedNeutral', tokens.colorNeutralStroke1, '5 5'],
    ['dashedSuccess', tokens.colorStatusSuccessBorder2, '5 5'],
    ['dashedDanger', tokens.colorStatusDangerBorder2, '5 5'],
  ] as const)('does not add rounded caps/joins or change existing %s classes', (variant, stroke, dash) => {
    render(
      <>
        <ui.NodeLine variant={variant} data-testid="legacy-line" />
        <NodeLineStyleProbe variant={variant} />
      </>
    );
    for (const path of [screen.getByTestId('legacy-line').querySelector('path')!, screen.getByTestId(`line-style-${variant}`)]) {
      expectProperties(path, { stroke, 'stroke-width': tokens.strokeWidthThin });
      expect(propertyValues(path, 'stroke-dasharray')).toEqual(dash === undefined ? [] : [dash]);
      expect(propertyValues(path, 'stroke-linecap')).toEqual([]);
      expect(propertyValues(path, 'stroke-linejoin')).toEqual([]);
    }
  });
});

describe('unchanged branch compositions', () => {
  it.each(axes)('renders If outputs with NodeBranchOutputs tick/caption slots on the %s axis', (handleAxis) => {
    const { container } = render(<ui.ConditionNodeCard kind="if" title="Condition" handleAxis={handleAxis} />);
    const outputs = container.querySelector<HTMLElement>('[data-branch]')?.parentElement as HTMLElement;
    expect(outputs).toBeTruthy();
    expect(container.querySelectorAll('[data-handle]')).toHaveLength(1);
    expect(outputs).toHaveAttribute('data-axis', handleAxis);
    const branches = outputs.querySelectorAll<HTMLElement>('[data-branch]');
    expect(Array.from(branches, (output) => output.getAttribute('data-branch'))).toEqual(['true', 'false']);
    expect(branches[0].children[1].textContent).toBe('True');
    expect(branches[1].children[1].textContent).toBe('False');
    expect(branches[0].children[0]).toHaveAttribute('aria-hidden', 'true');
    expect(branches[1].children[0]).toHaveAttribute('aria-hidden', 'true');
    expect(propertyValues(branches[0].children[0], 'background-color')).toContain(tokens.colorStatusSuccessBorder2);
    expect(propertyValues(branches[1].children[0], 'background-color')).toContain(tokens.colorStatusDangerBorder2);
    expectProperties(outputs, {
      'flex-direction': handleAxis === 'vertical' ? 'row' : 'column',
      gap: handleAxis === 'vertical' ? tokens.spacingHorizontalL : tokens.spacingVerticalS,
    });
    expect(container.querySelector('[data-line]')).toBeNull();
  });

  it.each(axes)('keeps Switch default %s outputs as neutral multi-output dots', (handleAxis) => {
    const { container } = render(<ui.ConditionNodeCard kind="switch" title="Switch" caseCount={4} handleAxis={handleAxis} />);
    const outputs = screen.getByTestId('node-output-handles');
    const handles = outputs.querySelectorAll<HTMLElement>('[data-handle]');
    expect(container.querySelectorAll('[data-handle]')).toHaveLength(5);
    expect(outputs).toHaveAttribute('data-axis', handleAxis);
    expect(outputs).not.toHaveAttribute('data-mode');
    expect(handles).toHaveLength(4);
    handles.forEach((handle) => expect(handle).toHaveAttribute('data-handle', 'neutral'));
  });

  it.each(axes.flatMap((handleAxis) => [0, 1, 20].map((caseCount) => ({ handleAxis, caseCount }))))(
    'keeps switch trunk geometry fixed with one visual tick for $handleAxis and caseCount=$caseCount',
    ({ handleAxis, caseCount }) => {
      const outputSlots = [
        <button key="slot-0" type="button">
          Trunk slot
        </button>,
        <button key="slot-1" type="button">
          Additional semantic slot
        </button>,
      ];
      const { container } = render(
        <ui.ConditionNodeCard
          kind="switch"
          mode="trunk"
          title="Switch"
          caseCount={caseCount}
          handleAxis={handleAxis}
          outputSlots={outputSlots}
        />
      );
      const card = container.querySelector<HTMLElement>('[data-node-card="switch"]')!;
      const surface = card.firstElementChild as HTMLElement;
      expect(getComputedStyle(card).width).toBe('160px');
      expect(getComputedStyle(surface).minHeight).toBe('74px');
      const trunk = screen.getByTestId('node-output-handles');
      expect(trunk).toHaveAttribute('data-mode', 'trunk');
      expect(trunk).toHaveAttribute('data-axis', handleAxis);
      const ticks = trunk.querySelectorAll('[data-handle="neutral"]');
      expect(ticks).toHaveLength(1);
      expectProperties(ticks[0], {
        width: handleAxis === 'vertical' ? '12px' : tokens.strokeWidthThin,
        height: handleAxis === 'vertical' ? tokens.strokeWidthThin : '12px',
        'background-color': tokens.colorNeutralStroke1,
      });
      expect(propertyValues(ticks[0], 'background-color', '', '(forced-colors: active)')).toEqual(['CanvasText']);
      expect(propertyValues(trunk, handleAxis === 'vertical' ? 'bottom' : 'inset-inline-end')).toEqual([
        `calc(-1 * ${tokens.strokeWidthThin})`,
      ]);
      const slots = trunk.querySelectorAll<HTMLElement>('[data-slot-index]');
      expect(slots).toHaveLength(2);
      expect(slots[0].textContent).toBe('Trunk slot');
      expect(slots[1].textContent).toBe('Additional semantic slot');
      expect(screen.getByRole('button', { name: 'Additional semantic slot' })).toBeVisible();
      expect(ticks[0]).toHaveAttribute('aria-hidden', 'true');
      expect(ticks[0].childNodes).toHaveLength(0);
      expect(slots[0].parentElement).toBe(slots[1].parentElement);
      expect(slots[0].parentElement).not.toHaveAttribute('aria-hidden');
      expect(trunk.querySelectorAll('[data-branch]')).toHaveLength(0);
    }
  );

  it('applies switch corner action reserve and keeps host event handling untouched', () => {
    const onActionClick = vi.fn();
    const { container } = render(
      <ui.ConditionNodeCard
        kind="switch"
        mode="trunk"
        title="Route"
        subtitle="Action reserve"
        action={
          <button type="button" onClick={onActionClick}>
            Add case
          </button>
        }
      />
    );
    const card = container.querySelector<HTMLElement>('[data-node-card="switch"]')!;
    const action = screen.getByRole('button', { name: 'Add case' });
    expect(getComputedStyle(card).getPropertyValue('--designer-ui-v2-node-text-end-reserve')).toBe(tokens.spacingHorizontalXL);
    fireEvent.click(action);
    expect(onActionClick).toHaveBeenCalledOnce();
  });

  it('treats action={false} as absent so no text-end reserve is applied', () => {
    const { container } = render(<ui.ConditionNodeCard kind="switch" mode="trunk" title="Route" action={false} />);
    const card = container.querySelector<HTMLElement>('[data-node-card="switch"]')!;
    expect(getComputedStyle(card).getPropertyValue('--designer-ui-v2-node-text-end-reserve')).toBe('');
  });

  it.each(axes)('forwards inputVariant only to the input across condition/action/loop/agent cards on %s', (handleAxis) => {
    render(
      <>
        <ui.ConditionNodeCard
          kind="switch"
          title="Switch"
          caseCount={2}
          handleAxis={handleAxis}
          inputVariant="danger"
          data-testid="condition-card"
        />
        <ui.ActionNodeCard title="Action" handleAxis={handleAxis} inputVariant="success" data-testid="action-card" />
        <ui.LoopNodeCard title="Loop" handleAxis={handleAxis} inputVariant="danger" data-testid="loop-card" />
        <ui.AgentNodeCard title="Agent" handleAxis={handleAxis} inputVariant="success" data-testid="agent-card" />
      </>
    );
    const cards = [
      ['condition-card', 'danger'],
      ['action-card', 'success'],
      ['loop-card', 'danger'],
      ['agent-card', 'success'],
    ] as const;
    for (const [testId, variant] of cards) {
      const handles = screen.getByTestId(testId).querySelectorAll<HTMLElement>('[data-handle]');
      expect(handles.length).toBeGreaterThan(1);
      expect(handles[0]).toHaveAttribute('data-handle', variant);
      for (const output of Array.from(handles).slice(1)) {
        expect(output).toHaveAttribute('data-handle', 'neutral');
      }
    }
  });

  // adoption.spec.tsx retains the exact dot border/forced-color coverage.
  it.each([
    ['true', 'dashedSuccess'],
    ['false', 'dashedDanger'],
  ] as const)('keeps NodeLabeledHandle %s dot → caption → dashed line anatomy and literal empty labels', (branch, variant) => {
    const ref = createRef<HTMLSpanElement>();
    const { rerender } = render(<ui.NodeLabeledHandle ref={ref} branch={branch} label="" data-testid="labeled-handle" />);
    const root = screen.getByTestId('labeled-handle');
    const label = root.firstElementChild!;
    const line = root.lastElementChild!;
    const dot = label.firstElementChild!;
    expect(ref.current).toBe(root);
    expect(Array.from(root.childNodes)).toEqual([label, line]);
    expect(Array.from(label.childNodes)).toEqual([dot]);
    expect(label.textContent).toBe('');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(line.tagName.toLowerCase()).toBe('svg');
    expect(line).toHaveAttribute('data-line', variant);
    expect(line.querySelector('path')).toHaveAttribute('d', 'M0 10 H52');
    expect(propertyValues(line.querySelector('path')!, 'stroke-dasharray')).toEqual(['5 5']);
    rerender(<ui.NodeLabeledHandle ref={ref} branch={branch} data-testid="labeled-handle" />);
    expect(root.firstElementChild!.textContent).toBe(ui.defaultNodeStrings.branch[branch]);
  });
});

describe('W06 frame and branch regressions', () => {
  it('opens a settled hidden reveal from zero height without losing geometry on its state update', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => window.setTimeout(() => callback(performance.now()), 16));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => window.clearTimeout(id));
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    const tree = (collapsed: boolean) => (
      <ui.NodeFrame kind="loop" title="Loop" motion="reveal" collapsed={collapsed}>
        <input aria-label="Initially hidden draft" defaultValue="retained" />
      </ui.NodeFrame>
    );
    try {
      const { container, rerender } = render(tree(true));
      const body = container.querySelector('[data-node-card="loop-frame"] > div:last-child') as HTMLElement;
      const input = body.querySelector('input');
      Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 200 });
      expect(getComputedStyle(body).display).toBe('none');
      rerender(tree(false));
      expect(body).not.toHaveAttribute('inert');
      expect(body.style.maxHeight).toBe('0px');
      act(() => vi.advanceTimersByTime(16));
      expect(Number.parseFloat(body.style.maxHeight)).toBeGreaterThan(0);
      act(() => vi.advanceTimersByTime(224));
      expect(body.style.maxHeight).toBe('');
      expect(screen.getByRole('textbox', { name: 'Initially hidden draft' })).toBe(input);
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  it('honors an owning ancestor reduced-motion flag synchronously and preserves a host tabindex on focus restore', () => {
    const tree = (collapsed: boolean) => (
      <div data-reduce-motion="true">
        <ui.NodeFrame kind="loop" title="Loop" motion="reveal" collapsed={collapsed} tabIndex={0} data-testid="frame">
          <input aria-label="Quiet draft" />
        </ui.NodeFrame>
      </div>
    );
    const { container, rerender } = render(tree(false));
    screen.getByRole('textbox', { name: 'Quiet draft' }).focus();
    rerender(tree(true));
    const body = container.querySelector('[data-node-card="loop-frame"] > div:last-child')!;
    expect(body).toHaveAttribute('aria-hidden', 'true');
    expect(body).toHaveAttribute('inert');
    expect(screen.getByTestId('frame')).toHaveFocus();
    expect(screen.getByTestId('frame')).toHaveAttribute('tabindex', '0');
    rerender(tree(false));
    expect(body).not.toHaveAttribute('inert');
    expect(getComputedStyle(body).opacity).toBe('1');
  });

  it.each(axes.flatMap((handleAxis) => [0, 1].map((takenOutput) => ({ handleAxis, takenOutput }))))(
    'preserves If slots and the taken phrase without double dimming on $handleAxis for index $takenOutput',
    ({ handleAxis, takenOutput }) => {
      render(
        <ui.NodeFrame kind="branch" title="Inactive ancestor" inactive data-testid="ancestor">
          <ui.ConditionNodeCard
            kind="if"
            title="Condition"
            handleAxis={handleAxis}
            takenOutput={takenOutput}
            outputSlots={[
              <button key="true" type="button">
                True port
              </button>,
              <button key="false" type="button">
                False port
              </button>,
            ]}
            data-testid="condition"
          />
        </ui.NodeFrame>
      );
      const branches = screen.getByTestId('condition').querySelectorAll<HTMLElement>('[data-branch]');
      const label = takenOutput === 0 ? 'True' : 'False';
      expect(screen.getByText(`${label}, branch taken`)).toBeInTheDocument();
      expect(branches[takenOutput]).toHaveAttribute('data-taken', 'true');
      expect(propertyValues(screen.getByTestId('ancestor'), 'opacity')).toEqual(['0.4']);
      expect(propertyValues(screen.getByTestId('condition'), 'opacity')).toEqual([]);
      expect(propertyValues(branches[0], 'opacity')).toEqual([]);
      expect(propertyValues(branches[1], 'opacity')).toEqual([]);
      expect(branches[0]).toContainElement(screen.getByRole('button', { name: 'True port' }));
      expect(branches[1]).toContainElement(screen.getByRole('button', { name: 'False port' }));
    }
  );

  it('uses host If captions, including an empty caption, and localizes only the taken branch', () => {
    const taken = vi.fn((label: string) => `${label} (pris)`);
    render(
      <ui.ConditionNodeCard
        kind="if"
        title="Condition"
        takenOutput={1}
        strings={{ ...ui.defaultNodeStrings, branch: { true: '', false: 'Faux', taken } }}
      />
    );
    expect(screen.getByText('Faux (pris)')).toBeInTheDocument();
    expect(document.querySelector('[data-branch="true"]')?.children[1].textContent).toBe('');
    expect(taken.mock.calls.every(([label]) => label === 'Faux')).toBe(true);
  });

  it('reserves the larger action/test-data space and lets corner action events bubble to the host', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ui.ConditionNodeCard
        kind="switch"
        title="Route"
        subtitle="Details"
        status="mock"
        onClick={onClick}
        action={<button type="button">Add case</button>}
      />
    );
    const action = screen.getByRole('button', { name: 'Add case' });
    expectProperties(action.parentElement!, {
      position: 'absolute',
      top: tokens.spacingVerticalXS,
      'inset-inline-end': tokens.spacingHorizontalXS,
    });
    const body = container.querySelector('[data-node-card="switch"] > div > div') as HTMLElement;
    expect(body.style.getPropertyValue(ui.nodeCardVars.textEndReserve)).toBe(
      `max(${tokens.spacingHorizontalXL}, ${ui.nodeMetrics.testData.textReserve}px)`
    );
    fireEvent.click(action);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each(['inline', 'below'] as const)('keeps count zero distinct from omission with %s subtitle placement', (subtitlePlacement) => {
    const { rerender } = render(
      <ui.NodeFrame kind="loop" title="Loop" subtitle="Value" subtitlePlacement={subtitlePlacement} actionCount={0} />
    );
    expect(screen.getByText('0 actions')).toBeInTheDocument();
    expect(screen.getByText('Loop').parentElement).toContainElement(screen.getByText('0 actions'));
    expect(screen.getByText(subtitlePlacement === 'below' ? 'Value' : '· Value')).not.toContainElement(screen.getByText('0 actions'));
    rerender(<ui.NodeFrame kind="loop" title="Loop" subtitle="Value" subtitlePlacement={subtitlePlacement} />);
    expect(screen.queryByText('0 actions')).toBeNull();
  });

  it.each(axes.flatMap((handleAxis) => [0, 1, 89, 140].map((offset) => ({ handleAxis, offset }))))(
    'subtracts one thin stroke without clamping $handleAxis offset $offset',
    ({ handleAxis, offset }) => {
      const { container } = render(<ui.NodeFrame kind="loop" handles handleAxis={handleAxis} handleTop={offset} handleLeft={offset} />);
      const handles = container.querySelectorAll<HTMLElement>('[data-handle]');
      expect(handles).toHaveLength(2);
      const expected = `${offset - 1}px`;
      expect(handles[0].style[handleAxis === 'vertical' ? 'left' : 'top']).toBe(expected);
      expect(handles[1].style[handleAxis === 'vertical' ? 'left' : 'top']).toBe(expected);
    }
  );

  it('treats explicit motion none as the instant default and retains edited child state', () => {
    const tree = (collapsed: boolean) => (
      <ui.NodeFrame kind="loop" title="Loop" motion="none" collapsed={collapsed}>
        <input aria-label="Retained value" defaultValue="original" />
      </ui.NodeFrame>
    );
    const { container, rerender } = render(tree(false));
    const input = screen.getByRole('textbox', { name: 'Retained value' });
    fireEvent.change(input, { target: { value: 'edited' } });
    rerender(tree(true));
    expect(screen.queryByRole('textbox', { name: 'Retained value' })).toBeNull();
    expect(getComputedStyle(container.querySelector('[data-node-card="loop-frame"] > div:last-child')!).display).toBe('none');
    expect(container).toContainElement(input);
    rerender(tree(false));
    expect(screen.getByRole('textbox', { name: 'Retained value' })).toBe(input);
    expect(input).toHaveValue('edited');
  });

  it('hides all merge-circle paint but retains convergence geometry, refs, and children', () => {
    const ref = createRef<HTMLSpanElement>();
    const { rerender } = render(
      <ui.NodeMergePoint ref={ref} label="Condition" showCircle={false} data-testid="merge">
        <input aria-label="Convergence state" defaultValue="retained" />
      </ui.NodeMergePoint>
    );
    const merge = screen.getByTestId('merge');
    const input = screen.getByRole('textbox', { name: 'Convergence state' });
    expect(ref.current).toBe(merge);
    expect(merge.children).toHaveLength(1);
    expectProperties(merge, {
      width: `${ui.nodeMetrics.mergePoint.size}px`,
      height: `${ui.nodeMetrics.mergePoint.size}px`,
      'border-top-color': 'transparent',
      'background-color': 'transparent',
    });
    expect(propertyValues(merge, 'border-top-color', '', '(forced-colors: active)')).toEqual(['transparent']);
    fireEvent.change(input, { target: { value: 'edited' } });
    rerender(
      <ui.NodeMergePoint ref={ref} label="Condition" data-testid="merge">
        <input aria-label="Convergence state" defaultValue="retained" />
      </ui.NodeMergePoint>
    );
    expect(screen.getByRole('textbox', { name: 'Convergence state' })).toBe(input);
    expect(input).toHaveValue('edited');
  });

  it('scopes reduced motion to the owning frame and restores focus when a reveal closes', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => window.setTimeout(() => callback(performance.now()), 16));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => window.clearTimeout(id));
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    const tree = (collapsed: boolean) => (
      <>
        <div data-reduce-motion="true">
          <span>Unrelated quiet subtree</span>
        </div>
        <ui.NodeFrame kind="loop" title="Loop" motion="reveal" collapsed={collapsed} data-testid="frame">
          <input aria-label="Reveal draft" defaultValue="retained" />
        </ui.NodeFrame>
      </>
    );
    try {
      const { container, rerender } = render(tree(false));
      const frame = screen.getByTestId('frame');
      const body = container.querySelector('[data-node-card="loop-frame"] > div:last-child') as HTMLElement;
      Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 200 });
      const draft = screen.getByRole('textbox', { name: 'Reveal draft' });
      draft.focus();
      fireEvent.change(draft, { target: { value: 'edited' } });
      rerender(tree(true));
      expect(frame).toHaveFocus();
      expect(body).not.toHaveAttribute('aria-hidden');
      expect(body).not.toHaveAttribute('inert');
      expect(body.style.maxHeight).toBe('200px');
      act(() => vi.advanceTimersByTime(96));
      const interruptedHeight = body.style.maxHeight;
      expect(Number.parseFloat(interruptedHeight)).toBeGreaterThan(0);
      expect(Number.parseFloat(interruptedHeight)).toBeLessThan(200);
      rerender(tree(false));
      expect(body.style.maxHeight).toBe(interruptedHeight);
      act(() => vi.advanceTimersByTime(240));
      expect(body.style.maxHeight).toBe('');
      expect(frame).toHaveFocus();
      draft.focus();
      rerender(tree(true));
      act(() => vi.advanceTimersByTime(192));
      expect(body).toHaveAttribute('aria-hidden', 'true');
      expect(body).toHaveAttribute('inert');
      expect(getComputedStyle(body).display).toBe('none');
      expect(frame).toHaveFocus();
      expect(frame).toHaveAttribute('tabindex', '-1');
      rerender(tree(false));
      expect(body).not.toHaveAttribute('inert');
      expect(body).not.toHaveAttribute('aria-hidden');
      expect(screen.getByRole('textbox', { name: 'Reveal draft' })).toBe(draft);
      expect(draft).toHaveValue('edited');
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });
});

describe('inactive and taken-branch presentation', () => {
  it('announces only the taken branch with a localizable phrase and keeps the single caption child', () => {
    const takenLabel = vi.fn((label: string) => `${label} (pris)`);
    render(<ui.NodeBranchOutputs branches={['true', 'false']} activeIndex={0} takenLabel={takenLabel} data-testid="branch-outputs" />);
    const outputs = screen.getByTestId('branch-outputs').querySelectorAll<HTMLElement>('[data-branch]');
    expect(outputs[0]).toHaveAttribute('data-taken', 'true');
    expect(outputs[1]).not.toHaveAttribute('data-taken');
    expect(outputs[0].children).toHaveLength(3);
    const caption = outputs[0].children[1];
    expect(caption.querySelector('[aria-hidden="true"]')?.textContent).toBe(ui.defaultNodeStrings.branch.true);
    expect(screen.getByText('True (pris)')).toBeInTheDocument();
    expect(takenLabel).toHaveBeenCalledWith(ui.defaultNodeStrings.branch.true);
    expect(outputs[1].children[1].textContent).toBe(ui.defaultNodeStrings.branch.false);
  });

  it('uses the English default taken phrase when no formatter is supplied', () => {
    render(<ui.NodeBranchOutputs branches={['true', 'false']} activeIndex={1} />);
    expect(screen.getByText('False, branch taken')).toBeInTheDocument();
  });

  it('dims an inactive card once and marks it without opacity when nested in an inactive frame', () => {
    render(
      <ui.NodeFrame kind="scope" title="Scope" inactive data-testid="frame">
        <ui.ActionNodeCard title="Inner" inactive data-testid="inner" />
        <ui.ActionNodeCard title="Sibling" data-testid="sibling" />
      </ui.NodeFrame>
    );
    const frame = screen.getByTestId('frame');
    const inner = screen.getByTestId('inner');
    expect(frame).toHaveAttribute('data-inactive', 'true');
    expect(propertyValues(frame, 'opacity')).toEqual(['0.4']);
    expect(inner).toHaveAttribute('data-inactive', 'true');
    expect(propertyValues(inner, 'opacity')).toEqual([]);
    expect(screen.getByTestId('sibling')).not.toHaveAttribute('data-inactive');
  });

  it('provides the inactive context to the input, output, action and body slots of an inactive frame', () => {
    const Probe = ({ slot }: { slot: string }) => <span data-probe={slot} data-value={String(useContext(ui.NodeInactiveContext))} />;
    const frame = (inactive: boolean) => (
      <ui.NodeFrame
        kind="scope"
        title="Scope"
        inactive={inactive}
        inputSlot={<Probe slot="input" />}
        outputSlot={<Probe slot="output" />}
        action={<Probe slot="action" />}
      >
        <Probe slot="body" />
      </ui.NodeFrame>
    );
    const { container, rerender } = render(frame(true));
    const values = () =>
      Array.from(container.querySelectorAll('[data-probe]')).map(
        (el) => `${el.getAttribute('data-probe')}=${el.getAttribute('data-value')}`
      );
    expect(values()).toEqual(['input=true', 'output=true', 'action=true', 'body=true']);
    rerender(frame(false));
    expect(values()).toEqual(['input=false', 'output=false', 'action=false', 'body=false']);
  });

  // Opacity multiplies through the DOM: an untaken output or handle inside an inactive card would
  // otherwise render at 0.16 instead of the single 0.4 inactive level.
  it('does not compound opacity for untaken outputs and handles inside an inactive card', () => {
    const { container } = render(
      <>
        <ui.ConditionNodeCard kind="if" title="If" inactive takenOutput={0} data-testid="condition" />
        <ui.ActionNodeCard title="Host" inactive after={<ui.NodeBranchOutputs branches={['true', 'false']} activeIndex={0} />} />
        <ui.ActionNodeCard title="Handles" inactive after={<ui.NodeOutputHandles handles={['neutral', 'neutral']} activeIndex={0} />} />
      </>
    );
    const dimmed = Array.from(container.querySelectorAll('[data-inactive]')).filter(
      (el) => !el.hasAttribute('data-node-card') && el.getAttribute('role') !== 'group'
    );
    expect(dimmed.length).toBeGreaterThan(0);
    for (const el of dimmed) {
      expect(el).toHaveAttribute('data-inactive', 'true');
      expect(propertyValues(el, 'opacity')).toEqual([]);
    }
  });

  it('still dims an untaken output or handle when no ancestor is inactive', () => {
    const { container } = render(
      <>
        <ui.NodeBranchOutputs branches={['true', 'false']} activeIndex={0} />
        <ui.NodeHandle inactive data-testid="handle" />
      </>
    );
    expect(propertyValues(container.querySelector('[data-branch="false"]') as Element, 'opacity')).toEqual(['0.4']);
    expect(propertyValues(screen.getByTestId('handle'), 'opacity')).toEqual(['0.4']);
  });

  it('dims an inactive merge point once, including its child ports, and skips it inside an inactive frame', () => {
    render(
      <>
        <ui.NodeMergePoint label="Condition" inactive data-testid="merge">
          <ui.NodeHandle inactive data-testid="merge-port" />
        </ui.NodeMergePoint>
        <ui.NodeFrame kind="scope" title="Scope" inactive>
          <ui.NodeMergePoint label="Nested" inactive data-testid="nested-merge" />
        </ui.NodeFrame>
      </>
    );
    const merge = screen.getByTestId('merge');
    expect(merge).toHaveAttribute('data-inactive', 'true');
    expect(propertyValues(merge, 'opacity')).toEqual(['0.4']);
    expect(propertyValues(screen.getByTestId('merge-port'), 'opacity')).toEqual([]);
    expect(screen.getByTestId('nested-merge')).toHaveAttribute('data-inactive', 'true');
    expect(propertyValues(screen.getByTestId('nested-merge'), 'opacity')).toEqual([]);
  });

  it('applies the shared inactive opacity to a standalone card and forwards status overrides on the frame', () => {
    render(
      <>
        <ui.ActionNodeCard title="Alone" inactive data-testid="alone" />
        <ui.NodeFrame kind="scope" title="Scope" status="failed" statusLabel="Timed out" statusAriaLabel="Scope timed out" />
      </>
    );
    expect(propertyValues(screen.getByTestId('alone'), 'opacity')).toEqual(['0.4']);
    const badge = document.querySelector<HTMLElement>('[data-badge-status]')!;
    expect(badge).toHaveTextContent('Timed out');
    expect(badge).toHaveAttribute('aria-label', 'Scope timed out');
    expect(badge).toHaveAttribute('data-badge-status', 'failed');
  });
});
