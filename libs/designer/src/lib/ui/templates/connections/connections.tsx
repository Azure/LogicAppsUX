import type { Template } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../core/state/templates/store';
import { getUniqueConnectors } from '../../../core/templates/utils/helper';
import { useSelector } from 'react-redux';
import { ConnectorWithDetails } from './connector';
import { List } from '@fluentui/react';

export const ConnectionsList = (props: { connections: Record<string, Template.Connection> }): JSX.Element => {
  const { subscriptionId, location } = useSelector((state: RootState) => state.workflow);
  const connectors = getUniqueConnectors(props.connections, subscriptionId, location);

  const onRenderCell = (item: Template.FeaturedConnector | undefined): JSX.Element => {
    if (!item) {
      return <div>No data</div>;
    }

    return (
      <div className="msla-template-overview-connection">
        <ConnectorWithDetails connectorId={item.id} kind={item.kind} />
      </div>
    );
  };

  return (
    <div className="msla-template-overview-connections">
      <List items={connectors} onRenderCell={onRenderCell} />
    </div>
  );
};
