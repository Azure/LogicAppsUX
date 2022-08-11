import { DesignerSearchBox } from '../../searchbox';
import { BrowseGrid } from './browseResults';
import { mockOperationApi, mockOperationActionsData } from './operationGroupDetails/mocks';
import { OperationGroupDetailsPage } from './operationGroupDetails/operationGroupDetails';
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
    <DesignerSearchBox onSearch={() => null} />
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
    <DesignerSearchBox onSearch={() => null} />
    <BrowseGrid connectorBrowse={connectorsSearchResultsMock} onConnectorSelected={(id) => alert('Selected connector: ' + id)} />
  </RecommendationPanel>
);
Browse.args = { isCollapsed: false, width: '630px' };

export const OperationGroupDetails: ComponentStory<typeof RecommendationPanel> = (args: PropsWithChildren<RecommendationPanelProps>) => (
  <RecommendationPanel {...args}>
    <OperationGroupDetailsPage
      operationApi={mockOperationApi}
      operationActionsData={[...mockOperationActionsData, ...mockOperationActionsData, ...mockOperationActionsData]}
      onOperationClick={(id) => alert('Adding node with ID: ' + id)}
      onBackClick={() => null}
    />
  </RecommendationPanel>
);
OperationGroupDetails.args = { isCollapsed: false, width: '630px' };
