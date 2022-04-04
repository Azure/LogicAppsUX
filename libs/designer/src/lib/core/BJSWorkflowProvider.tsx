import { ProviderWrappedContext } from './ProviderWrappedContext';
import { InitializeServices } from './actions/bjsworkflow/initialize';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { initWorkflowSpec } from './state/workflowSlice';
import { RootState } from './store';
import { getIntl } from '@microsoft-logic-apps/intl';
import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface BJSWorkflowProviderProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  getToken: () => string;
}

const DataProviderInner: React.FC<BJSWorkflowProviderProps> = ({ workflow, children, getToken }) => {
  const dispatch = useDispatch();
  useEffect(() => {
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

  if (!wrapped.servicesInitialized) {
    // NOTE(psamband): If services are not initialized by host, we will initialize LA standard services.
    InitializeServices(props.getToken);
  }

  return <DataProviderInner {...props} />;
};
