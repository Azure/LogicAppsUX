import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import { parseInputs } from 'lib/core/utils/monitoring';

export default class DefaultInputsBinder extends Binder {
  bind(inputs: any): BoundParameters {
    if (inputs === undefined) {
      return {};
    }

    return parseInputs(inputs);
  }
}
