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
#r "Newtonsoft.Json"
#r "Microsoft.Azure.Workflows.Scripting"
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Workflows.Scripting;

/// <summary>
/// Executes the inline csharp code.
/// </summary>
/// <param name="context">The workflow context.</param>
public static async Task<Weather> Run(WorkflowContext context, ILogger log)
{
  var outputs = (await context.GetActionResults("compose").ConfigureAwait(false)).Outputs;

  // Generate random temperature within a range based on the temperature scale
  Random rnd = new Random();
  var temperatureScale = outputs["temperatureScale"].ToString();
  var currentTemp = temperatureScale == "Celsius" ? rnd.Next(1, 30) : rnd.Next(40, 90);
  var lowTemp = currentTemp - 10;
  var highTemp = currentTemp + 10;
  var zipCode = (int) outputs["zipCode"];

  log.LogInformation("Starting func_name with Zip Code: " + zipCode + " and Scale: " + temperatureScale);

  // Create a Weather object with the temperature information
  var weather = new Weather()
  {
    ZipCode = (int) outputs["zipCode"],
    CurrentWeather = $"The current weather is {currentTemp} {temperatureScale}",
    DayLow = $"The low for the day is {lowTemp} {temperatureScale}",
    DayHigh = $"The high for the day is {highTemp} {temperatureScale}"
  };

  return weather;
}

/// <summary>
/// Represents the weather information.
/// </summary>
public class Weather
{
    /// <summary>
    /// Gets or sets the zip code.
    /// </summary>
    public int ZipCode { get; set; }
    /// <summary>
    /// Gets or sets the current weather.
    /// </summary>
    public string CurrentWeather { get; set; }
    /// <summary>
    /// Gets or sets the low temperature for the day.
    /// </summary>
    public string DayLow { get; set; }
    /// <summary>
    /// Gets or sets the high temperature for the day.
    /// </summary>
    public string DayHigh { get; set; }
}`;
    default:
      return '';
  }
};
