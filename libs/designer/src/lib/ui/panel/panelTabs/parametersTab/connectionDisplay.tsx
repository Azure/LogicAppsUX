import constants from '../../../../common/constants';
import { isConnectionRequiredForOperation } from '../../../../core/actions/bjsworkflow/connections';
import { isolateTab } from '../../../../core/state/panel/panelSlice';
import { useOperationInfo, useOperationManifest } from '../../../../core/state/selectors/actionMetadataSelector';
import { Label, Link } from '@fluentui/react';
import { useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface ConnectionDisplayProps {
  connectionName: string;
  nodeId: string;
}

export const ConnectionDisplay = (props: ConnectionDisplayProps) => {
  const { connectionName, nodeId } = props;

  const intl = useIntl();
  const dispatch = useDispatch();

  const openChangeConnectionCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const requiresConnection = operationManifest && isConnectionRequiredForOperation(operationManifest);

  useEffect(() => {
    if (requiresConnection && !connectionName) {
      openChangeConnectionCallback();
    }
  }, [connectionName, openChangeConnectionCallback, requiresConnection]);

  const connectionDisplayText = intl.formatMessage(
    {
      defaultMessage: 'Connected to {connectionName}.',
      description: 'Text to show which connection is connected to the node',
    },
    {
      connectionName,
    }
  );

  const openChangeConnectionText = intl.formatMessage({
    defaultMessage: 'Change connection',
    description: "Button text to take the user to the 'change connection' component",
  });

  if (!requiresConnection && !connectionName) return null;

  return (
    <div className="connection-info">
      {connectionName && <Label className="label">{connectionDisplayText}</Label>}
      <Link id="change-connection-button" onClick={openChangeConnectionCallback}>
        {openChangeConnectionText}
      </Link>
    </div>
  );
};
