// Button.stories.ts | Button.stories.tsx

import React, { useState } from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Title, TitleProps } from './index';
import { DefaultButton } from '@fluentui/react';
import { useRef } from '@storybook/addons';
export default {
  component: Title,
  title: 'Components/Title',
} as ComponentMeta<typeof Title>;

export const Standard: ComponentStory<typeof Title> = () => {
  const [text, setText] = useState('Change Me');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const titleRef = useRef<HTMLElement | null>(null);

  const handleClick = () => setIsEditingTitle(true);
  const handleCommit = ({ text }: any) => {
    setIsEditingTitle(false);
    setText(text);
  };

  const handleDiscard = () => {
    setIsEditingTitle(false);
  };
  return (
    <>
      <DefaultButton onClick={handleClick}>{text}</DefaultButton>
      <br />
      <div className="msla-card msla-card-fixed-width">
        <div className="msla-card-header msla-header-fixed-width">
          <div className="msla-card-title-group">
            <Title
              ref={titleRef}
              className="msla-card-header-title"
              isEditingTitle={isEditingTitle}
              text={text}
              onCommit={handleCommit}
              onDiscard={handleDiscard}
              trackEvent={() => null}
            />
          </div>
        </div>
      </div>
    </>
  );
};
