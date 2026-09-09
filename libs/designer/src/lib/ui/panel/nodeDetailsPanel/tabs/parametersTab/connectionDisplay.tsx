import { openPanel } from '../../../../../core';
import { useIsOperationMissingConnection } from '../../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { useIsConnectionRequired, useOperationInfo } from '../../../../../core/state/selectors/actionMetadataSelector';
import { Badge, Button, InfoLabel, Spinner } from '@fluentui/react-components';
import { ErrorCircle16Filled, LinkMultiple16Regular } from '@fluentui/react-icons';
import { Label } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface ConnectionDisplayProps {
  connectionName: string | undefined;
  nodeId: string;
  readOnly: boolean;
  readOnlyReason?: string;
  isLoading?: boolean;
  hasError: boolean;
}

export const ConnectionDisplay = (props: ConnectionDisplayProps) => {
  const { connectionName, nodeId, hasError, isLoading = false, readOnly, readOnlyReason } = props;

  const intl = useIntl();
  const dispatch = useDispatch();
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();

  const isOperationMissingConnection = useIsOperationMissingConnection(nodeId);

  const openChangeConnectionCallback = useCallback(() => {
    dispatch(openPanel({ nodeId, panelMode: 'Connection' }));
  }, [dispatch, nodeId]);

  const operationInfo = useOperationInfo(nodeId);
  const requiresConnection = useIsConnectionRequired(operationInfo);

  useEffect(() => {
    if (requiresConnection && isOperationMissingConnection) {
      openChangeConnectionCallback();
    }
  }, [isOperationMissingConnection, openChangeConnectionCallback, requiresConnection]);

  const connectionDisplayTextWithName = intl.formatMessage(
    {
      defaultMessage: 'Connected to {connectionName}.',
      id: 'daoo3l',
      description: 'Text to show which connection is connected to the node',
    },
    {
      connectionName,
    }
  );

  const connectionDisplayTextWithoutName = intl.formatMessage({
    defaultMessage: 'Not connected.',
    id: 'Yz9o1k',
    description: 'Text to show that no connection is connected to the node',
  });

  const openChangeConnectionText = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Change connection reference',
        id: 'KBaGkS',
        description: "Button text to take the user to the 'change connection' component while in xrm connection reference mode",
      })
    : intl.formatMessage({
        defaultMessage: 'Change connection',
        id: '/ULFwg',
        description: "Button text to take the user to the 'change connection' component",
      });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection...',
    id: '3+TQMa',
    description: 'Text to show when the connection is loading',
  });

  const connectionErrorText = intl.formatMessage({
    defaultMessage: 'Invalid connection',
    id: 'l/3yJr',
    description: 'Text to show when there is an error with the connection',
  });

  const connectionLabel = useMemo(
    () => (connectionName ? connectionDisplayTextWithName : connectionDisplayTextWithoutName),
    [connectionName, connectionDisplayTextWithName, connectionDisplayTextWithoutName]
  );

  if (isLoading) {
    return (
      <div className="connection-display">
        <Spinner size={'extra-tiny'} label={loadingText} labelPosition={'after'} />
      </div>
    );
  }

  const labelText = connectionName ? connectionDisplayTextWithName : connectionDisplayTextWithoutName;

  return (
    <div className="connection-display">
      <div className="connection-info">
        <div className="connection-info-labels">
          <LinkMultiple16Regular />
          {readOnly && readOnlyReason ? (
            <InfoLabel className="label" info={readOnlyReason} size="small">
              {labelText}
            </InfoLabel>
          ) : (
            <Label className="label" text={labelText} />
          )}
        </div>
        {readOnly ? null : (
          <Button
            className="change-connection-button"
            id="change-connection-button"
            size="small"
            appearance="subtle"
            onClick={openChangeConnectionCallback}
            style={{ color: 'var(--colorBrandForeground1)' }}
            aria-label={`${connectionLabel}, ${openChangeConnectionText}`}
          >
            {openChangeConnectionText}
          </Button>
        )}
        <div style={{ flex: 1 }} />
        {hasError ? (
          <div className="connection-info-badge">
            <Badge appearance="ghost" color="danger" icon={<ErrorCircle16Filled />}>
              {connectionErrorText}
            </Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
};
