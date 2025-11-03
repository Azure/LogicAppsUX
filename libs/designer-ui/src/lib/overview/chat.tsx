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

export interface ChatButtonProps {
  loading?: boolean;
  data?: AgentURL;
  buttonCommonProps: any;
}

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const ChatButton: React.FC<ChatButtonProps> = ({ loading, data, buttonCommonProps }: ChatButtonProps) => {
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
    }),
    [intl]
  );

  const chatContent = useMemo(() => {
    if (loading) {
      return <Spinner size="medium" label={IntlText.LOADING} />;
    }

    const chatUrl = `${data?.chatUrl}?apiKey=${data?.queryParams?.apiKey}${data?.queryParams?.oboUserToken ? `&oboUserToken=${data?.queryParams?.oboUserToken}` : ''}${buttonCommonProps.isDarkMode ? '&mode=dark' : ''}`;
    console.log('Chat URL:', chatUrl);
    console.log('OBO User Token:', data?.queryParams?.['oboUserToken']);

    return (
      <iframe
        src={chatUrl}
        title={IntlText.TITLE}
        style={{ width: '100%', height: '99%', border: 'none', borderRadius: tokens.borderRadiusXLarge }}
      />
    );
  }, [loading, data, IntlText, buttonCommonProps.isDarkMode]);

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
