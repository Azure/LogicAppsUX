/* eslint-disable no-undef */
import AdmZip from 'adm-zip';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(scriptDirectory, '..');
const lspRoot = path.join(extensionRoot, 'lsp-server');
const assetDirectory = path.join(extensionRoot, 'src', 'assets', 'LSPServer');
const artifactDirectory = path.join(lspRoot, 'artifacts');
const publishDirectory = path.join(artifactDirectory, 'LSPServer');
const stagedServerArchivePath = path.join(artifactDirectory, 'LSPServer.zip');
const serverArchivePath = path.join(assetDirectory, 'LSPServer.zip');
const manifestPath = path.join(assetDirectory, 'lsp-assets.json');
const stagedManifestPath = path.join(artifactDirectory, 'lsp-assets.json');
const testProject = path.join(lspRoot, 'Server.Tests', 'LogicAppsLanguageServer.Tests.csproj');
const serverProject = path.join(lspRoot, 'Server', 'LogicAppsLanguageServer.csproj');
const nugetConfig = path.join(lspRoot, 'NuGet.config');
const dotnetCommand = process.env.DOTNET_HOST_PATH || 'dotnet';
const portableDirectoryMode = 0o040755;
const portableFileMode = 0o100644;
const msDosDirectoryFlag = 0x10;

const sdkPackagePath = resolveSdkPackagePath(process.argv.slice(2));

runDotNet(['restore', testProject, '--configfile', nugetConfig, '--locked-mode', '--ignore-failed-sources']);
runDotNet(['build', testProject, '--configuration', 'Release', '--no-restore']);
runDotNet(['test', testProject, '--configuration', 'Release', '--no-build', '--no-restore'], {
  SDK_NUPKG_PATH: sdkPackagePath,
});

rmSync(artifactDirectory, { recursive: true, force: true });
mkdirSync(publishDirectory, { recursive: true });
runDotNet(['publish', serverProject, '--configuration', 'Release', '--no-restore', '--output', publishDirectory]);

const publishedServerPath = path.join(publishDirectory, 'LogicAppsLanguageServer.dll');
if (!existsSync(publishedServerPath)) {
  throw new Error(`Published LSP server is missing '${publishedServerPath}'.`);
}

const runtimeConfigPath = path.join(publishDirectory, 'LogicAppsLanguageServer.runtimeconfig.json');
if (!existsSync(runtimeConfigPath)) {
  throw new Error(`Published LSP server is missing '${runtimeConfigPath}'.`);
}

const runtimeConfig = JSON.parse(readFileSync(runtimeConfigPath, 'utf8'));
if (runtimeConfig.runtimeOptions?.tfm !== 'net8.0') {
  throw new Error(`Published LSP server targets '${runtimeConfig.runtimeOptions?.tfm ?? 'unknown'}' instead of 'net8.0'.`);
}

const runtimeFrameworks = runtimeConfig.runtimeOptions.frameworks ?? [runtimeConfig.runtimeOptions.framework];
for (const frameworkName of ['Microsoft.NETCore.App']) {
  const framework = runtimeFrameworks.find((candidate) => candidate?.name === frameworkName);
  if (!framework?.version?.startsWith('8.')) {
    throw new Error(`Published LSP server requires '${frameworkName} ${framework?.version ?? 'unknown'}' instead of version 8.`);
  }
}

const archive = new AdmZip();
archive.addLocalFolder(publishDirectory, 'LSPServer');
normalizeArchivePermissions(archive);
validateArchivePermissions(archive);
archive.writeZip(stagedServerArchivePath);

const verificationArchive = new AdmZip(stagedServerArchivePath);
if (!verificationArchive.getEntry('LSPServer/LogicAppsLanguageServer.dll')) {
  throw new Error(`Archive '${stagedServerArchivePath}' does not contain 'LSPServer/LogicAppsLanguageServer.dll'.`);
}
validateArchivePermissions(verificationArchive);

mkdirSync(assetDirectory, { recursive: true });
copyFileSync(stagedServerArchivePath, serverArchivePath);

const manifest = {
  serverArchive: path.basename(serverArchivePath),
  serverSha256: sha256(serverArchivePath),
};
writeFileSync(stagedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
renameSync(stagedManifestPath, manifestPath);

console.log(`Created '${serverArchivePath}'.`);
console.log(`Validated server against SDK '${path.basename(sdkPackagePath)}' without bundling it.`);
console.log(`Updated '${manifestPath}'.`);

function resolveSdkPackagePath(argumentsList) {
  const optionIndex = argumentsList.indexOf('--sdk-package');
  if (optionIndex >= 0) {
    const optionValue = argumentsList[optionIndex + 1];
    if (!optionValue) {
      throw new Error("The '--sdk-package' option requires a path.");
    }

    return requireExistingSdkPackage(optionValue);
  }

  if (process.env.SDK_NUPKG_PATH) {
    return requireExistingSdkPackage(process.env.SDK_NUPKG_PATH);
  }

  throw new Error("Pass '--sdk-package <path>' or set SDK_NUPKG_PATH to run managed LSP tests during packaging.");
}

function requireExistingSdkPackage(packagePath) {
  const resolvedPath = path.resolve(packagePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`SDK package '${resolvedPath}' does not exist.`);
  }

  if (!/^Microsoft\.Azure\.Workflows\.Sdk\..+\.nupkg$/i.test(path.basename(resolvedPath))) {
    throw new Error(`SDK package '${resolvedPath}' has an unexpected file name.`);
  }

  return resolvedPath;
}

function runDotNet(argumentsList, additionalEnvironment = {}) {
  execFileSync(dotnetCommand, argumentsList, {
    cwd: lspRoot,
    env: { ...process.env, ...additionalEnvironment },
    stdio: 'inherit',
  });
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function normalizeArchivePermissions(archiveToNormalize) {
  for (const entry of archiveToNormalize.getEntries()) {
    entry.attr = toExternalAttributes(entry.isDirectory ? portableDirectoryMode : portableFileMode, entry.isDirectory);
  }
}

function validateArchivePermissions(archiveToValidate) {
  for (const entry of archiveToValidate.getEntries()) {
    const expectedMode = entry.isDirectory ? portableDirectoryMode : portableFileMode;
    const actualMode = (entry.attr >>> 16) & 0xffff;
    if (actualMode !== expectedMode) {
      throw new Error(`Archive entry '${entry.entryName}' has mode '${actualMode.toString(8)}' instead of '${expectedMode.toString(8)}'.`);
    }
  }
}

function toExternalAttributes(unixMode, isDirectory) {
  return ((unixMode << 16) | (isDirectory ? msDosDirectoryFlag : 0)) >>> 0;
}
