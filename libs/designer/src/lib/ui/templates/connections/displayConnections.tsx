import { Button } from '@fluentui/react-components';
import type { Template } from '@microsoft/logic-apps-shared';

export interface DisplayConnectionsProps {
  connections: Record<string, Template.Connection>;
}

export const DisplayConnections = ({ connections }: DisplayConnectionsProps) => {
  return (
    <>
      <div>Template Connections</div>
      {Object.keys(connections).map((connectionKey, index) => {
        const connection = connections[connectionKey];
        return (
          <div key={index}>
            <b>
              {index + 1}: {connection?.id}
              <Button
                appearance="outline"
                onClick={() => {
                  console.log('TODO: show connection for this');
                }}
              >
                CHOOSE
              </Button>
            </b>
            <div>- ID: {connection?.id}</div>
          </div>
        );
      })}
    </>
  );
};
