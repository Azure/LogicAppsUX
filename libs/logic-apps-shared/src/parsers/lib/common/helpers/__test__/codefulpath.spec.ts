import { describe, expect, it } from 'vitest';
import { normalizeCodefulConnectorPath, parseCodefulConnectorPath } from '../codefulpath';

describe('codeful connector paths', () => {
  it('retains literal text and encoded C# source separately', () => {
    const path = '#{"/current/" + (encodeURIComponent("98058"))}';

    expect(parseCodefulConnectorPath(path)).toEqual([
      { type: 'literal', value: '/current/' },
      { type: 'expression', value: 'encodeURIComponent("98058")' },
    ]);
    expect(normalizeCodefulConnectorPath(path)).toBe('/current/__logic_apps_dynamic_path_segment__');
  });

  it('normalizes multiple segments without exposing slashes inside expressions', () => {
    const path =
      '#{"/datasets/" + (encodeURIComponent(encodeURIComponent("https://example.com"))) + "/tables/" + (encodeURIComponent("a/b")) + "/items"}';

    expect(normalizeCodefulConnectorPath(path)).toBe(
      '/datasets/__logic_apps_dynamic_path_segment__/tables/__logic_apps_dynamic_path_segment__/items'
    );
  });

  it('decodes the composer JSON literals without changing the expression source', () => {
    const literal = '/path/"quoted"\\suffix/\n';
    const expression = 'encodeURIComponent("a\\\\b\\"c")';
    const path = `#{${JSON.stringify(literal)} + (${expression})}`;

    expect(parseCodefulConnectorPath(path)).toEqual([
      { type: 'literal', value: literal },
      { type: 'expression', value: expression },
    ]);
  });

  it.each([
    String.raw`"a) + \"b"`,
    String.raw`@"a) + ""b"`,
    String.raw`')'.ToString()`,
    String.raw`$"{string.Concat(")")}/suffix"`,
    String.raw`$@"{string.Concat(")")}""suffix"`,
    String.raw`@$"{string.Concat(")")}""suffix"`,
    String.raw`"""raw ) + text"""`,
    String.raw`$"""{string.Concat("""hello)""")}tail"""`,
    String.raw`$$"""literal { brace {{string.Concat("""hello)""")}} tail"""`,
    String.raw`DateTime.UtcNow.DayOfWeek switch { DayOfWeek.Monday => "a)", _ => "b+" }`,
    'string.Concat(/* ) + " */ "value")',
    'string.Concat(// ) + "\n"value")',
    'string.Concat(// ) + "\r"value")',
  ])('preserves the opaque argument %s', (argument) => {
    const source = `encodeURIComponent(${argument})`;
    const path = `#{"/current/" + (${source}) + "/suffix"}`;

    expect(parseCodefulConnectorPath(path)).toEqual([
      { type: 'literal', value: '/current/' },
      { type: 'expression', value: source },
      { type: 'literal', value: '/suffix' },
    ]);
  });

  it.each([
    '',
    '/current/98058',
    "/current/@{encodeURIComponent('98058')}",
    '#{GetPath()}',
    '#{"/current/98058"}',
    '#{"/current/" + ("a/b")}',
    '#{"/current/" + ()}',
    '#{"/current/" + (encodeURIComponent())}',
    '#{"/current/" + (encodeURIComponent("a") + "/b")}',
    '#{"/current/" + (encodeURIComponent("a"))',
    '#{"/current/" + (encodeURIComponent("a")) + }',
    '#{"/current/" + (encodeURIComponent(/* unfinished))}',
    '#{"/current/" + (encodeURIComponent("unfinished))}',
    '#{"/current/" + (encodeURIComponent(@"unfinished))}',
    '#{"/current/" + (encodeURIComponent($@"unfinished))}',
    '#{"/current/" + (encodeURIComponent("""unfinished))}',
    '#{"/current/" + (encodeURIComponent($"""{string.Concat("x")}unfinished))}',
    '#{"/current/" + (encodeURIComponent(// unfinished))}',
    String.raw`#{"/invalid\q/" + (encodeURIComponent("a"))}`,
  ])('declines malformed or unsupported paths: %s', (path) => {
    expect(parseCodefulConnectorPath(path)).toBeUndefined();
    expect(normalizeCodefulConnectorPath(path)).toBeUndefined();
  });
});
