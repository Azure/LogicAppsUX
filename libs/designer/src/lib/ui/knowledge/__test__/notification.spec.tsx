/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach, type Mock } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ToasterNotification, type NotificationType } from '../notification';

// Mock useId to return predictable values
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useId: (prefix: string) => `${prefix}-test-id`,
  };
});

// Mock Fluent UI Toast components
const mockDispatchToast = vi.fn();
const mockUseToastController = vi.fn(() => ({
  dispatchToast: mockDispatchToast,
}));

vi.mock('@fluentui/react-components', () => ({
  useId: (prefix: string) => `${prefix}-test-id`,
  Toaster: ({ toasterId, offset }: { toasterId: string; offset: { horizontal: number; vertical: number } }) => (
    <div data-testid="toaster" data-toaster-id={toasterId} data-offset-h={offset.horizontal} data-offset-v={offset.vertical} />
  ),
  useToastController: () => mockUseToastController(),
  Toast: ({ children }: { children: React.ReactNode }) => <div data-testid="toast">{children}</div>,
  ToastTitle: ({ children }: { children: React.ReactNode }) => <span data-testid="toast-title">{children}</span>,
  ToastBody: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div data-testid="toast-body" style={style}>
      {children}
    </div>
  ),
}));

describe('ToasterNotification Component', () => {
  const defaultProps = {
    title: 'Test Title',
    content: 'Test Content',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseToastController.mockReturnValue({
      dispatchToast: mockDispatchToast,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders the Toaster component', () => {
      const { getByTestId } = render(<ToasterNotification {...defaultProps} />);
      expect(getByTestId('toaster')).toBeInTheDocument();
    });

    it('renders Toaster with correct offset', () => {
      const { getByTestId } = render(<ToasterNotification {...defaultProps} />);
      const toaster = getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-offset-h', '20');
      expect(toaster).toHaveAttribute('data-offset-v', '20');
    });
  });

  describe('Toast Dispatching', () => {
    it('dispatches toast on mount', () => {
      render(<ToasterNotification {...defaultProps} />);
      expect(mockDispatchToast).toHaveBeenCalledTimes(1);
    });

    it('dispatches toast with success intent by default', () => {
      render(<ToasterNotification {...defaultProps} />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];
      expect(options.intent).toBe('success');
    });

    it('dispatches toast with error intent when type is failure', () => {
      render(<ToasterNotification {...defaultProps} type="failure" />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];
      expect(options.intent).toBe('error');
    });

    it('dispatches toast with success intent when type is success', () => {
      render(<ToasterNotification {...defaultProps} type="success" />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];
      expect(options.intent).toBe('success');
    });

    it('dispatches toast with position top-end', () => {
      render(<ToasterNotification {...defaultProps} />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];
      expect(options.position).toBe('top-end');
    });

    it('dispatches toast with default duration of 5000ms', () => {
      render(<ToasterNotification {...defaultProps} />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];
      expect(options.timeout).toBe(5000);
    });

    it('dispatches toast with custom duration', () => {
      render(<ToasterNotification {...defaultProps} duration={10000} />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];
      expect(options.timeout).toBe(10000);
    });
  });

  describe('onClear Callback', () => {
    it('calls onClear when toast status changes to unmounted', () => {
      const onClear = vi.fn();
      render(<ToasterNotification {...defaultProps} onClear={onClear} />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];

      // Simulate the onStatusChange callback with 'unmounted' status
      options.onStatusChange({}, { status: 'unmounted' });

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('does not call onClear when toast status is not unmounted', () => {
      const onClear = vi.fn();
      render(<ToasterNotification {...defaultProps} onClear={onClear} />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];

      // Simulate the onStatusChange callback with other statuses
      options.onStatusChange({}, { status: 'visible' });
      options.onStatusChange({}, { status: 'dismissed' });
      options.onStatusChange({}, { status: 'queued' });

      expect(onClear).not.toHaveBeenCalled();
    });

    it('does not throw when onClear is not provided and toast is unmounted', () => {
      render(<ToasterNotification {...defaultProps} />);

      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];

      // Should not throw
      expect(() => {
        options.onStatusChange({}, { status: 'unmounted' });
      }).not.toThrow();
    });
  });

  describe('Props Variations', () => {
    it('renders with all props provided', () => {
      const onClear = vi.fn();
      render(<ToasterNotification title="Custom Title" content="Custom Content" type="failure" duration={3000} onClear={onClear} />);

      expect(mockDispatchToast).toHaveBeenCalledTimes(1);
      const dispatchCall = mockDispatchToast.mock.calls[0];
      const options = dispatchCall[1];
      expect(options.intent).toBe('error');
      expect(options.timeout).toBe(3000);
    });
  });
});
