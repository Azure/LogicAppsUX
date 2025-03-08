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
    return "# This file enables modules to be automatically managed by the Functions service.\r\n# See https://aka.ms/functionsmanageddependency for additional information.\r\n#\r\n@{\r\n    # For latest supported version, go to 'https://www.powershellgallery.com/packages/Az'. Uncomment the next line and replace the MAJOR_VERSION, e.g., 'Az' = '5.*'\r\n     # 'Az' = '10.*'\r\n}";
  }
  return '';
};

export const generateDefaultCustomCodeValue = (language: EditorLanguage): string => {
  switch (language) {
    case EditorLanguage.powershell:
      return `# Use these cmdlets to retrieve outputs from prior steps
# oldActionOutput = Get-ActionOutput -ActionName <name of old action>
# oldTriggerOutput = Get-TriggerOutput

$customResponse =  [PSCustomObject]@{
Message = "Hello world!"
}

# Use Write-Host/ Write-Output/Write-Debug to log messages to application insights
# Write-Host/Write-Output/Write-Debug and 'returns' will not return an output to the workflow
# Write-Host "Sending to application insight logs"

# Use Push-WorkflowOutput to push outputs forward to subsequent actions
Push-WorkflowOutput -Output $customResponse`;
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
  JToken triggerOutputs = (await context.GetTriggerResults().ConfigureAwait(false)).Outputs;

  ////the following dereferences the 'name' property from trigger payload.
  var name = triggerOutputs?["body"]?["name"]?.ToString();

  ////the following can be used to get the action outputs from a prior action
  //JToken actionOutputs = (await context.GetActionResults("Compose").ConfigureAwait(false)).Outputs;

  ////these logs will show-up in Application Insight traces table
  //log.LogInformation("Outputting results.");

  //var name = null;

  return new Results
  {
    Message = !string.IsNullOrEmpty(name) ? $"Hello {name} from CSharp action" : "Hello from CSharp action."
  };
}

public class Results
{
  public string Message {get; set;}
}`;
    default:
      return '';
  }
};
