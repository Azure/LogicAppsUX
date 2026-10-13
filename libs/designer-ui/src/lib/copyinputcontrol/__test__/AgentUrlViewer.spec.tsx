// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Simulate } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as logicAppsShared from '@microsoft/logic-apps-shared';
import { AgentUrlViewer } from '../AgentUrlViewer';

describe('AgentUrlViewer recovery action', () => {
  beforeEach(() => {
    vi.spyOn(logicAppsShared, 'LoggerService').mockReturnValue({
      log: vi.fn(),
      startTrace: vi.fn(),
      endTrace: vi.fn(),
      logErrorWithFormatting: vi.fn(),
    });
  });

  it.each(['javascript:alert(1)', 'not-a-url', ''])('does not offer a retry for a blocked destination: %s', (url) => {
    render(<AgentUrlViewer url={url} isOpen={true} onClose={vi.fn()} />);

    expect(screen.queryByTitle('Agent URL Preview')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open Chat in New Tab' })).toBeNull();
    expect(screen.getByText(/The agent chat interface cannot be displayed/)).toBeInTheDocument();
  });

  it('preserves new-tab recovery for a safe destination after an iframe load error', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <AgentUrlViewer url="https://trusted.example.invalid/chat" queryParams={{ apiKey: 'test-key' }} isOpen={true} onClose={vi.fn()} />
    );

    act(() => Simulate.error(screen.getByTitle('Agent URL Preview')));
    await userEvent.click(screen.getByRole('button', { name: 'Open Chat in New Tab' }));

    expect(openSpy).toHaveBeenCalledWith('https://trusted.example.invalid/chat?apiKey=test-key', '_blank', 'noopener,noreferrer');
  });
});
