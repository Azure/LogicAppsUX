import constants from '../constants';
import { FontSizes, IconButton, mergeStyles, mergeStyleSets, TextField, useTheme } from '@fluentui/react';
import type { IButtonProps, IStyle, ITextField, ITextFieldStyles } from '@fluentui/react';
import type { FC, FormEvent, FocusEvent, KeyboardEventHandler, RefObject } from 'react';
import { useCallback } from 'react';

export interface IChatInputProps {
  query: string;
  placeholder: string;
  autoFocus?: boolean;
  disabled?: boolean;
  isMultiline?: boolean;
  maxQueryLength?: number;
  submitButtonProps: IButtonProps & { onClick: () => void };
  showCharCount?: boolean;
  onQueryChange: (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;
  onBlur?: (ev: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onRenderPrefix?: () => JSX.Element;
  textFieldRef?: RefObject<ITextField>;
  role?: string;
  styles?: Partial<IChatInputStyles>;
}

export const ChatInput: FC<IChatInputProps> = ({
  query,
  placeholder,
  showCharCount,
  disabled,
  autoFocus,
  maxQueryLength,
  isMultiline,
  submitButtonProps,
  onQueryChange,
  onBlur,
  onKeyDown,
  onRenderPrefix,
  textFieldRef,
  role,
  styles,
}) => {
  const { isInverted } = useTheme();
  const chatInputStyles = getChatInputStyles(isInverted);

  const rootClassName = mergeStyles(chatInputStyles.root, styles?.root);
  const charCounterClassName = mergeStyles(chatInputStyles.charCounter, styles?.charCounter);
  const footerClassName = mergeStyles(chatInputStyles.footer, styles?.footer);

  const textFieldStyles = mergeStyleSets(chatInputStyles.textField, styles?.textField);

  const { onClick } = submitButtonProps;
  const submitOnEnter: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback(
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
      <div className={footerClassName}>
        {showCharCount && <div className={charCounterClassName}>{`${query.length}/${maxQueryLength}`}</div>}
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

const getChatInputStyles = (isInverted?: boolean): IChatInputStyles => {
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: constants.NEUTRAL_TERTIARY,
      borderRadius: 8,
      padding: 5,
      backgroundColor: isInverted ? constants.DARK_SECONADRY : constants.WHITE,
    },
    textField: {
      fieldGroup: {
        backgroundColor: isInverted ? constants.DARK_SECONADRY : constants.WHITE,
      },
      field: {
        paddingBottom: 16,
        backgroundColor: isInverted ? constants.DARK_SECONADRY : constants.WHITE,
        ':disabled': {
          backgroundColor: isInverted ? constants.DARK_SECONADRY : constants.WHITE,
        },
        '::placeholder, :-ms-input-placeholder, ::-ms-input-placeholder': {
          color: isInverted ? constants.GRAY : constants.NEUTRAL_SECONDARY_ALT,
          opacity: 1, // Firefox adds a lower opacity to the placeholder, so we use opacity: 1 to fix this.,
        },
      },
    },
    charCounter: {
      fontSize: FontSizes.small,
      color: isInverted ? constants.GRAY : constants.NEUTRAL_SECONDARY_ALT,
      textAlign: 'left',
      paddingLeft: 8,
      width: 'fit-content',
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      width: 'fit-contet',
    },
  };
};
