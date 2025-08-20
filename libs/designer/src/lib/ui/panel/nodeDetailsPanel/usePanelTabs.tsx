import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import { useNodeMetadata, useOperationInfo } from '../../../core';
import { useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { usePanelTabHideKeys, useUnitTest, useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useParameterValidationErrors } from '../../../core/state/operation/operationSelector';
import { useIsNodePinnedToOperationPanel } from '../../../core/state/panel/panelSelectors';
import { useSettingValidationErrors } from '../../../core/state/setting/settingSelector';
import { useHasSchema } from '../../../core/state/staticresultschema/staitcresultsSelector';
import { useRetryHistory } from '../../../core/state/workflow/workflowSelectors';
import { isTriggerNode } from '../../../core/utils/graph';
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
import { equals, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { channelsTab } from './tabs/channelsTab';
import { handoffTab } from './tabs/handoffTab';
import { useChannelsTabForAgentLoop } from '../../../common/hooks/experimentation';

export const usePanelTabs = ({ nodeId }: { nodeId: string }) => {
  const intl = useIntl();

  const isMonitoringView = useMonitoringView();
  const isUnitTestView = useUnitTest();
  const panelTabHideKeys = usePanelTabHideKeys();
  const isPinnedNode = useIsNodePinnedToOperationPanel(nodeId);
  const isTrigger = useSelector((state: RootState) => isTriggerNode(nodeId, state.workflow.nodesMetadata));
  const operationInfo = useOperationInfo(nodeId);
  const nodeMetaData = useNodeMetadata(nodeId);
  const hasSchema = useHasSchema(operationInfo?.connectorId, operationInfo?.operationId);
  const runHistory = useRetryHistory(nodeId);
  const isScopeNode = operationInfo?.type.toLowerCase() === constants.NODE.TYPE.SCOPE;
  const isAgentNode = useMemo(() => equals(operationInfo?.type ?? '', constants.NODE.TYPE.AGENT, true), [operationInfo?.type]);
  const isA2AWorkflow = useIsA2AWorkflow();
  const parameterValidationErrors = useParameterValidationErrors(nodeId);
  const settingValidationErrors = useSettingValidationErrors(nodeId);
  const disableChannelsTab = useChannelsTabForAgentLoop();

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
      // Hide Settings tab for Agent REQUEST triggers
      visible: !(
        isTrigger &&
        equals(operationInfo?.type, constants.NODE.TYPE.REQUEST) &&
        equals(operationInfo?.kind, constants.NODE.KIND.AGENT)
      ),
    }),
    [intl, tabProps, settingValidationErrors.length, isTrigger, operationInfo?.type, operationInfo?.kind]
  );

  const channelsTabItem = useMemo(
    () => ({
      ...channelsTab(intl, tabProps),
      // Note: Channels tab is disabled until we have the teams integration ready
      visible: !disableChannelsTab && isAgentNode && !isA2AWorkflow,
    }),
    [intl, tabProps, isAgentNode, isA2AWorkflow, disableChannelsTab]
  );

  const handoffTabItem = useMemo(
    () => ({
      ...handoffTab(intl, tabProps),
      visible: isAgentNode && isA2AWorkflow && !isMonitoringView,
    }),
    [intl, tabProps, isAgentNode, isA2AWorkflow, isMonitoringView]
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
      handoffTabItem,
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
    handoffTabItem,
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
