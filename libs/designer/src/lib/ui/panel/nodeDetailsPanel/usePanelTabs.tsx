import { useIsAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import { useNodeMetadata, useOperationInfo } from '../../../core';
import {
  usePanelTabHideKeys,
  useUnitTest,
  useMonitoringView,
  useSupportedChannels,
} from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useParameterValidationErrors } from '../../../core/state/operation/operationSelector';
import { useIsNodePinnedToOperationPanel } from '../../../core/state/panel/panelSelectors';
import { useSettingValidationErrors } from '../../../core/state/setting/settingSelector';
import { useHasSchema } from '../../../core/state/staticresultschema/staitcresultsSelector';
import { useRetryHistory } from '../../../core/state/workflow/workflowSelectors';
import { isRootNodeInGraph } from '../../../core/utils/graph';
import { aboutTab } from './tabs/aboutTab';
import { codeViewTab } from './tabs/codeViewTab';
import { mockResultsTab } from './tabs/mockResultsTab/mockResultsTab';
import { monitoringTab } from './tabs/monitoringTab/monitoringTab';
import { parametersTab } from './tabs/parametersTab';
import { monitorRetryTab } from './tabs/retryTab';
import { scratchTab } from './tabs/scratchTab';
import { settingsTab } from './tabs/settingsTab';
import { testingTab } from './tabs/testingTab';
import type { PanelTabProps } from '@microsoft/designer-ui';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { channelsTab } from './tabs/channelsTab';
import { transitionsTab } from './tabs/transitionsTab';

export const usePanelTabs = ({ nodeId }: { nodeId: string }) => {
  const intl = useIntl();

  const isMonitoringView = useMonitoringView();
  const isUnitTestView = useUnitTest();
  const panelTabHideKeys = usePanelTabHideKeys();
  const isPinnedNode = useIsNodePinnedToOperationPanel(nodeId);
  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const operationInfo = useOperationInfo(nodeId);
  const nodeMetaData = useNodeMetadata(nodeId);
  const supportedChannels = useSupportedChannels(nodeId);
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const hasSchema = useHasSchema(operationInfo?.connectorId, operationInfo?.operationId);
  const runHistory = useRetryHistory(nodeId);
  const isScopeNode = operationInfo?.type.toLowerCase() === constants.NODE.TYPE.SCOPE;
  const parameterValidationErrors = useParameterValidationErrors(nodeId);
  const settingValidationErrors = useSettingValidationErrors(nodeId);

  const tabProps: PanelTabProps = useMemo(
    () => ({
      isPanelPinned: isPinnedNode,
      nodeId,
      isAgenticConditionPanel: nodeMetaData?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION,
    }),
    [isPinnedNode, nodeId, nodeMetaData?.subgraphType]
  );

  const monitoringTabItem = useMemo(
    () => ({
      ...monitoringTab(intl, tabProps),
      visible: !isScopeNode && isMonitoringView,
    }),
    [intl, isMonitoringView, isScopeNode, tabProps]
  );

  const mockResultsTabItem = useMemo(
    () => ({
      ...mockResultsTab(intl, tabProps),
      visible: isUnitTestView,
    }),
    [intl, isUnitTestView, tabProps]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, tabProps),
      visible: !isMonitoringView,
      hasErrors: parameterValidationErrors.length > 0,
    }),
    [intl, isMonitoringView, tabProps, parameterValidationErrors]
  );

  const settingsTabItem = useMemo(
    () => ({
      ...settingsTab(intl, tabProps),
      hasErrors: settingValidationErrors.length > 0,
    }),
    [intl, tabProps, settingValidationErrors]
  );

  const channelsTabItem = useMemo(
    () => ({
      ...channelsTab(intl, tabProps),
      visible: supportedChannels.length > 0 && isAgenticWorkflow,
    }),
    [intl, tabProps, supportedChannels, isAgenticWorkflow]
  );

  const transitionsTabItem = useMemo(
    () => ({
      ...transitionsTab(intl, tabProps),
      visible: true,
    }),
    [intl, tabProps]
  );

  const codeViewTabItem = useMemo(() => codeViewTab(intl, tabProps), [intl, tabProps]);

  const testingTabItem = useMemo(
    () => ({
      ...testingTab(intl, tabProps),
      visible: !isTriggerNode && hasSchema && !isMonitoringView,
    }),
    [intl, isTriggerNode, hasSchema, isMonitoringView, tabProps]
  );

  const aboutTabItem = useMemo(() => aboutTab(intl, tabProps), [intl, tabProps]);

  const monitorRetryTabItem = useMemo(
    () => ({
      ...monitorRetryTab(intl, tabProps),
      visible: isMonitoringView && !!runHistory,
    }),
    [intl, isMonitoringView, tabProps, runHistory]
  );

  const scratchTabItem = useMemo(
    () => ({
      ...scratchTab,
      visible: process.env.NODE_ENV !== 'production',
    }),
    []
  );

  const tabs = useMemo(() => {
    if (isUnitTestView) {
      return [mockResultsTabItem];
    }
    // Switch cases should only show parameters tab
    if (
      nodeMetaData &&
      (nodeMetaData.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE || nodeMetaData.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION)
    ) {
      return [parametersTabItem];
    }

    return [
      monitoringTabItem,
      parametersTabItem,
      settingsTabItem,
      channelsTabItem,
      transitionsTabItem,
      codeViewTabItem,
      testingTabItem,
      aboutTabItem,
      monitorRetryTabItem,
      scratchTabItem,
    ]
      .filter((a) => !panelTabHideKeys.includes(a.id as any))
      .filter((a) => a.visible)
      .sort((a, b) => a.order - b.order);
  }, [
    mockResultsTabItem,
    isUnitTestView,
    aboutTabItem,
    channelsTabItem,
    transitionsTabItem,
    codeViewTabItem,
    monitorRetryTabItem,
    monitoringTabItem,
    nodeMetaData,
    parametersTabItem,
    scratchTabItem,
    settingsTabItem,
    testingTabItem,
    panelTabHideKeys,
  ]);

  return tabs;
};
