import { ConnectionType, type OutputInfo } from '@microsoft/logic-apps-shared';

/**
 * Retrieves the filtered outputs based on the provided type.
 * @param {Record<string, OutputInfo>} outputs - The outputs object containing key-value pairs of output information.
 * @param type - The type of connection.
 * @returns An array of filtered output information.
 */
export const getFilteredOutputs = (outputs: Record<string, OutputInfo>, type: string): OutputInfo[] => {
  const supported = type === 'http' || type === ConnectionType.ServiceProvider || type === ConnectionType.ApiConnection;

  const filteredOutputs = Object.values(outputs)
    .filter((output: OutputInfo) => {
      return !output.isInsideArray;
    })
    .filter((output: OutputInfo, _index: number, outputArray: OutputInfo[]) => {
      const hasChildren = outputArray.some((o: OutputInfo) => (o.key === output.key ? false : o.key.includes(output.key)));
      return !hasChildren;
    });

  const outputsHasStatusCode = filteredOutputs.some((item) => item.key.includes('statusCode'));

  const initialOutputs =
    supported && !outputsHasStatusCode
      ? [
          {
            key: 'outputs.$.statusCode',
            type: 'any',
            isAdvanced: false,
            name: 'statusCode',
            title: 'Status code',
            schema: {
              type: 'any',
              title: 'Status code',
            },
            source: 'outputs',
            required: false,
          },
        ]
      : [];

  return [...initialOutputs, ...filteredOutputs];
};
