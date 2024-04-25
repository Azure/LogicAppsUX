export const EditorLanguage = {
  javascript: 'javascript',
  json: 'json',
  xml: 'xml',
  templateExpressionLanguage: 'TemplateExpressionLanguage',
  yaml: 'yaml',
  csharp: 'csharp',
  powershell: 'powershell',
} as const;
export type EditorLanguage = (typeof EditorLanguage)[keyof typeof EditorLanguage];

export interface VFSObject {
  name: string;
  size: number;
  mtime: string;
  crtime: string;
  mime: string;
  href: string;
  path: string;
}

/**
 * Gets the extension name based on EditorLanguage.
 * @arg {EditorLanguage} language - The Editor Language to get extension name of.
 * @return {string} - The Extension Name
 */
export const getFileExtensionName = (language: EditorLanguage): string => {
  switch (language) {
    case EditorLanguage.csharp:
      return '.csx';
    case EditorLanguage.powershell:
      return '.ps1';
    default:
      return '.txt';
  }
};

export const getFileExtensionNameFromOperationId = (operationId: string): string => {
  switch (operationId) {
    case 'csharpscriptcode':
      return '.csx';
    case 'powershellcode':
      return '.ps1';
    default:
      return '.txt';
  }
};

export const getAppFileForFileExtension = (fileExtension: string): string => {
  if (fileExtension === '.ps1') {
    return "# This file enables modules to be automatically managed by the Functions service.\r\n# See https://aka.ms/functionsmanageddependency for additional information.\r\n#\r\n@{\r\n    # For latest supported version, go to 'https://www.powershellgallery.com/packages/Az'. Uncomment the next line and replace the MAJOR_VERSION, e.g., 'Az' = '5.*'\r\n     'Az' = '10.*'\r\n}";
  }
  return '';
};

export const generateDefaultCustomCodeValue = (language: EditorLanguage): string => {
  switch (language) {
    case EditorLanguage.powershell:
      return `$action = Get-ActionOutput -actionName "Compose" 

$subId = $action["body"]["subscriptionId"] 

$resourceGroupName = $action["body"]["resourceGroupName"] 

$logicAppName = $action["body"]["logicAppName"] 

$result = Start-AzLogicApp -ResourceGroupName $resourceGroupName -Name $logicAppName -TriggerName "manual" -Confirm 

Push-ActionOutputs -body $result`;
    case EditorLanguage.csharp:
      return `// Add the required libraries
const Newtonsoft = require("Newtonsoft.Json");
const AzureScripting = require("Microsoft.Azure.Workflows.Scripting");

// Define the function to run
async function run(context) {
  // Get the outputs from the 'compose' action
  const outputs = (await context.GetActionResults("compose")).Outputs;

  // Generate random temperature within a range based on the temperature scale
  const temperatureScale = outputs["temperatureScale"].toString();
  const currentTemp = temperatureScale === "Celsius" ? Math.floor(Math.random() * (30 - 1 + 1)) + 1 : Math.floor(Math.random() * (90 - 40 + 1)) + 40;
  const lowTemp = currentTemp - 10;
  const highTemp = currentTemp + 10;

  // Create a Weather object with the temperature information
  const weather = {
    ZipCode: parseInt(outputs["zipCode"]),
    CurrentWeather: \`The current weather is \${currentTemp} \${temperatureScale}\`,
    DayLow: \`The low for the day is \${lowTemp} \${temperatureScale}\`,
    DayHigh: \`The high for the day is \${highTemp} \${temperatureScale}\`
  };

  return weather;
}

// Define the Weather class
class Weather {
  constructor() {
      this.ZipCode = 0;
      this.CurrentWeather = "";
      this.DayLow = "";
      this.DayHigh = "";
    }
} 

module.exports = run;`;
    default:
      return '';
  }
};
