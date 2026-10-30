import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
        expect(handle.style.top).toBe(handleAxis === 'horizontal' ? '89px' : '');
        expect(handle.style.left).toBe(handleAxis === 'vertical' ? '140px' : '');
        expect(handle.childNodes).toHaveLength(1);
        expect(handle.firstChild).toBe(screen.getByRole('button', { name: index === 0 ? 'Input port' : 'Output port' }));
      });
    }
  );
});

describe('NodeLine branch variants', () => {
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
  it.each(axes)('keeps ConditionNodeCard default %s outputs as ordered success/danger dots, not tick captions', (handleAxis) => {
    const { container } = render(<ui.ConditionNodeCard kind="if" title="Condition" handleAxis={handleAxis} />);
    const outputs = screen.getByTestId('node-output-handles');
    const handles = outputs.querySelectorAll<HTMLElement>('[data-handle]');
    expect(container.querySelectorAll('[data-handle]')).toHaveLength(3);
    expect(outputs).toHaveAttribute('data-axis', handleAxis);
    expect(Array.from(handles, (handle) => handle.getAttribute('data-handle'))).toEqual(['success', 'danger']);
    expect(Array.from(outputs.childNodes)).toEqual(Array.from(handles));
    handles.forEach((handle) => {
      expect(handle).toHaveAttribute('aria-hidden', 'true');
      expect(handle.childNodes).toHaveLength(0);
    });
    expectProperties(handles[0], { 'border-top-color': tokens.colorStatusSuccessForeground1 });
    expectProperties(handles[1], { 'border-top-color': tokens.colorStatusDangerForeground1 });
    expectProperties(outputs, {
      'flex-direction': handleAxis === 'vertical' ? 'row' : 'column',
      gap: handleAxis === 'vertical' ? tokens.spacingHorizontalL : tokens.spacingVerticalL,
    });
    expect(container.querySelector('[data-branch], [data-line]')).toBeNull();
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
