// Speed, size, and parity report. Run with `pnpm bench:report` (builds dist first; Node >= 22.18 strips types).
import { performance } from 'node:perf_hooks';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import ELK from '../dist/index.js';
import { createCandidateEngine, createElkjsEngine, isImplemented, type LayoutEngine, runFixture } from './engines.ts';
import { createOverlapFixture, graphStats, type LayoutFixture, loadWorkflowFixtures } from './fixtures.ts';
import { compareGeometry, extractGeometry, findOverlaps } from './geometry.ts';

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const filter = process.argv[2] ? new RegExp(process.argv[2]) : /^(?!.*\.shared$)/;

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

const bundleSize = async (specifier: string) => {
  const result = await build({
    stdin: { contents: `import ELK from '${specifier}'; globalThis.elk = new ELK();`, resolveDir: packageDir },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].contents;
  return { raw: code.byteLength, gzip: gzipSync(code, { level: 9 }).byteLength, brotli: brotliCompressSync(code).byteLength };
};

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const time = async (engine: LayoutEngine, fixture: LayoutFixture) => {
  const { nodes } = graphStats(fixture.graph);
  const runs = nodes > 500 ? 3 : nodes > 100 ? 7 : 15;
  await runFixture(engine, fixture);
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await runFixture(engine, fixture);
    samples.push(performance.now() - start);
  }
  return median(samples);
};

const elkjs = createElkjsEngine();
const candidate = createCandidateEngine(ELK);

console.log('## Bundle size (esbuild, minified, browser ESM)\n');
console.log('| Engine | Raw | Gzip | Brotli |\n|---|---|---|---|');
for (const [name, specifier] of [
  [elkjs.name, 'elkjs/lib/elk.bundled.js'],
  [candidate.name, './dist/index.js'],
]) {
  const size = await bundleSize(specifier);
  console.log(`| ${name} | ${kb(size.raw)} | ${kb(size.gzip)} | ${kb(size.brotli)} |`);
}

console.log(`\n## Layout time (Node ${process.version}, median ms)\n`);
// elkjs.bundled dispatches through an in-process FakeWorker using setTimeout, so every call pays ~2 timer ticks.
const tickStart = performance.now();
for (let i = 0; i < 10; i++) {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
console.log(`setTimeout(0) latency on this machine: ${((performance.now() - tickStart) / 10).toFixed(1)} ms (elkjs pays ~2 per call)\n`);
console.log('| Fixture | Nodes | Edges | elkjs | candidate | parity |\n|---|---|---|---|---|---|');
for (const fixture of [...loadWorkflowFixtures((name) => filter.test(name)), createOverlapFixture(50)]) {
  const { nodes, edges } = graphStats(fixture.graph);
  const reference = await time(elkjs, fixture);
  let candidateCell = 'n/a';
  let parityCell = 'not implemented';
  if (await isImplemented(candidate, fixture)) {
    candidateCell = (await time(candidate, fixture)).toFixed(1);
    const expected = extractGeometry(await runFixture(elkjs, fixture));
    const actual = extractGeometry(await runFixture(candidate, fixture));
    if (fixture.parity === 'noOverlap') {
      const missing = Object.keys(expected.nodes).filter((id) => !(id in actual.nodes)).length;
      parityCell = `${missing} missing, ${findOverlaps(actual).length} overlaps`;
    } else {
      const diff = compareGeometry(expected, actual);
      parityCell = `${diff.nodeMismatches.length + diff.missingNodes.length} node / ${diff.edgeMismatches.length} edge diffs, max Δ ${diff.maxNodeDelta}`;
    }
  }
  console.log(`| ${fixture.name} | ${nodes} | ${edges} | ${reference.toFixed(1)} | ${candidateCell} | ${parityCell} |`);
}
