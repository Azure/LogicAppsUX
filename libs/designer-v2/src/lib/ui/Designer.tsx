import { openPanel, useNodesInitialized } from '../core';
import { usePreloadOperationsQuery, usePreloadConnectorsQuery } from '../core/queries/browse';
import {
  useMonitoringView,
  useReadOnly,
  useHostOptions,
  useIsVSCode,
  useIsDarkMode,
} from '../core/state/designerOptions/designerOptionsSelectors';
import { useIsA2AWorkflow, useWorkflowHasAgentLoop } from '../core/state/designerView/designerViewSelectors';
import type { AppDispatch, RootState } from '../core/store';
import Controls from './Controls';
import Minimap from './Minimap';
import DeleteModal from './common/DeleteModal/DeleteModal';
import { PanelRoot } from './panel/panelRoot';
import { css, setLayerHostSelector } from '@fluentui/react';
import { mergeClasses, PanelLocation } from '@microsoft/designer-ui';
import type { CustomPanelLocation } from '@microsoft/designer-ui';
import { useEffect, useMemo, useRef } from 'react';
import KeyboardBackendFactory, { isKeyboardDragTrigger } from 'react-dnd-accessible-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, createTransition, MouseTransition } from 'react-dnd-multi-backend';
import { useHotkeys } from 'react-hotkeys-hook';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { Background, ReactFlowProvider } from '@xyflow/react';
import type { BackgroundProps } from '@xyflow/react';
import { PerformanceDebugTool } from './common/PerformanceDebug/PerformanceDebug';
import { CanvasFinder } from './CanvasFinder';
import { DesignerContextualMenu } from './common/DesignerContextualMenu/DesignerContextualMenu';
import { EdgeContextualMenu } from './common/EdgeContextualMenu/EdgeContextualMenu';
import { DragPanMonitor } from './common/DragPanMonitor/DragPanMonitor';
import { CanvasSizeMonitor } from './CanvasSizeMonitor';
import { AgentChat } from './panel/agentChat/agentChat';
import DesignerReactFlow from './DesignerReactFlow';
import MonitoringTimeline from './MonitoringTimeline';
import { useRunInstance } from '../core/state/workflow/workflowSelectors';
import { RunHistoryEntryInfo } from './panel';
import { useDesignerStyles } from './Designer.styles';

export interface DesignerProps {
  backgroundProps?: BackgroundProps;
  panelLocation?: PanelLocation;
  customPanelLocations?: CustomPanelLocation[];
  displayRuntimeInfo?: boolean;
}

export const SearchPreloader = () => {
  usePreloadOperationsQuery();
  usePreloadConnectorsQuery();
  return null;
};

export const Designer = (props: DesignerProps) => {
  const { backgroundProps, panelLocation = PanelLocation.Right, customPanelLocations } = props;

  const isVSCode = useIsVSCode();
  const isReadOnly = useReadOnly();
  const dispatch = useDispatch<AppDispatch>();

  const isDarkMode = useIsDarkMode();

  const styles = useDesignerStyles();

  const selectedRun = useRunInstance();

  const designerContainerRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const KeyboardTransition = createTransition('keydown', (event) => {
    if (!isKeyboardDragTrigger(event as KeyboardEvent)) {
      return false;
    }
    event.preventDefault();
    return true;
  });

  useHotkeys(
    ['meta+shift+p', 'ctrl+shift+p'],
    (event) => {
      event.preventDefault();
      dispatch(openPanel({ panelMode: 'NodeSearch' }));
    },
    { enabled: !isVSCode }
  );

  useHotkeys(
    ['meta+alt+p', 'ctrl+alt+p', 'meta+option+p', 'ctrl+option+p'],
    (event) => {
      event.preventDefault();
      dispatch(openPanel({ panelMode: 'NodeSearch' }));
    },
    { enabled: isVSCode }
  );

  const isMonitoringView = useMonitoringView();
  const workflowHasAgentLoop = useWorkflowHasAgentLoop();
  const isA2AWorkflow = useIsA2AWorkflow(); // Specifically A2A + Handoffs

  const hasChat = useMemo(() => {
    return workflowHasAgentLoop && isMonitoringView;
  }, [isMonitoringView, workflowHasAgentLoop]);

  const DND_OPTIONS: any = {
    backends: [
      {
        id: 'html5',
        backend: HTML5Backend,
        transition: MouseTransition,
      },
      {
        id: 'keyboard',
        backend: KeyboardBackendFactory,
        context: { window, document },
        preview: true,
        transition: KeyboardTransition,
      },
    ],
  };

  const isInitialized = useNodesInitialized();
  const preloadSearch = useMemo(() => !(isMonitoringView || isReadOnly) && isInitialized, [isMonitoringView, isReadOnly, isInitialized]);

  // Adding recurrence interval to the query to access outside of functional components
  const recurrenceInterval = useHostOptions().recurrenceInterval;
  useQuery({
    queryKey: ['recurrenceInterval'],
    initialData: recurrenceInterval,
    queryFn: () => {
      return recurrenceInterval ?? null;
    },
  });

  // Adding workflowKind (stateful or stateless) to the query to access outside of functional components
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);
  // This delayes the query until the workflowKind is available
  useQuery({ queryKey: ['workflowKind'], initialData: undefined, enabled: !!workflowKind, queryFn: () => workflowKind });

  return (
    <DndProvider options={DND_OPTIONS}>
      {preloadSearch ? <SearchPreloader /> : null}
      <div
        ref={designerContainerRef}
        className={mergeClasses('msla-designer-canvas', 'msla-panel-mode', styles.vars, isDarkMode ? styles.darkVars : styles.lightVars)}
      >
        <ReactFlowProvider>
          <div style={{ flexGrow: 1 }}>
            <DesignerReactFlow canvasRef={canvasRef}>
              {backgroundProps ? (
                <Background {...backgroundProps} />
              ) : (
                <Background
                  bgColor={isReadOnly ? '#80808010' : undefined}
                  color={isReadOnly ? '#00000000' : '#80808080'}
                  size={2}
                  // gap={[19.9, 20.3333]} // I don't know why, but it renders not exact by default
                  gap={[20, 20]}
									offset={[10, 10]}
                />
              )}
              <DeleteModal />
              <DesignerContextualMenu />
              <EdgeContextualMenu />
            </DesignerReactFlow>
          </div>
          <PanelRoot
            panelContainerRef={designerContainerRef}
            panelLocation={panelLocation}
            customPanelLocations={customPanelLocations}
            isResizeable={true}
          />
          {hasChat ? <AgentChat panelLocation={PanelLocation.Right} panelContainerRef={designerContainerRef} /> : null}
          <div className={css('msla-designer-tools', panelLocation === PanelLocation.Left && 'left-panel')}>
            <Controls />
            <Minimap />
          </div>
          <div className={styles.topLeftContainer}>
            {selectedRun && <RunHistoryEntryInfo run={selectedRun as any} />}
            {isMonitoringView && isA2AWorkflow && <MonitoringTimeline />}
          </div>
          <PerformanceDebugTool />
          <CanvasFinder />
          <CanvasSizeMonitor canvasRef={canvasRef} />
          <DragPanMonitor canvasRef={canvasRef} />
        </ReactFlowProvider>
        <div id={'msla-layer-host'} className={styles.layerHost} />
      </div>
    </DndProvider>
  );
};
