// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { CommentBox, CommentBoxProps } from './index';
import './commentbox.story.less';

export default {
  component: CommentBox,
  title: 'Components/Card/CommentBox',
} as ComponentMeta<typeof CommentBox>;

const Template: ComponentStory<typeof CommentBox> = (args: CommentBoxProps) => (
  <div className="commentbox-container">
    <CommentBox {...args} />
  </div>
);

export const NonEditable = Template.bind({});
NonEditable.args = {
  comment: 'This is a comment box.',
  isDismissed: false,
  isEditing: false,
};

export const Editable = Template.bind({});
Editable.args = {
  comment: 'This is a comment box.',
  isDismissed: false,
  isEditing: true,
};
