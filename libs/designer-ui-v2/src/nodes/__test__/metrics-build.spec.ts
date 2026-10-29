// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('built metrics dependency closure', () => {
  it('reaches only numeric data and no React/theme/icon runtime or declarations', () => {
    const entry = new URL('../../../build/lib/metrics.js', import.meta.url);
    const visited = new Set<string>();
    const inspect = (url: URL) => {
      if (visited.has(url.href)) {
        return;
      }
      visited.add(url.href);
      const source = readFileSync(fileURLToPath(url), 'utf8');
      expect(source).not.toMatch(/react|fluentui|DesignerUiScope|makeStyles|createElement/);
      for (const match of source.matchAll(/from\s*["']([^"']+)["']/g)) {
        expect(match[1]).toMatch(/^\.\//);
        inspect(new URL(match[1], url));
      }
    };
    inspect(entry);
    const declaration = readFileSync(new URL('../../../build/lib/nodes/metrics.d.ts', import.meta.url), 'utf8');
    expect(declaration).not.toMatch(/react|fluentui|string|theme/i);
  });
});
