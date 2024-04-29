import { Button } from '@fluentui/react-components';
import type { TemplateConnection } from '@microsoft/logic-apps-shared';

export interface DisplayConnectionsProps {
  connections: Record<string, TemplateConnection>;
}

export const DisplayConnections = ({ connections }: DisplayConnectionsProps) => {
  return (
    <div>
      <div>Template Connections</div>
      {Object.keys(connections)?.map((connection, index) => {
        return (
          <div key={index}>
            <b>
              {index + 1}: {connection}{' '}
              <Button
                appearance="outline"
                onClick={() => {
                  console.log('TODO: show connection for this');
                }}
              >
                CHOOSE
              </Button>
            </b>
            <div>
              <div>- ID: {connections[connection]?.id}</div>
              <div>- ConnectionID: {connections[connection]?.connectionId}</div>
              <div>- ConnectionName: {connections[connection]?.connectionName}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
