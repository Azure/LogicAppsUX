import ElkJs from 'elkjs/lib/elk.bundled.js';
import type { ElkLayoutArguments, ElkNode } from '../src/types';
import type { LayoutFixture } from './fixtures.ts';

export interface LayoutEngine {
  name: string;
  layout(graph: ElkNode, args?: ElkLayoutArguments): Promise<ElkNode>;
}

export type ElkLike = new () => { layout(graph: ElkNode, args?: ElkLayoutArguments): Promise<ElkNode> };

/** Reference engine: the elkjs version the designers ship today. */
export const createElkjsEngine = (): LayoutEngine => {
  const elk = new ElkJs();
  return { name: 'elkjs@0.8.2', layout: (graph, args) => elk.layout(graph as any, args as any) as Promise<ElkNode> };
};

export const createCandidateEngine = (Candidate: ElkLike): LayoutEngine => {
  const elk = new Candidate();
  return { name: '@microsoft/logic-apps-graph-layout', layout: (graph, args) => elk.layout(graph, args) };
};

/** Runs a fixture the way the designers do (deep-cloned input, global options as layout arguments). */
export const runFixture = (engine: LayoutEngine, fixture: LayoutFixture): Promise<ElkNode> =>
  engine.layout(structuredClone(fixture.graph), { layoutOptions: fixture.layoutOptions });
