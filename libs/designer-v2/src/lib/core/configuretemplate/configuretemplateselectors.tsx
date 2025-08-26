import { useSelector } from 'react-redux';
import type { RootState } from '../state/templates/store';

export const useParameterDefinition = (parameterId: string) => {
  return useSelector((state: RootState) => state.template?.parameterDefinitions?.[parameterId]);
};
