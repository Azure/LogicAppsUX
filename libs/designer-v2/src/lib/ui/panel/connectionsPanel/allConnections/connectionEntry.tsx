import { useConnectionById } from '../../../../core/queries/connections';
import { useMonitoringView, useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ConnectionReference } from '../../../../common/models/workflow';
import { openPanel } from '../../../../core/state/panel/panelSlice';
import { NodeLinkButton } from './nodeLinkButton';
import { css } from '@fluentui/react';
import { Button, Spinner, Text, Tooltip, mergeClasses } from '@fluentui/react-components';
import { useConnectionContainerStyles } from '@microsoft/designer-ui';
import {
  Open24Filled,
  ArrowSwap24Filled,
  CheckmarkCircle24Filled,
  ErrorCircle24Filled,
  PlugDisconnected24Filled,
  LinkMultiple24Regular,
} from '@fluentui/react-icons';
import { HostService, cleanResourceId, getConnectionErrors } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export interface ConnectionReferenceWithNodes extends ConnectionReference {
  nodes: string[];
}

interface ConnectionEntryProps {
  connectorId: string;
  refId?: string;
  connectionReference?: ConnectionReferenceWithNodes;
  brandColor?: string;
  iconUri?: string;
  disconnectedNodeIds?: string[];
  runtimeNodeIds?: string[];
}

export const ConnectionEntry = ({
  connectorId,
  refId,
  connectionReference,
  iconUri,
  disconnectedNodeIds = [],
  runtimeNodeIds = [],
}: ConnectionEntryProps) => {
  const dispatch = useDispatch();
  const isReadOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const readOnly = isReadOnly || isMonitoringView;
  const styles = useConnectionContainerStyles();
  const runtime = runtimeNodeIds.length > 0;
  const connectionId = cleanResourceId(connectionReference?.connection?.id);
  const connection = useConnectionById(runtime ? '' : connectionId, runtime ? '' : connectorId);
  const nodeIds = useMemo(
    () => (runtime ? runtimeNodeIds : connectionReference?.nodes || disconnectedNodeIds),
    [runtime, runtimeNodeIds, connectionReference?.nodes, disconnectedNodeIds]
  );

  const disconnected = useMemo(() => disconnectedNodeIds.length > 0, [disconnectedNodeIds.length]);

  const intl = useIntl();
  const openConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'Open connection',
    id: '41drjl',
    description: 'Tooltip for the button to open a connection',
  });
  const connectedActionsText = intl.formatMessage({
    defaultMessage: 'Actions',
    id: 'WvvJYw',
    description: 'Header for the connected actions section',
  });
  const reassignButtonText = intl.formatMessage({
    defaultMessage: 'Reassign',
    id: 'en/5A3',
    description: 'Button text to reassign actions',
  });
  const reassignConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'Reassign all connected actions to a new connection',
    id: 'evyGYj',
    description: 'Tooltip for the button to reassign actions',
  });
  const connectionValidStatusText = intl.formatMessage({
    defaultMessage: 'Connection is valid',
    id: 'cZv9J0',
    description: 'Tooltip for the button to reassign actions',
  });
  const connectionInvalidStatusText = intl.formatMessage({
    defaultMessage: 'Connection is invalid',
    id: 'mUURJW',
    description: 'Tooltip for the button to reassign actions',
  });
  const disconnectedText = intl.formatMessage({
    defaultMessage: 'Disconnected',
    id: 'TsJbGH',
    description: 'Text to show when a connection is disconnected',
  });
  const runtimeConnectionText = intl.formatMessage({
    defaultMessage: 'Connection selected at runtime',
    id: 'elDTa6',
    description: 'Status for a connection selected at runtime by an expression',
  });

  const onReassignButtonClick = useCallback(() => {
    dispatch(openPanel({ nodeIds, panelMode: 'Connection', referencePanelMode: 'Connection' }));
  }, [dispatch, nodeIds]);

  const errors = useMemo(() => {
    if (runtime || connection?.isLoading) {
      return [];
    }
    if (!connection?.result) {
      return [connectionInvalidStatusText];
    }
    return getConnectionErrors(connection?.result);
  }, [connection, connectionInvalidStatusText, runtime]);

  const statusIconComponent = useMemo(() => {
    if (runtime) {
      return <LinkMultiple24Regular />;
    }
    if (connection?.isLoading) {
      return <Spinner size="extra-small" />;
    }
    if (disconnected) {
      return <PlugDisconnected24Filled />;
    }
    const hasErrors = errors.length > 0;
    return (
      <Tooltip content={hasErrors ? connectionInvalidStatusText : connectionValidStatusText} relationship="label">
        {hasErrors ? (
          <ErrorCircle24Filled className={mergeClasses(styles.connectionStatusIcon, styles.iconError)} />
        ) : (
          <CheckmarkCircle24Filled className={mergeClasses(styles.connectionStatusIcon, styles.iconSuccess)} />
        )}
      </Tooltip>
    );
  }, [connection?.isLoading, connectionInvalidStatusText, connectionValidStatusText, errors.length, disconnected, runtime]);

  // Only show the open connection button if the service method is supplied
  const openConnectionSupported = useMemo(() => HostService().openConnectionResource !== undefined, []);
  const openConnectionCallback = useCallback(() => {
    if (!connection?.result?.id) {
      return;
    }
    HostService().openConnectionResource?.(connection?.result?.id);
  }, [connection?.result?.id]);

  const cardTitle = runtime ? runtimeConnectionText : (connection?.result?.properties.displayName ?? refId ?? disconnectedText);

  return (
    <div key={refId} className={css('msla-connector-connections-card-connection', disconnected && 'disconnected')}>
      <div className="msla-flex-header">
        {statusIconComponent}
        <Text size={300} weight="semibold" className="msla-flex-header-title">
          {cardTitle}
        </Text>
        {!runtime && (
          <Text size={300} className="msla-flex-header-subtitle">
            {connection?.result?.name}
          </Text>
        )}
        {!runtime && openConnectionSupported && (
          <Tooltip content={openConnectionTooltipText} relationship="label">
            <Button
              icon={<Open24Filled />}
              appearance="subtle"
              style={{ margin: '-6px', marginLeft: 'auto' }}
              onClick={openConnectionCallback}
            />
          </Tooltip>
        )}
      </div>
      <div className="msla-connector-connections-card-connection-body">
        <div className="msla-flex-header">
          <Text>{connectedActionsText}</Text>
          <Tooltip content={reassignConnectionTooltipText} relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowSwap24Filled />}
              disabled={readOnly}
              onClick={readOnly ? undefined : onReassignButtonClick}
              style={readOnly ? undefined : { color: 'var(--colorBrandForeground1)' }}
            >
              {reassignButtonText}
            </Button>
          </Tooltip>
        </div>
        <div className="msla-connector-connections-card-connection-nodes">
          {nodeIds.map((nodeId: string) => (
            <NodeLinkButton key={nodeId} nodeId={nodeId} iconUri={iconUri} />
          ))}
        </div>
      </div>
    </div>
  );
};
