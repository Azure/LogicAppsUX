import { bench, describe } from 'vitest';
import ELK from '../src/index';
import { createCandidateEngine, createElkjsEngine, isImplemented, runFixture } from './engines.ts';
import { createOverlapFixture, graphStats, loadWorkflowFixtures } from './fixtures.ts';

const benchmarked = [
  ...loadWorkflowFixtures((name) => /^(Scoped|MoreComplex|AllScopeNodes|StressTest(50|200|500|1000))(\.shared)?$/.test(name)),
  createOverlapFixture(50),
];
const elkjs = createElkjsEngine();
const candidate = createCandidateEngine(ELK);

for (const fixture of benchmarked) {
  const { nodes, edges } = graphStats(fixture.graph);
  describe(`${fixture.name} (${nodes} nodes, ${edges} edges)`, async () => {
    bench(elkjs.name, () => runFixture(elkjs, fixture).then(() => undefined));
    if (await isImplemented(candidate, fixture)) {
      bench(candidate.name, () => runFixture(candidate, fixture).then(() => undefined));
    }
  });
}
