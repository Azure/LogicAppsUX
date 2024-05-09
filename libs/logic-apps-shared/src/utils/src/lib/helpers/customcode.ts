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
using Newtonsoft.Json.Linq; 
      
/// <summary>
/// Executes the inline csharp code.
/// </summary>
/// <param name="context">The workflow context.</param>
/// <remarks> This is the entry-point to your code. The function signature should remain unchanged.</remarks> 
public static async Task<Results> Run(WorkflowContext context, ILogger log)
{
  var triggerOutputs = (await context.GetTriggerResults().ConfigureAwait(false)).Outputs; 

  log.LogInformation("Outputting results.");

  return new Results 
  { 
    Outputs = triggerOutputs 
  }; 
}

public class Results 
{ 
  public JToken Outputs {get; set;} 
}`;
    default:
      return '';
  }
};
