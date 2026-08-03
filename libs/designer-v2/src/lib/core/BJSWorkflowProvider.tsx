import type { Workflow } from '../common/models/workflow';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { initCustomCode } from './state/customcode/customcodeSlice';
import {
  useAreDesignerOptionsInitialized,
  useAreServicesInitialized,
  useMonitoringView,
  useReadOnly,
} from './state/designerOptions/designerOptionsSelectors';
import { initializeServices } from './state/designerOptions/designerOptionsSlice';
import { resetWorkflowState } from './state/global';
import { setWorkflowKind, setRunInstance, setHasUnsupportedMultipleTriggers, initWorkflowSpec } from './state/workflow/workflowSlice';
import type { AppDispatch } from './store';
import { parseWorkflowKind } from './utils/workflow';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { hasMultipleTriggers } from '@microsoft/logic-apps-shared';
import { useDeepCompareEffect } from '@react-hookz/web';
import type React from 'react';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { initRunInPanel } from './state/panel/panelSlice';
import { initializeDiscoveryPanelFavoriteOperations } from './actions/bjsworkflow/initialize';
import { clearAllErrors } from './state/operation/operationMetadataSlice';

// Read synchronously (during render) rather than via a Redux selector so a multi-trigger workflow
// is known to Designer on the very same render pass in which BJSWorkflowProvider receives it --
// before any child (e.g. DesignerReactFlow) can mount. The equivalent Redux field
// (hasUnsupportedMultipleTriggers, set in the effect below) only updates one render/effect cycle
// later, which is late enough for the canvas to mount-then-unmount, or -- on a workflow switch
// within the same DesignerProvider instance -- to briefly render the previous workflow's graph.
const MultiTriggerContext = createContext(false);

/** True as soon as BJSWorkflowProvider receives a workflow definition with more than one trigger. */
export const useIsUnsupportedMultipleTriggers = (): boolean => useContext(MultiTriggerContext);

export interface BJSWorkflowProviderProps {
  // used to force a workflow rerender when switching from code view
  workflowId?: string;
  workflow: Workflow;
  customCode?: Record<string, string>;
  runInstance?: LogicAppsV2.RunInstanceDefinition | null;
  children?: React.ReactNode;
  appSettings?: Record<string, any>;
  isMultiVariableEnabled?: boolean;
}

const DataProviderInner: React.FC<BJSWorkflowProviderProps> = ({
  workflowId,
  workflow,
  children,
  runInstance,
  customCode,
  appSettings,
  isMultiVariableEnabled,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const isReadOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  // Computed synchronously during render (not in the effect below) and exposed via context so
  // Designer can pick the fallback on its very first render for this workflow -- see
  // useIsUnsupportedMultipleTriggers's doc comment for why the Redux-effect-derived flag is too late.
  const isUnsupportedMultipleTriggers = useMemo(() => hasMultipleTriggers(workflow?.definition), [workflow]);

  useDeepCompareEffect(() => {
    // Neither the Consumption nor Standard designer/monitoring experiences support workflow definitions
    // with more than one trigger. Detect this before initializing any graph/designer state so the
    // canvas is never rendered against unsupported data (see BJSDeserializer's RENDER_MULTIPLE_TRIGGERS
    // guard, which this pre-check is intended to make unreachable in the normal designer flow).
    if (isUnsupportedMultipleTriggers) {
      // Clear any graph/operation/panel-selection state left over from a previously-loaded workflow in
      // this same DesignerProvider instance (e.g. switching from code view back to designer view after
      // editing in a second trigger, without the id/workflowId changing). Without this, the canvas
      // itself is correctly replaced by the unsupported-designer message, but shell components that stay
      // mounted (PanelRoot, CanvasFinder, KindChangeDialog) would keep operating on stale data from the
      // prior workflow instead of a clean/empty baseline, since initializeGraphState -- which normally
      // overwrites that state -- is never dispatched for multi-trigger workflows.
      dispatch(resetWorkflowState());
    }

    dispatch(clearAllErrors());
    dispatch(initWorkflowSpec('BJS'));
    dispatch(setWorkflowKind(parseWorkflowKind(workflow?.kind)));
    dispatch(setRunInstance(runInstance ?? null));
    dispatch(initRunInPanel(runInstance ?? null));
    dispatch(initCustomCode(customCode));
    dispatch(setHasUnsupportedMultipleTriggers(isUnsupportedMultipleTriggers));

    if (!isUnsupportedMultipleTriggers) {
      dispatch(initializeGraphState({ workflowDefinition: workflow, runInstance, isMultiVariableEnabled }));
    }
  }, [workflowId, runInstance, workflow, customCode, isReadOnly, isMonitoringView, isUnsupportedMultipleTriggers]);

  // Store app settings in query to access outside of functional components
  useQuery({
    queryKey: ['appSettings'],
    initialData: appSettings,
    queryFn: () => {
      return appSettings ?? null;
    },
  });

  return <MultiTriggerContext.Provider value={isUnsupportedMultipleTriggers}>{children}</MultiTriggerContext.Provider>;
};

export const BJSWorkflowProvider: React.FC<BJSWorkflowProviderProps> = (props) => {
  const wrapped = useContext(ProviderWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreServicesInitialized();
  const designerOptionsInitialized = useAreDesignerOptionsInitialized();

  if (!wrapped) {
    throw new Error('BJSWorkflowProvider must be used inside of a DesignerProvider');
  }

  useEffect(() => {
    dispatch(initializeServices(wrapped));
  }, [dispatch, wrapped]);

  useEffect(() => {
    initializeDiscoveryPanelFavoriteOperations(dispatch);
  }, [dispatch]);

  if (!designerOptionsInitialized || !servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
