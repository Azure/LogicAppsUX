import constants from '../../../../common/constants';
import { useHostOptions } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useConnectorEnvironmentBadge,
  useConnectorName,
  useConnectorStatusBadge,
  useOperationDescription,
  useOperationDocumentation,
  useOperationInfo,
} from '../../../../core/state/selectors/actionMetadataSelector';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { About, getConnectorCategoryString } from '@microsoft/designer-ui';

export const AboutTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId } = props;
  const operationInfo = useOperationInfo(nodeId);
  const { displayRuntimeInfo } = useHostOptions();
  const displayNameResult = useConnectorName(operationInfo);
  const { result: description } = useOperationDescription(operationInfo);
  const { result: documentation } = useOperationDocumentation(operationInfo);
  const { result: environmentBadge } = useConnectorEnvironmentBadge(operationInfo);
  const { result: statusBadge } = useConnectorStatusBadge(operationInfo);
  const connectorType = getConnectorCategoryString(operationInfo.connectorId);
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
      connectorType={connectorType}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

export const aboutTab: PanelTabFn = (intl, nodeId) => ({
  id: constants.PANEL_TAB_NAMES.ABOUT,
  title: intl.formatMessage({
    defaultMessage: 'About',
    id: 'M/gUE8',
    description: 'The tab label for the about tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'About Tab',
    id: 'iB8YKD',
    description: 'An accessability label that describes the about tab',
  }),
  visible: true,
  content: <AboutTab nodeId={nodeId} />,
  order: 10,
  icon: 'Info',
});
