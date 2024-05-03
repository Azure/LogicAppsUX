import { Button } from '@fluentui/react-components';
import type { Template } from '@microsoft/logic-apps-shared';

export interface DisplayConnectionsProps {
  connections: Template.Connection[];
}

export const DisplayConnections = ({ connections }: DisplayConnectionsProps) => {
  return (
    <>
      <div>Template Connections</div>
      {connections.map((connection, index) => {
        return (
          <div key={index}>
            <b>
              {index + 1}: {connection?.id}{' '}
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
