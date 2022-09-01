import type { ButtonContainerProps } from './ButtonContainer';
import { ButtonContainer } from './ButtonContainer';
import { CubeTree20Filled, CubeTree20Regular, MathFormula20Filled, MathFormula20Regular } from '@fluentui/react-icons';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ButtonContainer,
  title: 'Data Mapper/Button Groups/Button Container',
} as ComponentMeta<typeof ButtonContainer>;

export const Standard: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;
Standard.args = {
  buttons: [
    {
      tooltip: 'Toolbox',
      regularIcon: CubeTree20Regular,
      filledIcon: CubeTree20Filled,
      onClick: () => {
        // Empty
      },
    },
    {
      tooltip: 'Function',
      regularIcon: MathFormula20Regular,
      filledIcon: MathFormula20Filled,
      onClick: () => {
        // Empty
      },
    },
  ],
  horizontal: true,
  xPos: '16px',
  yPos: '16px',
};

export const Vertical: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;
Vertical.args = {
  buttons: [
    {
      tooltip: 'Toolbox',
      regularIcon: CubeTree20Regular,
      filledIcon: CubeTree20Filled,
      onClick: () => {
        // Empty
      },
    },
    {
      tooltip: 'Function',
      regularIcon: MathFormula20Regular,
      filledIcon: MathFormula20Filled,
      onClick: () => {
        // Empty
      },
    },
  ],
  horizontal: false,
  xPos: '16px',
  yPos: '16px',
};
