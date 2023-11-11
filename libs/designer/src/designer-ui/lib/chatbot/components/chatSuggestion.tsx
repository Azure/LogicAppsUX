import Constants from '../constants';
import { ActionButton, FontSizes } from '@fluentui/react';
import { hexToRgbA } from '@microsoft/logic-apps-designer';
import * as React from 'react';

export interface IChatSuggestionGroupProps {
  children: React.ReactElement<IChatSuggestionProps> | Array<React.ReactElement<IChatSuggestionProps> | null | undefined | false>;
}

export const ChatSuggestionGroup: React.FC<IChatSuggestionGroupProps> = ({ children }) => {
  const childrenArray = React.Children.toArray(children);
  return childrenArray.length ? <div className={'msla-chatsuggestiongroup-root'}>{children}</div> : null;
};

export interface IChatSuggestionProps {
  text?: string;
  iconName?: string;
  onClick: () => void;
}

export const ChatSuggestion: React.FC<IChatSuggestionProps> = ({ text, iconName, onClick }) => {
  const iconStyles = {
    root: {
      color: Constants.NEUTRAL_PRIMARY_ALT,
      display: 'flex',
      alignItems: 'center',
    },
  };

  const buttonStyles = {
    root: {
      color: Constants.NEUTRAL_PRIMARY_ALT,
      border: `1px solid ${Constants.THEME_TERTIARY}`,
      borderRadius: 8,
      height: 24,
      backgroundColor: 'transparent',
      fontSize: FontSizes.smallPlus,
    },
    rootHovered: {
      color: Constants.NEUTRAL_PRIMARY,
      backgroundColor: Constants.THEME_LIGHTER,
      borderColor: hexToRgbA(Constants.THEME_SECONDARY, 0.7),
    },
    rootPressed: {
      color: Constants.NEUTRAL_PRIMARY,
      borderColor: hexToRgbA(Constants.THEME_SECONDARY, 0.9),
    },
    iconHovered: {
      color: Constants.NEUTRAL_PRIMARY,
    },
    iconPressed: {
      color: Constants.NEUTRAL_PRIMARY,
    },
  };
  return <ActionButton text={text} iconProps={{ iconName, styles: iconStyles }} onClick={onClick} styles={buttonStyles} />;
};
