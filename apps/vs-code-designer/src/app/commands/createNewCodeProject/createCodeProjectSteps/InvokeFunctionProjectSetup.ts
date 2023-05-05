import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * This class represents a prompt step that allows the user to set up an Azure Function project.
 */
export class InvokeFunctionProjectSetup extends AzureWizardPromptStep<IProjectWizardContext> {
  // Hide the step count in the wizard UI
  public hideStepCount = true;

  /**
   * Prompts the user to enter a method name and namespace, and creates the .cs and .csproj files.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Prompt the user for the method name and namespace
    const methodName = await context.ui.showInputBox({
      title: 'Enter the name of the method',
      validateInput: (value: string) => {
        if (!value) {
          return 'Method name cannot be empty';
        }
        return undefined;
      },
    });

    const namespace = await context.ui.showInputBox({
      title: 'Enter the namespace',
      validateInput: (value: string) => {
        if (!value) {
          return 'Namespace cannot be empty';
        }
        return undefined;
      },
    });

    // Create the .cs file
    const csFilePath = path.join(context.projectPath, context.projectName, 'Function', `${methodName}.cs`);
    const csFileContent = `using System;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Host;
using Microsoft.Extensions.Logging;
namespace ${namespace}
{
    public static class ${methodName}
    {
        [FunctionName("${methodName}")]
        public static void Run([TimerTrigger("0 */5 * * * *")]TimerInfo myTimer, ILogger log)
        {
            log.LogInformation($"C# Timer trigger function executed at: {{DateTime.Now}}");
        }
    }
}`;

    await fs.writeFile(csFilePath, csFileContent);

    // Create the .csproj file
    const csprojFilePath = path.join(context.projectPath, context.projectName, 'Function', `${methodName}.csproj`);
    const csprojFileContent = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.WebJobs.Extensions.Timer" Version="3.0.10" />
    <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="3.0.13" />
  </ItemGroup>
</Project>`;

    await fs.writeFile(csprojFilePath, csprojFileContent);
  }

  /**
   * Determines whether the user should be prompted to set up an Azure Function project.
   * @param context The project wizard context.
   * @returns True if the user has not yet set up an Azure Function project, false otherwise.
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.invokedFunctionName;
  }
}
