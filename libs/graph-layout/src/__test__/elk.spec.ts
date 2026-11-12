import { describe, expect, it } from 'vitest';
import ELK, { GraphLayoutError, resolveAlgorithm } from '../index';

describe('resolveAlgorithm', () => {
  it.each([
    [undefined, 'layered'],
    [{ 'elk.algorithm': 'org.eclipse.elk.layered' }, 'layered'],
    [{ 'elk.algorithm': 'layered' }, 'layered'],
    [{ 'org.eclipse.elk.algorithm': 'elk.layered' }, 'layered'],
    [{ 'elk.algorithm': 'sporeOverlap' }, 'sporeOverlap'],
    [{ algorithm: 'org.eclipse.elk.sporeOverlap' }, 'sporeOverlap'],
  ])('resolves %j to %s', (options, expected) => {
    expect(resolveAlgorithm(options)).toBe(expected);
  });

  it('rejects algorithms outside the supported subset', () => {
    expect(() => resolveAlgorithm({ 'elk.algorithm': 'org.eclipse.elk.force' })).toThrow(GraphLayoutError);
  });
});

describe('ELK', () => {
  it('lets graph options override call and constructor defaults when resolving the algorithm', async () => {
    const elk = new ELK({ defaultLayoutOptions: { 'elk.algorithm': 'force' } });
    await expect(elk.layout({ id: 'root', layoutOptions: { 'elk.algorithm': 'sporeOverlap' } })).rejects.toThrow(/sporeOverlap/);
    await expect(elk.layout({ id: 'root' }, { layoutOptions: { 'elk.algorithm': 'layered' } })).rejects.toThrow(/layered/);
    await expect(elk.layout({ id: 'root' })).rejects.toThrow(/Unsupported/);
  });
});
