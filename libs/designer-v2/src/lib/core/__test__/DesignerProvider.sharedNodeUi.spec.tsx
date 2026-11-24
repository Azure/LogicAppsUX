import { useState } from 'react';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider, useStore, useStoreApi } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DesignerProvider } from '../DesignerProvider';
import type { DesignerProviderProps } from '../DesignerProvider';
import { store } from '../store';
import { initDesignerOptions, initialDesignerOptionsState } from '../state/designerOptions/designerOptionsSlice';
import { resetWorkflowState } from '../state/global';

const options: DesignerProviderProps['options'] = {
  ...initialDesignerOptionsState,
  services: {} as DesignerProviderProps['options']['services'],
};

const Draft = () => {
  const [value, setValue] = useState('');
  return <input aria-label="Unsaved draft" value={value} onChange={(event) => setValue(event.target.value)} />;
};

const ViewportDraft = () => {
  const api = useStoreApi();
  const transform = useStore((state) => state.transform);
  return (
    <>
      <button onClick={() => api.setState({ transform: [120, -30, 1.5] })}>Pan canvas</button>
      <output aria-label="Canvas viewport">{transform.join(',')}</output>
    </>
  );
};

let queryClient: QueryClient;
const renderProvider = (ui: ReactNode) =>
  render(ui, { wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> });

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  store.dispatch(initDesignerOptions(initialDesignerOptionsState));
  store.dispatch(resetWorkflowState());
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  store.dispatch(initDesignerOptions(initialDesignerOptionsState));
  store.dispatch(resetWorkflowState());
});

describe('DesignerProvider shared-node option lifecycle', () => {
  it.each([undefined, false, true])('preserves host height inheritance with shared-node option %s', (useSharedNodeUi) => {
    renderProvider(
      <div style={{ height: '640px' }}>
        <DesignerProvider options={{ ...options, useSharedNodeUi }}>
          <Draft />
        </DesignerProvider>
      </div>
    );
    const themeRoot = screen.getByRole('textbox').closest('[data-color-scheme]');
    expect(themeRoot).toHaveStyle({ height: 'inherit' });
    expect(themeRoot?.parentElement).toHaveStyle({ display: 'contents', height: 'inherit' });
  });

  it('keeps the legacy subtree and draft intact when the omitted option is rerendered as false', () => {
    const { rerender } = renderProvider(
      <DesignerProvider options={options}>
        <Draft />
      </DesignerProvider>
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Keep my draft' } });
    input.focus();
    rerender(
      <DesignerProvider options={{ ...options, useSharedNodeUi: false }}>
        <Draft />
      </DesignerProvider>
    );
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('Keep my draft');
    expect(input.closest('[data-designer-ui-v2]')).toBeNull();
  });

  it('applies the real dark shared scope from the public provider options', () => {
    renderProvider(
      <DesignerProvider options={{ ...options, useSharedNodeUi: true, isDarkMode: true }}>
        <Draft />
      </DesignerProvider>
    );
    expect(store.getState().designerOptions.useSharedNodeUi).toBe(true);
    expect(screen.getByRole('textbox').closest('[data-designer-ui-v2]')).toHaveAttribute('data-designer-ui-v2', 'dark');
  });

  it('preserves the mounted designer subtree and unsaved draft when opting in without changing the workflow id', () => {
    const { rerender } = renderProvider(
      <DesignerProvider id="same-workflow" options={options}>
        <Draft />
      </DesignerProvider>
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Keep my draft' } });
    input.focus();
    rerender(
      <DesignerProvider id="same-workflow" options={{ ...options, useSharedNodeUi: true }}>
        <Draft />
      </DesignerProvider>
    );
    expect(screen.getByRole('textbox')).toHaveValue('Keep my draft');
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveFocus();
    rerender(
      <DesignerProvider id="same-workflow" options={{ ...options, useSharedNodeUi: false }}>
        <Draft />
      </DesignerProvider>
    );
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('Keep my draft');
    expect(input).toHaveFocus();
  });

  it('retains the actual XYFlow viewport store through both option transitions', () => {
    const tree = (enabled: boolean) => (
      <DesignerProvider id="same-workflow" options={{ ...options, useSharedNodeUi: enabled }}>
        <ReactFlowProvider>
          <ViewportDraft />
        </ReactFlowProvider>
      </DesignerProvider>
    );
    const { rerender } = renderProvider(tree(false));
    fireEvent.click(screen.getByRole('button', { name: 'Pan canvas' }));
    const viewport = screen.getByLabelText('Canvas viewport');
    expect(viewport).toHaveTextContent('120,-30,1.5');
    rerender(tree(true));
    expect(screen.getByLabelText('Canvas viewport')).toBe(viewport);
    expect(viewport).toHaveTextContent('120,-30,1.5');
    rerender(tree(false));
    expect(screen.getByLabelText('Canvas viewport')).toBe(viewport);
    expect(viewport).toHaveTextContent('120,-30,1.5');
  });
});
