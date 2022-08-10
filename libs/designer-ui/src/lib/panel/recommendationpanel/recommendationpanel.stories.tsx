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

export const Search: ComponentStory<typeof RecommendationPanel> = (args: PropsWithChildren<RecommendationPanelProps>) => (
  <RecommendationPanel {...args}>
    <DesignerSearchBox onSearch={() => null} />
    <SearchResultsGrid operationSearchResults={MockSearchOperations} onOperationClick={() => null} />
  </RecommendationPanel>
);
Search.args = { isCollapsed: false, width: '630px' };

export const Browse: ComponentStory<typeof RecommendationPanel> = (args: PropsWithChildren<RecommendationPanelProps>) => (
  <RecommendationPanel {...args}>
    <DesignerSearchBox onSearch={() => null} />
    <BrowseGrid connectorBrowse={connectorsSearchResultsMock} onConnectorSelected={() => null} />
  </RecommendationPanel>
);
Browse.args = { isCollapsed: false, width: '630px' };

export const OperationGroupDetails: ComponentStory<typeof RecommendationPanel> = (args: PropsWithChildren<RecommendationPanelProps>) => (
  <RecommendationPanel {...args}>
    <OperationGroupDetailsPage
      operationApi={mockOperationApi}
      operationActionsData={[...mockOperationActionsData, ...mockOperationActionsData, ...mockOperationActionsData]}
      onClickOperation={(id: string) => alert('Adding node with ID: ' + id)}
      onClickBack={() => null}
    />
  </RecommendationPanel>
);
OperationGroupDetails.args = { isCollapsed: false, width: '630px' };
