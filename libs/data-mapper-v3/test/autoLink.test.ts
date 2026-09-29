import { findUniqueNameMatches } from '../webview/src/components/autoLink';

describe('Auto Link by Name', () => {
  test('matches unique leaf names and skips ambiguous names', () => {
    const source = {
      name: 'Source',
      path: '/Source',
      children: [
        { name: 'Unique', path: '/Source/Unique' },
        { name: 'Repeated', path: '/Source/A/Repeated' },
        { name: 'Repeated', path: '/Source/B/Repeated' },
      ],
    };
    const target = {
      name: 'Target',
      path: '/Target',
      children: [
        { name: 'unique', path: '/Target/Unique' },
        { name: 'Repeated', path: '/Target/Repeated' },
      ],
    };

    const result = findUniqueNameMatches(source, target);

    expect(result.matches).toEqual([
      {
        source: source.children[0],
        target: target.children[0],
      },
    ]);
    expect(result.ambiguousNameCount).toBe(1);
  });

  test('indexes large trees without creating source-target cross products', () => {
    const size = 20_000;
    const source = {
      name: 'Source',
      path: '/Source',
      children: Array.from({ length: size }, (_, index) => ({
        name: `Field${index}`,
        path: `/Source/Field${index}`,
      })),
    };
    const target = {
      name: 'Target',
      path: '/Target',
      children: Array.from({ length: size }, (_, index) => ({
        name: `Field${index}`,
        path: `/Target/Field${index}`,
      })),
    };

    expect(findUniqueNameMatches(source, target).matches).toHaveLength(size);
  });
});
