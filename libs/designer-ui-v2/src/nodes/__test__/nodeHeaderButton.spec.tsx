import { render, screen } from '@testing-library/react';
import { tokens } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import { nodeMetrics, useNodeHeaderButtonStyles } from '../..';

function declarations(element: Element, pseudo = ''): CSSStyleDeclaration[] {
  const result: CSSStyleDeclaration[] = [];
  for (const sheet of Array.from(element.ownerDocument.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (!(rule instanceof CSSStyleRule)) {
        continue;
      }
      const selector = rule.selectorText;
      if ((selector.includes('::before') || selector.includes(':before')) !== (pseudo === '::before')) {
        continue;
      }
      const normalized = selector.replaceAll('::before', '').replaceAll(':before', '');
      if (element.matches(normalized)) {
        result.push(rule.style);
      }
    }
  }
  return result;
}

const propertyValues = (element: Element, property: string, pseudo = '') =>
  declarations(element, pseudo)
    .map((style) => style.getPropertyValue(property))
    .filter(Boolean);

function HeaderButtonProbe() {
  const styles = useNodeHeaderButtonStyles();
  return (
    <button type="button" className={styles.button} data-testid="header-button">
      <span className={styles.icon} data-testid="header-button-icon" />
    </button>
  );
}

describe('useNodeHeaderButtonStyles', () => {
  it('keeps the canonical header button geometry and extended hit area', () => {
    render(<HeaderButtonProbe />);
    const button = screen.getByTestId('header-button');
    const icon = screen.getByTestId('header-button-icon');
    expect(propertyValues(button, 'width')).toContain(`${nodeMetrics.toolsHeader}px`);
    expect(propertyValues(button, 'height')).toContain(`${nodeMetrics.toolsHeader}px`);
    expect(propertyValues(button, 'overflow')).toContain('visible');
    expect(propertyValues(button, 'z-index')).toContain('1');
    expect(propertyValues(button, 'min-width')).toContain('0');
    expect(propertyValues(icon, 'font-size')).toContain(`${nodeMetrics.toolsActionIcon}px`);
    expect(propertyValues(icon, 'width')).toContain(`${nodeMetrics.toolsActionIcon}px`);
    expect(propertyValues(icon, 'height')).toContain(`${nodeMetrics.toolsActionIcon}px`);
    expect(propertyValues(button, 'inset', '::before')).toContain(
      `calc(-1 * ${tokens.spacingVerticalS} - ${tokens.strokeWidthThick}) calc(-1 * ${tokens.spacingHorizontalXS})`
    );
  });

  it('does not render or require a menu surface', () => {
    render(<HeaderButtonProbe />);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
