#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Version not provided');
  process.exit(1);
}

// List of package.json files to update (from .versionrc)
const packagesToUpdate = [
  'package.json',
  'libs/designer/package.json',
  'libs/designer-ui/package.json',
  'apps/vs-code-designer/src/package.json',
  'libs/data-mapper/package.json',
  'libs/data-mapper-v2/package.json',
  'libs/logic-apps-shared/package.json',
  'libs/services/designer-client-services/package.json',
  'libs/vscode-extension/package.json',
  'libs/chatbot/package.json',
  'apps/vs-code-react/package.json',
];

console.log(`Updating versions to ${version}`);

packagesToUpdate.forEach((packagePath) => {
  const fullPath = path.join(__dirname, '..', packagePath);

  try {
    if (fs.existsSync(fullPath)) {
      const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      packageJson.version = version;
      fs.writeFileSync(fullPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✓ Updated ${packagePath}`);
    } else {
      console.warn(`⚠️  File not found: ${packagePath}`);
    }
  } catch (error) {
    console.error(`✗ Failed to update ${packagePath}:`, error.message);
  }
});

console.log('Version update complete');
