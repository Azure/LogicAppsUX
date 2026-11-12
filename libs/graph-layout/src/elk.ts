import type { ElkConstructorArguments, ElkLayoutArguments, ElkNode, LayoutOptions } from './types';

export const SUPPORTED_ALGORITHMS = ['layered', 'sporeOverlap'] as const;
export type SupportedAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

export class GraphLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphLayoutError';
  }
}

const ALGORITHM_KEYS = ['elk.algorithm', 'org.eclipse.elk.algorithm', 'algorithm'];

/** Normalizes elkjs algorithm ids (e.g. `org.eclipse.elk.layered`, `elk.layered`, `layered`). */
export const resolveAlgorithm = (options: LayoutOptions | undefined): SupportedAlgorithm => {
  const raw = ALGORITHM_KEYS.map((key) => options?.[key]).find((value) => value !== undefined) ?? 'layered';
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
    const options = { ...this.defaultLayoutOptions, ...args.layoutOptions, ...graph.layoutOptions };
    const algorithm = resolveAlgorithm(options);
    throw new GraphLayoutError(`The '${algorithm}' algorithm is not implemented yet.`);
  }
}

export default ELK;
