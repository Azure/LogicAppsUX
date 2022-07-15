import { CreateConfigurableConnection } from './createConfigurableConnection';
import { CreateSimpleConnection } from './createSimpleConnection';
import { DefaultButton } from '@fluentui/react';

export const CreateConnection = (props: any) => {
  const { connector, createConnectionCallback, cancelCallback } = props;

  if (!connector)
    return (
      <div>
        <p>{'Connector is undefined'}</p>
        <DefaultButton text={'Return'} onClick={cancelCallback} />
      </div>
    );
  if (connector.properties?.connectionParameters || connector.properties?.connectionParametersSet)
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
