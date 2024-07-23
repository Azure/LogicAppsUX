import { openPanel } from '../../../../../core';
import { useIsOperationMissingConnection } from '../../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { useIsConnectionRequired, useOperationInfo } from '../../../../../core/state/selectors/actionMetadataSelector';
import { Badge, Button, Spinner } from '@fluentui/react-components';
import { LinkMultiple16Regular, ErrorCircle16Filled } from '@fluentui/react-icons';
import { useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Label } from '@microsoft/designer-ui';

interface ConnectionDisplayProps {
  connectionName: string | undefined;
  nodeId: string;
  readOnly: boolean;
  isLoading?: boolean;
  hasError: boolean;
}

export const ConnectionDisplay = (props: ConnectionDisplayProps) => {
  const { connectionName, nodeId, isLoading = false, readOnly } = props;

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

  if (isLoading) {
    return (
      <div className="connection-display">
        <Spinner size={'extra-tiny'} label={loadingText} labelPosition={'after'} />
      </div>
    );
  }

  const connectionErrorText = intl.formatMessage({
    defaultMessage: 'Invalid connection',
    id: 'l/3yJr',
    description: 'Text to show when there is an error with the connection',
  });

  return (
    <div className="connection-display">
      <div className="connection-info">
        <div className="connection-info-labels">
          <LinkMultiple16Regular />
          <Label className="label" text={connectionName ? connectionDisplayTextWithName : connectionDisplayTextWithoutName} />
        </div>
        {readOnly ? null : (
          <Button
            className="change-connection-button"
            id="change-connection-button"
            size="small"
            appearance="subtle"
            onClick={openChangeConnectionCallback}
            style={{ color: 'var(--colorBrandForeground1)' }}
          >
            {openChangeConnectionText}
          </Button>
        )}
      </div>
      {props.hasError ? (
        <div className="connection-info-error">
          <Badge appearance="ghost" color="danger" icon={<ErrorCircle16Filled />}>
            {connectionErrorText}
          </Badge>
        </div>
      ) : null}
    </div>
  );
};
