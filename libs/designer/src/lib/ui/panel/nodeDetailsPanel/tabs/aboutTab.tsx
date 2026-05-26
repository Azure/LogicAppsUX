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
import { About, getConnectorCategoryString, getConnectorAllCategories } from '@microsoft/designer-ui';
import { isBuiltInAgentTool } from '@microsoft/logic-apps-shared';

const BUILT_IN_TOOL_DESCRIPTIONS: Record<string, { connectorName: string; descriptionKey: string }> = {
  code_interpreter: {
    connectorName: 'Code Interpreter',
    descriptionKey: 'Code Interpreter is a built-in tool that allows agents to write and execute code to solve problems.',
  },
};

export const AboutTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId } = props;
  const operationInfo = useOperationInfo(nodeId);
  const { displayRuntimeInfo } = useHostOptions();
  const isBuiltInTool = isBuiltInAgentTool(nodeId);

  const displayNameResult = useConnectorName(operationInfo);
  const { result: description } = useOperationDescription(operationInfo);
  const { result: documentation } = useOperationDocumentation(operationInfo);
  const { result: environmentBadge } = useConnectorEnvironmentBadge(operationInfo);
  const { result: statusBadge } = useConnectorStatusBadge(operationInfo);

  const builtInToolInfo = isBuiltInTool ? BUILT_IN_TOOL_DESCRIPTIONS[nodeId] : undefined;
  const connectorType = operationInfo?.connectorId
    ? getConnectorCategoryString(operationInfo.connectorId)
    : isBuiltInTool
      ? getConnectorAllCategories()['inapp']
      : '';

  const headerIcons = [
    ...(environmentBadge ? [{ badgeText: environmentBadge.name, title: environmentBadge.description }] : []),
    ...(statusBadge ? [{ badgeText: statusBadge.name, title: statusBadge.description }] : []),
  ];

  return (
    <About
      connectorDisplayName={builtInToolInfo?.connectorName ?? displayNameResult.result}
      description={builtInToolInfo?.descriptionKey ?? description}
      descriptionDocumentation={documentation}
      headerIcons={headerIcons}
      isLoading={isBuiltInTool ? false : displayNameResult.isLoading}
      connectorType={connectorType}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

export const aboutTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.ABOUT,
  title: intl.formatMessage({
    defaultMessage: 'About',
    id: 'M/gUE8',
    description: 'The tab label for the about tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'About tab',
    id: 'Kb5u9F',
    description: 'An accessibility label that describes the about tab',
  }),
  visible: true,
  content: <AboutTab {...props} />,
  order: 10,
  icon: 'Info',
});
