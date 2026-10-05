/**
 * BizTalk Data Mapper - Custom Editor Provider
 * Provides the webview-based visual mapper editor for .btm files
 */

import * as vscode from 'vscode';
import { type HostToWebviewMessage, isWebviewToHostMessage } from './protocol/mapEditorProtocol';
import * as path from 'path';
import * as fs from 'fs';
import { BtmSerializer } from './schema/btmSerializer';
import { SchemaParser } from './schema/schemaParser';
import { InstanceGenerator } from './schema/instanceGenerator';
import { type MapDocument, type ScriptImplementation, ScriptType } from './model';
import { FunctoidRegistry } from './functoids';
import { Xslt, XmlParser } from 'xslt-processor';
import { CompilerWorkerClient } from './worker/compilerWorkerClient';
import type { CompileResult } from './compiler/xsltCompiler';
import type { SchemaTree } from './model/schemaModel';
import { resolveSchemaDependencies } from './schema/schemaDependencyResolver';
import { resolveLooseSchemaReference } from './schema/schemaReferenceResolver';
import { replaceSchema } from './schema/schemaReplacement';
import {
  applyMapPatches,
  createMapLayoutPrompt,
  createMapPatchValidationContext,
  createMapPrompt,
  parseMapPromptResponse,
} from './copilot/mapPrompt';
import { errorCategory, getDataMapperLogger } from './logger';
import { getSelectedFileDirectory, resolveBrowseDirectory } from './browseLocation';
import { copySchemaToWorkspace, getXsltOutputUri, listWorkspaceSchemas, schemasFolderName } from './workspaceStructure';

export class MapEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'biztalkDataMapper.mapEditor';
  private static readonly LAST_BROWSE_DIRECTORY_KEY = 'dataMapperV3.lastBrowseDirectory';
  private static readonly LAST_SCHEMA_BROWSE_DIRECTORY_KEY = 'dataMapperV3.lastSchemaBrowseDirectory';
  private static activeWebviewPanel: vscode.WebviewPanel | undefined;
  private btmSerializer: BtmSerializer;
  private schemaParser: SchemaParser;
  private instanceGenerator: InstanceGenerator;
  private functoidRegistry: FunctoidRegistry;
  private compilerWorker: CompilerWorkerClient;
  private readonly logger = getDataMapperLogger();
  private nextOperationId = 1;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.btmSerializer = new BtmSerializer();
    this.schemaParser = new SchemaParser();
    this.instanceGenerator = new InstanceGenerator();
    this.functoidRegistry = FunctoidRegistry.getInstance();
    this.compilerWorker = new CompilerWorkerClient(context);
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MapEditorProvider(context);
    const registration = vscode.window.registerCustomEditorProvider(MapEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    });
    return vscode.Disposable.from(registration, provider.compilerWorker);
  }

  public static async executeActiveEditorCommand(type: 'executeCompile' | 'executeTestMap'): Promise<boolean> {
    if (!MapEditorProvider.activeWebviewPanel) {
      return false;
    }
    return MapEditorProvider.activeWebviewPanel.webview.postMessage({ type, data: {} } satisfies HostToWebviewMessage);
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this.logger.info('Opening map editor; parsing BTM document.');
    if (webviewPanel.active) {
      MapEditorProvider.activeWebviewPanel = webviewPanel;
    }
    const viewStateSub = webviewPanel.onDidChangeViewState?.(() => {
      if (webviewPanel.active) {
        MapEditorProvider.activeWebviewPanel = webviewPanel;
      } else if (MapEditorProvider.activeWebviewPanel === webviewPanel) {
        MapEditorProvider.activeWebviewPanel = undefined;
      }
    });
    webviewPanel.title = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };

    // Parse the BTM document
    let mapDoc: MapDocument;
    try {
      let content = document.getText();
      // Strip BOM and normalize encoding issues from UTF-16 files
      content = content.replace(/^\uFEFF/, '').replace(/\0/g, '');
      mapDoc = this.btmSerializer.deserialize(content);
      this.logger.info(
        `BTM parsed: ${mapDoc.pages.length} pages, ${mapDoc.pages.reduce((count, page) => count + page.links.length, 0)} links.`
      );
    } catch (e: any) {
      this.logger.error(`BTM parsing failed (${errorCategory(e)}); details shown in the editor.`);
      vscode.window.showErrorMessage(`Failed to parse .btm file: ${e.message}`);
      mapDoc = this.btmSerializer.createNew('', '', 'Error');
    }

    // Load schemas if possible
    let sourceSchemaTree: SchemaTree | undefined;
    let targetSchemaTree: SchemaTree | undefined;
    const schemaKey = (reference: MapDocument['sourceSchema']) =>
      JSON.stringify({
        location: reference.location || '',
        rootName: reference.rootName || '',
        inlineSchemaXml: reference.inlineSchemaXml || '',
      });
    this.logger.info('Loading source schema and dependencies.');
    try {
      if (mapDoc.sourceSchema.location) {
        const schemaPath = this.resolveSchemaPath(document.uri, mapDoc.sourceSchema.location, mapDoc.sourceSchema.rootName);
        const schemaContent = await this.readFile(schemaPath);
        if (schemaContent) {
          const importedSchemas = await this.resolveSchemaDependencies(schemaContent, schemaPath);
          sourceSchemaTree = this.schemaParser.parseWithImports(schemaContent, schemaPath, importedSchemas, mapDoc.sourceSchema.rootName);
        } else {
          this.logger.warn('Source schema file was not found.');
          vscode.window.showWarningMessage(
            `Source schema not found: ${mapDoc.sourceSchema.location}. Use "Load Source Schema" to select it manually.`
          );
        }
      } else if (mapDoc.sourceSchema.inlineSchemaXml) {
        // Inline/aggregate schema embedded directly in the BTM file
        const importedSchemas = await this.resolveSchemaDependencies(mapDoc.sourceSchema.inlineSchemaXml, document.uri.fsPath);
        sourceSchemaTree = this.schemaParser.parseWithImports(
          mapDoc.sourceSchema.inlineSchemaXml,
          document.uri.fsPath,
          importedSchemas,
          mapDoc.sourceSchema.rootName
        );
      }
    } catch (e: any) {
      this.logger.error(`Source schema loading failed (${errorCategory(e)}); details shown in the editor.`);
      vscode.window.showWarningMessage(`Could not load source schema "${mapDoc.sourceSchema.location || '(inline)'}": ${e.message}`);
    }

    this.logger.info(`Source schema ${sourceSchemaTree ? 'loaded' : 'unavailable'}. Loading target schema and dependencies.`);
    try {
      if (sourceSchemaTree && schemaKey(mapDoc.sourceSchema) === schemaKey(mapDoc.targetSchema)) {
        targetSchemaTree = sourceSchemaTree;
        this.logger.info('Target schema matches source schema; reusing the parsed schema tree.');
      } else if (mapDoc.targetSchema.location) {
        const schemaPath = this.resolveSchemaPath(document.uri, mapDoc.targetSchema.location, mapDoc.targetSchema.rootName);
        const schemaContent = await this.readFile(schemaPath);
        if (schemaContent) {
          const importedSchemas = await this.resolveSchemaDependencies(schemaContent, schemaPath);
          targetSchemaTree = this.schemaParser.parseWithImports(schemaContent, schemaPath, importedSchemas, mapDoc.targetSchema.rootName);
        } else {
          this.logger.warn('Target schema file was not found.');
          vscode.window.showWarningMessage(
            `Target schema not found: ${mapDoc.targetSchema.location}. Use "Load Target Schema" to select it manually.`
          );
        }
      } else if (mapDoc.targetSchema.inlineSchemaXml) {
        // Inline/aggregate schema embedded directly in the BTM file
        const importedSchemas = await this.resolveSchemaDependencies(mapDoc.targetSchema.inlineSchemaXml, document.uri.fsPath);
        targetSchemaTree = this.schemaParser.parseWithImports(
          mapDoc.targetSchema.inlineSchemaXml,
          document.uri.fsPath,
          importedSchemas,
          mapDoc.targetSchema.rootName
        );
      }
    } catch (e: any) {
      this.logger.error(`Target schema loading failed (${errorCategory(e)}); details shown in the editor.`);
      vscode.window.showWarningMessage(`Could not load target schema "${mapDoc.targetSchema.location}": ${e.message}`);
    }

    this.logger.info(`Target schema ${targetSchemaTree ? 'loaded' : 'unavailable'}.`);
    let disposed = false;
    let schemaRequest = 0;
    const schemaCache = new Map<string, SchemaTree | undefined>();
    schemaCache.set(schemaKey(mapDoc.sourceSchema), sourceSchemaTree);
    schemaCache.set(schemaKey(mapDoc.targetSchema), targetSchemaTree);
    const synchronizeSchemas = async (updatedMap: MapDocument, version: number): Promise<void> => {
      const load = async (reference: MapDocument['sourceSchema']) => {
        const key = schemaKey(reference);
        if (schemaCache.has(key)) {
          return schemaCache.get(key);
        }
        try {
          const tree = await this.loadSchemaTree(reference, document.uri);
          schemaCache.set(key, tree);
          return tree;
        } catch (error) {
          this.logger.error(`Schema synchronization failed (${errorCategory(error)}).`);
          if (!disposed && document.version === version) {
            vscode.window.showWarningMessage(`Could not load schema: ${error instanceof Error ? error.message : String(error)}`);
          }
          return undefined;
        }
      };
      const [source, target] = await Promise.all([load(updatedMap.sourceSchema), load(updatedMap.targetSchema)]);
      if (disposed || document.version !== version) {
        return;
      }
      mapDoc = updatedMap;
      sourceSchemaTree = source;
      targetSchemaTree = target;
      await webviewPanel.webview.postMessage({
        type: 'schemaStateChanged',
        data: {
          map: updatedMap,
          sourceSchema: source ?? null,
          targetSchema: target ?? null,
          availableSchemas: await listWorkspaceSchemas(document.uri),
        },
      });
    };
    const refreshAvailableSchemas = async (): Promise<void> => {
      if (disposed) {
        return;
      }
      await webviewPanel.webview.postMessage({
        type: 'schemaStateChanged',
        data: {
          map: mapDoc,
          sourceSchema: sourceSchemaTree ?? null,
          targetSchema: targetSchemaTree ?? null,
          availableSchemas: await listWorkspaceSchemas(document.uri),
        },
      });
    };
    const schemasDirectory = vscode.Uri.joinPath(document.uri, '..', schemasFolderName);
    const schemaWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(schemasDirectory.fsPath, '*.[xX][sS][dD]'));
    schemaWatcher.onDidCreate(refreshAvailableSchemas);
    schemaWatcher.onDidDelete(refreshAvailableSchemas);

    // Prepare initial data
    const initData: HostToWebviewMessage = {
      type: 'init',
      data: {
        map: mapDoc,
        sourceSchema: sourceSchemaTree ?? null,
        targetSchema: targetSchemaTree ?? null,
        availableSchemas: await listWorkspaceSchemas(document.uri),
        functoids: this.functoidRegistry.getAllFunctoids().map((f) => ({
          id: f.id,
          name: f.name,
          category: f.category,
          description: f.description,
          minInputs: f.minInputs,
          maxInputs: f.maxInputs,
          hasOutput: f.hasOutput,
          tooltip: f.tooltip,
        })),
      },
    };
    const copilotContextFiles = new Map<
      string,
      {
        id: string;
        name: string;
        size: number;
        content: string;
      }
    >();
    const addCopilotContextFile = async (uri: vscode.Uri): Promise<boolean> => {
      const id = uri.toString();
      if (copilotContextFiles.has(id)) {
        return true;
      }
      const bytes = await vscode.workspace.fs.readFile(uri);
      if (
        bytes.byteLength > 512 * 1024 ||
        [...copilotContextFiles.values()].reduce((total, file) => total + file.size, 0) + bytes.byteLength > 2 * 1024 * 1024
      ) {
        return false;
      }
      const content = Buffer.from(bytes)
        .toString('utf8')
        .replace(/^\uFEFF/, '');
      if (content.includes('\u0000')) {
        return false;
      }
      copilotContextFiles.set(id, {
        id,
        name: path.basename(uri.fsPath),
        size: bytes.byteLength,
        content,
      });
      return true;
    };
    const postCopilotContext = (message?: string): Thenable<boolean> =>
      webviewPanel.webview.postMessage({
        type: 'copilotContextChanged',
        data: {
          files: [...copilotContextFiles.values()].map(({ id, name, size }) => ({
            id,
            name,
            size,
          })),
          message,
        },
      });

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (candidate) => {
      if (!isWebviewToHostMessage(candidate)) {
        this.logger.warn('Ignoring invalid Data Mapper webview message; contents omitted.');
        return;
      }
      const message = candidate;
      const operation = `${message.type} #${this.nextOperationId++}`;
      const started = Date.now();
      const quiet = message.type === 'ready' || message.type === 'update';
      if (message.type === 'compile' || message.type === 'testMapWithInput') {
        this.logger.show(true);
      }
      if (quiet) {
        this.logger.debug(`${operation} started.`);
      } else {
        this.logger.info(`${operation} started.`);
      }
      try {
        switch (message.type) {
          case 'ready': {
            // Webview is ready, send init data now
            const availableSchemas = await listWorkspaceSchemas(document.uri);
            this.logger.info(`Schemas folder "${schemasDirectory.fsPath}" contains ${availableSchemas.length} .xsd file(s).`);
            if (initData.type === 'init') {
              initData.data.availableSchemas = availableSchemas;
            }
            webviewPanel.webview.postMessage(initData);
            break;
          }
          case 'browseCopilotContext': {
            const selected = await vscode.window.showOpenDialog({
              defaultUri: this.getBrowseDefaultUri(document.uri),
              canSelectMany: true,
              canSelectFiles: true,
              canSelectFolders: false,
              title: 'Add Context Files to Data Mapper Assistant',
              openLabel: 'Add Context',
            });
            if (!selected) {
              break;
            }
            await this.rememberBrowseSelection(selected[0]);
            let skipped = 0;
            for (const uri of selected) {
              if (!(await addCopilotContextFile(uri))) {
                skipped++;
              }
            }
            await postCopilotContext(skipped > 0 ? `${skipped} binary or oversized context file(s) were skipped.` : undefined);
            break;
          }
          case 'removeCopilotContext': {
            copilotContextFiles.delete(message.data.id);
            await postCopilotContext();
            break;
          }
          case 'clearCopilotContext': {
            copilotContextFiles.clear();
            await postCopilotContext();
            break;
          }
          case 'update': {
            const updatedMap = message.data as MapDocument;
            const content = this.btmSerializer.serialize(updatedMap);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
            await vscode.workspace.applyEdit(edit);
            break;
          }
          case 'compile': {
            const result = await this.compileMap(
              this.loadCustomTransform(message.data as MapDocument, document),
              sourceSchemaTree,
              targetSchemaTree
            );
            if (result.success && result.xslt) {
              const xsltUri = await getXsltOutputUri(document.uri);
              await vscode.workspace.fs.writeFile(xsltUri, Buffer.from(result.xslt, 'utf-8'));
              this.logger.info(`${operation}: compiled XSLT saved; opening result.`);
              vscode.window.showInformationMessage(`Map compiled successfully: ${path.basename(xsltUri.fsPath)}`);
              const xsltDoc = await vscode.workspace.openTextDocument(xsltUri);
              await vscode.window.showTextDocument(xsltDoc, vscode.ViewColumn.Beside);
            } else {
              const errorMsg = result.errors.map((e) => e.message).join('\n');
              vscode.window.showErrorMessage(`Compilation errors:\n${errorMsg}`);
            }
            webviewPanel.webview.postMessage({
              type: 'compileResult',
              data: result,
            });
            break;
          }
          case 'loadSchema': {
            const request = ++schemaRequest;
            const version = document.version;
            const isCurrent = () => !disposed && request === schemaRequest && document.version === version;
            let copiedSchemaUri: vscode.Uri | undefined;
            let retainCopiedSchema = false;
            try {
              let relativePath: string;
              if (!message.browse && message.path) {
                const availableSchemas = await listWorkspaceSchemas(document.uri);
                const selectedName = availableSchemas.find((name) => name === message.path);
                if (!selectedName) {
                  throw new Error(`Schema "${message.path}" is not available in the ${schemasFolderName} folder.`);
                }
                relativePath = `${schemasFolderName}/${selectedName}`;
              } else {
                const selectedSchemas = await vscode.window.showOpenDialog({
                  defaultUri: this.getSchemaBrowseDefaultUri(document.uri),
                  canSelectMany: false,
                  filters: { 'XSD Schema': ['xsd'] },
                  title: `Add ${message.side} Schema`,
                });
                if (!selectedSchemas?.length || !isCurrent()) {
                  this.logger.info(`${operation}: schema selection cancelled or superseded.`);
                  break;
                }
                await this.rememberSchemaBrowseSelection(selectedSchemas[0]);
                const copiedSchema = await copySchemaToWorkspace(selectedSchemas[0], document.uri);
                copiedSchemaUri = copiedSchema.uri;
                relativePath = copiedSchema.relativePath;
              }
              if (!isCurrent()) {
                break;
              }
              const reference = { location: relativePath };
              const tree = await this.loadSchemaTree(reference, document.uri);
              if (!isCurrent() || !tree) {
                break;
              }
              const currentMap = this.btmSerializer.deserialize(
                document
                  .getText()
                  .replace(/^\uFEFF/, '')
                  .replace(/\0/g, '')
              );
              const replacement = replaceSchema(currentMap, message.side, tree, {
                ...reference,
                rootName: tree.rootElement.name,
                namespace: tree.targetNamespace,
              });
              const existingSchema = currentMap[`${message.side}Schema`];
              if (existingSchema.location || existingSchema.inlineSchemaXml || replacement.removedLinkCount > 0) {
                const linkImpact =
                  replacement.removedLinkCount > 0
                    ? `Replacing the ${message.side} schema will remove ${replacement.removedLinkCount} unmatched link(s) across all pages. Links whose paths exist in the new schema and all functoids will be preserved.`
                    : 'All existing links and functoids will be preserved.';
                const choice = await vscode.window.showWarningMessage(
                  `Replace the ${message.side} schema with "${path.basename(reference.location)}"? ${linkImpact} This change affects every map page.`,
                  { modal: true },
                  'Replace Schema'
                );
                if (choice !== 'Replace Schema' || !isCurrent()) {
                  this.logger.info(`${operation}: schema replacement cancelled or superseded.`);
                  break;
                }
              }
              if (!isCurrent()) {
                break;
              }
              const edit = new vscode.WorkspaceEdit();
              const replacementXml = this.btmSerializer.serialize(replacement.map);
              edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), replacementXml);
              const key = schemaKey(replacement.map[`${message.side}Schema`]);
              const hadCachedSchema = schemaCache.has(key);
              const previousCachedSchema = schemaCache.get(key);
              schemaCache.set(key, tree);
              let applied = false;
              try {
                applied = await vscode.workspace.applyEdit(edit);
                retainCopiedSchema = applied;
              } finally {
                if (!applied) {
                  this.logger.error(`${operation}: schema replacement edit rejected.`);
                  if (hadCachedSchema) {
                    schemaCache.set(key, previousCachedSchema);
                  } else {
                    schemaCache.delete(key);
                  }
                }
              }
              if (!applied) {
                vscode.window.showErrorMessage('Could not replace schema. The map was not changed.');
              } else if (
                !disposed &&
                document.getText() === replacementXml &&
                (message.side === 'source' ? sourceSchemaTree : targetSchemaTree) !== tree
              ) {
                await synchronizeSchemas(this.btmSerializer.deserialize(replacementXml), document.version);
              }
              if (applied) {
                this.logger.info(`${operation}: schema replaced; removed ${replacement.removedLinkCount} unmatched links.`);
              }
            } catch (error) {
              this.logger.error(`${operation}: schema replacement failed (${errorCategory(error)}).`);
              if (isCurrent()) {
                vscode.window.showErrorMessage(`Failed to replace schema: ${error instanceof Error ? error.message : String(error)}`);
              }
            } finally {
              if (copiedSchemaUri && !retainCopiedSchema) {
                try {
                  await vscode.workspace.fs.delete(copiedSchemaUri);
                } catch (error) {
                  this.logger.warn(`${operation}: failed to remove unused schema copy (${errorCategory(error)}).`);
                }
              }
            }
            break;
          }
          case 'testMap': {
            const inputFile = await vscode.window.showOpenDialog({
              defaultUri: this.getBrowseDefaultUri(document.uri),
              canSelectMany: false,
              filters: { 'XML Files': ['xml'] },
              title: 'Select Test Input XML',
            });
            if (inputFile && inputFile.length > 0) {
              await this.rememberBrowseSelection(inputFile[0]);
              this.logger.info(
                `${operation}: input selected; this command only selects input. Run Test Map from the editor panel to transform.`
              );
              vscode.window.showInformationMessage(`Testing map with: ${inputFile[0].fsPath}`);
            }
            break;
          }
          case 'generateInstance': {
            const side = message.side || 'source';
            let schemaTree = side === 'source' ? sourceSchemaTree : targetSchemaTree;
            if (!schemaTree) {
              try {
                const currentMap = this.btmSerializer.deserialize(
                  document
                    .getText()
                    .replace(/^\uFEFF/, '')
                    .replace(/\0/g, '')
                );
                const reference = side === 'source' ? currentMap.sourceSchema : currentMap.targetSchema;
                schemaTree = await this.loadSchemaTree(reference, document.uri);
                if (side === 'source') {
                  sourceSchemaTree = schemaTree;
                } else {
                  targetSchemaTree = schemaTree;
                }
              } catch (error) {
                this.logger.error(`${operation}: schema loading failed (${errorCategory(error)}).`);
                const detail = error instanceof Error ? `: ${error.message}` : '';
                webviewPanel.webview.postMessage({
                  type: 'instanceGenerated',
                  data: {
                    side,
                    xml: '',
                    error: `Could not load ${side} schema${detail}`,
                  },
                });
                break;
              }
            }
            if (schemaTree) {
              try {
                const map = this.btmSerializer.deserialize(document.getText());
                const xml = this.instanceGenerator.generate(
                  schemaTree,
                  side === 'source' ? map.testValues : undefined,
                  map.options.ignoreNamespacesForLinks
                );
                this.logger.info(`${operation}: instance generated (${Buffer.byteLength(xml)} bytes; contents omitted).`);
                webviewPanel.webview.postMessage({
                  type: 'instanceGenerated',
                  data: { side, xml },
                });
              } catch (error) {
                this.logger.error(`${operation}: instance generation failed (${errorCategory(error)}).`);
                webviewPanel.webview.postMessage({
                  type: 'instanceGenerated',
                  data: { side, xml: '', error: error instanceof Error ? error.message : String(error) },
                });
              }
            } else {
              this.logger.warn(`${operation}: cannot generate an instance without a schema.`);
              webviewPanel.webview.postMessage({
                type: 'instanceGenerated',
                data: { side, xml: '', error: `No ${side} schema loaded` },
              });
            }
            break;
          }
          case 'testMapWithInput': {
            // BizTalk Test Map flow:
            // 1. Validate input against source schema
            // 2. Compile map to XSLT
            // 3. Transform input XML → output XML
            // 4. Validate output against target schema
            // 5. Save output file & report results
            const inputXml = message.data?.inputXml || '';
            const testMessages: string[] = [];

            if (!inputXml) {
              this.logger.warn(`${operation}: stopped because no input XML was provided.`);
              webviewPanel.webview.postMessage({
                type: 'testMapResult',
                data: { output: '', error: 'No input XML provided. Click "Generate Instance" first.' },
              });
              break;
            }

            // Step 1: Validate input XML is well-formed
            this.logger.info(`${operation}: parsing input XML (${Buffer.byteLength(inputXml)} bytes; contents omitted).`);
            try {
              const { XMLParser } = require('fast-xml-parser');
              const validateParser = new XMLParser({ ignoreAttributes: false });
              validateParser.parse(inputXml);
              testMessages.push('✓ Input XML is well-formed');
              this.logger.info(`${operation}: input XML parsing completed.`);
            } catch (parseErr: any) {
              this.logger.error(`${operation}: input XML parsing failed (${errorCategory(parseErr)}).`);
              webviewPanel.webview.postMessage({
                type: 'testMapResult',
                data: { output: '', error: `Input validation failed: XML is not well-formed.\n${parseErr.message}` },
              });
              break;
            }

            // Step 2: Compile map to XSLT
            testMessages.push('• Compiling map to XSLT...');
            this.logger.info(`${operation}: compiling map before transformation.`);
            const compileResult = await this.compileMap(
              this.loadCustomTransform(message.data.map as MapDocument, document),
              sourceSchemaTree,
              targetSchemaTree
            );
            if (!compileResult.success || !compileResult.xslt) {
              this.logger.error(`${operation}: stopped because compilation did not produce XSLT.`);
              const errorMsg = compileResult.errors.map((e) => e.message).join('\n');
              webviewPanel.webview.postMessage({
                type: 'testMapResult',
                data: { output: '', error: `Compilation failed:\n${errorMsg}` },
              });
              break;
            }
            testMessages.push('✓ Map compiled successfully');

            // Save compiled XSLT and test output in the workspace __generated folder
            const btmDir = path.dirname(document.uri.fsPath);
            const btmName = path.basename(document.uri.fsPath, '.btm');
            const xsltUri = await getXsltOutputUri(document.uri);
            const xsltPath = xsltUri.fsPath;
            fs.writeFileSync(xsltPath, compileResult.xslt, 'utf-8');
            this.logger.info(`${operation}: compiled XSLT saved.`);
            testMessages.push(`✓ XSLT saved: ${path.basename(xsltPath)}`);
            const extensionObjectPath = path.join(path.dirname(xsltPath), `${btmName}_extension.xml`);
            if (compileResult.extensionObjectXml?.includes('<ExtensionObject ')) {
              fs.writeFileSync(extensionObjectPath, compileResult.extensionObjectXml, 'utf-8');
              this.logger.info(`${operation}: extension-object configuration saved.`);
            }

            // Step 3: Transform
            testMessages.push('• Performing XSLT transformation...');
            try {
              const outputPath = path.join(path.dirname(xsltPath), `${btmName}_output.xml`);
              let outputXml: string | undefined;

              // Try .NET XslCompiledTransform first (supports msxsl:script)
              const dotnetResult = await this.tryDotNetTransform(
                xsltPath,
                inputXml,
                btmDir,
                fs.existsSync(extensionObjectPath) ? extensionObjectPath : undefined
              );
              if (dotnetResult.success) {
                outputXml = dotnetResult.output;
                testMessages.push('✓ Transform completed (.NET XslCompiledTransform)');
              } else {
                const requiresClrRuntime =
                  compileResult.xslt.includes('urn:schemas-microsoft-com:xslt') ||
                  !!compileResult.extensionObjectXml?.includes('<ExtensionObject ');
                if (requiresClrRuntime) {
                  this.logger.error(`${operation}: .NET transform failed; JavaScript fallback is not supported for this map.`);
                  throw new Error(`.NET transformation failed: ${dotnetResult.error || 'Worker transform failed.'}`);
                }
                // Fall back to JavaScript xslt-processor (strip scripts)
                if (dotnetResult.error) {
                  testMessages.push(`⚠ .NET transform unavailable: ${dotnetResult.error}`);
                }
                testMessages.push('• Falling back to JS transform...');
                this.logger.warn(`${operation}: .NET transform failed; falling back to JavaScript transformation.`);
                const processedXslt = this.preprocessXsltForTestMap(compileResult.xslt, testMessages);

                const xslt = new Xslt();
                const xmlParser = new XmlParser();
                outputXml = await xslt.xsltProcess(xmlParser.xmlParse(inputXml), xmlParser.xmlParse(processedXslt));
              }

              if (!outputXml || outputXml.trim().length === 0) {
                this.logger.error(`${operation}: transformation produced empty output.`);
                webviewPanel.webview.postMessage({
                  type: 'testMapResult',
                  data: { output: '', error: `${testMessages.join('\n')}\n\n✗ Transform produced empty output. Check your map links.` },
                });
                break;
              }
              if (!dotnetResult.success) {
                testMessages.push('✓ Transform completed');
              }

              // Step 4: Validate output is well-formed XML
              const formattedOutput = this.formatXml(outputXml);
              try {
                const { XMLParser } = require('fast-xml-parser');
                const outParser = new XMLParser({ ignoreAttributes: false });
                outParser.parse(formattedOutput);
                this.logger.info(`${operation}: output XML parsing completed.`);
                testMessages.push('✓ Output XML is well-formed');
              } catch (outParseErr: any) {
                this.logger.warn(`${operation}: output XML parsing warning (${errorCategory(outParseErr)}).`);
                testMessages.push(`⚠ Output XML validation warning: ${outParseErr.message}`);
              }

              // Step 5: Save output.xml
              fs.writeFileSync(outputPath, formattedOutput, 'utf-8');
              this.logger.info(`${operation}: output XML saved (${Buffer.byteLength(formattedOutput)} bytes); Test Map succeeded.`);
              testMessages.push(`✓ Output saved: ${btmName}_output.xml`);

              // Open the output file in VS Code
              const outputUri = vscode.Uri.file(outputPath);
              await vscode.window.showTextDocument(outputUri, { viewColumn: vscode.ViewColumn.Beside });

              const resultSummary = `${testMessages.join('\n')}\n\n${'─'.repeat(50)}\n${formattedOutput}`;
              webviewPanel.webview.postMessage({
                type: 'testMapResult',
                data: { output: resultSummary },
              });
              vscode.window.showInformationMessage(`Test Map succeeded. Output: ${btmName}_output.xml`);
            } catch (transformErr: any) {
              this.logger.error(
                `${operation}: transformation or output save failed (${errorCategory(transformErr)}); details returned to the editor.`
              );
              webviewPanel.webview.postMessage({
                type: 'testMapResult',
                data: { output: '', error: `${testMessages.join('\n')}\n\n✗ XSLT transformation failed:\n${transformErr.message}` },
              });
            }
            break;
          }
          case 'browseAssembly': {
            const dllUri = await vscode.window.showOpenDialog({
              defaultUri: this.getBrowseDefaultUri(document.uri),
              canSelectMany: false,
              filters: { '.NET Assembly': ['dll'] },
              title: 'Select .NET Assembly',
            });
            if (dllUri && dllUri.length > 0) {
              await this.rememberBrowseSelection(dllUri[0]);
              const dllPath = dllUri[0].fsPath;
              // Decompile assembly to get classes and methods
              const assemblyInfo = await this.decompileAssembly(dllPath);
              webviewPanel.webview.postMessage({
                type: 'assemblySelected',
                data: { path: dllPath, classes: assemblyInfo },
              });
            }
            break;
          }
          case 'exportXslt': {
            const result = await this.compileMap(
              this.loadCustomTransform(message.data as MapDocument, document),
              sourceSchemaTree,
              targetSchemaTree
            );
            if (result.success && result.xslt) {
              const saveUri = await vscode.window.showSaveDialog({
                defaultUri: await getXsltOutputUri(document.uri),
                filters: { 'XSLT Stylesheet': ['xslt', 'xsl'], 'All Files': ['*'] },
                title: 'Export XSLT',
              });
              if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(result.xslt, 'utf-8'));
                this.logger.info(`${operation}: XSLT export saved.`);
                if (result.extensionObjectXml?.includes('<ExtensionObject ')) {
                  const extensionUri = saveUri.with({
                    path: saveUri.path.replace(/\.(?:xslt|xsl)$/i, '.extension.xml'),
                  });
                  await vscode.workspace.fs.writeFile(extensionUri, Buffer.from(result.extensionObjectXml, 'utf-8'));
                }
                vscode.window.showInformationMessage(`XSLT exported: ${path.basename(saveUri.fsPath)}`);
                const xsltDoc = await vscode.workspace.openTextDocument(saveUri);
                await vscode.window.showTextDocument(xsltDoc, vscode.ViewColumn.Beside);
              }
            } else {
              const errorMsg = result.errors.map((e) => e.message).join('\n');
              vscode.window.showErrorMessage(`Export failed - compilation errors:\n${errorMsg}`);
            }
            break;
          }
          case 'deployToLogicApps': {
            const compileResult = await this.compileMap(
              this.loadCustomTransform(message.data as MapDocument, document),
              sourceSchemaTree,
              targetSchemaTree
            );
            if (!compileResult.success || !compileResult.xslt) {
              const errorMsg = compileResult.errors.map((e) => e.message).join('\n');
              vscode.window.showErrorMessage(`Compile failed:\n${errorMsg}`);
              break;
            }
            await this.deployToLogicApps(compileResult.xslt, document, compileResult.assemblyPaths || []);
            break;
          }
          case 'copilotPrompt': {
            const respond = (data: {
              success: boolean;
              applied: boolean;
              message: string;
              map?: MapDocument;
            }): Thenable<boolean> =>
              webviewPanel.webview.postMessage({
                type: 'copilotResult',
                data,
              });

            try {
              if (!vscode.lm?.selectChatModels) {
                await respond({
                  success: false,
                  applied: false,
                  message: 'Data Mapper Assistant requires a newer version of VS Code.',
                });
                break;
              }

              const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
              const model = models[0];
              if (!model) {
                await respond({
                  success: false,
                  applied: false,
                  message: 'Data Mapper Assistant cannot find a language model. Install or enable GitHub Copilot Chat and sign in.',
                });
                break;
              }

              const originalDocumentVersion = document.version;
              const currentMap = this.btmSerializer.deserialize(
                document
                  .getText()
                  .replace(/^\uFEFF/, '')
                  .replace(/\0/g, '')
              );
              const availableFunctoids = this.functoidRegistry.getAllFunctoids().map((f) => ({
                id: f.id,
                name: f.name,
                category: f.category,
                description: f.description,
                minInputs: f.minInputs,
                maxInputs: f.maxInputs,
                hasOutput: f.hasOutput,
                tooltip: f.tooltip,
              }));
              let prompt = createMapPrompt(
                message.data.prompt,
                currentMap,
                message.data.activePage,
                sourceSchemaTree,
                targetSchemaTree,
                availableFunctoids,
                [...copilotContextFiles.values()].map((file) => ({
                  name: file.name,
                  content: file.content,
                }))
              );
              const tokenCount = await model.countTokens(prompt);
              const layoutOnly = tokenCount > model.maxInputTokens - 1024;
              if (layoutOnly) {
                prompt = createMapLayoutPrompt(message.data.prompt, currentMap, message.data.activePage);
                if ((await model.countTokens(prompt)) > model.maxInputTokens - 1024) {
                  throw new Error(
                    'Even the map page summary exceeds the selected model context window. Use a model with a larger context window.'
                  );
                }
              }

              const messages = [vscode.LanguageModelChatMessage.User(prompt)];
              const promptContextFiles = [...copilotContextFiles.values()].map((file) => ({
                name: file.name,
                content: file.content,
              }));
              const validationContext = createMapPatchValidationContext(
                sourceSchemaTree,
                targetSchemaTree,
                availableFunctoids,
                promptContextFiles
              );
              let plan: ReturnType<typeof parseMapPromptResponse> | undefined;
              let updatedMap: MapDocument | undefined;
              let serialized = '';
              for (let attempt = 0; attempt < 2; attempt++) {
                const response = await model.sendRequest(messages, {}, _token);
                let responseText = '';
                for await (const fragment of response.text) {
                  responseText += fragment;
                }
                try {
                  plan = parseMapPromptResponse(responseText);
                  if (layoutOnly && plan.patches.some((patch) => patch.op !== 'layout')) {
                    throw new Error(
                      'The full map exceeds the model context window. Only layout operations are allowed with the page summary.'
                    );
                  }
                  updatedMap = applyMapPatches(currentMap, plan.patches, validationContext);
                  serialized = this.btmSerializer.serialize(updatedMap);
                  this.btmSerializer.deserialize(serialized);
                  break;
                } catch (validationError) {
                  const validationMessage = validationError instanceof Error ? validationError.message : String(validationError);
                  if (attempt === 1) {
                    if (layoutOnly) {
                      throw new Error(
                        `Only layout requests can use the page summary. Other edits require a model with a larger context window. ${validationMessage}`
                      );
                    }
                    throw validationError;
                  }
                  messages.push(
                    vscode.LanguageModelChatMessage.Assistant(responseText),
                    vscode.LanguageModelChatMessage.User(
                      `Your proposed edit was rejected by the Logic App Data Mapper validator: ${validationMessage}\nCorrect the complete edit plan and return only the replacement JSON object. ${layoutOnly ? 'Only layout operations are allowed; requests that need the full map require a model with a larger context window.' : 'Ensure every functoid and link uses the exact complete shapes and graph invariants in your instructions.'}`
                    )
                  );
                }
              }
              if (!plan || !updatedMap) {
                throw new Error('Data Mapper Assistant did not produce a valid map edit.');
              }
              if (document.version !== originalDocumentVersion) {
                throw new Error('The map changed while Data Mapper Assistant was working. Submit the prompt again using the latest map.');
              }

              const choice = await vscode.window.showInformationMessage(
                `${plan.summary}\n\nData Mapper Assistant proposes ${plan.patches.length} map change(s).`,
                { modal: true },
                'Apply Changes'
              );
              if (choice !== 'Apply Changes') {
                await respond({
                  success: true,
                  applied: false,
                  message: 'Data Mapper Assistant changes were not applied.',
                });
                break;
              }
              if (document.version !== originalDocumentVersion) {
                throw new Error('The map changed before the Data Mapper Assistant edit was applied. Submit the prompt again.');
              }

              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), serialized);
              const applied = await vscode.workspace.applyEdit(edit);
              if (!applied) {
                throw new Error('VS Code could not apply the Data Mapper Assistant changes.');
              }
              await respond({
                success: true,
                applied: true,
                message: plan.summary,
                map: updatedMap,
              });
            } catch (error) {
              this.logger.error(`${operation}: assistant request failed (${errorCategory(error)}); prompt and response omitted.`);
              const messageText = error instanceof Error ? error.message : String(error);
              await respond({
                success: false,
                applied: false,
                message: `Data Mapper Assistant could not update the map: ${messageText}`,
              });
            }
            break;
          }
        }
      } catch (error) {
        this.logger.error(`${operation} failed (${errorCategory(error)}); details shown in the editor.`);
        const detail = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Data Mapper ${message.type} failed: ${detail}`);
        if (message.type === 'testMapWithInput') {
          await webviewPanel.webview.postMessage({ type: 'testMapResult', data: { output: '', error: detail } });
        } else if (message.type === 'compile') {
          await webviewPanel.webview.postMessage({
            type: 'compileResult',
            data: { success: false, errors: [{ message: detail }], warnings: [] },
          });
        }
      } finally {
        if (quiet) {
          this.logger.debug(`${operation} finished in ${Date.now() - started}ms.`);
        } else {
          this.logger.info(`${operation} finished in ${Date.now() - started}ms.`);
        }
      }
    });

    // Load the webview only after its message listener is ready. The webview posts
    // its one-shot ready message as soon as React mounts.
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Update webview when document changes
    const changeDocSub = vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        try {
          const updatedMap = this.btmSerializer.deserialize(e.document.getText());
          if (
            schemaKey(updatedMap.sourceSchema) !== schemaKey(mapDoc.sourceSchema) ||
            schemaKey(updatedMap.targetSchema) !== schemaKey(mapDoc.targetSchema)
          ) {
            await synchronizeSchemas(updatedMap, e.document.version);
            return;
          }
          webviewPanel.webview.postMessage({
            type: 'documentChanged',
            data: updatedMap,
          });
        } catch {
          // Ignore parse errors during editing
        }
      }
    });

    webviewPanel.onDidDispose(() => {
      disposed = true;
      changeDocSub.dispose();
      viewStateSub?.dispose();
      schemaWatcher.dispose();
      if (MapEditorProvider.activeWebviewPanel === webviewPanel) {
        MapEditorProvider.activeWebviewPanel = undefined;
      }
    });
  }

  private loadCustomTransform(map: MapDocument, document: vscode.TextDocument): MapDocument {
    const hydrated = { ...map };
    const baseDirectory = path.dirname(document.uri.fsPath);
    if (map.customXsltPath) {
      const xsltPath = path.resolve(baseDirectory, map.customXsltPath);
      hydrated.customXslt = fs.existsSync(xsltPath) ? fs.readFileSync(xsltPath, 'utf-8') : '';
    }
    if (map.customExtensionXmlPath) {
      const extensionPath = path.resolve(baseDirectory, map.customExtensionXmlPath);
      hydrated.customExtensionXml = fs.existsSync(extensionPath) ? fs.readFileSync(extensionPath, 'utf-8') : '';
    } else if (map.customXsltPath) {
      hydrated.customExtensionXml = '<ExtensionObjects />';
    }
    return hydrated;
  }

  private async compileMap(map: MapDocument, sourceSchema?: SchemaTree, targetSchema?: SchemaTree): Promise<CompileResult> {
    const started = Date.now();
    this.logger.info(`Compilation started: ${map.pages.length} pages; source schema=${!!sourceSchema}; target schema=${!!targetSchema}.`);
    try {
      this.logger.info('Compilation: resolving external assembly metadata.');
      const enrichedMap = await this.enrichExternalAssemblyMetadata(map);
      this.logger.info('Compilation: sending map to compiler worker.');
      const result = await this.compilerWorker.compileMap({ map: enrichedMap, sourceSchema, targetSchema });
      const summary = `Compilation ${result.success ? 'succeeded' : 'failed'} in ${Date.now() - started}ms: ${result.errors.length} errors, ${result.warnings.length} warnings. Diagnostic details are shown in the editor.`;
      if (!result.success) {
        this.logger.error(summary);
      } else if (result.warnings.length) {
        this.logger.warn(summary);
      } else {
        this.logger.info(summary);
      }
      for (const [index, warning] of result.warnings.entries()) {
        this.logger.warn(`Compilation warning ${index + 1}/${result.warnings.length}: ${JSON.stringify(warning)}`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`Compilation failed after ${Date.now() - started}ms (${errorCategory(error)}); details returned to the editor.`);
      const details = error.details ? ` ${error.details}` : '';
      return {
        success: false,
        errors: [
          {
            message: `Compiler worker failed: ${error.message || String(error)}${details}`,
          },
        ],
        warnings: [],
      };
    }
  }

  private async enrichExternalAssemblyMetadata(map: MapDocument): Promise<MapDocument> {
    const enriched = JSON.parse(JSON.stringify(map)) as MapDocument;
    const assemblyCache = new Map<string, Awaited<ReturnType<typeof this.decompileAssembly>>>();
    for (const page of enriched.pages) {
      for (const functoid of page.functoids) {
        const scriptType = functoid.parameters.find((parameter) => parameter.type === 'scriptType')?.value || functoid.scriptType;
        if (scriptType !== 'externalAssembly') {
          continue;
        }

        const existing = functoid.scriptImplementations?.find((implementation) => implementation.type === 'externalAssembly');
        const assemblyPath =
          functoid.parameters.find((parameter) => parameter.type === 'assemblyPath')?.value || existing?.assemblyPath || '';
        const className = functoid.parameters.find((parameter) => parameter.type === 'className')?.value || existing?.className || '';
        const methodName = functoid.parameters.find((parameter) => parameter.type === 'methodName')?.value || existing?.methodName || '';
        if (!assemblyPath || !className || !methodName || existing?.parameterTypes?.length) {
          continue;
        }

        let classes = assemblyCache.get(assemblyPath);
        if (!classes) {
          classes = await this.decompileAssembly(assemblyPath);
          assemblyCache.set(assemblyPath, classes);
        }
        const methods = classes.find((item) => item.className === className)?.methods || [];
        const inputCount =
          functoid.inputLinks?.length ||
          functoid.parameters.filter((parameter) => parameter.type === 'link' || parameter.type === 'constant').length;
        const method =
          methods.find((item) => item.name === methodName && item.parameterTypes.length === inputCount) ||
          methods.find((item) => item.name === methodName);
        if (!method) {
          continue;
        }

        const implementation: ScriptImplementation = existing || {
          type: ScriptType.ExternalAssembly,
          assemblyPath,
          className,
          methodName,
        };
        implementation.parameterTypes = method.parameterTypes;
        implementation.returnType = method.returnType;
        implementation.isStatic = method.isStatic;
        if (!existing) {
          functoid.scriptImplementations = [implementation];
        }
      }
    }
    return enriched;
  }

  /**
   * Attempts XSLT transform using .NET XslCompiledTransform (supports msxsl:script).
   * Returns { success: true, output } on success, or { success: false, error } on failure.
   */
  private async tryDotNetTransform(
    xsltPath: string,
    inputXml: string,
    btmDir: string,
    extensionObjectPath?: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    const started = Date.now();
    this.logger.info('Test Map: starting .NET worker transformation.');
    try {
      const result = await this.compilerWorker.testMap({
        xslt: fs.readFileSync(xsltPath, 'utf-8'),
        inputXml,
        extensionObjectXml:
          extensionObjectPath && fs.existsSync(extensionObjectPath) ? fs.readFileSync(extensionObjectPath, 'utf-8') : undefined,
        workingDirectory: btmDir,
      });
      this.logger.info(
        `Test Map: .NET transformation completed in ${Date.now() - started}ms; ${result.diagnostics.length} diagnostics; output=${Buffer.byteLength(result.outputXml)} bytes.`
      );
      return { success: true, output: result.outputXml };
    } catch (err: any) {
      this.logger.error(
        `Test Map: .NET transformation failed after ${Date.now() - started}ms (${errorCategory(err)}); details returned to the editor.`
      );
      const details = err.details ? ` ${err.details}` : '';
      return { success: false, error: `${err.message || 'Worker transform failed.'}${details}`.substring(0, 500) };
    }
  }

  /**
   * Preprocesses XSLT for Test Map by stripping msxsl:script blocks and replacing
   * script function calls (userCSharp:, userVbNet:, userJScript:) with placeholder values.
   * The xslt-processor library cannot execute C#/VB.NET/JScript code.
   */
  private preprocessXsltForTestMap(xsltContent: string, messages: string[]): string {
    let processed = xsltContent;

    // Extract function names from msxsl:script blocks
    const scriptBlockRegex = /<msxsl:script[^>]*>[\s\S]*?<\/msxsl:script>/gi;
    const scriptBlocks = processed.match(scriptBlockRegex);
    const scriptFunctions = new Map<string, string>(); // functionName → returnType

    if (scriptBlocks) {
      for (const block of scriptBlocks) {
        let match: RegExpExecArray | null;
        const fnRegex = /(?:public|private)?\s+(?:static\s+)?(\w+)\s+(\w+)\s*\(/g;
        while ((match = fnRegex.exec(block)) !== null) {
          const returnType = match[1];
          const fnName = match[2];
          if (fnName !== 'if' && fnName !== 'for' && fnName !== 'while') {
            scriptFunctions.set(fnName, returnType);
          }
        }
      }
      messages.push(`⚠ Map uses ${scriptFunctions.size} C#/script function(s) — using placeholder values for test`);
    }

    // Remove msxsl:script blocks
    processed = processed.replace(scriptBlockRegex, '');

    // Replace script function calls in select expressions with placeholder values
    // Must handle nested parentheses like: userCSharp:Fn(string(x), string(y))
    processed = this.replaceScriptFunctionCalls(processed, scriptFunctions);

    // Remove xmlns declarations for script namespaces if now unused
    // (keep them to avoid namespace resolution errors)

    return processed;
  }

  /**
   * Replaces userCSharp/userVbNet/userJScript function calls with placeholder values.
   * Handles nested parentheses (e.g., userCSharp:Fn(string(x), string(y)))
   */
  private replaceScriptFunctionCalls(xslt: string, scriptFunctions: Map<string, string>): string {
    const prefixPattern = /(?:userCSharp|userVbNet|userJScript):(\w+)\(/g;
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = prefixPattern.exec(xslt)) !== null) {
      const fnName = match[1];
      const startOfArgs = match.index + match[0].length;

      // Find matching closing paren (handle nesting)
      let depth = 1;
      let i = startOfArgs;
      while (i < xslt.length && depth > 0) {
        if (xslt[i] === '(') {
          depth++;
        } else if (xslt[i] === ')') {
          depth--;
        }
        i++;
      }

      const args = xslt.substring(startOfArgs, i - 1);
      // xslt-processor cannot execute msxsl:script. Preserve the useful
      // behavior of the built-in string trim functoids instead of exposing
      // their placeholder text in Test Map output.
      if (fnName === 'StringTrimLeft' || fnName === 'StringTrimRight') {
        result += `${xslt.substring(lastIndex, match.index)}normalize-space(${args})`;
        lastIndex = i;
        continue;
      }

      // Build replacement
      const returnType = scriptFunctions.get(fnName) || 'string';
      let replacement: string;
      switch (returnType.toLowerCase()) {
        case 'int':
        case 'int32':
        case 'int64':
        case 'long':
        case 'short':
        case 'decimal':
        case 'double':
        case 'float':
          replacement = "'0'";
          break;
        case 'bool':
        case 'boolean':
          replacement = "'true'";
          break;
        default:
          replacement = `'[${fnName}]'`;
      }

      result += xslt.substring(lastIndex, match.index) + replacement;
      lastIndex = i; // past the closing paren
    }

    result += xslt.substring(lastIndex);
    return result;
  }

  private formatXml(xml: string): string {
    // Simple XML pretty-printer
    let formatted = '';
    let indent = 0;
    const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }
      formatted += `${'  '.repeat(indent)}${trimmed}\n`;
      if (
        trimmed.startsWith('<') &&
        !trimmed.startsWith('</') &&
        !trimmed.startsWith('<?') &&
        !trimmed.endsWith('/>') &&
        !trimmed.includes('</')
      ) {
        indent++;
      }
    }
    return `<?xml version="1.0" encoding="utf-8"?>\n${formatted.replace(/^<\?xml[^?]*\?>\s*/i, '')}`;
  }

  private async resolveSchemaDependencies(schemaXml: string, schemaPath: string): Promise<Map<string, any>> {
    this.logger.debug('Resolving schema imports/includes.');
    const dependencies = await resolveSchemaDependencies(
      schemaXml,
      schemaPath,
      (dependencyPath) => this.readFile(dependencyPath),
      (containingPath, schemaLocation) => this.resolveSchemaPath(vscode.Uri.file(containingPath), schemaLocation)
    );
    this.logger.debug(`Resolved ${dependencies.size} schema dependencies.`);
    return dependencies;
  }

  private getBrowseDefaultUri(documentUri: vscode.Uri, preferredFilePath?: string): vscode.Uri {
    const rememberedDirectory = this.context.workspaceState?.get<string>(MapEditorProvider.LAST_BROWSE_DIRECTORY_KEY);
    return vscode.Uri.file(resolveBrowseDirectory(documentUri.fsPath, rememberedDirectory, preferredFilePath));
  }

  private async rememberBrowseSelection(selectedUri: vscode.Uri | undefined): Promise<void> {
    if (!selectedUri) {
      return;
    }
    await this.context.workspaceState?.update(MapEditorProvider.LAST_BROWSE_DIRECTORY_KEY, getSelectedFileDirectory(selectedUri.fsPath));
  }

  private getSchemaBrowseDefaultUri(documentUri: vscode.Uri): vscode.Uri {
    const rememberedDirectory = this.context.workspaceState?.get<string>(MapEditorProvider.LAST_SCHEMA_BROWSE_DIRECTORY_KEY);
    return vscode.Uri.file(resolveBrowseDirectory(documentUri.fsPath, rememberedDirectory));
  }

  private async rememberSchemaBrowseSelection(selectedUri: vscode.Uri | undefined): Promise<void> {
    if (!selectedUri) {
      return;
    }
    await this.context.workspaceState?.update(
      MapEditorProvider.LAST_SCHEMA_BROWSE_DIRECTORY_KEY,
      getSelectedFileDirectory(selectedUri.fsPath)
    );
  }

  private async loadSchemaTree(reference: MapDocument['sourceSchema'], documentUri: vscode.Uri): Promise<SchemaTree | undefined> {
    if (reference.location) {
      const schemaPath = this.resolveSchemaPath(documentUri, reference.location, reference.rootName);
      const schemaContent = await this.readFile(schemaPath);
      if (!schemaContent) {
        throw new Error(`Schema file not found: ${reference.location}`);
      }
      const importedSchemas = await this.resolveSchemaDependencies(schemaContent, schemaPath);
      return this.schemaParser.parseWithImports(schemaContent, schemaPath, importedSchemas, reference.rootName);
    }
    if (reference.inlineSchemaXml) {
      const importedSchemas = await this.resolveSchemaDependencies(reference.inlineSchemaXml, documentUri.fsPath);
      return this.schemaParser.parseWithImports(reference.inlineSchemaXml, documentUri.fsPath, importedSchemas, reference.rootName);
    }
    return undefined;
  }

  private resolveSchemaPath(docUri: vscode.Uri, schemaLocation: string, rootName?: string): string {
    if (!schemaLocation) {
      return '';
    }
    if (path.isAbsolute(schemaLocation)) {
      return schemaLocation;
    }
    const docDir = path.dirname(docUri.fsPath);

    // Try exact match first
    let resolved = path.resolve(docDir, schemaLocation);
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    // Try appending .xsd extension
    resolved = path.resolve(docDir, `${schemaLocation}.xsd`);
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    // Try just the filename in the same directory (handles paths like
    // ".\Web References\localhost\Reference.xsd" when the XSD is alongside the BTM)
    const baseName = path.basename(schemaLocation);
    resolved = path.resolve(docDir, baseName);
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    // Try basename with .xsd appended (when location lacks extension)
    if (!baseName.endsWith('.xsd')) {
      resolved = path.resolve(docDir, `${baseName}.xsd`);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    // Handle .NET fully-qualified type names used as schema references in BizTalk
    // e.g. "Microsoft.Samples.BizTalk.Litware.Schemas.EDI.X12_00401_850"
    if (schemaLocation.includes('.') && !schemaLocation.includes('/') && !schemaLocation.includes('\\')) {
      // Try the full dotted name + .xsd (e.g. "Microsoft.Samples...X12_00401_850.xsd")
      resolved = path.resolve(docDir, `${schemaLocation}.xsd`);
      if (fs.existsSync(resolved)) {
        return resolved;
      }

      // Try the short name (last segment after final dot) + .xsd
      const lastDotIdx = schemaLocation.lastIndexOf('.');
      const shortName = schemaLocation.substring(lastDotIdx + 1);
      resolved = path.resolve(docDir, `${shortName}.xsd`);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
      resolved = path.resolve(docDir, shortName);
      if (fs.existsSync(resolved)) {
        return resolved;
      }

      // BizTalk convention: type name often appends "Schema" to the filename
      // e.g. type "CSR_OrderRequestSchema" → file "CSR_OrderRequest.xsd"
      if (shortName.endsWith('Schema')) {
        const stripped = shortName.slice(0, -6); // remove "Schema" suffix
        resolved = path.resolve(docDir, `${stripped}.xsd`);
        if (fs.existsSync(resolved)) {
          return resolved;
        }
      }

      // Scan the directory for any .xsd file whose name ends with the short name
      try {
        const files: string[] = fs.readdirSync(docDir);
        const match = files.find(
          (f: string) =>
            f.endsWith('.xsd') &&
            (f === `${schemaLocation}.xsd` ||
              f === `${shortName}.xsd` ||
              f.endsWith(`.${shortName}.xsd`) ||
              (shortName.endsWith('Schema') && f === `${shortName.slice(0, -6)}.xsd`))
        );
        if (match) {
          return path.resolve(docDir, match);
        }
      } catch {
        /* ignore read errors */
      }
    }

    // Try sibling directories (common BizTalk project layout)
    const parentDir = path.dirname(docDir);
    let siblingDirs: string[] = [];
    try {
      siblingDirs = fs
        .readdirSync(parentDir, { withFileTypes: true })
        .filter((d: any) => d.isDirectory())
        .map((d: any) => path.join(parentDir, d.name));
    } catch {
      /* ignore */
    }

    for (const dir of siblingDirs) {
      resolved = path.join(dir, baseName);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
      if (!baseName.endsWith('.xsd')) {
        resolved = path.join(dir, `${baseName}.xsd`);
        if (fs.existsSync(resolved)) {
          return resolved;
        }
      }
      resolved = path.join(dir, schemaLocation);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    const collectCandidatePaths = (directories: string[]): string[] =>
      directories.flatMap((directory) => {
        try {
          return fs
            .readdirSync(directory, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.xsd'))
            .map((entry) => path.join(directory, entry.name));
        } catch {
          return [];
        }
      });

    const localMatch = resolveLooseSchemaReference(schemaLocation, collectCandidatePaths([docDir]), rootName, (candidatePath) =>
      this.readFileSync(candidatePath)
    );
    if (localMatch) {
      return localMatch;
    }

    const looseMatch = resolveLooseSchemaReference(schemaLocation, collectCandidatePaths(siblingDirs), rootName, (candidatePath) =>
      this.readFileSync(candidatePath)
    );
    if (looseMatch) {
      return looseMatch;
    }

    // Fallback
    return path.resolve(docDir, schemaLocation);
  }

  private readFileSync(filePath: string): string | undefined {
    try {
      const buffer = fs.readFileSync(filePath);
      if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        return buffer.toString('utf16le').replace(/^\uFEFF/, '');
      }
      if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        const swapped = Buffer.from(buffer);
        for (let index = 0; index < swapped.length - 1; index += 2) {
          [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
        }
        return swapped.toString('utf16le').replace(/^\uFEFF/, '');
      }
      return buffer.toString('utf8').replace(/^\uFEFF/, '');
    } catch {
      return undefined;
    }
  }

  private async readFile(filePath: string): Promise<string | undefined> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const buf = Buffer.from(content);

      // Detect UTF-16 LE BOM (FF FE)
      if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        return buf.toString('utf16le').replace(/^\uFEFF/, '');
      }
      // Detect UTF-16 BE BOM (FE FF)
      if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        // Swap bytes for BE -> LE conversion
        for (let i = 0; i < buf.length - 1; i += 2) {
          const tmp = buf[i];
          buf[i] = buf[i + 1];
          buf[i + 1] = tmp;
        }
        return buf.toString('utf16le').replace(/^\uFEFF/, '');
      }
      // Default UTF-8 (strip BOM if present)
      return buf.toString('utf-8').replace(/^\uFEFF/, '');
    } catch {
      return undefined;
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'webview.js'));
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
    <title>Logic App Data Mapper</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        #app { width: 100%; height: 100%; display: flex; flex-direction: column; }
        .loading-screen {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100%; gap: 12px;
        }
        .loading-screen .spinner {
            width: 32px; height: 32px; border: 3px solid var(--vscode-panel-border, #444);
            border-top-color: var(--vscode-focusBorder, #007fd4);
            border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="app">
        <div class="loading-screen">
            <div class="spinner"></div>
            <span>Loading Logic App Data Mapper...</span>
        </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Deploy compiled XSLT to Azure Logic Apps Standard Artifacts/Maps folder.
   * Uses VS Code authentication and Azure REST API + Kudu VFS API.
   */
  private async deployToLogicApps(xslt: string, document: vscode.TextDocument, assemblyPaths: string[]): Promise<void> {
    // Get Azure session via VS Code built-in authentication
    let session: vscode.AuthenticationSession;
    try {
      session = await vscode.authentication.getSession('microsoft', ['https://management.azure.com/.default'], { createIfNone: true });
    } catch (e: any) {
      vscode.window.showErrorMessage(`Azure sign-in failed: ${e.message}. Please install the Azure Account extension and sign in.`);
      return;
    }

    const token = session.accessToken;
    const armBase = 'https://management.azure.com';

    // 1. List subscriptions
    const subscriptions = await this.azureGet(token, `${armBase}/subscriptions?api-version=2022-12-01`);
    if (!subscriptions || !subscriptions.value || subscriptions.value.length === 0) {
      vscode.window.showErrorMessage('No Azure subscriptions found.');
      return;
    }

    const subItems = subscriptions.value.map((s: any) => ({
      label: s.displayName,
      description: s.subscriptionId,
      subscriptionId: s.subscriptionId,
    }));
    const selectedSub = await vscode.window.showQuickPick(subItems, {
      placeHolder: 'Select Azure Subscription',
      title: 'Deploy to Logic Apps - Select Subscription',
    });
    if (!selectedSub) {
      return;
    }
    const subscriptionId = (selectedSub as any).subscriptionId;

    // 2. List Logic Apps Standard (workflow apps) in the subscription
    const appsUrl = `${armBase}/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites?api-version=2022-09-01`;
    const allApps = await this.azureGet(token, appsUrl);
    if (!allApps || !allApps.value) {
      vscode.window.showErrorMessage('Failed to list apps.');
      return;
    }

    // Filter to Logic Apps Standard (kind contains 'workflowapp' or 'functionapp,workflowapp')
    const logicApps = allApps.value.filter((app: any) => app.kind && app.kind.toLowerCase().includes('workflowapp'));

    if (logicApps.length === 0) {
      vscode.window.showErrorMessage('No Logic Apps Standard found in this subscription.');
      return;
    }

    const appItems = logicApps.map((app: any) => ({
      label: app.name,
      description: app.location,
      detail: app.properties?.resourceGroup || '',
      appName: app.name,
      resourceGroup: app.id.split('/')[4], // extract resource group from id
    }));
    const selectedApp = await vscode.window.showQuickPick(appItems, {
      placeHolder: 'Select Logic App Standard',
      title: 'Deploy to Logic Apps - Select App',
    });
    if (!selectedApp) {
      return;
    }
    const appName = (selectedApp as any).appName as string;
    const resourceGroup = (selectedApp as any).resourceGroup as string;

    // 3. Upload XSLT to Artifacts/Maps and assemblies to lib/custom/net472
    const mapFileName = path.basename(document.uri.fsPath).replace(/\.btm$/i, '.xslt');
    const vfsBase = `${armBase}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/extensions/api/vfs/site/wwwroot`;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Deploying to ${appName}...`,
        cancellable: false,
      },
      async (progress) => {
        try {
          // Upload XSLT map
          progress.report({ message: `Uploading ${mapFileName}...` });
          const mapUrl = `${vfsBase}/Artifacts/Maps/${mapFileName}?api-version=2016-08-01`;
          await this.azurePut(token, mapUrl, xslt);

          // Upload referenced assemblies
          const uploadedAssemblies: string[] = [];
          for (const asmPath of assemblyPaths) {
            const fs = require('fs');
            if (!fs.existsSync(asmPath)) {
              vscode.window.showWarningMessage(`Assembly not found, skipping: ${asmPath}`);
              continue;
            }
            const dllName = path.basename(asmPath);
            progress.report({ message: `Uploading assembly ${dllName}...` });
            const dllContent = fs.readFileSync(asmPath);
            const asmUrl = `${vfsBase}/lib/custom/net472/${dllName}?api-version=2016-08-01`;
            await this.azurePutBinary(token, asmUrl, dllContent);
            uploadedAssemblies.push(dllName);
          }

          let msg = `✅ Deployed "${mapFileName}" to "${appName}" → Artifacts/Maps/`;
          if (uploadedAssemblies.length > 0) {
            msg += ` | Assemblies: ${uploadedAssemblies.join(', ')} → lib/custom/net472/`;
          }
          vscode.window.showInformationMessage(msg);
        } catch (e: any) {
          vscode.window.showErrorMessage(`Deploy failed: ${e.message}`);
        }
      }
    );
  }

  private azureGet(token: string, urlStr: string): Promise<any> {
    const https = require('https');
    const { URL } = require('url');
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  private azurePost(token: string, urlStr: string, body: any): Promise<any> {
    const https = require('https');
    const { URL } = require('url');
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const bodyStr = JSON.stringify(body);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      };
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  }

  private azurePut(token: string, urlStr: string, content: string): Promise<void> {
    const https = require('https');
    const { URL } = require('url');
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': Buffer.byteLength(content, 'utf-8'),
          'If-Match': '*',
        },
      };
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Azure API returned ${res.statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.write(content, 'utf-8');
      req.end();
    });
  }

  private azurePutBinary(token: string, urlStr: string, content: Buffer): Promise<void> {
    const https = require('https');
    const { URL } = require('url');
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': content.length,
          'If-Match': '*',
        },
      };
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Azure API returned ${res.statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.write(content);
      req.end();
    });
  }

  /**
   * Decompile a .NET assembly using PowerShell reflection to extract public classes and methods.
   * Returns an array of { className, methods[] } objects.
   */
  private async decompileAssembly(dllPath: string): Promise<
    Array<{
      className: string;
      methods: Array<{ name: string; signature: string; isStatic: boolean; returnType: string; parameterTypes: string[] }>;
    }>
  > {
    const { execFile } = require('child_process');
    const fs = require('fs');
    const os = require('os');

    if (!fs.existsSync(dllPath)) {
      vscode.window.showErrorMessage(`Assembly not found: ${dllPath}`);
      return [];
    }

    // Write PowerShell script to a temp file to avoid quoting issues
    const tmpScript = path.join(os.tmpdir(), `biztalk-mapper-decompile-${Date.now()}.ps1`);
    const psScript = `
param([string]$DllPath)
try {
    # Unblock the file in case it was downloaded from internet (Zone.Identifier ADS)
    Unblock-File -Path $DllPath -ErrorAction SilentlyContinue

    # Use UnsafeLoadFrom to bypass zone check, fallback to LoadFrom
    try {
        $assembly = [System.Reflection.Assembly]::UnsafeLoadFrom($DllPath)
    } catch {
        $assembly = [System.Reflection.Assembly]::LoadFrom($DllPath)
    }

    $result = @()
    # Handle ReflectionTypeLoadException for assemblies with missing dependencies
    try {
        $types = $assembly.GetExportedTypes()
    } catch [System.Reflection.ReflectionTypeLoadException] {
        $types = $_.Exception.Types | Where-Object { $_ -ne $null }
    }

    foreach ($type in $types) {
        if ($type.IsClass -and (-not $type.IsAbstract)) {
            $methods = @()
            foreach ($method in $type.GetMethods([System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::Instance -bor [System.Reflection.BindingFlags]::Static -bor [System.Reflection.BindingFlags]::DeclaredOnly)) {
                if (-not $method.IsSpecialName) {
                    $parameterTypes = @($method.GetParameters() | ForEach-Object { $_.ParameterType.FullName })
                    $params = ($method.GetParameters() | ForEach-Object { $_.ParameterType.Name + " " + $_.Name }) -join ", "
                    $sig = $method.Name + "(" + $params + ")"
                    $methods += @{ name = $method.Name; signature = $sig; isStatic = [bool]$method.IsStatic; returnType = $method.ReturnType.FullName; parameterTypes = $parameterTypes }
                }
            }
            if ($methods.Count -gt 0) {
                $result += @{ className = $type.FullName; methods = $methods }
            }
        }
    }
    if ($result.Count -eq 0) {
        Write-Output "[]"
    } else {
        $result | ConvertTo-Json -Depth 4 -Compress
    }
} catch {
    Write-Output "[]"
}
`;
    fs.writeFileSync(tmpScript, psScript, 'utf-8');

    return new Promise((resolve) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpScript, '-DllPath', dllPath],
        { maxBuffer: 5 * 1024 * 1024, timeout: 30000 },
        (error: any, stdout: string, stderr: string) => {
          // Cleanup temp file
          try {
            fs.unlinkSync(tmpScript);
          } catch {
            // Temporary-file cleanup is best effort.
          }

          if (error) {
            vscode.window.showWarningMessage(`Assembly decompilation failed: ${stderr || error.message}`);
            resolve([]);
            return;
          }

          try {
            const output = stdout.trim();
            if (!output || output === '[]') {
              vscode.window.showWarningMessage('No public classes found in assembly.');
              resolve([]);
              return;
            }
            const parsed = JSON.parse(output);
            // PowerShell returns a single object (not array) when there's only one class
            const classes = Array.isArray(parsed) ? parsed : [parsed];
            resolve(
              classes.map((c: any) => ({
                className: c.className || '',
                methods: (Array.isArray(c.methods) ? c.methods : [c.methods]).filter(Boolean).map((m: any) => ({
                  name: m.name || '',
                  signature: m.signature || m.name || '',
                  isStatic: !!m.isStatic,
                  returnType: m.returnType || 'System.Void',
                  parameterTypes: Array.isArray(m.parameterTypes) ? m.parameterTypes : m.parameterTypes ? [m.parameterTypes] : [],
                })),
              }))
            );
          } catch (parseErr: any) {
            vscode.window.showWarningMessage(`Could not parse assembly info: ${parseErr.message}`);
            resolve([]);
          }
        }
      );
    });
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
