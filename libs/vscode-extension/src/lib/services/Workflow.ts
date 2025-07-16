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
      result = replaceAllOccurrences(result, `@{parameters('${parameterName}')}`, parameterValue);
    }
  }

  if (appsettings) {
    for (const settingName of Object.keys(appsettings)) {
      const settingValue = appsettings[settingName] !== undefined ? appsettings[settingName] : '';
      // Don't replace if the setting value is a KeyVault reference
      if (typeof settingValue !== 'string' || settingValue.startsWith('@Microsoft.KeyVault(')) {
        continue;
      }
      result = replaceAllOccurrences(result, `@appsetting('${settingName}')`, settingValue);
      result = replaceAllOccurrences(result, `@{appsetting('${settingName}')}`, settingValue);
    }
  }

  try {
    return JSON.parse(result);
  } catch (_error) {
    throw new Error('Failure in resolving connection parameterization');
  }
};

function replaceAllOccurrences(content: string, searchValue: string, value: any): string {
  let result = replaceIfFoundAndVerifyJson(content, `"${searchValue}"`, JSON.stringify(value));
  if (result) {
    return result;
  }

  result = replaceIfFoundAndVerifyJson(content, searchValue, `${value}`);
  if (result) {
    return result;
  }

  return content.replaceAll(searchValue, '');
}

function replaceIfFoundAndVerifyJson(stringifiedJson: string, searchValue: string, value: string): string | undefined {
  if (!stringifiedJson.includes(searchValue)) {
    return undefined;
  }

  const result = stringifiedJson.replaceAll(searchValue, () => {
    return value;
  });

  try {
    JSON.parse(result);
    return result;
  } catch {
    return undefined;
  }
}
