import { TestMapPanel } from './TestMapPanel';
import type { TestMapPanelProps } from './TestMapPanel';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: TestMapPanel,
  title: 'Data Mapper Component/Panel/Test Map',
} as ComponentMeta<typeof TestMapPanel>;

export const Standard: ComponentStory<typeof TestMapPanel> = (args: TestMapPanelProps) => <TestMapPanel {...args} />;
