import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { initialize } from './state/workflowSlice';
export interface BJSWorkflowProviderProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  children: React.ReactNode;
}

const DataProviderInner = ({ workflow, children }: BJSWorkflowProviderProps) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initialize(workflow));
  }, [dispatch, workflow]);
  return <div>{children}</div>;
};

export const BJSWorkflowProvider = (props: BJSWorkflowProviderProps) => {
  const wrapped = useContext(ProviderWrappedContext);
  if (!wrapped) {
    throw new Error('BJSWorkflowProvider must be used inside of a DesignerProvider');
  }
  return <DataProviderInner {...props} />;
};
