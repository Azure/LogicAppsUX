import type { FloatingPanelProps } from './FloatingPanel';
import { FloatingPanel } from './FloatingPanel';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: FloatingPanel,
  title: 'Data Mapper Components/Floaties/Floating panel',
} as ComponentMeta<typeof FloatingPanel>;

export const Standard: ComponentStory<typeof FloatingPanel> = (args: FloatingPanelProps) => <FloatingPanel {...args} />;
Standard.args = {
  xPos: '16px',
  yPos: '16px',
  width: '50px',
  minHeight: '50px',
  children: <div>Hello!</div>,
};

export const Empty: ComponentStory<typeof FloatingPanel> = (args: FloatingPanelProps) => <FloatingPanel {...args} />;
Empty.args = {
  xPos: '16px',
  yPos: '16px',
  width: '50px',
  minHeight: '50px',
};
