import { FontSizes, getTheme, IconButton, mergeStyles, mergeStyleSets, TextField } from '@fluentui/react';
import type { IButtonProps, IStyle, ITextField, ITextFieldStyles } from '@fluentui/react';
import React from 'react';
import type { FormEvent } from 'react';

export interface IChatInputProps {
  query: string;
  placeholder: string;
  autoFocus?: boolean;
  disabled?: boolean;
  isMultiline?: boolean;
  maxQueryLength?: number;
  submitButtonProps: IButtonProps & { onClick: () => void };
  showCharCount?: boolean;
  footerActionsProps?: IButtonProps[];
  onQueryChange: (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;
  onBlur?: (ev: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onRenderPrefix?: () => JSX.Element;
  textFieldRef?: React.RefObject<ITextField>;
  role?: string;
  styles?: Partial<IChatInputStyles>;
}

export const ChatInput: React.FC<IChatInputProps> = ({
  query,
  placeholder,
  showCharCount,
  disabled,
  autoFocus,
  maxQueryLength,
  isMultiline,
  submitButtonProps,
  footerActionsProps,
  onQueryChange,
  onBlur,
  onKeyDown,
  onRenderPrefix,
  textFieldRef,
  role,
  styles,
}) => {
  const chatInputStyles = getChatInputStyles();

  const rootClassName = mergeStyles(chatInputStyles.root, styles?.root);
  const charCounterClassName = mergeStyles(chatInputStyles.charCounter, styles?.charCounter);
  const footerClassName = mergeStyles(chatInputStyles.footer, styles?.footer);

  const textFieldStyles = mergeStyleSets(chatInputStyles.textField, styles?.textField);

  const { onClick } = submitButtonProps;
  const submitOnEnter: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = React.useCallback(
    (event) => {
      // ENTER+SHIFT is ignored to allow adding new lines
      if (!disabled && event.key === 'Enter' && !event.shiftKey) {
        onClick();
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [onClick, disabled]
  );

  return (
    <div className={rootClassName}>
      <TextField
        componentRef={textFieldRef}
        placeholder={placeholder}
        multiline={isMultiline}
        autoAdjustHeight={true}
        borderless={true}
        resizable={false}
        type="text"
        role={role}
        autoFocus={autoFocus}
        autoComplete="off"
        styles={textFieldStyles}
        maxLength={maxQueryLength}
        disabled={disabled}
        value={query}
        onChange={onQueryChange}
        onBlur={onBlur}
        onRenderPrefix={onRenderPrefix}
        onKeyDown={onKeyDown ?? submitOnEnter}
      />
      {showCharCount && <div className={charCounterClassName}>{`${query.length}/${maxQueryLength}`}</div>}
      <div className={footerClassName}>
        <div>
          {footerActionsProps?.map((actionProps, index) => (
            <IconButton key={index} {...actionProps} disabled={disabled || actionProps.disabled} />
          ))}
        </div>
        <IconButton {...submitButtonProps} disabled={disabled || submitButtonProps.disabled} />
      </div>
    </div>
  );
};

export interface IChatInputStyles {
  root: IStyle;
  textField: Partial<ITextFieldStyles>;
  charCounter: IStyle;
  footer: IStyle;
}

const getChatInputStyles = (): IChatInputStyles => {
  const theme = getTheme();
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: theme.palette.neutralTertiary,
      borderRadius: 8,
      padding: 5,
      backgroundColor: theme.palette.white,
    },
    textField: {
      fieldGroup: {
        backgroundColor: theme.palette.white,
      },
      field: {
        paddingBottom: 16,
        backgroundColor: theme.palette.white,
        ':disabled': {
          backgroundColor: theme.palette.white,
        },
        '::placeholder, :-ms-input-placeholder, ::-ms-input-placeholder': {
          color: theme.palette.neutralSecondaryAlt,
          opacity: 1, // Firefox adds a lower opacity to the placeholder, so we use opacity: 1 to fix this.,
        },
      },
    },
    charCounter: {
      fontSize: FontSizes.small,
      color: theme.palette.neutralSecondaryAlt,
      textAlign: 'left',
      paddingLeft: 8,
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
    },
  };
};
