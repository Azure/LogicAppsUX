import React from 'react';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { PanelRoot, PanelRootProps } from './panelroot';

export default {
  component: PanelRoot,
  title: 'Components/Panel',
} as ComponentMeta<typeof PanelRoot>;
export const Standard: ComponentStory<typeof PanelRoot> = (args: PanelRootProps) => <PanelRoot {...args} />;

Standard.args = {
  cardIcon: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1550/1.0.1550.2686/azureblob/icon.png',
  comment: 'Test comment!',
  noNodeSelected: true,
  title: 'Testing Title',
};
