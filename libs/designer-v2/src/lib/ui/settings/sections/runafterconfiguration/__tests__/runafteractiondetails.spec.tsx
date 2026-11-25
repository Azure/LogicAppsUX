import { RunAfterActionDetails } from '../runafteractiondetails';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../core/state/workflow/workflowSelectors', () => ({
  useNodeDisplayName: (id: string) => id,
}));
vi.mock('../../../../../core/state/operation/operationSelector', () => ({
  useOperationVisuals: () => ({ iconUri: '' }),
}));

describe('original Run After accessible names', () => {
  it.each([
    ['Compose', 'Compose Compose'],
    ['Compose "quoted" [x] & 日本語', 'Compose "quoted" [x] & 日本語 Compose "quoted" [x] & 日本語'],
    ['Compose %s', 'Compose Compose %s'],
    ['Compose %d', 'Compose NaN'],
    ['Compose %j', 'Compose "Compose %j"'],
    ['Compose %%', 'Compose % Compose %%'],
    ['Compose %s %d', 'Compose Compose %s %d %d'],
  ])('expands, changes status and collapses the real product DOM for %s', async (title, suffix) => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    function StatefulDetails() {
      const [statuses, setStatuses] = useState(['SUCCEEDED']);
      return (
        <RunAfterActionDetails
          id={title}
          expanded={false}
          disableDelete={true}
          disableStatusChange={false}
          readOnly={false}
          statuses={statuses}
          onStatusChange={(status, checked) => {
            onStatusChange(status, checked);
            setStatuses((previous) => (checked ? [...previous, status] : previous.filter((value) => value !== status)));
          }}
        />
      );
    }
    const { container } = render(<StatefulDetails />);
    const row = container.querySelector('.msla-run-after-edge-header') as HTMLElement;
    expect(row.querySelector('.msla-run-after-node-title')).toHaveTextContent(title);
    // Literal names exercise util.format in the actual Fluent DOM, including
    // titles for which simply duplicating the title would be incorrect.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: `Expand ${suffix}`, exact: true }));
    expect(within(row).getByRole('button', { name: `Collapse ${suffix}`, exact: true })).toBeVisible();
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(screen.getByRole('checkbox', { name: 'Is successful' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Has failed' }));
    expect(onStatusChange).toHaveBeenLastCalledWith('FAILED', true);
    await user.click(screen.getByRole('checkbox', { name: 'Is successful' }));
    expect(onStatusChange).toHaveBeenLastCalledWith('SUCCEEDED', false);
    expect(screen.getByRole('checkbox', { name: 'Has failed' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Has failed' })).toBeDisabled();
    await user.click(within(row).getByRole('button', { name: `Collapse ${suffix}`, exact: true }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: `Expand ${suffix}`, exact: true }));
    expect(screen.getByRole('checkbox', { name: 'Has failed' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Is successful' })).not.toBeChecked();
  });
});
