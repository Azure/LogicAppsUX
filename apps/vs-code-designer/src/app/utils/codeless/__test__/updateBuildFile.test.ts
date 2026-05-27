import { describe, it, expect, vi } from 'vitest';
import {
  addFileToBuildPath,
  addFolderToBuildPath,
  addLibToPublishPath,
  addNewFileInCSharpProject,
  addNugetPackagesToBuildFile,
  addNugetPackagesToBuildFileByName,
  allowLocalSettingsToPublishDirectory,
  getDotnetBuildFile,
  getXMLString,
  suppressJavaScriptBuildWarnings,
  updateFunctionsSDKVersion,
  writeBuildFileToDisk,
} from '../updateBuildFile';
import { DotnetVersion, localSettingsFileName } from '../../../../constants';
import path from 'path';
import * as fs from 'fs';
import { getProjFiles } from '../../dotnet/dotnet';

vi.mock('../../dotnet/dotnet', () => ({
  getProjFiles: vi.fn(),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('utils/codeless/updateBuildFile', () => {
  describe('addNugetPackagesToBuildFile', () => {
    it('Should add a new package reference to the XML build file', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [
            {
              PackageReference: {
                $: {
                  Include: 'SomePackage',
                  Version: '1.0.0',
                },
              },
            },
          ],
        },
      };

      const updatedXmlBuildFile = addNugetPackagesToBuildFile(xmlBuildFile);

      expect(updatedXmlBuildFile.Project.ItemGroup.length).toEqual(2);
      expect(updatedXmlBuildFile.Project.ItemGroup[1].PackageReference.$).toMatchObject({
        Include: 'Microsoft.Azure.Workflows.WebJobs.Extension',
        Version: '1.2.*',
      });
    });

    it('Should not add a new package reference if it already exists in the XML build file', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [
            {
              PackageReference: {
                $: {
                  Include: 'Microsoft.Azure.Workflows.WebJobs.Extension',
                  Version: '1.2.*',
                },
              },
            },
          ],
        },
      };

      const updatedXmlBuildFile = addNugetPackagesToBuildFile(xmlBuildFile);

      expect(updatedXmlBuildFile.Project.ItemGroup.length).toEqual(1);
    });
  });

  describe('suppressJavaScriptBuildWarnings', () => {
    it('Should return a stateless workflow definition with the custom code template', () => {
      const xmlBuildFile = {
        Project: {
          PropertyGroup: {},
        },
      };
      const updatedXmlBuildFile = suppressJavaScriptBuildWarnings(xmlBuildFile);
      expect(updatedXmlBuildFile.Project.PropertyGroup).toHaveProperty('MSBuildWarningsAsMessages');
      expect(updatedXmlBuildFile.Project.PropertyGroup.MSBuildWarningsAsMessages).toStrictEqual('MSB3246;$(MSBuildWarningsAsMessages)');
    });
  });

  describe('updateFunctionsSDKVersion', () => {
    it('Should update the package version to 4.5.0 for .NET 8', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [
            {
              PackageReference: {
                $: {
                  Include: 'Microsoft.NET.Sdk.Functions',
                  Version: '4.1.3',
                },
              },
            },
          ],
        },
      };

      const updatedXmlBuildFile = updateFunctionsSDKVersion(xmlBuildFile, DotnetVersion.net8);

      expect(updatedXmlBuildFile.Project.ItemGroup[0].PackageReference.$).toMatchObject({
        Include: 'Microsoft.NET.Sdk.Functions',
        Version: '4.5.0',
      });
    });

    it('Should update the package version to 4.1.3 for .NET 6', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [
            {
              PackageReference: {
                $: {
                  Include: 'Microsoft.NET.Sdk.Functions',
                  Version: '3.0.13',
                },
              },
            },
          ],
        },
      };

      const updatedXmlBuildFile = updateFunctionsSDKVersion(xmlBuildFile, DotnetVersion.net6);

      expect(updatedXmlBuildFile.Project.ItemGroup[0].PackageReference.$).toMatchObject({
        Include: 'Microsoft.NET.Sdk.Functions',
        Version: '4.1.3',
      });
    });

    it('Should update the package version to 3.0.13 for .NET 3', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [
            {
              PackageReference: {
                $: {
                  Include: 'Microsoft.NET.Sdk.Functions',
                  Version: '4.1.3',
                },
              },
            },
          ],
        },
      };

      const updatedXmlBuildFile = updateFunctionsSDKVersion(xmlBuildFile, DotnetVersion.net3);

      expect(updatedXmlBuildFile.Project.ItemGroup[0].PackageReference.$).toMatchObject({
        Include: 'Microsoft.NET.Sdk.Functions',
        Version: '3.0.13',
      });
    });
  });

  describe('addNugetPackagesToBuildFileByName', () => {
    it('Should add a named package reference when absent', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [],
        },
      };

      const updatedXmlBuildFile = addNugetPackagesToBuildFileByName(xmlBuildFile, 'Contoso.Package', '1.2.3');

      expect(updatedXmlBuildFile.Project.ItemGroup[0].PackageReference.$).toEqual({
        Include: 'Contoso.Package',
        Version: '1.2.3',
      });
    });

    it('Should not duplicate an existing named package reference', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [
            {
              PackageReference: {
                $: {
                  Include: 'Contoso.Package',
                  Version: '1.2.3',
                },
              },
            },
          ],
        },
      };

      const updatedXmlBuildFile = addNugetPackagesToBuildFileByName(xmlBuildFile, 'Contoso.Package', '1.2.3');

      expect(updatedXmlBuildFile.Project.ItemGroup).toHaveLength(1);
    });
  });

  describe('addFolderToBuildPath', () => {
    it('Should add folder to build path', () => {
      const folderName = 'Stateful1';
      const xmlBuildFile = {
        Project: {
          ItemGroup: [],
        },
      };
      const updatedXmlBuildFile = addFolderToBuildPath(xmlBuildFile, folderName);
      expect(updatedXmlBuildFile.Project.ItemGroup.length).toEqual(1);
      expect(updatedXmlBuildFile.Project.ItemGroup[0]).toEqual({
        None: {
          $: {
            Update: `${folderName}${path.sep}**${path.sep}*.*`,
          },
          CopyToOutputDirectory: 'PreserveNewest',
        },
      });
    });
  });

  describe('addLibToPublishPath', () => {
    it('Should add lib directory to publish path', () => {
      const xmlBuildFile = {
        Project: {
          ItemGroup: [],
        },
      };
      const updatedXmlBuildFile = addLibToPublishPath(xmlBuildFile);
      expect(updatedXmlBuildFile.Project).toHaveProperty('Target');
      expect(updatedXmlBuildFile.Project.Target).toHaveProperty('$');
      expect(updatedXmlBuildFile.Project.Target.$).toHaveProperty('Name', 'CopyDynamicLibraries');
      expect(updatedXmlBuildFile.Project.Target.$).toHaveProperty('AfterTargets', '_GenerateFunctionsExtensionsMetadataPostPublish');
      expect(updatedXmlBuildFile.Project.Target).toHaveProperty('Copy');
      expect(updatedXmlBuildFile.Project.Target.Copy).toHaveProperty('$');
      expect(updatedXmlBuildFile.Project.Target.Copy.$).toHaveProperty('SourceFiles', '@(LibDirectory)');
      expect(updatedXmlBuildFile.Project.Target.Copy.$).toHaveProperty(
        'DestinationFiles',
        `@(LibDirectory->'$(MSBuildProjectDirectory)${path.sep}$(PublishUrl)${path.sep}lib${path.sep}%(RecursiveDir)%(Filename)%(Extension)')`
      );
      expect(updatedXmlBuildFile.Project).toHaveProperty('ItemGroup');
      expect(updatedXmlBuildFile.Project.ItemGroup.length).toEqual(1);
      expect(updatedXmlBuildFile.Project.ItemGroup[0]).toHaveProperty('LibDirectory');
      expect(updatedXmlBuildFile.Project.ItemGroup[0].LibDirectory).toHaveProperty('$');
      expect(updatedXmlBuildFile.Project.ItemGroup[0].LibDirectory.$).toHaveProperty(
        'Include',
        `$(MSBuildProjectDirectory)${path.sep}lib${path.sep}**${path.sep}*`
      );
    });
  });

  describe('addFileToBuildPath', () => {
    it('Should add file to build path', () => {
      const fileName = 'file.txt';
      const xmlBuildFile = {
        Project: {
          ItemGroup: [],
        },
      };
      const updatedXmlBuildFile = addFileToBuildPath(xmlBuildFile, fileName);
      expect(updatedXmlBuildFile.Project.ItemGroup.length).toEqual(1);
      expect(updatedXmlBuildFile.Project.ItemGroup[0]).toEqual({
        None: {
          $: {
            Update: fileName,
          },
          CopyToOutputDirectory: 'PreserveNewest',
        },
      });
    });
  });

  describe('allowLocalSettingsToPublishDirectory', () => {
    const context: any = {
      telemetry: {
        properties: {},
      },
    };

    const xmlBuildFile = {
      Project: {
        ItemGroup: [
          {
            None: [
              {
                $: {
                  Update: localSettingsFileName,
                },
                CopyToOutputDirectory: 'PreserveNewest',
                CopyToPublishDirectory: 'PreserveNewest',
              },
            ],
          },
        ],
      },
    };

    it('Should remove CopyToPublishDirectory property for local settings file', () => {
      const updatedXmlBuildFile = allowLocalSettingsToPublishDirectory(context, xmlBuildFile);
      expect(updatedXmlBuildFile.Project.ItemGroup[0].None[0]).not.toHaveProperty('CopyToPublishDirectory');
    });

    it('Should set telemetry property allowSettingsToPublish to true', () => {
      allowLocalSettingsToPublishDirectory(context, xmlBuildFile);
      expect(context.telemetry.properties.allowSettingsToPublish).toBe('true');
    });

    it('Should set telemetry property allowSettingsToPublish to false if an error occurs', () => {
      const xmlBuildFile = {
        Project: {},
      };

      allowLocalSettingsToPublishDirectory(context, xmlBuildFile);
      expect(context.telemetry.properties.allowSettingsToPublish).toBe('false');
    });
  });

  describe('getXMLString', () => {
    it('Should parse XML into an object', async () => {
      await expect(getXMLString('<Project><PropertyGroup /></Project>', { explicitArray: false })).resolves.toEqual({
        Project: {
          PropertyGroup: '',
        },
      });
    });

    it('Should resolve undefined for invalid XML', async () => {
      await expect(getXMLString('<Project>', { explicitArray: false })).resolves.toBeUndefined();
    });
  });

  describe('build file disk helpers', () => {
    const context: any = {
      telemetry: {
        properties: {},
      },
    };

    it('Should read and parse the single project file', async () => {
      vi.mocked(getProjFiles).mockResolvedValue([{ name: 'Functions.csproj' }] as any);
      vi.mocked(fs.readFileSync).mockReturnValue('<Project><ItemGroup /></Project>' as any);

      await expect(getDotnetBuildFile(context, 'C:\\project')).resolves.toBe(JSON.stringify({ Project: { ItemGroup: '' } }));
    });

    it('Should write the updated build file to disk', async () => {
      vi.mocked(getProjFiles).mockResolvedValue([{ name: 'Functions.csproj' }] as any);

      await writeBuildFileToDisk(context, { Project: { ItemGroup: [] } }, 'C:\\project');

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('Functions.csproj'), expect.stringContaining('<Project'));
    });

    it('Should add a new file path to the project build file', async () => {
      vi.mocked(getProjFiles).mockResolvedValue([{ name: 'Functions.csproj' }] as any);
      vi.mocked(fs.readFileSync).mockReturnValue('<Project><ItemGroup></ItemGroup><ItemGroup></ItemGroup></Project>' as any);

      await addNewFileInCSharpProject(context, 'custom\\function.json', 'C:\\project');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('Functions.csproj'),
        expect.stringContaining('custom\\function.json')
      );
    });

    it('Should throw when no project file can be found', async () => {
      vi.mocked(getProjFiles).mockResolvedValue([]);

      await expect(getDotnetBuildFile(context, 'C:\\project')).rejects.toThrow('Dotnet project file could not be found');
      await expect(writeBuildFileToDisk(context, { Project: {} }, 'C:\\project')).rejects.toThrow('Dotnet project file could not be found');
    });
  });
});
