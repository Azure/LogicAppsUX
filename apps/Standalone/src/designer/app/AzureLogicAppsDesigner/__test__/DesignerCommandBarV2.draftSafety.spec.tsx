// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesignerCommandBar } from '../DesignerCommandBarV2';

const mocks = vi.hoisted(() => ({
  serialize: vi.fn(),
  flush: vi.fn(),
}));
vi.mock('@microsoft/logic-apps-designer-v2', () => ({
  store: { getState: () => ({ operations: { inputParameters: {} }, customCode: {} }) },
  serializeBJSWorkflow: mocks.serialize,
  flushPendingFoundryUpdates: mocks.flush,
  useIsDesignerDirty: () => true,
  useIsWorkflowEmpty: () => false,
  useNodesAndDynamicDataInitialized: () => true,
  useNodesInitialized: () => true,
  useChangeCount: () => 1,
  useWorkflowParameterValidationErrors: () => ({}),
  useAllSettingsValidationErrors: () => ({}),
  useAllConnectionErrors: () => ({}),
  useCanUndo: () => false,
  useCanRedo: () => false,
  getCustomCodeFilesWithData: () => ({}),
  resetDesignerDirtyState: () => ({ type: 'reset' }),
}));
vi.mock('@microsoft/logic-apps-shared', async () => {
  const { useThrottledEffect } = await import('../../../../../../../libs/logic-apps-shared/src/utils/src/lib/helpers/hooks');
  return { useThrottledEffect, isNullOrEmpty: (value: object) => !Object.keys(value).length };
});
vi.mock('../../../../environments/environment', () => ({ environment: {} }));
vi.mock('../Services/HttpClient', () => ({ isSuccessResponse: (status: number) => status >= 200 && status < 300 }));
vi.mock('@fluentui/react-icons', async () => {
  const { createElement, forwardRef } = await import('react');
  const Icon = forwardRef<HTMLSpanElement>((props, ref) => createElement('span', { ...props, ref }));
  return {
    bundleIcon: () => Icon,
    ArrowSyncFilled: Icon,
    CheckmarkCircleRegular: Icon,
    ErrorCircleFilled: Icon,
    ArrowUndoFilled: Icon,
    ArrowUndoRegular: Icon,
    ArrowRedoFilled: Icon,
    ArrowRedoRegular: Icon,
    MoreHorizontalFilled: Icon,
    MoreHorizontalRegular: Icon,
    MentionBracketsFilled: Icon,
    MentionBracketsRegular: Icon,
    LinkFilled: Icon,
    LinkRegular: Icon,
    ErrorCircleRegular: Icon,
    DocumentOnePageAddFilled: Icon,
    DocumentOnePageAddRegular: Icon,
    DocumentOnePageColumnsFilled: Icon,
    DocumentOnePageColumnsRegular: Icon,
    ChatSparkleFilled: Icon,
    ChatSparkleRegular: Icon,
  };
});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};
const mountCommandBar = (overrides: Partial<ComponentProps<typeof DesignerCommandBar>> = {}) => {
  const queryClient = new QueryClient();
  const store = configureStore({ reducer: () => ({ operations: { inputParameters: {} } }) });
  const save = vi.fn().mockResolvedValue(undefined);
  const discard = vi.fn().mockResolvedValue(undefined);
  const rendered = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <DesignerCommandBar
          id="workflow"
          location="westus"
          isReadOnly={false}
          isDarkMode={true}
          isDraftMode={true}
          isDesignerView={true}
          discard={discard}
          saveWorkflow={save}
          saveWorkflowFromCode={vi.fn()}
          showMonitoringView={vi.fn()}
          showDesignerView={vi.fn()}
          showCodeView={vi.fn()}
          switchWorkflowMode={vi.fn()}
          {...overrides}
        />
      </QueryClientProvider>
    </Provider>
  );
  return { ...rendered, save, discard, queryClient };
};
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('Draft discard and autosave ordering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.serialize.mockReset().mockResolvedValue({ definition: { triggers: {} } });
    mocks.flush.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('cancels the queued autosave while an asynchronous reset is pending and after remount', async () => {
    const reset = deferred();
    const discard = vi.fn(() => reset.promise);
    const mounted = mountCommandBar({ discard });
    await advance(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(discard).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
    expect(screen.getByText('Publish')).toBeDisabled();
    await advance(10000);
    expect(mounted.save).not.toHaveBeenCalled();
    await act(async () => {
      reset.resolve();
      await reset.promise;
    });
    mounted.unmount();
    await advance(10000);
    expect(mounted.save).not.toHaveBeenCalled();
  });

  it('disables discard for the full in-flight autosave so reset cannot race its write', async () => {
    const pendingSave = deferred();
    const save = vi.fn(() => pendingSave.promise);
    const mounted = mountCommandBar({ saveWorkflow: save });
    await advance(5000);
    expect(save).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(mounted.discard).not.toHaveBeenCalled();
    await act(async () => {
      pendingSave.resolve();
      await pendingSave.promise;
    });
    await advance(1);
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(mounted.discard).toHaveBeenCalledOnce();
  });
});
