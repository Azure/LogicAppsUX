import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';

describe('scripts/calculate-next-version integration', () => {
  describe('CLI execution', () => {
    it('should execute the TypeScript script via npx tsx', () => {
      // This is an integration test that actually runs the script
      const result = execSync('npx tsx calculate-next-version.ts minor main', {
        cwd: '/Users/travisvu/code/LogicAppsUX/scripts',
        encoding: 'utf8',
        stdio: 'pipe',
      });

      // Should contain expected output format
      expect(result).toContain('Current branch: main');
      expect(result).toContain('Release type: minor');
      expect(result).toContain('New version:');
      expect(result).toContain('Tag name: v');
      expect(result).toContain('::set-output name=new_version::');
      expect(result).toContain('::set-output name=tag_name::');
    });

    it('should handle patch release on hotfix branch', () => {
      const result = execSync('npx tsx calculate-next-version.ts patch hotfix/v5.109', {
        cwd: '/Users/travisvu/code/LogicAppsUX/scripts',
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Current branch: hotfix/v5.109');
      expect(result).toContain('Release type: patch');
      expect(result).toContain('Detected hotfix branch for version 5.109');
    });

    it('should handle major release', () => {
      const result = execSync('npx tsx calculate-next-version.ts major main', {
        cwd: '/Users/travisvu/code/LogicAppsUX/scripts',
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Release type: major');
      expect(result).toContain('New version:');
      expect(result).toMatch(/New version: \d+\.0\.0/);
    });

    it('should use default values when no arguments provided', () => {
      const result = execSync('npx tsx calculate-next-version.ts', {
        cwd: '/Users/travisvu/code/LogicAppsUX/scripts',
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Current branch: main');
      expect(result).toContain('Release type: minor');
    });
  });
});
