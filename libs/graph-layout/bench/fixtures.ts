import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ElkNode, LayoutOptions } from '../src/types';

export interface LayoutFixture {
  name: string;
  source: string;
  layoutOptions: LayoutOptions;
  graph: ElkNode;
  /**
   * How to judge a candidate against elkjs. `geometry` (default) compares positions; `noOverlap` only requires every
   * node to be present without overlaps, because elkjs sporeOverlap is nondeterministic even with `elk.randomSeed`.
   */
  parity?: 'geometry' | 'noOverlap';
}

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const countNodes = (node: ElkNode): number => (node.children ?? []).reduce((sum, child) => sum + 1 + countNodes(child), 0);
const countEdges = (node: ElkNode): number =>
  (node.edges?.length ?? 0) + (node.children ?? []).reduce((sum, child) => sum + countEdges(child), 0);
export const graphStats = (graph: ElkNode) => ({ nodes: countNodes(graph), edges: countEdges(graph) });

/** Designer ELK inputs captured from __mocks__/workflows (see designer-v2 captureLayoutFixtures.spec.ts). */
export const loadWorkflowFixtures = (filter: (name: string) => boolean = () => true): LayoutFixture[] =>
  readdirSync(fixturesDir)
    .filter((file) => file.endsWith('.json') && filter(file.replace(/\.json$/, '')))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(fixturesDir, file), 'utf8')) as LayoutFixture);

export const reportFixtureFilter = (args: string[]): RegExp => {
  const pattern = args.find((arg) => !arg.startsWith('--'));
  return pattern ? new RegExp(pattern) : /^(?!.*\.shared$)/;
};

/** Deterministic PRNG so synthetic fixtures are stable across runs. */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Data mapper v2 auto-layout input: unpositioned function nodes (only measured sizes), spread by sporeOverlap. */
export const createOverlapFixture = (count: number, seed = 1): LayoutFixture => {
  const random = mulberry32(seed);
  return {
    name: `dataMapperOverlap${count}`,
    source: 'synthetic (libs/data-mapper-v2/src/ui/hooks/useAutoLayout.ts)',
    parity: 'noOverlap',
    layoutOptions: {},
    graph: {
      id: 'elk-root',
      layoutOptions: { 'elk.algorithm': 'sporeOverlap', 'elk.direction': 'LEFT', 'elk.spacing.nodeNode': '80' },
      children: Array.from({ length: count }, (_, index) => ({
        id: `fn${index}`,
        width: 120 + Math.round(random() * 80),
        height: 40,
      })),
    },
  };
};
