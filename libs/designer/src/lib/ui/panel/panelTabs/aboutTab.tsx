import constants from '../../../common/constants';
import {
  useConnectorDescription,
  useConnectorDocumentation,
  useConnectorEnvironmentBadge,
  useConnectorName,
  useConnectorStatusBadge,
  useOperationInfo,
} from '../../../core/state/selectors/actionMetadataSelector';
import type { RootState } from '../../../core/store';
import type { PanelTab } from '@microsoft/designer-ui';
import { About } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';

export const AboutTab = () => {
  const nodeId = useSelector((state: RootState) => state.panel.selectedNode);
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
