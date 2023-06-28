import type { IButtonStyles, IIconStyles } from '@fluentui/react';
import { ActionButton, FontSizes, getTheme, mergeStyles } from '@fluentui/react';
import { hexToRgbA } from '@microsoft/utils-logic-apps';
import * as React from 'react';

export interface IChatSuggestionGroupProps {
  children: React.ReactElement<IChatSuggestionProps> | Array<React.ReactElement<IChatSuggestionProps> | null | undefined | false>;
}

export const ChatSuggestionGroup: React.FC<IChatSuggestionGroupProps> = ({ children }) => {
  const styles = getStyles();
  const rootClassName = mergeStyles(styles.root);
  const childrenArray = React.Children.toArray(children);
  return childrenArray.length ? <div className={rootClassName}>{children}</div> : null;
};

const getStyles = () => {
  return {
    root: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginBottom: 8,
    },
  };
};

export interface IChatSuggestionProps {
  text?: string;
  iconName?: string;
  onClick: () => void;
}

export const ChatSuggestion: React.FC<IChatSuggestionProps> = ({ text, iconName, onClick }) => {
  const iconStyles = getIconStyles();
  const buttonStyles = getButtonStyles();
  return <ActionButton text={text} iconProps={{ iconName, styles: iconStyles }} onClick={onClick} styles={buttonStyles} />;
};

const getIconStyles = (): IIconStyles => {
  const theme = getTheme();
  return {
    root: {
      color: theme.palette.neutralPrimaryAlt,
      display: 'flex',
      alignItems: 'center',
    },
  };
};

const getButtonStyles = (): IButtonStyles => {
  const theme = getTheme();
  return {
    root: {
      color: theme.palette.neutralPrimaryAlt,
      border: `1px solid ${theme.palette.themeTertiary}`,
      borderRadius: 8,
      height: 24,
      backgroundColor: 'transparent',
      fontSize: FontSizes.smallPlus,
    },
    rootHovered: {
      color: theme.palette.neutralPrimary,
      backgroundColor: theme.palette.themeLighter,
      borderColor: hexToRgbA(theme.palette.themeSecondary, 0.7),
    },
    rootPressed: {
      color: theme.palette.neutralPrimary,
      borderColor: hexToRgbA(theme.palette.themeSecondary, 0.9),
    },
    iconHovered: {
      color: theme.palette.neutralPrimary,
    },
    iconPressed: {
      color: theme.palette.neutralPrimary,
    },
  };
};
