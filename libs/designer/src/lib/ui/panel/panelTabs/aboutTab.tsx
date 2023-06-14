import constants from '../../../common/constants';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import {
  useConnectorEnvironmentBadge,
  useConnectorName,
  useConnectorStatusBadge,
  useOperationDescription,
  useOperationDocumentation,
  useOperationInfo,
} from '../../../core/state/selectors/actionMetadataSelector';
import type { PanelTabFn } from '@microsoft/designer-ui';
import { About } from '@microsoft/designer-ui';

export const AboutTab = () => {
  const nodeId = useSelectedNodeId();
  const operationInfo = useOperationInfo(nodeId);
  const displayNameResult = useConnectorName(operationInfo);
  const { result: description } = useOperationDescription(operationInfo);
  const { result: documentation } = useOperationDocumentation(operationInfo);
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

export const aboutTab: PanelTabFn = (intl) => ({
  title: intl.formatMessage({ defaultMessage: 'About', description: 'The tab label for the about tab on the operation panel' }),
  name: constants.PANEL_TAB_NAMES.ABOUT,
  description: intl.formatMessage({ defaultMessage: 'About Tab', description: 'An accessability label that describes the about tab' }),
  visible: true,
  content: <AboutTab />,
  order: 10,
  icon: 'Info',
});
