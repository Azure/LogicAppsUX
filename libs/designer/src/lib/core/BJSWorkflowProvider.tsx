import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeServices } from './actions/initialize';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { registerAllServices } from './state/servicesSlice';
import { initWorkflowSpec } from './state/workflowSlice';
export interface BJSWorkflowProviderProps {
  workflow: LogicAppsV2.WorkflowDefinition;
}

const DataProviderInner: React.FC<BJSWorkflowProviderProps> = ({ workflow, children }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(registerAllServices(initializeServices('BJS')));
    dispatch(initWorkflowSpec('BJS'));
    dispatch(initializeGraphState(workflow));
  }, [dispatch, workflow]);
  return <>{children}</>;
};

export const BJSWorkflowProvider: React.FC<BJSWorkflowProviderProps> = (props) => {
  const wrapped = useContext(ProviderWrappedContext);
  if (!wrapped) {
    throw new Error('BJSWorkflowProvider must be used inside of a DesignerProvider');
  }
  return <DataProviderInner {...props} />;
};
