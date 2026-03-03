import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { FoundryAgentDetails } from '../index';
import type { FoundryAgent, FoundryModel } from '@microsoft/logic-apps-shared';

describe('FoundryAgentDetails', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

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

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render without crashing', () => {
    renderer.render(<FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />);
    const output = renderer.getRenderOutput();
    expect(output).toBeTruthy();
    expect(output.type).toBe('div');
  });

  it('should render version text', () => {
    renderer.render(<FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />);
    const output = renderer.getRenderOutput();
    const children = React.Children.toArray(output.props.children);
    // First child is the version row
    expect(children.length).toBeGreaterThan(0);
  });

  it('should render tools summary as "None" when no tools', () => {
    renderer.render(<FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />);
    const output = renderer.getRenderOutput();
    expect(output).toBeTruthy();
  });

  it('should render portal link when projectResourceId is provided', () => {
    const resourceId = '/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.CognitiveServices/accounts/acct-1/projects/proj-1';
    renderer.render(
      <FoundryAgentDetails
        agent={baseAgent}
        models={baseModels}
        onModelChange={vi.fn()}
        onInstructionsChange={vi.fn()}
        projectResourceId={resourceId}
      />
    );
    const output = renderer.getRenderOutput();
    const children = React.Children.toArray(output.props.children);
    // Last child should be the portal link
    const lastChild = children[children.length - 1] as React.ReactElement;
    expect(lastChild).toBeTruthy();
    expect(lastChild.props.href).toContain('ai.azure.com');
    expect(lastChild.props.href).toContain('agent-1');
  });

  it('should not render portal link when projectResourceId is missing', () => {
    renderer.render(<FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />);
    const output = renderer.getRenderOutput();
    const children = React.Children.toArray(output.props.children);
    // Without projectResourceId, the last child should NOT be a link
    const lastChild = children[children.length - 1] as React.ReactElement;
    expect(lastChild.props.href).toBeUndefined();
  });

  it('should render agent with tools summary', () => {
    const agentWithTools: FoundryAgent = {
      ...baseAgent,
      tools: [{ type: 'code_interpreter' }, { type: 'file_search' }],
    };
    renderer.render(
      <FoundryAgentDetails agent={agentWithTools} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
    );
    const output = renderer.getRenderOutput();
    expect(output).toBeTruthy();
  });
});
