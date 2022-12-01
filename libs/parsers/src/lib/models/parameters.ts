import { isNullOrUndefined } from '@microsoft/utils-logic-apps';

export interface ParametersObject {
  type: string;
  value: any;
}

export const isParametersObject = (parameters: any): parameters is ParametersObject => {
  return !isNullOrUndefined(parameters.type) && !isNullOrUndefined(parameters.value);
};
