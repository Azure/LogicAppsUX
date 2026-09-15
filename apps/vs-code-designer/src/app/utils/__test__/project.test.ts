import { describe, expect, it } from 'vitest';
import { ProjectPackageType, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { filterLogicAppProjects, type LogicAppProjectMetadata } from '../project';

describe('filterLogicAppProjects', () => {
  const projects: LogicAppProjectMetadata[] = [
    {
      path: '/workspace/Codeless',
      projectType: ProjectType.logicApp,
      packageType: ProjectPackageType.Bundle,
    },
    {
      path: '/workspace/CustomCode',
      projectType: ProjectType.customCode,
      packageType: ProjectPackageType.Bundle,
    },
    {
      path: '/workspace/Codeful',
      projectType: ProjectType.codeful,
      packageType: ProjectPackageType.Bundle,
    },
    {
      path: '/workspace/AlreadyNuget',
      projectType: ProjectType.logicApp,
      packageType: ProjectPackageType.Nuget,
    },
  ];

  it('should exclude configured project and package types', () => {
    const result = filterLogicAppProjects(projects, {
      excludedProjectTypes: [ProjectType.codeful],
      excludedPackageTypes: [ProjectPackageType.Nuget],
    });

    expect(result.map(({ path }) => path)).toEqual(['/workspace/Codeless', '/workspace/CustomCode']);
  });

  it('should return all projects when no exclusions are configured', () => {
    expect(filterLogicAppProjects(projects, {})).toEqual(projects);
  });
});
