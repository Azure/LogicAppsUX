import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { processGraphLayout } from './parsers/ProcessLayoutReduxAction';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { initWorkflowSpec } from './state/workflowSlice';
export interface BJSWorkflowProviderProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  children: React.ReactNode;
}

const DataProviderInner = ({ workflow, children }: BJSWorkflowProviderProps) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initWorkflowSpec('BJS'));
    (dispatch(initializeGraphState(workflow)) as any).then(() => {
      dispatch(processGraphLayout(null));
    });
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
