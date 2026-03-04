import type { ParameterInfo } from '@microsoft/designer-ui';
import type { InputParameter, RecurrenceSetting } from '@microsoft/logic-apps-shared';
export declare const getRecurrenceParameters: (recurrence: RecurrenceSetting | undefined, operationDefinition: any, shouldEncodeBasedOnMetadata?: boolean) => {
    parameters: ParameterInfo[];
    rawParameters: InputParameter[];
};
