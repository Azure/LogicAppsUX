// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('built metrics dependency closure', () => {
  it('keeps build-only packed exports separate from source workspace paths', () => {
    const root = new URL('../../../', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.files).toEqual(['build/lib/**/*']);
    expect(Object.keys(manifest.exports).sort()).toEqual(['.', './metrics', './package.json']);
    expect(manifest.exports['.'].import).toBe('./src/index.ts');
    expect(manifest.exports['./metrics'].import).toBe('./src/metrics.ts');
    for (const subpath of ['.', './metrics']) {
      // pnpm packs publishConfig targets, not the workspace's source export targets.
      for (const condition of ['types', 'import', 'default']) {
        const target = manifest.publishConfig.exports[subpath][condition];
        expect(target).toMatch(/^\.\/build\/lib\//);
        expect(existsSync(new URL(target, root))).toBe(true);
      }
    }
    expect(manifest.publishConfig.exports['./package.json']).toBe('./package.json');
    for (const field of ['main', 'module', 'types']) {
      expect(manifest.publishConfig[field]).toMatch(/^build\/lib\//);
      expect(existsSync(new URL(manifest.publishConfig[field], root))).toBe(true);
    }
  });

  it('exports the arrow helper from the built React-free entry', async () => {
    const metrics = await import('../../../build/lib/metrics.js');
    expect(Object.keys(metrics).sort()).toEqual([
      'compactNodeMetrics',
      'getCompactNodeHeight',
      'getNodeLineArrowPath',
      'getSwitchNodeSize',
      'nodeHoverCardTiming',
      'nodeMetrics',
    ]);
    expect(metrics.getNodeLineArrowPath(10, 20, 'left', 2)).toBe('M 12 22 L 10 20 L 12 18');
    expect(metrics.getNodeLineArrowPath(0, 0)).toBe('M -3.18 -3.18 L 0 0 L -3.18 3.18');
    const entryDeclaration = readFileSync(new URL('../../../build/lib/metrics.d.ts', import.meta.url), 'utf8');
    expect(entryDeclaration).toMatch(/export.*getNodeLineArrowPath/);
    expect(entryDeclaration).not.toMatch(/react|fluentui|theme/i);
    const geometryDeclaration = readFileSync(new URL('../../../build/lib/nodes/lineGeometry.d.ts', import.meta.url), 'utf8');
    expect(geometryDeclaration).toContain("'right' | 'down' | 'left' | 'up'");
    expect(geometryDeclaration).toMatch(/direction\?: NodeLineArrowDirection, size\?: number/);
    expect(geometryDeclaration).not.toMatch(/react|fluentui|theme/i);
  });

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
