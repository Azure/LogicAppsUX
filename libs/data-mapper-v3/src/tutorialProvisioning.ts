import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  getDuplicateSafeName,
  getWorkspaceRootForMap,
  listWorkspaceSchemas,
  readDirectoryNames,
  schemasFolderName,
} from './workspaceStructure';

const preparingProjects = new Set<string>();

export async function prepareTutorialSchemas(
  mapUri: vscode.Uri,
  assertCurrent: () => void
): Promise<{ sourceSchemaPath: string; targetSchemaPath: string; availableSchemas: string[] }> {
  assertCurrent();
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(mapUri);
  if (mapUri.scheme !== 'file' || mapUri.authority || !/\.btm$/i.test(mapUri.fsPath) || !workspaceFolder) {
    throw new Error('Open an empty local BTM map in a workspace to start the tutorial.');
  }
  const projectPath = await fs.promises.realpath(getWorkspaceRootForMap(mapUri).fsPath);
  const workspacePath = await fs.promises.realpath(workspaceFolder.uri.fsPath);
  const relativeProject = path.relative(workspacePath, projectPath);
  if (path.isAbsolute(relativeProject) || relativeProject === '..' || relativeProject.startsWith(`..${path.sep}`)) {
    throw new Error('The mapper project must be inside the current workspace.');
  }
  const mapStat = await fs.promises.lstat(mapUri.fsPath);
  if (!mapStat.isFile() || mapStat.isSymbolicLink()) {
    throw new Error('The tutorial requires a regular BTM map file, not a linked file.');
  }
  const projectKey = process.platform === 'win32' ? projectPath.toLowerCase() : projectPath;
  if (preparingProjects.has(projectKey)) {
    throw new Error('Tutorial preparation is already in progress for this project.');
  }
  preparingProjects.add(projectKey);
  try {
    const schemasPath = path.join(projectPath, schemasFolderName);
    const assertProjectDirectory = async (): Promise<void> => {
      assertCurrent();
      if (path.relative(projectPath, await fs.promises.realpath(getWorkspaceRootForMap(mapUri).fsPath)) !== '') {
        throw new Error('The mapper project location changed during tutorial preparation.');
      }
      assertCurrent();
    };
    const assertSchemasDirectory = async (): Promise<void> => {
      await assertProjectDirectory();
      const stat = await fs.promises.lstat(schemasPath);
      if (!stat.isDirectory() || stat.isSymbolicLink() || path.relative(schemasPath, await fs.promises.realpath(schemasPath)) !== '') {
        throw new Error('The tutorial requires a Schemas directory inside the mapper project, not a linked directory.');
      }
      assertCurrent();
    };
    await assertProjectDirectory();
    try {
      await fs.promises.mkdir(schemasPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
    await assertSchemasDirectory();
    const existingNames = await readDirectoryNames(vscode.Uri.file(schemasPath));
    const provisionSchema = async (rootName: 'TutorialInput' | 'TutorialOutput'): Promise<string> => {
      const content = Buffer.from(
        `<?xml version="1.0" encoding="utf-8"?>\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">\n  <xs:element name="${rootName}">\n    <xs:complexType>\n      <xs:sequence>\n        <xs:element name="Name" type="xs:string" />\n      </xs:sequence>\n    </xs:complexType>\n  </xs:element>\n</xs:schema>\n`,
        'utf8'
      );
      const conflicts: string[] = [];
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = getDuplicateSafeName(rootName, '.xsd', conflicts);
        const fileName = existingNames.find((name) => name.toLowerCase() === candidate.toLowerCase()) ?? candidate;
        const filePath = path.join(schemasPath, fileName);
        await assertSchemasDirectory();
        let stat: fs.Stats | undefined;
        try {
          stat = await fs.promises.lstat(filePath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
        if (!stat) {
          await assertSchemasDirectory();
          try {
            await fs.promises.writeFile(filePath, content, { flag: 'wx' });
            existingNames.push(fileName);
            return fileName;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
              throw error;
            }
          }
          stat = await fs.promises.lstat(filePath);
        }
        if (stat.isFile() && !stat.isSymbolicLink() && stat.size === content.length) {
          const file = await fs.promises.open(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
          try {
            const bytes = Buffer.alloc(content.length + 1);
            const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
            if ((await file.stat()).isFile() && bytesRead === content.length && bytes.subarray(0, bytesRead).equals(content)) {
              return fileName;
            }
          } finally {
            await file.close();
          }
        }
        conflicts.push(candidate);
      }
      throw new Error(`Could not find an available tutorial schema filename for ${rootName}.`);
    };
    const sourceSchemaPath = await provisionSchema('TutorialInput');
    const targetSchemaPath = await provisionSchema('TutorialOutput');
    await assertSchemasDirectory();
    const availableSchemas = await listWorkspaceSchemas(mapUri);
    await assertSchemasDirectory();
    if (!availableSchemas.includes(sourceSchemaPath) || !availableSchemas.includes(targetSchemaPath)) {
      throw new Error('The tutorial schemas are no longer available. Try starting the tutorial again.');
    }
    return { sourceSchemaPath, targetSchemaPath, availableSchemas };
  } finally {
    preparingProjects.delete(projectKey);
  }
}
