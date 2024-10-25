import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import { parseOutputs } from '../../../monitoring';

export default class DefaultOutputsBinder extends Binder {
  bind(outputs: any): BoundParameters {
    if (outputs === undefined) {
      return outputs;
    }

    return parseOutputs(outputs);
  }
}
