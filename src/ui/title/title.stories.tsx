// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory}from '@storybook/react';

import { Title, TitleProps } from './index';
import '../card/card.less';
export default {
  component: Title,
  title: 'Components/Title',
} as ComponentMeta<typeof Title>;

export const Standard: ComponentStory<typeof Title> = (args: TitleProps) => (
  <div className="msla-card msla-card-fixed-width">
    <div className="msla-card-header msla-header-fixed-width">
      <Title {...args} />
    </div>
  </div>
);
Standard.args = {
  isEditingTitle: true,
  className: 'msla-card-header-title',
};
