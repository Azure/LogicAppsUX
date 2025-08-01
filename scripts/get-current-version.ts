#!/usr/bin/env node
/* eslint-env node */
import { getPackageVersion, getLatestVersionFromTags, getLatestPatchTag, parseHotfixBranch, outputForGitHub } from './version-utils.js';

export interface VersionResult {
  currentVersion: string;
  tagName: string;
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
    outputForGitHub({
      current_version: currentVersion,
      tag_name: tagName,
    });
  } catch (error) {
    console.error('Error getting current version:', error);
    process.exit(1);
  }
}

export { getCurrentVersion };
