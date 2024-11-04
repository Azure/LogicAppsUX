import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import { parseInputs } from '../../../monitoring';

export default class DefaultInputsBinder extends Binder {
  bind(inputs: any): BoundParameters {
    if (inputs === undefined) {
      return inputs;
    }

    return parseInputs(inputs);
  }
}
