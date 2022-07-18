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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: operationManifest, isLoading: loadingOpMan } = useOperationManifest(operationInfo);
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
    defaultMessage: 'Change connection.',
    description: "Button text to take the user to the 'change connection' component",
  });

  return (
    <div className="connection-info" style={{ display: 'flex', padding: '8px 0px', gap: '16px' }}>
      <Label className="label">{connectionDisplayText}</Label>
      <Link id="change-connection-button" onClick={openChangeConnectionCallback}>
        {openChangeConnectionText}
      </Link>
    </div>
  );
};
