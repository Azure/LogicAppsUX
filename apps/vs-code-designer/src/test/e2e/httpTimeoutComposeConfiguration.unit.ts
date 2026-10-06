import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { selectHttpTimeoutComposeDesignerV2 } from './httpTimeoutComposeOracle';

export async function testInstalledHttpTimeoutConfigurationSnapshot(): Promise<void> {
  const explicit = process.env.LA_E2E_CLI_VSCODE_CONFIGURATION_BUNDLE;
  const roots = [
    ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, 'Programs/Microsoft VS Code')] : []),
    '/usr/share/code',
    '/usr/share/code-insiders',
    '/Applications/Visual Studio Code.app/Contents',
  ];
  const relative = 'resources/app/out/vs/workbench/api/node/extensionHostProcess.js';
  const candidates = roots.flatMap((root) => {
    if (!fs.existsSync(root)) {
      return [];
    }
    return [path.join(root, relative), ...fs.readdirSync(root).map((child) => path.join(root, child, relative))];
  });
  const bundle = explicit ?? candidates.find((file) => fs.existsSync(file));
  if (!bundle) {
    console.log(
      '[http-timeout-compose-control] Installed VS Code bundle unavailable; snapshot regression still runs, installed-code probe not run.'
    );
    return;
  }
  assert.ok(fs.existsSync(bundle), 'Explicit installed VS Code configuration bundle missing');
  const source = fs.readFileSync(bundle, 'utf8');
  const match = /getConfiguration\([^)]*\)\{[\s\S]{0,500}?_toReadonlyValue\(this\._configuration\.getValue/.exec(source);
  assert.ok(match, 'Installed configuration provider must be found, not the workspace API delegate');
  const ts = require('typescript');
  const syntax = ts.createSourceFile(
    'installed-provider.js',
    `class Provider {${source.slice(match.index, match.index + 12000)}}`,
    ts.ScriptTarget.Latest,
    true
  );
  const method = syntax.statements[0].members.find((member: any) => member.name?.getText(syntax) === 'getConfiguration');
  const text: string = method.getText(syntax);
  const name = (expression: RegExp) => {
    const found = expression.exec(text);
    assert.ok(found, 'Installed configuration helper binding changed; do not silently replace the implementation');
    return found[1];
  };
  const bindings: Record<string, unknown> = {
    [name(/let \w+=(\w+)\(\w+\)\|\|/)]: () => ({}),
    [name(/has\([^)]*\)\{return typeof (\w+)\(/)]: (value: any, section: string) =>
      section.split('.').reduce((current, key) => current?.[key], value),
    [name(/if\((\w+)\(\w+\)\)\{let/)]: (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value),
    [name(/\w+=\w+\|\|(\w+)\(\w+\)/)]: (value: unknown) => structuredClone(value),
    [name(/typeof \w+=="object"&&(\w+)\(/)]: (target: object, value: object) => Object.assign(target, value),
  };
  const installedGetConfiguration = vm.runInNewContext(`({${text}}).getConfiguration`, bindings);
  let version = 1;
  const provider = {
    _configuration: { getValue: () => ({ designerVersion: version }) },
    _extHostWorkspace: { workspace: {} },
    _toReadonlyValue: (value: unknown) => value,
    _validateConfigurationAccess: () => {},
    _proxy: {
      async $updateConfigurationOption(target: number, section: string, value: number) {
        assert.strictEqual(target, 5, 'Actual installed Workspace target conversion');
        assert.strictEqual(section, 'azureLogicAppsStandard.designerVersion');
        version = value;
      },
    },
  };
  const acquire = () => installedGetConfiguration.call(provider, 'azureLogicAppsStandard', undefined, undefined);
  const old = acquire();
  await selectHttpTimeoutComposeDesignerV2(acquire, 2);
  assert.strictEqual(old.get('designerVersion'), 1, 'Actual installed method captures configuration at acquisition');
  assert.strictEqual(acquire().get('designerVersion'), 2);
  console.log(
    '[http-timeout-compose-control] Actual installed VS Code provider snapshot/update/reacquisition probe passed; no Code process launched.'
  );
}
