/* eslint-disable no-undef */
import AdmZip from 'adm-zip';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
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
const testProject = path.join(lspRoot, 'Server.Tests', 'Server.Tests.csproj');
const serverProject = path.join(lspRoot, 'Server', 'SdkLspServer.csproj');
const nugetConfig = path.join(lspRoot, 'NuGet.config');
const dotnetCommand = process.env.DOTNET_HOST_PATH || 'dotnet';

const sdkPackagePath = resolveSdkPackagePath(process.argv.slice(2));

runDotNet(['restore', testProject, '--configfile', nugetConfig, '--locked-mode', '--ignore-failed-sources']);
runDotNet(['build', testProject, '--configuration', 'Release', '--no-restore']);
runDotNet(['test', testProject, '--configuration', 'Release', '--no-build', '--no-restore'], {
  SDK_NUPKG_PATH: sdkPackagePath,
});

rmSync(artifactDirectory, { recursive: true, force: true });
mkdirSync(publishDirectory, { recursive: true });
runDotNet(['publish', serverProject, '--configuration', 'Release', '--no-restore', '--output', publishDirectory]);

const publishedServerPath = path.join(publishDirectory, 'SdkLspServer.dll');
if (!existsSync(publishedServerPath)) {
  throw new Error(`Published LSP server is missing '${publishedServerPath}'.`);
}

const runtimeConfigPath = path.join(publishDirectory, 'SdkLspServer.runtimeconfig.json');
if (!existsSync(runtimeConfigPath)) {
  throw new Error(`Published LSP server is missing '${runtimeConfigPath}'.`);
}

const runtimeConfig = JSON.parse(readFileSync(runtimeConfigPath, 'utf8'));
if (runtimeConfig.runtimeOptions?.tfm !== 'net10.0') {
  throw new Error(`Published LSP server targets '${runtimeConfig.runtimeOptions?.tfm ?? 'unknown'}' instead of 'net10.0'.`);
}

const runtimeFrameworks = runtimeConfig.runtimeOptions.frameworks ?? [runtimeConfig.runtimeOptions.framework];
for (const frameworkName of ['Microsoft.NETCore.App', 'Microsoft.AspNetCore.App']) {
  const framework = runtimeFrameworks.find((candidate) => candidate?.name === frameworkName);
  if (!framework?.version?.startsWith('10.')) {
    throw new Error(`Published LSP server requires '${frameworkName} ${framework?.version ?? 'unknown'}' instead of version 10.`);
  }
}

const archive = new AdmZip();
archive.addLocalFolder(publishDirectory, 'LSPServer');
archive.writeZip(stagedServerArchivePath);

const verificationArchive = new AdmZip(stagedServerArchivePath);
if (!verificationArchive.getEntry('LSPServer/SdkLspServer.dll')) {
  throw new Error(`Archive '${stagedServerArchivePath}' does not contain 'LSPServer/SdkLspServer.dll'.`);
}

const sdkPackageName = path.basename(sdkPackagePath);
mkdirSync(assetDirectory, { recursive: true });
const sdkDestinationPath = path.join(assetDirectory, sdkPackageName);
if (path.resolve(sdkPackagePath) !== path.resolve(sdkDestinationPath)) {
  copyFileSync(sdkPackagePath, sdkDestinationPath);
}

for (const fileName of readdirSync(assetDirectory)) {
  if (fileName.startsWith('Microsoft.Azure.Workflows.Sdk.') && fileName.endsWith('.nupkg') && fileName !== sdkPackageName) {
    rmSync(path.join(assetDirectory, fileName), { force: true });
  }
}

copyFileSync(stagedServerArchivePath, serverArchivePath);

const manifest = {
  serverArchive: path.basename(serverArchivePath),
  serverSha256: sha256(serverArchivePath),
  sdkPackage: sdkPackageName,
  sdkSha256: sha256(sdkDestinationPath),
};
writeFileSync(stagedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
renameSync(stagedManifestPath, manifestPath);

console.log(`Created '${serverArchivePath}'.`);
console.log(`Bundled SDK '${sdkPackageName}'.`);
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

  const existingPackages = existsSync(assetDirectory)
    ? readdirSync(assetDirectory)
        .filter((fileName) => fileName.startsWith('Microsoft.Azure.Workflows.Sdk.') && fileName.endsWith('.nupkg'))
        .map((fileName) => path.join(assetDirectory, fileName))
    : [];
  if (existingPackages.length !== 1) {
    throw new Error(
      `Expected one existing SDK package in '${assetDirectory}', or pass '--sdk-package <path>'. Found '${existingPackages.length}'.`
    );
  }

  return requireExistingSdkPackage(existingPackages[0]);
}

function requireExistingSdkPackage(packagePath) {
  const resolvedPath = path.resolve(packagePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`SDK package '${resolvedPath}' does not exist.`);
  }

  if (!path.basename(resolvedPath).match(/^Microsoft\.Azure\.Workflows\.Sdk\..+\.nupkg$/)) {
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
