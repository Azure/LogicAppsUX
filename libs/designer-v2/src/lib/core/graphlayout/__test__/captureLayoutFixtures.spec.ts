import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { exportForTesting } from '../elklayout';

// Captures the ELK input graphs designer-v2 builds for the mock workflows, for the
// libs/graph-layout parity/benchmark harness. Run: CAPTURE_LAYOUT_FIXTURES=1 pnpm vitest run captureLayoutFixtures
const repoRoot = resolve(__dirname, '../../../../../../..');
const workflowsDir = join(repoRoot, '__mocks__', 'workflows');
const outputDir = join(repoRoot, 'libs', 'graph-layout', 'bench', 'fixtures');
const workflowNames = ['StressTest200', 'AllScopeNodes', 'Recurrence'];

const createFixture = (name: string, shared: boolean) => {
  const file = `${name}.json`;
  const { definition, kind } = JSON.parse(readFileSync(join(workflowsDir, file), 'utf8'));
  const parsed = Deserialize(definition, null, true, kind);
  const context = { operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
  return {
    name: `${name}${shared ? '.shared' : ''}`,
    source: `__mocks__/workflows/${file}`,
    useSharedNodeUi: shared,
    layoutOptions: exportForTesting.defaultLayoutOptions,
    graph: exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph, shared, shared ? context : undefined),
  };
};

describe.skipIf(!!process.env.CAPTURE_LAYOUT_FIXTURES)('graph-layout fixture selection', () => {
  it.each(workflowNames)('keeps the captured %s inputs current in both UI modes', (name) => {
    for (const shared of [false, true]) {
      const fixture = createFixture(name, shared);
      const captured = JSON.parse(readFileSync(join(outputDir, `${fixture.name}.json`), 'utf8'));
      expect(captured).toEqual(JSON.parse(JSON.stringify(fixture)));
    }
  });
});

describe.skipIf(!process.env.CAPTURE_LAYOUT_FIXTURES)('capture graph-layout fixtures', () => {
  it('writes ELK input graphs for the representative mock workflows', () => {
    mkdirSync(outputDir, { recursive: true });
    for (const name of workflowNames) {
      for (const shared of [false, true]) {
        const fixture = createFixture(name, shared);
        writeFileSync(join(outputDir, `${fixture.name}.json`), `${JSON.stringify(fixture)}\n`);
      }
    }
  });
});
