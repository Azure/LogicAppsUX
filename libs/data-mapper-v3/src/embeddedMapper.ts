import * as path from 'path';
import * as vscode from 'vscode';
import { MapEditorProvider } from './mapEditorProvider';
import { disposeDataMapperLogger, errorCategory, getDataMapperLogger } from './logger';
import { LmlDesignTimeRuntimeManager } from './lml/designTimeRuntime';
import { LmlEditorProvider } from './lml/lmlEditorProvider';

export { createWorkspaceMapperProject, findMapperProjects } from './workspaceStructure';
export { addDataMap, importExistingMap } from './projectCommands';
export type { MapCommandOptions } from './projectCommands';

export function registerEmbeddedMapper(
  context: vscode.ExtensionContext,
  viewType: string,
  extensionUri = context.extensionUri,
  lmlViewType?: string
): vscode.Disposable {
  const asAbsolutePath = (relativePath: string) => path.join(extensionUri.fsPath, relativePath);
  const embeddedContext = new Proxy({} as vscode.ExtensionContext, {
    get(_target, property) {
      if (property === 'extensionUri') {
        return extensionUri;
      }
      if (property === 'extensionPath') {
        return extensionUri.fsPath;
      }
      if (property === 'asAbsolutePath') {
        return asAbsolutePath;
      }
      return Reflect.get(context, property, context);
    },
  });
  const disposables = [MapEditorProvider.register(embeddedContext, viewType)];
  if (lmlViewType !== undefined) {
    const logger = getDataMapperLogger();
    const runtimeManager = new LmlDesignTimeRuntimeManager((message) => logger.info(message));
    disposables.push(LmlEditorProvider.register(embeddedContext, runtimeManager, lmlViewType), {
      dispose: () => runtimeManager.dispose().catch((error) => logger.error(`LML runtime disposal failed: ${errorCategory(error)}`)),
    });
  }
  return vscode.Disposable.from(...disposables, { dispose: disposeDataMapperLogger });
}
