import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'vitest';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { exportForTesting } from '../elklayout';

// Captures the ELK input graphs designer-v2 builds for the mock workflows, for the
// libs/graph-layout parity/benchmark harness. Run: CAPTURE_LAYOUT_FIXTURES=1 pnpm vitest run captureLayoutFixtures
const repoRoot = resolve(__dirname, '../../../../../../..');
const workflowsDir = join(repoRoot, '__mocks__', 'workflows');
const outputDir = join(repoRoot, 'libs', 'graph-layout', 'bench', 'fixtures');

describe.skipIf(!process.env.CAPTURE_LAYOUT_FIXTURES)('capture graph-layout fixtures', () => {
  it('writes ELK input graphs for every mock workflow', () => {
    mkdirSync(outputDir, { recursive: true });
    for (const file of readdirSync(workflowsDir).filter((name) => name.endsWith('.json'))) {
      const name = file.replace(/\.json$/, '');
      const { definition, kind } = JSON.parse(readFileSync(join(workflowsDir, file), 'utf8'));
      let parsed: ReturnType<typeof Deserialize>;
      try {
        parsed = Deserialize(definition, null, true, kind);
      } catch {
        continue;
      }
      const context = { operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
      for (const shared of [false, true]) {
        const fixture = {
          name: `${name}${shared ? '.shared' : ''}`,
          source: `__mocks__/workflows/${file}`,
          useSharedNodeUi: shared,
          layoutOptions: exportForTesting.defaultLayoutOptions,
          graph: exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph, shared, shared ? context : undefined),
        };
        writeFileSync(join(outputDir, `${fixture.name}.json`), `${JSON.stringify(fixture)}\n`);
      }
    }
  });
});
