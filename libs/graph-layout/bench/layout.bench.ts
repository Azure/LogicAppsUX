import { bench, describe } from 'vitest';
import ELK from '../src/index';
import { createCandidateEngine, createElkjsEngine, runFixture } from './engines.ts';
import { createOverlapFixture, graphStats, loadWorkflowFixtures } from './fixtures.ts';

const benchmarked = [...loadWorkflowFixtures(), createOverlapFixture(50)];
const elkjs = createElkjsEngine();
const candidate = createCandidateEngine(ELK);

for (const fixture of benchmarked) {
  const { nodes, edges } = graphStats(fixture.graph);
  describe(`${fixture.name} (${nodes} nodes, ${edges} edges)`, () => {
    bench(elkjs.name, () => runFixture(elkjs, fixture).then(() => undefined));
    bench(candidate.name, () => runFixture(candidate, fixture).then(() => undefined));
  });
}
