import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchResultsGridV2 } from '../searchResultV2';

vi.mock('../../../operationSearchGroup', () => ({
  OperationSearchGroup: ({ operationApi, operationActionsData, onConnectorClick, onOperationClick }: any) => (
    <div data-testid={`group-${operationApi.id}`}>
      <button type="button" onClick={() => onConnectorClick(operationApi.id)}>
        {operationApi.displayName}
      </button>
      {operationActionsData.map((op: any) => (
        <button key={op.id} type="button" onClick={() => onOperationClick(op.id, op.apiId)}>
          {op.icon}
          <span>{op.title}</span>
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../../browseResults', () => ({
  BrowseGrid: ({ operationsData, onOperationSelected }: any) => (
    <div data-testid="flat-browse-grid">
      {operationsData.map((op: any) => (
        <button key={op.id} type="button" onClick={() => onOperationSelected(op.id, op.apiId)}>
          {op.icon}
          <span>{op.title}</span>
        </button>
      ))}
    </div>
  ),
}));

const makeOperation = (id: string, summary: string, apiId = 'connectionProviders/control', apiName = 'Control') =>
  ({
    id,
    name: id,
    type: 'BuiltIn',
    properties: {
      summary,
      description: `${summary} description`,
      operationType: id,
      api: {
        id: apiId,
        name: apiName.toLowerCase(),
        displayName: apiName,
        brandColor: '#0078D4',
        iconUri: 'https://example.com/icon.svg',
      },
    },
  }) as DiscoveryOperation<DiscoveryResultTypes>;

const renderGrid = (props: Partial<Parameters<typeof SearchResultsGridV2>[0]> = {}) =>
  render(
    <IntlProvider locale="en" defaultLocale="en">
      <SearchResultsGridV2
        isLoadingMore={false}
        isLoadingSearch={false}
        searchTerm="if"
        operationSearchResults={[]}
        onConnectorClick={vi.fn()}
        onOperationClick={vi.fn()}
        displayRuntimeInfo={false}
        groupByConnector={true}
        setGroupByConnector={vi.fn()}
        {...props}
      />
    </IntlProvider>
  );

describe('SearchResultsGridV2', () => {
  afterEach(cleanup);

  it('renders a spinner while searching and an empty alert when no operations match', () => {
    const { rerender } = renderGrid({ isLoadingSearch: true });
    expect(screen.getByText('Searching for results...')).toBeInTheDocument();

    rerender(
      <IntlProvider locale="en" defaultLocale="en">
        <SearchResultsGridV2
          isLoadingMore={false}
          isLoadingSearch={false}
          searchTerm="missing-op"
          operationSearchResults={[]}
          onConnectorClick={vi.fn()}
          onOperationClick={vi.fn()}
          displayRuntimeInfo={false}
          groupByConnector={true}
          setGroupByConnector={vi.fn()}
        />
      </IntlProvider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No results found for "missing-op"');
  });

  it('passes custom operation icons through grouped connector search results', () => {
    const onConnectorClick = vi.fn();
    const onOperationClick = vi.fn();
    renderGrid({
      groupByConnector: true,
      isLoadingMore: true,
      operationSearchResults: [makeOperation('if', 'Condition'), makeOperation('switch', 'Switch')],
      onConnectorClick,
      onOperationClick,
      renderOperationIcon: (op) => <span data-testid={`custom-icon-${op.id}`} />,
    });

    expect(screen.getByText('Searching for results...')).toBeInTheDocument();
    expect(screen.getByTestId('custom-icon-if')).toBeInTheDocument();
    expect(screen.getByTestId('custom-icon-switch')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Control' }));
    expect(onConnectorClick).toHaveBeenCalledWith('connectionProviders/control');
    fireEvent.click(screen.getByRole('button', { name: 'Condition' }));
    expect(onOperationClick).toHaveBeenCalledWith('if', 'connectionProviders/control');
  });

  it('passes custom operation icons through flat BrowseGrid results', () => {
    const onOperationClick = vi.fn();
    renderGrid({
      groupByConnector: false,
      operationSearchResults: [makeOperation('foreach', 'For each')],
      onOperationClick,
      renderOperationIcon: (op) => <span data-testid={`flat-icon-${op.id}`} />,
    });

    expect(screen.getByTestId('flat-browse-grid')).toBeInTheDocument();
    expect(screen.getByTestId('flat-icon-foreach')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'For each' }));
    expect(onOperationClick).toHaveBeenCalledWith('foreach', 'connectionProviders/control');
  });
});
