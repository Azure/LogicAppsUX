import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkManifest, newLegacyFolders, resolveBaseRef } from './check-designer-ui-policy.js';

function manifest() {
  return {
    private: true,
    peerDependencies: { react: '^18.3.1', 'react-dom': '^18.3.1', '@fluentui/react-components': '^9.74.5' },
    dependencies: { '@fluentui/react-icons': '^2.0.315' },
  };
}

test('keeps the local PoC private until publication approval', () => {
  assert.equal(checkManifest({ ...manifest(), private: false }).length, 1);
  const missingPrivate = manifest();
  delete missingPrivate.private;
  assert.equal(checkManifest(missingPrivate).length, 1);
});

test('normalizes only absent or zero event bases, preserving valid or unexpected refs', () => {
  assert.equal(resolveBaseRef(undefined), 'origin/main');
  assert.equal(resolveBaseRef(''), 'origin/main');
  assert.equal(resolveBaseRef('0'.repeat(40)), 'origin/main');
  assert.equal(resolveBaseRef('a'.repeat(40)), 'a'.repeat(40));
  assert.equal(resolveBaseRef('origin/dev/test'), 'origin/dev/test');
  assert.equal(resolveBaseRef('invalid-ref'), 'invalid-ref');
});

test('allows only the agreed runtime dependency and required peers', () => {
  assert.deepEqual(checkManifest(manifest()), []);
  const extraDependency = manifest();
  extraDependency.dependencies['@microsoft/logic-apps-shared'] = 'workspace:*';
  assert.equal(checkManifest(extraDependency).length, 1);
  const extraPeer = manifest();
  extraPeer.peerDependencies['@tanstack/react-query'] = '^4.0.0';
  assert.equal(checkManifest(extraPeer).length, 1);
  const missingPeer = manifest();
  delete missingPeer.peerDependencies.react;
  assert.equal(checkManifest(missingPeer).length, 1);
});

test('rejects optional or bundled backdoors to the runtime dependency policy', () => {
  assert.equal(checkManifest({ ...manifest(), peerDependenciesMeta: { react: { optional: true } } }).length, 1);
  assert.equal(checkManifest({ ...manifest(), optionalDependencies: { zustand: '*' } }).length, 1);
  assert.equal(checkManifest({ ...manifest(), bundledDependencies: ['zustand'] }).length, 1);
  assert.equal(checkManifest({ ...manifest(), bundleDependencies: true }).length, 1);
});

test('freezes new top-level component folders, not fixes or tests in existing folders', () => {
  const base = ['libs/designer-ui/src/lib/card/index.tsx', 'libs/designer-ui/src/lib/picker/index.tsx'];
  assert.deepEqual(
    newLegacyFolders(base, [
      ...base,
      'libs/designer-ui/src/lib/card/__test__/regression.spec.tsx',
      'libs/designer-ui-v2/src/nodes/Card.tsx',
    ]),
    []
  );
  assert.deepEqual(newLegacyFolders(base, [...base, 'libs/designer-ui/src/lib/new-card/index.tsx']), ['new-card']);
});

test('dependency boundaries cover static imports, type imports, re-exports and test folders', async () => {
  const { ESLint } = await import('eslint');
  const eslint = new ESLint();
  for (const filePath of ['libs/designer-ui-v2/src/policy-fixture.ts', 'libs/designer-ui-v2/src/nodes/__test__/policy-fixture.spec.ts']) {
    for (const source of [
      "import { value } from '@microsoft/logic-apps-shared';",
      "import type { Workflow } from '@microsoft/logic-apps-shared';",
      "export { value } from '@coreai/fluentui-react';",
      "import { value } from '@tanstack/react-query';",
      "import { value } from '@xyflow/react';",
      "import { value } from '@/store';",
      "import { value } from '@fluentui/react';",
      "import { value } from 'react-intl';",
      "import { value } from 'zustand';",
    ]) {
      const [result] = await eslint.lintText(source, { filePath });
      assert.ok(
        result.messages.some((message) => message.ruleId === 'no-restricted-imports'),
        `${filePath}: ${source}`
      );
    }
    const [allowed] = await eslint.lintText("export { Button } from '@fluentui/react-components';", { filePath });
    assert.ok(!allowed.messages.some((message) => message.ruleId === 'no-restricted-imports'));
  }
});
