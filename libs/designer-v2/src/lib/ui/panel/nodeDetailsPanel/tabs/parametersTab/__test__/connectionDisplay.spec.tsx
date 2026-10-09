import { ConnectionDisplay } from '../connectionDisplay';
import {
  createConnectionExpressionState,
  createConnectionExpressionStore,
} from '../../../../connectionsPanel/selectConnection/__test__/connectionExpressionTestState';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../../core/state/selectors/actionMetadataSelector', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../../core/state/selectors/actionMetadataSelector')>()),
  useIsConnectionRequired: () => true,
}));

vi.mock('../../../../../../core/state/connection/connectionSelector', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../../core/state/connection/connectionSelector')>()),
  useIsOperationMissingConnection: () => true,
}));

const setup = (
  expression: string,
  {
    theme = webLightTheme,
    designTimeReferenceKey,
    ...props
  }: Partial<ComponentProps<typeof ConnectionDisplay>> & { theme?: typeof webLightTheme; designTimeReferenceKey?: string } = {}
) => {
  const state = createConnectionExpressionState(expression);
  state.connections.connectionsMapping.Query = {
    kind: 'expression',
    expression,
    ...(designTimeReferenceKey ? { designTimeReferenceKey } : {}),
  };
  const originalState = JSON.stringify(state);
  const store = createConnectionExpressionStore(state);
  const dispatch = vi.spyOn(store, 'dispatch');
  const view = render(
    <Provider store={store}>
      <IntlProvider locale="en">
        <FluentProvider theme={theme}>
          <ConnectionDisplay nodeId="Query" connectionName={undefined} hasError={false} readOnly={false} {...props} />
        </FluentProvider>
      </IntlProvider>
    </Provider>
  );
  return { ...view, store, dispatch, originalState };
};

describe('ConnectionDisplay runtime status', () => {
  it.each([
    ["@parameters('Test_variable_1234')", {}, false],
    ["@outputs('Previous')", {}, false],
    ["prefix @{parameters('Test_variable_1234')}", {}, false],
    ["@parameters('unfinished", {}, true],
    ['@if(', {}, true],
    ['@triggerBody()', { designTimeReferenceKey: 'SqlDesign', hasError: true }, true],
    ['@triggerBody()', { hasError: true, isLoading: true }, false],
  ] as const)('shows only runtime status for %s with %j (invalid=%s)', (expression, options, invalid) => {
    const { container, store, dispatch, originalState } = setup(expression, options);
    expect(screen.getByText('Connection selected at runtime')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connection selected at runtime, Change connection' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByText('Connection expression')).not.toBeInTheDocument();
    expect(screen.queryByText(expression)).not.toBeInTheDocument();
    expect(screen.queryByText('Not connected.')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading connection...')).not.toBeInTheDocument();
    expect(screen.queryAllByText('Invalid connection')).toHaveLength(invalid ? 1 : 0);
    expect(container.querySelector('[data-automation-id^="msla-token "]')).not.toBeInTheDocument();
    expect(JSON.stringify(store.getState())).toBe(originalState);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('keeps Change connection available to inspect or edit the saved expression', () => {
    const { dispatch } = setup("@parameters('Test_variable_1234')", { hasError: true, isLoading: true });
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Connection selected at runtime, Change connection' }));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: 'panel/openPanel', payload: { nodeId: 'Query', panelMode: 'Connection' } })
    );
  });

  it.each([webLightTheme, webDarkTheme])('shows only the runtime status in read-only mode in either Fluent theme', (theme) => {
    setup("@parameters('Test_variable_1234')", { theme, readOnly: true });
    expect(screen.getByText('Connection selected at runtime')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
