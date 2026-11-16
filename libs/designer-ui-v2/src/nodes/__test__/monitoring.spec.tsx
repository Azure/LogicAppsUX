import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as ui from '../..';
import type { NodeLineVariant } from '../..';

function declarations(element: Element, media = ''): CSSStyleDeclaration[] {
  const result: CSSStyleDeclaration[] = [];
  const visit = (rules: CSSRuleList, condition = '') => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules, rule.conditionText);
      } else if (rule instanceof CSSStyleRule && condition === media && element.matches(rule.selectorText)) {
        result.push(rule.style);
      }
    }
  };
  for (const sheet of Array.from(element.ownerDocument.styleSheets)) {
    visit(sheet.cssRules);
  }
  return result;
}
const propertyValues = (element: Element, property: string, media = '') =>
  declarations(element, media)
    .map((style) => style.getPropertyValue(property))
    .filter(Boolean);

const renderPager = (props: Partial<ui.NodeIterationPagerProps> = {}) => {
  const onChange = vi.fn();
  const result = render(<ui.NodeIterationPager current={0} count={5} onChange={onChange} {...props} />);
  return { ...result, onChange };
};

describe('NodeIterationPager', () => {
  it('renders nothing for empty or invalid counts', () => {
    for (const count of [0, -3, Number.NaN]) {
      const { container, unmount } = renderPager({ count });
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('shows one-based position text in a labelled group and pages within bounds', () => {
    const { onChange } = renderPager({ current: 0 });
    expect(screen.getByRole('group', { name: 'Iterations' })).toHaveClass('nodrag');
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous iteration' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next iteration' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it.each([
    ['stale above count', 42, '5 of 5'],
    ['negative', -1, '1 of 5'],
    ['NaN', Number.NaN, '1 of 5'],
  ])('clamps a %s current for display', (_name, current, text) => {
    renderPager({ current });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('disables next at the last iteration and never emits out-of-range indices', () => {
    const { onChange } = renderPager({ current: 99 });
    expect(screen.getByRole('button', { name: 'Next iteration' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous iteration' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('jumps to the nearest failed iteration and ignores out-of-range failures', () => {
    const { onChange } = renderPager({ current: 2, failed: [0, 1, 4, 9, -1, 2.5] });
    fireEvent.click(screen.getByRole('button', { name: 'Previous failed iteration' }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next failed iteration' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('disables a failed jump with no failure in that direction and hides jumps without failure data', () => {
    renderPager({ current: 4, failed: [1] });
    expect(screen.getByRole('button', { name: 'Next failed iteration' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous failed iteration' })).toBeEnabled();
    const { unmount } = render(<ui.NodeIterationPager current={0} count={3} onChange={vi.fn()} />);
    expect(screen.getAllByRole('group')[1].querySelector('[data-pager-action="next-failed"]')).toBeNull();
    unmount();
  });

  it('commits an editable value on Enter, clamped to the one-based range', () => {
    const { onChange } = renderPager({ editable: true, current: 1 });
    const input = screen.getByRole('textbox', { name: 'Iteration number, 1 to 5' });
    expect(input).toHaveValue('2');
    fireEvent.change(input, { target: { value: '9a9' } });
    expect(input).toHaveValue('99');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(4);
    expect(input).toHaveValue('5');
  });

  it('restores the current value when an empty edit is blurred', () => {
    const { onChange } = renderPager({ editable: true, current: 2 });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('3');
  });

  it('keeps keys away from canvas handlers but lets Tab through', () => {
    const outer = vi.fn();
    render(
      <div onKeyDown={outer}>
        <ui.NodeIterationPager current={0} count={3} onChange={vi.fn()} />
      </div>
    );
    const next = screen.getByRole('button', { name: 'Next iteration' });
    fireEvent.keyDown(next, { key: 'ArrowRight' });
    expect(outer).not.toHaveBeenCalled();
    fireEvent.keyDown(next, { key: 'Tab' });
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it('keeps clicks on any part of the pager away from the containing node', () => {
    const outer = vi.fn();
    const own = vi.fn();
    render(
      <div onClick={outer}>
        <ui.NodeIterationPager current={0} count={5} onChange={vi.fn()} onClick={own} />
      </div>
    );
    fireEvent.click(screen.getByText('1 of 5'));
    fireEvent.click(screen.getByRole('group', { name: 'Iterations' }));
    expect(outer).not.toHaveBeenCalled();
    expect(own).toHaveBeenCalledTimes(2);
  });

  it('uses localized strings', () => {
    renderPager({
      current: 1,
      strings: {
        ...ui.defaultNodeIterationPagerStrings,
        label: 'Iteraciones',
        next: 'Siguiente',
        position: (current, count) => `${current} de ${count}`,
      },
    });
    expect(screen.getByRole('group', { name: 'Iteraciones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument();
    expect(screen.getByText('2 de 5')).toBeInTheDocument();
  });
});

describe('NodeRunAfterIndicator', () => {
  it('fills dots in fixed order and names the full summary', () => {
    render(<ui.NodeRunAfterIndicator statuses={['failed', 'succeeded', 'failed']} />);
    const indicator = screen.getByRole('img', { name: 'Runs after: Is successful, Has failed' });
    const dots = Array.from(indicator.querySelectorAll('[data-run-after-status]'));
    expect(dots.map((dot) => dot.getAttribute('data-run-after-status'))).toEqual(['succeeded', 'timedOut', 'skipped', 'failed']);
    expect(dots.map((dot) => dot.hasAttribute('data-filled'))).toEqual([true, false, false, true]);
  });

  it('opts filled dots out of forced-color repainting so filled vs. hollow survives', () => {
    render(<ui.NodeRunAfterIndicator statuses={['failed']} />);
    const [succeeded, , , failed] = Array.from(document.querySelectorAll('[data-run-after-status]'));
    expect(propertyValues(failed, 'forced-color-adjust', '(forced-colors: active)')).toContain('none');
    expect(propertyValues(succeeded, 'forced-color-adjust', '(forced-colors: active)')).not.toContain('none');
  });

  it('renders the collapsed variant with a localized count', () => {
    render(
      <ui.NodeRunAfterIndicator
        statuses={['succeeded']}
        collapsedCount={7}
        strings={{ ...ui.defaultNodeRunAfterStrings, collapsed: (count) => `Ejecuta después de ${count}` }}
      />
    );
    const indicator = screen.getByRole('img', { name: 'Ejecuta después de 7' });
    expect(indicator).toHaveAttribute('data-run-after', 'collapsed');
    expect(indicator).toHaveTextContent('×7');
    expect(indicator.querySelector('[data-run-after-status]')).toBeNull();
  });

  it('ignores a non-positive collapsed count', () => {
    render(<ui.NodeRunAfterIndicator statuses={['skipped']} collapsedCount={0} />);
    expect(screen.getByRole('img', { name: 'Runs after: Is skipped' })).toHaveAttribute('data-run-after', '');
  });
});

describe('NodeLine run states', () => {
  const variants: NodeLineVariant[] = ['solid', 'solidSuccess', 'solidDanger', 'dashedNeutral', 'dashedSuccess', 'dashedDanger'];

  it.each(variants)('getNodeLineStroke(%s) equals the frozen variant stroke', (variant) => {
    expect(ui.getNodeLineStroke(variant)).toEqual(ui.nodeLineStrokes[variant]);
    expect(ui.getNodeLineStroke(variant, { state: 'default' })).toEqual(ui.nodeLineStrokes[variant]);
  });

  it('layers state overrides on top of the variant', () => {
    expect(ui.getNodeLineStroke('dashedSuccess', { state: 'notTaken' })).toEqual({
      ...ui.nodeLineStrokes.dashedSuccess,
      opacity: ui.nodeMetrics.inactiveOpacity,
    });
    expect(ui.getNodeLineStroke('solid', { state: 'running' })).toMatchObject({ strokeDasharray: '5 5' });
    expect(ui.getNodeLineStroke('solidDanger', { state: 'taken' }).strokeLinecap).toBe('round');
  });

  it('omits data-state by default and reflects explicit states', () => {
    const { container, rerender } = render(<ui.NodeLine />);
    expect(container.querySelector('svg')).not.toHaveAttribute('data-state');
    rerender(<ui.NodeLine state="taken" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-state', 'taken');
  });

  it('animates running lines only when motion is allowed', () => {
    const { container } = render(<ui.NodeLine state="running" />);
    const path = container.querySelector('path') as SVGPathElement;
    expect(propertyValues(path, 'animation-name')).toEqual([]);
    expect(propertyValues(path, 'animation-name', '(prefers-reduced-motion: no-preference)')).toHaveLength(1);
    expect(propertyValues(path, 'animation-iteration-count', '(prefers-reduced-motion: no-preference)')).toEqual(['infinite']);
  });

  it('uses the Highlight system color for taken lines in forced colors', () => {
    const { container } = render(<ui.NodeLine state="taken" />);
    const path = container.querySelector('path') as SVGPathElement;
    expect(propertyValues(path, 'stroke', '(forced-colors: active)')).toContain('Highlight');
  });

  it('dims not-taken lines with the shared inactive opacity', () => {
    const { container } = render(<ui.NodeLine state="notTaken" />);
    expect(propertyValues(container.querySelector('path') as SVGPathElement, 'opacity')).toEqual([String(ui.nodeMetrics.inactiveOpacity)]);
  });
});
