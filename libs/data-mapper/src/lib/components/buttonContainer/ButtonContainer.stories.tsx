import type { ButtonContainerProps } from './ButtonContainer';
import { ButtonContainer } from './ButtonContainer';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: ButtonContainer,
  title: 'Data Mapper/ButtonContainer',
} as ComponentMeta<typeof ButtonContainer>;

export const Standard: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;
Standard.args = {
  buttons: [
    {
      iconProps: { iconName: 'BranchFork2' },
      title: 'Toolbox',
      ariaLabel: 'Toolbox',
    },
    {
      iconProps: { iconName: 'Variable' },
      title: 'Function',
      ariaLabel: 'Function',
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
      iconProps: { iconName: 'BranchFork2' },
      title: 'Toolbox',
      ariaLabel: 'Toolbox',
    },
    {
      iconProps: { iconName: 'Variable' },
      title: 'Function',
      ariaLabel: 'Function',
    },
  ],
  horizontal: false,
  xPos: '16px',
  yPos: '16px',
};
