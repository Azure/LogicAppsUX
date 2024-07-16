import type { ParametersData } from '../models/parameter';

export const resolveConnectionsReferences = (
  content: string,
  parameters: ParametersData | undefined,
  appsettings?: Record<string, string> | undefined
): any => {
  let result = content;

  if (parameters) {
    for (const parameterName of Object.keys(parameters)) {
      const parameterValue = parameters[parameterName].value !== undefined ? parameters[parameterName].value : '';
      result = replaceAllOccurrences(result, `@parameters('${parameterName}')`, parameterValue);
    }
  }

  if (appsettings) {
    for (const settingName of Object.keys(appsettings)) {
      const settingValue = appsettings[settingName] !== undefined ? appsettings[settingName] : '';
      result = replaceAllOccurrences(result, `@appsetting('${settingName}')`, settingValue);
    }
  }

  try {
    return JSON.parse(result);
  } catch (error) {
    throw new Error('Failure in resolving connection parameterisation');
  }
};

function replaceAllOccurrences(content: string, searchValue: string, value: any): string {
  while (content.includes(searchValue)) {
    const tempResult =
      replaceIfFoundAndVerifyJson(content, `"${searchValue}"`, JSON.stringify(value)) ??
      replaceIfFoundAndVerifyJson(content, searchValue, `${value}`) ??
      content.replace(searchValue, '');

    content = tempResult;
  }

  return content;
}

function replaceIfFoundAndVerifyJson(stringifiedJson: string, searchValue: string, value: string): string | undefined {
  if (!stringifiedJson.includes(searchValue)) {
    return undefined;
  }

  const result = stringifiedJson.replace(searchValue, () => {
    return value;
  });

  try {
    JSON.parse(result);
    return result;
  } catch {
    return undefined;
  }
}
