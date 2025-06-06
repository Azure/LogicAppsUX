#!/usr/bin/env node
/* eslint-env node */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ReleaseType = 'major' | 'minor' | 'patch';

interface VersionResult {
  newVersion: string;
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

function calculateNextVersion(releaseType: ReleaseType, branchName: string): VersionResult {
  const currentVersion = getPackageVersion();
  const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);

  console.log(`Current branch: ${branchName}`);
  console.log(`Current package.json version: ${currentVersion}`);
  console.log(`Release type: ${releaseType}`);

  let major: number, minor: number, patch: number;

  if (releaseType === 'patch') {
    // Determine target major.minor for patch
    const hotfixInfo = parseHotfixBranch(branchName);
    if (hotfixInfo) {
      major = hotfixInfo.major;
      minor = hotfixInfo.minor;
      console.log(`Detected hotfix branch for version ${major}.${minor}`);
    } else {
      major = currentMajor;
      minor = currentMinor;
      console.log(`Using current version's major.minor: ${major}.${minor}`);
    }

    // Find latest patch version
    const latestPatchTag = getLatestPatchTag(major, minor);

    if (latestPatchTag) {
      const latestVersion = latestPatchTag.replace('v', '');
      const latestPatch = parseInt(latestVersion.split('.')[2], 10);
      patch = latestPatch + 1;
      console.log(`Found latest patch tag: ${latestPatchTag}`);
      console.log(`Incrementing patch from ${latestPatch} to ${patch}`);
    } else {
      patch = 1;
      console.log(`No existing tags found for ${major}.${minor}, starting with patch 1`);
    }
  } else {
    // For major/minor releases, use current version from package.json
    major = currentMajor;
    minor = currentMinor;
    patch = currentPatch;

    switch (releaseType) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
    }
  }

  const newVersion = `${major}.${minor}.${patch}`;
  const tagName = `v${newVersion}`;

  console.log(`New version: ${newVersion}`);
  console.log(`Tag name: ${tagName}`);

  return { newVersion, tagName };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const releaseType = (process.argv[2] as ReleaseType) || 'minor';
  const branchName = process.argv[3] || 'main';

  try {
    const { newVersion, tagName } = calculateNextVersion(releaseType, branchName);

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag_name=${tagName}\n`);
    } else {
      console.log(`::set-output name=new_version::${newVersion}`);
      console.log(`::set-output name=tag_name::${tagName}`);
    }
  } catch (error) {
    console.error('Error calculating next version:', error);
    process.exit(1);
  }
}

export { calculateNextVersion };
export type { ReleaseType, VersionResult };
