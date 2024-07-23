import { FontSizes, mergeStyles, mergeStyleSets, TextField, useTheme } from '@fluentui/react';
import type { IStyle, ITextField, ITextFieldStyles } from '@fluentui/react';
import constants from '../../lib/chatbot/constants';
import type { FC, FormEvent, FocusEvent, KeyboardEventHandler, RefObject } from 'react';
import { Button } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface INl2fInputBoxProps {
  query: string;
  placeholder: string;
  autoFocus?: boolean;
  disabled?: boolean;
  isMultiline?: boolean;
  maxQueryLength?: number;
  showCharCount?: boolean;
  textFieldRef?: RefObject<ITextField>;
  role?: string;
  styles?: Partial<IChatInputStyles>;
  onQueryChange: (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;
  onBlur?: (ev: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onRenderPrefix?: () => JSX.Element;
  onSubmitInputQuery: (input: string) => Promise<void>;
}

export const Nl2fInputBox: FC<INl2fInputBoxProps> = ({
  query,
  placeholder,
  showCharCount,
  disabled,
  autoFocus,
  maxQueryLength,
  isMultiline,
  onQueryChange,
  onBlur,
  onRenderPrefix,
  onSubmitInputQuery,
  textFieldRef,
  role,
  styles,
}) => {
  const { isInverted } = useTheme();
  const nl2fInputStyles = getNl2fInputStyles(isInverted);
  const rootClassName = mergeStyles(nl2fInputStyles.root, styles?.root);
  const charCounterClassName = mergeStyles(nl2fInputStyles.charCounter, styles?.charCounter);
  const footerClassName = mergeStyles(nl2fInputStyles.footer, styles?.footer);
  const textFieldStyles = mergeStyleSets(nl2fInputStyles.textField, styles?.textField);

  const intl = useIntl();
  const createExpressionButton = intl.formatMessage({
    defaultMessage: 'Create expression',
    id: 'o6x5J4',
    description: 'Title for create expression button.',
  });

  return (
    <div>
      <div className={rootClassName}>
        <TextField
          data-testId={'expression-assistant-input-box-text'}
          value={query}
          componentRef={textFieldRef}
          placeholder={placeholder}
          multiline={isMultiline}
          autoAdjustHeight={false}
          borderless={true}
          resizable={false}
          type="text"
          role={role}
          autoFocus={autoFocus}
          autoComplete="off"
          styles={textFieldStyles}
          maxLength={maxQueryLength}
          disabled={disabled}
          onChange={onQueryChange}
          onBlur={onBlur}
          onRenderPrefix={onRenderPrefix}
        />
        <div className={footerClassName}>
          {showCharCount && <div className={charCounterClassName}>{`${query.length}/${maxQueryLength}`}</div>}
        </div>
      </div>
      <div className="msla-token-picker-nl2fex-submit-button-container">
        <Button
          data-testId={'expression-assistant-input-box-submit'}
          className="msla-token-picker-nl2fex-submit-button"
          size="medium"
          onClick={() => onSubmitInputQuery(query)}
          title={createExpressionButton}
          aria-label={createExpressionButton}
          disabled={disabled || !query}
        >
          <span>{createExpressionButton}</span>
        </Button>
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

const getNl2fInputStyles = (isInverted?: boolean): IChatInputStyles => {
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '344px',
      height: '143px',
      border: '1px solid #D2D0CE',
      borderRadius: 4,
      padding: '10px 12px 10px 12px',
      backgroundColor: isInverted ? constants.DARK_SECONADRY : constants.WHITE,
    },
    textField: {
      fieldGroup: {
        backgroundColor: isInverted ? constants.DARK_SECONADRY : constants.WHITE,
      },
      field: {
        display: 'flex',
        gap: '12px',
        fontFamily: 'Segoe UI',
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: '20px',
        textAlign: 'left',
        height: '120px',
        padding: 0,
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
    },
    footer: {
      display: 'flex',
      justifyContent: 'right',
      paddingRight: 8,
    },
  };
};
