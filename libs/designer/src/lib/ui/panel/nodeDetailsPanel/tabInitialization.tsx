import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import { useNodeMetadata, useOperationInfo } from '../../../core';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useSelectedNodeId, useSelectedPanelTabName, useVisiblePanelTabs } from '../../../core/state/panel/panelSelectors';
import { registerPanelTabs, setTabVisibility, selectPanelTab, isolateTab } from '../../../core/state/panel/panelSlice';
import { useHasSchema } from '../../../core/state/staticresultschema/staitcresultsSelector';
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
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const usePanelTabs = () => {
  const dispatch = useDispatch();
  const intl = useIntl();

  const isMonitoringView = useMonitoringView();

  const selectedPanelTab = useSelectedPanelTabName();
  const selectedNode = useSelectedNodeId();
  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata));
  const operationInfo = useOperationInfo(selectedNode);
  const nodeMetaData = useNodeMetadata(selectedNode);
  const hasSchema = useHasSchema(operationInfo?.connectorId, operationInfo?.operationId);

  const visibleTabs = useVisiblePanelTabs();

  useEffect(() => {
    const tabs = [
      monitoringTab(intl),
      parametersTab(intl),
      settingsTab(intl),
      codeViewTab(intl),
      testingTab(intl),
      aboutTab(intl),
      monitorRetryTab(intl),
    ];
    if (process.env.NODE_ENV !== 'production') {
      tabs.push(scratchTab);
    }
    dispatch(registerPanelTabs(tabs));
  }, [dispatch, intl]);

  useEffect(() => {
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.MONITORING,
        visible: isMonitoringView,
      })
    );
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.PARAMETERS,
        visible: !isMonitoringView,
      })
    );
  }, [dispatch, isMonitoringView]);

  useEffect(() => {
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.MONITORING,
        visible: operationInfo?.type.toLowerCase() !== constants.NODE.TYPE.SCOPE && isMonitoringView,
      })
    );
  }, [dispatch, operationInfo, isMonitoringView]);

  useEffect(() => {
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.TESTING,
        visible: !isTriggerNode && hasSchema && !isMonitoringView,
      })
    );
  }, [dispatch, hasSchema, isMonitoringView, isTriggerNode, selectedNode]);

  useEffect(() => {
    if (!visibleTabs?.map((tab: any) => tab.name.toLowerCase())?.includes(selectedPanelTab ?? ''))
      dispatch(selectPanelTab(visibleTabs[0]?.name.toLowerCase()));
  }, [dispatch, visibleTabs, selectedPanelTab]);

  useEffect(() => {
    if (nodeMetaData && nodeMetaData.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE) {
      dispatch(isolateTab(constants.PANEL_TAB_NAMES.PARAMETERS));
    }
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.MONITORING,
        visible: isMonitoringView,
      })
    );
  }, [dispatch, selectedNode, nodeMetaData, isMonitoringView]);
};
