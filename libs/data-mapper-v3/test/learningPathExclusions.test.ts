import { describe, expect, test } from 'vitest';
import { learningPathMaps } from '../e2e/fixtures/learningPath';
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
});
