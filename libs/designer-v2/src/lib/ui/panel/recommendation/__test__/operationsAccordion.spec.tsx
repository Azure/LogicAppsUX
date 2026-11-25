import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { recurrenceOperation, requestOperation } from '@microsoft/logic-apps-shared';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationsAccordion } from '../details/operationsAccordion';

const mockAddOperation = vi.fn((payload: unknown) => ({ type: 'mock/addOperation', payload }));

vi.mock('../../../../core', () => ({
  addOperation: (payload: unknown) => mockAddOperation(payload),
}));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({
    graphId: 'root',
    parentId: undefined,
    childId: undefined,
  })),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: vi.fn(() => false),
}));

vi.mock('../details/operationAccordionItem', () => ({
  OperationAccordionItem: ({ value, title, items, onOperationClick }: any) => (
    <div data-testid={`accordion-section-${value}`}>
      <span>{title}</span>
      {items.map((item: OperationActionData) => (
        <button
          key={item.id}
          type="button"
          data-testid={`accordion-item-${item.id}`}
          data-has-icon={String(Boolean(item.icon))}
          onClick={() => onOperationClick(item.id, item.apiId)}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}));

import { useSharedNodeUi } from '../../../../core/state/designerOptions/designerOptionsSelectors';

const mockUseSharedNodeUi = vi.mocked(useSharedNodeUi);

const sampleAction: OperationActionData = {
  id: 'compose',
  title: 'Compose',
  isTrigger: false,
  apiId: 'connectionProviders/dataOperationNew',
};

const sampleTrigger: OperationActionData = {
  id: 'custom-trigger',
  title: 'Custom Trigger',
  isTrigger: true,
  apiId: 'connectionProviders/http',
};

const renderAccordion = (props: Partial<Parameters<typeof OperationsAccordion>[0]> = {}) => {
  const store = configureStore({ reducer: { dummy: (state = {}) => state } });
  const dispatchSpy = vi.spyOn(store, 'dispatch');
  const rendered = render(
    <Provider store={store}>
      <FluentProvider theme={webLightTheme}>
        <IntlProvider locale="en">
          <OperationsAccordion
            triggers={[]}
            actions={[sampleAction]}
            isTrigger={true}
            isLoading={false}
            onTriggerClick={vi.fn()}
            onActionClick={vi.fn()}
            {...props}
          />
        </IntlProvider>
      </FluentProvider>
    </Provider>
  );
  return { ...rendered, dispatchSpy };
};

describe('OperationsAccordion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSharedNodeUi.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  test('threads shared built-in glyphs to suggested triggers when useSharedNodeUi is enabled and dispatches addOperation on click', () => {
    mockUseSharedNodeUi.mockReturnValue(false);
    const { rerender, dispatchSpy } = renderAccordion({ triggers: [], actions: [sampleAction], isTrigger: true });

    expect(screen.getByTestId(`accordion-item-${recurrenceOperation.id}`)).toHaveAttribute('data-has-icon', 'false');
    expect(screen.getByTestId(`accordion-item-${requestOperation.id}`)).toHaveAttribute('data-has-icon', 'false');

    mockUseSharedNodeUi.mockReturnValue(true);
    const store = configureStore({ reducer: { dummy: (state = {}) => state } });
    const sharedDispatchSpy = vi.spyOn(store, 'dispatch');
    rerender(
      <Provider store={store}>
        <FluentProvider theme={webLightTheme}>
          <IntlProvider locale="en">
            <OperationsAccordion
              triggers={[]}
              actions={[sampleAction]}
              isTrigger={true}
              isLoading={false}
              onTriggerClick={vi.fn()}
              onActionClick={vi.fn()}
            />
          </IntlProvider>
        </FluentProvider>
      </Provider>
    );

    expect(screen.getByTestId(`accordion-item-${recurrenceOperation.id}`)).toHaveAttribute('data-has-icon', 'true');
    expect(screen.getByTestId(`accordion-item-${requestOperation.id}`)).toHaveAttribute('data-has-icon', 'true');

    fireEvent.click(screen.getByTestId(`accordion-item-${recurrenceOperation.id}`));
    expect(mockAddOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: recurrenceOperation,
        isTrigger: true,
        isParallelBranch: false,
      })
    );
    expect(sharedDispatchSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId(`accordion-item-${requestOperation.id}`));
    expect(mockAddOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        operation: requestOperation,
        isTrigger: true,
      })
    );
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  test('renders triggers and actions sections in both trigger mode and action mode', () => {
    const onTriggerClick = vi.fn();
    const onActionClick = vi.fn();
    const { unmount } = renderAccordion({
      triggers: [sampleTrigger],
      actions: [sampleAction],
      isTrigger: true,
      onTriggerClick,
      onActionClick,
    });

    expect(screen.getByTestId('accordion-section-triggers')).toBeInTheDocument();
    expect(screen.queryByTestId('accordion-section-suggested-triggers')).not.toBeInTheDocument();
    expect(screen.getByTestId('accordion-section-actions')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('accordion-item-custom-trigger'));
    expect(onTriggerClick).toHaveBeenCalledWith('custom-trigger', 'connectionProviders/http');
    unmount();

    renderAccordion({
      triggers: [sampleTrigger],
      actions: [sampleAction],
      isTrigger: false,
      onTriggerClick,
      onActionClick,
    });
    expect(screen.getByTestId('accordion-section-actions')).toBeInTheDocument();
    expect(screen.getByTestId('accordion-section-triggers')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('accordion-item-compose'));
    expect(onActionClick).toHaveBeenCalledWith('compose', 'connectionProviders/dataOperationNew');
  });
});
