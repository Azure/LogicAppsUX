import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import { useNodeMetadata, useOperationInfo } from '../../../core';
import { usePanelTabHideKeys, useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useParameterValidationErrors } from '../../../core/state/operation/operationSelector';
import { useSettingValidationErrors } from '../../../core/state/setting/settingSelector';
import { useHasSchema } from '../../../core/state/staticresultschema/staitcresultsSelector';
import { useRetryHistory } from '../../../core/state/workflow/workflowSelectors';
import { isRootNodeInGraph } from '../../../core/utils/graph';
import { aboutTab } from './tabs/aboutTab';
import { codeViewTab } from './tabs/codeViewTab';
import { monitoringTab } from './tabs/monitoringTab/monitoringTab';
import { parametersTab } from './tabs/parametersTab';
import { monitorRetryTab } from './tabs/retryTab';
import { scratchTab } from './tabs/scratchTab';
import { settingsTab } from './tabs/settingsTab';
import { testingTab } from './tabs/testingTab';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const usePanelTabs = ({ nodeId }: { nodeId: string }) => {
  const intl = useIntl();

  const isMonitoringView = useMonitoringView();
  const panelTabHideKeys = usePanelTabHideKeys();

  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const operationInfo = useOperationInfo(nodeId);
  const nodeMetaData = useNodeMetadata(nodeId);
  const hasSchema = useHasSchema(operationInfo?.connectorId, operationInfo?.operationId);
  const runHistory = useRetryHistory(nodeId);
  const isScopeNode = operationInfo?.type.toLowerCase() === constants.NODE.TYPE.SCOPE;
  const parameterValidationErrors = useParameterValidationErrors(nodeId);
  const settingValidationErrors = useSettingValidationErrors(nodeId);

  const monitoringTabItem = useMemo(
    () => ({
      ...monitoringTab(intl, nodeId),
      visible: !isScopeNode && isMonitoringView,
    }),
    [intl, isMonitoringView, isScopeNode, nodeId]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, nodeId),
      visible: !isMonitoringView,
      hasErrors: parameterValidationErrors.length > 0,
    }),
    [intl, isMonitoringView, nodeId, parameterValidationErrors]
  );

  const settingsTabItem = useMemo(
    () => ({
      ...settingsTab(intl, nodeId),
      hasErrors: settingValidationErrors.length > 0,
    }),
    [intl, nodeId, settingValidationErrors]
  );

  const codeViewTabItem = useMemo(() => codeViewTab(intl, nodeId), [intl, nodeId]);

  const testingTabItem = useMemo(
    () => ({
      ...testingTab(intl, nodeId),
      visible: !isTriggerNode && hasSchema && !isMonitoringView,
    }),
    [intl, isTriggerNode, hasSchema, isMonitoringView, nodeId]
  );

  const aboutTabItem = useMemo(() => aboutTab(intl, nodeId), [intl, nodeId]);

  const monitorRetryTabItem = useMemo(
    () => ({
      ...monitorRetryTab(intl, nodeId),
      visible: isMonitoringView && !!runHistory,
    }),
    [intl, isMonitoringView, nodeId, runHistory]
  );

  const scratchTabItem = useMemo(
    () => ({
      ...scratchTab,
      visible: process.env.NODE_ENV !== 'production',
    }),
    []
  );

  const tabs = useMemo(() => {
    // Switch cases should only show parameters tab
    if (nodeMetaData && nodeMetaData.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE) {
      return [parametersTabItem];
    }

    return [
      monitoringTabItem,
      parametersTabItem,
      settingsTabItem,
      codeViewTabItem,
      testingTabItem,
      aboutTabItem,
      monitorRetryTabItem,
      scratchTabItem,
    ]
      .slice()
      .filter((a) => !panelTabHideKeys.includes(a.id as any))
      .filter((a) => a.visible)
      .sort((a, b) => a.order - b.order);
  }, [
    aboutTabItem,
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
