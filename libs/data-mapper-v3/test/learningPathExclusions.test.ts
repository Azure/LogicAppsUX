import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { learningPathMaps } from './e2etests/fixtures/learningPath';
import { compareLearningPathPaths, getLearningPathMaps } from './e2etests/fixtures/learningPathCorpus.cjs';
import { getLearningPathExclusion } from './native/learningPathExclusions.cjs';

describe('native Learning Path exclusions', () => {
  test('excludes exactly the 19 reported failures while retaining the other 132 maps', () => {
    const skipped = learningPathMaps
      .map((map, index) => ({ map, id: String(index + 1).padStart(3, '0') }))
      .filter(({ map }) => getLearningPathExclusion(map));
    expect(skipped.map(({ id }) => id)).toEqual([
      '012',
      '023',
      '026',
      '027',
      '028',
      '029',
      '030',
      '032',
      '033',
      '034',
      '035',
      '037',
      '086',
      '088',
      '142',
      '143',
      '144',
      '145',
      '151',
    ]);
    expect(learningPathMaps.filter((map) => !getLearningPathExclusion(map))).toHaveLength(132);
  });

  test('matches full relative paths with either directory separator without excluding unrelated maps of the same name', () => {
    const map = 'How-to-use-Database-Lookup-Functoid\\DatabaseLookup\\MapConstantValues.btm';
    expect(getLearningPathExclusion(map)).toBe('Unregistered custom functoid 10203');
    expect(getLearningPathExclusion(map.replace(/\\/g, '/'))).toBe(getLearningPathExclusion(map));
    expect(getLearningPathExclusion('AnotherProject\\MapConstantValues.btm')).toBeUndefined();
  });

  test.each(['/', '\\'])('preserves corpus order when paths use %s separators', (separator) => {
    const maps = ['Maps/Map1.btm', 'Maps2/Map1.btm'].map((map) => map.replace(/\//g, separator));
    expect(maps.sort(compareLearningPathPaths)).toEqual([`Maps2${separator}Map1.btm`, `Maps${separator}Map1.btm`]);
  });

  test('keeps auxiliary browser samples out of the corpus without dropping nested sample directories', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mapper-corpus-'));
    try {
      for (const relativePath of [
        ['Maps', 'Map.btm'],
        ['Maps', 'samples', 'Nested.btm'],
        ['samples', 'Auxiliary.btm'],
        ['fixtures', 'Helper.btm'],
        ['pages', 'Helper.btm'],
      ]) {
        const filename = path.join(root, ...relativePath);
        mkdirSync(path.dirname(filename), { recursive: true });
        writeFileSync(filename, '');
      }
      expect(getLearningPathMaps(root)).toEqual([path.join('Maps', 'Map.btm'), path.join('Maps', 'samples', 'Nested.btm')]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
