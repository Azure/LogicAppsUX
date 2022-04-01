import type { PanelRootProps } from './panelroot';
import { PanelRoot } from './panelroot';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: PanelRoot,
  title: 'Components/Panel',
} as ComponentMeta<typeof PanelRoot>;
export const Standard: ComponentStory<typeof PanelRoot> = (args: PanelRootProps) => <PanelRoot {...args} />;

Standard.args = {
  cardIcon: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1550/1.0.1550.2686/azureblob/icon.png',
  comment: 'Test comment!',
  collapsed: false,
  isRecommendation: false,
  noNodeSelected: false,
  title: 'Testing Title',
};
