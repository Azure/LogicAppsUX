import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { OverviewCommandBar, type OverviewCommandBarProps } from '../overviewcommandbar';
import { describe, vi, beforeEach, beforeAll, it, expect } from 'vitest';
import React from 'react';
import { IntlProvider } from 'react-intl';

describe('lib/overview/overviewcommandbar', () => {
  let minimal: OverviewCommandBarProps;

  const renderComponent = (props: OverviewCommandBarProps) =>
    renderer.create(
      <IntlProvider locale="en" messages={{}}>
        <OverviewCommandBar {...props} />
      </IntlProvider>
    );

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      onRefresh: vi.fn(),
      onRunTrigger: vi.fn(),
    };
  });

  it('renders', () => {
    const tree = renderComponent(minimal).toJSON();
    expect(tree).toBeTruthy();
  });

  it('disables Run trigger when runnable callback info is unavailable', () => {
    const component = renderComponent({
      ...minimal,
      isWorkflowRuntimeRunning: true,
    });

    const runTriggerButton = component.root.find((node) => node.props['aria-label'] === 'Run trigger');
    expect(runTriggerButton.props.disabled).toBe(true);
  });

  it('enables Run trigger when runtime is running and callback info is available', () => {
    const component = renderComponent({
      ...minimal,
      canRunTrigger: true,
      isWorkflowRuntimeRunning: true,
    });

    const runTriggerButton = component.root.find((node) => node.props['aria-label'] === 'Run trigger');
    expect(runTriggerButton.props.disabled).toBe(false);
  });

  it('keeps Run trigger disabled when runtime is stopped', () => {
    const component = renderComponent({
      ...minimal,
      canRunTrigger: true,
      isWorkflowRuntimeRunning: false,
    });

    const runTriggerButton = component.root.find((node) => node.props['aria-label'] === 'Run trigger');
    expect(runTriggerButton.props.disabled).toBe(true);
  });
});
