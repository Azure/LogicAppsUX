// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  CUSTOM_CODE_DOTNET_TARGETS,
  canonicalizeDotNetBinary,
  deriveCustomCodeDotNetLayout,
  parseCustomCodeDotNetTarget,
  parseCustomCodeDotNetTargets,
} from './customCodeDotNetVersionShared';

describe('Custom-code .NET version shared helpers', () => {
  describe('parseCustomCodeDotNetTarget', () => {
    it('defaults the singular target to net8 and normalizes valid input', () => {
      assert.strictEqual(parseCustomCodeDotNetTarget(undefined), 'net8');
      assert.strictEqual(parseCustomCodeDotNetTarget(' NET10 '), 'net10');
    });

    it('rejects an invalid singular target', () => {
      assert.throws(() => parseCustomCodeDotNetTarget('net9'), /CUSTOMCODE_DOTNET_E2E_VERSION.*net8 \| net10.*net9/);
    });
  });

  describe('parseCustomCodeDotNetTargets', () => {
    it('defaults the plural selection to every accepted target', () => {
      assert.deepStrictEqual(parseCustomCodeDotNetTargets(undefined), [...CUSTOM_CODE_DOTNET_TARGETS]);
    });

    it('normalizes a comma-separated plural selection', () => {
      assert.deepStrictEqual(parseCustomCodeDotNetTargets(' NET10, net8 '), ['net10', 'net8']);
    });

    it('rejects any invalid plural selection', () => {
      assert.throws(() => parseCustomCodeDotNetTargets('net8,net9'), /CUSTOMCODE_DOTNET_E2E_VERSIONS.*net8\|net10.*net8,net9/);
    });
  });

  it('derives stable, target-specific, disjoint layouts', () => {
    const tempDirectory = path.join('test-root', 'tmp');
    const net8 = deriveCustomCodeDotNetLayout('net8', tempDirectory);
    const net10 = deriveCustomCodeDotNetLayout('net10', tempDirectory);

    assert.deepStrictEqual(deriveCustomCodeDotNetLayout('net8', tempDirectory), net8);
    assert.strictEqual(
      net8.workspaceFilePath,
      path.join(tempDirectory, 'la-e2e-test', 'customcode-dotnet-net8-parent', 'ccnet8ws', 'ccnet8ws.code-workspace')
    );
    assert.strictEqual(net8.dotNetVersionLabel, '.NET 8');
    assert.strictEqual(net8.expectedDotNetSetting, 'net8');
    assert.strictEqual(net8.expectedTargetFramework, 'net8');
    assert.strictEqual(net8.localSettingsPath, path.join(net8.appDir, 'local.settings.json'));
    assert.strictEqual(net10.dotNetVersionLabel, '.NET 10');
    assert.strictEqual(net10.expectedDotNetSetting, 'net10.0');
    assert.strictEqual(net10.expectedTargetFramework, 'net10.0');
    assert.strictEqual(net10.localSettingsPath, path.join(net10.appDir, 'local.settings.json'));
    assert.strictEqual(net8.functionProjectPath, path.join(net8.workspaceDir, 'ccnet8folder', 'ccnet8fn.csproj'));
    assert.notStrictEqual(net8.workspaceParentDir, net10.workspaceParentDir);
    assert.notStrictEqual(net8.workspaceName, net10.workspaceName);
    assert.notStrictEqual(net8.appName, net10.appName);
    assert.notStrictEqual(net8.workflowName, net10.workflowName);
    assert.notStrictEqual(net8.customCodeFolderName, net10.customCodeFolderName);
    assert.notStrictEqual(net8.functionName, net10.functionName);
  });

  it('canonicalizes an executable reached through a directory alias', function () {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'la-dotnet-canonical-'));
    const realRoot = path.join(tempRoot, 'real-dotnet-root');
    const aliasRoot = path.join(tempRoot, 'alias-dotnet-root');
    const binaryName = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
    const realBinary = path.join(realRoot, binaryName);
    const aliasBinary = path.join(aliasRoot, binaryName);

    try {
      fs.mkdirSync(realRoot);
      fs.writeFileSync(realBinary, process.platform === 'win32' ? 'test executable' : '#!/bin/sh\nexit 0\n');
      if (process.platform !== 'win32') {
        fs.chmodSync(realBinary, 0o755);
      }

      try {
        fs.symlinkSync(realRoot, aliasRoot, process.platform === 'win32' ? 'junction' : 'dir');
      } catch (error: unknown) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') {
          this.skip();
        }
        throw error;
      }

      const canonicalBinary = canonicalizeDotNetBinary(aliasBinary, 'test alias');
      assert.strictEqual(canonicalBinary, fs.realpathSync(realBinary));
      assert.strictEqual(path.dirname(canonicalBinary), fs.realpathSync(realRoot));
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('reports the source and candidate when canonicalization fails', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'la-dotnet-canonical-error-'));
    const candidate = path.join(tempRoot, 'missing', process.platform === 'win32' ? 'dotnet.exe' : 'dotnet');
    const source = 'CUSTOMCODE_DOTNET_BINARY_PATH';

    try {
      assert.throws(
        () => canonicalizeDotNetBinary(candidate, source),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes('Failed to canonicalize dotnet binary') &&
          error.message.includes(source) &&
          error.message.includes(candidate)
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
