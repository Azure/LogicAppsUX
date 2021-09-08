// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory, Meta } from '@storybook/react';

import { ActionButton, ActionButtonProps } from './index';
import './actionbutton.less';
import image from '../../common/images/actionpalette/addaction_blue.svg';

export default {
  component: ActionButton,
  title: 'Components/ActionButton',
} as ComponentMeta<typeof ActionButton>;

export const Standard: ComponentStory<typeof ActionButton> = (args: ActionButtonProps) => (
  <div className="msla-embed-palette">
    <div className="msla-action-palette-list">
      <ActionButton {...args} />
    </div>
  </div>
);

Standard.args = {
  text: "I'm an action button",
  ariaLabel: "I'm an action button",
  icon: image,
  disabled: false,
};
