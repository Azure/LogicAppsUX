import type { RecommendationPanelProps } from './recommendationpanel';
import { RecommendationPanel } from './recommendationpanel';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: RecommendationPanel,
  title: 'Components/Panel/Recommendation',
} as ComponentMeta<typeof RecommendationPanel>;
export const Container: ComponentStory<typeof RecommendationPanel> = (args: RecommendationPanelProps) => <RecommendationPanel {...args} />;

Container.args = {
  isCollapsed: false,
  width: '630px',
};
