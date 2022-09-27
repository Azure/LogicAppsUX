import { TestMapPanel, type TestMapPanelProps } from './TestMapPanel';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: TestMapPanel,
  title: 'Data Mapper/TestMapPanel',
} as ComponentMeta<typeof TestMapPanel>;

export const Standard: ComponentStory<typeof TestMapPanel> = (args: TestMapPanelProps) => <TestMapPanel {...args} />;
