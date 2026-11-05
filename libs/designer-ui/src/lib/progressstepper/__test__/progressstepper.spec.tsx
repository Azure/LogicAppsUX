/**
 * @vitest-environment happy-dom
 */
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { render, screen, within } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressStepper } from '../index';
import type { ProgressStepperStep } from '../index';

const steps: readonly ProgressStepperStep[] = [
  { id: 'validate', label: 'Validate workflow', status: 'success' },
  { id: 'create workspace', label: 'Create resources', status: 'in-progress' },
  { id: 'save', label: 'Save workflow', status: 'error', error: 'The workflow could not be saved. Try again.' },
  { id: 'finish', label: 'Finish setup' },
];

const Providers = ({ children }: PropsWithChildren) => (
  <FluentProvider theme={webDarkTheme}>
    <IntlProvider locale="en" messages={{}}>
      {children}
    </IntlProvider>
  </FluentProvider>
);

describe('ProgressStepper', () => {
  beforeEach(() => {
    // The package setup spies on useIntl; exercise the real provider here.
    vi.restoreAllMocks();
  });

  it('renders all four controlled states as ordered, named milestones', () => {
    render(<ProgressStepper steps={steps} aria-label="Provisioning progress" className="custom-stepper" />, { wrapper: Providers });

    const list = screen.getByRole('list', { name: 'Provisioning progress' });
    expect(list.tagName).toBe('OL');
    expect(list).toHaveClass('custom-stepper');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    steps.forEach((step, index) => {
      expect(items[index].tagName).toBe('LI');
      expect(items[index]).toHaveAccessibleName(step.label);
      expect(items[index]).toHaveAttribute('aria-posinset', String(index + 1));
      expect(items[index]).toHaveAttribute('aria-setsize', '4');
    });
    expect(items[0]).toHaveAccessibleDescription('Completed');
    expect(items[1]).toHaveAccessibleDescription('In progress');
    expect(items[2]).toHaveAccessibleDescription('Error The workflow could not be saved. Try again.');
    expect(within(items[3]).getByText('4')).toBeVisible();
    expect(items[3]).toHaveTextContent('4Finish setup');
    expect(items[3]).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText(/pending|not started|waiting/i)).not.toBeInTheDocument();
  });

  it('exposes only the active milestone as current and links contextual error text', () => {
    const { container } = render(<ProgressStepper steps={steps} aria-label="Progress" />, { wrapper: Providers });

    const active = screen.getByRole('listitem', { name: 'Create resources' });
    expect(active).toHaveAttribute('aria-current', 'step');
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(1);
    const failed = screen.getByRole('listitem', { name: 'Save workflow' });
    const descriptionIds = failed.getAttribute('aria-describedby')!.split(' ');
    expect(descriptionIds).toHaveLength(2);
    expect(document.getElementById(descriptionIds[1])).toHaveTextContent('The workflow could not be saved. Try again.');
    expect(container.querySelectorAll('[aria-live="polite"][aria-atomic="true"]')).toHaveLength(4);
    expect(container.querySelector('[aria-live="assertive"], [role="alert"]')).toBeNull();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(container.querySelector('.fui-Spinner')).toBeInTheDocument();
  });

  it('does not add navigation, actions, or tab stops', () => {
    const { container } = render(<ProgressStepper steps={steps} aria-label="Progress" />, { wrapper: Providers });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('button, a, input, select, textarea, [tabindex], [contenteditable="true"]')).toBeNull();
  });

  it('keeps label IDs and live regions stable through controlled updates and reordering', () => {
    const { rerender } = render(<ProgressStepper steps={steps} aria-label="Progress" />, { wrapper: Providers });
    const original = screen.getByRole('listitem', { name: 'Create resources' });
    const labelId = original.getAttribute('aria-labelledby')!;
    const liveRegion = original.querySelector('[aria-live]');
    const nextSteps: readonly ProgressStepperStep[] = [
      steps[3],
      { id: 'create workspace', label: 'Create resources', status: 'error', error: 'Resource quota exceeded.' },
    ];

    rerender(<ProgressStepper steps={nextSteps} aria-label="Progress" />);

    const updated = screen.getByRole('listitem', { name: 'Create resources' });
    expect(updated).toBe(original);
    expect(updated).toHaveAttribute('aria-labelledby', labelId);
    expect(updated.querySelector('[aria-live]')).toBe(liveRegion);
    expect(liveRegion).toContainElement(document.getElementById(labelId));
    expect(liveRegion).toHaveTextContent('Create resourcesErrorResource quota exceeded.');
    expect(document.getElementById(labelId)).toHaveTextContent('Create resources');
    expect(updated).not.toHaveAttribute('aria-current');
    expect(updated).toHaveAccessibleDescription('Error Resource quota exceeded.');

    rerender(<ProgressStepper steps={[{ id: 'create workspace', label: 'Create resources', status: 'success' }]} aria-label="Progress" />);
    expect(updated).toHaveAccessibleDescription('Completed');
    expect(liveRegion).toHaveTextContent('Create resourcesCompleted');
    expect(screen.queryByText('Resource quota exceeded.')).not.toBeInTheDocument();

    rerender(<ProgressStepper steps={[{ id: 'create workspace', label: 'Create resources' }]} aria-label="Progress" />);
    expect(updated).not.toHaveAttribute('aria-describedby');
    expect(updated.querySelector('[aria-live]')).toBe(liveRegion);
    expect(liveRegion?.textContent).toBe('Create resources');
    expect(liveRegion?.querySelector('[id$="-status"], [id$="-error"]')).toBeNull();
    expect(within(updated).getByText('1')).toBeVisible();
    expect(screen.queryByText(/completed|in progress|error/i)).not.toBeInTheDocument();
  });

  it('keeps milestone context inside one polite atomic region when a neutral milestone starts', () => {
    const { rerender } = render(<ProgressStepper steps={[{ id: 'create', label: 'Create resources' }]} aria-label="Progress" />, {
      wrapper: Providers,
    });
    const item = screen.getByRole('listitem', { name: 'Create resources' });
    const liveRegion = item.querySelector('[aria-live="polite"][aria-atomic="true"]');
    expect(liveRegion?.textContent).toBe('Create resources');

    rerender(<ProgressStepper steps={[{ id: 'create', label: 'Create resources', status: 'in-progress' }]} aria-label="Progress" />);

    expect(item.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(item.querySelector('[aria-live]')).toBe(liveRegion);
    expect(liveRegion).toContainElement(screen.getByText('Create resources'));
    expect(liveRegion).toContainElement(screen.getByText('In progress'));
    expect(liveRegion).toHaveTextContent('Create resourcesIn progress');
  });

  it('does not collide IDs between instances with the same step IDs', () => {
    const { container } = render(
      <>
        <ProgressStepper steps={steps} aria-label="First transaction" />
        <ProgressStepper steps={steps} aria-label="Second transaction" />
      </>,
      { wrapper: Providers }
    );
    const elements = Array.from(container.querySelectorAll('[id]'));
    const ids = elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const element of container.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
      const references = `${element.getAttribute('aria-labelledby') ?? ''} ${element.getAttribute('aria-describedby') ?? ''}`;
      for (const id of references.trim().split(/\s+/)) {
        expect(document.getElementById(id)).toBeInTheDocument();
      }
    }
  });

  it('renders a named empty list without fallback statuses or announcements', () => {
    const { container } = render(<ProgressStepper steps={[]} aria-label="Progress" />, { wrapper: Providers });
    expect(screen.getByRole('list', { name: 'Progress' })).toBeEmptyDOMElement();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  it('keeps arbitrary milestone counts and long contextual errors in logical order', () => {
    const error = `Quota exceeded: ${'resource-group-name-without-spaces-'.repeat(12)}`;
    const manySteps: readonly ProgressStepperStep[] = Array.from({ length: 7 }, (_, index) =>
      index === 4
        ? { id: String(index), label: `Milestone ${index + 1}`, status: 'error', error }
        : { id: String(index), label: `Milestone ${index + 1}` }
    );
    render(<ProgressStepper steps={manySteps} aria-label="Progress" />, { wrapper: Providers });

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(7);
    items.forEach((item, index) => {
      expect(item).toHaveAccessibleName(`Milestone ${index + 1}`);
      expect(item).toHaveAttribute('aria-setsize', '7');
    });
    expect(items[4]).toHaveAccessibleDescription(`Error ${error}`);
    expect(within(items[4]).getByText(error)).toBeVisible();
  });

  it('centers each horizontal indicator and its content without centering the narrow vertical layout', () => {
    render(<ProgressStepper steps={steps} aria-label="Progress" />, { wrapper: Providers });
    const step = screen.getByRole('listitem', { name: 'Validate workflow' });
    const label = document.getElementById(step.getAttribute('aria-labelledby')!)!;
    const content = label.parentElement!;
    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules));
    const horizontalRules = rules
      .filter((rule) => rule.cssText.startsWith('@container progress-stepper'))
      .flatMap((rule) => Array.from((rule as CSSGroupingRule).cssRules))
      .filter((rule): rule is CSSStyleRule => 'selectorText' in rule);
    const propertyValues = (element: Element, property: string) =>
      horizontalRules.filter((rule) => element.matches(rule.selectorText)).map((rule) => rule.style.getPropertyValue(property));

    expect(propertyValues(step, 'align-items')).toContain('center');
    expect(propertyValues(label, 'justify-content')).toContain('center');
    expect(propertyValues(label, 'text-align')).toContain('center');
    expect(propertyValues(content, 'text-align')).toContain('center');
    expect(propertyValues(screen.getByText('Completed'), 'text-align')).toContain('center');
    expect(propertyValues(screen.getByText('The workflow could not be saved. Try again.'), 'text-align')).toContain('center');
    const baseContentRules = rules.filter(
      (rule): rule is CSSStyleRule => 'selectorText' in rule && content.matches((rule as CSSStyleRule).selectorText)
    );
    expect(baseContentRules.map((rule) => rule.style.getPropertyValue('text-align'))).toContain('start');
  });

  it('localizes status text through the real IntlProvider without changing supplied labels and errors', () => {
    render(
      <FluentProvider theme={webDarkTheme}>
        <IntlProvider locale="fr" messages={{ BdQfl1: 'En cours', '0VEuib': 'Terminé', k9fjDp: 'Erreur' }}>
          <ProgressStepper steps={steps} aria-label="Progress" />
        </IntlProvider>
      </FluentProvider>
    );
    expect(screen.getByRole('listitem', { name: 'Validate workflow' })).toHaveAccessibleDescription('Terminé');
    expect(screen.getByRole('listitem', { name: 'Create resources' })).toHaveAccessibleDescription('En cours');
    expect(screen.getByRole('listitem', { name: 'Save workflow' })).toHaveAccessibleDescription(
      'Erreur The workflow could not be saved. Try again.'
    );
  });

  it.each([webLightTheme, webDarkTheme])('supports Fluent themes without changing milestone content', (theme) => {
    render(
      <FluentProvider theme={theme}>
        <IntlProvider locale="en">
          <ProgressStepper steps={steps} aria-label="Progress" />
        </IntlProvider>
      </FluentProvider>
    );
    expect(screen.getByRole('listitem', { name: 'Validate workflow' })).toHaveAccessibleDescription('Completed');
    expect(screen.getByRole('listitem', { name: 'Create resources' })).toHaveAccessibleDescription('In progress');
  });
});
