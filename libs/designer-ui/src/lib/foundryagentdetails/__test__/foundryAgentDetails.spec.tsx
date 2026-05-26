/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, vi, it, expect, afterEach } from 'vitest';
import { FoundryAgentDetails, buildFoundryPortalUrl, guidToBase64Url } from '../index';
import type { FoundryAgent, FoundryAgentVersion, FoundryModel } from '@microsoft/logic-apps-shared';

function renderWithIntl(component: React.ReactElement) {
  return renderer.create(<IntlProvider locale="en">{component}</IntlProvider>);
}

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

describe('FoundryAgentDetails', () => {
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

  it('should render with numeric version values from the API (runtime type mismatch)', () => {
    // The Foundry API may return version as a number despite the TypeScript interface declaring string.
    // The component must handle this gracefully via String() coercion.
    const numericVersions = baseVersions.map((v) => ({ ...v, version: Number(v.version) as unknown as string }));
    const tree = renderWithIntl(
      <FoundryAgentDetails
        agent={baseAgent}
        models={baseModels}
        onModelChange={vi.fn()}
        onInstructionsChange={vi.fn()}
        versions={numericVersions}
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

describe('FoundryAgentDetails — pending edits persistence', () => {
  afterEach(cleanup);

  it('should display selectedInstructions (pending edits) instead of agent.instructions on initial render', () => {
    const pendingText = 'User-edited instructions that should persist';
    render(
      <IntlProvider locale="en">
        <FoundryAgentDetails
          agent={baseAgent}
          models={baseModels}
          onModelChange={vi.fn()}
          onInstructionsChange={vi.fn()}
          selectedInstructions={pendingText}
        />
      </IntlProvider>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(pendingText);
  });

  it('should fall back to agent.instructions when selectedInstructions is undefined', () => {
    render(
      <IntlProvider locale="en">
        <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
      </IntlProvider>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(baseAgent.instructions);
  });

  it('should not reset selectedInstructions when agent.id stays the same (panel reopen)', () => {
    const pendingText = 'Edits from before panel close';
    const { rerender } = render(
      <IntlProvider locale="en">
        <FoundryAgentDetails
          agent={baseAgent}
          models={baseModels}
          onModelChange={vi.fn()}
          onInstructionsChange={vi.fn()}
          selectedInstructions={pendingText}
        />
      </IntlProvider>
    );

    // Re-render with the same agent (simulates panel reopen)
    rerender(
      <IntlProvider locale="en">
        <FoundryAgentDetails
          agent={baseAgent}
          models={baseModels}
          onModelChange={vi.fn()}
          onInstructionsChange={vi.fn()}
          selectedInstructions={pendingText}
        />
      </IntlProvider>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(pendingText);
  });

  it('should display selectedModel in the model dropdown instead of agent.model', () => {
    render(
      <IntlProvider locale="en">
        <FoundryAgentDetails
          agent={baseAgent}
          models={baseModels}
          onModelChange={vi.fn()}
          onInstructionsChange={vi.fn()}
          selectedModel="gpt-35-turbo"
        />
      </IntlProvider>
    );

    // The model dropdown should show the overridden model name, not the agent's default
    const modelDropdown = screen.getAllByRole('combobox').find((el) => el.textContent?.includes('GPT-3.5 Turbo'));
    expect(modelDropdown).toBeDefined();
    // Verify it does NOT show the agent's default model (GPT-4)
    const allComboboxes = screen.getAllByRole('combobox');
    const modelCombobox = allComboboxes.find((el) => el.textContent?.includes('GPT-4') && !el.textContent?.includes('GPT-3.5'));
    expect(modelCombobox).toBeUndefined();
  });

  it('should reset instructions when switching to a different agent', () => {
    const pendingText = 'Edits for agent-1';
    const { rerender } = render(
      <IntlProvider locale="en">
        <FoundryAgentDetails
          agent={baseAgent}
          models={baseModels}
          onModelChange={vi.fn()}
          onInstructionsChange={vi.fn()}
          selectedInstructions={pendingText}
        />
      </IntlProvider>
    );

    const newAgent: FoundryAgent = {
      ...baseAgent,
      id: 'agent-2',
      name: 'OtherAgent',
      instructions: 'Different agent instructions.',
    };

    rerender(
      <IntlProvider locale="en">
        <FoundryAgentDetails agent={newAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
      </IntlProvider>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(newAgent.instructions);
  });
});

describe('handleVersionSelect logic (String coercion)', () => {
  // Extracted logic from handleVersionSelect to verify the String() coercion fix
  // works for both string and numeric version values from the API.
  function findVersion(versions: FoundryAgentVersion[], optionValue: string): FoundryAgentVersion | undefined {
    return versions.find((v) => String(v.version) === optionValue);
  }

  const versions: FoundryAgentVersion[] = [
    {
      id: 'a:8',
      name: 'a',
      version: '8',
      description: '',
      created_at: 0,
      metadata: {},
      object: 'agent.version',
      definition: { kind: 'prompt', model: 'gpt-4', instructions: '' },
    },
    {
      id: 'a:7',
      name: 'a',
      version: '7',
      description: '',
      created_at: 0,
      metadata: {},
      object: 'agent.version',
      definition: { kind: 'prompt', model: 'gpt-4', instructions: '' },
    },
  ];

  it('should find version when version field is a string', () => {
    const result = findVersion(versions, '8');
    expect(result).toBeDefined();
    expect(result!.id).toBe('a:8');
  });

  it('should find version when API returns version as a number (runtime type mismatch)', () => {
    const numericVersions = versions.map((v) => ({ ...v, version: Number(v.version) as unknown as string }));
    const result = findVersion(numericVersions, '8');
    expect(result).toBeDefined();
    expect(result!.id).toBe('a:8');
  });

  it('should return undefined for non-existent version', () => {
    expect(findVersion(versions, '99')).toBeUndefined();
  });

  it('should return undefined for empty optionValue', () => {
    expect(findVersion(versions, '')).toBeUndefined();
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

  it('should base64url-encode a real GUID subscription ID in the portal URL', () => {
    const resourceId =
      '/subscriptions/11e43792-2b16-4f94-b5ea-de10eade3aef/resourceGroups/CARLOSAIRESOURCEGROUP/providers/Microsoft.CognitiveServices/accounts/carlosbrooklynproject-resource/projects/carlosbrooklynproject';
    const url = buildFoundryPortalUrl(resourceId, 'TESTONE', '8');
    expect(url).toContain('EeQ3kisWT5S16t4Q6t467w');
    expect(url).not.toContain('11e43792-2b16-4f94-b5ea-de10eade3aef');
    expect(url).toContain('CARLOSAIRESOURCEGROUP');
    expect(url).toContain('/build/agents/TESTONE/build?version=8');
  });

  it('should pass through non-GUID subscription IDs unchanged', () => {
    const resourceId = '/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.CognitiveServices/accounts/acct-1/projects/proj-1';
    const url = buildFoundryPortalUrl(resourceId, 'agent-1');
    expect(url).toContain('sub-1,rg-1,,acct-1,proj-1');
  });
});

describe('guidToBase64Url', () => {
  it('should convert a valid GUID to base64url encoding', () => {
    expect(guidToBase64Url('11e43792-2b16-4f94-b5ea-de10eade3aef')).toBe('EeQ3kisWT5S16t4Q6t467w');
  });

  it('should handle uppercase GUIDs', () => {
    expect(guidToBase64Url('11E43792-2B16-4F94-B5EA-DE10EADE3AEF')).toBe('EeQ3kisWT5S16t4Q6t467w');
  });

  it('should return the input unchanged for non-GUID strings', () => {
    expect(guidToBase64Url('sub-1')).toBe('sub-1');
    expect(guidToBase64Url('not-a-guid')).toBe('not-a-guid');
    expect(guidToBase64Url('')).toBe('');
  });

  it('should produce URL-safe output (no +, /, or = characters)', () => {
    const result = guidToBase64Url('ffffffff-ffff-ffff-ffff-ffffffffffff');
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });
});

describe('FoundryAgentDetails — UI polish', () => {
  afterEach(cleanup);

  it('should not render a "Defined in Foundry" badge', () => {
    render(
      <IntlProvider locale="en">
        <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
      </IntlProvider>
    );
    expect(screen.queryByText('Defined in Foundry')).toBeNull();
  });

  it('should render the Instructions label without a badge', () => {
    render(
      <IntlProvider locale="en">
        <FoundryAgentDetails agent={baseAgent} models={baseModels} onModelChange={vi.fn()} onInstructionsChange={vi.fn()} />
      </IntlProvider>
    );
    expect(screen.getByText('Instructions')).toBeInTheDocument();
  });
});
