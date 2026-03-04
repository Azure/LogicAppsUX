import { type OutputInfo } from '@microsoft/logic-apps-shared';
/**
 * Retrieves the filtered outputs based on the provided type.
 * @param {Record<string, OutputInfo>} outputs - The outputs object containing key-value pairs of output information.
 * @param {string} type - The type of connection.
 * @returns An array of filtered output information.
 */
export declare const getFilteredOutputs: (outputs: Record<string, OutputInfo>, type: string) => OutputInfo[];
