#!/usr/bin/env node
/* eslint-env node */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VersionResult {
  currentVersion: string;
  tagName: string;
}

interface HotfixInfo {
  major: number;
  minor: number;
}

function getPackageVersion(): string {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function getLatestVersionFromTags(): string | null {
  try {
    const tags = execSync('git tag -l "v*"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((tag) => tag.length > 0 && tag.match(/^v\d+\.\d+\.\d+$/));

    if (tags.length === 0) return null;

    // Sort tags by version
    tags.sort((a, b) => {
      const aVersion = a.replace('v', '').split('.').map(Number);
      const bVersion = b.replace('v', '').split('.').map(Number);

      for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
        const aPart = aVersion[i] || 0;
        const bPart = bVersion[i] || 0;
        if (aPart !== bPart) return aPart - bPart;
      }
      return 0;
    });

    return tags[tags.length - 1]; // Return latest tag
  } catch {
    return null;
  }
}

function getLatestPatchTag(major: number, minor: number): string | null {
  try {
    const tags = execSync(`git tag -l "v${major}.${minor}.*"`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((tag) => tag.length > 0);

    if (tags.length === 0) return null;

    // Sort tags by version
    tags.sort((a, b) => {
      const aVersion = a.replace('v', '').split('.').map(Number);
      const bVersion = b.replace('v', '').split('.').map(Number);

      for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
        const aPart = aVersion[i] || 0;
        const bPart = bVersion[i] || 0;
        if (aPart !== bPart) return aPart - bPart;
      }
      return 0;
    });

    return tags[tags.length - 1]; // Return latest tag
  } catch {
    return null;
  }
}

function parseHotfixBranch(branchName: string): HotfixInfo | null {
  const match = branchName.match(/^hotfix\/v?(\d+)\.(\d+)$/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
    };
  }
  return null;
}

function getCurrentVersion(branchName: string): VersionResult {
  console.log(`Current branch: ${branchName}`);

  let currentVersion: string;

  // Check if this is a hotfix branch
  const hotfixInfo = parseHotfixBranch(branchName);
  if (hotfixInfo) {
    // For hotfix branches, get the latest patch version for that major.minor
    const latestPatchTag = getLatestPatchTag(hotfixInfo.major, hotfixInfo.minor);
    if (latestPatchTag) {
      currentVersion = latestPatchTag.replace('v', '');
      console.log(`Detected hotfix branch, using latest patch tag: ${latestPatchTag}`);
    } else {
      // No patches exist yet for this hotfix, use the base version
      currentVersion = `${hotfixInfo.major}.${hotfixInfo.minor}.0`;
      console.log(`Detected hotfix branch, no patches found, using base version: ${currentVersion}`);
    }
  } else {
    // For main branch or other branches, get the latest version from git tags
    const latestTag = getLatestVersionFromTags();
    if (latestTag) {
      currentVersion = latestTag.replace('v', '');
      console.log(`Using latest tag version: ${currentVersion} from ${latestTag}`);
    } else {
      // Fallback to package.json if no tags exist
      currentVersion = getPackageVersion();
      console.log(`No git tags found, falling back to package.json version: ${currentVersion}`);
    }
  }

  const tagName = `v${currentVersion}`;

  console.log(`Current version: ${currentVersion}`);
  console.log(`Tag name: ${tagName}`);

  return { currentVersion, tagName };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const branchName = process.argv[2] || 'main';

  try {
    const { currentVersion, tagName } = getCurrentVersion(branchName);

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `current_version=${currentVersion}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag_name=${tagName}\n`);
    } else {
      console.log(`::set-output name=current_version::${currentVersion}`);
      console.log(`::set-output name=tag_name::${tagName}`);
    }
  } catch (error) {
    console.error('Error getting current version:', error);
    process.exit(1);
  }
}

export { getCurrentVersion };
export type { VersionResult };
