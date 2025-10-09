import type { Workflow } from '../common/models/workflow';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { deserializeUnitTestDefinition } from './parsers/BJSWorkflow/BJSDeserializer';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { initCustomCode } from './state/customcode/customcodeSlice';
import {
  useAreDesignerOptionsInitialized,
  useAreServicesInitialized,
  useMonitoringView,
	useReadOnly,
} from './state/designerOptions/designerOptionsSelectors';
import { initializeServices } from './state/designerOptions/designerOptionsSlice';
import { initUnitTestDefinition } from './state/unitTest/unitTestSlice';
import { initWorkflowKind, initRunInstance, initWorkflowSpec } from './state/workflow/workflowSlice';
import type { AppDispatch } from './store';
import { parseWorkflowKind } from './utils/workflow';
import type { LogicAppsV2, UnitTestDefinition } from '@microsoft/logic-apps-shared';
import { useDeepCompareEffect } from '@react-hookz/web';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { initRunInPanel } from './state/panel/panelSlice';
import { initializeDiscoveryPanelFavoriteOperations } from './actions/bjsworkflow/initialize';
import { clearAllErrors } from './state/operation/operationMetadataSlice';

export interface BJSWorkflowProviderProps {
  // used to force a workflow rerender when switching from code view
  workflowId?: string;
  workflow: Workflow;
  customCode?: Record<string, string>;
  runInstance?: LogicAppsV2.RunInstanceDefinition | null;
  children?: React.ReactNode;
  appSettings?: Record<string, any>;
  unitTestDefinition?: UnitTestDefinition | null;
  isMultiVariableEnabled?: boolean;
}

const DataProviderInner: React.FC<BJSWorkflowProviderProps> = ({
  workflowId,
  workflow,
  children,
  runInstance,
  customCode,
  appSettings,
  unitTestDefinition,
  isMultiVariableEnabled,
}) => {
  const dispatch = useDispatch<AppDispatch>();

	const isReadOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  useDeepCompareEffect(() => {
    dispatch(clearAllErrors());
    dispatch(initWorkflowSpec('BJS'));
    dispatch(initWorkflowKind(parseWorkflowKind(workflow?.kind)));
    dispatch(initRunInstance(runInstance ?? null));
    dispatch(initRunInPanel(runInstance ?? null));
    dispatch(initCustomCode(customCode));
    dispatch(initializeGraphState({ workflowDefinition: workflow, runInstance, isMultiVariableEnabled }));
    dispatch(initUnitTestDefinition(deserializeUnitTestDefinition(unitTestDefinition ?? null, workflow)));
	}, [workflowId, runInstance, workflow, customCode, unitTestDefinition, isReadOnly, isMonitoringView]);

  // Store app settings in query to access outside of functional components
  useQuery({
    queryKey: ['appSettings'],
    initialData: appSettings,
    queryFn: () => {
      return appSettings ?? null;
    },
  });

  return <>{children}</>;
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
    if (!servicesInitialized) {
      dispatch(initializeServices(wrapped));
    }
  }, [dispatch, servicesInitialized, wrapped]);

  useEffect(() => {
    initializeDiscoveryPanelFavoriteOperations(dispatch);
  }, [dispatch]);

  if (!designerOptionsInitialized || !servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
