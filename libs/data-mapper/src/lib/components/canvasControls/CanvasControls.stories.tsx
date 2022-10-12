import { CanvasControls } from './CanvasControls';
import type { CanvasControlsProps } from './CanvasControls';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: CanvasControls,
  title: 'Data Mapper Component/Floaties/Canvas Controls',
} as ComponentMeta<typeof CanvasControls>;

export const Standard: ComponentStory<typeof CanvasControls> = (args: CanvasControlsProps) => <CanvasControls {...args} />;
