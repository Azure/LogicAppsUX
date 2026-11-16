import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { tokens } from '@fluentui/react-components';
import { describe, expect, it, vi } from 'vitest';
import { NodeBranchLabel, NodeFrame, NodeInactiveContext } from '../..';

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
        if (element.matches(rule.selectorText.replaceAll(':hover', ''))) {
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

describe('NodeBranchLabel', () => {
  it('renders the label and optional action without host behavior side effects', () => {
    render(
      <NodeBranchLabel
        label="False"
        action={
          <button type="button" aria-label="Inspect false branch">
            Inspect
          </button>
        }
      />
    );
    expect(screen.getByText('False')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect false branch' })).toBeInTheDocument();
  });

  it('announces the taken phrase only when state is taken', () => {
    const taken = (label: string) => `${label} selected`;
    const { rerender } = render(<NodeBranchLabel label="True" strings={{ taken }} />);
    expect(screen.queryByText('True selected')).toBeNull();
    rerender(<NodeBranchLabel label="True" state="taken" strings={{ taken }} />);
    expect(screen.getByText('True selected')).toBeInTheDocument();
  });

  it('uses 0.4 opacity for notTaken and avoids compounding when an ancestor is already inactive', () => {
    const { rerender, container } = render(<NodeBranchLabel label="True" state="notTaken" />);
    expect(propertyValues(container.firstElementChild as HTMLElement, 'opacity')).toEqual(['0.4']);
    rerender(
      <NodeInactiveContext.Provider value={true}>
        <NodeBranchLabel label="True" state="notTaken" />
      </NodeInactiveContext.Provider>
    );
    expect(propertyValues(container.firstElementChild as HTMLElement, 'opacity')).toEqual([]);
  });

  it.each([
    ['neutral', tokens.strokeWidthThin, tokens.colorNeutralStroke1],
    ['success', tokens.strokeWidthThick, tokens.colorStatusSuccessBorder2],
    ['danger', tokens.strokeWidthThick, tokens.colorStatusDangerBorder2],
  ] as const)('renders %s tone tick geometry and forced-colors fallback', (tone, width, color) => {
    const { container } = render(<NodeBranchLabel label="True" tone={tone} />);
    const tick = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(propertyValues(tick, 'width')).toContain(width);
    expect(propertyValues(tick, 'background-color')).toContain(color);
    expect(propertyValues(tick, 'background-color', '', '(forced-colors: active)')).toContain('CanvasText');
  });

  it('defaults to an undimmed neutral label and forwards host refs, attributes and action events', () => {
    const ref = createRef<HTMLSpanElement>();
    const onClick = vi.fn();
    render(
      <NodeBranchLabel
        ref={ref}
        label=""
        role="group"
        aria-label="Host caption"
        className="host-caption"
        onClick={onClick}
        action={<button type="button">Inspect</button>}
      />
    );
    const root = screen.getByRole('group', { name: 'Host caption' });
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('host-caption');
    expect(propertyValues(root, 'opacity')).toEqual([]);
    expect(screen.queryByText(/branch taken/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('announces the English taken phrase once and skips a second dim under an actual inactive frame', () => {
    const { rerender } = render(<NodeBranchLabel label="Case A" state="taken" />);
    expect(screen.getAllByText('Case A, branch taken')).toHaveLength(1);
    expect(screen.getByText('Case A')).toHaveAttribute('aria-hidden', 'true');
    rerender(
      <NodeFrame kind="branch" title="Branch" inactive data-testid="inactive-frame">
        <NodeBranchLabel label="Case A" state="notTaken" data-testid="caption" />
      </NodeFrame>
    );
    expect(propertyValues(screen.getByTestId('inactive-frame'), 'opacity')).toEqual(['0.4']);
    expect(propertyValues(screen.getByTestId('caption'), 'opacity')).toEqual([]);
    expect(screen.queryByText('Case A, branch taken')).toBeNull();
  });
});
