import constants from '../../../../../common/constants';
import { useIsOperationMissingConnection } from '../../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { isolateTab } from '../../../../../core/state/panel/panelSlice';
import { useIsConnectionRequired, useOperationInfo } from '../../../../../core/state/selectors/actionMetadataSelector';
import { Icon, Label, Link, Spinner, SpinnerSize } from '@fluentui/react';
import { useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface ConnectionDisplayProps {
  connectionName: string;
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
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  const operationInfo = useOperationInfo(nodeId);
  const requiresConnection = useIsConnectionRequired(operationInfo);

  useEffect(() => {
    if (requiresConnection && isOperationMissingConnection) {
      openChangeConnectionCallback();
    }
  }, [isOperationMissingConnection, openChangeConnectionCallback, requiresConnection]);

  const connectionDisplayText = intl.formatMessage(
    {
      defaultMessage: 'Connected to {connectionName}.',
      description: 'Text to show which connection is connected to the node',
    },
    {
      connectionName,
    }
  );

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
        <Spinner size={SpinnerSize.small} label={loadingText} style={{ padding: '4px 0px' }} labelPosition="right" />
      </div>
    );

  const connectionErrorText = intl.formatMessage({
    defaultMessage: 'Invalid connection',
    description: 'Text to show when there is an error with the connection',
  });

  return (
    <div className="connection-display">
      <div className="connection-info">
        {connectionName && <Label className="label">{connectionDisplayText}</Label>}
        <Link id="change-connection-button" onClick={openChangeConnectionCallback} disabled={readOnly}>
          {openChangeConnectionText}
        </Link>
      </div>
      {props.hasError ? (
        <div className="connection-info-error">
          <Icon iconName="Error" styles={{ root: { position: 'relative', top: 2 } }} />
          <div className="connection-info-error-text">{connectionErrorText}</div>
        </div>
      ) : null}
    </div>
  );
};
