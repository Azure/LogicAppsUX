import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  formatReleaseNotes,
  getChangelogVersions,
  insertEntries,
  parseArguments,
  planEntries,
  selectPublishedVersions,
} from '../generate-published-changelog.js';

const repo = 'Azure/LogicAppsUX';

describe('generate-published-changelog', () => {
  it('parses arguments and requires a valid since version', () => {
    expect(parseArguments(['--since', '5.185.10', '--dry-run'])).toMatchObject({ since: '5.185.10', dryRun: true });
    expect(() => parseArguments([])).toThrow('--since');
    expect(() => parseArguments(['--since', 'latest'])).toThrow('--since');
  });

  it('compares versions numerically', () => {
    expect(compareVersions('5.1013.1', '5.996.0')).toBeGreaterThan(0);
    expect(compareVersions('v5.185.10', '5.185.9')).toBeGreaterThan(0);
    expect(compareVersions('5.185.10', '5.185.10')).toBe(0);
  });

  it('selects stable versions since the baseline, sorted and de-duplicated', () => {
    const preRelease = [{ key: 'Microsoft.VisualStudio.Code.PreRelease', value: 'true' }];
    const selected = selectPublishedVersions(
      [
        { version: '5.1013.1', lastUpdated: '2026-10-27T18:30:38Z' },
        { version: '5.1013.1', lastUpdated: '2026-10-28T00:00:00Z' },
        { version: '5.185.9', lastUpdated: '2025-10-07T00:00:00Z' },
        { version: '5.200.0', lastUpdated: '2025-11-01T00:00:00Z', properties: preRelease },
        { version: '5.996.0', lastUpdated: '2026-08-21T17:04:25Z' },
        { version: '5.185.10', lastUpdated: '2025-10-17T19:11:57Z' },
      ],
      '5.185.10'
    );
    expect(selected).toEqual([
      { version: '5.185.10', lastUpdated: '2025-10-17T19:11:57Z' },
      { version: '5.996.0', lastUpdated: '2026-08-21T17:04:25Z' },
      { version: '5.1013.1', lastUpdated: '2026-10-27T18:30:38Z' },
    ]);
  });

  it('formats PR commits into features and bug fixes', () => {
    const notes = formatReleaseNotes(
      [
        'fix(vscode): cleanup projects (#9698)',
        'feat(designer): add thing (#9600)',
        'Plain change (#9500)',
        'fix: unscoped fix (#9400)',
        'fix(vscode): cleanup projects (#9698)',
        'no pr here',
      ],
      repo,
      'compare'
    );
    expect(notes).toBe(
      [
        '### Features',
        '',
        `* **designer:** add thing ([#9600](https://github.com/${repo}/pull/9600))`,
        `* Plain change ([#9500](https://github.com/${repo}/pull/9500))`,
        '',
        '### Bug Fixes',
        '',
        `* **vscode:** cleanup projects ([#9698](https://github.com/${repo}/pull/9698))`,
        `* unscoped fix ([#9400](https://github.com/${repo}/pull/9400))`,
      ].join('\n')
    );
    expect(formatReleaseNotes(['no pr'], repo, 'https://compare')).toContain('**Full Changelog**: https://compare');
  });

  it('plans entries for missing adjacent versions, newest first', () => {
    const ranges = [];
    const entries = planEntries({
      versions: [
        { version: '5.185.10', lastUpdated: '2025-10-17T00:00:00Z' },
        { version: '5.230.15', lastUpdated: '2025-12-03T00:00:00Z' },
        { version: '5.959.1' },
      ],
      existingVersions: new Set(['5.185.10']),
      getSubjects: (previous, current) => {
        ranges.push(`${previous}..${current}`);
        return [`fix(vscode): change in ${current} (#1)`];
      },
      getDate: () => '2026-05-27',
      repo,
    });
    expect(ranges).toEqual(['5.185.10..5.230.15', '5.230.15..5.959.1']);
    expect(entries.map((entry) => entry.version)).toEqual(['5.959.1', '5.230.15']);
    expect(entries[0].text).toMatch(
      /^## \[5\.959\.1\]\(https:\/\/github\.com\/Azure\/LogicAppsUX\/compare\/v5\.230\.15\.\.\.v5\.959\.1\) \(2026-05-27\)/
    );
    expect(entries[1].text).toContain('(2025-12-03)');
  });

  it('inserts entries below the title and detects existing versions', () => {
    const changelog = '# Logic Apps Designer\n## [5.185.10](link) (2025-10-17)\n\n### Bug Fixes\n';
    const updated = insertEntries(changelog, ['## [5.230.15](link) (2025-12-03)\n\nnotes\n']);
    expect(updated.startsWith('# Logic Apps Designer\n## [5.230.15]')).toBe(true);
    expect([...getChangelogVersions(updated)]).toEqual(['5.230.15', '5.185.10']);
    expect(insertEntries(changelog, [])).toBe(changelog);
  });
});
