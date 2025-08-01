#!/usr/bin/env node
/* eslint-env node */
import { getPackageVersion, getLatestVersionFromTags, getLatestPatchTag, parseHotfixBranch, outputForGitHub } from './version-utils.js';

export type ReleaseType = 'major' | 'minor' | 'patch';

export interface VersionResult {
  newVersion: string;
  tagName: string;
}

function calculateNextVersion(releaseType: ReleaseType, branchName: string): VersionResult {
  console.log(`Current branch: ${branchName}`);
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
      // For patch releases on non-hotfix branches, get latest version from tags
      const latestTag = getLatestVersionFromTags();
      if (latestTag) {
        const latestVersion = latestTag.replace('v', '');
        const [latestMajor, latestMinor] = latestVersion.split('.').map(Number);
        major = latestMajor;
        minor = latestMinor;
        console.log(`Using latest tag version's major.minor: ${major}.${minor} from ${latestTag}`);
      } else {
        // Fallback to package.json if no tags exist
        const currentVersion = getPackageVersion();
        const [currentMajor, currentMinor] = currentVersion.split('.').map(Number);
        major = currentMajor;
        minor = currentMinor;
        console.log(`No git tags found, falling back to package.json version's major.minor: ${major}.${minor}`);
      }
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
    // For major/minor releases, use latest version from git tags
    const latestTag = getLatestVersionFromTags();
    if (latestTag) {
      const latestVersion = latestTag.replace('v', '');
      const [latestMajor, latestMinor, latestPatch] = latestVersion.split('.').map(Number);
      major = latestMajor;
      minor = latestMinor;
      patch = latestPatch;
      console.log(`Using latest tag as base version: ${latestVersion} from ${latestTag}`);
    } else {
      // Fallback to package.json if no tags exist
      const currentVersion = getPackageVersion();
      const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);
      major = currentMajor;
      minor = currentMinor;
      patch = currentPatch;
      console.log(`No git tags found, falling back to package.json version: ${currentVersion}`);
    }

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
    outputForGitHub({
      new_version: newVersion,
      tag_name: tagName,
    });
  } catch (error) {
    console.error('Error calculating next version:', error);
    process.exit(1);
  }
}

export { calculateNextVersion };
