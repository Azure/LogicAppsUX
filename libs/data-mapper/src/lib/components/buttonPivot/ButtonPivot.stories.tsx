import type { ButtonPivotProps } from './ButtonPivot';
import { ButtonPivot } from './ButtonPivot';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ButtonPivot,
  title: 'Data Mapper Components/Floaties/Button Pivot',
} as ComponentMeta<typeof ButtonPivot>;

export const Standard: ComponentStory<typeof ButtonPivot> = (args: ButtonPivotProps) => <ButtonPivot {...args} />;
