import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock all hooks used by AboutTab
vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useHostOptions: vi.fn(),
}));

vi.mock('../../../../../core/state/selectors/actionMetadataSelector', () => ({
  useConnectorEnvironmentBadge: vi.fn(),
  useConnectorName: vi.fn(),
  useConnectorStatusBadge: vi.fn(),
  useOperationDescription: vi.fn(),
  useOperationDocumentation: vi.fn(),
  useOperationInfo: vi.fn(),
}));

vi.mock('@microsoft/designer-ui', () => ({
  About: vi.fn(({ connectorDisplayName, description, isLoading, connectorType }: any) => (
    <div data-testid="about-component">
      <span data-testid="connector-name">{connectorDisplayName}</span>
      <span data-testid="description">{description}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="connector-type">{connectorType}</span>
    </div>
  )),
  getConnectorCategoryString: vi.fn(() => 'Built-in'),
  getConnectorAllCategories: vi.fn(() => ({ inapp: 'In App' })),
}));

import { AboutTab } from '../aboutTab';
import { useHostOptions } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useConnectorEnvironmentBadge,
  useConnectorName,
  useConnectorStatusBadge,
  useOperationDescription,
  useOperationDocumentation,
  useOperationInfo,
} from '../../../../../core/state/selectors/actionMetadataSelector';
import { screen } from '@testing-library/react';

describe('AboutTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useHostOptions as any).mockReturnValue({ displayRuntimeInfo: false });
    (useOperationInfo as any).mockReturnValue({ connectorId: 'test-connector', operationId: 'test-op' });
    (useConnectorName as any).mockReturnValue({ result: 'Test Connector', isLoading: false });
    (useOperationDescription as any).mockReturnValue({ result: 'Test description' });
    (useOperationDocumentation as any).mockReturnValue({ result: undefined });
    (useConnectorEnvironmentBadge as any).mockReturnValue({ result: undefined });
    (useConnectorStatusBadge as any).mockReturnValue({ result: undefined });
  });

  it('should render About component for a regular node', () => {
    render(<AboutTab nodeId="regular-node" />);

    expect(screen.getByTestId('connector-name').textContent).toBe('Test Connector');
    expect(screen.getByTestId('description').textContent).toBe('Test description');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('should render built-in tool info for code_interpreter', () => {
    (useOperationInfo as any).mockReturnValue(undefined); // No operation info for built-in tools

    render(<AboutTab nodeId="code_interpreter" />);

    expect(screen.getByTestId('connector-name').textContent).toBe('Code Interpreter');
    expect(screen.getByTestId('description').textContent).toBe(
      'Code Interpreter is a built-in tool that allows agents to write and execute code to solve problems.'
    );
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('should set connector type to In App for built-in tools', () => {
    (useOperationInfo as any).mockReturnValue(undefined);

    render(<AboutTab nodeId="code_interpreter" />);

    expect(screen.getByTestId('connector-type').textContent).toBe('In App');
  });

  it('should show loading state from connector name for regular nodes', () => {
    (useConnectorName as any).mockReturnValue({ result: undefined, isLoading: true });

    render(<AboutTab nodeId="regular-node" />);

    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('should not show loading for built-in tools even when connector name is loading', () => {
    (useOperationInfo as any).mockReturnValue(undefined);
    (useConnectorName as any).mockReturnValue({ result: undefined, isLoading: true });

    render(<AboutTab nodeId="code_interpreter" />);

    expect(screen.getByTestId('loading').textContent).toBe('false');
  });
});
