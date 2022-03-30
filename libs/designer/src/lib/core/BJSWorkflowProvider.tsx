import { ProviderWrappedContext } from './ProviderWrappedContext';
import { InitializeServices } from './actions/bjsworkflow/initialize';
import type { DeserializedWorkflow } from './parsers/BJSWorkflow/BJSDeserializer';
import { Deserialize } from './parsers/BJSWorkflow/BJSDeserializer';
import { initializeGraphState } from './parsers/ParseReduxAction';
import { initWorkflowSpec } from './state/workflowSlice';
import type { OperationInfo } from '@microsoft-logic-apps/designer-client-services';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { getIntl } from '@microsoft-logic-apps/intl';
import React, { useContext, useEffect } from 'react';
import { useQueries, useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

export interface BJSWorkflowProviderProps {
  workflow: LogicAppsV2.WorkflowDefinition;
}

const getWorkflow = (workflow: LogicAppsV2.WorkflowDefinition): Promise<DeserializedWorkflow> => {
  const deserialized = Deserialize(workflow);
  return new Promise((resolve) => deserialized);
};

const useLoadAllDataWithReactQuery = (workflow: LogicAppsV2.WorkflowDefinition): void => {
  // React Query example;
  const { data: deserialized } = useQuery('workflow', () => getWorkflow(workflow));
  const connectionService = ConnectionService();
  const operationManifestService = OperationManifestService();
  const { data: operationInfo } = useQuery<OperationInfo>('deserialized', () => operationManifestService.getOperationInfo(deserialized), {
    enabled: !!deserialized,
  });
  const operations = deserialized?.actionData;
  const manifestQueries = useQueries(
    Object.entries(operations ? operations : {}).map((operation) => {
      return {
        queryKey: ['manifest', { connectorId: operationInfo?.connectorId }, { operationId: operationInfo?.operationId }],
        queryFn: () =>
          operationManifestService.getOperationManifest(
            operationInfo ? operationInfo.connectorId : '',
            operationInfo ? operationInfo.operationId : ''
          ),
        enabled: !!operationInfo,
      };
    })
  );
  // for (const [operationId, operation] of Object.entries(operations)) {
  //   const { type } = operation;
  //   const connectorId = 'AzureBlob';
  //   const operationId = '123';
  //   const { data: conn } = useQuery( // this can be prefetch
  //     ['connection', { connectorId }],
  //     () => ConnectionService().getConnector(connectorId),
  //       {
  //       // The query will not execute until the id exists
  //       enabled: !!workflowId,
  //     })
  //   const { data: manifest } = useQuery( // this can be prefetch
  //     ['manifest', { connectorId }, { operationId }],
  //     () => OperationManifestService().getOperationManifest(connectorId, operationId),
  //       {
  //       // The query will not execute until the id exists
  //       enabled: !!workflowId,
  //     });
  //   }
  // }
};

const DataProviderInner: React.FC<BJSWorkflowProviderProps> = ({ workflow, children }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initWorkflowSpec('BJS'));
    dispatch(initializeGraphState(workflow));
  }, [dispatch, workflow]);

  const intl = getIntl();

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
