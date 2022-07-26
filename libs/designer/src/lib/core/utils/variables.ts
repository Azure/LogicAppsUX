import Constants from '../../common/constants';
import type { NodeInputs } from '../state/operation/operationMetadataSlice';
import type { NodeTokens, VariableDeclaration } from '../state/tokensSlice';
import { ParameterGroupKeys } from './parameters/helper';
import { aggregate } from '@microsoft-logic-apps/utils';
import type { OutputToken as Token } from '@microsoft/designer-ui';
import { TokenType } from '@microsoft/designer-ui';

let variableIcon = '';
let variableBrandColor = '';

export const setVariableMetadata = (icon: string, brandColor: string): void => {
  variableIcon = icon;
  variableBrandColor = brandColor;
};

export const getVariableDeclarations = (nodeInputs: NodeInputs): VariableDeclaration[] => {
  const defaultParameterGroup = nodeInputs.parameterGroups[ParameterGroupKeys.DEFAULT];
  const nameParameter = defaultParameterGroup.parameters.find((parameter) => parameter.parameterName === 'name');
  const typeParameter = defaultParameterGroup.parameters.find((parameter) => parameter.parameterName === 'type');

  const name = nameParameter?.value.length === 1 ? nameParameter.value[0].value : null;
  const type = typeParameter?.value.length === 1 ? typeParameter.value[0].value : null;

  return name || type ? [{ name: name as string, type: type as string }] : [];
};

export const getAvailableVariables = (variables: Record<string, VariableDeclaration[]>, nodeTokens: NodeTokens): VariableDeclaration[] => {
  const { upstreamNodeIds } = nodeTokens;
  const allVariables = upstreamNodeIds.map((nodeId) => variables[nodeId] ?? []);
  return aggregate(allVariables);
};

export const getVariableTokens = (variables: Record<string, VariableDeclaration[]>, nodeTokens: NodeTokens): Token[] => {
  const availableVariables = getAvailableVariables(variables, nodeTokens);

  return availableVariables.map(({ name, type }: VariableDeclaration) => {
    return {
      key: `variables:${name}`,
      brandColor: variableBrandColor,
      icon: variableIcon,
      title: name,
      name,
      type: convertVariableTypeToSwaggerType(type) ?? Constants.SWAGGER.TYPE.ANY,
      isAdvanced: false,
      outputInfo: {
        type: TokenType.VARIABLE,
        functionName: Constants.FUNCTION_NAME.VARIABLES,
        functionArguments: [name],
      },
    };
  });
};

export const convertVariableTypeToSwaggerType = (type: string | undefined): string | undefined => {
  if (type) {
    switch (type.toLowerCase()) {
      case Constants.VARIABLE_TYPE.FLOAT:
        return Constants.SWAGGER.TYPE.NUMBER;
      case Constants.VARIABLE_TYPE.INTEGER:
        return Constants.SWAGGER.TYPE.INTEGER;
      case Constants.VARIABLE_TYPE.BOOLEAN:
        return Constants.SWAGGER.TYPE.BOOLEAN;
      case Constants.VARIABLE_TYPE.STRING:
        return Constants.SWAGGER.TYPE.STRING;
      case Constants.VARIABLE_TYPE.ARRAY:
        return Constants.SWAGGER.TYPE.ARRAY;
      case Constants.VARIABLE_TYPE.OBJECT:
        return Constants.SWAGGER.TYPE.OBJECT;
      default:
        return undefined;
    }
  }

  return undefined;
};
