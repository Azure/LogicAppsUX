/**
 * BizTalk Data Mapper - XSLT Compiler
 * Compiles MapDocument into XSLT stylesheets matching BizTalk Server output format.
 * 
 * BizTalk XSLT conventions:
 * - Uses namespace-aware XPath: *[local-name()='X' and namespace-uri()='Y']
 * - Source schema prefix: s0, s1, etc.
 * - Target schema prefix: ns0
 * - msxsl:script blocks for functoid implementations (C#)
 * - xsl:variable for functoid outputs
 * - xsl:for-each for repeating records
 * - xsl:if guards for optional elements
 * - exclude-result-prefixes for helper namespaces
 */

import { XMLValidator } from 'fast-xml-parser';
import { create } from 'xmlbuilder2';
import {
    MapDocument,
    MapPage,
    MapLink,
    MapFunctoid,
    LinkEndpointType,
    SourceLinkOption,
    TargetLinkOption
} from '../model';
import { FunctoidDefinition, FunctoidRegistry } from '../functoids';
import { SchemaTree, SchemaNode, SchemaNodeType } from '../model/schemaModel';

export interface CompileResult {
    success: boolean;
    xslt?: string;
    extensionObjectXml?: string;
    errors: CompileError[];
    warnings: CompileWarning[];
    assemblyPaths?: string[];
}

export interface CompileError {
    message: string;
    pageId?: string;
    pageName?: string;
    elementId?: string;
}

export interface CompileWarning {
    message: string;
    pageId?: string;
    pageName?: string;
    elementId?: string;
}

interface ResolvedMapping {
    targetPath: string;
    xpathExpr: string;
    isVariable: boolean;
    variableName?: string;
}

interface FunctoidCompilation {
    variableName: string;
    functoidId: string;
    contextPath?: string;
    selectExpr?: string;
    contentExpr?: string;
    isNodeContent?: boolean; // true when variable produces XML nodes (inline XSLT)
    conditionalTest?: string; // xsl:if test condition (for Value Mapping)
    guardConditions?: string[];
}

interface CallTemplateDefinition {
    name: string;
    parameters: string[];
    definitions: string;
}

type GeneratedFunctoidExpr =
    | { kind: 'select'; value: string; isNodeContent?: boolean }
    | { kind: 'content'; value: string; isNodeContent?: boolean }
    | { kind: 'conditional'; condition: string; value: string };

export class XsltCompiler {
    private registry: FunctoidRegistry;
    private variableCounter: number = 0;
    private scriptFnCounter: number = 0;
    private errors: CompileError[] = [];
    private warnings: CompileWarning[] = [];
    private scriptFunctions: Map<string, string> = new Map();
    private vbScriptFunctions: Map<string, string> = new Map();
    private jscriptFunctions: Map<string, string> = new Map();
    private csharpAssemblyReferences: Set<string> = new Set();
    private vbAssemblyReferences: Set<string> = new Set();
    private jscriptAssemblyReferences: Set<string> = new Set();
    private namedTemplates: Map<string, string> = new Map();
    private assemblyReferences: Set<string> = new Set();
    private externalAssemblyScripts: Array<{
        assemblyName: string;
        className: string;
        methods: Map<string, Set<number>>;
        methodMetadata: Map<string, {
            parameterTypes: string[];
            returnType?: string;
            isStatic?: boolean;
        }>;
        prefix: string;
    }> = [];
    private functoidVarMap: Map<string, string> = new Map();
    private sourceNamespace: string = '';
    private targetNamespace: string = '';
    private sourceQualified: boolean = false;
    private sourceTree?: SchemaTree;
    private targetTree?: SchemaTree;
    private currentMap?: MapDocument;
    private sourceNamespacePrefixes: Map<string, string> = new Map();
    private targetNamespacePrefixes: Map<string, string> = new Map();
    private customExtensionXml?: string;
    private currentPage?: MapPage;
    private diagnosticPageByElementId: Map<string, { id: string; name: string }> = new Map();
    private tableRowContext: Map<string, number> = new Map();
    private activeLoopContexts: Array<{
        functoidId: string;
        sourcePath: string;
    }> = [];
    private variableScopeStack: Array<Set<string>> = [];

    constructor() {
        this.registry = FunctoidRegistry.getInstance();
    }

    public compile(map: MapDocument, sourceSchema?: SchemaTree, targetSchema?: SchemaTree): CompileResult {
        this.errors = [];
        this.warnings = [];
        this.variableCounter = 0;
        this.scriptFnCounter = 0;
        this.functoidVarMap = new Map();
        this.compiledFunctoids = new Map();
        this.scriptFunctions = new Map();
        this.vbScriptFunctions = new Map();
        this.jscriptFunctions = new Map();
        this.csharpAssemblyReferences = new Set();
        this.vbAssemblyReferences = new Set();
        this.jscriptAssemblyReferences = new Set();
        this.namedTemplates = new Map();
        this.assemblyReferences = new Set();
        this.externalAssemblyScripts = [];
        this.tableRowContext = new Map();
        this.activeLoopContexts = [];
        this.variableScopeStack = [new Set()];
        this.diagnosticPageByElementId = new Map();
        this.sourceNamespace = sourceSchema?.targetNamespace || '';
        this.targetNamespace = targetSchema?.targetNamespace || '';
        this.sourceTree = sourceSchema;
        this.targetTree = targetSchema;
        this.currentMap = map;
        this.customExtensionXml = map.customExtensionXml;
        this.sourceNamespacePrefixes = this.collectNamespacePrefixes(sourceSchema, 's');
        this.targetNamespacePrefixes = this.collectNamespacePrefixes(targetSchema, 'ns');
        // When the source schema qualifies local elements, instance children live in the
        // source namespace and must be addressed with the s0: prefix in XPath expressions.
        this.sourceQualified = !!this.sourceNamespace && sourceSchema?.elementFormDefault === 'qualified';
        if (map.customExtensionXml !== undefined && map.customXslt === undefined) {
            this.errors.push({ message: 'Custom extension-object XML requires custom XSLT' });
        }
        if (map.customExtensionXml && XMLValidator.validate(map.customExtensionXml) !== true) {
            this.errors.push({ message: 'Custom extension-object XML contains malformed XML' });
        }
        if (map.customXslt !== undefined) {
            if (XMLValidator.validate(map.customXslt) !== true) {
                this.errors.push({ message: 'Custom XSLT contains malformed XML' });
            }
            return {
                success: this.errors.length === 0,
                xslt: map.customXslt,
                extensionObjectXml: this.generateExtensionObjectXml(),
                errors: this.errors,
                warnings: this.warnings,
                assemblyPaths: []
            };
        }

        try {
            const xslt = this.generateXslt(map, sourceSchema, targetSchema);
            this.attachDiagnosticPages();
            return {
                success: this.errors.length === 0,
                xslt,
                extensionObjectXml: this.generateExtensionObjectXml(),
                errors: this.errors,
                warnings: this.warnings,
                assemblyPaths: Array.from(this.assemblyReferences)
            };
        } catch (e: any) {
            this.errors.push({ message: `Compilation failed: ${e.message}` });
            this.attachDiagnosticPages();
            return {
                success: false,
                extensionObjectXml: this.generateExtensionObjectXml(),
                errors: this.errors,
                warnings: this.warnings,
                assemblyPaths: Array.from(this.assemblyReferences)
            };
        }
    }

    private generateXslt(map: MapDocument, sourceSchema?: SchemaTree, targetSchema?: SchemaTree): string {
        this.validatePageSchemaRoots(map.pages, sourceSchema, targetSchema);
        const page = this.mergePages(map.pages);
        if (!page) {
            this.errors.push({ message: 'Map has no pages' });
            return '';
        }
        const linkGraph = this.buildLinkGraph(page);
        this.currentPage = page;
        this.validateP0Map(page, targetSchema);

        // Determine source root element
        const sourceRoot = sourceSchema?.rootElement?.name || this.inferSourceRootName(page) || 'Root';
        const targetRoot = targetSchema?.rootElement?.name || 'Root';

        // Generate the body first. Functoids are compiled lazily in the source
        // context where their target nodes are emitted.
        let mainBody = '';
        if (targetSchema?.rootElement) {
            mainBody = this.generateTargetElement(targetSchema.rootElement, page, linkGraph, 4);
        } else {
            const targetRootName = this.inferTargetRootName(page) || targetRoot;
            const qualifiedRoot = this.targetQualifiedName(targetRootName, this.targetNamespace);
            mainBody += `    <${qualifiedRoot}>\n`;
            mainBody += this.generateSimpleTarget(page, linkGraph, 6);
            mainBody += `    </${qualifiedRoot}>\n`;
        }

        // Build namespace declarations
        const nsDecls: string[] = [];
        nsDecls.push(`xmlns:xsl="http://www.w3.org/1999/XSL/Transform"`);
        nsDecls.push(`xmlns:msxsl="urn:schemas-microsoft-com:xslt"`);
        nsDecls.push(`xmlns:var="http://schemas.microsoft.com/BizTalk/2003/var"`);

        const excludePrefixes: string[] = ['msxsl', 'var'];

        for (const [namespace, prefix] of this.sourceNamespacePrefixes) {
            nsDecls.push(`xmlns:${prefix}="${namespace}"`);
            excludePrefixes.push(prefix);
        }
        for (const [namespace, prefix] of this.targetNamespacePrefixes) {
            nsDecls.push(`xmlns:${prefix}="${namespace}"`);
        }

        // Check if we need userCSharp script
        const needsScript = this.scriptFunctions.size > 0;
        if (needsScript) {
            nsDecls.push(`xmlns:userCSharp="http://schemas.microsoft.com/BizTalk/2003/userCSharp"`);
            excludePrefixes.push('userCSharp');
        }
        if (page.functoids.some(f =>
            f.functoidId === 376 &&
            page.links.some(link => link.sourceType === LinkEndpointType.Functoid && link.sourceId === f.id)
        ) || this.hasNillableNodes(sourceSchema?.rootElement) ||
            this.hasNillableNodes(targetSchema?.rootElement) ||
            this.hasInheritedNodes(targetSchema?.rootElement)) {
            nsDecls.push(`xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`);
        }

        // Check if we need userVB script
        const needsVbScript = this.vbScriptFunctions.size > 0;
        if (needsVbScript) {
            nsDecls.push(`xmlns:userVB="http://schemas.microsoft.com/BizTalk/2003/userVB"`);
            excludePrefixes.push('userVB');
        }

        // Check if we need userJScript script
        const needsJScript = this.jscriptFunctions.size > 0;
        if (needsJScript) {
            nsDecls.push(`xmlns:userJScript="http://schemas.microsoft.com/BizTalk/2003/userJScript"`);
            excludePrefixes.push('userJScript');
        }

        for (const ext of this.externalAssemblyScripts) {
            nsDecls.push(`xmlns:${ext.prefix}="http://schemas.microsoft.com/BizTalk/2003/${ext.prefix}"`);
            excludePrefixes.push(ext.prefix);
        }

        // Build the XSLT manually for proper BizTalk format
        const encoding = this.escapeXmlAttribute(map.options.xsltEncoding || 'UTF-8');
        const version = map.options.xsltVersion || '1.0';
        let xslt = `<?xml version="1.0" encoding="${encoding}"?>\n`;
        xslt += `<xsl:stylesheet ${nsDecls.join('\n    ')} exclude-result-prefixes="${excludePrefixes.join(' ')}" version="${version}">\n`;
        xslt += `  <xsl:output omit-xml-declaration="${map.options.omitXmlDeclaration ? 'yes' : 'no'}" `
            + `method="${map.options.outputMethod}" version="${version}" encoding="${encoding}" />\n\n`;

        // Root template
        xslt += `  <xsl:template match="/">\n`;
        if (map.options.copyProcessingInstructions) {
            xslt += `    <xsl:apply-templates select="processing-instruction()" />\n`;
        }
        xslt += `    <xsl:apply-templates select="${this.buildSourceRootXPath(sourceRoot)}" />\n`;
        xslt += `  </xsl:template>\n\n`;
        if (map.options.copyProcessingInstructions) {
            xslt += `  <xsl:template match="processing-instruction()">\n`;
            xslt += `    <xsl:copy><xsl:apply-templates select="processing-instruction()" /></xsl:copy>\n`;
            xslt += `  </xsl:template>\n\n`;
        }

        // Main template
        xslt += `  <xsl:template match="${this.buildSourceRootXPath(sourceRoot)}">\n`;
        xslt += mainBody;

        xslt += `  </xsl:template>\n`;

        for (const [, template] of this.namedTemplates) {
            xslt += `\n${template}`;
        }

        // Script block for functoid implementations
        if (needsScript) {
            // Always include IsNumeric helper when math scripts are present
            const hasMathScript = ['MathDivide', 'MathMod', 'MathSqrt']
                .some(fn => this.scriptFunctions.has(fn));
            if (hasMathScript) {
                this.addScriptFunction('IsNumeric', this.getIsNumericScript());
            }

            xslt += `\n  <msxsl:script language="C#" implements-prefix="userCSharp">`;
            if (this.scriptFunctions.has('DatabaseFunctoidScripts')) {
                xslt += `\n    <msxsl:assembly name="Microsoft.BizTalk.BaseFunctoids" />`;
            }
            xslt += this.renderScriptAssemblyReferences(this.csharpAssemblyReferences);
            xslt += `<![CDATA[\n`;
            for (const [, fn] of this.scriptFunctions) {
                xslt += fn + '\n\n';
            }
            xslt += `]]></msxsl:script>\n`;
        }

        // VB.NET script block
        if (needsVbScript) {
            xslt += `\n  <msxsl:script language="VB" implements-prefix="userVB">`;
            xslt += this.renderScriptAssemblyReferences(this.vbAssemblyReferences);
            xslt += `<![CDATA[\n`;
            for (const [, fn] of this.vbScriptFunctions) {
                xslt += fn + '\n\n';
            }
            xslt += `]]></msxsl:script>\n`;
        }

        // JScript script block
        if (needsJScript) {
            xslt += `\n  <msxsl:script language="JScript" implements-prefix="userJScript">`;
            xslt += this.renderScriptAssemblyReferences(this.jscriptAssemblyReferences);
            xslt += `<![CDATA[\n`;
            for (const [, fn] of this.jscriptFunctions) {
                xslt += fn + '\n\n';
            }
            xslt += `]]></msxsl:script>\n`;
        }

        for (const external of this.externalAssemblyScripts) {
            xslt += this.renderExternalAssemblyScript(external);
        }

        xslt += `</xsl:stylesheet>\n`;
        return xslt;
    }

    private validatePageSchemaRoots(
        pages: MapPage[],
        sourceSchema?: SchemaTree,
        targetSchema?: SchemaTree
    ): void {
        for (const page of pages) {
            this.validatePageSchemaRoot(page, 'source', sourceSchema?.rootElement?.name);
            this.validatePageSchemaRoot(page, 'target', targetSchema?.rootElement?.name);
        }
    }

    private validatePageSchemaRoot(
        page: MapPage,
        side: 'source' | 'target',
        loadedRoot?: string
    ): void {
        if (!loadedRoot) { return; }
        const roots = new Set<string>();
        for (const link of page.links) {
            const isSchemaEndpoint = side === 'source'
                ? link.sourceType === LinkEndpointType.SchemaNode
                : link.targetType === LinkEndpointType.SchemaNode;
            const path = side === 'source' ? link.sourcePath : link.targetPath;
            if (!isSchemaEndpoint || !path) { continue; }
            const root = path.split('/').filter(Boolean)[0];
            if (root && root !== loadedRoot) { roots.add(root); }
        }
        for (const root of roots) {
            const sideLabel = side === 'source' ? 'Source' : 'Target';
            this.errors.push({
                message: `[${page.name}] ${sideLabel} links use root '${root}', but the loaded ${side} schema root is '${loadedRoot}'`,
                pageId: page.id,
                pageName: page.name
            });
        }
    }

    private validateP0Map(page: MapPage, targetSchema?: SchemaTree): void {
        for (const functoid of page.functoids) {
            if (functoid.functoidId === 260) {
                this.validateScriptingFunctoid(functoid, page);
            } else if (functoid.functoidId === 424 || functoid.functoidId === 801) {
                this.validateLoopingFunctoid(functoid, page);
            } else if (functoid.functoidId === 703) {
                this.validateTableLoopingFunctoid(functoid, page, targetSchema);
            } else if (functoid.functoidId === 704) {
                this.validateTableExtractorFunctoid(functoid, page);
            } else if (functoid.functoidId === 574 || functoid.functoidId === 575) {
                this.validateDatabaseConsumer(functoid, page);
            }
        }

        if (targetSchema?.rootElement) {
            this.validateTargetLoopPaths(targetSchema.rootElement, page);
            this.validateTargetSchemaSemantics(targetSchema.rootElement, page);
        }
    }

    private validateDatabaseConsumer(functoid: MapFunctoid, page: MapPage): void {
        const firstInput = page.links.find(link =>
            link.targetType === LinkEndpointType.Functoid &&
            link.targetId === functoid.id
        );
        if (!firstInput || firstInput.sourceType !== LinkEndpointType.Functoid) {
            this.errors.push({
                message: `${functoid.name} first input must come from a Database Lookup functoid`,
                elementId: functoid.id
            });
            return;
        }
        const source = page.functoids.find(candidate => candidate.id === firstInput.sourceId);
        if (source?.functoidId !== 524) {
            this.errors.push({
                message: `${functoid.name} first input must come from a Database Lookup functoid`,
                elementId: functoid.id
            });
        }
    }

    private validateTargetSchemaSemantics(node: SchemaNode, page: MapPage): void {
        const nilLinks = page.links.filter(link =>
            link.targetType === LinkEndpointType.SchemaNode &&
            link.targetPath === node.path &&
            this.isFunctoidSource(link, page, 376)
        );
        if (nilLinks.length > 0 && !node.nillable) {
            this.errors.push({
                message: `Nil Value target '${node.name}' is not nillable`,
                elementId: node.path
            });
        }
        if (nilLinks.length > 1) {
            this.errors.push({
                message: `Target '${node.name}' has multiple Nil Value inputs`,
                elementId: node.path
            });
        }
        const massCopyLinks = page.links.filter(link =>
            link.targetType === LinkEndpointType.SchemaNode &&
            link.targetPath === node.path &&
            this.isFunctoidSource(link, page, 802)
        );
        if (massCopyLinks.length > 0) {
            const conflicting = page.links.filter(link =>
                link.targetType === LinkEndpointType.SchemaNode &&
                link.targetPath?.startsWith(`${node.path}/`)
            );
            if (conflicting.length > 0) {
                this.warnings.push({
                    message: `Mass Copy on '${node.name}' suppresses ${conflicting.length} descendant mapping(s)`,
                    elementId: node.path
                });
            }
        }
        const choiceGroups = new Map<string, SchemaNode[]>();
        for (const child of node.children) {
            if (child.choiceGroup) {
                const group = choiceGroups.get(child.choiceGroup) || [];
                group.push(child);
                choiceGroups.set(child.choiceGroup, group);
            }
        }
        for (const children of choiceGroups.values()) {
            const mapped = children.filter(child => this.hasAnyMapping(child, page));
            if (mapped.length > 1) {
                this.errors.push({
                    message: `Choice under '${node.name}' has mappings to multiple branches: ${mapped.map(child => child.name).join(', ')}`,
                    elementId: node.path
                });
            }
        }
        node.children.forEach(child => this.validateTargetSchemaSemantics(child, page));
    }

    private validateLoopingFunctoid(functoid: MapFunctoid, page: MapPage): void {
        const inputLinks = this.findLoopingInputLinks(functoid, page);
        if (inputLinks.length === 0) {
            this.errors.push({
                message: `${functoid.name} requires at least one source schema input`,
                elementId: functoid.id
            });
        }
        if (inputLinks.some(link => !link.sourcePath || !this.findSourceNode(link.sourcePath))) {
            this.errors.push({
                message: `${functoid.name} inputs must resolve to source schema nodes`,
                elementId: functoid.id
            });
        }
    }

    private validateScriptingFunctoid(functoid: MapFunctoid, page: MapPage): void {
        const scriptType = functoid.parameters.find(parameter => parameter.type === 'scriptType')?.value
            || functoid.scriptType;
        const outputLinks = page.links.filter(link =>
            link.sourceType === LinkEndpointType.Functoid && link.sourceId === functoid.id
        );
        if ((scriptType === 'inlineXslt' || scriptType === 'inlineXsltCallTemplate') &&
            outputLinks.some(link => link.targetType !== LinkEndpointType.SchemaNode)) {
            this.errors.push({
                message: 'Inline XSLT functoids may only connect directly to a target schema node',
                elementId: functoid.id
            });
        }
        if (scriptType !== 'externalAssembly') { return; }

        const assembly = functoid.parameters.find(parameter => parameter.type === 'assemblyPath')?.value?.trim();
        const className = functoid.parameters.find(parameter => parameter.type === 'className')?.value?.trim();
        const methodName = functoid.parameters.find(parameter => parameter.type === 'methodName')?.value?.trim();
        if (!assembly) {
            this.errors.push({ message: 'External assembly scripting requires an assembly name or path', elementId: functoid.id });
        }
        if (!className) {
            this.errors.push({ message: 'External assembly scripting requires a class name', elementId: functoid.id });
        }
        if (!methodName) {
            this.errors.push({ message: 'External assembly scripting requires a method name', elementId: functoid.id });
        }
    }

    private validateTableLoopingFunctoid(
        functoid: MapFunctoid,
        page: MapPage,
        targetSchema?: SchemaTree
    ): void {
        const table = functoid.tableLooping;
        if (!table || table.columns < 1 || table.rows.length < 1) {
            this.errors.push({
                message: 'Table Looping requires non-empty table-grid metadata',
                elementId: functoid.id
            });
            return;
        }
        const loopInput = functoid.parameters.find(parameter =>
            parameter.index === 0 && parameter.type === 'link'
        );
        const columnInput = functoid.parameters.find(parameter =>
            parameter.index === 1 && parameter.type === 'constant'
        );
        if (!loopInput || !page.links.some(link =>
            link.id === loopInput.value &&
            link.targetId === functoid.id &&
            link.sourceType === LinkEndpointType.SchemaNode
        )) {
            this.errors.push({
                message: 'Table Looping first input must link to a source schema node',
                elementId: functoid.id
            });
        }
        if (Number.parseInt(columnInput?.value || '', 10) !== table.columns) {
            this.errors.push({
                message: `Table Looping column input must equal grid column count ${table.columns}`,
                elementId: functoid.id
            });
        }

        const gridInputs = new Set(
            functoid.parameters
                .filter(parameter => parameter.index >= 2 && parameter.guid)
                .map(parameter => parameter.guid!.toLowerCase())
        );
        table.rows.forEach((row, rowIndex) => {
            if (row.length !== table.columns) {
                this.errors.push({
                    message: `Table Looping row ${rowIndex + 1} has ${row.length} column(s); expected ${table.columns}`,
                    elementId: functoid.id
                });
            }
            row.forEach((cell, columnIndex) => {
                if (!gridInputs.has(cell.toLowerCase())) {
                    this.errors.push({
                        message: `Table Looping row ${rowIndex + 1}, column ${columnIndex + 1} has no matching input`,
                        elementId: functoid.id
                    });
                }
            });
        });

        const targetLinks = page.links.filter(link =>
            link.sourceType === LinkEndpointType.Functoid &&
            link.sourceId === functoid.id &&
            link.targetType === LinkEndpointType.SchemaNode
        );
        if (targetLinks.length === 0) {
            this.errors.push({
                message: 'Table Looping must connect to a repeating target schema node',
                elementId: functoid.id
            });
        }
        for (const link of targetLinks) {
            const targetNode = link.targetPath && targetSchema
                ? this.findSchemaNode(targetSchema.rootElement, link.targetPath)
                : undefined;
            if (targetNode && targetNode.maxOccurs !== 'unbounded' &&
                !(typeof targetNode.maxOccurs === 'number' && targetNode.maxOccurs > 1)) {
                this.errors.push({
                    message: `Table Looping target '${targetNode.name}' must be repeating`,
                    elementId: functoid.id
                });
            }
        }
    }

    private validateTableExtractorFunctoid(functoid: MapFunctoid, page: MapPage): void {
        const inputs = page.links.filter(link =>
            link.targetType === LinkEndpointType.Functoid && link.targetId === functoid.id
        );
        const tableInputs = inputs.filter(link =>
            link.sourceType === LinkEndpointType.Functoid &&
            page.functoids.some(candidate => candidate.id === link.sourceId && candidate.functoidId === 703)
        );
        const column = Number.parseInt(
            functoid.parameters.find(parameter =>
                parameter.index === 1 && parameter.type === 'constant'
            )?.value || '',
            10
        );
        if (tableInputs.length !== 1) {
            this.errors.push({
                message: 'Table Extractor requires Table Looping table-grid metadata and exactly one Table Looping input',
                elementId: functoid.id
            });
        }
        if (!Number.isInteger(column) || column < 1) {
            this.errors.push({
                message: 'Table Extractor second input must be a positive constant column number',
                elementId: functoid.id
            });
        }
        if (!page.links.some(link =>
            link.sourceType === LinkEndpointType.Functoid &&
            link.sourceId === functoid.id &&
            link.targetType === LinkEndpointType.SchemaNode
        )) {
            this.errors.push({
                message: 'Table Extractor must connect to a target schema node',
                elementId: functoid.id
            });
        }
    }

    private validateTargetLoopPaths(node: SchemaNode, page: MapPage): void {
        const isRepeating = node.maxOccurs === 'unbounded' ||
            (typeof node.maxOccurs === 'number' && node.maxOccurs > 1);
        if (isRepeating) {
            const links = page.links.filter(link =>
                link.targetType === LinkEndpointType.SchemaNode &&
                (link.targetPath === node.path || link.targetPath?.startsWith(`${node.path}/`))
            );
            const hasExplicitLoop = links.some(link =>
                link.targetPath === node.path &&
                link.sourceType === LinkEndpointType.Functoid &&
                page.functoids.some(functoid =>
                    functoid.id === link.sourceId &&
                    (functoid.functoidId === 424 || functoid.functoidId === 801 || functoid.functoidId === 703)
                )
            );
            if (!hasExplicitLoop) {
                const loopPaths = new Set(
                    links.flatMap(link => this.getSourceDependencyPaths(link, page))
                        .map(path => this.findDeepestRepeatingSourcePath(path))
                        .filter((path): path is string => !!path)
                );
                if (loopPaths.size > 1) {
                    this.warnings.push({
                        message: `Target '${node.name}' has multiple source loop paths; their common source ancestor will be used`,
                        elementId: node.path
                    });
                }
            }

            const directives = new Set(
                links.map(link => link.targetLinkOption || TargetLinkOption.Flattening)
                    .filter(option => option !== TargetLinkOption.Flattening)
            );
            if (directives.size > 1) {
                this.warnings.push({
                    message: `Target '${node.name}' has conflicting hierarchy directives; flattening will be used`,
                    elementId: node.path
                });
            }
        }
        node.children.forEach(child => this.validateTargetLoopPaths(child, page));
    }

    private findDeepestRepeatingSourcePath(sourcePath: string): string | undefined {
        const root = this.sourceTree?.rootElement;
        const parts = sourcePath.split('/').filter(Boolean);
        if (!root || parts[0] !== root.name) { return undefined; }
        let current: SchemaNode | undefined = root;
        let repeatingPath: string | undefined;
        for (let index = 1; current && index < parts.length; index++) {
            current = current.children.find(child => child.name === parts[index]);
            if (current && this.isSourceLoopContext(current)) {
                repeatingPath = `/${parts.slice(0, index + 1).join('/')}`;
            }
        }
        return repeatingPath;
    }

    private findSchemaNode(root: SchemaNode, path: string): SchemaNode | undefined {
        const parts = path.split('/').filter(Boolean);
        if (parts[0] !== root.name) { return undefined; }
        let current: SchemaNode | undefined = root;
        for (const part of parts.slice(1)) {
            if (part.startsWith('@')) { return undefined; }
            current = current.children.find(child => child.name === part);
            if (!current) { return undefined; }
        }
        return current;
    }

    /**
     * BizTalk map pages are visual groupings, not separate transformations.
     * Compile all pages into one graph while keeping page-local functoid IDs
     * distinct. Schema-node IDs are paths and must remain unchanged.
     */
    private mergePages(pages: MapPage[]): MapPage | undefined {
        if (pages.length === 0) {
            return undefined;
        }

        const links: MapLink[] = [];
        const functoids: MapFunctoid[] = [];

        pages.forEach((page, pageIndex) => {
            const idMap = new Map<string, string>();
            for (const functoid of page.functoids) {
                const mergedId = pageIndex === 0 ? functoid.id : `${page.id}:${functoid.id}`;
                idMap.set(functoid.id, mergedId);
                this.diagnosticPageByElementId.set(mergedId, { id: page.id, name: page.name });
                functoids.push({
                    ...functoid,
                    id: mergedId,
                    inputLinks: [...functoid.inputLinks],
                    outputLinks: [...functoid.outputLinks]
                });
            }

            for (const link of page.links) {
                const sourceId = link.sourceType === LinkEndpointType.Functoid
                    ? (idMap.get(link.sourceId) || link.sourceId)
                    : link.sourceId;
                const targetId = link.targetType === LinkEndpointType.Functoid
                    ? (idMap.get(link.targetId) || link.targetId)
                    : link.targetId;
                links.push({
                    ...link,
                    sourceId,
                    targetId
                });
            }
        });

        return {
            ...pages[0],
            links,
            functoids
        };
    }

    private attachDiagnosticPages(): void {
        for (const diagnostic of [...this.errors, ...this.warnings]) {
            if (diagnostic.pageId || !diagnostic.elementId) { continue; }
            const page = this.diagnosticPageByElementId.get(diagnostic.elementId);
            if (!page) { continue; }
            diagnostic.pageId = page.id;
            diagnostic.pageName = page.name;
            diagnostic.message = `[${page.name}] ${diagnostic.message}`;
        }
    }

    private buildSourceRootXPath(rootName: string): string {
        if (this.currentMap?.options.ignoreNamespacesForLinks) {
            return `/*[local-name()='${rootName}']`;
        }
        if (this.sourceNamespace) {
            const prefix = this.sourceNamespacePrefixes.get(this.sourceNamespace) || 's0';
            return `/${prefix}:${rootName}`;
        }
        return `/*[local-name()='${rootName}']`;
    }

    private collectNamespacePrefixes(
        tree: SchemaTree | undefined,
        prefixBase: 's' | 'ns'
    ): Map<string, string> {
        const result = new Map<string, string>();
        const add = (namespace: string | undefined): void => {
            if (namespace &&
                namespace !== 'http://www.w3.org/2001/XMLSchema' &&
                !result.has(namespace)) {
                result.set(namespace, `${prefixBase}${result.size}`);
            }
        };
        add(tree?.targetNamespace);
        const visit = (node: SchemaNode | undefined): void => {
            if (!node) { return; }
            add(node.namespace);
            add(node.dataTypeNamespace);
            node.attributes.forEach(attribute => add(attribute.namespace));
            node.children.forEach(visit);
        };
        visit(tree?.rootElement);
        return result;
    }

    private targetQualifiedName(
        name: string,
        namespace?: string
    ): string {
        if (!namespace) { return name; }
        const prefix = this.targetNamespacePrefixes.get(namespace);
        return prefix ? `${prefix}:${name}` : name;
    }

    private buildLinkGraph(page: MapPage): Map<string, MapLink[]> {
        const graph = new Map<string, MapLink[]>();
        for (const link of page.links) {
            const existing = graph.get(link.targetId) || [];
            existing.push(link);
            graph.set(link.targetId, existing);
        }
        return graph;
    }

    private compiledFunctoids: Map<string, FunctoidCompilation> = new Map();

    private compileFunctoid(
        functoid: MapFunctoid,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath?: string
    ): FunctoidCompilation | null {
        const cacheKey = this.functoidCacheKey(functoid.id, contextPath);
        // Return cached result if already compiled (avoids double-allocation)
        const cached = this.compiledFunctoids.get(cacheKey);
        if (cached) { return cached; }

        const def = this.registry.getFunctoid(functoid.functoidId);
        if (!def) {
            this.errors.push({ message: `Unknown functoid: ${functoid.functoidId}`, elementId: functoid.id });
            return null;
        }

        if (functoid.functoidId === 704) {
            const selectExpr = this.compileTableExtractor(functoid, page, linkGraph, contextPath);
            const result: FunctoidCompilation = {
                variableName: `v${++this.variableCounter}`,
                functoidId: functoid.id,
                contextPath,
                selectExpr
            };
            this.functoidVarMap.set(cacheKey, result.variableName);
            this.compiledFunctoids.set(cacheKey, result);
            return result;
        }

        // Resolve inputs
        const inputExprs: string[] = [];
        const incomingLinks = linkGraph.get(functoid.id) || [];
        const usedLinkIds = new Set<string>();

        // Constants first
        for (const param of functoid.parameters) {
            if (param.type === 'constant') {
                inputExprs[param.index] = this.toXPathLiteral(param.value);
            }
        }

        const resolveLink = (
            inLink: MapLink,
            inputIndex: number,
            defaultValue?: string
        ): void => {
            let expr = this.resolveSourceXPath(
                inLink,
                page,
                linkGraph,
                this.requiresNodeInput(functoid.functoidId, inputIndex),
                contextPath
            );
            if (expr) {
                if (!this.requiresNodeInput(functoid.functoidId, inputIndex)) {
                    expr = this.applyInputDefault(expr, defaultValue);
                }
                inputExprs[inputIndex] = expr;
            }
            usedLinkIds.add(inLink.id);
        };

        // Persisted Link parameters define the exact input positions.
        for (const param of functoid.parameters) {
            if (param.type !== 'link') { continue; }
            const inLink = incomingLinks.find(link => link.id === param.value);
            if (inLink) { resolveLink(inLink, param.index, param.defaultValue); }
        }

        const orderedRemainingLinks = [...incomingLinks].sort((left, right) => {
            const leftIndex = (functoid.inputLinks || []).indexOf(left.id);
            const rightIndex = (functoid.inputLinks || []).indexOf(right.id);
            return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
                (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
        });
        for (const inLink of orderedRemainingLinks) {
            if (usedLinkIds.has(inLink.id)) { continue; }
            const emptyIndex = inputExprs.findIndex(value => value === undefined);
            resolveLink(inLink, emptyIndex >= 0 ? emptyIndex : inputExprs.length);
        }

        const resolvedInputs = Array.from({ length: inputExprs.length }, (_, i) => inputExprs[i] || "''");
        const inheritedGuards = incomingLinks.flatMap(link => {
            if (link.sourceType !== LinkEndpointType.Functoid) { return []; }
            const compilation = this.compiledFunctoids.get(
                this.functoidCacheKey(link.sourceId, contextPath)
            );
            return [
                ...(compilation?.guardConditions || []),
                ...(compilation?.conditionalTest ? [compilation.conditionalTest] : [])
            ];
        });
        if (resolvedInputs.length < def.minInputs || resolvedInputs.length > def.maxInputs) {
            this.errors.push({
                message: `${def.name} requires ${def.minInputs === def.maxInputs
                    ? def.minInputs
                    : `${def.minInputs}-${def.maxInputs}`} input(s), but received ${resolvedInputs.length}`,
                elementId: functoid.id
            });
        }

        const varName = `v${++this.variableCounter}`;
        this.functoidVarMap.set(cacheKey, varName);

        // Generate the XSLT expression
        const expr = this.generateFunctoidXsltExpr(def, resolvedInputs, functoid);

        let result: FunctoidCompilation;
        if (expr.kind === 'conditional') {
            result = {
                variableName: varName,
                functoidId: functoid.id,
                contextPath,
                selectExpr: expr.value,
                conditionalTest: expr.condition,
                guardConditions: [...new Set(inheritedGuards)]
            };
        } else if (expr.kind === 'select') {
            result = {
                variableName: varName,
                functoidId: functoid.id,
                contextPath,
                selectExpr: expr.value,
                isNodeContent: expr.isNodeContent,
                guardConditions: [...new Set(inheritedGuards)]
            };
        } else {
            result = {
                variableName: varName,
                functoidId: functoid.id,
                contextPath,
                contentExpr: expr.value,
                isNodeContent: expr.isNodeContent,
                guardConditions: [...new Set(inheritedGuards)]
            };
        }
        this.compiledFunctoids.set(cacheKey, result);
        return result;
    }

    private compileTableExtractor(
        extractor: MapFunctoid,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath?: string
    ): string {
        const loopLink = (linkGraph.get(extractor.id) || []).find(link =>
            link.sourceType === LinkEndpointType.Functoid &&
            page.functoids.some(candidate =>
                candidate.id === link.sourceId && candidate.functoidId === 703
            )
        );
        const tableLoop = loopLink
            ? page.functoids.find(candidate => candidate.id === loopLink.sourceId)
            : undefined;
        if (!tableLoop?.tableLooping || tableLoop.tableLooping.rows.length === 0) {
            this.errors.push({
                message: 'Table Extractor requires Table Looping table-grid metadata',
                elementId: extractor.id
            });
            return "''";
        }

        const columnValue = extractor.parameters.find(parameter =>
            parameter.type === 'constant' && parameter.index === 1
        )?.value;
        const column = Number.parseInt(columnValue || '', 10);
        if (!Number.isInteger(column) || column < 1 || column > tableLoop.tableLooping.columns) {
            this.errors.push({
                message: `Table Extractor column must be between 1 and ${tableLoop.tableLooping.columns}`,
                elementId: extractor.id
            });
            return "''";
        }

        const rowIndex = this.tableRowContext.get(tableLoop.id) || 0;
        return this.resolveTableCell(tableLoop, rowIndex, column, page, linkGraph, contextPath);
    }

    private resolveTableCell(
        tableLoop: MapFunctoid,
        rowIndex: number,
        column: number,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath?: string
    ): string {
        if (!tableLoop.tableLooping) { return "''"; }
        const row = tableLoop.tableLooping.rows[rowIndex];
        const cellGuid = row?.[column - 1];
        const cellParameter = tableLoop.parameters.find(parameter =>
            !!parameter.guid && parameter.guid.toLowerCase() === cellGuid?.toLowerCase()
        );
        if (!cellParameter) {
            this.errors.push({
                message: `Table Looping row ${rowIndex + 1}, column ${column} has no matching input`,
                elementId: tableLoop.id
            });
            return "''";
        }

        if (cellParameter.type === 'constant') {
            return this.toXPathLiteral(cellParameter.value);
        }
        if (cellParameter.type === 'link') {
            const inputLink = page.links.find(link =>
                link.id === cellParameter.value && link.targetId === tableLoop.id
            );
            if (inputLink) {
                return this.resolveSourceXPath(inputLink, page, linkGraph, false, contextPath) || "''";
            }
        }

        this.errors.push({
            message: `Unsupported Table Looping input in row ${rowIndex + 1}, column ${column}`,
            elementId: tableLoop.id
        });
        return "''";
    }

    private functoidCacheKey(functoidId: string, contextPath?: string): string {
        const tableContext = [...this.tableRowContext.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([id, row]) => `${id}:${row}`)
            .join(',');
        return `${contextPath || '/'}|${tableContext}|${functoidId}`;
    }

    private generateFunctoidXsltExpr(
        def: FunctoidDefinition,
        inputs: string[],
        functoid: MapFunctoid
    ): GeneratedFunctoidExpr {
        const name = def.name;

        // For functoids that need C# script implementations
        switch (name) {
            case 'String Concatenate':
                // concat() requires at least 2 args in XSLT 1.0
                if (inputs.length === 0) return { kind: 'select', value: "''" };
                if (inputs.length === 1) return { kind: 'select', value: inputs[0] };
                return { kind: 'select', value: `concat(${inputs.join(', ')})` };
            case 'String Left':
                return { kind: 'select', value: `substring(${inputs[0]}, 1, ${inputs[1]})` };
            case 'String Right':
                return { kind: 'select', value: `substring(${inputs[0]}, string-length(${inputs[0]}) - ${inputs[1]} + 1)` };
            case 'Uppercase':
                return { kind: 'select', value: `translate(${inputs[0]}, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')` };
            case 'Lowercase':
                return { kind: 'select', value: `translate(${inputs[0]}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')` };
            case 'String Size':
            case 'String Length':
                return { kind: 'select', value: `string-length(${inputs[0]})` };
            case 'String Trim':
                return { kind: 'select', value: `normalize-space(${inputs[0]})` };
            case 'String Left Trim':
            case 'String Trim Left': {
                this.addScriptFunction('StringTrimLeft', this.getStringTrimLeftScript());
                return { kind: 'select', value: `userCSharp:StringTrimLeft(${inputs.map(i => `string(${i})`).join(', ')})` };
            }
            case 'String Right Trim':
            case 'String Trim Right': {
                this.addScriptFunction('StringTrimRight', this.getStringTrimRightScript());
                return { kind: 'select', value: `userCSharp:StringTrimRight(${inputs.map(i => `string(${i})`).join(', ')})` };
            }
            case 'String Find':
                return { kind: 'select', value: `string-length(substring-before(${inputs[0]}, ${inputs[1]})) + 1` };
            case 'String Extract':
                return { kind: 'select', value: `substring(${inputs[0]}, ${inputs[1]}, ${inputs[2]} - ${inputs[1]} + 1)` };

            case 'Addition': {
                const fnName = `MathAdd${inputs.length}`;
                this.addScriptFunction(fnName, this.getMathAggregateScript(fnName, '+', inputs.length));
                return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
            }
            case 'Subtraction': {
                const fnName = `MathSubtract${inputs.length}`;
                this.addScriptFunction(fnName, this.getMathAggregateScript(fnName, '-', inputs.length));
                return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
            }
            case 'Multiplication': {
                const fnName = `MathMultiply${inputs.length}`;
                this.addScriptFunction(fnName, this.getMathAggregateScript(fnName, '*', inputs.length));
                return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
            }
            case 'Division':
                this.addScriptFunction('MathDivide', this.getMathDivideScript());
                return { kind: 'select', value: `userCSharp:MathDivide(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Modulo':
                this.addScriptFunction('MathMod', this.getMathModScript());
                return { kind: 'select', value: `userCSharp:MathMod(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Round':
                return { kind: 'select', value: `round(${inputs[0]})` };
            case 'Floor':
            case 'Integer':
                return { kind: 'select', value: `floor(${inputs[0]})` };
            case 'Ceiling':
                return { kind: 'select', value: `ceiling(${inputs[0]})` };
            case 'Absolute Value':
                return { kind: 'select', value: `number(${inputs[0]}) * (1 - 2 * (number(${inputs[0]}) &lt; 0))` };
            case 'Maximum Value':
            case 'Maximum':
                {
                    const fnName = `MathMax${inputs.length}`;
                    this.addScriptFunction(fnName, this.getMathExtremaScript(fnName, '>', inputs.length));
                    return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
                }
            case 'Minimum Value':
            case 'Minimum':
                {
                    const fnName = `MathMin${inputs.length}`;
                    this.addScriptFunction(fnName, this.getMathExtremaScript(fnName, '<', inputs.length));
                    return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
                }
            case 'Square Root':
                this.addScriptFunction('MathSqrt', this.getMathSqrtScript());
                return { kind: 'select', value: `userCSharp:MathSqrt(${inputs.map(i => `string(${i})`).join(', ')})` };

            // --- Scientific functoids (need C# script implementations) ---
            case 'Sine':
                this.addScriptFunction('MathSin', this.getMathUnaryScript('MathSin', 'System.Math.Sin(d)'));
                return { kind: 'select', value: `userCSharp:MathSin(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Cosine':
                this.addScriptFunction('MathCos', this.getMathUnaryScript('MathCos', 'System.Math.Cos(d)'));
                return { kind: 'select', value: `userCSharp:MathCos(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Tangent':
                this.addScriptFunction('MathTan', this.getMathUnaryScript('MathTan', 'System.Math.Tan(d)'));
                return { kind: 'select', value: `userCSharp:MathTan(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Arc Tangent':
                this.addScriptFunction('MathAtan', this.getMathUnaryScript('MathAtan', 'System.Math.Atan(d)'));
                return { kind: 'select', value: `userCSharp:MathAtan(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Natural Exponential':
                this.addScriptFunction('MathExp', this.getMathUnaryScript('MathExp', 'System.Math.Exp(d)'));
                return { kind: 'select', value: `userCSharp:MathExp(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Natural Logarithm':
                this.addScriptFunction('MathLog', this.getMathUnaryScript('MathLog', 'System.Math.Log(d)'));
                return { kind: 'select', value: `userCSharp:MathLog(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Common Logarithm':
                this.addScriptFunction('MathLog10', this.getMathUnaryScript('MathLog10', 'System.Math.Log10(d)'));
                return { kind: 'select', value: `userCSharp:MathLog10(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Base 10 Exponential':
                this.addScriptFunction('MathPow10', this.getMathUnaryScript('MathPow10', 'System.Math.Pow(10, d)'));
                return { kind: 'select', value: `userCSharp:MathPow10(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'X^Y':
                this.addScriptFunction('MathPow', this.getMathBinaryScript('MathPow', 'System.Math.Pow(d0, d1)'));
                return { kind: 'select', value: `userCSharp:MathPow(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Base-Specified Logarithm':
                this.addScriptFunction('MathLogn', this.getMathBinaryScript('MathLogn', 'System.Math.Log(d0) / System.Math.Log(d1)'));
                return { kind: 'select', value: `userCSharp:MathLogn(${inputs.map(i => `string(${i})`).join(', ')})` };

            // --- Conversion functoids (need C# script implementations) ---
            case 'ASCII to Character':
                this.addScriptFunction('ConvertChr', this.getConvertChrScript());
                return { kind: 'select', value: `userCSharp:ConvertChr(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Character to ASCII':
                this.addScriptFunction('ConvertAsc', this.getConvertAscScript());
                return { kind: 'select', value: `userCSharp:ConvertAsc(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Hexadecimal':
                this.addScriptFunction('ConvertHex', this.getConvertHexScript());
                return { kind: 'select', value: `userCSharp:ConvertHex(${inputs.map(i => `string(${i})`).join(', ')})` };
            case 'Octal':
                this.addScriptFunction('ConvertOct', this.getConvertOctScript());
                return { kind: 'select', value: `userCSharp:ConvertOct(${inputs.map(i => `string(${i})`).join(', ')})` };

            case 'Greater Than':
                this.addScriptFunction('LogicalCompare', this.getLogicalCompareScript());
                return { kind: 'select', value: `userCSharp:LogicalCompare(string(${inputs[0]}), string(${inputs[1]}), 'gt')` };
            case 'Less Than':
                this.addScriptFunction('LogicalCompare', this.getLogicalCompareScript());
                return { kind: 'select', value: `userCSharp:LogicalCompare(string(${inputs[0]}), string(${inputs[1]}), 'lt')` };
            case 'Greater Than or Equal To':
                this.addScriptFunction('LogicalCompare', this.getLogicalCompareScript());
                return { kind: 'select', value: `userCSharp:LogicalCompare(string(${inputs[0]}), string(${inputs[1]}), 'gte')` };
            case 'Less Than or Equal To':
                this.addScriptFunction('LogicalCompare', this.getLogicalCompareScript());
                return { kind: 'select', value: `userCSharp:LogicalCompare(string(${inputs[0]}), string(${inputs[1]}), 'lte')` };
            case 'Equal':
                this.addScriptFunction('LogicalCompare', this.getLogicalCompareScript());
                return { kind: 'select', value: `userCSharp:LogicalCompare(string(${inputs[0]}), string(${inputs[1]}), 'eq')` };
            case 'Not Equal':
                this.addScriptFunction('LogicalCompare', this.getLogicalCompareScript());
                return { kind: 'select', value: `userCSharp:LogicalCompare(string(${inputs[0]}), string(${inputs[1]}), 'ne')` };
            case 'Logical AND': {
                const fnName = `LogicalAnd${inputs.length}`;
                this.addScriptFunction('ValToBool', this.getValToBoolScript());
                this.addScriptFunction(fnName, this.getLogicalAggregateScript(fnName, '&&', inputs.length));
                return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
            }
            case 'Logical OR': {
                const fnName = `LogicalOr${inputs.length}`;
                this.addScriptFunction('ValToBool', this.getValToBoolScript());
                this.addScriptFunction(fnName, this.getLogicalAggregateScript(fnName, '||', inputs.length));
                return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
            }
            case 'Logical NOT':
                this.addScriptFunction('ValToBool', this.getValToBoolScript());
                return { kind: 'select', value: `not(userCSharp:ValToBool(string(${inputs[0]})))` };
            case 'Logical Existence':
                return { kind: 'select', value: `boolean(${inputs[0]})` };
            case 'Logical String':
                return { kind: 'select', value: `string(${inputs[0]}) != ''` };
            case 'Logical Numeric':
                this.addScriptFunction('IsNumeric', this.getIsNumericScript());
                return { kind: 'select', value: `userCSharp:IsNumeric(string(${inputs[0]}))` };
            case 'Logical Date':
                this.addScriptFunction('LogicalIsDate', this.getLogicalIsDateScript());
                return { kind: 'select', value: `userCSharp:LogicalIsDate(string(${inputs[0]}))` };
            case 'IsNil':
                return {
                    kind: 'select',
                    value: `${inputs[0]}/@*[local-name()='nil' and namespace-uri()='http://www.w3.org/2001/XMLSchema-instance'] = 'true'`
                };

            case 'Date and Time':
                this.addScriptFunction('DateCurrentDateTime', this.getDateCurrentDateTimeScript());
                return { kind: 'select', value: `userCSharp:DateCurrentDateTime()` };
            case 'Date':
                this.addScriptFunction('DateCurrentDate', this.getDateCurrentDateScript());
                return { kind: 'select', value: `userCSharp:DateCurrentDate()` };
            case 'Time':
                this.addScriptFunction('DateCurrentTime', this.getDateCurrentTimeScript());
                return { kind: 'select', value: `userCSharp:DateCurrentTime()` };
            case 'Add Days':
                this.addScriptFunction('DateAddDays', this.getDateAddDaysScript());
                return { kind: 'select', value: `userCSharp:DateAddDays(string(${inputs[0]}), string(${inputs[1]}))` };

            case 'Value Mapping':
            case 'Value Mapping (Flattening)':
                // Conditional: first input is boolean condition, second is value
                if (inputs.length >= 2) {
                    return { kind: 'conditional', condition: `string(${inputs[0]}) = 'true'`, value: inputs[1] };
                }
                return { kind: 'select', value: inputs[0] || "''" };

            case 'Record Count':
                return { kind: 'select', value: `count(${inputs[0]})` };
            case 'Index':
                return { kind: 'select', value: this.generateIndexExpression(inputs, functoid) };
            case 'Iteration':
                return { kind: 'select', value: 'position()' };
            case 'Looping':
            case 'Existence Looping':
                return { kind: 'select', value: inputs[0] || '.' };
            case 'XPath': {
                const xpath = functoid.parameters.find(p => p.type === 'constant' && p.index === 0)?.value;
                if (!xpath) {
                    this.errors.push({ message: 'XPath requires a constant XPath expression as its first input', elementId: functoid.id });
                    return { kind: 'select', value: "''" };
                }
                return { kind: 'select', value: xpath };
            }
            case 'Nil Value':
                return { kind: 'select', value: inputs[0] || 'true()' };
            case 'Assert':
                if (!this.currentMap?.options.generateDebuggingInformation) {
                    return { kind: 'select', value: inputs[2] || inputs[1] || "''" };
                }
                return {
                    kind: 'content',
                    value: `<xsl:if test="not(string(${inputs[0]}) = 'true')">`
                        + `<xsl:message terminate="yes"><xsl:value-of select="${inputs[1] || "''"}" />`
                        + `</xsl:message></xsl:if>`
                };
            case 'Key Match':
                return {
                    kind: 'conditional',
                    condition: `string(${inputs[0]}) = 'true'`,
                    value: inputs[1] || "''"
                };
            case 'Mass Copy':
                return {
                    kind: 'select',
                    value: `${inputs[0]}/@* | ${inputs[0]}/node()`,
                    isNodeContent: true
                };
            case 'Table Looping':
            case 'Table Extractor':
                this.errors.push({
                    message: `${name} requires BizTalk table-grid metadata, which is not available in this map model`,
                    elementId: functoid.id
                });
                return { kind: 'select', value: "''" };

            case 'Cumulative Sum':
                return { kind: 'select', value: `sum(${inputs[0]})` };
            case 'Cumulative Average':
                return { kind: 'select', value: `sum(${inputs[0]}) div count(${inputs[0]})` };
            case 'Cumulative Minimum':
                this.addScriptFunction('CumulativeMinimum', this.getCumulativeNumberScript('CumulativeMinimum', '<'));
                return { kind: 'select', value: `userCSharp:CumulativeMinimum(${inputs[0]})` };
            case 'Cumulative Maximum':
                this.addScriptFunction('CumulativeMaximum', this.getCumulativeNumberScript('CumulativeMaximum', '>'));
                return { kind: 'select', value: `userCSharp:CumulativeMaximum(${inputs[0]})` };
            case 'Cumulative Concatenate':
                this.addScriptFunction('CumulativeConcatenate', this.getCumulativeConcatenateScript());
                return { kind: 'select', value: `userCSharp:CumulativeConcatenate(${inputs[0]})` };

            case 'Database Lookup':
                this.addScriptFunction('DatabaseFunctoidScripts', this.getDatabaseFunctoidScripts());
                return {
                    kind: 'select',
                    value: `userCSharp:DatabaseLookup(${this.variableCounter}, ${inputs.map(i => `string(${i})`).join(', ')})`
                };
            case 'Value Extractor':
                this.addScriptFunction('DatabaseFunctoidScripts', this.getDatabaseFunctoidScripts());
                return { kind: 'select', value: `userCSharp:DatabaseValueExtract(string(${inputs[0]}), string(${inputs[1]}))` };
            case 'Error Return':
                this.addScriptFunction('DatabaseFunctoidScripts', this.getDatabaseFunctoidScripts());
                return { kind: 'select', value: `userCSharp:DatabaseErrorExtract(string(${inputs[0]}))` };

            case 'Scripting': {
                const scriptType = functoid.parameters.find(p => p.type === 'scriptType')?.value
                    || (functoid as any).scriptType || 'inlineCSharp';
                const scriptBody = functoid.parameters.find(p => p.type === 'scriptBody')?.value
                    || (functoid as any).scriptContent || '';
                const assemblyPath = functoid.parameters.find(p => p.type === 'assemblyPath')?.value || '';
                const className = functoid.parameters.find(p => p.type === 'className')?.value || '';
                const methodName = functoid.parameters.find(p => p.type === 'methodName')?.value || '';
                const activeImplementation = functoid.scriptImplementations?.find(
                    implementation => implementation.type === scriptType
                );
                const assemblyReferences = activeImplementation?.assemblyReferences || [];

                if (scriptType === 'inlineCSharp') {
                    assemblyReferences.forEach(reference => this.csharpAssemblyReferences.add(reference));
                    const declaredFunction = this.extractScriptFunctionName(
                        scriptBody,
                        'inlineCSharp'
                    );
                    const fnName = declaredFunction || `ScriptFn${++this.scriptFnCounter}`;
                    const parameters = inputs.map((_, i) => `string param${i}`).join(', ');
                    let csharpCode: string;
                    if (!scriptBody || scriptBody.trim().length === 0) {
                        // No body — generate a stub that returns empty
                        csharpCode = `public string ${fnName}(${parameters})\n{\n    return "";\n}`;
                    } else if (declaredFunction) {
                        csharpCode = scriptBody;
                    } else {
                        csharpCode = `public string ${fnName}(${parameters})
{
${this.indentLines(scriptBody, 4)}
}`;
                    }
                    this.addScriptFunction(fnName, csharpCode);
                    return { kind: 'select', value: `userCSharp:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
                } else if (scriptType === 'inlineVbNet') {
                    assemblyReferences.forEach(reference => this.vbAssemblyReferences.add(reference));
                    const declaredFunction = this.extractScriptFunctionName(
                        scriptBody,
                        'inlineVbNet'
                    );
                    const fnName = declaredFunction || `ScriptFn${++this.scriptFnCounter}`;
                    const parameters = inputs.map((_, i) => `ByVal param${i} As String`).join(', ');
                    let vbCode: string;
                    if (!scriptBody || scriptBody.trim().length === 0) {
                        vbCode = `Public Function ${fnName}(${parameters}) As String\n    Return ""\nEnd Function`;
                    } else if (declaredFunction) {
                        vbCode = scriptBody;
                    } else {
                        vbCode = `Public Function ${fnName}(${parameters}) As String
${this.indentLines(scriptBody, 4)}
End Function`;
                    }
                    this.addVbScriptFunction(fnName, vbCode);
                    return { kind: 'select', value: `userVB:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
                } else if (scriptType === 'inlineJScript') {
                    assemblyReferences.forEach(reference => this.jscriptAssemblyReferences.add(reference));
                    const declaredFunction = this.extractScriptFunctionName(
                        scriptBody,
                        'inlineJScript'
                    );
                    const fnName = declaredFunction || `ScriptFn${++this.scriptFnCounter}`;
                    const parameters = inputs.map((_, i) => `param${i}`).join(', ');
                    let jsCode: string;
                    if (!scriptBody || scriptBody.trim().length === 0) {
                        jsCode = `function ${fnName}(${parameters}) {\n    return "";\n}`;
                    } else if (declaredFunction) {
                        jsCode = scriptBody;
                    } else {
                        jsCode = `function ${fnName}(${parameters}) {
${this.indentLines(scriptBody, 4)}
}`;
                    }
                    this.addJScriptFunction(fnName, jsCode);
                    return { kind: 'select', value: `userJScript:${fnName}(${inputs.map(i => `string(${i})`).join(', ')})` };
                } else if (scriptType === 'inlineXslt') {
                    // Inline XSLT is raw XML injected directly into the output tree
                    if (scriptBody) {
                        return { kind: 'content', value: scriptBody, isNodeContent: true };
                    }
                    return { kind: 'select', value: inputs[0] || "''" };
                } else if (scriptType === 'inlineXsltCallTemplate') {
                    const templateName = `ScriptTemplate${++this.scriptFnCounter}`;
                    const parameters = inputs.map((_, i) => `    <xsl:param name="param${i}" />`).join('\n');
                    const templateBody = scriptBody || '<xsl:value-of select="$param0" />';
                    this.addNamedTemplate(templateName, `  <xsl:template name="${templateName}">
${parameters ? `${parameters}\n` : ''}${this.indentLines(templateBody, 4)}
  </xsl:template>\n`);

                    const callLines = [`<xsl:call-template name="${templateName}">`];
                    for (let i = 0; i < inputs.length; i++) {
                        callLines.push(`  <xsl:with-param name="param${i}" select="${inputs[i]}" />`);
                    }
                    callLines.push(`</xsl:call-template>`);
                    return { kind: 'content', value: callLines.join('\n'), isNodeContent: true };
                } else if (scriptType === 'externalAssembly') {
                    if (!assemblyPath.trim() || !className.trim() || !methodName.trim()) {
                        return { kind: 'select', value: "''" };
                    }
                    if (/[\\/]/.test(assemblyPath) || /\.dll$/i.test(assemblyPath)) {
                        this.assemblyReferences.add(assemblyPath);
                    }
                    const prefix = this.addExternalAssemblyScript(
                        assemblyPath,
                        className,
                        methodName || 'Invoke',
                        inputs.length,
                        activeImplementation?.parameterTypes,
                        activeImplementation?.returnType,
                        activeImplementation?.isStatic
                    );

                    const safeMethodName = methodName || 'Invoke';
                    const parameterTypes = activeImplementation?.parameterTypes || [];
                    return {
                        kind: 'select',
                        value: `${prefix}:${safeMethodName}(${inputs.map((input, index) =>
                            this.formatExternalAssemblyInput(input, parameterTypes[index])
                        ).join(', ')})`
                    };
                }

                return { kind: 'select', value: inputs[0] || "''" };
            }

            default:
                this.errors.push({ message: `No XSLT compiler implementation for ${name}`, elementId: functoid.id });
                return { kind: 'select', value: inputs[0] || "''" };
        }
    }

    private extractScriptFunctionName(
        scriptBody: string,
        scriptType: 'inlineCSharp' | 'inlineVbNet' | 'inlineJScript'
    ): string | undefined {
        if (!scriptBody.trim()) { return undefined; }
        let match: RegExpMatchArray | null;
        if (scriptType === 'inlineVbNet') {
            match = scriptBody.match(
                /\b(?:(?:Public|Private|Protected|Friend)\s+)?(?:Shared\s+)?Function\s+([A-Za-z_]\w*)\s*\(/i
            );
        } else if (scriptType === 'inlineJScript') {
            match = scriptBody.match(/\bfunction\s+([A-Za-z_]\w*)\s*\(/i);
        } else {
            match = scriptBody.match(
                /\b(?:(?:public|private|protected|internal)\s+)?(?:static\s+)?(?:[\w.<>,\[\]?]+\s+)+([A-Za-z_]\w*)\s*\(/
            );
        }
        return match?.[1];
    }

    private resolveSourceXPath(
        link: MapLink,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        preserveNode: boolean = false,
        contextPath?: string
    ): string | undefined {
        if (link.sourceType === LinkEndpointType.SchemaNode && link.sourcePath) {
            if (link.sourceLinkOption === SourceLinkOption.NameCopy) {
                const parts = this.schemaPathParts(link.sourcePath);
                return this.toXPathLiteral((parts[parts.length - 1] || '').replace(/^@/, ''));
            }
            return preserveNode
                ? this.pathToNodeXPath(link.sourcePath, contextPath)
                : this.pathToXPath(link.sourcePath, contextPath);
        }

        if (link.sourceType === LinkEndpointType.Functoid) {
            const functoid = page.functoids.find(f => f.id === link.sourceId);
            if (functoid) {
                // Return a variable reference
                const varName = this.getFunctoidVarName(functoid, page, linkGraph, contextPath);
                return `$var:${varName}`;
            }
        }
        return undefined;
    }

    private getFunctoidVarName(
        functoid: MapFunctoid,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath?: string
    ): string {
        const cacheKey = this.functoidCacheKey(functoid.id, contextPath);
        const existing = this.functoidVarMap.get(cacheKey);
        if (existing) { return existing; }
        // If not yet compiled (e.g., referenced before compiled), compile it now
        const compilation = this.compileFunctoid(functoid, page, linkGraph, contextPath);
        return compilation?.variableName || 'v0';
    }

    private requiresNodeInput(functoidId: number, inputIndex: number): boolean {
        return inputIndex === 0 && [
            322, 323, 324, 325, 326, 327, 328, 424, 474, 701, 706, 703, 704, 801, 802
        ].includes(functoidId);
    }

    private toXPathLiteral(value: string): string {
        if (!value.includes("'")) {
            return `'${value}'`;
        }
        if (!value.includes('"')) {
            return `"${value}"`;
        }
        const parts = value.split("'").map(part => `'${part}'`);
        return `concat(${parts.join(`, "'", `)})`;
    }

    private pathToNodeXPath(srcPath: string, contextPath?: string): string {
        const valueXPath = this.pathToXPath(srcPath, contextPath);
        return valueXPath.endsWith('/text()') ? valueXPath.slice(0, -7) : valueXPath;
    }

    /**
     * Converts a simplified path like /Root/Record/Field to BizTalk-style XPath.
     * The root element is stripped since we're inside xsl:template match="/s0:Root".
     */
    private pathToXPath(srcPath: string, contextPath?: string): string {
        const absoluteParts = this.schemaPathParts(srcPath);
        if (absoluteParts.length === 0) { return '.'; }
        let parts = absoluteParts.slice(1);
        let consumedParts = 0;

        let upwardSteps: string[] = [];
        if (contextPath) {
            const contextParts = this.schemaPathParts(contextPath).slice(1);
            let i = 0;
            while (i < contextParts.length && i < parts.length && contextParts[i] === parts[i]) {
                i++;
            }
            upwardSteps = Array.from({ length: contextParts.length - i }, () => '..');
            consumedParts = i;
            parts = parts.slice(i);
            if (parts.length === 0) {
                return upwardSteps.length > 0 ? upwardSteps.join('/') : '.';
            }
        }
        if (parts.length === 0) {
            return upwardSteps.length > 0 ? upwardSteps.join('/') : '.';
        }

        // Check if path ends with an attribute
        const lastPart = parts[parts.length - 1];
        if (lastPart.startsWith('@')) {
            const elemParts = parts.slice(0, -1);
            const attrName = lastPart.substring(1);
            const elementSteps = elemParts.map((part, index) =>
                this.elementXPath(part, this.findSourceNode(
                    `/${absoluteParts.slice(0, consumedParts + index + 2).join('/')}`
                )?.namespace)
            );
            const parentPath = `/${absoluteParts.slice(0, -1).join('/')}`;
            const parent = this.findSourceNode(parentPath);
            const attribute = parent?.attributes.find(candidate => candidate.name === attrName);
            const attrPrefix = attribute?.namespace
                ? this.sourceNamespacePrefixes.get(attribute.namespace)
                : undefined;
            const attributeStep = this.currentMap?.options.ignoreNamespacesForLinks
                ? `@*[local-name()='${attrName}']`
                : attrPrefix ? `@${attrPrefix}:${attrName}` : `@${attrName}`;
            const pathParts = [...upwardSteps, ...elementSteps, attributeStep];
            return pathParts.join('/');
        }

        // For leaf elements, add /text(). For container/repeating records (e.g. a source
        // path used by Record Count or Index), address the element itself without /text().
        const elementPath = [
            ...upwardSteps,
            ...parts.map((part, index) =>
                this.elementXPath(part, this.findSourceNode(
                    `/${absoluteParts.slice(0, consumedParts + index + 2).join('/')}`
                )?.namespace)
            )
        ].join('/');
        if (this.isContainerSourcePath(srcPath)) {
            return elementPath;
        }
        return elementPath + '/text()';
    }

    /**
     * Returns true when the given source path resolves to a non-leaf element (has child
     * elements) in the source schema — i.e. a record rather than a value-bearing leaf.
     * Such paths must not be suffixed with /text() (e.g. count(Items), Items[2]).
     */
    private isContainerSourcePath(srcPath: string): boolean {
        const root = this.sourceTree?.rootElement;
        if (!root) { return false; }
        const parts = this.schemaPathParts(srcPath);
        if (parts.length === 0) { return false; }
        if (parts[parts.length - 1].startsWith('@')) { return false; }
        // First part is the root element name.
        let node: SchemaNode | undefined = parts[0] === root.name ? root : undefined;
        for (let i = 1; node && i < parts.length; i++) {
            node = node.children.find(c => c.name === parts[i]);
        }
        return !!node && node.children.length > 0;
    }

    /**
     * Convert a source path to a for-each select expression (without /text())
     */
    private pathToForEachXPath(srcPath: string, contextPath?: string): string {
        return this.pathToNodeXPath(srcPath, contextPath);
    }

    private elementXPath(name: string, namespace?: string): string {
        if (this.currentMap?.options.ignoreNamespacesForLinks) {
            return `*[local-name()='${name}']`;
        }
        if (namespace) {
            const prefix = this.sourceNamespacePrefixes.get(namespace);
            return prefix ? `${prefix}:${name}` : `*[local-name()='${name}']`;
        }
        if (this.sourceNamespace && !this.sourceQualified) { return name; }
        return `*[local-name()='${name}' and namespace-uri()='']`;
    }

    private generateTargetElement(
        node: SchemaNode,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        indent: number,
        contextPath?: string,
        suppressLoop: boolean = false
    ): string {
        const pad = ' '.repeat(indent);
        let result = '';

        // Find direct mapping to this node
        const directLinks = page.links.filter(l =>
            l.targetType === LinkEndpointType.SchemaNode &&
            l.targetPath === node.path &&
            this.linkAllowedInActiveLoop(l, page)
        );
        // Determine element name with namespace prefix
        const elemName = this.targetQualifiedName(
            node.name,
            node.namespace || this.targetNamespace
        );

        // Check if any descendant has a mapping
        const hasMappedDescendants = this.hasAnyMapping(node, page);
        const nodeValue = this.getTargetNodeValue(node);

        if (directLinks.length === 0 && !hasMappedDescendants &&
            nodeValue === undefined && !this.isEffectiveLeaf(node)) {
            return ''; // Skip unmapped container nodes
        }

        // Check if this is a repeating element that needs for-each
        const isRepeating = node.maxOccurs === 'unbounded' || (node.maxOccurs !== undefined && node.maxOccurs > 1);
        const sourceForEachPaths = isRepeating && !suppressLoop
            ? this.findForEachSourcePaths(node, page)
            : [];
        if (sourceForEachPaths.length > 1) {
            const loopFunctoidId = directLinks.find(link =>
                link.sourceType === LinkEndpointType.Functoid &&
                page.functoids.some(functoid =>
                    functoid.id === link.sourceId &&
                    (functoid.functoidId === 424 || functoid.functoidId === 801)
                )
            )?.sourceId;
            for (const loopPath of sourceForEachPaths) {
                const loopSelect = this.pathToForEachXPath(loopPath, contextPath);
                result += `${pad}<xsl:for-each select="${loopSelect}">\n`;
                if (loopFunctoidId) {
                    this.activeLoopContexts.push({
                        functoidId: loopFunctoidId,
                        sourcePath: loopPath
                    });
                }
                result += this.generateTargetElement(
                    node,
                    page,
                    linkGraph,
                    indent + 2,
                    loopPath,
                    true
                );
                if (loopFunctoidId) {
                    this.activeLoopContexts.pop();
                }
                result += `${pad}</xsl:for-each>\n`;
            }
            return result;
        }
        const sourceForEachPath = sourceForEachPaths[0];
        const sourceForEach = sourceForEachPath
            ? this.pathToForEachXPath(sourceForEachPath, contextPath)
            : null;
        const activeContextPath = sourceForEachPath || contextPath;

        if (sourceForEach) {
            result += `${pad}<xsl:for-each select="${sourceForEach}">\n`;
            indent += 2;
        }

        const tableLoopLink = directLinks.find(link =>
            link.sourceType === LinkEndpointType.Functoid &&
            page.functoids.some(candidate =>
                candidate.id === link.sourceId && candidate.functoidId === 703
            )
        );
        const tableLoop = tableLoopLink
            ? page.functoids.find(candidate => candidate.id === tableLoopLink.sourceId)
            : undefined;
        if (sourceForEach && tableLoop?.tableLooping && !suppressLoop) {
            for (let row = 0; row < tableLoop.tableLooping.rows.length; row++) {
                this.tableRowContext.set(tableLoop.id, row);
                const gate = tableLoop.tableLooping.gated
                    ? this.resolveTableCell(tableLoop, row, 1, page, linkGraph, activeContextPath)
                    : undefined;
                if (gate) {
                    result += `${' '.repeat(indent)}<xsl:if test="string(${gate}) = 'true'">\n`;
                }
                result += this.generateTargetElement(
                    node,
                    page,
                    linkGraph,
                    gate ? indent + 2 : indent,
                    activeContextPath,
                    true
                );
                if (gate) {
                    result += `${' '.repeat(indent)}</xsl:if>\n`;
                }
            }
            this.tableRowContext.delete(tableLoop.id);
            result += `${pad}</xsl:for-each>\n`;
            return result;
        }

        const attributeLinks = (node.attributes || [])
            .flatMap(attr => page.links.filter(link =>
                link.targetType === LinkEndpointType.SchemaNode &&
                link.targetPath === `${node.path}/@${attr.name}` &&
                this.linkAllowedInActiveLoop(link, page)
            ));
        const valueLinks = directLinks.filter(link =>
            !this.isFunctoidSource(link, page, 424) &&
            !this.isFunctoidSource(link, page, 801) &&
            !this.isFunctoidSource(link, page, 703) &&
            !this.isFunctoidSource(link, page, 800)
        );
        const hasMassCopy = valueLinks.some(link => this.isFunctoidSource(link, page, 802));
        const descendantConditionLinks = page.links.filter(link =>
            link.targetType === LinkEndpointType.SchemaNode &&
            link.targetPath?.startsWith(`${node.path}/`) &&
            link.sourceType === LinkEndpointType.Functoid &&
            !this.isFunctoidSource(link, page, 424) &&
            !this.isFunctoidSource(link, page, 801) &&
            !this.isFunctoidSource(link, page, 703) &&
            !this.isRawXsltSource(link, page) &&
            this.linkHasConditionalSource(link, page) &&
            this.linkAllowedInActiveLoop(link, page)
        );
        result += this.compileVariablesForLinks(
            [...attributeLinks, ...valueLinks, ...descendantConditionLinks],
            page,
            linkGraph,
            activeContextPath,
            indent
        );

        const conditions = !this.isEffectiveLeaf(node)
            ? this.getNodeConditions(node, page, activeContextPath)
            : this.getTargetConditions(valueLinks, page, activeContextPath);
        if (conditions.length > 0) {
            result += `${' '.repeat(indent)}<xsl:if test="${conditions.join(' or ')}">\n`;
            indent += 2;
        }

        result += `${' '.repeat(indent)}<${elemName}>\n`;
        if (node.baseType && node.dataType && node.dataTypeNamespace &&
            node.dataTypeNamespace !== 'http://www.w3.org/2001/XMLSchema') {
            const typePrefix = this.targetNamespacePrefixes.get(node.dataTypeNamespace);
            const typeName = node.dataType.includes(':') ? node.dataType.split(':').pop()! : node.dataType;
            if (typePrefix) {
                result += `${' '.repeat(indent + 2)}<xsl:attribute name="xsi:type">`
                    + `${typePrefix}:${typeName}</xsl:attribute>\n`;
            }
        }

        // Generate attributes that have mappings
        if (node.attributes && !hasMassCopy) {
            for (const attr of node.attributes) {
                const attrPath = `${node.path}/@${attr.name}`;
                const attrLink = page.links.find(l => l.targetPath === attrPath && l.targetType === LinkEndpointType.SchemaNode);
                if (attrLink) {
                    const expr = this.getSourceExpression(attrLink, page, linkGraph, activeContextPath);
                    const attrName = this.targetQualifiedName(attr.name, attr.namespace);
                    result += `${' '.repeat(indent + 2)}<xsl:attribute name="${attrName}">\n`;
                    result += `${' '.repeat(indent + 4)}<xsl:value-of select="${expr}" />\n`;
                    result += `${' '.repeat(indent + 2)}</xsl:attribute>\n`;
                } else {
                    const attrValue = this.getTargetAttributeValue(node, attr);
                    if (attrValue !== undefined) {
                        const attrName = this.targetQualifiedName(attr.name, attr.namespace);
                        result += `${' '.repeat(indent + 2)}<xsl:attribute name="${attrName}">`;
                        result += `<xsl:value-of select="${this.toXPathLiteral(attrValue)}" />`;
                        result += `</xsl:attribute>\n`;
                    }
                }
            }
        }

        // Direct value mapping
        if (valueLinks.length > 0) {
            for (const link of valueLinks) {
                const expr = this.getSourceExpression(link, page, linkGraph, activeContextPath);
                const usesCopyOf = this.isNodeContentSource(link, page, activeContextPath);
                const xslInstr = usesCopyOf ? 'copy-of' : 'value-of';
                const sourceNode = link.sourcePath ? this.findSourceNode(link.sourcePath) : undefined;
                if (!usesCopyOf && node.nillable && sourceNode?.nillable) {
                    const sourceElement = this.pathToNodeXPath(link.sourcePath!, activeContextPath);
                    result += `${' '.repeat(indent + 2)}<xsl:choose>\n`;
                    result += `${' '.repeat(indent + 4)}<xsl:when test="${sourceElement}/@xsi:nil = 'true'">\n`;
                    result += `${' '.repeat(indent + 6)}<xsl:attribute name="xsi:nil">true</xsl:attribute>\n`;
                    result += `${' '.repeat(indent + 4)}</xsl:when>\n`;
                    result += `${' '.repeat(indent + 4)}<xsl:otherwise><xsl:value-of select="${expr}" /></xsl:otherwise>\n`;
                    result += `${' '.repeat(indent + 2)}</xsl:choose>\n`;
                } else {
                    result += `${' '.repeat(indent + 2)}<xsl:${xslInstr} select="${expr}" />\n`;
                }
            }
        } else if (nodeValue !== undefined && this.isEffectiveLeaf(node)) {
            result += `${' '.repeat(indent + 2)}<xsl:value-of select="${this.toXPathLiteral(nodeValue)}" />\n`;
        }

        // Recurse into children
        if (!hasMassCopy) {
            this.variableScopeStack.push(new Set());
            const orderedChildren = this.generateSequenceOrderedChildren(
                node.children,
                page,
                linkGraph,
                indent + 2,
                activeContextPath
            );
            if (orderedChildren !== undefined) {
                result += orderedChildren;
            } else {
                for (const child of node.children) {
                    const childResult = this.generateTargetChildElement(
                        child,
                        page,
                        linkGraph,
                        indent + 2,
                        activeContextPath
                    );
                    result += childResult;
                }
            }
            this.variableScopeStack.pop();
        }

        result += `${' '.repeat(indent)}</${elemName}>\n`;
        if (conditions.length > 0) {
            indent -= 2;
            result += `${' '.repeat(indent)}</xsl:if>\n`;
        }

        if (sourceForEach) {
            result += `${pad}</xsl:for-each>\n`;
        }

        return result;
    }

    private generateTargetChildElement(
        node: SchemaNode,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        indent: number,
        contextPath?: string
    ): string {
        const pad = ' '.repeat(indent);

        const directLinks = page.links.filter(l =>
            l.targetType === LinkEndpointType.SchemaNode &&
            l.targetPath === node.path &&
            this.linkAllowedInActiveLoop(l, page)
        );
        const hasMappedDescendants = this.hasAnyMapping(node, page);
        const nodeValue = this.getTargetNodeValue(node);

        if (directLinks.length === 0 && !hasMappedDescendants && nodeValue === undefined) {
            return '';
        }

        // For leaf nodes with a direct link, emit value-of directly (BizTalk style)
        if (directLinks.length > 0 && this.isEffectiveLeaf(node)) {
            const elemName = this.targetQualifiedName(
                node.name,
                node.namespace || this.targetNamespace
            );
            let result = '';
            const valueLinks = directLinks.filter(link => !this.isFunctoidSource(link, page, 376));
            result += this.compileVariablesForLinks(directLinks, page, linkGraph, contextPath, indent);
            for (const link of directLinks.filter(link => this.isFunctoidSource(link, page, 376))) {
                const valueExpr = this.getSourceExpression(link, page, linkGraph, contextPath);
                result += `${pad}<xsl:if test="string(${valueExpr}) = 'true'">\n`;
                result += `${pad}  <${elemName}>\n`;
                result += `${pad}    <xsl:attribute name="xsi:nil"><xsl:value-of select="'true'" /></xsl:attribute>\n`;
                result += `${pad}  </${elemName}>\n`;
                result += `${pad}</xsl:if>\n`;
            }
            if (valueLinks.length > 0) {
                const conditions = this.getTargetConditions(valueLinks, page, contextPath);
                if (conditions.length > 0) {
                    result += `${pad}<xsl:if test="${conditions.join(' or ')}">\n`;
                }
                const valuePad = conditions.length > 0 ? `${pad}  ` : pad;
                result += `${valuePad}<${elemName}>\n`;
                for (const link of valueLinks) {
                    const valueExpr = this.getSourceExpression(link, page, linkGraph, contextPath);
                    const usesCopyOf = this.isNodeContentSource(link, page, contextPath);
                    const sourceNode = link.sourcePath ? this.findSourceNode(link.sourcePath) : undefined;
                    if (!usesCopyOf && node.nillable && sourceNode?.nillable) {
                        const sourceElement = this.pathToNodeXPath(link.sourcePath!, contextPath);
                        result += `${valuePad}  <xsl:choose>\n`;
                        result += `${valuePad}    <xsl:when test="${sourceElement}/@xsi:nil = 'true'">\n`;
                        result += `${valuePad}      <xsl:attribute name="xsi:nil">true</xsl:attribute>\n`;
                        result += `${valuePad}    </xsl:when>\n`;
                        result += `${valuePad}    <xsl:otherwise><xsl:value-of select="${valueExpr}" /></xsl:otherwise>\n`;
                        result += `${valuePad}  </xsl:choose>\n`;
                    } else {
                        const xslInstr = usesCopyOf ? 'copy-of' : 'value-of';
                        result += `${valuePad}  <xsl:${xslInstr} select="${valueExpr}" />\n`;
                    }
                }
                result += `${valuePad}</${elemName}>\n`;
                if (conditions.length > 0) {
                    result += `${pad}</xsl:if>\n`;
                }
            }
            return result;
        }

        // Container node with mapped children
        return this.generateTargetElement(node, page, linkGraph, indent, contextPath);
    }

    private getSourceExpression(
        link: MapLink,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath?: string
    ): string {
        if (link.sourceType === LinkEndpointType.SchemaNode && link.sourcePath) {
            if (link.sourceLinkOption === SourceLinkOption.NameCopy) {
                const parts = link.sourcePath.split('/').filter(Boolean);
                return this.toXPathLiteral((parts[parts.length - 1] || '').replace(/^@/, ''));
            }
            if (link.sourceLinkOption === SourceLinkOption.MixedCopy) {
                return this.pathToNodeXPath(link.sourcePath, contextPath);
            }
            return this.pathToXPath(link.sourcePath, contextPath);
        }
        if (link.sourceType === LinkEndpointType.Functoid) {
            const functoid = page.functoids.find(f => f.id === link.sourceId);
            if (functoid) {
                const compilation = this.compiledFunctoids.get(
                    this.functoidCacheKey(functoid.id, contextPath)
                );
                if (compilation) return `$var:${compilation.variableName}`;
            }
        }
        return "''";
    }

    /**
     * Checks if a link's source is a functoid variable that contains XML nodes
     * (inline XSLT / call template). These need xsl:copy-of instead of xsl:value-of.
     */
    private isNodeContentSource(link: MapLink, page: MapPage, contextPath?: string): boolean {
        if (link.sourceType === LinkEndpointType.Functoid) {
            const functoid = page.functoids.find(f => f.id === link.sourceId);
            if (functoid) {
                return !!this.compiledFunctoids.get(
                    this.functoidCacheKey(functoid.id, contextPath)
                )?.isNodeContent;
            }
        }
        return false;
    }

    private isFunctoidSource(link: MapLink, page: MapPage, functoidId: number): boolean {
        return link.sourceType === LinkEndpointType.Functoid
            && page.functoids.some(f => f.id === link.sourceId && f.functoidId === functoidId);
    }

    private isRawXsltSource(link: MapLink, page: MapPage): boolean {
        if (link.sourceType !== LinkEndpointType.Functoid) { return false; }
        const functoid = page.functoids.find(candidate => candidate.id === link.sourceId);
        return functoid?.functoidId === 260 &&
            (functoid.scriptType === 'inlineXslt' || functoid.scriptType === 'inlineXsltCallTemplate');
    }

    private renderRawXsltLinks(
        links: MapLink[],
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath: string | undefined,
        indent: number
    ): string {
        let result = '';
        for (const link of links) {
            const functoid = page.functoids.find(candidate => candidate.id === link.sourceId);
            if (!functoid) { continue; }
            const incomingLinks = linkGraph.get(functoid.id) || [];
            result += this.compileVariablesForLinks(
                incomingLinks.filter(input => input.sourceType === LinkEndpointType.Functoid),
                page,
                linkGraph,
                contextPath,
                indent
            );

            const inputs = this.resolveRawXsltInputs(functoid, page, linkGraph, contextPath);
            const scriptBody = functoid.parameters.find(parameter => parameter.type === 'scriptBody')?.value
                || functoid.scriptContent
                || '';
            if (functoid.scriptType === 'inlineXslt') {
                if (!this.isValidXsltFragment(scriptBody)) {
                    this.errors.push({
                        message: 'Inline XSLT contains malformed XML',
                        elementId: functoid.id
                    });
                    continue;
                }
                result += `${this.indentLines(scriptBody, indent)}\n`;
                continue;
            }

            const template = this.parseCallTemplate(scriptBody, functoid.id);
            if (!template) { continue; }
            if (template.parameters.length !== inputs.length) {
                this.errors.push({
                    message: `XSLT call-template '${template.name}' expects ${template.parameters.length} input(s), but received ${inputs.length}`,
                    elementId: functoid.id
                });
                continue;
            }
            this.addNamedTemplate(template.name, this.indentLines(template.definitions, 2));
            result += `${' '.repeat(indent)}<xsl:call-template name="${template.name}">\n`;
            for (let index = 0; index < inputs.length; index++) {
                result += `${' '.repeat(indent + 2)}<xsl:with-param name="${template.parameters[index]}" select="${inputs[index]}" />\n`;
            }
            result += `${' '.repeat(indent)}</xsl:call-template>\n`;
        }
        return result;
    }

    private resolveRawXsltInputs(
        functoid: MapFunctoid,
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath?: string
    ): string[] {
        const inputs: string[] = [];
        const incomingLinks = linkGraph.get(functoid.id) || [];
        const usedLinkIds = new Set<string>();
        for (const parameter of functoid.parameters) {
            if (parameter.type === 'constant') {
                inputs[parameter.index] = this.toXPathLiteral(parameter.value);
            }
        }
        const resolveLink = (link: MapLink, index: number, defaultValue?: string): void => {
            const expression = this.resolveSourceXPath(link, page, linkGraph, false, contextPath);
            if (expression) { inputs[index] = this.applyInputDefault(expression, defaultValue); }
            usedLinkIds.add(link.id);
        };
        for (const parameter of functoid.parameters) {
            if (parameter.type !== 'link') { continue; }
            const link = incomingLinks.find(candidate => candidate.id === parameter.value);
            if (link) { resolveLink(link, parameter.index, parameter.defaultValue); }
        }
        const orderedRemainingLinks = [...incomingLinks].sort((left, right) => {
            const leftIndex = (functoid.inputLinks || []).indexOf(left.id);
            const rightIndex = (functoid.inputLinks || []).indexOf(right.id);
            return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
                (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
        });
        for (const link of orderedRemainingLinks) {
            if (usedLinkIds.has(link.id)) { continue; }
            const emptyIndex = inputs.findIndex(value => value === undefined);
            resolveLink(link, emptyIndex >= 0 ? emptyIndex : inputs.length);
        }
        return Array.from({ length: inputs.length }, (_, index) => inputs[index] || "''");
    }

    private applyInputDefault(expression: string, defaultValue?: string): string {
        if (!defaultValue) { return expression; }
        const literal = this.toXPathLiteral(defaultValue);
        return `concat(substring(${literal}, 1, number(string(${expression}) = '') * string-length(${literal})), string(${expression}))`;
    }

    private isValidXsltFragment(fragment: string): boolean {
        if (!fragment.trim()) { return false; }
        return XMLValidator.validate(
            `<root xmlns:xsl="http://www.w3.org/1999/XSL/Transform">${fragment}</root>`
        ) === true;
    }

    private parseCallTemplate(
        scriptBody: string,
        functoidId: string
    ): CallTemplateDefinition | null {
        if (!this.isValidXsltFragment(scriptBody)) {
            this.errors.push({
                message: 'XSLT call-template definition contains malformed XML',
                elementId: functoidId
            });
            return null;
        }
        const xsltNamespace = 'http://www.w3.org/1999/XSL/Transform';
        let document: any;
        try {
            document = create(
                `<root xmlns:xsl="${xsltNamespace}">${scriptBody}</root>`
            ).node;
        } catch {
            this.errors.push({
                message: 'XSLT call-template definition contains malformed XML',
                elementId: functoidId
            });
            return null;
        }
        const templates = Array.from(
            document.getElementsByTagNameNS(xsltNamespace, 'template') as ArrayLike<any>
        ).filter(template => !!template.getAttribute('name'));
        const template = templates[0];
        if (!template) {
            this.errors.push({
                message: 'XSLT call-template script must contain a named xsl:template',
                elementId: functoidId
            });
            return null;
        }
        const parameters = Array.from(template.childNodes as ArrayLike<any>)
            .filter(child =>
                child.nodeType === 1 &&
                child.namespaceURI === xsltNamespace &&
                child.localName === 'param'
            )
            .map(parameter => parameter.getAttribute('name'))
            .filter((name): name is string => !!name);
        return {
            name: template.getAttribute('name'),
            parameters,
            definitions: scriptBody
        };
    }

    private compileVariablesForLinks(
        links: MapLink[],
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        contextPath: string | undefined,
        indent: number
    ): string {
        const orderedCompilations: FunctoidCompilation[] = [];
        const visitedVariables = new Set<string>();
        const collect = (compilation: FunctoidCompilation): void => {
            if (visitedVariables.has(compilation.variableName)) { return; }
            visitedVariables.add(compilation.variableName);

            const expression = [
                compilation.selectExpr,
                compilation.contentExpr,
                compilation.conditionalTest,
                ...(compilation.guardConditions || [])
            ].filter(Boolean).join(' ');
            for (const match of expression.matchAll(/\$var:([\w.-]+)/g)) {
                const dependency = [...this.compiledFunctoids.values()].find(candidate =>
                    candidate.variableName === match[1] &&
                    candidate.contextPath === contextPath
                );
                if (dependency) {
                    collect(dependency);
                }
            }
            orderedCompilations.push(compilation);
        };

        for (const link of links) {
            if (link.sourceType === LinkEndpointType.Functoid) {
                const functoid = page.functoids.find(candidate => candidate.id === link.sourceId);
                if (!functoid) { continue; }
                const compilation = this.compileFunctoid(functoid, page, linkGraph, contextPath);
                if (compilation) {
                    collect(compilation);
                }
            }
        }

        const visibleVariables = new Set(
            this.variableScopeStack.flatMap(scope => [...scope])
        );
        const currentScope = this.variableScopeStack[this.variableScopeStack.length - 1];
        let result = '';
        for (const compilation of orderedCompilations) {
            if (visibleVariables.has(compilation.variableName)) { continue; }
            result += this.renderVariable(compilation, indent);
            visibleVariables.add(compilation.variableName);
            currentScope?.add(compilation.variableName);
        }
        return result;
    }

    private renderVariable(compilation: FunctoidCompilation, indent: number): string {
        const pad = ' '.repeat(indent);
        if (compilation.conditionalTest) {
            let result = `${pad}<xsl:variable name="var:${compilation.variableName}">\n`;
            result += `${pad}  <xsl:if test="${compilation.conditionalTest}">\n`;
            if (compilation.selectExpr !== undefined) {
                result += `${pad}    <xsl:value-of select="${compilation.selectExpr}" />\n`;
            } else if (compilation.contentExpr) {
                result += `${this.indentLines(compilation.contentExpr, indent + 4)}\n`;
            }
            result += `${pad}  </xsl:if>\n`;
            result += `${pad}</xsl:variable>\n`;
            return result;
        }
        if (compilation.selectExpr !== undefined) {
            return `${pad}<xsl:variable name="var:${compilation.variableName}" select="${compilation.selectExpr}" />\n`;
        }
        if (compilation.contentExpr) {
            return `${pad}<xsl:variable name="var:${compilation.variableName}">\n`
                + `${this.indentLines(compilation.contentExpr, indent + 2)}\n`
                + `${pad}</xsl:variable>\n`;
        }
        return '';
    }

    private getTargetConditions(
        links: MapLink[],
        page: MapPage,
        contextPath?: string
    ): string[] {
        const conditions: string[] = [];
        for (const link of links) {
            if (link.sourceType === LinkEndpointType.SchemaNode && link.sourcePath) {
                if (this.sourcePathIsOptional(link.sourcePath)) {
                    conditions.push(this.pathToNodeXPath(link.sourcePath, contextPath));
                }
                continue;
            }
            if (link.sourceType === LinkEndpointType.Functoid) {
                const functoid = page.functoids.find(candidate => candidate.id === link.sourceId);
                if (!functoid) { continue; }
                const compilation = this.compiledFunctoids.get(
                    this.functoidCacheKey(functoid.id, contextPath)
                );
                if (compilation?.conditionalTest) {
                    conditions.push(compilation.conditionalTest);
                }
                conditions.push(...(compilation?.guardConditions || []));
            }
        }
        return [...new Set(conditions)];
    }

    private getNodeConditions(node: SchemaNode, page: MapPage, contextPath?: string): string[] {
        const links = page.links.filter(link =>
            link.targetType === LinkEndpointType.SchemaNode &&
            (link.targetPath === node.path || link.targetPath?.startsWith(`${node.path}/`)) &&
            this.linkAllowedInActiveLoop(link, page) &&
            !this.isFunctoidSource(link, page, 424) &&
            !this.isFunctoidSource(link, page, 801) &&
            !this.isFunctoidSource(link, page, 703) &&
            !this.isRawXsltSource(link, page)
        );
        if (links.length === 0) { return []; }
        const conditionsByLink = links.map(link => this.getTargetConditions([link], page, contextPath));
        if (conditionsByLink.some(conditions => conditions.length === 0)) { return []; }
        return [...new Set(conditionsByLink.flat())];
    }

    private linkAllowedInActiveLoop(link: MapLink, page: MapPage): boolean {
        if (this.activeLoopContexts.length === 0) { return true; }
        for (const context of this.activeLoopContexts) {
            if (link.sourceType === LinkEndpointType.Functoid && link.sourceId === context.functoidId) {
                continue;
            }
            const dependencies = this.getSourceDependencyPaths(link, page);
            if (dependencies.length === 0) { continue; }
            if (dependencies.some(path =>
                path !== context.sourcePath &&
                !path.startsWith(`${context.sourcePath}/`) &&
                !context.sourcePath.startsWith(`${path}/`)
            )) {
                return false;
            }
        }
        return true;
    }

    private linkHasConditionalSource(
        link: MapLink,
        page: MapPage,
        visited = new Set<string>()
    ): boolean {
        if (link.sourceType !== LinkEndpointType.Functoid || visited.has(link.sourceId)) {
            return false;
        }
        visited.add(link.sourceId);
        const functoid = page.functoids.find(candidate => candidate.id === link.sourceId);
        if (functoid?.functoidId === 374 || functoid?.functoidId === 375) {
            return true;
        }
        return page.links
            .filter(candidate =>
                candidate.targetType === LinkEndpointType.Functoid &&
                candidate.targetId === link.sourceId
            )
            .some(candidate => this.linkHasConditionalSource(candidate, page, new Set(visited)));
    }

    private findSourceNode(sourcePath: string): SchemaNode | undefined {
        const root = this.sourceTree?.rootElement;
        const parts = this.schemaPathParts(sourcePath);
        if (!root || parts[0] !== root.name) { return undefined; }
        let current: SchemaNode | undefined = root;
        for (const part of parts.slice(1)) {
            if (part.startsWith('@')) { return undefined; }
            current = current.children.find(child => child.name === part);
            if (!current) { return undefined; }
        }
        return current;
    }

    private sourcePathIsOptional(sourcePath: string): boolean {
        const root = this.sourceTree?.rootElement;
        const parts = this.schemaPathParts(sourcePath);
        if (!root || parts[0] !== root.name) { return false; }
        let current: SchemaNode | undefined = root;
        for (const part of parts.slice(1)) {
            if (part.startsWith('@')) { return false; }
            current = current.children.find(child => child.name === part);
            if (!current) { return false; }
            if (current.isOptional) { return true; }
        }
        return false;
    }

    private getSourceTestExpression(link: MapLink, page: MapPage): string | null {
        if (link.sourceType === LinkEndpointType.SchemaNode && link.sourcePath) {
            return this.pathToNodeXPath(link.sourcePath);
        }
        return null;
    }

    private hasAnyMapping(node: SchemaNode, page: MapPage): boolean {
        const targetValues = this.currentMap?.targetValues;
        if (targetValues?.[node.path] !== undefined ||
            node.attributes.some(attribute =>
                targetValues?.[`${node.path}/@${attribute.name}`] !== undefined)) {
            return true;
        }
        const hasDirectMapping = page.links.some(l =>
            l.targetType === LinkEndpointType.SchemaNode &&
            l.targetPath === node.path &&
            this.linkAllowedInActiveLoop(l, page)
        );
        if (hasDirectMapping) { return true; }

        // Check attributes
        if (node.attributes) {
            for (const attr of node.attributes) {
                const attrPath = `${node.path}/@${attr.name}`;
                if (page.links.some(l =>
                    l.targetPath === attrPath && this.linkAllowedInActiveLoop(l, page)
                )) { return true; }
            }
        }

        return node.children.some(child =>
            child.type !== SchemaNodeType.Any && this.hasAnyMapping(child, page));
    }

    private isEffectiveLeaf(node: SchemaNode): boolean {
        return node.children.every(child => child.type === SchemaNodeType.Any);
    }

    private getTargetNodeValue(node: SchemaNode): string | undefined {
        const explicit = this.currentMap?.targetValues?.[node.path];
        if (explicit !== undefined) { return explicit === '<empty>' ? '' : explicit; }
        if (!this.currentMap?.options.generateDefaultFixedNodes) { return undefined; }
        return node.fixedValue ?? node.defaultValue;
    }

    private generateSequenceOrderedChildren(
        children: SchemaNode[],
        page: MapPage,
        linkGraph: Map<string, MapLink[]>,
        indent: number,
        contextPath?: string
    ): string | undefined {
        if (!this.currentMap?.options.preserveSequenceOrder || children.length < 2) {
            return undefined;
        }
        const sourceRootPath = this.sourceTree?.rootElement
            ? `/${this.sourceTree.rootElement.name}`
            : undefined;
        const parentContext = contextPath || sourceRootPath;
        if (!parentContext) { return undefined; }
        const mappedChildren = children.filter(child => this.hasAnyMapping(child, page));
        const mappings = mappedChildren.map(child => {
            const links = page.links.filter(link =>
                link.targetType === LinkEndpointType.SchemaNode &&
                (link.targetPath === child.path || link.targetPath?.startsWith(`${child.path}/`)) &&
                this.linkAllowedInActiveLoop(link, page)
            );
            const dependency = links.flatMap(link => this.getSourceDependencyPaths(link, page))
                .find(path => path.startsWith(`${parentContext}/`));
            if (!dependency) { return undefined; }
            const relative = dependency.slice(parentContext.length + 1).split('/')[0];
            if (!relative || relative.startsWith('@')) { return undefined; }
            return {
                child,
                sourcePath: `${parentContext}/${relative}`,
                sourceNode: this.findSourceNode(`${parentContext}/${relative}`)
            };
        }).filter((mapping): mapping is {
            child: SchemaNode;
            sourcePath: string;
            sourceNode: SchemaNode | undefined;
        } => !!mapping);
        if (mappings.length !== mappedChildren.length || mappings.length < 2 ||
            new Set(mappings.map(mapping => mapping.sourcePath)).size < 2 ||
            mappedChildren.some(child =>
                child.maxOccurs !== 'unbounded' &&
                !(typeof child.maxOccurs === 'number' && child.maxOccurs > 1)
            )) {
            return undefined;
        }

        const pad = ' '.repeat(indent);
        let result = `${pad}<xsl:for-each select="*">\n`;
        for (const mapping of mappings) {
            const test = mapping.sourceNode?.namespace
                ? `self::${this.sourceNamespacePrefixes.get(mapping.sourceNode.namespace)}:${mapping.sourceNode.name}`
                : `local-name()='${mapping.sourceNode?.name || mapping.sourcePath.split('/').pop()}'`;
            result += `${pad}  <xsl:if test="${test}">\n`;
            this.variableScopeStack.push(new Set());
            result += this.generateTargetChildElement(
                mapping.child,
                page,
                linkGraph,
                indent + 4,
                mapping.sourcePath
            );
            this.variableScopeStack.pop();
            result += `${pad}  </xsl:if>\n`;
        }
        result += `${pad}</xsl:for-each>\n`;
        return result;
    }

    private generateIndexExpression(
        inputs: string[],
        functoid: MapFunctoid
    ): string {
        const source = inputs[0] || '.';
        const indices = inputs.length > 1 ? inputs.slice(1) : ['1'];
        const segments = source.split('/');
        const sourceLink = this.currentPage?.links.find(link =>
            link.targetType === LinkEndpointType.Functoid &&
            link.targetId === functoid.id &&
            link.sourceType === LinkEndpointType.SchemaNode
        );
        const repeatingNames: string[] = [];
        if (sourceLink?.sourcePath && this.sourceTree?.rootElement) {
            const parts = sourceLink.sourcePath.split('/').filter(Boolean);
            let node: SchemaNode | undefined = parts[0] === this.sourceTree.rootElement.name
                ? this.sourceTree.rootElement
                : undefined;
            for (const part of parts.slice(1)) {
                if (!node || part.startsWith('@')) { break; }
                node = node.children.find(child => child.name === part);
                if (node && (node.maxOccurs === 'unbounded' ||
                    (typeof node.maxOccurs === 'number' && node.maxOccurs > 1))) {
                    repeatingNames.push(node.name);
                }
            }
        }
        const candidates = repeatingNames.reverse();
        if (candidates.length === 0) {
            candidates.push(segments.filter(segment => !!segment && segment !== '..' && segment !== '.').pop() || '.');
        }
        indices.forEach((value, index) => {
            const name = candidates[index];
            for (let segment = segments.length - 1; segment >= 0; segment--) {
                const localName = segments[segment].replace(/\[.*$/, '').split(':').pop();
                if (localName === name || segments[segment].includes(`local-name()='${name}'`)) {
                    segments[segment] += `[number(${value || '1'})]`;
                    break;
                }
            }
        });
        return segments.join('/');
    }

    private getTargetAttributeValue(node: SchemaNode, attribute: SchemaNode['attributes'][number]): string | undefined {
        const explicit = this.currentMap?.targetValues?.[`${node.path}/@${attribute.name}`];
        if (explicit !== undefined) { return explicit === '<empty>' ? '' : explicit; }
        if (!this.currentMap?.options.generateDefaultFixedNodes) { return undefined; }
        return attribute.fixedValue ?? attribute.defaultValue;
    }

    private hasNillableNodes(node: SchemaNode | undefined): boolean {
        return !!node && (!!node.nillable || node.children.some(child => this.hasNillableNodes(child)));
    }

    private hasInheritedNodes(node: SchemaNode | undefined): boolean {
        return !!node && (!!node.baseType || node.children.some(child => this.hasInheritedNodes(child)));
    }

    /**
     * Returns the raw source path for the for-each context (used to compute relative XPaths)
     */
    private findForEachSourcePaths(node: SchemaNode, page: MapPage): string[] {
        const loopLink = page.links.find(link =>
            link.targetType === LinkEndpointType.SchemaNode &&
            link.targetPath === node.path &&
            link.sourceType === LinkEndpointType.Functoid &&
            page.functoids.some(f =>
                f.id === link.sourceId && (f.functoidId === 424 || f.functoidId === 801 || f.functoidId === 703)
            )
        );
        if (loopLink) {
            const loopFunctoid = page.functoids.find(functoid => functoid.id === loopLink.sourceId);
            if (loopFunctoid?.functoidId === 703) {
                const loopInput = this.findLoopingInputLink(loopFunctoid, page);
                return loopInput?.sourcePath ? [loopInput.sourcePath] : [];
            }
            return this.findLoopingInputLinks(loopFunctoid, page)
                .map(link => link.sourcePath)
                .filter((path): path is string => !!path);
        }

        const descendantLinks = page.links.filter(l =>
            l.targetType === LinkEndpointType.SchemaNode &&
            l.targetPath?.startsWith(node.path + '/')
        );
        if (descendantLinks.length === 0) return [];
        const sourcePaths = descendantLinks.flatMap(link =>
            this.getSourceDependencyPaths(link, page)
        );
        if (sourcePaths.length === 0) return [];
        const directives = new Set(
            descendantLinks.map(link => link.targetLinkOption || TargetLinkOption.Flattening)
                .filter(option => option !== TargetLinkOption.Flattening)
        );
        const directive = directives.size === 1
            ? [...directives][0]
            : TargetLinkOption.Flattening;
        const repeatingPaths = sourcePaths.map(path => this.findRepeatingSourcePaths(path));
        const commonRepeatingPaths = repeatingPaths[0]?.filter(path =>
            repeatingPaths.every(paths => paths.includes(path))
        ) || [];
        if (commonRepeatingPaths.length > 0) {
            return [directive === TargetLinkOption.TopDown
                ? commonRepeatingPaths[0]
                : commonRepeatingPaths[commonRepeatingPaths.length - 1]];
        }
        const uniqueDeepestPaths = new Set(
            sourcePaths.map(path => this.findDeepestRepeatingSourcePath(path)).filter(Boolean)
        );
        if (uniqueDeepestPaths.size === 1) {
            return [[...uniqueDeepestPaths][0] as string];
        }
        const commonPrefix = this.findCommonPrefix(sourcePaths);
        return commonPrefix ? [commonPrefix] : [];
    }

    private findRepeatingSourcePaths(sourcePath: string): string[] {
        const root = this.sourceTree?.rootElement;
        const parts = sourcePath.split('/').filter(Boolean);
        if (!root || parts[0] !== root.name) { return []; }
        const paths: string[] = [];
        let current: SchemaNode | undefined = root;
        for (let index = 1; current && index < parts.length; index++) {
            current = current.children.find(child => child.name === parts[index]);
            if (current && this.isSourceLoopContext(current)) {
                paths.push(`/${parts.slice(0, index + 1).join('/')}`);
            }
        }
        return paths;
    }

    private isSourceLoopContext(node: SchemaNode): boolean {
        const repeats = node.maxOccurs === 'unbounded' ||
            (typeof node.maxOccurs === 'number' && node.maxOccurs > 1);
        return repeats || (!this.currentMap?.options.treatElementsAsRecords && node.isOptional);
    }

    private findLoopingInputLink(functoid: MapFunctoid | undefined, page: MapPage): MapLink | undefined {
        return this.findLoopingInputLinks(functoid, page)[0];
    }

    private findLoopingInputLinks(functoid: MapFunctoid | undefined, page: MapPage): MapLink[] {
        if (!functoid) { return []; }
        const inputs = page.links.filter(link =>
            link.targetType === LinkEndpointType.Functoid &&
            link.targetId === functoid.id &&
            link.sourceType === LinkEndpointType.SchemaNode
        );
        const byId = new Map(inputs.map(link => [link.id, link]));
        const ordered = functoid.parameters
            .filter(parameter => parameter.type === 'link')
            .sort((left, right) => left.index - right.index)
            .map(parameter => byId.get(parameter.value))
            .filter((link): link is MapLink => !!link);
        const orderedIds = new Set(ordered.map(link => link.id));
        return [...ordered, ...inputs.filter(link => !orderedIds.has(link.id))];
    }

    private getSourceDependencyPaths(link: MapLink, page: MapPage, visited = new Set<string>()): string[] {
        if (link.sourceType === LinkEndpointType.SchemaNode) {
            return link.sourcePath ? [link.sourcePath] : [];
        }
        if (visited.has(link.sourceId)) { return []; }
        visited.add(link.sourceId);
        return page.links
            .filter(candidate =>
                candidate.targetType === LinkEndpointType.Functoid &&
                candidate.targetId === link.sourceId
            )
            .flatMap(candidate => this.getSourceDependencyPaths(candidate, page, visited));
    }

    private findCommonPrefix(paths: string[]): string {
        if (paths.length === 0) { return ''; }
        const split = paths.map(p => p.split('/').filter(s => s.length > 0));
        const minLen = Math.min(...split.map(s => s.length));
        const common: string[] = [];
        for (let i = 0; i < minLen - 1; i++) { // -1 to exclude the leaf
            const seg = split[0][i];
            if (split.every(s => s[i] === seg)) {
                common.push(seg);
            } else { break; }
        }
        return '/' + common.join('/');
    }

    private inferTargetRootName(page: MapPage): string | undefined {
        // Infer root element name from target link paths (first path segment after leading /)
        const targetLinks = page.links.filter(l => l.targetType === LinkEndpointType.SchemaNode && l.targetPath);
        for (const link of targetLinks) {
            const parts = link.targetPath!.replace(/^\//, '').split('/');
            if (parts.length > 0 && parts[0]) {
                // Strip namespace prefix if present
                const name = parts[0].includes(':') ? parts[0].split(':')[1] : parts[0];
                return name;
            }
        }
        return undefined;
    }

    private inferSourceRootName(page: MapPage): string | undefined {
        for (const link of page.links) {
            if (link.sourceType !== LinkEndpointType.SchemaNode || !link.sourcePath) { continue; }
            const [root] = this.schemaPathParts(link.sourcePath);
            if (root) {
                return root.includes(':') ? root.split(':').pop() : root;
            }
        }
        return undefined;
    }

    private schemaPathParts(path: string): string[] {
        return path.split('/').filter(part =>
            part.length > 0 && !(/^<[^<>]+>$/.test(part))
        );
    }

    private generateSimpleTarget(page: MapPage, linkGraph: Map<string, MapLink[]>, indent: number): string {
        // Build target element tree from link paths
        const targetLinks = page.links.filter(l => l.targetType === LinkEndpointType.SchemaNode && l.targetPath);
        if (targetLinks.length === 0) return '';

        // Build a tree structure from paths
        interface TreeNode {
            name: string;
            isAttribute: boolean;
            children: Map<string, TreeNode>;
            links: MapLink[];
        }

        const root: TreeNode = { name: '', isAttribute: false, children: new Map(), links: [] };

        for (const link of targetLinks) {
            const parts = this.schemaPathParts(link.targetPath || '');
            let current = root;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isAttr = part.startsWith('@');
                const name = isAttr ? part.substring(1) : part;
                const key = part; // keep @ prefix for uniqueness
                if (!current.children.has(key)) {
                    current.children.set(key, { name, isAttribute: isAttr, children: new Map(), links: [] });
                }
                current = current.children.get(key)!;
                if (i === parts.length - 1) {
                    current.links.push(link);
                }
            }
        }

        // Render the tree - skip the root level (it's the document root element which is handled by the template)
        const renderNode = (node: TreeNode, depth: number): string => {
            const pad = ' '.repeat(depth);
            let result = '';
            const prefix = this.targetNamespace
                ? `${this.targetNamespacePrefixes.get(this.targetNamespace) || 'ns0'}:`
                : '';

            // Collect attributes and elements
            const attrs: TreeNode[] = [];
            const elements: TreeNode[] = [];
            for (const child of node.children.values()) {
                if (child.isAttribute) attrs.push(child);
                else elements.push(child);
            }

            // Emit attributes first
            for (const attr of attrs) {
                result += this.compileVariablesForLinks(attr.links, page, linkGraph, undefined, depth);
                for (const link of attr.links) {
                    const expr = this.getSourceExpression(link, page, linkGraph);
                    result += `${pad}<xsl:attribute name="${attr.name}">\n`;
                    result += `${pad}  <xsl:value-of select="${expr}" />\n`;
                    result += `${pad}</xsl:attribute>\n`;
                }
            }

            // Emit elements
            for (const elem of elements) {
                if (elem.links.length > 0 && elem.children.size === 0) {
                    // Leaf element with mapping
                    const rawLinks = elem.links.filter(link => this.isRawXsltSource(link, page));
                    if (rawLinks.length > 0) {
                        result += this.renderRawXsltLinks(rawLinks, page, linkGraph, undefined, depth);
                        continue;
                    }
                    result += this.compileVariablesForLinks(elem.links, page, linkGraph, undefined, depth);
                    const conditions = this.getTargetConditions(elem.links, page);
                    if (conditions.length > 0) {
                        result += `${pad}<xsl:if test="${conditions.join(' or ')}">\n`;
                    }
                    const valuePad = conditions.length > 0 ? `${pad}  ` : pad;
                    result += `${valuePad}<${prefix}${elem.name}>\n`;
                    for (const link of elem.links) {
                        const expr = this.getSourceExpression(link, page, linkGraph);
                        const usesCopyOf = this.isNodeContentSource(link, page);
                        const xslInstr = usesCopyOf ? 'copy-of' : 'value-of';
                        result += `${valuePad}  <xsl:${xslInstr} select="${expr}" />\n`;
                    }
                    result += `${valuePad}</${prefix}${elem.name}>\n`;
                    if (conditions.length > 0) {
                        result += `${pad}</xsl:if>\n`;
                    }
                } else if (elem.children.size > 0) {
                    // Container element - recurse
                    const rawLinks = elem.links.filter(link => this.isRawXsltSource(link, page));
                    if (rawLinks.length > 0) {
                        result += this.renderRawXsltLinks(rawLinks, page, linkGraph, undefined, depth);
                        continue;
                    }
                    result += this.compileVariablesForLinks(elem.links, page, linkGraph, undefined, depth);
                    result += `${pad}<${prefix}${elem.name}>\n`;
                    for (const link of elem.links) {
                        const expr = this.getSourceExpression(link, page, linkGraph);
                        result += `${pad}  <xsl:value-of select="${expr}" />\n`;
                    }
                    result += renderNode(elem, depth + 2);
                    result += `${pad}</${prefix}${elem.name}>\n`;
                }
            }

            return result;
        };

        // The first level in root.children is the target root element
        let result = '';
        for (const topNode of root.children.values()) {
            if (!topNode.isAttribute) {
                // This is the target root - render its children (root element emitted by caller)
                result += renderNode(topNode, indent);
            }
        }
        return result;
    }

    private addNamedTemplate(name: string, template: string): void {
        if (!this.namedTemplates.has(name)) {
            this.namedTemplates.set(name, template);
        }
    }

    private addScriptFunction(name: string, code: string): void {
        if (!this.scriptFunctions.has(name)) {
            this.scriptFunctions.set(name, code);
        }
    }

    private addVbScriptFunction(name: string, code: string): void {
        if (!this.vbScriptFunctions.has(name)) {
            this.vbScriptFunctions.set(name, code);
        }
    }

    private addJScriptFunction(name: string, code: string): void {
        if (!this.jscriptFunctions.has(name)) {
            this.jscriptFunctions.set(name, code);
        }
    }

    private renderScriptAssemblyReferences(references: Set<string>): string {
        return [...references].map(reference => {
            const attribute = /[\\/]/.test(reference) || /\.dll$/i.test(reference) ? 'href' : 'name';
            return `\n    <msxsl:assembly ${attribute}="${this.escapeXmlAttribute(reference)}" />`;
        }).join('');
    }

    private renderExternalAssemblyScript(external: {
        assemblyName: string;
        className: string;
        methods: Map<string, Set<number>>;
        methodMetadata: Map<string, {
            parameterTypes: string[];
            returnType?: string;
            isStatic?: boolean;
        }>;
        prefix: string;
    }): string {
        const classSeparator = external.className.lastIndexOf('.');
        const classNamespace = classSeparator > 0
            ? external.className.substring(0, classSeparator)
            : '';
        const shortClassName = classSeparator > 0
            ? external.className.substring(classSeparator + 1)
            : external.className;
        const methods = [...external.methods.entries()].flatMap(([methodName, counts]) =>
            [...counts].map(parameterCount => {
                const metadata = external.methodMetadata.get(`${methodName}/${parameterCount}`);
                if (metadata?.parameterTypes.length === parameterCount) {
                    const declarations = metadata.parameterTypes.map(
                        (type, index) => `${this.toCSharpTypeName(type)} param${index}`
                    ).join(', ');
                    const argumentsList = metadata.parameterTypes.map(
                        (_, index) => `param${index}`
                    ).join(', ');
                    if (metadata.isStatic) {
                        return `public object ${methodName}(${declarations})\n`
                            + `{\n`
                            + `    return ${shortClassName}.${methodName}(${argumentsList});\n`
                            + `}`;
                    }
                    return `public object ${methodName}(${declarations})\n`
                        + `{\n`
                        + `    ${shortClassName} helper = new ${shortClassName}();\n`
                        + `    return helper.${methodName}(${argumentsList});\n`
                        + `}`;
                }
                const declarations = Array.from(
                    { length: parameterCount },
                    (_, index) => `string param${index}`
                ).join(', ');
                const argumentsList = Array.from(
                    { length: parameterCount },
                    (_, index) =>
                        `System.Convert.ChangeType(param${index}, targetParameters[${index}].ParameterType, `
                        + `System.Globalization.CultureInfo.InvariantCulture)`
                ).join(', ');
                return `public object ${methodName}(${declarations})\n`
                    + `{\n`
                    + `    System.Reflection.MethodInfo targetMethod = null;\n`
                    + `    foreach (System.Reflection.MethodInfo candidate in typeof(${shortClassName}).GetMethods())\n`
                    + `    {\n`
                    + `        if (candidate.Name == "${methodName}" `
                    + `&& candidate.GetParameters().Length == ${parameterCount})\n`
                    + `        {\n`
                    + `            targetMethod = candidate;\n`
                    + `            break;\n`
                    + `        }\n`
                    + `    }\n`
                    + `    if (targetMethod == null)\n`
                    + `        throw new System.MissingMethodException(typeof(${shortClassName}).FullName, `
                    + `"${methodName}");\n`
                    + `    System.Reflection.ParameterInfo[] targetParameters = targetMethod.GetParameters();\n`
                    + `    object[] arguments = new object[] { ${argumentsList} };\n`
                    + `    object target = targetMethod.IsStatic ? null : `
                    + `System.Activator.CreateInstance(typeof(${shortClassName}));\n`
                    + `    return targetMethod.Invoke(target, arguments);\n`
                    + `}`;
            })
        );

        let script = `\n  <msxsl:script language="C#" implements-prefix="${external.prefix}">`;
        script += this.renderScriptAssemblyReferences(new Set([external.assemblyName]));
        if (classNamespace) {
            script += `\n    <msxsl:using namespace="${this.escapeXmlAttribute(classNamespace)}" />`;
        }
        script += `<![CDATA[\n${methods.join('\n\n')}\n]]></msxsl:script>\n`;
        return script;
    }

    private addExternalAssemblyScript(
        assemblyName: string,
        className: string,
        methodName: string,
        parameterCount: number,
        parameterTypes?: string[],
        returnType?: string,
        isStatic?: boolean
    ): string {
        const existing = this.externalAssemblyScripts.find(ext =>
            ext.assemblyName === assemblyName && ext.className === className
        );
        if (existing) {
            const counts = existing.methods.get(methodName) || new Set<number>();
            counts.add(parameterCount);
            existing.methods.set(methodName, counts);
            if (parameterTypes?.length) {
                existing.methodMetadata.set(`${methodName}/${parameterCount}`, {
                    parameterTypes,
                    returnType,
                    isStatic
                });
            }
            return existing.prefix;
        }

        const prefix = `ScriptNS${this.externalAssemblyScripts.length}`;
        this.externalAssemblyScripts.push({
            assemblyName,
            className,
            methods: new Map([[methodName, new Set([parameterCount])]]),
            methodMetadata: new Map(parameterTypes?.length ? [[`${methodName}/${parameterCount}`, {
                parameterTypes,
                returnType,
                isStatic
            }]] : []),
            prefix
        });
        return prefix;
    }

    private formatExternalAssemblyInput(input: string, parameterType?: string): string {
        const type = parameterType?.toLowerCase();
        if (type && [
            'system.byte', 'system.sbyte', 'system.int16', 'system.uint16',
            'system.int32', 'system.uint32', 'system.int64', 'system.uint64',
            'system.single', 'system.double', 'system.decimal'
        ].includes(type)) {
            return `number(${input})`;
        }
        if (type === 'system.boolean') {
            return `boolean(${input})`;
        }
        return `string(${input})`;
    }

    private toCSharpTypeName(type: string): string {
        return type.replace(/\+/g, '.');
    }

    private generateExtensionObjectXml(): string {
        const objects = this.externalAssemblyScripts.map(ext => {
            const methods = [...ext.methods.entries()].flatMap(([name, counts]) =>
                [...counts].map(count =>
                    `    <Method Name="${this.escapeXmlAttribute(name)}" ParameterCount="${count}" />`
                )
            );
            return `  <ExtensionObject Namespace="http://schemas.microsoft.com/BizTalk/2003/${ext.prefix}" `
                + `AssemblyName="${this.escapeXmlAttribute(ext.assemblyName)}" `
                + `ClassName="${this.escapeXmlAttribute(ext.className)}">\n`
                + `${methods.join('\n')}\n`
                + `  </ExtensionObject>`;
        });
        const customObjects = this.customExtensionXml?.match(
            /<ExtensionObjects\b[^>]*>([\s\S]*?)<\/ExtensionObjects>/i
        )?.[1]?.trim();
        const entries = [...objects, ...(customObjects ? [customObjects] : [])];
        return `<?xml version="1.0" encoding="utf-8"?>\n<ExtensionObjects>`
            + `${entries.length > 0 ? `\n${entries.join('\n')}\n` : ''}</ExtensionObjects>`;
    }

    private escapeXmlAttribute(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    private indentLines(value: string, indent: number): string {
        const pad = ' '.repeat(indent);
        return value
            .split('\n')
            .map(line => `${pad}${line}`)
            .join('\n');
    }

    // C# Script implementations matching BizTalk's functoid output

    private getMathAggregateScript(name: string, operation: '+' | '-' | '*', count: number): string {
        const parameters = Array.from({ length: count }, (_, i) => `string param${i}`).join(', ');
        const initial = operation === '*' ? '1' : '0';
        const firstValue = operation === '-' ? 'values[0]' : initial;
        const start = operation === '-' ? '1' : '0';
        return `public string ${name}(${parameters})
{
    string[] values = new string[] { ${Array.from({ length: count }, (_, i) => `param${i}`).join(', ')} };
    double result = ${firstValue};
    for (int i = ${start}; i < values.Length; i++)
    {
        double value;
        if (!Double.TryParse(values[i], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out value))
            return "";
        result ${operation}= value;
    }
    return result.ToString(System.Globalization.CultureInfo.InvariantCulture);
}`.replace('double result = values[0];', `double result;
    if (!Double.TryParse(values[0], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out result))
        return "";`);
    }

    private getMathExtremaScript(name: string, comparison: '<' | '>', count: number): string {
        const parameters = Array.from({ length: count }, (_, i) => `string param${i}`).join(', ');
        return `public string ${name}(${parameters})
{
    string[] values = new string[] { ${Array.from({ length: count }, (_, i) => `param${i}`).join(', ')} };
    double result;
    if (!Double.TryParse(values[0], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out result))
        return "";
    for (int i = 1; i < values.Length; i++)
    {
        double value;
        if (!Double.TryParse(values[i], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out value))
            return "";
        if (value ${comparison} result) result = value;
    }
    return result.ToString(System.Globalization.CultureInfo.InvariantCulture);
}`;
    }

    private getLogicalCompareScript(): string {
        return `public bool LogicalCompare(string left, string right, string operation)
{
    double leftNumber, rightNumber;
    int comparison;
    if (Double.TryParse(left, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out leftNumber)
        && Double.TryParse(right, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out rightNumber))
        comparison = leftNumber.CompareTo(rightNumber);
    else
        comparison = String.Compare(left, right, StringComparison.Ordinal);

    switch (operation)
    {
        case "gt": return comparison > 0;
        case "gte": return comparison >= 0;
        case "lt": return comparison < 0;
        case "lte": return comparison <= 0;
        case "eq": return comparison == 0;
        default: return comparison != 0;
    }
}`;
    }

    private getValToBoolScript(): string {
        return `public bool ValToBool(string value)
{
    if (value == null) return false;
    value = value.Trim();
    bool booleanValue;
    if (Boolean.TryParse(value, out booleanValue)) return booleanValue;
    double numericValue;
    return Double.TryParse(value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out numericValue)
        && numericValue > 0;
}`;
    }

    private getLogicalAggregateScript(name: string, operation: '&&' | '||', count: number): string {
        const parameters = Array.from({ length: count }, (_, i) => `string param${i}`).join(', ');
        const expression = Array.from({ length: count }, (_, i) => `ValToBool(param${i})`).join(` ${operation} `);
        return `public bool ${name}(${parameters})
{
    return ${expression};
}`;
    }

    private getLogicalIsDateScript(): string {
        return `public bool LogicalIsDate(string value)
{
    DateTime parsed;
    return DateTime.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out parsed);
}`;
    }

    private getCumulativeNumberScript(name: string, comparison: '<' | '>'): string {
        return `public string ${name}(System.Xml.XPath.XPathNodeIterator nodes)
{
    bool found = false;
    double result = 0;
    while (nodes.MoveNext())
    {
        double value;
        if (!Double.TryParse(nodes.Current.Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out value))
            continue;
        if (!found || value ${comparison} result) result = value;
        found = true;
    }
    return found ? result.ToString(System.Globalization.CultureInfo.InvariantCulture) : "";
}`;
    }

    private getCumulativeConcatenateScript(): string {
        return `public string CumulativeConcatenate(System.Xml.XPath.XPathNodeIterator nodes)
{
    System.Text.StringBuilder result = new System.Text.StringBuilder();
    while (nodes.MoveNext()) result.Append(nodes.Current.Value);
    return result.ToString();
}`;
    }

    private getDatabaseFunctoidScripts(): string {
        return `private Microsoft.BizTalk.BaseFunctoids.FunctoidScripts databaseFunctoids =
    new Microsoft.BizTalk.BaseFunctoids.FunctoidScripts();

public string DatabaseLookup(int index, string value, string connectionString, string table, string column)
{
    return databaseFunctoids.DBLookup(index, value, connectionString, table, column);
}

public string DatabaseValueExtract(string index, string column)
{
    int parsedIndex;
    return Int32.TryParse(index, out parsedIndex) ? databaseFunctoids.DBValueExtract(parsedIndex, column) : "";
}

public string DatabaseErrorExtract(string index)
{
    int parsedIndex;
    return Int32.TryParse(index, out parsedIndex) ? databaseFunctoids.DBErrorExtract(parsedIndex) : "";
}`;
    }

    private getMathMultiplyScript(): string {
        return `public string MathMultiply(string param0, string param1)
{
    System.Collections.ArrayList listValues = new System.Collections.ArrayList();
    listValues.Add(param0);
    listValues.Add(param1);
    double ret = 1;
    bool first = true;
    foreach (string obj in listValues)
    {
        double d = 0;
        if (IsNumeric(obj, ref d))
        {
            if (first) { first = false; ret = d; }
            else { ret *= d; }
        }
        else { return ""; }
    }
    return ret.ToString(System.Globalization.CultureInfo.InvariantCulture);
}`;
    }

    private getMathMaxScript(): string {
        return `public string MathMax(string param0, string param1)
{
    double d0 = 0, d1 = 0;
    if (IsNumeric(param0, ref d0) && IsNumeric(param1, ref d1))
        return (d0 > d1 ? d0 : d1).ToString(System.Globalization.CultureInfo.InvariantCulture);
    return "";
}`;
    }

    private getMathMinScript(): string {
        return `public string MathMin(string param0, string param1)
{
    double d0 = 0, d1 = 0;
    if (IsNumeric(param0, ref d0) && IsNumeric(param1, ref d1))
        return (d0 < d1 ? d0 : d1).ToString(System.Globalization.CultureInfo.InvariantCulture);
    return "";
}`;
    }

    private getDateCurrentDateTimeScript(): string {
        return `public string DateCurrentDateTime()
{
    DateTime dt = DateTime.Now;
    string curdate = dt.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
    string curtime = dt.ToString("T", System.Globalization.CultureInfo.InvariantCulture);
    return curdate + "T" + curtime;
}`;
    }

    private getDateCurrentDateScript(): string {
        return `public string DateCurrentDate()
{
    DateTime dt = DateTime.Now;
    return dt.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
}`;
    }

    private getDateCurrentTimeScript(): string {
        return `public string DateCurrentTime()
{
    DateTime dt = DateTime.Now;
    return dt.ToString("T", System.Globalization.CultureInfo.InvariantCulture);
}`;
    }

    private getDateAddDaysScript(): string {
        return `public string DateAddDays(string date, string days)
{
    DateTime dt;
    if (DateTime.TryParse(date, out dt))
    {
        double d = 0;
        if (Double.TryParse(days, out d))
        {
            return dt.AddDays(d).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        }
    }
    return "";
}`;
    }

    private getMathAddScript(): string {
        return `public string MathAdd(string param0, string param1)
{
    System.Collections.ArrayList listValues = new System.Collections.ArrayList();
    listValues.Add(param0);
    listValues.Add(param1);
    double ret = 0;
    foreach (string obj in listValues)
    {
        double d = 0;
        if (IsNumeric(obj, ref d))
        {
            ret += d;
        }
        else { return ""; }
    }
    return ret.ToString(System.Globalization.CultureInfo.InvariantCulture);
}`;
    }

    private getMathSubtractScript(): string {
        return `public string MathSubtract(string param0, string param1)
{
    double d0 = 0, d1 = 0;
    if (IsNumeric(param0, ref d0) && IsNumeric(param1, ref d1))
    {
        return (d0 - d1).ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
    return "";
}`;
    }

    private getMathDivideScript(): string {
        return `public string MathDivide(string param0, string param1)
{
    double d0 = 0, d1 = 0;
    if (IsNumeric(param0, ref d0) && IsNumeric(param1, ref d1))
    {
        if (d1 == 0) return "";
        return (d0 / d1).ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
    return "";
}`;
    }

    private getMathModScript(): string {
        return `public string MathMod(string param0, string param1)
{
    double d0 = 0, d1 = 0;
    if (IsNumeric(param0, ref d0) && IsNumeric(param1, ref d1))
    {
        if (d1 == 0) return "";
        double r = d0 % d1;
        if (r == 0) r = 0;
        return r.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
    return "";
}`;
    }

    private getIsNumericScript(): string {
        return `public bool IsNumeric(string val)
{
    if (val == null) { return false; }
    double d = 0;
    return Double.TryParse(val, System.Globalization.NumberStyles.AllowThousands | System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out d);
}

public bool IsNumeric(string val, ref double d)
{
    if (val == null) { return false; }
    return Double.TryParse(val, System.Globalization.NumberStyles.AllowThousands | System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out d);
}`;
    }

    private getStringTrimLeftScript(): string {
        return `public string StringTrimLeft(string str)
{
	if (str == null)
	{
		return "";
	}
	return str.TrimStart(null);
}`;
    }

    private getStringTrimRightScript(): string {
        return `public string StringTrimRight(string str)
{
	if (str == null)
	{
		return "";
	}
	return str.TrimEnd(null);
}`;
    }

    private getMathSqrtScript(): string {
        return `public string MathSqrt(string val)
{
	double d = 0;
	if (IsNumeric(val, ref d))
		return System.Math.Sqrt(d).ToString(System.Globalization.CultureInfo.InvariantCulture);
	return "";
}`;
    }

    // Generic single-argument scientific script. `expr` uses the parsed value `d`.
    private getMathUnaryScript(name: string, expr: string): string {
        return `public string ${name}(string param0)
{
    double d = 0;
    if (Double.TryParse(param0, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out d))
        return (${expr}).ToString(System.Globalization.CultureInfo.InvariantCulture);
    return "";
}`;
    }

    // Generic two-argument scientific script. `expr` uses parsed values `d0` and `d1`.
    private getMathBinaryScript(name: string, expr: string): string {
        return `public string ${name}(string param0, string param1)
{
    double d0 = 0, d1 = 0;
    if (Double.TryParse(param0, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out d0)
        && Double.TryParse(param1, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out d1))
        return (${expr}).ToString(System.Globalization.CultureInfo.InvariantCulture);
    return "";
}`;
    }

    private getConvertChrScript(): string {
        return `public string ConvertChr(string param0)
{
    int code = 0;
    if (Int32.TryParse(param0, out code))
        return ((char)code).ToString();
    return "";
}`;
    }

    private getConvertAscScript(): string {
        return `public string ConvertAsc(string param0)
{
    if (param0 == null || param0.Length == 0) return "";
    return ((int)param0[0]).ToString(System.Globalization.CultureInfo.InvariantCulture);
}`;
    }

    private getConvertHexScript(): string {
        return `public string ConvertHex(string param0)
{
    long n = 0;
    if (Int64.TryParse(param0, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out n))
        return System.Convert.ToString(n, 16).ToUpperInvariant();
    return "";
}`;
    }

    private getConvertOctScript(): string {
        return `public string ConvertOct(string param0)
{
    long n = 0;
    if (Int64.TryParse(param0, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out n))
        return System.Convert.ToString(n, 8);
    return "";
}`;
    }
}
