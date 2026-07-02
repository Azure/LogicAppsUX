/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, expect, it } from 'vitest';
import { getFuncHostTaskEnv } from '../funcHostTaskEnv';

describe('getFuncHostTaskEnv', () => {
  describe('base options.env', () => {
    it('sets PATH to the VS Code inherited-PATH variable so non-platform-keyed fallback still works', () => {
      const result = getFuncHostTaskEnv();
      expect(result.options.env.PATH).toBe('${env:PATH}');
    });

    it('omits cwd when no extras are passed', () => {
      const result = getFuncHostTaskEnv();
      expect(result.options.cwd).toBeUndefined();
    });

    it('forwards cwd from extras into the base options block', () => {
      const result = getFuncHostTaskEnv({ cwd: '/abs/path/to/logic-app' });
      expect(result.options.cwd).toBe('/abs/path/to/logic-app');
    });

    it('propagates cwd into platform-specific blocks so OS-specific options preserve the working directory', () => {
      const result = getFuncHostTaskEnv({ cwd: '/abs/path' });
      expect(result.windows.options.cwd).toBe('/abs/path');
      expect(result.linux.options.cwd).toBe('/abs/path');
      expect(result.osx.options.cwd).toBe('/abs/path');
    });
  });

  describe('Windows PATH', () => {
    it('uses semicolon separators and backslash path segments', () => {
      const path = getFuncHostTaskEnv().windows.options.env.PATH;
      expect(path).toContain('\\NodeJs');
      expect(path).toContain('\\DotNetSDK');
      expect(path).toContain(';');
      expect(path).not.toMatch(/\/NodeJs/);
    });

    it('references the autoRuntimeDependenciesPath config variable before each subdir', () => {
      const path = getFuncHostTaskEnv().windows.options.env.PATH;
      const occurrences = path.match(/\$\{config:azureLogicAppsStandard\.autoRuntimeDependenciesPath\}/g) ?? [];
      expect(occurrences.length).toBe(2);
    });

    it('appends ${env:PATH} (not PowerShell $env:PATH) so VS Code expands it', () => {
      const path = getFuncHostTaskEnv().windows.options.env.PATH;
      expect(path).toContain('${env:PATH}');
      expect(path).not.toMatch(/(?<!\$\{)\$env:PATH/);
    });
  });

  describe('Linux PATH', () => {
    it('uses colon separators and forward-slash path segments', () => {
      const path = getFuncHostTaskEnv().linux.options.env.PATH;
      expect(path).toContain('/NodeJs');
      expect(path).toContain('/DotNetSDK');
      expect(path).toContain(':');
      expect(path).not.toMatch(/\\NodeJs/);
      expect(path).not.toMatch(/NodeJs;/);
    });

    it('puts NodeJs before DotNetSDK before the inherited PATH', () => {
      const path = getFuncHostTaskEnv().linux.options.env.PATH;
      const nodeIdx = path.indexOf('/NodeJs');
      const dotnetIdx = path.indexOf('/DotNetSDK');
      const inheritedIdx = path.indexOf('${env:PATH}');
      expect(nodeIdx).toBeGreaterThanOrEqual(0);
      expect(dotnetIdx).toBeGreaterThan(nodeIdx);
      expect(inheritedIdx).toBeGreaterThan(dotnetIdx);
    });
  });

  describe('macOS (osx) PATH', () => {
    it('matches the Linux POSIX form exactly (same separators, same shape)', () => {
      const result = getFuncHostTaskEnv();
      expect(result.osx.options.env.PATH).toBe(result.linux.options.env.PATH);
    });
  });

  describe('cross-platform contract', () => {
    it('always returns all four blocks regardless of extras', () => {
      const withExtras = getFuncHostTaskEnv({ cwd: '/some/dir' });
      expect(withExtras).toHaveProperty('options');
      expect(withExtras).toHaveProperty('windows');
      expect(withExtras).toHaveProperty('linux');
      expect(withExtras).toHaveProperty('osx');
      const withoutExtras = getFuncHostTaskEnv();
      expect(withoutExtras).toHaveProperty('options');
      expect(withoutExtras).toHaveProperty('windows');
      expect(withoutExtras).toHaveProperty('linux');
      expect(withoutExtras).toHaveProperty('osx');
    });

    it('does not mutate the result on subsequent calls (returns fresh objects)', () => {
      const a = getFuncHostTaskEnv();
      const b = getFuncHostTaskEnv();
      expect(a).not.toBe(b);
      expect(a.options).not.toBe(b.options);
      expect(a.windows.options).not.toBe(b.windows.options);
    });
  });
});
