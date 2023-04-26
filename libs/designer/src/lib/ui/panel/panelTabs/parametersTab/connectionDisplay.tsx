import constants from '../../../../common/constants';
import { useIsOperationMissingConnection } from '../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { isolateTab } from '../../../../core/state/panel/panelSlice';
import { useIsConnectionRequired, useOperationInfo } from '../../../../core/state/selectors/actionMetadataSelector';
import '../../../../core/utils/connectors/connections';
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

  return (
    <div className="connection-info">
      {connectionName && <Label className="label">{connectionDisplayText}</Label>}
      <Link id="change-connection-button" onClick={openChangeConnectionCallback}>
        {openChangeConnectionText}
      </Link>
    </div>
  );
};
