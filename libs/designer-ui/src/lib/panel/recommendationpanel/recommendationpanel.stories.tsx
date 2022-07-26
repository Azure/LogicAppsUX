import { BrowseGrid } from './browseResults';
import type { RecommendationPanelProps } from './recommendationpanel';
import { RecommendationPanel } from './recommendationpanel';
import { SearchResultsGrid } from './searchResult';
import { connectorsSearchResultsMock, MockSearchOperations } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

export default {
  component: RecommendationPanel,
  title: 'Components/Panel/Recommendation',
  argTypes: {
    children: {
      options: ['Search', 'Browse'],
      control: { type: 'radio' },
      mapping: {
        Search: <SearchResultsGrid operationSearchResults={MockSearchOperations} onOperationClick={() => null}></SearchResultsGrid>,
        Browse: <BrowseGrid connectorBrowse={connectorsSearchResultsMock} onConnectorSelected={() => null}></BrowseGrid>,
      },
    },
  },
} as ComponentMeta<typeof RecommendationPanel>;
export const Container: ComponentStory<typeof RecommendationPanel> = (args: PropsWithChildren<RecommendationPanelProps>) => (
  <RecommendationPanel {...args}>{args.children}</RecommendationPanel>
);

Container.args = {
  isCollapsed: false,
  width: '630px',
};
