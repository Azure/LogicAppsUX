import { CanvasToolbox } from './CanvasToolbox';
import type { CanvasToolboxProps } from './CanvasToolbox';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: CanvasToolbox,
  title: 'Data Mapper Component/Floaties/Canvas Toolbox',
} as ComponentMeta<typeof CanvasToolbox>;

export const Standard: ComponentStory<typeof CanvasToolbox> = (args: CanvasToolboxProps) => <CanvasToolbox {...args} />;
