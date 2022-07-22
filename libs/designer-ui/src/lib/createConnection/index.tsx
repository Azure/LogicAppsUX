import { CreateConfigurableConnection } from './createConfigurableConnection';
import { CreateSimpleConnection } from './createSimpleConnection';
import type { Connector } from '@microsoft-logic-apps/utils';

interface CreateConnectionProps {
  connector: Connector;
  createConnectionCallback: () => void;
  cancelCallback: () => void;
}

export const CreateConnection = (props: CreateConnectionProps) => {
  const { connector, createConnectionCallback, cancelCallback } = props;

  if (connector.properties?.connectionParameters || connector.properties?.['connectionParametersSet'])
    return (
      <CreateConfigurableConnection
        connector={connector}
        isLoading={false}
        createConnectionCallback={createConnectionCallback}
        cancelCallback={cancelCallback}
      />
    );
  return <CreateSimpleConnection connector={connector} isLoading={false} createConnectionCallback={createConnectionCallback} />;
};
