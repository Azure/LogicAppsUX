import { render } from '@testing-library/react';
import { tokens, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import { ConditionNodeCard } from '../cards/ConditionNodeCard';
import { getSwitchNodeSize } from '../../metrics';

const cases = [
  { count: 0, outputs: 1, horizontalHeight: 103, verticalWidth: 160 },
  { count: -2, outputs: 1, horizontalHeight: 103, verticalWidth: 160 },
  { count: 1, outputs: 1, horizontalHeight: 103, verticalWidth: 160 },
  { count: 4, outputs: 4, horizontalHeight: 103, verticalWidth: 160 },
  { count: 6, outputs: 6, horizontalHeight: 114, verticalWidth: 160 },
  { count: 20, outputs: 20, horizontalHeight: 394, verticalWidth: 424 },
  { count: 20.9, outputs: 20, horizontalHeight: 394, verticalWidth: 424 },
  { count: 0.9, outputs: 1, horizontalHeight: 103, verticalWidth: 160 },
  { count: Number.NaN, outputs: 1, horizontalHeight: 103, verticalWidth: 160 },
  { count: Number.POSITIVE_INFINITY, outputs: 1, horizontalHeight: 103, verticalWidth: 160 },
  { count: Number.NEGATIVE_INFINITY, outputs: 1, horizontalHeight: 103, verticalWidth: 160 },
];

const declarations = (element: Element, property: string) =>
  Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && element.matches(rule.selectorText))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean);

describe('canonical Switch count and body geometry', () => {
  it.each(cases)('reserves the actual horizontal $outputs-dot stack for count=$count', ({ count, outputs, horizontalHeight }) => {
    // Literal expectations and actual CSS are independent of the sizing function under test.
    expect(getSwitchNodeSize(count, 'horizontal')).toEqual({ width: 160, height: horizontalHeight });
    const view = render(
      <ConditionNodeCard
        kind="switch"
        title="Switch"
        caseCount={count}
        handleAxis="horizontal"
        outputSlots={Array.from({ length: outputs }, (_, index) => <button key={index} type="button">{`Port ${index}`}</button>)}
      />
    );
    const card = view.container.querySelector('[data-node-card="switch"]')!;
    const surface = card.firstElementChild!;
    const body = surface.firstElementChild!;
    const stack = card.querySelector('[data-testid="node-output-handles"]')!;
    const dots = stack.querySelectorAll('[data-handle]');
    expect(getComputedStyle(card).width).toBe('160px');
    expect(getComputedStyle(surface).minHeight).toBe(`${horizontalHeight}px`);
    expect(getComputedStyle(surface).boxSizing).toBe('border-box');
    expect(getComputedStyle(surface).borderTopWidth).toBe('1px');
    expect(getComputedStyle(surface).borderBottomWidth).toBe('1px');
    expect(getComputedStyle(stack).flexDirection).toBe('column');
    expect(getComputedStyle(stack).gap).toBe('8px');
    expect(dots).toHaveLength(outputs);
    dots.forEach((dot, index) => {
      expect(getComputedStyle(dot).height).toBe('12px');
      expect(getComputedStyle(dot).flexShrink).toBe('0');
      expect(dot.firstElementChild).toHaveTextContent(`Port ${index}`);
    });
    expect(declarations(body, 'padding')).toContain(tokens.spacingHorizontalL);
    expect(declarations(stack, 'margin-block')).toContain(`calc(-1 * ${tokens.spacingVerticalL})`);
    expect(webLightTheme.spacingHorizontalL).toBe('16px');
    expect(webLightTheme.spacingVerticalL).toBe('16px');
  });

  it.each(cases)('preserves vertical row admission and rendering for count=$count', ({ count, outputs, verticalWidth }) => {
    expect(getSwitchNodeSize(count, 'vertical')).toEqual({ width: verticalWidth, height: 74 });
    const view = render(<ConditionNodeCard kind="switch" title="Switch" caseCount={count} handleAxis="vertical" />);
    const card = view.container.querySelector('[data-node-card="switch"]')!;
    const surface = card.firstElementChild!;
    const stack = card.querySelector('[data-testid="node-output-handles"]')!;
    expect(getComputedStyle(surface).minHeight).toBe('74px');
    expect(surface).not.toHaveAttribute('style');
    expect(getComputedStyle(stack).flexDirection).toBe('row');
    expect(getComputedStyle(stack).gap).toBe('8px');
    expect(stack.querySelectorAll('[data-handle]')).toHaveLength(outputs);
  });
});
