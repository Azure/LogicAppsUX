import { Button, InlineDrawer, DrawerBody, DrawerHeader, DrawerHeaderTitle } from '@fluentui/react-components';
import { DismissRegular, ShieldCheckmarkRegular } from '@fluentui/react-icons';
import {
  ChatInput,
  type ChatInputHandle,
  ChatSuggestion,
  ChatSuggestionGroup,
  type ConversationItem,
  ConversationMessage,
  PanelLocation,
  ProgressCardWithStopButton,
} from '@microsoft/designer-ui';
import { useEffect, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useChatbotStyles } from './styles';

export const defaultChatbotPanelWidth = '360px';

interface ChatbotUIProps {
  panel: {
    width?: string;
    location?: PanelLocation;
    isOpen?: boolean;
    onDismiss?: () => void;
    header?: React.ReactNode;
  };
  inputBox: {
    disabled?: boolean;
    value?: string;
    placeholder?: string;
    onChange?: (value: string) => void;
    onSubmit: (value: string) => void;
    readOnly?: boolean;
  };
  data?: {
    isSaving?: boolean;
    canSave?: boolean;
    canTest?: boolean;
    test?: () => void;
    save?: () => void;
    abort?: () => void;
  };
  string: {
    test?: string;
    save?: string;
    submit?: string;
    progressState: string;
    progressStop?: string;
    progressSave: string;
    protectedMessage?: string;
  };
  body: {
    messages: ConversationItem[];
    focus: boolean;
    answerGenerationInProgress: boolean;
    setFocus: (value: boolean) => void;
    focusMessageId?: string;
    clearFocusMessageId?: () => void;
  };
}

const QUERY_MIN_LENGTH = 5;
const QUERY_MAX_LENGTH = 2000;

export const ChatbotUI = (props: ChatbotUIProps) => {
  const {
    body: { messages, focus, answerGenerationInProgress, setFocus, focusMessageId, clearFocusMessageId },
    inputBox: { disabled, placeholder, value = '', onChange, onSubmit, readOnly },
    data: { isSaving, canSave, canTest, test, save, abort } = {},
    string: { test: testString, save: saveString, submit: submitString, progressState, progressStop, progressSave, protectedMessage },
  } = props;
  const intl = useIntl();
  const textInputRef = useRef<ChatInputHandle>(null);

  // Styles
  const styles = useChatbotStyles();

  useEffect(() => {
    if (focus) {
      textInputRef.current?.focus();
      setFocus(false);
    }
  }, [focus, setFocus, textInputRef]);

  useEffect(() => {
    if (focusMessageId) {
      const querySelector = `[data-scroll-target="${focusMessageId}"]`;
      const element = document.querySelector<HTMLElement>(querySelector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      clearFocusMessageId?.();
    }
  }, [focusMessageId, clearFocusMessageId]);

  const intlText = useMemo(() => {
    return {
      inputPlaceHolder: intl.formatMessage({
        defaultMessage: 'Enter your question or query here.',
        id: '6jBzPt',
        description: 'Chatbot input placeholder text',
      }),
      submitButton: intl.formatMessage({
        defaultMessage: 'Submit',
        id: 'Oep6va',
        description: 'Submit button',
      }),
      saveButton: intl.formatMessage({
        defaultMessage: 'Save this workflow',
        id: 'OYWZE4',
        description: 'Chatbot suggestion button to save workflow',
      }),
      testButton: intl.formatMessage({
        defaultMessage: 'Test this workflow',
        id: 'tTIsTX',
        description: 'Chatbot suggestion button to test this workflow',
      }),
    };
  }, [intl]);

  const inputDisabled = !!(answerGenerationInProgress || disabled);
  const trimmedLength = value.trim().length;
  const submitDisabled = answerGenerationInProgress || trimmedLength < QUERY_MIN_LENGTH;
  const resolvedPlaceholder = placeholder ?? intlText.inputPlaceHolder;

  const showFooter = protectedMessage || canSave || canTest || !readOnly;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {answerGenerationInProgress && (
          <ProgressCardWithStopButton onStopButtonClick={abort} progressState={progressState} stopButtonLabel={progressStop} />
        )}
        {isSaving && <ProgressCardWithStopButton progressState={progressSave} />}
        {messages.map((item, index) => (
          <ConversationMessage key={`${index}-${item.id}`} item={item} />
        ))}
      </div>
      {showFooter ? (
        <div className={styles.footer}>
          {protectedMessage ? (
            <div className={styles.protectedFooter}>
              <ShieldCheckmarkRegular className={styles.shieldCheckmarkRegular} /> {protectedMessage}
            </div>
          ) : null}
          {canSave || canTest ? (
            <ChatSuggestionGroup>
              {canSave && <ChatSuggestion text={saveString ?? intlText.saveButton} iconName={'Save'} onClick={() => save?.()} />}
              {canTest && <ChatSuggestion text={testString ?? intlText.testButton} iconName={'TestBeaker'} onClick={() => test?.()} />}
            </ChatSuggestionGroup>
          ) : null}
          {readOnly ? null : (
            <ChatInput
              ref={textInputRef}
              disabled={inputDisabled}
              isMultiline
              maxQueryLength={QUERY_MAX_LENGTH}
              onQueryChange={(_ev, newValue) => onChange?.(newValue ?? '')}
              placeholder={resolvedPlaceholder}
              query={value}
              showCharCount
              submitButtonProps={{
                title: submitString ?? intlText.submitButton,
                disabled: submitDisabled,
                onClick: () => onSubmit(value),
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

export const AssistantChat = (props: ChatbotUIProps) => {
  const {
    panel: { width = defaultChatbotPanelWidth, location = PanelLocation.Left, isOpen, onDismiss, header },
  } = props;

  const intl = useIntl();
  const closeButtonLabel = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'ZihyUf',
    description: 'Label for the close button in the chatbot header',
  });

  return (
    <InlineDrawer open={isOpen} position={location === PanelLocation.Right ? 'end' : 'start'} style={{ width, height: '100%' }} separator>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" aria-label={closeButtonLabel} icon={<DismissRegular />} onClick={onDismiss} />}
        >
          {header}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody style={{ padding: 0 }}>
        <ChatbotUI {...props} />
      </DrawerBody>
    </InlineDrawer>
  );
};
