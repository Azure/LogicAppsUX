import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
export default class DefaultOutputsBinder extends Binder {
    bind(outputs: any): BoundParameters;
}
