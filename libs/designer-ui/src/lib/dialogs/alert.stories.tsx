// alert.stories.js|jsx|ts|tsx
import type { AlertProps } from './index';
import { Alert } from './index';
import { DefaultButton } from '@fluentui/react';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: Alert,
  title: 'Components/Dialogs/Alert',
} as ComponentMeta<typeof Alert>;

export const Standard: ComponentStory<typeof Alert> = (args: AlertProps) => {
  const [hidden, setHidden] = React.useState(true);

  const handleClick = () => {
    setHidden(false);
  };

  return (
    <>
      <DefaultButton text="Show Alert Dialog" onClick={handleClick} />
      <Alert {...args} hidden={hidden} />
    </>
  );
};

Standard.args = {
  title: 'Duplicate or Invalid Name',
  message: 'The name already exists or is invalid.',
};
