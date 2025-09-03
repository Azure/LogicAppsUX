import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { getConnectionMetadata, reloadParametersTab, updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import { useConnectorByNodeId, useNodeConnectionId } from '../../../../../core/state/connection/connectionSelector';
import { useConnectionPanelSelectedNodeIds, useOperationPanelSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useOperationManifest } from '../../../../../core/state/selectors/actionMetadataSelector';
import { useOperationInfo } from '../../../../../core';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';
import { getAssistedConnectionProps } from '../../../../../core/utils/connectors/connections';
import { customLengthGuid, equals, foundryServiceConnectionRegex, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { Button, Text } from '@fluentui/react-components';
import type { CreatedConnectionPayload } from '../../../connectionsPanel/createConnection/createConnectionWrapper';
import { CreateConnectionInternal } from '../../../connectionsPanel/createConnection/createConnectionInternal';
import type { AppDispatch, RootState } from '../../../../../core';
import { TeachingPopup } from '@microsoft/designer-ui';
import { AgentUtils } from '../../../../../common/utilities/Utils';

const agentFirstConnetionKey = 'agent-first-connection-teaching-popup';
interface ConnectionInlineProps {
  setShowSubComponent?: React.Dispatch<React.SetStateAction<boolean>>;
  showSubComponent?: boolean;
  subLabelOnly?: boolean;
}

export const ConnectionInline: React.FC<ConnectionInlineProps> = ({ showSubComponent, setShowSubComponent, subLabelOnly }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const nodeId: string = useOperationPanelSelectedNodeId();
  const nodeIds = useConnectionPanelSelectedNodeIds();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const allReferences = useSelector((state: RootState) => state.connections.connectionReferences);
  const allReferenceKeys = useMemo(() => Object.keys(allReferences), [allReferences]);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery?.data ?? [], [connectionQuery]);
  const hasExistingConnections = useMemo(() => connections.length > 0, [connections]);
  const [showCreateConnection, setShowCreateConnection] = useState(hasExistingConnections);
  const currentConnectionId = useNodeConnectionId(nodeId);
  const noConnectionButtonId = `change-connection-button-${customLengthGuid(6)}`;
  const [shouldDisplayPopup, setShouldDisplayPopup] = useState(localStorage.getItem(agentFirstConnetionKey) !== 'true');
  const targetElement = document.getElementById(noConnectionButtonId);
  const selectedConnection = useMemo(
    () => connections.find((connection) => connection.id === currentConnectionId),
    [connections, currentConnectionId]
  );

  const setConnection = useCallback(() => {
    setShowCreateConnection(true);
  }, [setShowCreateConnection]);

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  useEffect(() => {
    setShowCreateConnection(hasExistingConnections);
  }, [hasExistingConnections]);

  const intlText = useMemo(
    () => ({
      CONNECT: intl.formatMessage({
        defaultMessage: 'Connect',
        id: 'F0rSr0',
        description: 'Text to show that the user can create the connection',
      }),
      NO_CONNECTION_SELECTED: intl.formatMessage({
        defaultMessage: 'No connection has been selected',
        id: 'WtO4Wv',
        description: 'Text to show that no connection has been selected',
      }),
      CURRENT_CONNECTION: intl.formatMessage({
        defaultMessage: 'Connected to ',
        id: 'mIbBgK',
        description: 'Current connection title',
      }),
      CONNECTION_TOOLTIP_TITLE: intl.formatMessage({
        defaultMessage: 'Create a connection',
        id: 'scUBYR',
        description: 'Create connection tooltip title',
      }),
      CONNECTION_TOOLTIP_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Deployment model is directly tied to your agent connection. You need to create a connection first before selecting the relevant deployment model.',
        id: 'NOIQRN',
        description: 'Deployment model tooltip description',
      }),
    }),
    [intl]
  );

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      for (const nodeId of nodeIds) {
        dispatch(updateNodeConnection({ ...payload, nodeId }));
      }
    },
    [dispatch, nodeIds]
  );

  const subLabel = useMemo(() => {
    const reference = isNullOrUndefined(selectedConnection)
      ? undefined
      : allReferenceKeys.find((key) => allReferences[key] && equals(allReferences[key].connection.id, selectedConnection?.id, true));
    const agentModelType =
      reference && foundryServiceConnectionRegex.test(allReferences[reference]?.resourceId ?? '')
        ? AgentUtils.ModelType.FoundryService
        : AgentUtils.ModelType.AzureOpenAI;

    return (
      <Text style={{ fontSize: 12 }} id={noConnectionButtonId}>
        {isNullOrUndefined(selectedConnection)
          ? intlText.NO_CONNECTION_SELECTED
          : `${intlText.CURRENT_CONNECTION}${selectedConnection.properties.displayName} (${agentModelType})`}
      </Text>
    );
  }, [
    selectedConnection,
    allReferenceKeys,
    allReferences,
    noConnectionButtonId,
    intlText.NO_CONNECTION_SELECTED,
    intlText.CURRENT_CONNECTION,
  ]);

  if (subLabelOnly) {
    return subLabel;
  }

  return (
    <>
      {!showSubComponent && hasExistingConnections ? (
        subLabel
      ) : showCreateConnection ? (
        <CreateConnectionInternal
          connectorId={connector?.id ?? ''}
          operationType={operationInfo?.type}
          existingReferences={allReferenceKeys}
          nodeIds={nodeIds}
          assistedConnectionProps={assistedConnectionProps}
          connectionMetadata={connectionMetadata}
          showActionBar={false}
          hideCancelButton={false}
          updateConnectionInState={updateConnectionInState}
          onConnectionCreated={() => dispatch(reloadParametersTab())}
          onConnectionCancelled={() => {
            if (hasExistingConnections) {
              setShowSubComponent && setShowSubComponent(false);
            } else {
              setShowCreateConnection(false);
            }
          }}
        />
      ) : (
        <Button
          className="change-connection-button"
          id={noConnectionButtonId}
          size="small"
          appearance="secondary"
          onClick={setConnection}
          style={{ color: 'var(--colorBrandForeground1)' }}
          aria-label={`${intlText.CONNECT}, ${connector?.id}`}
        >
          {intlText.CONNECT}
        </Button>
      )}
      {/** Teaching popup is only visible is user hasn't created a connection yet*/}
      {shouldDisplayPopup && targetElement ? (
        <TeachingPopup
          targetElement={targetElement}
          title={intlText.CONNECTION_TOOLTIP_TITLE}
          message={intlText.CONNECTION_TOOLTIP_DESCRIPTION}
          withArrow={true}
          handlePopupPrimaryOnClick={() => {
            localStorage.setItem(agentFirstConnetionKey, 'true');
            setShouldDisplayPopup(false);
          }}
        />
      ) : null}
    </>
  );
};
