import { useIntl } from 'react-intl';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import { bundleIcon, Chat24Filled, Chat24Regular, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import type { AgentURL } from '@microsoft/logic-apps-shared';
import { MessageBar, MessageBarType } from '@fluentui/react';

export interface ChatButtonProps {
  loading?: boolean;
  data?: AgentURL;
  isWorkflowRuntimeRunning?: boolean;
  buttonCommonProps: any;
}

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const ChatButton: React.FC<ChatButtonProps> = ({ loading, data, isWorkflowRuntimeRunning, buttonCommonProps }: ChatButtonProps) => {
  const intl = useIntl();

  const IntlText = useMemo(
    () => ({
      CHAT_TEXT: intl.formatMessage({
        defaultMessage: 'Chat',
        id: '9VbsXx',
        description: 'Chat button text',
      }),
      LOADING: intl.formatMessage({
        defaultMessage: 'Loading',
        id: 'WgJsL1',
        description: 'Loading text',
      }),
      TITLE: intl.formatMessage({
        defaultMessage: 'Agent chat',
        id: 'Xj/wPS',
        description: 'Agent chat title',
      }),
      DEBUG_PROJECT_ERROR: intl.formatMessage({
        defaultMessage: 'Please start the project by pressing F5 or run it through the Run and Debug view.',
        id: 'VWH06W',
        description: 'Debug project error message',
      }),
    }),
    [intl]
  );

  const chatContent = useMemo(() => {
    if (loading) {
      return <Spinner size="medium" label={IntlText.LOADING} />;
    }

    if (!isWorkflowRuntimeRunning) {
      return (
        <MessageBar data-testid="msla-overview-error-message" isMultiline={false} messageBarType={MessageBarType.error}>
          {IntlText.DEBUG_PROJECT_ERROR}
        </MessageBar>
      );
    }

    return (
      <iframe
        src={`${data?.chatUrl}?apiKey=${data?.queryParams?.apiKey}${buttonCommonProps.isDarkMode ? '&mode=dark' : ''}`}
        title={IntlText.TITLE}
        style={{ width: '100%', height: '99%', border: 'none', borderRadius: tokens.borderRadiusXLarge }}
      />
    );
  }, [loading, isWorkflowRuntimeRunning, data, IntlText, buttonCommonProps.isDarkMode]);

  return (
    <Dialog modalType="non-modal" surfaceMotion={null}>
      <DialogTrigger disableButtonEnhancement>
        <Button {...buttonCommonProps} icon={<ChatIcon />}>
          {IntlText.CHAT_TEXT}
        </Button>
      </DialogTrigger>
      <DialogSurface style={{ width: '70vw', maxWidth: '70vw' }}>
        <DialogBody>
          <DialogTitle
            action={
              <DialogTrigger action="close">
                <Button appearance="subtle" aria-label="close" icon={<CloseIcon />} />
              </DialogTrigger>
            }
          />
          <DialogContent style={{ height: '70vh', padding: 0 }}>{chatContent}</DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
