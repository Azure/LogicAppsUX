// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Confirm, ConfirmProps } from './index';
import { DefaultButton } from '@fluentui/react';

export default {
  component: Confirm,
  title: 'Components/Dialogs/Confirm',
} as ComponentMeta<typeof Confirm>;

export const Standard: ComponentStory<typeof Confirm> = (args: ConfirmProps) => {
  const [confirmHidden, setConfirmHidden] = React.useState(true);

  const handleConfirmClick = () => {
    setConfirmHidden(false);
  };

  return (
    <>
      <DefaultButton text="Show Confirm Dialog" onClick={handleConfirmClick}></DefaultButton>
      <Confirm {...args} hidden={confirmHidden} />
    </>
  );
};

Standard.args = {
  title: 'Delete Step',
  message: 'This step will be removed from the Logic App.',
};
