import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import { describe, vi, it, expect } from 'vitest';
import { FoundryAgentDetails } from '../index';
import type { FoundryAgent, FoundryModel } from '@microsoft/logic-apps-shared';

function renderWithIntl(component: React.ReactElement) {
  return renderer.create(<IntlProvider locale="en">{component}</IntlProvider>);
}

describe('FoundryAgentDetails', () => {
  const baseAgent: FoundryAgent = {
    id: 'agent-1',
    name: 'TestAgent',
    model: 'gpt-4',
    instructions: 'You are a helpful assistant.',
    tools: [],
    metadata: {},
    created_at: 1700000000,
    object: 'agent',
    description: 'Test agent',
  };

  const baseModels: FoundryModel[] = [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo' },
  ];

  it('should render without crashing', () => {
    const tree = renderWithIntl(
      <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('should render version text', () => {
    const tree = renderWithIntl(
      <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
    );
    const json = tree.toJSON() as renderer.ReactTestRendererJSON;
    expect(json.children).toBeTruthy();
    expect(json.children!.length).toBeGreaterThan(0);
  });

  it('should render portal link when projectResourceId is provided', () => {
    const resourceId = '/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.CognitiveServices/accounts/acct-1/projects/proj-1';
    const tree = renderWithIntl(
      <FoundryAgentDetails
        agent={baseAgent}
        models={baseModels}
        onModelChange={vi.fn()}
        onInstructionsChange={vi.fn()}
        projectResourceId={resourceId}
      />
    );
    const root = tree.root;
    // Find the Link element (rendered as an anchor with href)
    const links = root.findAll(
      (node) => node.props.href && typeof node.props.href === 'string' && node.props.href.startsWith('https://ai.azure.com/')
    );
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].props.href).toContain('agent-1');
  });

  it('should not render portal link when projectResourceId is missing', () => {
    const tree = renderWithIntl(
      <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
    );
    const root = tree.root;
    const links = root.findAll(
      (node) => node.props.href && typeof node.props.href === 'string' && node.props.href.startsWith('https://ai.azure.com/')
    );
    expect(links.length).toBe(0);
  });
});
