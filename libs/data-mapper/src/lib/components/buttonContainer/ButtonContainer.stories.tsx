import type { ButtonContainerProps } from './ButtonContainer';
import { ButtonContainer } from './ButtonContainer';
import { AnimalDog20Regular, AnimalDog20Filled, AnimalCat20Regular, AnimalCat20Filled } from '@fluentui/react-icons';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ButtonContainer,
  title: 'Data Mapper Components/Floaties/Button Container',
} as ComponentMeta<typeof ButtonContainer>;

export const Standard: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;

Standard.args = {
  buttons: [
    {
      tooltip: 'Button 1',
      regularIcon: AnimalDog20Regular,
      filledIcon: AnimalDog20Filled,
      onClick: () => console.log('Howdy from Button 1'),
    },
    {
      tooltip: 'Button 2',
      regularIcon: AnimalCat20Regular,
      filledIcon: AnimalCat20Filled,
      onClick: () => console.log('Howdy from Button 2'),
    },
  ],
  horizontal: true,
};
