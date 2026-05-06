import { Button, Textarea, Text, makeStyles, mergeClasses, tokens, Tooltip } from '@fluentui/react-components';
import { bundleIcon, SendFilled, SendRegular } from '@fluentui/react-icons';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import type { FocusEvent, KeyboardEventHandler } from 'react';

export interface ChatInputSubmitButtonProps {
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface ChatInputHandle {
  focus: () => void;
  blur: () => void;
}

export interface IChatInputProps {
  query: string;
  placeholder: string;
  autoFocus?: boolean;
  disabled?: boolean;
  isMultiline?: boolean;
  maxQueryLength?: number;
  submitButtonProps: ChatInputSubmitButtonProps;
  showCharCount?: boolean;
  onQueryChange: (event: { target: { value: string } }, newValue?: string) => void;
  onBlur?: (ev: FocusEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  role?: string;
  className?: string;
}

const SendIcon = bundleIcon(SendFilled, SendRegular);

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '8px',
    padding: '5px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  textarea: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: 'none !important',
    outline: 'none !important',
    '& textarea': {
      paddingBottom: '16px',
    },
    '::after': {
      display: 'none',
    },
  },
  charCounter: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: 'left',
    paddingLeft: '8px',
    width: 'fit-content',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  submitButton: {
    minWidth: 'auto',
  },
});

export const ChatInput = forwardRef<ChatInputHandle, IChatInputProps>(
  (
    {
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
      role,
      className,
    },
    ref
  ) => {
    const styles = useStyles();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
    }));

    const { onClick } = submitButtonProps;
    const submitOnEnter: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
      (event) => {
        if (!disabled && event.key === 'Enter' && !event.shiftKey) {
          onClick();
          event.preventDefault();
          event.stopPropagation();
        }
      },
      [onClick, disabled]
    );

    return (
      <div className={mergeClasses(styles.root, className)}>
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          resize="none"
          appearance="outline"
          role={role}
          autoFocus={autoFocus}
          autoComplete="off"
          className={styles.textarea}
          maxLength={maxQueryLength}
          disabled={disabled}
          value={query}
          onChange={(_ev, data) => {
            onQueryChange({ target: { value: data.value } }, data.value);
          }}
          onBlur={onBlur}
          onKeyDown={onKeyDown ?? submitOnEnter}
          rows={isMultiline ? 3 : 1}
        />
        <div className={styles.footer}>
          {showCharCount && <Text className={styles.charCounter}>{`${query.length}/${maxQueryLength}`}</Text>}
          <Tooltip content={submitButtonProps.title ?? ''} relationship="label">
            <Button
              appearance="transparent"
              size="small"
              className={styles.submitButton}
              icon={<SendIcon />}
              disabled={disabled || submitButtonProps.disabled}
              onClick={submitButtonProps.onClick}
            />
          </Tooltip>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';
