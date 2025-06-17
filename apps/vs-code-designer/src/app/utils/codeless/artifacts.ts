import type { Artifacts, IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { artifactsDirectory, mapsDirectory, rulesDirectory, schemasDirectory } from '../../../constants';

/**
 * Creates the Artifacts folder and its subfolders (Maps, Schemas, Rules) in the specified project path.
 * @param {IFunctionWizardContext} context - The context object containing information about the project.
 * @returns A Promise that resolves when the folders are successfully created.
 */
export async function createArtifactsFolder(context: IFunctionWizardContext): Promise<void> {
  fse.mkdirSync(path.join(context.projectPath, artifactsDirectory, mapsDirectory), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, artifactsDirectory, schemasDirectory), { recursive: true });
  fse.mkdirSync(path.join(context.projectPath, artifactsDirectory, rulesDirectory), { recursive: true });
}

/**
 * Retrieves the artifacts in a local project.
 * @param {string} projectPath - The path to the local project.
 * @returns A Promise that resolves to an object containing the artifacts.
 */
export async function getArtifactsInLocalProject(projectPath: string): Promise<Artifacts> {
  const artifacts: Artifacts = {
    maps: {},
    schemas: [],
    rules: [],
  };
  const artifactsPath = path.join(projectPath, artifactsDirectory);
  const mapsPath = path.join(artifactsPath, mapsDirectory);
  const schemasPath = path.join(artifactsPath, schemasDirectory);
  const rulesPath = path.join(artifactsPath, rulesDirectory);

  if (!(await fse.pathExists(projectPath)) || !(await fse.pathExists(artifactsPath))) {
    return artifacts;
  }

  if (await fse.pathExists(mapsPath)) {
    const subPaths: string[] = await fse.readdir(mapsPath);

    for (const subPath of subPaths) {
      const fullPath: string = path.join(mapsPath, subPath);
      const fileStats = await fse.lstat(fullPath);

      if (fileStats.isFile()) {
        const extensionName = path.extname(subPath);
        const name = path.basename(subPath, extensionName);
        const normalizedExtensionName = extensionName.toLowerCase();

        if (!artifacts.maps[normalizedExtensionName]) {
          artifacts.maps[normalizedExtensionName] = [];
        }

        artifacts.maps[normalizedExtensionName].push({
          name,
          fileName: subPath,
          relativePath: path.join(artifactsDirectory, mapsDirectory, subPath),
        });
      }
    }
  }

  if (await fse.pathExists(schemasPath)) {
    const subPaths: string[] = await fse.readdir(schemasPath);

    for (const subPath of subPaths) {
      const fullPath: string = path.join(schemasPath, subPath);
      const fileStats = await fse.lstat(fullPath);

      if (fileStats.isFile()) {
        const extensionName = path.extname(subPath);
        const name = path.basename(subPath, extensionName);

        artifacts.schemas.push({ name, fileName: subPath, relativePath: path.join(artifactsDirectory, schemasDirectory, subPath) });
      }
    }
  }

  if (await fse.pathExists(rulesPath)) {
    const subPaths: string[] = await fse.readdir(rulesPath);

    for (const subPath of subPaths) {
      const fullPath: string = path.join(rulesPath, subPath);
      const fileStats = await fse.lstat(fullPath);

      if (fileStats.isFile()) {
        const extensionName = path.extname(subPath);
        const name = path.basename(subPath, extensionName);

        artifacts.rules.push({ name, fileName: subPath, relativePath: path.join(artifactsDirectory, rulesDirectory, subPath) });
      }
    }
  }

  return artifacts;
}
