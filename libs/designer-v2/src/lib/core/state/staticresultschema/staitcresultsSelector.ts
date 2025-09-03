import type { RootState } from '../../store';
import { useSelector } from 'react-redux';
import type { StaticResultsState } from './staticresultsSlice';

export const useHasSchema = (connectorId: string, operationId: string) => {
  return useSelector((rootState: RootState) => !!rootState.staticResults.schemas[`${connectorId}-${operationId}`]);
};

export const useStaticResultSchema = (connectorId: string, operationId: string) => {
  return useSelector((rootState: RootState) => rootState.staticResults.schemas[`${connectorId}-${operationId}`]);
};

export const useStaticResultProperties = (propertyName: string) => {
  return useSelector((rootState: RootState) => rootState.staticResults.properties[propertyName]);
};

export const getStaticResultForNodeId = (staticResultState: StaticResultsState, nodeId: string) => {
  return staticResultState.properties[nodeId + 0];
};
