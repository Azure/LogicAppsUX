import type { ButtonPivotProps } from './ButtonPivot';
import { ButtonPivot } from './ButtonPivot';
import { AnimalDog20Regular, AnimalDog20Filled, AnimalCat20Regular, AnimalCat20Filled } from '@fluentui/react-icons';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ButtonPivot,
  title: 'Data Mapper Components/Floaties/Button Pivot',
} as ComponentMeta<typeof ButtonPivot>;

export const Standard: ComponentStory<typeof ButtonPivot> = (args: ButtonPivotProps) => <ButtonPivot {...args} />;

const buttonValues = ['Dog', 'Cat'];
Standard.args = {
  buttons: [
    {
      tooltip: 'Button 1',
      regularIcon: AnimalDog20Regular,
      filledIcon: AnimalDog20Filled,
      onClick: () => console.log('Howdy from Button 1'),
      value: buttonValues[0],
    },
    {
      tooltip: 'Button 2',
      regularIcon: AnimalCat20Regular,
      filledIcon: AnimalCat20Filled,
      onClick: () => console.log('Howdy from Button 2'),
      value: buttonValues[1],
    },
  ],
  horizontal: true,
  selectedValue: buttonValues[0],
};
