import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import { useNodeMetadata, useOperationInfo } from '../../../core';
import { useHidePanelTabs, useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useParameterValidationErrors } from '../../../core/state/operation/operationSelector';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
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
import { SUBGRAPH_TYPES } from '@microsoft/utils-logic-apps';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const usePanelTabs = () => {
  const intl = useIntl();

  const isMonitoringView = useMonitoringView();
  const hidePanelTabs = useHidePanelTabs();

  const selectedNode = useSelectedNodeId();
  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata));
  const operationInfo = useOperationInfo(selectedNode);
  const nodeMetaData = useNodeMetadata(selectedNode);
  const hasSchema = useHasSchema(operationInfo?.connectorId, operationInfo?.operationId);
  const runHistory = useRetryHistory(selectedNode);
  const isScopeNode = operationInfo?.type.toLowerCase() === constants.NODE.TYPE.SCOPE;
  const parameterValidationErrors = useParameterValidationErrors(selectedNode);
  const settingValidationErrors = useSettingValidationErrors(selectedNode);

  const monitoringTabItem = useMemo(
    () => ({
      ...monitoringTab(intl),
      visible: !isScopeNode && isMonitoringView,
    }),
    [intl, isMonitoringView, isScopeNode]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl),
      visible: !isMonitoringView,
      hasErrors: parameterValidationErrors.length > 0,
    }),
    [intl, isMonitoringView, parameterValidationErrors]
  );

  const settingsTabItem = useMemo(
    () => ({
      ...settingsTab(intl),
      hasErrors: settingValidationErrors.length > 0,
    }),
    [intl, settingValidationErrors]
  );

  const codeViewTabItem = useMemo(() => codeViewTab(intl), [intl]);

  const testingTabItem = useMemo(
    () => ({
      ...testingTab(intl),
      visible: !isTriggerNode && hasSchema && !isMonitoringView,
    }),
    [intl, isTriggerNode, hasSchema, isMonitoringView]
  );

  const aboutTabItem = useMemo(() => aboutTab(intl), [intl]);

  const monitorRetryTabItem = useMemo(
    () => ({
      ...monitorRetryTab(intl),
      visible: isMonitoringView && !!runHistory,
    }),
    [intl, isMonitoringView, runHistory]
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
    if (nodeMetaData && nodeMetaData.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE) return [parametersTabItem];

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
      .filter((a) => !hidePanelTabs.includes(a.id as any))
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
    hidePanelTabs,
  ]);

  return tabs;
};
