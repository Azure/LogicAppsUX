import type { Workflow } from '../common/models/workflow';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { useAreDesignerOptionsInitialized, useAreServicesInitialized } from './state/designerOptions/designerOptionsSelectors';
import { initializeServices } from './state/designerOptions/designerOptionsSlice';
import { WorkflowKind } from './state/workflow/workflowInterfaces';
import { initWorkflowKind, initRunInstance, initWorkflowSpec } from './state/workflow/workflowSlice';
import type { AppDispatch } from './store';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import { useDeepCompareEffect } from '@react-hookz/web';
import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';

export interface BJSWorkflowProviderProps {
  workflow: Workflow;
  runInstance?: LogicAppsV2.RunInstanceDefinition | null;
  children?: React.ReactNode;
}

const DataProviderInner: React.FC<BJSWorkflowProviderProps> = ({ workflow, children, runInstance }) => {
  const dispatch = useDispatch<AppDispatch>();
  useDeepCompareEffect(() => {
    dispatch(initWorkflowSpec('BJS'));
    dispatch(initWorkflowKind(equals(workflow?.kind, 'stateful') ? WorkflowKind.STATEFUL : WorkflowKind.STATELESS));
    dispatch(initRunInstance(runInstance ?? null));
    dispatch(initializeGraphState({ workflowDefinition: workflow, runInstance }));
  }, [runInstance, workflow]);

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

  if (!designerOptionsInitialized || !servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
