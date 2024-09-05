import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { getIntl, isBoolean, isNullOrUndefined, isNumber, isString } from '@microsoft/logic-apps-shared';

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

export const parseInputs = (inputs: Record<string, any>): BoundParameters => {
  if (isNullOrUndefined(inputs)) {
    return inputs;
  }

  const dictionaryResponse =
    isString(inputs) || isNumber(inputs as any) || Array.isArray(inputs) || isBoolean(inputs) ? { ['Inputs']: inputs } : inputs;

  return Object.keys(dictionaryResponse).reduce((prev: BoundParameters, current) => {
    prev[current] = { displayName: current, value: dictionaryResponse[current]?.content ?? dictionaryResponse[current] };
    return prev;
  }, {});
};
