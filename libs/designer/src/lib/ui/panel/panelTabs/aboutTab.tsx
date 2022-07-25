import constants from '../../../common/constants';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import {
  useConnectorDescription,
  useConnectorDocumentation,
  useConnectorEnvironmentBadge,
  useConnectorName,
  useConnectorStatusBadge,
  useOperationInfo,
} from '../../../core/state/selectors/actionMetadataSelector';
import type { PanelTab } from '@microsoft/designer-ui';
import { About } from '@microsoft/designer-ui';

export const AboutTab = () => {
  const nodeId = useSelectedNodeId();
  const operationInfo = useOperationInfo(nodeId);
  const displayNameResult = useConnectorName(operationInfo);
  const { result: description } = useConnectorDescription(operationInfo);
  const { result: documentation } = useConnectorDocumentation(operationInfo);
  const { result: environmentBadge } = useConnectorEnvironmentBadge(operationInfo);
  const { result: statusBadge } = useConnectorStatusBadge(operationInfo);

  const headerIcons = [
    ...(environmentBadge ? [{ badgeText: environmentBadge.name, title: environmentBadge.description }] : []),
    ...(statusBadge ? [{ badgeText: statusBadge.name, title: statusBadge.description }] : []),
  ];

  return (
    <About
      connectorDisplayName={displayNameResult.result}
      description={description}
      descriptionDocumentation={documentation}
      headerIcons={headerIcons}
      isLoading={displayNameResult.isLoading}
    />
  );
};

export const aboutTab: PanelTab = {
  title: 'About',
  name: constants.PANEL_TAB_NAMES.ABOUT,
  description: 'About Tab',
  visible: true,
  content: <AboutTab />,
  order: 0,
  icon: 'Info',
};
