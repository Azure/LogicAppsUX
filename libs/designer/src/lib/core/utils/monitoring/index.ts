import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { getIntl, isBoolean, isNullOrUndefined, isNumber, isString } from '@microsoft/logic-apps-shared';

/**
 * Parses the given outputs and returns a BoundParameters object. This function is used as a fallback outputs parser.
 * @param outputs - The outputs to parse, which can be a record of any type.
 * @returns A BoundParameters object where each key is a parameter name and the value is an object containing the display name and value.
 */
export const parseOutputs = (outputs: Record<string, any>): BoundParameters => {
  if (isNullOrUndefined(outputs)) {
    return outputs;
  }
  const intl = getIntl();
  const ouputsTitle = intl.formatMessage({
    defaultMessage: 'Outputs',
    id: '0oebOm',
    description: 'Outputs text',
  });

  const dictionaryResponse =
    isString(outputs) || isNumber(outputs as any) || Array.isArray(outputs) || isBoolean(outputs) ? { [ouputsTitle]: outputs } : outputs;

  return Object.keys(dictionaryResponse).reduce((prev: BoundParameters, current) => {
    prev[current] = { displayName: current, value: dictionaryResponse[current]?.content ?? dictionaryResponse[current] };
    return prev;
  }, {});
};

/**
 * Parses the given inputs and returns a BoundParameters object. This function is used as a fallback inputs parser.
 * @param inputs - A record containing the inputs to be parsed.
 * @returns A BoundParameters object with the parsed inputs.
 */
export const parseInputs = (inputs: Record<string, any>): BoundParameters => {
  if (isNullOrUndefined(inputs)) {
    return inputs;
  }

  const intl = getIntl();
  const inputsTitle = intl.formatMessage({
    defaultMessage: 'Inputs',
    id: 'PORNMZ',
    description: 'Inputs text',
  });

  const dictionaryResponse =
    isString(inputs) || isNumber(inputs as any) || Array.isArray(inputs) || isBoolean(inputs) ? { [inputsTitle]: inputs } : inputs;

  return Object.keys(dictionaryResponse).reduce((prev: BoundParameters, current) => {
    prev[current] = { displayName: current, value: dictionaryResponse[current]?.content ?? dictionaryResponse[current] };
    return prev;
  }, {});
};
