import { openPanel } from '../../../../../core';
import { useIsOperationMissingConnection } from '../../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { useIsConnectionRequired, useOperationInfo } from '../../../../../core/state/selectors/actionMetadataSelector';
import { Badge, Button, Label, Spinner } from '@fluentui/react-components';
import { LinkMultiple16Regular, ErrorCircle16Filled } from '@fluentui/react-icons';
import { useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

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
      description: 'Text to show which connection is connected to the node',
    },
    {
      connectionName,
    }
  );

  const connectionDisplayTextWithoutName = intl.formatMessage({
    defaultMessage: 'Not connected.',
    description: 'Text to show that no connection is connected to the node',
  });

  const openChangeConnectionText = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Change connection reference',
        description: "Button text to take the user to the 'change connection' component while in xrm connection reference mode",
      })
    : intl.formatMessage({
        defaultMessage: 'Change connection',
        description: "Button text to take the user to the 'change connection' component",
      });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection...',
    description: 'Text to show when the connection is loading',
  });

  if (isLoading)
    return (
      <div className="connection-display">
        <Spinner size={'extra-tiny'} label={loadingText} labelPosition={'after'} />
      </div>
    );

  const connectionErrorText = intl.formatMessage({
    defaultMessage: 'Invalid connection',
    description: 'Text to show when there is an error with the connection',
  });

  return (
    <div className="connection-display">
      <div className="connection-info">
        <LinkMultiple16Regular />
        <Label className="label">{connectionName ? connectionDisplayTextWithName : connectionDisplayTextWithoutName}</Label>
        {!readOnly ? (
          <Button
            id="change-connection-button"
            size="small"
            appearance="subtle"
            onClick={openChangeConnectionCallback}
            style={{ color: 'var(--colorBrandForeground1)' }}
          >
            {openChangeConnectionText}
          </Button>
        ) : null}
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
