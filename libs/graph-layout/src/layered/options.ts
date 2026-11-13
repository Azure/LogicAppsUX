import { getOption, GraphLayoutError } from '../options';
import type { LayoutOptions } from '../types';

export interface LayeredOptions {
  placement: 'SIMPLE' | 'BRANDES_KOEPF';
  forceModelOrder: boolean;
  nodeSpacing: number;
  /** nodeNodeBetweenLayers: the gap between ranks without bent hops. */
  layerSpacing: number;
  edgeNodeLayerSpacing: number;
  edgeEdgeLayerSpacing: number;
  edgeNodeSpacing: number;
  edgeSpacing: number;
  portSpacing: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export const readOption = (sources: (LayoutOptions | undefined)[], key: string): string | undefined =>
  sources.map((source) => getOption(source, [`elk.${key}`, `org.eclipse.elk.${key}`, key])).find((value) => value !== undefined);

const numberOption = (sources: (LayoutOptions | undefined)[], key: string, fallback: number): number => {
  const raw = readOption(sources, key);
  const value = raw === undefined ? fallback : Number(raw);
  if (raw?.trim() === '' || !Number.isFinite(value) || value < 0) {
    throw new GraphLayoutError(`${key} must be a finite non-negative number.`);
  }
  return value;
};

export const sizeOption = (raw: string | undefined, key: string): [number, number] => {
  if (raw === undefined) {
    return [0, 0];
  }
  const match = /^\(\s*([+-]?[\d.eE]+)\s*,\s*([+-]?[\d.eE]+)\s*\)$/.exec(raw);
  if (!match) {
    throw new GraphLayoutError(`Invalid ${key}: '${raw}'.`);
  }
  const values: [number, number] = [Number(match[1]), Number(match[2])];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new GraphLayoutError(`${key} must contain finite non-negative coordinates.`);
  }
  return values;
};

export const layeredOptions = (sources: (LayoutOptions | undefined)[]): LayeredOptions => {
  const algorithm = readOption(sources, 'algorithm');
  if (algorithm !== undefined && !['layered', 'elk.layered', 'org.eclipse.elk.layered'].includes(algorithm)) {
    throw new GraphLayoutError(`Unsupported nested algorithm '${algorithm}'.`);
  }
  const placement = readOption(sources, 'layered.nodePlacement.strategy');
  if (placement !== undefined && placement !== 'SIMPLE' && placement !== 'BRANDES_KOEPF') {
    throw new GraphLayoutError(`Unsupported layered node placement '${placement}'.`);
  }
  for (const [key, accepted] of [
    ['direction', ['DOWN']],
    ['alignment', ['TOP']],
    ['hierarchyHandling', ['INCLUDE_CHILDREN']],
    ['layered.layering.strategy', ['INTERACTIVE']],
    ['layered.cycleBreaking.strategy', ['DEPTH_FIRST']],
    ['layered.considerModelOrder.strategy', ['NODES_AND_EDGES']],
    ['edge.type', ['DIRECTED']],
    ['edgeRouting', ['SPLINES']],
    ['layered.edgeRouting.splines.mode', ['CONSERVATIVE_SOFT']],
    ['layered.unnecessaryBendpoints', ['false']],
    ['layered.crossingMinimization.forceNodeModelOrder', ['true', 'false']],
    ['layered.nodePlacement.bk.fixedAlignment', ['BALANCED']],
    ['portAlignment.default', ['CENTER']],
    ['nodeSize.constraints', ['MINIMUM_SIZE']],
    ['portConstraints', ['FIXED_POS']],
  ] as const) {
    const value = readOption(sources, key);
    if (value !== undefined && !accepted.some((candidate) => candidate === value)) {
      throw new GraphLayoutError(`Unsupported ${key}: '${value}'.`);
    }
  }
  const padding = { top: 12, right: 12, bottom: 12, left: 12 };
  const rawPadding = readOption(sources, 'padding');
  if (rawPadding !== undefined) {
    const match = /^\[\s*top=([\d.eE]+)\s*,\s*left=([\d.eE]+)\s*,\s*bottom=([\d.eE]+)\s*,\s*right=([\d.eE]+)\s*\]$/.exec(rawPadding);
    if (!match) {
      throw new GraphLayoutError(`Invalid elk.padding: '${rawPadding}'.`);
    }
    padding.top = Number(match[1]);
    padding.left = Number(match[2]);
    padding.bottom = Number(match[3]);
    padding.right = Number(match[4]);
    if (Object.values(padding).some((value) => !Number.isFinite(value) || value < 0)) {
      throw new GraphLayoutError('Padding must be finite and non-negative.');
    }
  }
  const position = sizeOption(readOption(sources, 'position'), 'position');
  if (position.some((coordinate) => coordinate !== 0)) {
    throw new GraphLayoutError('Nonzero elk.position hints are not supported by layered layout.');
  }
  sizeOption(readOption(sources, 'nodeSize.minimum'), 'nodeSize.minimum');
  return {
    placement: placement ?? 'BRANDES_KOEPF',
    forceModelOrder: readOption(sources, 'layered.crossingMinimization.forceNodeModelOrder') === 'true',
    nodeSpacing: numberOption(sources, 'spacing.nodeNode', 20),
    layerSpacing: numberOption(sources, 'layered.spacing.nodeNodeBetweenLayers', 80),
    edgeNodeLayerSpacing: numberOption(sources, 'layered.spacing.edgeNodeBetweenLayers', 10),
    edgeEdgeLayerSpacing: numberOption(sources, 'layered.spacing.edgeEdgeBetweenLayers', 10),
    edgeNodeSpacing: numberOption(sources, 'spacing.edgeNode', 40),
    edgeSpacing: numberOption(sources, 'spacing.edgeEdge', 40),
    portSpacing: numberOption(sources, 'spacing.portPort', 40),
    padding,
  };
};
