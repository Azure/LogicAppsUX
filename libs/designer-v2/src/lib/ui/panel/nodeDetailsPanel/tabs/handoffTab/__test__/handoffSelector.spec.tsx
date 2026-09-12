/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { IntlProvider } from 'react-intl';

const mockDispatch = vi.fn();

let handoffActions: { toolId: string; targetId: string }[] = [];
let allAgentIds: string[] = [];
let selectedPanelNodeId = 'SalesAgent';

vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-redux')>();
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    LoggerService: () => ({ log: vi.fn() }),
  };
});

vi.mock('../../../../../../core/state/workflow/workflowSelectors', () => ({
  useAllAgentIds: () => allAgentIds,
  useHandoffActionsForAgent: () => handoffActions,
  useNodeDisplayName: (id: string) => id,
}));

vi.mock('../../../../../../core', () => ({
  useOperationPanelSelectedNodeId: () => selectedPanelNodeId,
}));

vi.mock('../../../../../../core/state/operation/operationSelector', () => ({
  useOperationVisuals: () => ({ iconUri: 'icon.png' }),
}));

vi.mock('../../../../../../core/actions/bjsworkflow/handoff', () => ({
  addAgentHandoff: vi.fn((payload) => ({ type: 'addAgentHandoff', payload })),
  removeAgentHandoff: vi.fn((payload) => ({ type: 'removeAgentHandoff', payload })),
}));

import { addAgentHandoff, removeAgentHandoff } from '../../../../../../core/actions/bjsworkflow/handoff';
import { HandoffSelector } from '../HandoffSelector';

const renderSelector = (agentId = 'SalesAgent', readOnly = false) =>
  render(
    <IntlProvider locale="en" messages={{}}>
      <HandoffSelector agentId={agentId} readOnly={readOnly} />
    </IntlProvider>
  );

const openSelector = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /select agents/i }));
  return screen.findAllByRole('menuitemcheckbox');
};

describe('HandoffSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allAgentIds = ['TriageAgent', 'SalesAgent', 'RefundAgent'];
    handoffActions = [];
    selectedPanelNodeId = 'SalesAgent';
  });

  afterEach(() => {
    cleanup();
  });

  it('lists every agent except the one the panel is open on', async () => {
    const user = userEvent.setup();
    renderSelector();

    const items = await openSelector(user);
    expect(items.map((item) => item.textContent)).toEqual(['TriageAgent', 'RefundAgent']);
  });

  it('checks the agents that already have a handoff', async () => {
    handoffActions = [{ toolId: 'handoff_to_TriageAgent_from_SalesAgent', targetId: 'TriageAgent' }];
    const user = userEvent.setup();
    renderSelector();

    const items = await openSelector(user);
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('adds a handoff when an unchecked agent is selected', async () => {
    const user = userEvent.setup();
    renderSelector();

    const items = await openSelector(user);
    await user.click(items[1]);

    expect(addAgentHandoff).toHaveBeenCalledWith({ sourceId: 'SalesAgent', targetId: 'RefundAgent' });
    expect(removeAgentHandoff).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'addAgentHandoff',
      payload: { sourceId: 'SalesAgent', targetId: 'RefundAgent' },
    });
  });

  it('removes only the unchecked handoff when several are selected', async () => {
    handoffActions = [
      { toolId: 'handoff_to_TriageAgent_from_SalesAgent', targetId: 'TriageAgent' },
      { toolId: 'handoff_to_RefundAgent_from_SalesAgent', targetId: 'RefundAgent' },
    ];
    const user = userEvent.setup();
    renderSelector();

    const items = await openSelector(user);
    await user.click(items[0]);

    expect(removeAgentHandoff).toHaveBeenCalledTimes(1);
    expect(removeAgentHandoff).toHaveBeenCalledWith({
      agentId: 'SalesAgent',
      toolId: 'handoff_to_TriageAgent_from_SalesAgent',
    });
    expect(addAgentHandoff).not.toHaveBeenCalled();
  });

  // Regression test: the handler used to bail out whenever `checkedItems` became empty, which made an
  // agent's last handoff impossible to remove from this menu.
  it('removes the handoff when the only checked agent is unchecked', async () => {
    handoffActions = [{ toolId: 'handoff_to_TriageAgent_from_SalesAgent', targetId: 'TriageAgent' }];
    const user = userEvent.setup();
    renderSelector();

    const items = await openSelector(user);
    await user.click(items[0]);

    expect(removeAgentHandoff).toHaveBeenCalledWith({
      agentId: 'SalesAgent',
      toolId: 'handoff_to_TriageAgent_from_SalesAgent',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'removeAgentHandoff',
      payload: { agentId: 'SalesAgent', toolId: 'handoff_to_TriageAgent_from_SalesAgent' },
    });
  });

  it('filters the agent list by the search text', async () => {
    const user = userEvent.setup();
    renderSelector();

    await user.click(screen.getByRole('button', { name: /select agents/i }));
    await user.type(screen.getByPlaceholderText('Filter agents'), 'Refund');

    const items = await screen.findAllByRole('menuitemcheckbox');
    expect(items.map((item) => item.textContent)).toEqual(['RefundAgent']);
  });

  it('disables the agent options when read only', async () => {
    const user = userEvent.setup();
    renderSelector('SalesAgent', true);

    const items = await openSelector(user);
    for (const item of items) {
      expect(item.getAttribute('aria-disabled')).toBe('true');
    }
  });
});
