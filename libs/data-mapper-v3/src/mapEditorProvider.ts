/**
 * BizTalk Data Mapper - Custom Editor Provider
 * Provides the webview-based visual mapper editor for .btm files
 */

import * as vscode from 'vscode';
import {
    HostToWebviewMessage,
    isWebviewToHostMessage
} from './protocol/mapEditorProtocol';
import * as path from 'path';
import * as fs from 'fs';
import { BtmSerializer } from './schema/btmSerializer';
import { SchemaParser } from './schema/schemaParser';
import { InstanceGenerator } from './schema/instanceGenerator';
import { MapDocument, ScriptImplementation, ScriptType } from './model';
import { FunctoidRegistry } from './functoids';
import { Xslt, XmlParser } from 'xslt-processor';
import { CompilerWorkerClient } from './worker/compilerWorkerClient';
import { CompileResult } from './compiler/xsltCompiler';
import { SchemaTree } from './model/schemaModel';
import { resolveSchemaDependencies } from './schema/schemaDependencyResolver';
import {
    applyMapPatches,
    createMapPatchValidationContext,
    createMapPrompt,
    parseMapPromptResponse
} from './copilot/mapPrompt';

export class MapEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'biztalkDataMapper.mapEditor';
    private btmSerializer: BtmSerializer;
    private schemaParser: SchemaParser;
    private instanceGenerator: InstanceGenerator;
    private functoidRegistry: FunctoidRegistry;
    private compilerWorker: CompilerWorkerClient;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.btmSerializer = new BtmSerializer();
        this.schemaParser = new SchemaParser();
        this.instanceGenerator = new InstanceGenerator();
        this.functoidRegistry = FunctoidRegistry.getInstance();
        this.compilerWorker = new CompilerWorkerClient(context);
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MapEditorProvider(context);
        const registration = vscode.window.registerCustomEditorProvider(
            MapEditorProvider.viewType,
            provider,
            {
                webviewOptions: { retainContextWhenHidden: true },
                supportsMultipleEditorsPerDocument: false
            }
        );
        return vscode.Disposable.from(registration, provider.compilerWorker);
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview'),
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        };

        // Parse the BTM document
        let mapDoc: MapDocument;
        try {
            let content = document.getText();
            // Strip BOM and normalize encoding issues from UTF-16 files
            content = content.replace(/^\uFEFF/, '').replace(/\0/g, '');
            mapDoc = this.btmSerializer.deserialize(content);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to parse .btm file: ${e.message}`);
            mapDoc = this.btmSerializer.createNew('', '', 'Error');
        }

        // Load schemas if possible
        let sourceSchemaTree: SchemaTree | undefined;
        let targetSchemaTree: SchemaTree | undefined;
        try {
            if (mapDoc.sourceSchema.location) {
                const schemaPath = this.resolveSchemaPath(document.uri, mapDoc.sourceSchema.location);
                const schemaContent = await this.readFile(schemaPath);
                if (schemaContent) {
                    const importedSchemas = await this.resolveSchemaDependencies(
                        schemaContent,
                        schemaPath
                    );
                    sourceSchemaTree = this.schemaParser.parseWithImports(
                        schemaContent,
                        schemaPath,
                        importedSchemas,
                        mapDoc.sourceSchema.rootName
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `Source schema not found: ${mapDoc.sourceSchema.location}. Use "Load Source Schema" to select it manually.`
                    );
                }
            } else if (mapDoc.sourceSchema.inlineSchemaXml) {
                // Inline/aggregate schema embedded directly in the BTM file
                const importedSchemas = await this.resolveSchemaDependencies(
                    mapDoc.sourceSchema.inlineSchemaXml,
                    document.uri.fsPath
                );
                sourceSchemaTree = this.schemaParser.parseWithImports(
                    mapDoc.sourceSchema.inlineSchemaXml,
                    document.uri.fsPath,
                    importedSchemas,
                    mapDoc.sourceSchema.rootName
                );
            }
        } catch (e: any) {
            console.warn(`Could not load source schema: ${e.message}`);
            vscode.window.showWarningMessage(
                `Could not load source schema "${mapDoc.sourceSchema.location || '(inline)'}": ${e.message}`
            );
        }

        try {
            if (mapDoc.targetSchema.location) {
                const schemaPath = this.resolveSchemaPath(document.uri, mapDoc.targetSchema.location);
                const schemaContent = await this.readFile(schemaPath);
                if (schemaContent) {
                    const importedSchemas = await this.resolveSchemaDependencies(
                        schemaContent,
                        schemaPath
                    );
                    targetSchemaTree = this.schemaParser.parseWithImports(
                        schemaContent,
                        schemaPath,
                        importedSchemas,
                        mapDoc.targetSchema.rootName
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `Target schema not found: ${mapDoc.targetSchema.location}. Use "Load Target Schema" to select it manually.`
                    );
                }
            } else if (mapDoc.targetSchema.inlineSchemaXml) {
                // Inline/aggregate schema embedded directly in the BTM file
                const importedSchemas = await this.resolveSchemaDependencies(
                    mapDoc.targetSchema.inlineSchemaXml,
                    document.uri.fsPath
                );
                targetSchemaTree = this.schemaParser.parseWithImports(
                    mapDoc.targetSchema.inlineSchemaXml,
                    document.uri.fsPath,
                    importedSchemas,
                    mapDoc.targetSchema.rootName
                );
            }
        } catch (e: any) {
            console.warn(`Could not load target schema: ${e.message}`);
            vscode.window.showWarningMessage(
                `Could not load target schema "${mapDoc.targetSchema.location}": ${e.message}`
            );
        }

        // Set up the webview HTML
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // Prepare initial data
        const initData: HostToWebviewMessage = {
            type: 'init',
            data: {
                map: mapDoc,
                sourceSchema: sourceSchemaTree ?? null,
                targetSchema: targetSchemaTree ?? null,
                functoids: this.functoidRegistry.getAllFunctoids().map(f => ({
                    id: f.id,
                    name: f.name,
                    category: f.category,
                    description: f.description,
                    minInputs: f.minInputs,
                    maxInputs: f.maxInputs,
                    hasOutput: f.hasOutput,
                    tooltip: f.tooltip
                }))
            }
        };
        const copilotContextFiles = new Map<string, {
            id: string;
            name: string;
            size: number;
            content: string;
        }>();
        const addCopilotContextFile = async (uri: vscode.Uri): Promise<boolean> => {
            const id = uri.toString();
            if (copilotContextFiles.has(id)) {
                return true;
            }
            const bytes = await vscode.workspace.fs.readFile(uri);
            if (bytes.byteLength > 512 * 1024
                || [...copilotContextFiles.values()]
                    .reduce((total, file) => total + file.size, 0) + bytes.byteLength > 2 * 1024 * 1024) {
                return false;
            }
            const content = Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, '');
            if (content.includes('\u0000')) {
                return false;
            }
            copilotContextFiles.set(id, {
                id,
                name: path.basename(uri.fsPath),
                size: bytes.byteLength,
                content
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
                        size
                    })),
                    message
                }
            });

        // Handle messages from webview
        webviewPanel.webview.onDidReceiveMessage(async (candidate) => {
            if (!isWebviewToHostMessage(candidate)) {
                console.warn('Ignoring invalid Data Mapper webview message');
                return;
            }
            const message = candidate;
            switch (message.type) {
                case 'ready': {
                    // Webview is ready, send init data now
                    webviewPanel.webview.postMessage(initData);
                    break;
                }
                case 'browseCopilotContext': {
                    const selected = await vscode.window.showOpenDialog({
                        canSelectMany: true,
                        canSelectFiles: true,
                        canSelectFolders: false,
                        title: 'Add Context Files to Data Mapper Assistant',
                        openLabel: 'Add Context'
                    });
                    if (!selected) {
                        break;
                    }
                    let skipped = 0;
                    for (const uri of selected) {
                        if (!await addCopilotContextFile(uri)) {
                            skipped++;
                        }
                    }
                    await postCopilotContext(skipped > 0
                        ? `${skipped} binary or oversized context file(s) were skipped.`
                        : undefined);
                    break;
                }
                case 'removeCopilotContext':
                    copilotContextFiles.delete(message.data.id);
                    await postCopilotContext();
                    break;
                case 'clearCopilotContext':
                    copilotContextFiles.clear();
                    await postCopilotContext();
                    break;
                case 'update': {
                    const updatedMap = message.data as MapDocument;
                    const content = this.btmSerializer.serialize(updatedMap);
                    const edit = new vscode.WorkspaceEdit();
                    edit.replace(
                        document.uri,
                        new vscode.Range(0, 0, document.lineCount, 0),
                        content
                    );
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
                        const xsltUri = document.uri.with({
                            path: document.uri.path.replace(/\.btm$/, '.xslt')
                        });
                        await vscode.workspace.fs.writeFile(xsltUri, Buffer.from(result.xslt, 'utf-8'));
                        vscode.window.showInformationMessage(`Map compiled successfully: ${path.basename(xsltUri.fsPath)}`);
                        const xsltDoc = await vscode.workspace.openTextDocument(xsltUri);
                        await vscode.window.showTextDocument(xsltDoc, vscode.ViewColumn.Beside);
                    } else {
                        const errorMsg = result.errors.map(e => e.message).join('\n');
                        vscode.window.showErrorMessage(`Compilation errors:\n${errorMsg}`);
                    }
                    webviewPanel.webview.postMessage({
                        type: 'compileResult',
                        data: result
                    });
                    break;
                }
                case 'loadSchema': {
                    const schemaUri = await vscode.window.showOpenDialog({
                        canSelectMany: false,
                        filters: { 'XSD Schema': ['xsd'] },
                        title: `Select ${message.side} Schema`
                    });
                    if (schemaUri && schemaUri.length > 0) {
                        try {
                            const content = await this.readFile(schemaUri[0].fsPath);
                            if (content) {
                                const tree = this.schemaParser.parse(content, schemaUri[0].fsPath);
                                webviewPanel.webview.postMessage({
                                    type: 'schemaLoaded',
                                    data: { side: message.side, schema: tree, path: schemaUri[0].fsPath }
                                });
                            }
                        } catch (e: any) {
                            vscode.window.showErrorMessage(`Failed to parse schema: ${e.message}`);
                        }
                    }
                    break;
                }
                case 'testMap': {
                    const inputFile = await vscode.window.showOpenDialog({
                        canSelectMany: false,
                        filters: { 'XML Files': ['xml'] },
                        title: 'Select Test Input XML'
                    });
                    if (inputFile && inputFile.length > 0) {
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
                                document.getText().replace(/^\uFEFF/, '').replace(/\0/g, '')
                            );
                            const reference = side === 'source'
                                ? currentMap.sourceSchema
                                : currentMap.targetSchema;
                            schemaTree = await this.loadSchemaTree(reference, document.uri);
                            if (side === 'source') {
                                sourceSchemaTree = schemaTree;
                            } else {
                                targetSchemaTree = schemaTree;
                            }
                        } catch (error) {
                            const detail = error instanceof Error ? `: ${error.message}` : '';
                            webviewPanel.webview.postMessage({
                                type: 'instanceGenerated',
                                data: {
                                    side,
                                    xml: '',
                                    error: `Could not load ${side} schema${detail}`
                                }
                            });
                            break;
                        }
                    }
                    if (schemaTree) {
                        const xml = this.instanceGenerator.generate(schemaTree);
                        webviewPanel.webview.postMessage({
                            type: 'instanceGenerated',
                            data: { side, xml }
                        });
                    } else {
                        webviewPanel.webview.postMessage({
                            type: 'instanceGenerated',
                            data: { side, xml: '', error: `No ${side} schema loaded` }
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
                        webviewPanel.webview.postMessage({
                            type: 'testMapResult',
                            data: { output: '', error: 'No input XML provided. Click "Generate Instance" first.' }
                        });
                        break;
                    }

                    // Step 1: Validate input XML is well-formed
                    try {
                        const { XMLParser } = require('fast-xml-parser');
                        const validateParser = new XMLParser({ ignoreAttributes: false });
                        validateParser.parse(inputXml);
                        testMessages.push('✓ Input XML is well-formed');
                    } catch (parseErr: any) {
                        webviewPanel.webview.postMessage({
                            type: 'testMapResult',
                            data: { output: '', error: `Input validation failed: XML is not well-formed.\n${parseErr.message}` }
                        });
                        break;
                    }

                    // Step 2: Compile map to XSLT
                    testMessages.push('• Compiling map to XSLT...');
                    const compileResult = await this.compileMap(
                        this.loadCustomTransform(message.data.map as MapDocument, document),
                        sourceSchemaTree,
                        targetSchemaTree
                    );
                    if (!compileResult.success || !compileResult.xslt) {
                        const errorMsg = compileResult.errors.map(e => e.message).join('\n');
                        webviewPanel.webview.postMessage({
                            type: 'testMapResult',
                            data: { output: '', error: `Compilation failed:\n${errorMsg}` }
                        });
                        break;
                    }
                    testMessages.push('✓ Map compiled successfully');

                    // Save compiled XSLT alongside BTM
                    const btmDir = path.dirname(document.uri.fsPath);
                    const btmName = path.basename(document.uri.fsPath, '.btm');
                    const xsltPath = path.join(btmDir, `${btmName}_output.xslt`);
                    fs.writeFileSync(xsltPath, compileResult.xslt, 'utf-8');
                    testMessages.push(`✓ XSLT saved: ${btmName}_output.xslt`);
                    const extensionObjectPath = path.join(btmDir, `${btmName}_extension.xml`);
                    if (compileResult.extensionObjectXml?.includes('<ExtensionObject ')) {
                        fs.writeFileSync(extensionObjectPath, compileResult.extensionObjectXml, 'utf-8');
                    }

                    // Step 3: Transform
                    testMessages.push('• Performing XSLT transformation...');
                    try {
                        const outputPath = path.join(btmDir, `${btmName}_output.xml`);
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
                                throw new Error(
                                    `.NET transformation failed: ${dotnetResult.error || 'Worker transform failed.'}`
                                );
                            }
                            // Fall back to JavaScript xslt-processor (strip scripts)
                            if (dotnetResult.error) {
                                testMessages.push(`⚠ .NET transform unavailable: ${dotnetResult.error}`);
                            }
                            testMessages.push('• Falling back to JS transform...');
                            const processedXslt = this.preprocessXsltForTestMap(compileResult.xslt, testMessages);

                            const xslt = new Xslt();
                            const xmlParser = new XmlParser();
                            outputXml = await xslt.xsltProcess(
                                xmlParser.xmlParse(inputXml),
                                xmlParser.xmlParse(processedXslt)
                            );
                        }

                        if (!outputXml || outputXml.trim().length === 0) {
                            webviewPanel.webview.postMessage({
                                type: 'testMapResult',
                                data: { output: '', error: testMessages.join('\n') + '\n\n✗ Transform produced empty output. Check your map links.' }
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
                            testMessages.push('✓ Output XML is well-formed');
                        } catch (outParseErr: any) {
                            testMessages.push(`⚠ Output XML validation warning: ${outParseErr.message}`);
                        }

                        // Step 5: Save output.xml
                        fs.writeFileSync(outputPath, formattedOutput, 'utf-8');
                        testMessages.push(`✓ Output saved: ${btmName}_output.xml`);

                        // Open the output file in VS Code
                        const outputUri = vscode.Uri.file(outputPath);
                        vscode.window.showTextDocument(outputUri, { viewColumn: vscode.ViewColumn.Beside });

                        const resultSummary = testMessages.join('\n') + '\n\n' + '─'.repeat(50) + '\n' + formattedOutput;
                        webviewPanel.webview.postMessage({
                            type: 'testMapResult',
                            data: { output: resultSummary }
                        });
                        vscode.window.showInformationMessage(`Test Map succeeded. Output: ${btmName}_output.xml`);
                    } catch (transformErr: any) {
                        webviewPanel.webview.postMessage({
                            type: 'testMapResult',
                            data: { output: '', error: testMessages.join('\n') + `\n\n✗ XSLT transformation failed:\n${transformErr.message}` }
                        });
                    }
                    break;
                }
                case 'browseAssembly': {
                    const dllUri = await vscode.window.showOpenDialog({
                        canSelectMany: false,
                        filters: { '.NET Assembly': ['dll'] },
                        title: 'Select .NET Assembly'
                    });
                    if (dllUri && dllUri.length > 0) {
                        const dllPath = dllUri[0].fsPath;
                        // Decompile assembly to get classes and methods
                        const assemblyInfo = await this.decompileAssembly(dllPath);
                        webviewPanel.webview.postMessage({
                            type: 'assemblySelected',
                            data: { path: dllPath, classes: assemblyInfo }
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
                            defaultUri: document.uri.with({ path: document.uri.path.replace(/\.btm$/, '.xslt') }),
                            filters: { 'XSLT Stylesheet': ['xslt', 'xsl'], 'All Files': ['*'] },
                            title: 'Export XSLT'
                        });
                        if (saveUri) {
                            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(result.xslt, 'utf-8'));
                            if (result.extensionObjectXml?.includes('<ExtensionObject ')) {
                                const extensionUri = saveUri.with({
                                    path: saveUri.path.replace(/\.(?:xslt|xsl)$/i, '.extension.xml')
                                });
                                await vscode.workspace.fs.writeFile(
                                    extensionUri,
                                    Buffer.from(result.extensionObjectXml, 'utf-8')
                                );
                            }
                            vscode.window.showInformationMessage(`XSLT exported: ${path.basename(saveUri.fsPath)}`);
                            const xsltDoc = await vscode.workspace.openTextDocument(saveUri);
                            await vscode.window.showTextDocument(xsltDoc, vscode.ViewColumn.Beside);
                        }
                    } else {
                        const errorMsg = result.errors.map(e => e.message).join('\n');
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
                        const errorMsg = compileResult.errors.map(e => e.message).join('\n');
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
                    }): Thenable<boolean> => webviewPanel.webview.postMessage({
                        type: 'copilotResult',
                        data
                    });

                    try {
                        if (!vscode.lm?.selectChatModels) {
                            await respond({
                                success: false,
                                applied: false,
                                message: 'Data Mapper Assistant requires a newer version of VS Code.'
                            });
                            break;
                        }

                        const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
                        const model = models[0];
                        if (!model) {
                            await respond({
                                success: false,
                                applied: false,
                                message: 'Data Mapper Assistant cannot find a language model. Install or enable GitHub Copilot Chat and sign in.'
                            });
                            break;
                        }

                        const originalDocumentVersion = document.version;
                        const currentMap = this.btmSerializer.deserialize(
                            document.getText().replace(/^\uFEFF/, '').replace(/\0/g, '')
                        );
                        const availableFunctoids = this.functoidRegistry.getAllFunctoids().map(f => ({
                            id: f.id,
                            name: f.name,
                            category: f.category,
                            description: f.description,
                            minInputs: f.minInputs,
                            maxInputs: f.maxInputs,
                            hasOutput: f.hasOutput,
                            tooltip: f.tooltip
                        }));
                        const prompt = createMapPrompt(
                            message.data.prompt,
                            currentMap,
                            message.data.activePage,
                            sourceSchemaTree,
                            targetSchemaTree,
                            availableFunctoids,
                            [...copilotContextFiles.values()].map(file => ({
                                name: file.name,
                                content: file.content
                            }))
                        );
                        const tokenCount = await model.countTokens(prompt);
                        if (tokenCount > model.maxInputTokens - 1024) {
                            throw new Error(
                                `This map needs ${tokenCount} input tokens, but the selected Copilot model supports ${model.maxInputTokens}.`
                            );
                        }

                        const messages = [vscode.LanguageModelChatMessage.User(prompt)];
                        const promptContextFiles = [...copilotContextFiles.values()].map(file => ({
                            name: file.name,
                            content: file.content
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
                                updatedMap = applyMapPatches(
                                    currentMap,
                                    plan.patches,
                                    validationContext
                                );
                                serialized = this.btmSerializer.serialize(updatedMap);
                                this.btmSerializer.deserialize(serialized);
                                break;
                            } catch (validationError) {
                                if (attempt === 1) {
                                    throw validationError;
                                }
                                const validationMessage = validationError instanceof Error
                                    ? validationError.message
                                    : String(validationError);
                                messages.push(
                                    vscode.LanguageModelChatMessage.Assistant(responseText),
                                    vscode.LanguageModelChatMessage.User(
                                        `Your proposed edit was rejected by the Logic App Data Mapper validator: ${validationMessage}\n`
                                        + 'Correct the complete edit plan and return only the replacement JSON object. '
                                        + 'Ensure every functoid and link uses the exact complete shapes and graph invariants in your instructions.'
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
                                message: 'Data Mapper Assistant changes were not applied.'
                            });
                            break;
                        }
                        if (document.version !== originalDocumentVersion) {
                            throw new Error('The map changed before the Data Mapper Assistant edit was applied. Submit the prompt again.');
                        }

                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(
                            document.uri,
                            new vscode.Range(0, 0, document.lineCount, 0),
                            serialized
                        );
                        const applied = await vscode.workspace.applyEdit(edit);
                        if (!applied) {
                            throw new Error('VS Code could not apply the Data Mapper Assistant changes.');
                        }
                        await respond({
                            success: true,
                            applied: true,
                            message: plan.summary,
                            map: updatedMap
                        });
                    } catch (error) {
                        const messageText = error instanceof Error ? error.message : String(error);
                        await respond({
                            success: false,
                            applied: false,
                            message: `Data Mapper Assistant could not update the map: ${messageText}`
                        });
                    }
                    break;
                }
            }
        });

        // Update webview when document changes
        const changeDocSub = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
                try {
                    const updatedMap = this.btmSerializer.deserialize(e.document.getText());
                    webviewPanel.webview.postMessage({
                        type: 'documentChanged',
                        data: updatedMap
                    });
                } catch {
                    // Ignore parse errors during editing
                }
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocSub.dispose();
        });
    }

    private loadCustomTransform(map: MapDocument, document: vscode.TextDocument): MapDocument {
        const hydrated = { ...map };
        const baseDirectory = path.dirname(document.uri.fsPath);
        if (map.customXsltPath) {
            const xsltPath = path.resolve(baseDirectory, map.customXsltPath);
            hydrated.customXslt = fs.existsSync(xsltPath)
                ? fs.readFileSync(xsltPath, 'utf-8')
                : '';
        }
        if (map.customExtensionXmlPath) {
            const extensionPath = path.resolve(baseDirectory, map.customExtensionXmlPath);
            hydrated.customExtensionXml = fs.existsSync(extensionPath)
                ? fs.readFileSync(extensionPath, 'utf-8')
                : '';
        } else if (map.customXsltPath) {
            hydrated.customExtensionXml = '<ExtensionObjects />';
        }
        return hydrated;
    }

    private async compileMap(
        map: MapDocument,
        sourceSchema?: SchemaTree,
        targetSchema?: SchemaTree
    ): Promise<CompileResult> {
        try {
            const enrichedMap = await this.enrichExternalAssemblyMetadata(map);
            return await this.compilerWorker.compileMap({ map: enrichedMap, sourceSchema, targetSchema });
        } catch (error: any) {
            const details = error.details ? ` ${error.details}` : '';
            return {
                success: false,
                errors: [{
                    message: `Compiler worker failed: ${error.message || String(error)}${details}`
                }],
                warnings: []
            };
        }
    }

    private async enrichExternalAssemblyMetadata(map: MapDocument): Promise<MapDocument> {
        const enriched = JSON.parse(JSON.stringify(map)) as MapDocument;
        const assemblyCache = new Map<string, Awaited<ReturnType<typeof this.decompileAssembly>>>();
        for (const page of enriched.pages) {
            for (const functoid of page.functoids) {
                const scriptType = functoid.parameters.find(parameter => parameter.type === 'scriptType')?.value
                    || functoid.scriptType;
                if (scriptType !== 'externalAssembly') { continue; }

                const existing = functoid.scriptImplementations?.find(
                    implementation => implementation.type === 'externalAssembly'
                );
                const assemblyPath = functoid.parameters.find(parameter => parameter.type === 'assemblyPath')?.value
                    || existing?.assemblyPath || '';
                const className = functoid.parameters.find(parameter => parameter.type === 'className')?.value
                    || existing?.className || '';
                const methodName = functoid.parameters.find(parameter => parameter.type === 'methodName')?.value
                    || existing?.methodName || '';
                if (!assemblyPath || !className || !methodName || existing?.parameterTypes?.length) {
                    continue;
                }

                let classes = assemblyCache.get(assemblyPath);
                if (!classes) {
                    classes = await this.decompileAssembly(assemblyPath);
                    assemblyCache.set(assemblyPath, classes);
                }
                const methods = classes.find(item => item.className === className)?.methods || [];
                const inputCount = functoid.inputLinks?.length
                    || functoid.parameters.filter(parameter =>
                        parameter.type === 'link' || parameter.type === 'constant'
                    ).length;
                const method = methods.find(item =>
                    item.name === methodName && item.parameterTypes.length === inputCount
                ) || methods.find(item => item.name === methodName);
                if (!method) { continue; }

                const implementation: ScriptImplementation = existing || {
                    type: ScriptType.ExternalAssembly,
                    assemblyPath,
                    className,
                    methodName
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
        try {
            const result = await this.compilerWorker.testMap({
                xslt: fs.readFileSync(xsltPath, 'utf-8'),
                inputXml,
                extensionObjectXml: extensionObjectPath && fs.existsSync(extensionObjectPath)
                    ? fs.readFileSync(extensionObjectPath, 'utf-8')
                    : undefined,
                workingDirectory: btmDir
            });
            return { success: true, output: result.outputXml };
        } catch (err: any) {
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
        const scriptFnRegex = /(?:public|private)?\s+(?:static\s+)?(\w+)\s+(\w+)\s*\(/g;
        const scriptBlockRegex = /<msxsl:script[^>]*>[\s\S]*?<\/msxsl:script>/gi;
        const scriptBlocks = processed.match(scriptBlockRegex);
        const scriptFunctions = new Map<string, string>(); // functionName → returnType

        if (scriptBlocks) {
            for (const block of scriptBlocks) {
                let match;
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
        let match;

        while ((match = prefixPattern.exec(xslt)) !== null) {
            const fnName = match[1];
            const startOfArgs = match.index + match[0].length;

            // Find matching closing paren (handle nesting)
            let depth = 1;
            let i = startOfArgs;
            while (i < xslt.length && depth > 0) {
                if (xslt[i] === '(') depth++;
                else if (xslt[i] === ')') depth--;
                i++;
            }

            const args = xslt.substring(startOfArgs, i - 1);
            // xslt-processor cannot execute msxsl:script. Preserve the useful
            // behavior of the built-in string trim functoids instead of exposing
            // their placeholder text in Test Map output.
            if (fnName === 'StringTrimLeft' || fnName === 'StringTrimRight') {
                result += xslt.substring(lastIndex, match.index) + `normalize-space(${args})`;
                lastIndex = i;
                continue;
            }

            // Build replacement
            const returnType = scriptFunctions.get(fnName) || 'string';
            let replacement: string;
            switch (returnType.toLowerCase()) {
                case 'int': case 'int32': case 'int64': case 'long':
                case 'short': case 'decimal': case 'double': case 'float':
                    replacement = "'0'";
                    break;
                case 'bool': case 'boolean':
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
            if (!trimmed) continue;
            if (trimmed.startsWith('</')) {
                indent = Math.max(0, indent - 1);
            }
            formatted += '  '.repeat(indent) + trimmed + '\n';
            if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') &&
                !trimmed.endsWith('/>') && !trimmed.includes('</')) {
                indent++;
            }
        }
        return '<?xml version="1.0" encoding="utf-8"?>\n' + formatted.replace(/^<\?xml[^?]*\?>\s*/i, '');
    }

    private async resolveSchemaDependencies(
        schemaXml: string,
        schemaPath: string
    ): Promise<Map<string, any>> {
        return resolveSchemaDependencies(
            schemaXml,
            schemaPath,
            dependencyPath => this.readFile(dependencyPath),
            (containingPath, schemaLocation) => this.resolveSchemaPath(
                vscode.Uri.file(containingPath),
                schemaLocation
            )
        );
    }

    private async loadSchemaTree(
        reference: MapDocument['sourceSchema'],
        documentUri: vscode.Uri
    ): Promise<SchemaTree | undefined> {
        if (reference.location) {
            const schemaPath = this.resolveSchemaPath(documentUri, reference.location);
            const schemaContent = await this.readFile(schemaPath);
            if (!schemaContent) {
                throw new Error(`Schema file not found: ${reference.location}`);
            }
            const importedSchemas = await this.resolveSchemaDependencies(
                schemaContent,
                schemaPath
            );
            return this.schemaParser.parseWithImports(
                schemaContent,
                schemaPath,
                importedSchemas,
                reference.rootName
            );
        }
        if (reference.inlineSchemaXml) {
            const importedSchemas = await this.resolveSchemaDependencies(
                reference.inlineSchemaXml,
                documentUri.fsPath
            );
            return this.schemaParser.parseWithImports(
                reference.inlineSchemaXml,
                documentUri.fsPath,
                importedSchemas,
                reference.rootName
            );
        }
        return undefined;
    }

    private resolveSchemaPath(docUri: vscode.Uri, schemaLocation: string): string {
        if (!schemaLocation) { return ''; }
        if (path.isAbsolute(schemaLocation)) {
            return schemaLocation;
        }
        const fs = require('fs');
        const docDir = path.dirname(docUri.fsPath);

        // Try exact match first
        let resolved = path.resolve(docDir, schemaLocation);
        if (fs.existsSync(resolved)) { return resolved; }

        // Try appending .xsd extension
        resolved = path.resolve(docDir, schemaLocation + '.xsd');
        if (fs.existsSync(resolved)) { return resolved; }

        // Try just the filename in the same directory (handles paths like
        // ".\Web References\localhost\Reference.xsd" when the XSD is alongside the BTM)
        const baseName = path.basename(schemaLocation);
        resolved = path.resolve(docDir, baseName);
        if (fs.existsSync(resolved)) { return resolved; }

        // Try basename with .xsd appended (when location lacks extension)
        if (!baseName.endsWith('.xsd')) {
            resolved = path.resolve(docDir, baseName + '.xsd');
            if (fs.existsSync(resolved)) { return resolved; }
        }

        // Handle .NET fully-qualified type names used as schema references in BizTalk
        // e.g. "Microsoft.Samples.BizTalk.Litware.Schemas.EDI.X12_00401_850"
        if (schemaLocation.includes('.') && !schemaLocation.includes('/') && !schemaLocation.includes('\\')) {
            // Try the full dotted name + .xsd (e.g. "Microsoft.Samples...X12_00401_850.xsd")
            resolved = path.resolve(docDir, schemaLocation + '.xsd');
            if (fs.existsSync(resolved)) { return resolved; }

            // Try the short name (last segment after final dot) + .xsd
            const lastDotIdx = schemaLocation.lastIndexOf('.');
            const shortName = schemaLocation.substring(lastDotIdx + 1);
            resolved = path.resolve(docDir, shortName + '.xsd');
            if (fs.existsSync(resolved)) { return resolved; }
            resolved = path.resolve(docDir, shortName);
            if (fs.existsSync(resolved)) { return resolved; }

            // BizTalk convention: type name often appends "Schema" to the filename
            // e.g. type "CSR_OrderRequestSchema" → file "CSR_OrderRequest.xsd"
            if (shortName.endsWith('Schema')) {
                const stripped = shortName.slice(0, -6); // remove "Schema" suffix
                resolved = path.resolve(docDir, stripped + '.xsd');
                if (fs.existsSync(resolved)) { return resolved; }
            }

            // Scan the directory for any .xsd file whose name ends with the short name
            try {
                const files: string[] = fs.readdirSync(docDir);
                const match = files.find((f: string) =>
                    f.endsWith('.xsd') && (
                        f === schemaLocation + '.xsd' ||
                        f === shortName + '.xsd' ||
                        f.endsWith('.' + shortName + '.xsd') ||
                        (shortName.endsWith('Schema') && f === shortName.slice(0, -6) + '.xsd')
                    )
                );
                if (match) { return path.resolve(docDir, match); }
            } catch { /* ignore read errors */ }
        }

        // Try sibling directories (common BizTalk project layout)
        const parentDir = path.dirname(docDir);
        let siblingDirs: string[] = [];
        try {
            siblingDirs = fs.readdirSync(parentDir, { withFileTypes: true })
                .filter((d: any) => d.isDirectory())
                .map((d: any) => path.join(parentDir, d.name));
        } catch { /* ignore */ }

        for (const dir of siblingDirs) {
            resolved = path.join(dir, baseName);
            if (fs.existsSync(resolved)) { return resolved; }
            if (!baseName.endsWith('.xsd')) {
                resolved = path.join(dir, baseName + '.xsd');
                if (fs.existsSync(resolved)) { return resolved; }
            }
            resolved = path.join(dir, schemaLocation);
            if (fs.existsSync(resolved)) { return resolved; }
        }

        // Fallback
        return path.resolve(docDir, schemaLocation);
    }

    private async readFile(filePath: string): Promise<string | undefined> {
        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            const buf = Buffer.from(content);

            // Detect UTF-16 LE BOM (FF FE)
            if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
                return buf.toString('utf16le').replace(/^\uFEFF/, '');
            }
            // Detect UTF-16 BE BOM (FE FF)
            if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
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
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'webview.js')
        );
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
        const https = require('https');
        const fs = require('fs');

        // Get Azure session via VS Code built-in authentication
        let session: vscode.AuthenticationSession;
        try {
            session = await vscode.authentication.getSession('microsoft', [
                'https://management.azure.com/.default'
            ], { createIfNone: true });
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
            subscriptionId: s.subscriptionId
        }));
        const selectedSub = await vscode.window.showQuickPick(subItems, {
            placeHolder: 'Select Azure Subscription',
            title: 'Deploy to Logic Apps - Select Subscription'
        });
        if (!selectedSub) { return; }
        const subscriptionId = (selectedSub as any).subscriptionId;

        // 2. List Logic Apps Standard (workflow apps) in the subscription
        const appsUrl = `${armBase}/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites?api-version=2022-09-01`;
        const allApps = await this.azureGet(token, appsUrl);
        if (!allApps || !allApps.value) {
            vscode.window.showErrorMessage('Failed to list apps.');
            return;
        }

        // Filter to Logic Apps Standard (kind contains 'workflowapp' or 'functionapp,workflowapp')
        const logicApps = allApps.value.filter((app: any) =>
            app.kind && app.kind.toLowerCase().includes('workflowapp')
        );

        if (logicApps.length === 0) {
            vscode.window.showErrorMessage('No Logic Apps Standard found in this subscription.');
            return;
        }

        const appItems = logicApps.map((app: any) => ({
            label: app.name,
            description: app.location,
            detail: app.properties?.resourceGroup || '',
            appName: app.name,
            resourceGroup: app.id.split('/')[4] // extract resource group from id
        }));
        const selectedApp = await vscode.window.showQuickPick(appItems, {
            placeHolder: 'Select Logic App Standard',
            title: 'Deploy to Logic Apps - Select App'
        });
        if (!selectedApp) { return; }
        const appName = (selectedApp as any).appName as string;
        const resourceGroup = (selectedApp as any).resourceGroup as string;

        // 3. Upload XSLT to Artifacts/Maps and assemblies to lib/custom/net472
        const mapFileName = path.basename(document.uri.fsPath).replace(/\.btm$/i, '.xslt');
        const vfsBase = `${armBase}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/extensions/api/vfs/site/wwwroot`;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Deploying to ${appName}...`,
            cancellable: false
        }, async (progress) => {
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
        });
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
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            const req = https.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: string) => { data += chunk; });
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch { resolve(null); }
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
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyStr)
                }
            };
            const req = https.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: string) => { data += chunk; });
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch { resolve(null); }
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
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': Buffer.byteLength(content, 'utf-8'),
                    'If-Match': '*'
                }
            };
            const req = https.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: string) => { data += chunk; });
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
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': content.length,
                    'If-Match': '*'
                }
            };
            const req = https.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: string) => { data += chunk; });
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
    private async decompileAssembly(dllPath: string): Promise<Array<{ className: string; methods: Array<{ name: string; signature: string; isStatic: boolean; returnType: string; parameterTypes: string[] }> }>> {
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
            execFile('powershell.exe',
                ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpScript, '-DllPath', dllPath],
                { maxBuffer: 5 * 1024 * 1024, timeout: 30000 },
                (error: any, stdout: string, stderr: string) => {
                    // Cleanup temp file
                    try { fs.unlinkSync(tmpScript); } catch {}

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
                        resolve(classes.map((c: any) => ({
                            className: c.className || '',
                            methods: (Array.isArray(c.methods) ? c.methods : [c.methods]).filter(Boolean).map((m: any) => ({
                                name: m.name || '',
                                signature: m.signature || m.name || '',
                                isStatic: !!m.isStatic,
                                returnType: m.returnType || 'System.Void',
                                parameterTypes: Array.isArray(m.parameterTypes)
                                    ? m.parameterTypes
                                    : (m.parameterTypes ? [m.parameterTypes] : [])
                            }))
                        })));
                    } catch (parseErr: any) {
                        vscode.window.showWarningMessage(`Could not parse assembly info: ${parseErr.message}`);
                        resolve([]);
                    }
                });
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
