import { BrowseGrid } from './browseResults';
import { OperationGroupDetailsPage } from './operationGroupDetails';
import { mockOperationApi, mockOperationActionsData } from './operationGroupDetails/mocks';
import { OperationSearchHeader } from './operationSearchHeader';
import type { RecommendationPanelProps } from './recommendationpanel';
import { RecommendationPanel } from './recommendationpanel';
import { SearchResultsGrid } from './searchResult';
import { connectorsSearchResultsMock, MockSearchOperations } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import type { PropsWithChildren } from 'react';

export default {
  component: RecommendationPanel,
  title: 'Components/Panel/RecommendationPanel',
} as ComponentMeta<typeof RecommendationPanel>;

export const Search: ComponentStory<typeof RecommendationPanel> = (args: any) => (
  <RecommendationPanel {...args}>
    <OperationSearchHeader
      onSearch={() => null}
      onGroupToggleChange={() => null}
      isGrouped={args.groupByConnector}
      searchTerm={'Test Search'}
      onDismiss={() => null}
      navigateBack={() => null}
    />
    <SearchResultsGrid
      operationSearchResults={MockSearchOperations}
      onOperationClick={(id) => alert('Adding operation: ' + id)}
      onConnectorClick={(id) => alert('Clicked on connector: ' + id)}
      groupByConnector={args.groupByConnector}
    />
  </RecommendationPanel>
);
Search.args = { isCollapsed: false, width: '630px', groupByConnector: false } as any;

export const Browse: ComponentStory<typeof RecommendationPanel> = (args: PropsWithChildren<RecommendationPanelProps>) => (
  <RecommendationPanel {...args}>
    <OperationSearchHeader onSearch={() => null} onGroupToggleChange={() => null} onDismiss={() => null} navigateBack={() => null} />
    <BrowseGrid connectorBrowse={connectorsSearchResultsMock} onConnectorSelected={(id) => alert('Selected connector: ' + id)} />
  </RecommendationPanel>
);
Browse.args = { isCollapsed: false, width: '630px' };

export const OperationGroupDetails: ComponentStory<typeof RecommendationPanel> = (args: PropsWithChildren<RecommendationPanelProps>) => (
  <RecommendationPanel {...args}>
    <OperationSearchHeader
      onSearch={() => null}
      onGroupToggleChange={() => null}
      onDismiss={() => null}
      navigateBack={() => null}
      selectedGroupId={'test'}
    />
    <OperationGroupDetailsPage
      operationApi={mockOperationApi}
      operationActionsData={[...mockOperationActionsData, ...mockOperationActionsData, ...mockOperationActionsData]}
      onOperationClick={(id) => alert('Adding node with ID: ' + id)}
    />
  </RecommendationPanel>
);
OperationGroupDetails.args = { isCollapsed: false, width: '630px' };
