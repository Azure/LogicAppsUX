import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
export default class DefaultInputsBinder extends Binder {
    bind(inputs: any): BoundParameters;
}
