import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useHasSchema = (connectorId: string, operationId: string) => {
  return useSelector((rootState: RootState) => !!rootState.staticResults.schemas[`${connectorId}-${operationId}`]);
};

export const useStaticResultSchema = (connectorId: string, operationId: string) => {
  return useSelector((rootState: RootState) => rootState.staticResults.schemas[`${connectorId}-${operationId}`]);
};

export const useStaticResultProperties = (propertyName: string) => {
  return useSelector((rootState: RootState) => rootState.staticResults.properties[propertyName]);
};

export const getStaticResultForNodeId = (rootState: RootState, nodeId: string) => {
  return rootState.staticResults.properties[nodeId + 0];
};
