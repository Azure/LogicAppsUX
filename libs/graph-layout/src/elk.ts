import type { ElkConstructorArguments, ElkLayoutArguments, ElkNode, LayoutOptions } from './types';
import { getOption, GraphLayoutError } from './options';
import { removeOverlaps } from './spore/overlap';
import { layoutLayered } from './layered/layout';

export const SUPPORTED_ALGORITHMS = ['layered', 'sporeOverlap'] as const;
export type SupportedAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

export { GraphLayoutError } from './options';

const ALGORITHM_KEYS = ['elk.algorithm', 'org.eclipse.elk.algorithm', 'algorithm'];

/** Normalizes elkjs algorithm ids (e.g. `org.eclipse.elk.layered`, `elk.layered`, `layered`). */
export const resolveAlgorithm = (options: LayoutOptions | undefined): SupportedAlgorithm => {
  const raw = getOption(options, ALGORITHM_KEYS) ?? 'layered';
  const id = raw.replace(/^org\.eclipse\.elk\./, '').replace(/^elk\./, '');
  const algorithm = SUPPORTED_ALGORITHMS.find((supported) => supported.toLowerCase() === id.toLowerCase());
  if (!algorithm) {
    throw new GraphLayoutError(`Unsupported layout algorithm '${raw}'. Supported: ${SUPPORTED_ALGORITHMS.join(', ')}.`);
  }
  return algorithm;
};

/** Drop-in replacement for the `elkjs` `ELK` class, limited to the options Logic Apps uses. */
export class ELK {
  private readonly defaultLayoutOptions: LayoutOptions;

  constructor(args: ElkConstructorArguments = {}) {
    this.defaultLayoutOptions = { ...args.defaultLayoutOptions };
  }

  async layout(graph: ElkNode, args: ElkLayoutArguments = {}): Promise<ElkNode> {
    const algorithmOptions = [graph.layoutOptions, args.layoutOptions, this.defaultLayoutOptions]
      .map((source) => getOption(source, ALGORITHM_KEYS))
      .find((value) => value !== undefined);
    const algorithm = resolveAlgorithm(algorithmOptions === undefined ? undefined : { algorithm: algorithmOptions });
    if (algorithm === 'sporeOverlap') {
      return removeOverlaps(graph, [graph.layoutOptions, args.layoutOptions, this.defaultLayoutOptions]);
    }
    return layoutLayered(graph, [args.layoutOptions, this.defaultLayoutOptions]);
  }
}

export default ELK;
