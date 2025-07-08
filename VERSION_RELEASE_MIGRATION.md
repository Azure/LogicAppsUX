# Version Release Migration Guide

## Overview

This repository has been migrated from `standard-version` to a custom tag-based release workflow to comply with the organization policy that prohibits direct pushes to the main branch without PRs.

## Key Changes

### 1. Version Management
- **Before**: Version in `package.json` was updated and committed to main
- **After**: Version stays at current value in the repository; actual versions are managed through git tags only

### 2. Release Process
- **Before**: Manual trigger with explicit version type (major/minor/patch) that commits to main
- **After**: Manual trigger with explicit version type that only creates tags

### 3. Workflow Changes
- **Old workflow**: `production-build.yml` (can be deprecated)
- **New workflow**: `version-release.yml`

### 4. Branch Restrictions
- **Main branch**: Only allows major and minor releases
- **Hotfix branches**: Only allows patch releases
- Validation enforced in workflow

## How It Works

1. **No commits to main**: Workflow creates tags without modifying files in the repository
2. **Version updates during build**: The `scripts/update-versions.js` script updates package.json versions during CI/CD build time only
3. **GitHub releases**: Created with auto-generated release notes
4. **NPM publishing**: Uses the version from the git tag, not from package.json

## Triggering Releases

Releases are triggered via GitHub Actions workflow dispatch:
1. Go to Actions tab in GitHub
2. Select "Version and Release" workflow
3. Click "Run workflow"
4. Select branch (main or hotfix/*)
5. Select release type (major, minor, patch)

Can also be triggered via:
- Repository dispatch events
- Weekly schedule (Thursdays at 5 PM)

## Workflow Process

1. **Validation**: Ensures patch releases only on hotfix branches, major/minor only on main
2. **Version Calculation**: Increments version based on selected type
3. **Tag Creation**: Creates and pushes git tag
4. **GitHub Release**: Creates release with auto-generated notes
5. **Build & Publish**: Builds extension and publishes to NPM

## Configuration Files

- `scripts/update-versions.js` - Updates package.json versions during build
- `.github/workflows/version-release.yml` - New release workflow

## Migration Checklist

- [x] Create version update script
- [x] Create new GitHub workflow with branch validation
- [x] Remove `.versionrc` file
- [x] Remove semantic-release dependencies
- [ ] Deprecate old `production-build.yml` workflow
- [ ] Update team documentation

## Rollback Plan

If needed, to rollback:
1. Restore `.versionrc` file
2. Revert package.json to use `standard-version`
3. Use `production-build.yml` workflow
4. Delete `version-release.yml` workflow