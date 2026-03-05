import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import { describe, vi, it, expect } from 'vitest';
import { FoundryAgentDetails, buildFoundryPortalUrl } from '../index';
import type { FoundryAgent, FoundryAgentVersion, FoundryModel } from '@microsoft/logic-apps-shared';

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

  const baseVersions: FoundryAgentVersion[] = [
    {
      id: 'agent-1:3',
      name: 'agent-1',
      version: '3',
      description: '',
      created_at: 1772564608,
      metadata: {},
      object: 'agent.version',
      definition: { kind: 'prompt', model: 'gpt-4', instructions: 'v3 instructions' },
    },
    {
      id: 'agent-1:2',
      name: 'agent-1',
      version: '2',
      description: '',
      created_at: 1770322055,
      metadata: {},
      object: 'agent.version',
      definition: { kind: 'prompt', model: 'gpt-35-turbo', instructions: 'v2 instructions' },
    },
  ];

  it('should render without crashing', () => {
    const tree = renderWithIntl(
      <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('should render with versions dropdown when versions are provided', () => {
    const tree = renderWithIntl(
      <FoundryAgentDetails
        agent={baseAgent}
        models={baseModels}
        onModelChange={vi.fn()}
        onInstructionsChange={vi.fn()}
        versions={baseVersions}
        selectedVersion="3"
        onVersionChange={vi.fn()}
      />
    );
    const json = tree.toJSON() as renderer.ReactTestRendererJSON;
    expect(json.children).toBeTruthy();
    expect(json.children!.length).toBeGreaterThan(0);
  });

  it('should render disabled version dropdown when no versions available', () => {
    const tree = renderWithIntl(
      <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} versions={[]} />
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('should show loading placeholder when versions are loading', () => {
    const tree = renderWithIntl(
      <FoundryAgentDetails
        agent={baseAgent}
        models={baseModels}
        onModelChange={vi.fn()}
        onInstructionsChange={vi.fn()}
        versionsLoading={true}
      />
    );
    expect(tree.toJSON()).toBeTruthy();
  });
});

describe('buildFoundryPortalUrl', () => {
  it('should return a portal URL when given a valid project resource ID', () => {
    const resourceId = '/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.CognitiveServices/accounts/acct-1/projects/proj-1';
    const url = buildFoundryPortalUrl(resourceId, 'agent-1');
    expect(url).toContain('https://ai.azure.com/');
    expect(url).toContain('agent-1');
  });

  it('should return undefined when projectResourceId is missing', () => {
    expect(buildFoundryPortalUrl(undefined, 'agent-1')).toBeUndefined();
  });

  it('should return undefined for an invalid resource ID', () => {
    expect(buildFoundryPortalUrl('/subscriptions/sub-1/resourceGroups/rg-1', 'agent-1')).toBeUndefined();
  });

  it('should use versionNumber as the version query param when provided', () => {
    const resourceId = '/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.CognitiveServices/accounts/acct-1/projects/proj-1';
    const url = buildFoundryPortalUrl(resourceId, 'agent-1', '5');
    expect(url).toContain('?version=5');
    expect(url).not.toContain('version=2');
  });

  it('should omit version query param when versionNumber is not provided', () => {
    const resourceId = '/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.CognitiveServices/accounts/acct-1/projects/proj-1';
    const url = buildFoundryPortalUrl(resourceId, 'agent-1');
    expect(url).not.toContain('?version=');
    expect(url).toContain('/build/agents/agent-1/build');
  });
});
