import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface HotfixInfo {
  major: number;
  minor: number;
}

/**
 * Reads the version from package.json
 */
export function getPackageVersion(): string {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

/**
 * Sorts version tags in ascending order
 */
export function sortVersionTags(tags: string[]): string[] {
  return tags.sort((a, b) => {
    const aVersion = a.replace('v', '').split('.').map(Number);
    const bVersion = b.replace('v', '').split('.').map(Number);

    for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
      const aPart = aVersion[i] || 0;
      const bPart = bVersion[i] || 0;
      if (aPart !== bPart) return aPart - bPart;
    }
    return 0;
  });
}

/**
 * Gets the latest version tag from git
 */
export function getLatestVersionFromTags(): string | null {
  try {
    const tags = execSync('git tag -l "v*"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((tag) => tag.length > 0 && tag.match(/^v\d+\.\d+\.\d+$/));

    if (tags.length === 0) return null;

    const sortedTags = sortVersionTags(tags);
    return sortedTags[sortedTags.length - 1]; // Return latest tag
  } catch {
    return null;
  }
}

/**
 * Gets the latest patch tag for a specific major.minor version
 */
export function getLatestPatchTag(major: number, minor: number): string | null {
  try {
    const tags = execSync(`git tag -l "v${major}.${minor}.*"`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((tag) => tag.length > 0);

    if (tags.length === 0) return null;

    const sortedTags = sortVersionTags(tags);
    return sortedTags[sortedTags.length - 1]; // Return latest tag
  } catch {
    return null;
  }
}

/**
 * Parses a hotfix branch name to extract major and minor version numbers
 */
export function parseHotfixBranch(branchName: string): HotfixInfo | null {
  const match = branchName.match(/^hotfix\/v?(\d+)\.(\d+)$/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Outputs version information for GitHub Actions
 */
export function outputForGitHub(outputs: Record<string, string>): void {
  if (process.env.GITHUB_OUTPUT) {
    for (const [key, value] of Object.entries(outputs)) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    }
  } else {
    for (const [key, value] of Object.entries(outputs)) {
      console.log(`::set-output name=${key}::${value}`);
    }
  }
}
