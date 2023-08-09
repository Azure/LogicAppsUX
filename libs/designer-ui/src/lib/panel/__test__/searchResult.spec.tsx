import type { OperationSearchCardProps, OperationSearchGroupProps } from '../recommendationpanel';
import type { SearchResultsGridProps } from '../recommendationpanel/searchResult';
import { SearchResultsGrid } from '../recommendationpanel/searchResult';
import type { IListProps } from '@fluentui/react/lib/List';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import type { ReactElement } from 'react';
import React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/workflowparameters/workflowparameter', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;
  let minimal: SearchResultsGridProps;

  beforeEach(() => {
    minimal = {
      displayRuntimeInfo: false,
      isLoadingMore: false,
      isLoadingSearch: false,
      onConnectorClick: jest.fn(),
      onOperationClick: jest.fn(),
      operationSearchResults: [],
      searchTerm: '',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should group aliased connectors separately', () => {
    renderer.render(<SearchResultsGrid {...minimal} groupByConnector={true} operationSearchResults={[operation, aliasedOperation]} />);

    const grid = renderer.getRenderOutput();
    const list = findByName<IListProps<string>>('List', grid);
    expectValidReactElement(list);
    expect(list.props.items).toHaveLength(2);
    expect(list.props.items).toContain('api_id');
    expect(list.props.items).toContain('displayApi_id');

    const cell = list.props.onRenderCell?.('displayApi_id');
    expectValidReactElement(cell);
    const group = findByName<OperationSearchGroupProps>('OperationSearchGroup', cell);
    expect(group.props.operationApi.displayName).toBe('displayApi_displayName');
  });

  it('should display aliased operation with brand of aliased connector', () => {
    renderer.render(<SearchResultsGrid {...minimal} groupByConnector={false} operationSearchResults={[operation, aliasedOperation]} />);

    const grid = renderer.getRenderOutput();
    const list = findByName<IListProps<DiscoveryOperation<DiscoveryResultTypes>>>('List', grid);
    expect(list.props.items).toHaveLength(2);
    expect(list.props.items).toContain(operation);
    expect(list.props.items).toContain(aliasedOperation);

    const cell = list.props.onRenderCell?.(aliasedOperation);
    expectValidReactElement(cell);
    const operationCard = findByName<OperationSearchCardProps>('OperationSearchCard', cell);
    expect(operationCard.props.operationActionData.brandColor).toBe('aliased_operation_brandColor');
    expect(operationCard.props.operationActionData.iconUri).toBe('aliased_operation_iconUri');
  });

  const operation: DiscoveryOperation<DiscoveryResultTypes> = {
    id: 'operation_id',
    name: 'operation_name',
    properties: {
      api: {
        displayName: 'api_displayName',
        iconUri: 'api_iconUri',
        id: 'api_id',
        brandColor: 'api_brandColor',
      },
      brandColor: 'operation_brandColor',
      description: 'operation_description',
      externalDocs: {
        url: 'externalDocs_url',
      },
      iconUri: 'operation_iconUri',
      isWebhook: false,
      pageable: false,
      summary: 'summary',
    },
    type: 'type',
  };

  const aliasedOperation: DiscoveryOperation<DiscoveryResultTypes> = {
    id: 'operation_aliased_id',
    name: 'operation_aliased_name',
    properties: {
      api: operation.properties.api,
      displayApi: {
        displayName: 'displayApi_displayName',
        iconUri: 'displayApi_iconUri',
        id: 'displayApi_id',
        brandColor: 'displayApi_brandColor',
      },
      brandColor: 'aliased_operation_brandColor',
      description: 'aliased_operation_description',
      externalDocs: {
        url: 'aliased_externalDocs_url',
      },
      iconUri: 'aliased_operation_iconUri',
      isWebhook: false,
      pageable: false,
      summary: 'aliased_operation_summary',
    },
    type: 'type',
  };

  function findByName<Props>(name: string, element: ReactElement): ReactElement<Props> {
    const type = element.type;
    if (type === name) {
      return element;
    }

    if (typeof type === 'function' && (type.name === name || (type as React.FunctionComponent).displayName === name)) {
      return element;
    }

    const children = React.Children.toArray(element.props.children);
    const result = children.filter(React.isValidElement).find((c) => findByName(name, c));
    expect(React.isValidElement(result)).toBeTruthy();

    return result as ReactElement<Props>;
  }
});

function expectValidReactElement(group: any): asserts group is ReactElement {
  expect(React.isValidElement(group)).toBe(true);
}
