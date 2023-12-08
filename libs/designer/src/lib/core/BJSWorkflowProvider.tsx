import type { Workflow } from '../common/models/workflow';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { initializeGraphState } from './parsers/ParseReduxAction';
import type { DesignerOptionsState } from './state/designerOptions/designerOptionsInterfaces';
import { initializeServices } from './state/designerOptions/designerOptionsSlice';
import { WorkflowKind } from './state/workflow/workflowInterfaces';
import { initWorkflowKind, initRunInstance, initWorkflowSpec } from './state/workflow/workflowSlice';
import type { AppDispatch, RootState } from './store';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { equals } from '@microsoft/utils-logic-apps';
import { useDeepCompareEffect } from '@react-hookz/web';
import { createSelector } from '@reduxjs/toolkit';
import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
  const servicesInitialized = useSelector(
    createSelector(
      (state: RootState) => state.designerOptions,
      (state: DesignerOptionsState) => state.servicesInitialized
    )
  );
  if (!wrapped) {
    throw new Error('BJSWorkflowProvider must be used inside of a DesignerProvider');
  }

  if (!servicesInitialized) {
    dispatch(initializeServices(wrapped));
  }

  return <DataProviderInner {...props} />;
};
