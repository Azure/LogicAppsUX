import INTL_STRINGS from '../createConnectionStrings';
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

  return (
    <div className="msla-create-connection-simple-container">
      <div>{intl.formatMessage(INTL_STRINGS.SIMPLE_CREATE_DESCRIPTION, { connectorName: connection.properties.api.displayName })}</div>

      <div className="msla-create-connection-actions-container">
        <PrimaryButton
          disabled={isLoading}
          text={intl.formatMessage(isLoading ? INTL_STRINGS.BUTTON_CREATE_LOADING : INTL_STRINGS.BUTTON_CREATE)}
          ariaLabel={intl.formatMessage(INTL_STRINGS.BUTTON_CREATE_ARIA)}
          onClick={createConnectionCallback}
        />
      </div>
    </div>
  );
};
