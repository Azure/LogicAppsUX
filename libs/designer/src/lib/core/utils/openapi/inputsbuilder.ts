import type { InputParameter } from "@microsoft/parsers-logic-apps";

export interface OpenApiConnectionSerializedInputs {
  parameters: Record<string, unknown>;
}

export class OpenApiOperationInputsBuilder {
  public loadStaticInputValuesFromDefinition(
    inputsInDefinition: OpenApiConnectionSerializedInputs | undefined,
    inputParameters: InputParameter[]
  ): InputParameter[] {
    return this._loadKnownParametersFromDefinition(inputsInDefinition, inputParameters);
  }

  private _loadKnownParametersFromDefinition(
    inputsInDefinition: OpenApiConnectionSerializedInputs | undefined,
    inputParameters: InputParameter[]
  ): InputParameter[] {
    if (!inputsInDefinition) {
      return inputParameters;
    }

    const result: InputParameter[] = [];

    for (const inputParameter of inputParameters) {
      const inputParameterAlias =
        inputParameter.alias ||
        inputParameter.name;

      result.push({
        ...inputParameter,
        value: inputsInDefinition.parameters[inputParameterAlias],
      });
    }

    return result;
  }
}
