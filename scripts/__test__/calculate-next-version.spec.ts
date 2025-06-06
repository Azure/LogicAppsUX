import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateNextVersion } from '../calculate-next-version';
import type { ReleaseType } from '../calculate-next-version';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Mock external dependencies
vi.mock('node:child_process');
vi.mock('node:fs');

const mockExecSync = vi.mocked(execSync);
const mockFs = vi.mocked(fs);

describe('scripts/calculate-next-version', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default package.json mock
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '5.110.0' }));
  });

  describe('calculateNextVersion', () => {
    describe('minor releases', () => {
      it('should increment minor version from latest git tag and reset patch to 0', () => {
        mockExecSync.mockReturnValue('v5.110.0\nv5.109.5\nv5.108.2\n');

        const result = calculateNextVersion('minor', 'main');

        expect(mockExecSync).toHaveBeenCalledWith('git tag -l "v*"', { encoding: 'utf8' });
        expect(result).toEqual({
          newVersion: '5.111.0',
          tagName: 'v5.111.0',
        });
      });

      it('should work with different starting versions from git tags', () => {
        mockExecSync.mockReturnValue('v2.5.3\nv2.4.0\nv2.3.1\n');

        const result = calculateNextVersion('minor', 'main');

        expect(result).toEqual({
          newVersion: '2.6.0',
          tagName: 'v2.6.0',
        });
      });

      it('should fall back to package.json when no git tags exist', () => {
        mockExecSync.mockReturnValue('');
        mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

        const result = calculateNextVersion('minor', 'main');

        expect(result).toEqual({
          newVersion: '1.1.0',
          tagName: 'v1.1.0',
        });
      });

      it('should filter out malformed tags and use only valid semantic versions', () => {
        mockExecSync.mockReturnValue('v5.110.0\nv.262.1\nv50.2.12\ninvalid-tag\n');

        const result = calculateNextVersion('minor', 'main');

        expect(result).toEqual({
          newVersion: '50.3.0',
          tagName: 'v50.3.0',
        });
      });
    });

    describe('major releases', () => {
      it('should increment major version from latest git tag and reset minor and patch to 0', () => {
        mockExecSync.mockReturnValue('v5.110.0\nv5.109.5\nv5.108.2\n');

        const result = calculateNextVersion('major', 'main');

        expect(mockExecSync).toHaveBeenCalledWith('git tag -l "v*"', { encoding: 'utf8' });
        expect(result).toEqual({
          newVersion: '6.0.0',
          tagName: 'v6.0.0',
        });
      });

      it('should work with different starting versions from git tags', () => {
        mockExecSync.mockReturnValue('v1.15.7\nv1.14.0\nv1.13.1\n');

        const result = calculateNextVersion('major', 'main');

        expect(result).toEqual({
          newVersion: '2.0.0',
          tagName: 'v2.0.0',
        });
      });

      it('should fall back to package.json when no git tags exist', () => {
        mockExecSync.mockReturnValue('');
        mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '3.2.1' }));

        const result = calculateNextVersion('major', 'main');

        expect(result).toEqual({
          newVersion: '4.0.0',
          tagName: 'v4.0.0',
        });
      });

      it('should handle git command errors gracefully by falling back to package.json', () => {
        mockExecSync.mockImplementation(() => {
          throw new Error('Git command failed');
        });
        mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '2.5.3' }));

        const result = calculateNextVersion('major', 'main');

        expect(result).toEqual({
          newVersion: '3.0.0',
          tagName: 'v3.0.0',
        });
      });
    });

    describe('patch releases', () => {
      describe('on non-hotfix branches', () => {
        it('should use latest git tag major.minor and find next patch from git tags', () => {
          mockExecSync
            .mockReturnValueOnce('v5.110.0\nv5.109.5\nv5.108.2\n') // First call for getLatestVersionFromTags
            .mockReturnValueOnce('v5.110.0\nv5.110.1\nv5.110.2\n'); // Second call for getLatestPatchTag

          const result = calculateNextVersion('patch', 'main');

          expect(mockExecSync).toHaveBeenNthCalledWith(1, 'git tag -l "v*"', { encoding: 'utf8' });
          expect(mockExecSync).toHaveBeenNthCalledWith(2, 'git tag -l "v5.110.*"', { encoding: 'utf8' });
          expect(result).toEqual({
            newVersion: '5.110.3',
            tagName: 'v5.110.3',
          });
        });

        it('should start at patch 1 when no existing patch tags found for latest version', () => {
          mockExecSync
            .mockReturnValueOnce('v5.110.0\nv5.109.5\n') // Latest version is 5.110.0
            .mockReturnValueOnce(''); // No patch tags for v5.110.*

          const result = calculateNextVersion('patch', 'main');

          expect(result).toEqual({
            newVersion: '5.110.1',
            tagName: 'v5.110.1',
          });
        });

        it('should fall back to package.json when no git tags exist', () => {
          mockExecSync
            .mockReturnValueOnce('') // No tags for getLatestVersionFromTags
            .mockReturnValueOnce(''); // No patch tags either

          mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '5.110.0' }));

          const result = calculateNextVersion('patch', 'main');

          expect(result).toEqual({
            newVersion: '5.110.1',
            tagName: 'v5.110.1',
          });
        });

        it('should handle git command errors gracefully', () => {
          mockExecSync.mockImplementation(() => {
            throw new Error('Git command failed');
          });

          mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '5.110.0' }));

          const result = calculateNextVersion('patch', 'main');

          expect(result).toEqual({
            newVersion: '5.110.1',
            tagName: 'v5.110.1',
          });
        });
      });

      describe('on hotfix branches', () => {
        it('should extract version from hotfix branch name (format: hotfix/5.109)', () => {
          mockExecSync.mockReturnValue('v5.109.0\nv5.109.1\n');

          const result = calculateNextVersion('patch', 'hotfix/5.109');

          expect(mockExecSync).toHaveBeenCalledWith('git tag -l "v5.109.*"', { encoding: 'utf8' });
          expect(result).toEqual({
            newVersion: '5.109.2',
            tagName: 'v5.109.2',
          });
        });

        it('should extract version from hotfix branch name (format: hotfix/v5.109)', () => {
          mockExecSync.mockReturnValue('v5.109.0\n');

          const result = calculateNextVersion('patch', 'hotfix/v5.109');

          expect(mockExecSync).toHaveBeenCalledWith('git tag -l "v5.109.*"', { encoding: 'utf8' });
          expect(result).toEqual({
            newVersion: '5.109.1',
            tagName: 'v5.109.1',
          });
        });

        it('should start at patch 1 for new hotfix version with no existing tags', () => {
          mockExecSync.mockReturnValue('');

          const result = calculateNextVersion('patch', 'hotfix/5.108');

          expect(result).toEqual({
            newVersion: '5.108.1',
            tagName: 'v5.108.1',
          });
        });

        it('should sort version tags correctly', () => {
          // Return tags in mixed order to test sorting
          mockExecSync.mockReturnValue('v5.109.10\nv5.109.2\nv5.109.1\n');

          const result = calculateNextVersion('patch', 'hotfix/5.109');

          expect(result).toEqual({
            newVersion: '5.109.11',
            tagName: 'v5.109.11',
          });
        });
      });
    });

    describe('version tag sorting', () => {
      it('should correctly sort semantic version tags', () => {
        mockExecSync.mockReturnValue('v5.110.10\nv5.110.2\nv5.110.1\nv5.110.11\n');

        const result = calculateNextVersion('patch', 'main');

        expect(result).toEqual({
          newVersion: '5.110.12',
          tagName: 'v5.110.12',
        });
      });

      it('should handle single digit versions correctly', () => {
        mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
        mockExecSync.mockReturnValue('v1.0.0\nv1.0.1\nv1.0.2\n');

        const result = calculateNextVersion('patch', 'main');

        expect(result).toEqual({
          newVersion: '1.0.3',
          tagName: 'v1.0.3',
        });
      });
    });

    describe('edge cases', () => {
      it('should handle non-hotfix branch names for patch releases', () => {
        mockExecSync.mockReturnValue('v5.110.0\n');

        const result = calculateNextVersion('patch', 'feature/new-feature');

        expect(result).toEqual({
          newVersion: '5.110.1',
          tagName: 'v5.110.1',
        });
      });

      it('should handle empty git tag output', () => {
        mockExecSync.mockReturnValue('   \n  \n');

        const result = calculateNextVersion('patch', 'main');

        expect(result).toEqual({
          newVersion: '5.110.1',
          tagName: 'v5.110.1',
        });
      });

      it('should filter out empty tag lines', () => {
        mockExecSync.mockReturnValue('v5.110.0\n\nv5.110.1\n\n');

        const result = calculateNextVersion('patch', 'main');

        expect(result).toEqual({
          newVersion: '5.110.2',
          tagName: 'v5.110.2',
        });
      });
    });

    describe('hotfix branch parsing', () => {
      it('should not match invalid hotfix branch formats', () => {
        mockExecSync
          .mockReturnValueOnce('v5.110.0\nv5.109.5\n') // getLatestVersionFromTags
          .mockReturnValueOnce(''); // No patch tags for v5.110.*

        // Should fall back to latest git tag version for major.minor
        const result = calculateNextVersion('patch', 'hotfix/invalid-format');

        expect(result).toEqual({
          newVersion: '5.110.1',
          tagName: 'v5.110.1',
        });
      });

      it('should not match branches that are not hotfix branches', () => {
        mockExecSync
          .mockReturnValueOnce('v5.110.0\nv5.109.5\n') // getLatestVersionFromTags
          .mockReturnValueOnce(''); // No patch tags for v5.110.*

        const result = calculateNextVersion('patch', 'feature/5.109');

        expect(result).toEqual({
          newVersion: '5.110.1',
          tagName: 'v5.110.1',
        });
      });
    });

    describe('type validation', () => {
      it('should handle all valid release types', () => {
        const releaseTypes: ReleaseType[] = ['major', 'minor', 'patch'];

        releaseTypes.forEach((type) => {
          expect(() => calculateNextVersion(type, 'main')).not.toThrow();
        });
      });
    });
  });
});
