// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Alert, AlertProps } from './index';
import { DefaultButton } from '@fluentui/react';

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
      <DefaultButton text="Show Confirm Dialog" onClick={handleClick}></DefaultButton>
      <Alert {...args} hidden={hidden} />
    </>
  );
};

Standard.args = {
  title: 'Duplicate or Invalid Name',
  message: 'The name already exists or is invalid.',
};
