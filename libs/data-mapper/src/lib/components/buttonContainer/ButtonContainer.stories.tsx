import type { ButtonContainerProps } from './ButtonContainer';
import { ButtonContainer } from './ButtonContainer';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ButtonContainer,
  title: 'Data Mapper Components/Floaties/Button Container',
} as ComponentMeta<typeof ButtonContainer>;

export const Standard: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;
