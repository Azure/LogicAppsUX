/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect } from 'vitest';
import { generateLaunchJson } from '../launchGenerator';
import type { VSCodeProjectConfig } from '../types';
import { FuncVersion, ProjectType, ProjectPackageType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';

describe('generateLaunchJson', () => {
  describe('codeless project', () => {
    it('should generate attach configuration for codeless projects', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.logicApp,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
        logicAppName: 'MyApp',
        funcVersion: FuncVersion.v4,
      };
      const result = generateLaunchJson(config);

      expect(result.version).toBe('0.2.0');
      expect(result.configurations).toHaveLength(1);
      expect(result.configurations[0].type).toBe('coreclr');
      expect(result.configurations[0].request).toBe('attach');
      expect(result.configurations[0].name).toContain('MyApp');
    });
  });

  describe('codeful project', () => {
    it('should generate logicapp launch configuration', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.codeful,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        logicAppName: 'CodefulApp',
        funcVersion: FuncVersion.v4,
      };
      const result = generateLaunchJson(config);

      expect(result.configurations[0].type).toBe('logicapp');
      expect(result.configurations[0].request).toBe('launch');
      expect(result.configurations[0].funcRuntime).toBe('coreclr');
      expect(result.configurations[0].isCodeless).toBe(false);
    });
  });

  describe('custom code project', () => {
    it('should generate logicapp launch configuration with customCodeRuntime', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.customCode,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
        logicAppName: 'CustomCodeApp',
        funcVersion: FuncVersion.v4,
        customCodeTargetFramework: TargetFramework.Net8,
      };
      const result = generateLaunchJson(config);

      expect(result.configurations[0].type).toBe('logicapp');
      expect(result.configurations[0].request).toBe('launch');
      expect(result.configurations[0].customCodeRuntime).toBe('coreclr');
      expect(result.configurations[0].isCodeless).toBe(true);
    });

    it('should use clr runtime for NetFx custom code', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.customCode,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
        logicAppName: 'NetFxApp',
        funcVersion: FuncVersion.v4,
        customCodeTargetFramework: TargetFramework.NetFx,
      };
      const result = generateLaunchJson(config);

      expect(result.configurations[0].customCodeRuntime).toBe('clr');
    });

    it('should use coreclr runtime for Net10 custom code', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.customCode,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
        logicAppName: 'Net10App',
        funcVersion: FuncVersion.v4,
        customCodeTargetFramework: TargetFramework.Net10,
      };
      const result = generateLaunchJson(config);

      expect(result.configurations[0].customCodeRuntime).toBe('coreclr');
    });
  });

  describe('codeful project', () => {
    it('should generate logicapp launch configuration', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.codeful,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        logicAppName: 'CodefulApp',
        funcVersion: FuncVersion.v4,
      };
      const result = generateLaunchJson(config);

      expect(result.configurations[0].type).toBe('logicapp');
      expect(result.configurations[0].request).toBe('launch');
      expect(result.configurations[0].funcRuntime).toBe('coreclr');
      expect(result.configurations[0].isCodeless).toBe(false);
    });

    it('should not include customCodeRuntime for codeful projects', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.codeful,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        logicAppName: 'CodefulApp',
        funcVersion: FuncVersion.v4,
      };
      const result = generateLaunchJson(config);

      expect(result.configurations[0]).not.toHaveProperty('customCodeRuntime');
    });
  });

  describe('FuncVersion handling', () => {
    it('should use clr type for v1 attach config', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.logicApp,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
        logicAppName: 'V1App',
        funcVersion: FuncVersion.v1,
      };
      const result = generateLaunchJson(config);

      expect(result.configurations[0].type).toBe('clr');
    });
  });
});
