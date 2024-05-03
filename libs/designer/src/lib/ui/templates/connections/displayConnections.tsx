import { Button } from '@fluentui/react-components';
import type { Template } from '@microsoft/logic-apps-shared';

export interface DisplayConnectionsProps {
  connections: Record<string, Template.Connection>;
}

export const DisplayConnections = ({ connections }: DisplayConnectionsProps) => {
  return (
    <>
      <div>Template Connections</div>
      {Object.keys(connections).map((connection, index) => {
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
            <div>- ID: {connections[connection]?.id}</div>
          </div>
        );
      })}
    </>
  );
};
