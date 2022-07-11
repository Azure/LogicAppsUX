import { PrimaryButton } from '@fluentui/react';
import type { Connection } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

export interface CreateSimpleConnectionProps {
  connection: Connection;
  isLoading?: boolean;
  createConnectionCallback?: () => void;
}

export const CreateSimpleConnection = (props: CreateSimpleConnectionProps): JSX.Element => {
  const { connection, isLoading, createConnectionCallback } = props;

  const intl = useIntl();

  const componentDescription = intl.formatMessage(
    {
      defaultMessage: 'Create a connection for {connectorName}.',
      description: 'Create a connection for selected connector',
    },
    {
      connectorName: connection.properties.api.displayName,
    }
  );

  const createButtonText = intl.formatMessage({
    defaultMessage: 'Create New',
    description: 'Button to add a new connection',
  });

  const createButtonLoadingText = intl.formatMessage({
    defaultMessage: 'Creating...',
    description: 'Button text to show a connection is being created',
  });

  const createButtonAria = intl.formatMessage({
    defaultMessage: 'Create a new connection',
    description: 'aria label description for create button',
  });

  return (
    <div className="msla-create-connection-container">
      <div>{componentDescription}</div>

      <div className="msla-create-connection-actions-container">
        <PrimaryButton
          disabled={isLoading}
          text={isLoading ? createButtonLoadingText : createButtonText}
          ariaLabel={createButtonAria}
          onClick={createConnectionCallback}
        />
      </div>
    </div>
  );
};
