import type { CopyInputControlProps } from '..';
import { CopyInputControl } from '..';
import type { CopyInputControlWithAgentProps } from '../CopyInputControlWithAgent';
import { CopyInputControlWithAgent } from '../CopyInputControlWithAgent';
import renderer from 'react-test-renderer';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as AgentUrlViewerModule from '../AgentUrlViewer';
import * as logicAppsShared from '@microsoft/logic-apps-shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let agentUrlViewerSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  agentUrlViewerSpy = vi.spyOn(AgentUrlViewerModule, 'AgentUrlViewer').mockImplementation(() => null);
  vi.spyOn(logicAppsShared, 'LoggerService').mockReturnValue({
    log: vi.fn(),
    startTrace: vi.fn(),
    endTrace: vi.fn(),
    logErrorWithFormatting: vi.fn(),
  } as any);
});

describe('lib/copyinputcontrol', () => {
  let minimal: CopyInputControlProps;
  let minimalWithAgent: CopyInputControlWithAgentProps;

  const renderWithProvider = (component: React.ReactElement) => {
    return renderer.create(component);
  };

  beforeEach(() => {
    minimal = {
      placeholder: 'URL goes here',
      text: 'http://test.com',
    };

    minimalWithAgent = {
      placeholder: 'URL goes here',
      text: 'http://test.com',
    };
  });

  it('should construct the copyinputcontrol correctly', () => {
    const tree = renderWithProvider(<CopyInputControl {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should set the aria-labelledby attribute', () => {
    const tree = renderWithProvider(<CopyInputControl {...minimal} ariaLabelledBy="aria-labelledby" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with popup button when showAgentViewer is true', () => {
    const tree = renderWithProvider(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render basic CopyInputControl without agent functionality', () => {
    const tree = renderWithProvider(<CopyInputControl {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('agent navigation sinks consume only the chatUrl/queryParams received as props (real, unmocked navigation components)', () => {
    it('direct popup (no queryParams): window.open receives exactly the trusted chatUrl prop', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} chatUrl="https://trusted.example.invalid/chat" />);

        await userEvent.click(screen.getByLabelText('Open in popup'));

        expect(windowOpenSpy).toHaveBeenCalledTimes(1);
        expect(windowOpenSpy).toHaveBeenCalledWith('https://trusted.example.invalid/chat', '_blank', 'noopener,noreferrer');
      } finally {
        windowOpenSpy.mockRestore();
      }
    });

    it('iframe sink (queryParams present): real AgentUrlViewer renders the iframe src built exclusively from the trusted chatUrl/queryParams props', async () => {
      // Un-mock AgentUrlViewer for this test only, to exercise the real iframe-src sink
      // rather than the file-level mocked-copy snapshot.
      agentUrlViewerSpy.mockRestore();

      render(
        <CopyInputControlWithAgent
          {...minimalWithAgent}
          showAgentViewer={true}
          chatUrl="https://trusted.example.invalid/chat"
          queryParams={{ apiKey: 'trusted-key' }}
        />
      );

      await userEvent.click(screen.getByLabelText('Open in popup'));

      const iframe = await screen.findByTitle('Agent URL Preview');
      const src = iframe.getAttribute('src');
      expect(src).toBe('https://trusted.example.invalid/chat?apiKey=trusted-key');
    });
  });

  describe('destination-safety boundary: unsafe/absent chatUrl must never reach a navigation sink', () => {
    it('direct popup (no queryParams): a javascript: chatUrl is blocked, window.open is never called', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} chatUrl="javascript:alert(1)" />);

        await userEvent.click(screen.getByLabelText('Open in popup'));

        expect(windowOpenSpy).not.toHaveBeenCalled();
      } finally {
        windowOpenSpy.mockRestore();
      }
    });

    it('direct popup (no queryParams): a malformed chatUrl is blocked, window.open is never called', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} chatUrl="not-a-url" />);

        await userEvent.click(screen.getByLabelText('Open in popup'));

        expect(windowOpenSpy).not.toHaveBeenCalled();
      } finally {
        windowOpenSpy.mockRestore();
      }
    });

    it('direct popup (no queryParams): an absent chatUrl never opens a blank/undefined window', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} chatUrl={undefined} />);

        await userEvent.click(screen.getByLabelText('Open in popup'));

        expect(windowOpenSpy).not.toHaveBeenCalled();
      } finally {
        windowOpenSpy.mockRestore();
      }
    });

    it('direct popup (no queryParams): the documented http loopback preview host (localhost) still opens (regression)', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} chatUrl="http://localhost:3000/chat" />);

        await userEvent.click(screen.getByLabelText('Open in popup'));

        expect(windowOpenSpy).toHaveBeenCalledWith('http://localhost:3000/chat', '_blank', 'noopener,noreferrer');
      } finally {
        windowOpenSpy.mockRestore();
      }
    });

    it('iframe sink (queryParams is an empty object {}): an unsafe chatUrl renders no iframe and the fallback never opens a blank window', async () => {
      agentUrlViewerSpy.mockRestore();
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} chatUrl="javascript:alert(1)" queryParams={{}} />);

        await userEvent.click(screen.getByLabelText('Open in popup'));

        expect(screen.queryByTitle('Agent URL Preview')).toBeNull();

        expect(screen.queryByRole('button', { name: 'Open Chat in New Tab' })).toBeNull();
        expect(windowOpenSpy).not.toHaveBeenCalled();
      } finally {
        windowOpenSpy.mockRestore();
      }
    });

    it('iframe sink (queryParams populated with apiKey): an unsafe chatUrl renders no iframe, but the unrelated apiKey copy field is preserved', async () => {
      agentUrlViewerSpy.mockRestore();

      render(
        <CopyInputControlWithAgent
          {...minimalWithAgent}
          showAgentViewer={true}
          chatUrl="data:text/html,<script>alert(1)</script>"
          queryParams={{ apiKey: 'trusted-key' }}
        />
      );

      await userEvent.click(screen.getByLabelText('Open in popup'));

      expect(screen.queryByTitle('Agent URL Preview')).toBeNull();
      // The apiKey copy box is sourced from the already-trusted queryParams prop (not the
      // destination), so it must remain unaffected by the destination-safety boundary.
      expect(screen.getByText('Agent API key (valid for 24 hours)')).toBeInTheDocument();
    });

    it('iframe sink (queryParams populated): a differing legitimate https cloud origin still renders the iframe (regression)', async () => {
      agentUrlViewerSpy.mockRestore();

      render(
        <CopyInputControlWithAgent
          {...minimalWithAgent}
          showAgentViewer={true}
          chatUrl="https://another-cloud-host.example.invalid/agent"
          queryParams={{ apiKey: 'trusted-key' }}
        />
      );

      await userEvent.click(screen.getByLabelText('Open in popup'));

      const iframe = await screen.findByTitle('Agent URL Preview');
      expect(iframe.getAttribute('src')).toBe('https://another-cloud-host.example.invalid/agent?apiKey=trusted-key');
    });

    it('iframe sink (queryParams is an empty object {}): the documented http loopback preview host (127.0.0.1) still renders the iframe (regression)', async () => {
      agentUrlViewerSpy.mockRestore();

      render(
        <CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} chatUrl="http://127.0.0.1:3000/chat" queryParams={{}} />
      );

      await userEvent.click(screen.getByLabelText('Open in popup'));

      const iframe = await screen.findByTitle('Agent URL Preview');
      expect(iframe.getAttribute('src')).toBe('http://127.0.0.1:3000/chat');
    });

    it('scheme smuggling (mixed case + embedded control character) is blocked at the iframe sink, not just a string-prefix check', async () => {
      agentUrlViewerSpy.mockRestore();
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(
          <CopyInputControlWithAgent
            {...minimalWithAgent}
            showAgentViewer={true}
            chatUrl={'Java\tScript:alert(1)'}
            queryParams={{ apiKey: 'trusted-key' }}
          />
        );

        await userEvent.click(screen.getByLabelText('Open in popup'));

        expect(screen.queryByTitle('Agent URL Preview')).toBeNull();
        expect(windowOpenSpy).not.toHaveBeenCalled();
      } finally {
        windowOpenSpy.mockRestore();
      }
    });
  });
});
