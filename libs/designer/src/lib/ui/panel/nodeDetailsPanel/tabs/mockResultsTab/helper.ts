import { ConnectionType, type OutputInfo } from '@microsoft/logic-apps-shared';

interface HierarchicalOutputInfo extends OutputInfo {
  children?: HierarchicalOutputInfo[];
}

export const getFilteredOutputs = (outputs: Record<string, OutputInfo>, type: string): HierarchicalOutputInfo[] => {
  const supported = type === 'http' || type === ConnectionType.ServiceProvider || type === ConnectionType.ApiConnection;
  const addPrefix = type === ConnectionType.ApiConnection;

  const processNestedOutputs = (output: OutputInfo, parentKey = ''): HierarchicalOutputInfo => {
    const currentKey = parentKey ? `${parentKey}.${output.key}` : output.key;
    const prefixedKey = addPrefix ? `outputs.$.${currentKey}` : currentKey;

    const result: HierarchicalOutputInfo = {
      ...output,
      key: prefixedKey,
      name: currentKey,
      title: output.title || output.key,
      source: 'outputs',
      required: false,
    };

    if (output.type === 'object' && output.schema && output.schema.properties) {
      result.children = Object.entries(output.schema.properties).map(([key, prop]: [string, any]) =>
        processNestedOutputs(
          {
            key,
            type: prop.type,
            title: prop.title || key,
            schema: prop,
            isAdvanced: false,
            name: '',
          },
          currentKey
        )
      );
    }

    return result;
  };

  const filteredOutputs = Object.values(outputs)
    .filter((output: OutputInfo) => !output.isInsideArray)
    .map((output: OutputInfo) => processNestedOutputs(output));

  const outputsHasStatusCode = filteredOutputs.some((item) => item.key.includes('statusCode'));
  const initialOutputs: HierarchicalOutputInfo[] =
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
