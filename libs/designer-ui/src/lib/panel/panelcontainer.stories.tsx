import React from 'react';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { PanelRoot, PanelRootProps } from './panelroot';

export default {
  component: PanelRoot,
  title: 'Components/Panel',
} as ComponentMeta<typeof PanelRoot>;
export const Standard: ComponentStory<typeof PanelRoot> = (args: PanelRootProps) => <PanelRoot {...args} />;

Standard.args = {
  comment: 'Test comment!',
};
