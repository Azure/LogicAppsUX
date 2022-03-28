import { ProviderWrappedContext } from './ProviderWrappedContext';
import { InitializeServices } from './actions/bjsworkflow/initialize';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { initWorkflowSpec } from './state/workflowSlice';
import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery } from 'react-query';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';

export interface BJSWorkflowProviderProps {
  workflow: LogicAppsV2.WorkflowDefinition;
}

const DataProviderInner: React.FC<BJSWorkflowProviderProps> = ({ workflow, children }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initWorkflowSpec('BJS'));
    dispatch(initializeGraphState(workflow));
  }, [dispatch, workflow]);
  const conn = useQuery(['connection', "AzureBlob"], () => ConnectionService().getConnector("AzureBlob"));
  console.log(conn);
  return <>{children}</>;
};

export const BJSWorkflowProvider: React.FC<BJSWorkflowProviderProps> = (props) => {
  const wrapped = useContext(ProviderWrappedContext);
  if (!wrapped) {
    throw new Error('BJSWorkflowProvider must be used inside of a DesignerProvider');
  }

  if (!wrapped.servicesInitialized) {
    // NOTE(psamband): If services are not initialized by host, we will initialize LA standard services.
    InitializeServices();
  }

  return <DataProviderInner {...props} />;
};
