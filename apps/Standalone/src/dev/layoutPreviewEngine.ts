import ELK, { type ElkConstructorArguments, type ElkLayoutArguments, type ElkNode } from '@microsoft/logic-apps-graph-layout';
import ElkJs from 'elkjs/lib/elk.bundled.js';

const status = (message: string, failed = false) => {
  let badge = document.getElementById('experimental-layout-status');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'experimental-layout-status';
    badge.setAttribute('role', 'status');
    badge.style.cssText =
      'position:fixed;left:12px;bottom:12px;z-index:10000;max-width:90vw;padding:10px;background:#161b22;color:#f0f6fc;border:1px solid #d29922;font:12px monospace;';
    document.body.append(badge);
  }
  badge.textContent = message;
  badge.dataset.engine = failed
    ? 'error'
    : new URLSearchParams(window.location.search).get('layoutEngine') === 'elkjs'
      ? 'elkjs'
      : 'typescript';
};

const countNodes = (node: ElkNode): number => (node.children ?? []).reduce((count, child) => count + 1 + countNodes(child), 0);

/** Only selected by the dedicated Vite preview config; normal builds retain their existing elkjs imports. */
export default class LayoutPreviewEngine {
  private readonly candidate: ELK;
  private readonly reference: ElkJs;

  constructor(args: ElkConstructorArguments = {}) {
    this.candidate = new ELK(args);
    this.reference = new ElkJs(args);
  }

  async layout(graph: ElkNode, args: ElkLayoutArguments = {}): Promise<ElkNode> {
    const reference = new URLSearchParams(window.location.search).get('layoutEngine') === 'elkjs';
    const start = performance.now();
    status(reference ? 'Layout preview: elkjs baseline selected' : 'Experimental TypeScript layout: balanced placement; no fallback');
    try {
      const result = reference ? await this.reference.layout(graph, args) : await this.candidate.layout(graph, args);
      status(
        `${reference ? 'elkjs baseline' : 'Experimental TypeScript balanced'}: ${countNodes(result)} nodes, ${(performance.now() - start).toFixed(1)} ms. ${reference ? '' : 'No fallback. Not production-ready.'}`
      );
      return result;
    } catch (error) {
      status(`Layout failed; no fallback: ${error instanceof Error ? error.message : String(error)}`, true);
      throw error;
    }
  }
}
