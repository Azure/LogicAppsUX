#!/usr/bin/env node
/**
 * Builds CHANGELOG.md entries for every VS Code Marketplace version of the Logic Apps (Standard)
 * extension published since a baseline version. Each entry lists the PRs between the previous
 * published version tag and the current version tag (`v<version>`).
 *
 * Usage:
 *   node scripts/generate-published-changelog.js --since 5.185.10 [--changelog CHANGELOG.md]
 *     [--extension ms-azuretools.vscode-azurelogicapps] [--repo Azure/LogicAppsUX] [--dry-run]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKETPLACE_QUERY_URL = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';
const PRE_RELEASE_PROPERTY = 'Microsoft.VisualStudio.Code.PreRelease';
// IncludeVersions (0x1) | IncludeVersionProperties (0x10)
const MARKETPLACE_FLAGS = 0x11;

export function parseArguments(args) {
  const options = {
    since: undefined,
    changelog: 'CHANGELOG.md',
    extension: 'ms-azuretools.vscode-azurelogicapps',
    repo: 'Azure/LogicAppsUX',
    dryRun: false,
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    const key = { '--since': 'since', '--changelog': 'changelog', '--extension': 'extension', '--repo': 'repo' }[arg];
    if (!key || args[index + 1] === undefined) {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
    options[key] = args[++index];
  }
  if (!options.since || !parseVersion(options.since)) {
    throw new Error('--since must be a version such as 5.185.10');
  }
  return options;
}

export function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  return match ? match.slice(1).map(Number) : undefined;
}

export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

/**
 * Returns stable published versions >= sinceVersion, ascending, de-duplicated across target platforms.
 */
export function selectPublishedVersions(marketplaceVersions, sinceVersion) {
  const byVersion = new Map();
  for (const entry of marketplaceVersions) {
    const isPreRelease = (entry.properties ?? []).some((property) => property.key === PRE_RELEASE_PROPERTY && property.value === 'true');
    if (isPreRelease || !parseVersion(entry.version) || compareVersions(entry.version, sinceVersion) < 0) {
      continue;
    }
    const existing = byVersion.get(entry.version);
    if (!existing || (entry.lastUpdated && (!existing.lastUpdated || entry.lastUpdated < existing.lastUpdated))) {
      byVersion.set(entry.version, { version: entry.version, lastUpdated: entry.lastUpdated });
    }
  }
  return [...byVersion.values()].sort((a, b) => compareVersions(a.version, b.version));
}

/**
 * Formats commit subjects into release notes, matching the single-range Update Changelog workflow.
 */
export function formatReleaseNotes(subjects, repo, compareUrl) {
  const features = [];
  const bugFixes = [];
  const foundPRs = new Set();

  for (const subject of subjects) {
    const prMatch = subject.match(/\(#(\d+)\)/);
    if (!prMatch || foundPRs.has(prMatch[1])) {
      continue;
    }
    const prNumber = prMatch[1];
    foundPRs.add(prNumber);
    const prLink = `([#${prNumber}](https://github.com/${repo}/pull/${prNumber}))`;
    const conventionalMatch = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+?)\s*\(#\d+\)/);

    if (conventionalMatch) {
      const [, commitType, scope, description] = conventionalMatch;
      const line = scope ? `* **${scope.trim()}:** ${description.trim()} ${prLink}` : `* ${description.trim()} ${prLink}`;
      (commitType.trim().toLowerCase() === 'fix' ? bugFixes : features).push(line);
    } else {
      features.push(`* ${subject.replace(/\s*\(#\d+\)$/, '').trim()} ${prLink}`);
    }
  }

  const sections = [];
  if (features.length > 0) {
    sections.push('### Features', '', ...features, '');
  }
  if (bugFixes.length > 0) {
    sections.push('### Bug Fixes', '', ...bugFixes, '');
  }
  return sections.length > 0
    ? sections.join('\n').trim()
    : `### Changes\n\nNo changes with PR numbers found.\n\n**Full Changelog**: ${compareUrl}`;
}

export function buildEntry({ version, previousVersion, date, subjects, repo }) {
  const compareUrl = `https://github.com/${repo}/compare/v${previousVersion}...v${version}`;
  return `## [${version}](${compareUrl}) (${date})\n\n${formatReleaseNotes(subjects, repo, compareUrl)}\n`;
}

export function getChangelogVersions(changelog) {
  return new Set([...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((match) => match[1]));
}

/**
 * Inserts entries (newest first) directly below the changelog title.
 */
export function insertEntries(changelog, entries) {
  if (entries.length === 0) {
    return changelog;
  }
  const lines = changelog.split(/\r?\n/);
  const hasTitle = lines[0]?.startsWith('# ');
  const title = hasTitle ? lines[0] : '# Logic Apps Designer';
  const rest = (hasTitle ? lines.slice(1) : lines).join('\n').replace(/^\n+/, '');
  return `${title}\n${entries.join('\n')}\n${rest}`;
}

/**
 * Plans entries for adjacent published-version pairs whose current version is not yet in the changelog.
 */
export function planEntries({ versions, existingVersions, getSubjects, getDate, repo }) {
  const entries = [];
  for (let index = 1; index < versions.length; index++) {
    const { version, lastUpdated } = versions[index];
    if (existingVersions.has(version)) {
      continue;
    }
    const previousVersion = versions[index - 1].version;
    entries.push({
      version,
      previousVersion,
      text: buildEntry({
        version,
        previousVersion,
        date: lastUpdated ? lastUpdated.slice(0, 10) : getDate(version),
        subjects: getSubjects(previousVersion, version),
        repo,
      }),
    });
  }
  return entries.reverse();
}

async function fetchMarketplaceVersions(extensionId) {
  const response = await fetch(MARKETPLACE_QUERY_URL, {
    method: 'POST',
    headers: { Accept: 'application/json;api-version=7.1-preview.1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: extensionId }] }], flags: MARKETPLACE_FLAGS }),
  });
  if (!response.ok) {
    throw new Error(`Marketplace query failed: ${response.status} ${response.statusText}`);
  }
  const extension = (await response.json()).results?.[0]?.extensions?.[0];
  if (!extension) {
    throw new Error(`Extension ${extensionId} was not found on the Marketplace`);
  }
  return extension.versions ?? [];
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf-8' }).trim();
}

function tagExists(version) {
  try {
    git(['rev-parse', '--quiet', '--verify', `refs/tags/v${version}`]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const versions = selectPublishedVersions(await fetchMarketplaceVersions(options.extension), options.since);
  console.log(`Published versions since ${options.since}: ${versions.map((entry) => entry.version).join(', ') || 'none'}`);

  if (!versions.some((entry) => entry.version === options.since)) {
    throw new Error(`Baseline ${options.since} is not a published Marketplace version`);
  }
  const missingTags = versions.filter((entry) => !tagExists(entry.version)).map((entry) => `v${entry.version}`);
  if (missingTags.length > 0) {
    throw new Error(`Missing git tags for published versions: ${missingTags.join(', ')}. Fetch tags (fetch-depth: 0) and retry.`);
  }

  const changelogPath = path.resolve(options.changelog);
  const changelog = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf-8') : '# Logic Apps Designer\n';
  const entries = planEntries({
    versions,
    existingVersions: getChangelogVersions(changelog),
    getSubjects: (previous, current) =>
      git(['log', `v${previous}..v${current}`, '--pretty=format:%s'])
        .split('\n')
        .filter((line) => line.trim()),
    getDate: (version) => git(['log', '-1', '--format=%cs', `v${version}`]),
    repo: options.repo,
  });

  for (const entry of entries) {
    console.log(`Generated ${entry.previousVersion} -> ${entry.version}`);
  }
  if (entries.length === 0) {
    console.log('CHANGELOG.md already contains every published version.');
    return;
  }

  const entryTexts = entries.map((entry) => entry.text);
  if (options.dryRun) {
    console.log(`\n${entryTexts.join('\n')}`);
    return;
  }
  fs.writeFileSync(changelogPath, insertEntries(changelog, entryTexts));
  console.log(`Added ${entries.length} entries to ${options.changelog}`);
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Changelog generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
