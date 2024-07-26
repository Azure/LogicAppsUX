import { type StandardApp, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect, beforeEach } from 'vitest';
import { addNugetPackagesToBuildFile, suppressJavaScriptBuildWarnings, updateFunctionsSDKVersion } from '../updateBuildFile';
import { DotnetVersion } from '../../../../constants';

let defaultBuildFile: Record<string, any> = {};

beforeEach(() => {
  defaultBuildFile = {
    Project: {
      $: {
        Sdk: 'Microsoft.NET.Sdk',
      },
      PropertyGroup: {
        TargetFramework: 'net6.0',
        AzureFunctionsVersion: 'v4',
        RootNamespace: 'LogicAppProject',
      },
      ItemGroup: [
        {
          PackageReference: {
            $: {
              Include: 'Microsoft.NET.Sdk.Functions',
              Version: '4.4.0',
            },
          },
        },
        {
          None: [
            {
              $: {
                Update: 'host.json',
              },
              CopyToOutputDirectory: 'PreserveNewest',
            },
            {
              $: {
                Update: 'local.settings.json',
              },
              CopyToOutputDirectory: 'PreserveNewest',
              CopyToPublishDirectory: 'Never',
            },
          ],
        },
      ],
    },
  };
});

describe('utils/codeless/updateBuildFile', () => {
  describe('addNugetPackagesToBuildFile', () => {
    const packageReference = {
      Include: 'Microsoft.Azure.Workflows.WebJobs.Extension',
      Version: '1.2.*',
    };

    it('Should return a stateful workflow definition with the custom code template', () => {
      const xmlBuildFile = addNugetPackagesToBuildFile(defaultBuildFile);
      expect(xmlBuildFile.Project.ItemGroup.length).toEqual(3);
      expect(xmlBuildFile.Project.ItemGroup[2].PackageReference.$).toMatchObject(packageReference);
    });

    it('Should return a stateful workflow definition with the custom code template', () => {
      defaultBuildFile.Project.ItemGroup.push({
        PackageReference: {
          $: packageReference,
        },
      });
      const xmlBuildFile = addNugetPackagesToBuildFile(defaultBuildFile);
      expect(xmlBuildFile.Project.ItemGroup.length).toEqual(3);
    });
  });

  describe('suppressJavaScriptBuildWarnings', () => {
    it('Should return a stateless workflow definition with the custom code template', () => {
      const xmlBuildFile = suppressJavaScriptBuildWarnings(defaultBuildFile);
      expect(xmlBuildFile.Project.PropertyGroup).toHaveProperty('MSBuildWarningsAsMessages');
      expect(xmlBuildFile.Project.PropertyGroup.MSBuildWarningsAsMessages).toStrictEqual('MSB3246;$(MSBuildWarningsAsMessages)');
    });
  });

  describe('updateFunctionsSDKVersion', () => {
    it('Should return a stateless workflow definition with the rules template', () => {
      const xmlBuildFile = updateFunctionsSDKVersion(defaultBuildFile, DotnetVersion.net6);

      expect(xmlBuildFile.Project.ItemGroup[0].PackageReference.$).toMatchObject({
        Include: 'Microsoft.NET.Sdk.Functions',
        Version: '4.1.3',
      });
    });
    it('Should return a stateless workflow definition with the rules template', () => {
      const xmlBuildFile = updateFunctionsSDKVersion(defaultBuildFile, DotnetVersion.net3);

      expect(xmlBuildFile.Project.ItemGroup[0].PackageReference.$).toMatchObject({
        Include: 'Microsoft.NET.Sdk.Functions',
        Version: '3.0.13',
      });
    });
  });

  // describe('allowLocalSettingsToPublishDirectory', () => {
  //     it('Should return a stateful workflow definition with the rules template', () => {
  //         const workflowDefinition: StandardApp = allowLocalSettingsToPublishDirectory(methodName, true, ProjectType.rulesEngine);
  //         const test = {
  //           $: {
  //             Sdk: "Microsoft.NET.Sdk",
  //           },
  //           PropertyGroup: {
  //             TargetFramework: "net6.0",
  //             AzureFunctionsVersion: "v4",
  //             RootNamespace: "TestCarlosCastro2_copy_10",
  //             MSBuildWarningsAsMessages: "MSB3246;$(MSBuildWarningsAsMessages)",
  //           },
  //           ItemGroup: [
  //             {
  //               PackageReference: {
  //                 $: {
  //                   Include: "Microsoft.NET.Sdk.Functions",
  //                   Version: "4.4.0",
  //                 },
  //               },
  //             },
  //             {
  //               None: [
  //                 {
  //                   $: {
  //                     Update: "host.json",
  //                   },
  //                   CopyToOutputDirectory: "PreserveNewest",
  //                 },
  //                 {
  //                   $: {
  //                     Update: "local.settings.json",
  //                   },
  //                   CopyToOutputDirectory: "PreserveNewest",
  //                 },
  //               ],
  //             },
  //             {
  //               PackageReference: {
  //                 $: {
  //                   Include: "Microsoft.Azure.Workflows.WebJobs.Extension",
  //                   Version: "1.2.*",
  //                 },
  //               },
  //             },
  //           ],
  //         }

  //       });
  // });

  //   it('Should return an empty stateful workflow definition', () => {
  //     const workflowDefinition: StandardApp = addFolderToBuildPath(true);
  //     const test = {
  //       $: {
  //         Sdk: "Microsoft.NET.Sdk",
  //       },
  //       PropertyGroup: {
  //         TargetFramework: "net6.0",
  //         AzureFunctionsVersion: "v4",
  //         RootNamespace: "TestCarlosCastro2_copy_10",
  //         MSBuildWarningsAsMessages: "MSB3246;$(MSBuildWarningsAsMessages)",
  //       },
  //       ItemGroup: [
  //         {
  //           PackageReference: {
  //             $: {
  //               Include: "Microsoft.NET.Sdk.Functions",
  //               Version: "4.1.3",
  //             },
  //           },
  //         },
  //         {
  //           None: [
  //             {
  //               $: {
  //                 Update: "host.json",
  //               },
  //               CopyToOutputDirectory: "PreserveNewest",
  //             },
  //             {
  //               $: {
  //                 Update: "local.settings.json",
  //               },
  //               CopyToOutputDirectory: "PreserveNewest",
  //             },
  //           ],
  //         },
  //         {
  //           PackageReference: {
  //             $: {
  //               Include: "Microsoft.Azure.Workflows.WebJobs.Extension",
  //               Version: "1.2.*",
  //             },
  //           },
  //         },
  //         {
  //           None: {
  //             $: {
  //               Update: "Stateful1/**/*.*",
  //             },
  //             CopyToOutputDirectory: "PreserveNewest",
  //           },
  //         },
  //       ],
  //     }
  //   });
});
