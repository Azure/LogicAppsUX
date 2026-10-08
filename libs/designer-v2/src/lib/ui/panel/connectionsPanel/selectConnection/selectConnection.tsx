import { useIsA2AWorkflow } from '../../../../core/state/designerView/designerViewSelectors';
import type { AppDispatch } from '../../../../core';
import { updateNodeConnection, updateNodeConnectionExpression } from '../../../../core/actions/bjsworkflow/connections';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import {
  useConnectionRefs,
  useConnectionRefsByConnectorId,
  useConnectorByNodeId,
  useNodeConnectionId,
  useNodeConnectionMapping,
} from '../../../../core/state/connection/connectionSelector';
import {
  useIsXrmConnectionReferenceMode,
  useMonitoringView,
  useReadOnly,
} from '../../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useConnectionPanelSelectedNodeIds,
  useIsCreatingConnection,
  useOperationPanelSelectedNodeId,
  usePreviousPanelMode,
} from '../../../../core/state/panel/panelSelectors';
import { openPanel, setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { ActionList } from '../actionList/actionList';
import { ConnectionTable, type ConnectionTableProps } from './connectionTable';
import {
  Body1Strong,
  Button,
  Divider,
  Spinner,
  MessageBar,
  MessageBarTitle,
  MessageBarBody,
  Text,
  Tab,
  TabList,
  makeStyles,
  tokens,
  useId,
} from '@fluentui/react-components';
import {
  ConnectionService,
  equals,
  foundryServiceConnectionRegex,
  apimanagementRegex,
  microsoftFoundryModelsRegex,
  getIconUriFromConnector,
  parseErrorMessage,
  type Connection,
  type Connector,
} from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { AgentUtils, isDynamicConnection } from '../../../../common/utilities/Utils';
import { useIsAgentSubGraph } from '../../../../common/hooks/agent';
import { isExpressionConnectionMapping } from '../../../../common/models/workflow';
import { ConnectionExpressionSelection, useConnectionExpressionEnabled } from './connectionExpression';
import { CreateConnectionWrapper } from '../createConnection/createConnectionWrapper';

const useStyles = makeStyles({
  divider: { marginTop: tokens.spacingVerticalM, marginBottom: tokens.spacingVerticalXS },
  tabs: { marginBottom: tokens.spacingVerticalL },
});

type ConnectionTab = 'existing' | 'expression';

export const SelectConnectionWrapper = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const selectedNodeIds = useConnectionPanelSelectedNodeIds();
  const isReadOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const readOnly = isReadOnly || isMonitoringView;
  const expressionEnabled = useConnectionExpressionEnabled(selectedNodeIds);
  const mapping = useNodeConnectionMapping(selectedNodeIds?.[0]);
  const runtimeConnection = isExpressionConnectionMapping(mapping);
  const showExpressionSelection = selectedNodeIds.length === 1 && (expressionEnabled || runtimeConnection);
  const isA2A = useIsA2AWorkflow();
  const nodeId: string = useOperationPanelSelectedNodeId();
  const isAgentSubgraph = useIsAgentSubGraph(nodeId);
  const currentConnectionId = useNodeConnectionId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();
  const referencePanelMode = usePreviousPanelMode();
  const isCreatingConnection = useIsCreatingConnection();
  const [selectedTab, setSelectedTab] = useState<ConnectionTab>(runtimeConnection ? 'expression' : 'existing');
  const [isBusy, setIsBusy] = useState(false);
  const [hasOpenedExpression, setHasOpenedExpression] = useState(runtimeConnection);
  const activeTab = isCreatingConnection && !readOnly ? 'new' : showExpressionSelection ? selectedTab : 'existing';
  const tabId = useId('connection-tab');
  const styles = useStyles();

  const closeConnectionsFlow = useCallback(() => {
    if (isCreatingConnection) {
      dispatch(setIsCreatingConnection(false));
    }
    const panelMode = referencePanelMode ?? 'Operation';
    const nodeId = panelMode === 'Operation' ? selectedNodeIds?.[0] : undefined;
    dispatch(openPanel({ nodeId, panelMode }));
  }, [dispatch, isCreatingConnection, referencePanelMode, selectedNodeIds]);

  const connector = useConnectorByNodeId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same
  const connectorIconUri = useMemo(() => getIconUriFromConnector(connector), [connector]);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connectionReferencesForConnector = useConnectionRefsByConnectorId(connector?.id ?? '');
  const connections = useMemo(() => {
    const connectionData = connectionQuery?.data ?? [];

    if (AgentUtils.isConnector(connector?.id)) {
      return connectionData.filter((c) => {
        const connectionReference = connectionReferencesForConnector.find((ref) => equals(ref.connection.id, c?.id, true));
        let modelType = AgentUtils.ModelType.AzureOpenAI; // default (legacy)
        const cognitiveResourceId =
          connectionReference?.resourceId ?? c.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value;

        if (cognitiveResourceId) {
          if (foundryServiceConnectionRegex.test(cognitiveResourceId)) {
            modelType = AgentUtils.ModelType.FoundryService;
          } else if (apimanagementRegex.test(cognitiveResourceId)) {
            modelType = AgentUtils.ModelType.APIM;
          } else if (microsoftFoundryModelsRegex.test(cognitiveResourceId)) {
            modelType = AgentUtils.ModelType.MicrosoftFoundry;
          }
        } else if (!c.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value) {
          // No cognitive serviceAccountId means this is a V1ChatCompletionsService connection (BYO)
          modelType = AgentUtils.ModelType.V1ChatCompletionsService;
        }

        // Add a tag for model type
        c.properties.connectionParameters = {
          ...(c.properties.connectionParameters ?? {}),
          agentModelType: {
            type: modelType,
          },
        };

        // For A2A, show AzureOpenAI, MicrosoftFoundry, and V1 connections only
        return isA2A
          ? modelType === AgentUtils.ModelType.AzureOpenAI ||
              modelType === AgentUtils.ModelType.MicrosoftFoundry ||
              modelType === AgentUtils.ModelType.V1ChatCompletionsService
          : true;
      });
    }

    if (!isA2A || !isAgentSubgraph) {
      // Filter out dynamic connections
      return connectionData.filter((c) => !isDynamicConnection(c.properties.features));
    }

    return connectionData;
  }, [connectionQuery?.data, connector?.id, isA2A, connectionReferencesForConnector, isAgentSubgraph]);
  const references = useConnectionRefs();

  const saveSelectionCallback = useCallback(
    (connection?: Connection) => {
      if (!connection || readOnly) {
        return;
      }
      for (const nodeId of selectedNodeIds) {
        dispatch(
          updateNodeConnection({
            nodeId,
            connection,
            connector: connector as Connector,
          })
        );
        ConnectionService().setupConnectionIfNeeded(connection);
      }
      closeConnectionsFlow();
    },
    [dispatch, selectedNodeIds, connector, closeConnectionsFlow, readOnly]
  );

  const actionBar = useMemo(() => {
    return (
      <>
        <ActionList nodeIds={selectedNodeIds} iconUri={connectorIconUri} />
        <Divider className={styles.divider} />
      </>
    );
  }, [connectorIconUri, selectedNodeIds, styles.divider]);
  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    id: 'faUrud',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  const createConnectionText = intl.formatMessage({
    defaultMessage: 'Create new',
    id: 'yjZFBX',
    description: 'Tab for creating a new connection',
  });

  const existingConnections = (
    <SelectConnection
      connections={connections}
      currentConnectionId={runtimeConnection ? undefined : currentConnectionId}
      saveSelectionCallback={saveSelectionCallback}
      cancelSelectionCallback={closeConnectionsFlow}
      isXrmConnectionReferenceMode={!!isXrmConnectionReferenceMode}
      cancelButton={{ onCancel: closeConnectionsFlow }}
      errorMessage={connectionQuery.isError ? parseErrorMessage(connectionQuery.error) : undefined}
    />
  );

  return (
    <>
      {actionBar}
      <TabList
        className={styles.tabs}
        aria-label={intl.formatMessage({
          defaultMessage: 'Connection options',
          id: 'iCjPLH',
          description: 'Accessible label for connection selection tabs',
        })}
        selectedValue={activeTab}
        disabled={isBusy}
        onTabSelect={(_, { value }) => {
          if (value !== 'existing' && value !== 'new' && value !== 'expression') {
            return;
          }
          if (readOnly || isBusy) {
            return;
          }
          if (value === 'new') {
            dispatch(setIsCreatingConnection(true));
          } else {
            if (isCreatingConnection) {
              dispatch(setIsCreatingConnection(false));
            }
            setSelectedTab(value);
            if (value === 'expression') {
              setHasOpenedExpression(true);
            }
          }
        }}
      >
        <Tab id={`${tabId}-existing`} aria-controls={`${tabId}-existing-panel`} value="existing" disabled={readOnly}>
          {intl.formatMessage({ defaultMessage: 'Select existing', id: 'hmOifh', description: 'Tab for selecting an existing connection' })}
        </Tab>
        <Tab id={`${tabId}-new`} aria-controls={`${tabId}-new-panel`} value="new" disabled={readOnly || !connector}>
          {createConnectionText}
        </Tab>
        {showExpressionSelection ? (
          <Tab id={`${tabId}-expression`} aria-controls={`${tabId}-expression-panel`} value="expression" disabled={readOnly}>
            {intl.formatMessage({
              defaultMessage: 'Use expression',
              id: 'cTRaCf',
              description: 'Choose a connection at runtime using an expression',
            })}
          </Tab>
        ) : null}
      </TabList>
      <div role="tabpanel" id={`${tabId}-existing-panel`} aria-labelledby={`${tabId}-existing`} hidden={activeTab !== 'existing'}>
        {activeTab === 'existing' ? connectionQuery.isLoading ? <Spinner label={loadingText} /> : existingConnections : null}
      </div>
      <div role="tabpanel" id={`${tabId}-new-panel`} aria-labelledby={`${tabId}-new`} hidden={activeTab !== 'new'}>
        {activeTab === 'new' ? (
          <CreateConnectionWrapper
            showActionBar={false}
            onConnectionCancelled={() => dispatch(setIsCreatingConnection(false))}
            onCreatingChange={setIsBusy}
          />
        ) : null}
      </div>
      {showExpressionSelection ? (
        <div role="tabpanel" id={`${tabId}-expression-panel`} aria-labelledby={`${tabId}-expression`} hidden={activeTab !== 'expression'}>
          {hasOpenedExpression ? (
            <ConnectionExpressionSelection
              nodeId={selectedNodeIds[0]}
              mapping={mapping}
              connectorId={connector?.id ?? ''}
              references={references}
              enabled={expressionEnabled}
              onApply={async (expression, designTimeReferenceKey) => {
                if (readOnly || !expressionEnabled || selectedNodeIds.length !== 1) {
                  return;
                }
                setIsBusy(true);
                try {
                  await dispatch(
                    updateNodeConnectionExpression({ nodeId: selectedNodeIds[0], expression, designTimeReferenceKey })
                  ).unwrap();
                  closeConnectionsFlow();
                } finally {
                  setIsBusy(false);
                }
              }}
              onCancel={closeConnectionsFlow}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export const SelectConnection = ({
  addButton,
  cancelButton,
  actionBar,
  errorMessage,
  connections,
  currentConnectionId,
  saveSelectionCallback,
  cancelSelectionCallback,
  isXrmConnectionReferenceMode,
}: ConnectionTableProps & {
  addButton?: {
    text: string;
    disabled?: boolean;
    onAdd: () => void;
  };
  cancelButton?: { onCancel: () => void };
  actionBar?: JSX.Element;
  errorMessage?: string;
}) => {
  const intl = useIntl();
  const connectionLoadErrorTitle = intl.formatMessage({
    defaultMessage: 'Error loading connections',
    id: 'HQ/HhZ',
    description: 'Title for error message when loading connections',
  });
  const description = isXrmConnectionReferenceMode
    ? addButton
      ? intl.formatMessage({
          defaultMessage: 'Select an existing connection reference or create a new one',
          id: 'ZAdaBl',
          description: 'Select an existing connection reference or create a new one.',
        })
      : intl.formatMessage({
          defaultMessage: 'Select an existing connection reference',
          id: 'vbBcki',
          description: 'Description for selecting an existing connection reference',
        })
    : addButton
      ? intl.formatMessage({
          defaultMessage: 'Select an existing connection or create a new one',
          id: 'DfXxoX',
          description: 'Select an existing connection or create a new one.',
        })
      : intl.formatMessage({
          defaultMessage: 'Select an existing connection',
          id: 'OExnAk',
          description: 'Description for selecting an existing connection',
        });

  const buttonAddAria = intl.formatMessage({
    defaultMessage: 'Add a new connection',
    id: '4Q7WzU',
    description: 'Aria label description for add button',
  });
  const buttonCancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'wF7C+h',
    description: 'Button to cancel a connection',
  });

  const buttonCancelAria = intl.formatMessage({
    defaultMessage: 'Cancel the selection',
    id: 'GtDOFg',
    description: 'Aria label description for cancel button',
  });
  return (
    <div className="msla-edit-connection-container">
      {actionBar ? actionBar : null}

      {errorMessage ? (
        <MessageBar intent={'error'}>
          <MessageBarBody>
            <MessageBarTitle>{connectionLoadErrorTitle}</MessageBarTitle>
            <Text>{errorMessage}</Text>
          </MessageBarBody>
        </MessageBar>
      ) : (
        <>
          <Body1Strong>{description}</Body1Strong>
          <ConnectionTable
            connections={connections}
            currentConnectionId={currentConnectionId}
            saveSelectionCallback={saveSelectionCallback}
            cancelSelectionCallback={cancelSelectionCallback}
            isXrmConnectionReferenceMode={!!isXrmConnectionReferenceMode}
          />
        </>
      )}

      <div className="msla-edit-connection-actions-container">
        {addButton ? (
          <Button aria-label={buttonAddAria} disabled={addButton.disabled} onClick={addButton.onAdd}>
            {addButton.text}
          </Button>
        ) : null}
        {cancelButton ? (
          <Button aria-label={buttonCancelAria} onClick={cancelButton.onCancel}>
            {buttonCancelText}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
