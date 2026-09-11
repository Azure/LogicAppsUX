/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToasterNotification } from '../notification';

const dispatchToast = vi.fn();
vi.mock('@fluentui/react-components', () => ({
  useId: (prefix: string) => `${prefix}-id`,
  useToastController: () => ({ dispatchToast }),
  Toaster: ({ toasterId, offset }: any) => <div data-testid="toaster" data-id={toasterId} data-offset={JSON.stringify(offset)} />,
  Toast: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ToastTitle: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  ToastBody: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

describe('ToasterNotification', () => {
  beforeEach(() => dispatchToast.mockClear());
  afterEach(cleanup);

  it('dispatches a default success toast and renders its toaster', () => {
    render(<ToasterNotification title="Saved" content="Knowledge saved" />);

    expect(dispatchToast).toHaveBeenCalledTimes(1);
    expect(dispatchToast.mock.calls[0][1]).toMatchObject({
      toastId: 'knowledge-toast-id',
      intent: 'success',
      position: 'top-end',
      timeout: 5000,
    });
    expect(screen.getByTestId('toaster')).toHaveAttribute('data-id', 'knowledge-toaster-id');
  });

  it('uses failure intent and a custom duration', () => {
    render(<ToasterNotification title="Failed" content="Try again" type="failure" duration={1000} />);

    expect(dispatchToast.mock.calls[0][1]).toMatchObject({ intent: 'error', timeout: 1000 });
  });

  it('clears only after the toast is unmounted', () => {
    const onClear = vi.fn();
    render(<ToasterNotification title="Saved" content="Knowledge saved" onClear={onClear} />);
    const { onStatusChange } = dispatchToast.mock.calls[0][1];

    onStatusChange({}, { status: 'visible' });
    expect(onClear).not.toHaveBeenCalled();
    onStatusChange({}, { status: 'unmounted' });
    expect(onClear).toHaveBeenCalledOnce();
  });
});
