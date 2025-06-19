import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

execSync(
  'az account get-access-token --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47 > ./apps/Standalone/src/environments/jsonImport/armToken.json',
  { stdio: 'inherit' }
);

const tokenFilePath = 'apps/Standalone/src/environments/jsonImport/armToken.json';
const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf8'));
const token = tokenData.accessToken;

// Helper to parse .env format
function parseEnv(content) {
  const lines = content.split('\n');
  const env = {};

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      env[key] = value;
    }
  }

  return env;
}

// Helper to stringify env object
function stringifyEnv(env) {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

// Update a specific key in .env
function updateEnvFile(filePath, key, newValue) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    // Create the file if it doesn't exist
    fs.writeFileSync(absPath, '', 'utf-8');
  }
  const content = fs.readFileSync(absPath, 'utf-8');
  const env = parseEnv(content);

  env[key] = newValue;

  const updatedContent = stringifyEnv(env);
  fs.writeFileSync(absPath, updatedContent, 'utf-8');
}

updateEnvFile('.env', 'AZURE_MANAGEMENT_TOKEN', `"${token}"`);
