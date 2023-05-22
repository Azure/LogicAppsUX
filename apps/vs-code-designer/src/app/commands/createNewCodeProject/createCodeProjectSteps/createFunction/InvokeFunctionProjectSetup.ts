import { FunctionConfigFile } from './FunctionConfigFile';
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
   * Prompts the user to set up an Azure Function project.
   * @param context The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Set the methodName and namespaceName properties from the context wizard
    const methodName = context.methodName;
    const namespace = context.namespaceName;

    // Define the functions folder path using the context property of the wizard
    const functionFolderPath = context.functionFolderPath;

    // Create the .cs file inside the functions folder
    await this.createCsFile(functionFolderPath, methodName, namespace);

    // Create the .csproj file inside the functions folder
    await this.createCsprojFile(functionFolderPath, methodName);

    // Generate the VS Code configuration files in the specified folder
    const createConfigFiles = new FunctionConfigFile();
    await createConfigFiles.prompt(context);
  }

  /**
   * Determines whether the user should be prompted to set up an Azure Function project.
   * @param context The project wizard context.
   * @returns True if the user has not yet set up an Azure Function project, false otherwise.
   */
  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }

  /**
   * Creates the .cs file inside the functions folder.
   * @param functionFolderPath The path to the functions folder.
   * @param methodName The name of the method.
   * @param namespace The name of the namespace.
   */
  private async createCsFile(functionFolderPath: string, methodName: string, namespace: string): Promise<void> {
    const csFilePath = path.join(functionFolderPath, `${methodName}.cs`);
    const csFileContent = `//------------------------------------------------------------
    // Copyright (c) Microsoft Corporation.  All rights reserved.
    //------------------------------------------------------------
    
    namespace ${namespace}
    {
        using System;
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Microsoft.Azure.Functions.Extensions.Workflows.WorkflowActionTrigger;
        using Microsoft.Azure.WebJobs;
        /// <summary>
        /// The flow invoked function.
        /// </summary>
        public static class ${methodName}
        {
            /// <summary>
            /// Run method.
            /// </summary>
            /// <param name="parameter1">The parameter 1.</param>
            /// <param name="parameter2">The parameter 2.</param>
            /*
            [FunctionName("${methodName}")]
            public static Task<Wrapper> Run([WorkflowActionTrigger] string parameter1, int parameter2)
            {
                var result = new Wrapper
                {
                    RandomProperty = new Dictionary<string, object>(){
                        ["parameter1"] = parameter1,
                        ["parameter2"] = parameter2
                    }
                };
    
                return Task.FromResult(result); 
            }
    
            /// <summary>
            /// The wrapper.
            /// </summary>
            public class Wrapper
            {
                /// <summary>
                /// Gets or sets the .NET Framework worker output.
                /// </summary>
                public Dictionary<string, object> RandomProperty { get; set; }
            }
    */
    
            [FunctionName("${methodName}")]
            public static Task<Weather> Run([WorkflowActionTrigger] int zipCode, string temperatureScale)
            {
                Random rnd = new Random();
                var currentTemp = temperatureScale == "Celcius" ? rnd.Next(1,30) : rnd.Next(40,90);
                var lowTemp = currentTemp -10;
                var highTemp = currentTemp +10;
    
    
                var weather = new Weather()
                {
                    ZipCode=zipCode,
                    CurrentWeather = String.Format("The current weather is {0} {1}",currentTemp, temperatureScale),
                    DayLow = String.Format("The low for the day is {0} {1}", lowTemp, temperatureScale),
                    DayHigh = String.Format("The high for the day is {0} {1}", highTemp,temperatureScale)
                };
    
                return Task.FromResult(weather); 
            }
    
            public class Weather
            {
                /// <summary>
                /// Gets or sets the .NET Framework worker output.
                /// </summary>
                public int ZipCode {get;set;}
                public string CurrentWeather {get;set;}
                public string DayLow {get;set;}
                
                public string DayHigh {get;set;}
            }
        }
     }`;
    await fs.writeFile(csFilePath, csFileContent);
  }

  private async createCsprojFile(functionFolderPath: string, methodName: string): Promise<void> {
    const csprojFilePath = path.join(functionFolderPath, `${methodName}.csproj`);
    const csprojFileContent = `<Project Sdk="Microsoft.NET.Sdk" InitialTargets="Compile">
    <PropertyGroup>
      <IsPackable>false</IsPackable>
      <TargetFramework>net472</TargetFramework>
      <AzureFunctionsVersion>v4</AzureFunctionsVersion>
      <OutputType>Library</OutputType>
      <PlatformTarget>x64</PlatformTarget>
      <!-- Please replace 'LogicAppFolder' with the name of your folder that contains your logic app project. -->
      <LogicAppFolder>LogicApp</LogicAppFolder>
      <CopyToOutputDirectory>Always</CopyToOutputDirectory>
   </PropertyGroup>
  
    <ItemGroup>
    <!-- Please ensure you have the 'Microsoft.Azure.Functions.Extensions.Workflows.WorkflowActionTrigger' package and the 'Microsoft.Azure.WebJobs.Core' dependency. -->
      <PackageReference Include="Microsoft.Azure.WebJobs.Core" Version="3.0.33" />
      <PackageReference Include="Microsoft.Azure.Workflows.Webjobs.Sdk" version="4.0.4736-preview"></PackageReference>
      <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="1.0.24" />
      <PackageReference Include="Newtonsoft.Json" Version="11.0.2" />
      <PackageReference Include="Newtonsoft.Json.Schema" Version="3.0.10" />
    </ItemGroup>

    <Target Name="Task" AfterTargets="Compile">
    <ItemGroup>
        <DirsToClean2 Include="..\\$(LogicAppFolder)\\lib\\custom" />
      </ItemGroup>
      <RemoveDir Directories="@(DirsToClean2)" />
    </Target>
  
    <Target Name="CopyExtensionFiles" AfterTargets="ParameterizedFunctionJsonGenerator">
      <ItemGroup>
          <CopyFiles Include="$(MSBuildProjectDirectory)\\bin\\Debug\\net472\\**\\*.*" CopyToOutputDirectory="PreserveNewest" />
      </ItemGroup>
      <Message Importance="High" Text="$(MSBuildProjectDirectory)"/>
      <Copy SourceFiles="@(CopyFiles)" DestinationFolder="..\\$(LogicAppFolder)\\lib\\custom\\%(RecursiveDir)"  SkipUnchangedFiles="true" />
      <ItemGroup>
          <MoveFiles Include="..\\$(LogicAppFolder)\\lib\\custom\\bin\\*.*" />
      </ItemGroup>
  
     <Move SourceFiles="@(MoveFiles)" DestinationFolder="..\\$(LogicAppFolder)\\lib\\custom\\net472" />
      <ItemGroup>
         <DirsToClean Include="..\\$(LogicAppFolder)\\lib\\custom\\bin"/>
       </ItemGroup>
         <RemoveDir Directories="@(DirsToClean)" />
      </Target>
  
    <ItemGroup>
        <Reference Include="Microsoft.CSharp" />
    </ItemGroup>
  
  </Project>`;
    await fs.writeFile(csprojFilePath, csprojFileContent);
  }
}
