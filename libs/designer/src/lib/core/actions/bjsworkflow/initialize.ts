/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import type { NodeInputs, NodeOutputs, OutputInfo } from '../../state/operation/operationMetadataSlice';
import { getRecurrenceParameters } from '../../utils/parameters/builtins';
import {
  loadParameterValuesFromDefault,
  ParameterGroupKeys,
  toParameterInfoMap,
  updateParameterWithValues,
} from '../../utils/parameters/helper';
import type { IConnectionService, IOperationManifestService, ISearchService } from '@microsoft-logic-apps/designer-client-services';
import { InitConnectionService, InitOperationManifestService, InitSearchService } from '@microsoft-logic-apps/designer-client-services';
import { getIntl } from '@microsoft-logic-apps/intl';
import { ManifestParser, PropertyName, Visibility } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { ConnectionReferenceKeyFormat, equals, getObjectPropertyValue, unmap } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
}

export const InitializeServices = ({ connectionService, operationManifestService, searchService }: ServiceOptions) => {
  InitConnectionService(connectionService);
  InitOperationManifestService(operationManifestService);
  InitSearchService(searchService);
};

export const getInputParametersFromManifest = (nodeId: string, manifest: OperationManifest, stepDefinition?: any): NodeInputs => {
  const primaryInputParameters = new ManifestParser(manifest).getInputParameters(
    false /* includeParentObject */,
    0 /* expandArrayPropertiesDepth */
  );
  let primaryInputParametersInArray = unmap(primaryInputParameters);

  if (stepDefinition) {
    const { inputsLocation } = manifest.properties;

    // In the case of retry policy, it is treated as an input
    // avoid pushing a parameter for it as it is already being
    // handled in the settings store.
    // NOTE: this could be expanded to more settings that are treated as inputs.
    if (
      manifest.properties.settings &&
      manifest.properties.settings.retryPolicy &&
      stepDefinition.inputs &&
      stepDefinition.inputs[PropertyName.RETRYPOLICY]
    ) {
      delete stepDefinition.inputs.retryPolicy;
    }

    if (
      manifest.properties.connectionReference &&
      manifest.properties.connectionReference.referenceKeyFormat === ConnectionReferenceKeyFormat.Function
    ) {
      delete stepDefinition.inputs.function;
    }

    primaryInputParametersInArray = updateParameterWithValues(
      'inputs.$',
      inputsLocation ? getObjectPropertyValue(stepDefinition, inputsLocation) : stepDefinition.inputs,
      '',
      primaryInputParametersInArray,
      true /* createInvisibleParameter */,
      false /* useDefault */
    );
  } else {
    loadParameterValuesFromDefault(primaryInputParameters);
  }

  const allParametersAsArray = toParameterInfoMap(primaryInputParametersInArray, stepDefinition, nodeId);
  const recurrenceParameters = getRecurrenceParameters(manifest.properties.recurrence, stepDefinition);

  // TODO(14490585)- Initialize editor view models

  const defaultParameterGroup = {
    id: ParameterGroupKeys.DEFAULT,
    description: '',
    parameters: allParametersAsArray,
  };
  const parameterGroups = {
    [ParameterGroupKeys.DEFAULT]: defaultParameterGroup,
  };

  if (recurrenceParameters.length) {
    const intl = getIntl();
    if (manifest.properties.recurrence?.useLegacyParameterGroup) {
      defaultParameterGroup.parameters = recurrenceParameters;
    } else {
      parameterGroups[ParameterGroupKeys.RECURRENCE] = {
        id: ParameterGroupKeys.RECURRENCE,
        description: intl.formatMessage({
          defaultMessage: 'How often do you want to check for items?',
          description: 'Recurrence parameter group title',
        }),
        parameters: recurrenceParameters,
      };
    }
  }

  // TODO(14490585)- Add enum parameters
  // TODO(14490691)- Initialize dynamic inputs.

  defaultParameterGroup.parameters = getParametersSortedByVisibility(defaultParameterGroup.parameters);

  return { parameterGroups };
};

export const getOutputParametersFromManifest = (nodeId: string, manifest: OperationManifest): NodeOutputs => {
  // TODO(14490747) - Update operation manifest for triggers with split on.

  const operationOutputs = new ManifestParser(manifest).getOutputParameters(
    true /* includeParentObject */,
    Constants.MAX_INTEGER_NUMBER /* expandArrayOutputsDepth */,
    false /* expandOneOf */,
    undefined /* data */,
    true /* selectAllOneOfSchemas */
  );

  // TODO(14490691) - Get dynamic schema output

  const nodeOutputs: Record<string, OutputInfo> = {};
  for (const [key, output] of Object.entries(operationOutputs)) {
    const {
      format,
      type,
      isDynamic,
      isInsideArray,
      name,
      itemSchema,
      parentArray,
      title,
      summary,
      description,
      source,
      required,
      visibility,
    } = output;

    nodeOutputs[key] = {
      key,
      type,
      format,
      isAdvanced: equals(visibility, Constants.VISIBILITY.ADVANCED),
      name,
      isDynamic,
      isInsideArray,
      itemSchema,
      parentArray,
      title: title ?? summary ?? description ?? name,
      source,
      required,
      description,
    };
  }

  return { outputs: nodeOutputs };
};

const getParametersSortedByVisibility = (parameters: ParameterInfo[]): ParameterInfo[] => {
  const sortedParameters: ParameterInfo[] = parameters.filter((parameter) => parameter.required);

  for (const parameter of parameters) {
    if (!parameter.required && equals(parameter.visibility, Visibility.Important)) {
      sortedParameters.push(parameter);
    }
  }

  parameters.forEach((parameter) => {
    if (!parameter.required && !equals(parameter.visibility, Visibility.Important) && !equals(parameter.visibility, Visibility.Advanced)) {
      sortedParameters.push(parameter);
    }
  });

  parameters.forEach((parameter) => {
    if (!parameter.required && equals(parameter.visibility, Visibility.Advanced)) {
      sortedParameters.push(parameter);
    }
  });

  return sortedParameters;
};
