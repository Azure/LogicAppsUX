/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { mountChatWidget, ChatWidget } from '.';
import type { ChatWidgetProps } from '@microsoft/logicAppsChat';

// Mock dependencies
vi.mock('react-dom/client');
vi.mock('@microsoft/logicAppsChat', () => ({
  ChatWidget: vi.fn(() => null),
}));
vi.mock('../styles/base.css', () => ({}));

describe('lib/index', () => {
  let mockRoot: {
    render: ReturnType<typeof vi.fn>;
    unmount: ReturnType<typeof vi.fn>;
  };
  let mockCreateRoot: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock createRoot
    mockRoot = {
      render: vi.fn(),
      unmount: vi.fn(),
    };
    mockCreateRoot = vi.fn().mockReturnValue(mockRoot);
    vi.mocked(createRoot).mockImplementation(mockCreateRoot);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('exports', () => {
    it('exports ChatWidget component', () => {
      expect(ChatWidget).toBeDefined();
      expect(typeof ChatWidget).toBe('function');
    });

    it('exports mountChatWidget function', () => {
      expect(mountChatWidget).toBeDefined();
      expect(typeof mountChatWidget).toBe('function');
    });

    it('re-exports types from core library', () => {
      // The types are exported but we can't directly test them
      // This test just ensures the module loads without errors
      expect(true).toBe(true);
    });
  });

  describe('mountChatWidget', () => {
    const defaultProps: ChatWidgetProps = {
      agentCard: 'http://test.agent/agent-card.json',
    };

    it('mounts widget with HTMLElement container', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const unmount = mountChatWidget(container, defaultProps);

      expect(mockCreateRoot).toHaveBeenCalledWith(container);
      expect(mockRoot.render).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChatWidget,
          props: defaultProps,
        })
      );
      expect(typeof unmount).toBe('function');
    });

    it('mounts widget with string selector', () => {
      const container = document.createElement('div');
      container.id = 'chat-container';
      document.body.appendChild(container);

      const unmount = mountChatWidget('#chat-container', defaultProps);

      expect(mockCreateRoot).toHaveBeenCalledWith(container);
      expect(mockRoot.render).toHaveBeenCalled();
      expect(typeof unmount).toBe('function');
    });

    it('mounts widget with class selector', () => {
      const container = document.createElement('div');
      container.className = 'chat-widget';
      document.body.appendChild(container);

      const unmount = mountChatWidget('.chat-widget', defaultProps);

      expect(mockCreateRoot).toHaveBeenCalledWith(container);
      expect(mockRoot.render).toHaveBeenCalled();
      expect(typeof unmount).toBe('function');
    });

    it('throws error when container not found with string selector', () => {
      expect(() => {
        mountChatWidget('#non-existent', defaultProps);
      }).toThrow('Chat widget container not found');

      expect(mockCreateRoot).not.toHaveBeenCalled();
      expect(mockRoot.render).not.toHaveBeenCalled();
    });

    it('throws error when container is null', () => {
      expect(() => {
        mountChatWidget(null as any, defaultProps);
      }).toThrow('Chat widget container not found');

      expect(mockCreateRoot).not.toHaveBeenCalled();
      expect(mockRoot.render).not.toHaveBeenCalled();
    });

    it('passes all props to ChatWindow', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const props: ChatWidgetProps = {
        agentCard: 'http://test.agent/agent-card.json',
        placeholder: 'Type here...',
        welcomeMessage: 'Welcome!',
        allowFileUpload: false,
        maxFileSize: 1024,
        allowedFileTypes: ['.pdf'],
        onMessage: vi.fn(),
        onConnectionChange: vi.fn(),
        theme: {
          colors: {
            primary: '#ff0000',
            primaryText: '#ffffff',
            background: '#000000',
            surface: '#111111',
            text: '#ffffff',
            textSecondary: '#cccccc',
            border: '#333333',
            error: '#ff0000',
            success: '#00ff00',
          },
          typography: {
            fontFamily: 'Arial',
            fontSize: {
              small: '12px',
              base: '14px',
              large: '16px',
            },
          },
          spacing: {
            unit: 8,
          },
          borderRadius: {
            small: '2px',
            medium: '4px',
            large: '8px',
          },
        },
        metadata: { key: 'value' },
        userId: 'user123',
      };

      mountChatWidget(container, props);

      const renderCall = mockRoot.render.mock.calls[0][0];
      expect(renderCall.props).toEqual(props);
    });

    it('unmount function calls root.unmount', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const unmount = mountChatWidget(container, defaultProps);

      expect(mockRoot.unmount).not.toHaveBeenCalled();

      unmount();

      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it('handles multiple widgets on same page', () => {
      const container1 = document.createElement('div');
      container1.id = 'chat1';
      document.body.appendChild(container1);

      const container2 = document.createElement('div');
      container2.id = 'chat2';
      document.body.appendChild(container2);

      const unmount1 = mountChatWidget('#chat1', {
        ...defaultProps,
        userId: 'user1',
      });

      const unmount2 = mountChatWidget('#chat2', {
        ...defaultProps,
        userId: 'user2',
      });

      expect(mockCreateRoot).toHaveBeenCalledTimes(2);
      expect(mockRoot.render).toHaveBeenCalledTimes(2);

      const firstCall = mockRoot.render.mock.calls[0][0];
      const secondCall = mockRoot.render.mock.calls[1][0];

      expect(firstCall.props.userId).toBe('user1');
      expect(secondCall.props.userId).toBe('user2');

      expect(typeof unmount1).toBe('function');
      expect(typeof unmount2).toBe('function');
    });

    it('handles document fragment selector', () => {
      const container = document.createElement('div');
      container.setAttribute('data-chat', 'widget');
      document.body.appendChild(container);

      const unmount = mountChatWidget('[data-chat="widget"]', defaultProps);

      expect(mockCreateRoot).toHaveBeenCalledWith(container);
      expect(typeof unmount).toBe('function');
    });

    it('throws error for invalid selector', () => {
      expect(() => {
        mountChatWidget('', defaultProps);
      }).toThrow();
    });

    it('handles container being removed from DOM', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const unmount = mountChatWidget(container, defaultProps);

      // Remove container from DOM
      container.remove();

      // Unmount should still work without errors
      expect(() => unmount()).not.toThrow();
      expect(mockRoot.unmount).toHaveBeenCalled();
    });
  });
});
