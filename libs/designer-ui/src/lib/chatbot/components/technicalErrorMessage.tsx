import { useIntl } from 'react-intl';

interface TechnicalErrorMessageProps {
  message: string;
  chatSessionId: string;
}

export const TechnicalErrorMessage = ({ message, chatSessionId }: TechnicalErrorMessageProps) => {
  const intl = useIntl();
  const chatSessionText = intl.formatMessage({
    defaultMessage: 'chat-session-id:',
    id: 'YF1yZk',
    description: 'Chatbot session id',
  });
  return (
    <>
      {message}
      <pre className={'msla-assistant-error-container'}>
        <div className={'msla-assistant-error-session-id-container'}>
          <span className={'msla-assistant-error-session-id'}>{chatSessionText}</span>
          {chatSessionId}
        </div>
      </pre>
    </>
  );
};
