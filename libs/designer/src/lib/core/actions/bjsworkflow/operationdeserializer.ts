import { addConnector, addOperationManifest } from '../../state/connectorSlice';
import { initializeOperationInfo, NodeParameters } from '../../state/operationMetadataSlice';
import { getConnector, getOperationManifest } from '../../state/selectors/actionMetadataSelector';
import type { Actions } from '../../state/workflowSlice';
import type { RootState } from '../../store';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { Dispatch } from '@reduxjs/toolkit';
import { ManifestParser } from '@microsoft-logic-apps/parsers';
import { OperationManifest, unmap } from '@microsoft-logic-apps/utils';

export const InitializeOperationDetails = async (
  operations: Actions,
  getState: () => RootState,
  dispatch: Dispatch<any>
): Promise<void> => {
  const promises: Promise<any>[] = [];
  for (const [operationId, operation] of Object.entries(operations)) {
    const { type } = operation;

    if (OperationManifestService().isSupported(type)) {
      promises.push(initializeOperationDetailsForManifest(operationId, operation, getState, dispatch));
    }
  }

  await Promise.all(promises);
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  definition: any,
  getState: () => RootState,
  dispatch: Dispatch<any>
): Promise<void> => {
  const state = getState();
  const service = OperationManifestService();
  const { connectorId, operationId } = await service.getOperationInfo(definition);
  const cachedConnector = getConnector(state, connectorId);
  let cachedOperationManifest = getOperationManifest(state, connectorId, operationId);

  if (!cachedConnector) {
    const connector = await ConnectionService().getConnector(connectorId);
    dispatch(addConnector({ ...connector, id: connectorId }));
  }

  if (!cachedOperationManifest) {
    const manifest = await service.getOperationManifest(connectorId, operationId);

    // TODO(psamband): Remove the 'if check' once manifest service is completed
    if (manifest) {
      cachedOperationManifest = manifest;
      dispatch(addOperationManifest({ connectorId, operationId, manifest }));
    }
  }

  dispatch(initializeOperationInfo({ id: nodeId, connectorId, operationId }));
};


const getInputParametersFromManifest = (manifest: OperationManifest, stepDefinition: any): NodeParameters => {
  const primaryInputParameters = new ManifestParser(manifest).getInputParameters(/* includeParentObject */ false, /* expandArrayPropertiesDepth */ 0);

  let primaryInputParametersInArray = unmap(primaryInputParameters);

  if (stepDefinition) {
      const nodeType = stepDefinition.type;
      const { inputsLocation } = manifest.properties;

          // In the case of retry policy, it is treated as an input
          // avoid pushing a parameter for it as it is already being
          // handled in the settings store.
          // TODO: this could be expanded to more settings that are treated as inputs.
          if (
              manifest.properties.settings &&
              manifest.properties.settings.retryPolicy &&
              stepDefinition.inputs &&
              stepDefinition.inputs.hasOwnProperty(PropertyName.RETRYPOLICY)
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
              /* createInvisibleParameter */ true,
              /* useDefault */ false
          );
  } else {
      ParametersHelper.loadParameterValuesFromDefault(primaryInputParameters);
  }

  const pickerHelper = new PickerHelper(this.Context, nodeId);
  const allParametersAsArray = ParametersHelper.toParameterInfoMap(
      this.Context,
      primaryInputParametersInArray,
      pickerHelper,
      stepDefinition,
      nodeId,
      this.Context.Features.isEnabled(AvailableFeatures.RAW_MODE),
      this.Context.Features.isEnabled(AvailableFeatures.INTELLISENSE_COMBOBOX),
      this.Context.Features.isEnabled(AvailableFeatures.FX_TOKEN)
  );

  this._initializeEditorViewModelForParameters(nodeId, allParametersAsArray);

  const parameterGroups = this._createDefaultParameterGroup(allParametersAsArray);

  const isWebhook = equals(this.Context.GraphStore.getNodeType(nodeId), Constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK);

  const expandedInputParameters = new OperationManifestParser(operationManifest).getInputParameters(
      /* includeParentObject */ true,
      /* expandArrayPropertiesDepth */ Constants.MAX_EXPAND_ARRAY_DEPTH
  );

  const enumParameters = this._getEnumParameters(nodeId, expandedInputParameters, /* parsedSwagger */ undefined);

  if (this.Context.Features.isEnabled(AvailableFeatures.SHOW_TRIGGER_RECURRENCE) && isTrigger && !isWebhook) {
      this._addRecurrenceParameterGroup(nodeId, stepDefinition, operationManifest.properties.recurrence, enumParameters, parameterGroups);
  }

  const defaultParameterGroup = parameterGroups[ParameterGroupKeys.DEFAULT];
  defaultParameterGroup.parameters = this._getParametersSortedByVisibility(defaultParameterGroup.parameters);

  this.dispatch<OperationParametersPayload>({
      payload: {
          enumParameters,
          graphNodeId: nodeId,
          parameterGroups,
          parametersSchema: expandedInputParameters,
          operationId,
      },
      type: ActionTypes.PARSE_PARAMETERS_SUCCESS,
  });

  const inputWithDynamicProperties = this._getInputWithDynamicSchema(expandedInputParameters);

  if (inputWithDynamicProperties) {
      this.dispatch<DynamicInputsPayload>({
          payload: {
              graphNodeId: nodeId,
              dynamicParameter: inputWithDynamicProperties,
              schemaInfo: DynamicParamHelper.getDynamicSchemaInfoForManifestBasedOperation(
                  operationId,
                  <DynamicPropertiesExtension>inputWithDynamicProperties.dynamicSchema.extension
              ),
              parameterInfo: {
                  in: inputWithDynamicProperties.in,
                  required: inputWithDynamicProperties.required,
              },
          },
          type: ActionTypes.NODE_ADD_DYNAMIC_INPUTS_INFO,
      });
  }
}
