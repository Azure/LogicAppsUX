import { IFrameTermsOfService } from './iFrameTOS';
import { DefaultButton, MessageBar, PrimaryButton } from '@fluentui/react';
import { useIntl } from 'react-intl';

interface ConnectionAuthProps {
  connectorDisplayName: string;
  isLoading?: boolean;
  errorMessage?: string;
  authClickCallback?: () => void;
  cancelCallback?: () => void;
  hideCancelButton?: boolean;
  tosUrl?: string;
}

export const ConnectionAuth = (props: ConnectionAuthProps) => {
  const {
    connectorDisplayName,
    isLoading = false,
    errorMessage,
    authClickCallback,
    cancelCallback,
    hideCancelButton = false,
    tosUrl,
  } = props;
  const intl = useIntl();

  const descriptionText = intl.formatMessage(
    {
      defaultMessage: 'Sign in to create a connection to {connectorDisplayName}.',
      description: 'Description for creating an externally authenticated connection.',
    },
    { connectorDisplayName }
  );

  const signInText = intl.formatMessage({
    defaultMessage: 'Sign in',
    description: 'Text for sign in button.',
  });

  const signInButtonAria = intl.formatMessage({
    defaultMessage: 'Sign in to connector',
    description: 'Aria label description for sign in button.',
  });

  const buttonLoadingText = intl.formatMessage({
    defaultMessage: 'Signing in...',
    description: 'Text for sign in button while loading.',
  });

  const cancelButtonText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button to cancel creating a connection',
  });

  const cancelButtonAria = intl.formatMessage({
    defaultMessage: 'Cancel creating a connection',
    description: 'aria label description for cancel button',
  });

  const errorText = intl.formatMessage(
    {
      defaultMessage: "Failed with error: '{errorMessage}'. Please sign in again.",
      description: 'Error message for creating a connection',
    },
    { errorMessage }
  );

  return (
    <div className="msla-create-connection-container">
      {errorMessage ? <MessageBar>{errorText}</MessageBar> : null}
      <div>{descriptionText}</div>
      <IFrameTermsOfService url={tosUrl} />

      <div className="msla-create-connection-actions-container">
        <PrimaryButton
          disabled={isLoading}
          text={!isLoading ? signInText : buttonLoadingText}
          ariaLabel={signInButtonAria}
          onClick={authClickCallback}
        />
        {!hideCancelButton ? (
          <DefaultButton disabled={isLoading} text={cancelButtonText} ariaLabel={cancelButtonAria} onClick={cancelCallback} />
        ) : null}
      </div>
    </div>
  );
};
