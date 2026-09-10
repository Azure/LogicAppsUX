/**
 * BizTalk Data Mapper - BTM File Serializer
 * Reads and writes .btm map files (XML format)
 */

import { XMLParser } from 'fast-xml-parser';
import { create } from 'xmlbuilder2';
import {
    MapDocument, MapPage, MapLink, MapFunctoid,
    MapOptions, SchemaReference, LinkEndpointType,
    FunctoidCategory, ParameterType, ScriptType, DEFAULT_MAP_OPTIONS,
    SourceLinkOption, TargetLinkOption
} from '../model';
import { FunctoidRegistry } from '../functoids/functoidRegistry';

/**
 * Maps real BizTalk Functoid IDs (FIDs) to their categories.
 * These IDs come from BizTalk Server's Mapper tool.
 */
const BIZTALK_FID_CATEGORY_MAP: Record<number, FunctoidCategory> = {
    // String (101-110)
    101: FunctoidCategory.String,  // String Find
    102: FunctoidCategory.String,  // String Left
    103: FunctoidCategory.String,  // String Lowercase
    104: FunctoidCategory.String,  // String Right
    105: FunctoidCategory.String,  // String Size
    106: FunctoidCategory.String,  // String Extract
    107: FunctoidCategory.String,  // String Concatenate
    108: FunctoidCategory.String,  // String Left Trim
    109: FunctoidCategory.String,  // String Right Trim
    110: FunctoidCategory.String,  // String Uppercase
    // Math (111-121)
    111: FunctoidCategory.Math,    // Absolute Value
    112: FunctoidCategory.Math,    // Integer
    113: FunctoidCategory.Math,    // Maximum Value
    114: FunctoidCategory.Math,    // Minimum Value
    115: FunctoidCategory.Math,    // Modulo
    116: FunctoidCategory.Math,    // Round
    117: FunctoidCategory.Math,    // Square Root
    118: FunctoidCategory.Math,    // Addition
    119: FunctoidCategory.Math,    // Subtraction
    120: FunctoidCategory.Math,    // Multiplication
    121: FunctoidCategory.Math,    // Division
    // Date/Time (122-125)
    122: FunctoidCategory.DateTime,  // Add Days
    123: FunctoidCategory.DateTime,  // Date
    124: FunctoidCategory.DateTime,  // Time
    125: FunctoidCategory.DateTime,  // Date and Time
    // Conversion (126-129)
    126: FunctoidCategory.Conversion, // ASCII to Character
    127: FunctoidCategory.Conversion, // Character to ASCII
    128: FunctoidCategory.Conversion, // Hexadecimal
    129: FunctoidCategory.Conversion, // Octal
    // Scientific (130-139)
    130: FunctoidCategory.Scientific, // Arc Tangent
    131: FunctoidCategory.Scientific, // Cosine
    132: FunctoidCategory.Scientific, // Sine
    133: FunctoidCategory.Scientific, // Tangent
    134: FunctoidCategory.Scientific, // Natural Exponential
    135: FunctoidCategory.Scientific, // Natural Logarithm
    136: FunctoidCategory.Scientific, // 10^X
    137: FunctoidCategory.Scientific, // Common Logarithm (Log10)
    138: FunctoidCategory.Scientific, // X^Y
    139: FunctoidCategory.Scientific, // Base-Specified Logarithm
    // Scripting
    260: FunctoidCategory.Advanced,  // Scripting
    // Logical (311-321, 374-375, 701, 705, 706)
    311: FunctoidCategory.Logical,  // Greater Than
    312: FunctoidCategory.Logical,  // Greater Than or Equal To
    313: FunctoidCategory.Logical,  // Less Than
    314: FunctoidCategory.Logical,  // Less Than or Equal To
    315: FunctoidCategory.Logical,  // Equal
    316: FunctoidCategory.Logical,  // Not Equal
    317: FunctoidCategory.Logical,  // Logical String
    318: FunctoidCategory.Logical,  // Logical Date
    319: FunctoidCategory.Logical,  // Logical Numeric
    320: FunctoidCategory.Logical,  // Logical OR
    321: FunctoidCategory.Logical,  // Logical AND
    374: FunctoidCategory.Logical,  // Value Mapping (Flattening)
    375: FunctoidCategory.Logical,  // Value Mapping
    701: FunctoidCategory.Logical,  // Logical Existence
    705: FunctoidCategory.Logical,  // Logical NOT
    706: FunctoidCategory.Logical,  // IsNil
    // Advanced (322-323, 376, 424, 474, 702-704, 707, 800-802)
    322: FunctoidCategory.Advanced, // Record Count
    323: FunctoidCategory.Advanced, // Index
    376: FunctoidCategory.Advanced, // Nil Value
    424: FunctoidCategory.Advanced, // Looping
    474: FunctoidCategory.Advanced, // Iteration
    702: FunctoidCategory.Advanced, // XPath
    703: FunctoidCategory.Advanced, // Table Looping
    704: FunctoidCategory.Advanced, // Table Extractor
    707: FunctoidCategory.Advanced, // Assert
    800: FunctoidCategory.Advanced, // Key Match
    801: FunctoidCategory.Advanced, // Existence Looping
    802: FunctoidCategory.Advanced, // Mass Copy
    // Cumulative (324-328)
    324: FunctoidCategory.Cumulative, // Cumulative Sum
    325: FunctoidCategory.Cumulative, // Cumulative Average
    326: FunctoidCategory.Cumulative, // Cumulative Minimum
    327: FunctoidCategory.Cumulative, // Cumulative Maximum
    328: FunctoidCategory.Cumulative, // Cumulative Concatenate
    // Database (524, 574, 575)
    524: FunctoidCategory.DatabaseLookup, // Database Lookup
    574: FunctoidCategory.DatabaseLookup, // Value Extractor
    575: FunctoidCategory.DatabaseLookup, // Error Return
};

export class BtmSerializer {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            allowBooleanAttributes: true,
            parseAttributeValue: false,
            trimValues: true,
            processEntities: {
                enabled: true,
                maxEntitySize: 10000,
                maxExpansionDepth: 10,
                maxTotalExpansions: 10000,
                maxExpandedLength: 100000
            },
            cdataPropName: '#text'
        });
    }

    public deserialize(btmContent: string): MapDocument {
        // Normalize: strip BOM, null chars, and fix UTF-16 artifacts
        let content = btmContent.replace(/^\uFEFF/, '').replace(/\0/g, '').trim();

        const parsed = this.parser.parse(content);
        const root = parsed['mapsource'] || parsed['MapSource'] || parsed['Mapsource'];

        if (!root) {
            throw new Error('Invalid .btm file: no mapsource root element found');
        }

        const name = root['@_Name'] || 'Untitled';
        const version = root['@_Version'] || '1';

        const options = this.parseOptions(root);
        const scriptTypePrecedence = this.parseScriptTypePrecedence(root['ScriptTypePrecedence']);
        const sourceSchema = this.parseSchemaRef(root['SrcTree'] || root['srcTree'], content, 'SrcTree');
        const targetSchema = this.parseSchemaRef(root['TrgTree'] || root['trgTree'], content, 'TrgTree');
        const pages = this.parsePages(root['Pages'] || root['pages'], scriptTypePrecedence);
        const targetValues = this.parseTargetValues(root['TreeValues']);
        const customXslt = root['CustomXSLT'];

        return {
            name,
            version,
            sourceSchema,
            targetSchema,
            pages,
            options,
            targetValues,
            customXsltPath: customXslt?.['@_XsltPath'] || undefined,
            customExtensionXmlPath: customXslt?.['@_ExtObjXmlPath'] || undefined,
            scriptTypePrecedence
        };
    }

    public serialize(map: MapDocument): string {
        const doc = create({ version: '1.0', encoding: 'utf-8' })
            .ele('mapsource')
            .att('Name', map.name)
            .att('Version', map.version)
            .att('XRange', '100')
            .att('YRange', '420')
            .att('OmitXmlDeclaration', map.options.omitXmlDeclaration ? 'Yes' : 'No')
            .att('TreatElementsAsRecords', map.options.treatElementsAsRecords ? 'Yes' : 'No')
            .att('OptimizeValueMapping', map.options.optimizeValueMapping ? 'Yes' : 'No')
            .att('GenerateDefaultFixedNodes', map.options.generateDefaultFixedNodes ? 'Yes' : 'No')
            .att('PreserveSequenceOrder', map.options.preserveSequenceOrder ? 'Yes' : 'No')
            .att('IgnoreNamespacesForLinks', map.options.ignoreNamespacesForLinks ? 'Yes' : 'No')
            .att('XsltEncoding', map.options.xsltEncoding)
            .att('method', map.options.outputMethod)
            .att('CopyPIs', map.options.copyProcessingInstructions ? 'Yes' : 'No')
            .att('GenerateDebuggingInformation', map.options.generateDebuggingInformation ? 'Yes' : 'No')
            .att('xmlVersion', map.options.xsltVersion);

        // Source schema
        const srcTree = doc.ele('SrcTree');
        srcTree.ele('Reference').att('Location', map.sourceSchema.location);
        if (map.sourceSchema.rootName) {
            srcTree.att('RootNode_Name', map.sourceSchema.rootName);
        }

        // Target schema
        const trgTree = doc.ele('TrgTree');
        trgTree.ele('Reference').att('Location', map.targetSchema.location);
        if (map.targetSchema.rootName) {
            trgTree.att('RootNode_Name', map.targetSchema.rootName);
        }

        const precedence = doc.ele('ScriptTypePrecedence');
        for (const preference of map.scriptTypePrecedence || this.defaultScriptTypePrecedence()) {
            precedence.ele(this.scriptTypeElementName(preference.type))
                .att('Enabled', preference.enabled ? 'Yes' : 'No');
        }

        const treeValues = doc.ele('TreeValues');
        treeValues.ele('TestValues');
        const constants = treeValues.ele('ConstantValues');
        for (const [query, value] of Object.entries(map.targetValues || {})) {
            constants.ele('Value').att('value', value).att('Query', query);
        }

        if (map.customXsltPath || map.customExtensionXmlPath) {
            doc.ele('CustomXSLT')
                .att('XsltPath', map.customXsltPath || '')
                .att('ExtObjXmlPath', map.customExtensionXmlPath || '');
        }

        // Pages
        const pagesElem = doc.ele('Pages');
        for (const page of map.pages) {
            const pageElem = pagesElem.ele('Page').att('Name', page.name);

            // Links
            for (const link of page.links) {
                const linkElem = pageElem.ele('Link')
                    .att('LinkID', link.id)
                    .att('SourceID', link.sourceId)
                    .att('TargetID', link.targetId)
                    .att('SourceType', link.sourceType)
                    .att('TargetType', link.targetType);
                if (link.sourcePath) { linkElem.att('SourcePath', link.sourcePath); }
                if (link.targetPath) { linkElem.att('TargetPath', link.targetPath); }
                if (link.label) { linkElem.att('Label', link.label); }
                if (link.sourceLinkOption === SourceLinkOption.NameCopy) {
                    linkElem.att('Compiler-Copy-Directive', 'CopyName');
                } else if (link.sourceLinkOption === SourceLinkOption.MixedCopy) {
                    linkElem.att('Compiler-Copy-Directive', 'CopyMixed');
                }
                if (link.targetLinkOption === TargetLinkOption.TopDown) {
                    linkElem.att('Compiler-Directive', 'TopDown');
                } else if (link.targetLinkOption === TargetLinkOption.BottomUp) {
                    linkElem.att('Compiler-Directive', 'BottomUp');
                }
            }

            // Functoids
            for (const functoid of page.functoids) {
                const fElem = pageElem.ele('Functoid')
                    .att('FunctoidID', functoid.id)
                    .att('TypeID', functoid.functoidId.toString())
                    .att('Category', functoid.category)
                    .att('Name', functoid.name)
                    .att('X', functoid.x.toString())
                    .att('Y', functoid.y.toString());

                for (const param of functoid.parameters) {
                    const paramElem = fElem.ele('Parameter')
                        .att('Index', param.index.toString())
                        .att('Value', param.value)
                        .att('Type', param.type);
                    if (param.guid) { paramElem.att('Guid', param.guid); }
                    if (param.defaultValue !== undefined) {
                        paramElem.att('DefaultValue', param.defaultValue);
                    }
                }

                if (functoid.tableLooping) {
                    const tableElem = fElem.ele('TableLoopingData')
                        .att('Rows', functoid.tableLooping.rows.length.toString())
                        .att('Columns', functoid.tableLooping.columns.toString())
                        .att('Gated', functoid.tableLooping.gated ? 'Yes' : 'No');
                    for (const row of functoid.tableLooping.rows) {
                        const rowElem = tableElem.ele('Row');
                        for (const value of row) {
                            rowElem.ele('Column').att('Value', value);
                        }
                    }
                }

                if (functoid.scriptContent && !functoid.scriptImplementations?.length) {
                    fElem.ele('Script')
                        .att('Type', functoid.scriptType || 'inline')
                        .txt(functoid.scriptContent);
                }
                if (functoid.scriptImplementations?.length) {
                    const code = fElem.ele('ScripterCode');
                    for (const script of functoid.scriptImplementations) {
                        const scriptElement = code.ele('Script')
                            .att('Language', this.scriptTypeElementName(script.type));
                        if (script.type === ScriptType.ExternalAssembly) {
                            scriptElement
                                .att('Assembly', script.assemblyPath || '')
                                .att('Class', script.className || '')
                                .att('Function', script.methodName || '');
                            if (script.parameterTypes?.length) {
                                scriptElement.att('ParameterTypes', script.parameterTypes.join(';'));
                            }
                            if (script.returnType) {
                                scriptElement.att('ReturnType', script.returnType);
                            }
                            if (script.isStatic !== undefined) {
                                scriptElement.att('IsStatic', script.isStatic ? 'Yes' : 'No');
                            }
                        } else if (script.content) {
                            scriptElement.dat(script.content);
                        }
                    }
                    const assemblyReferences = new Set(
                        functoid.scriptImplementations.flatMap(script => script.assemblyReferences || [])
                    );
                    for (const assemblyReference of assemblyReferences) {
                        code.ele('Reference').att('Assembly', assemblyReference);
                    }
                }
            }
        }

        return doc.end({ prettyPrint: true });
    }

    public createNew(sourceSchemaPath: string, targetSchemaPath: string, name?: string): MapDocument {
        return {
            name: name || 'NewMap',
            version: '1',
            sourceSchema: { location: sourceSchemaPath },
            targetSchema: { location: targetSchemaPath },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                links: [],
                functoids: []
            }],
            options: { ...DEFAULT_MAP_OPTIONS }
        };
    }

    private parseOptions(root: any): MapOptions {
        return {
            omitXmlDeclaration: root['@_OmitXmlDeclaration'] === 'Yes',
            xsltVersion: (root['@_xmlVersion'] || root['@_XsltVersion'] || '1.0') as '1.0' | '2.0',
            xsltEncoding: root['@_XsltEncoding'] || 'UTF-8',
            preserveSequenceOrder: root['@_PreserveSequenceOrder'] !== 'No',
            treatElementsAsRecords: root['@_TreatElementsAsRecords'] === 'Yes',
            optimizeValueMapping: root['@_OptimizeValueMapping'] !== 'No',
            generateDefaultFixedNodes: root['@_GenerateDefaultFixedNodes'] !== 'No',
            ignoreNamespacesForLinks: root['@_IgnoreNamespacesForLinks'] === 'Yes',
            outputMethod: (root['@_method'] || root['@_OutputMethod'] || 'xml') as 'xml' | 'html' | 'text',
            copyProcessingInstructions: root['@_CopyPIs']?.toLowerCase() === 'yes',
            generateDebuggingInformation: root['@_GenerateDebuggingInformation']?.toLowerCase() === 'yes'
        };
    }

    private parseTargetValues(treeValues: any): Record<string, string> {
        const result: Record<string, string> = {};
        const values = treeValues?.['ConstantValues']?.['Value'];
        for (const value of values ? (Array.isArray(values) ? values : [values]) : []) {
            const query = value['@_Query'];
            if (query) {
                result[this.parseBizTalkLinkPath(query)] = value['@_value'] ?? '';
            }
        }
        return result;
    }

    private parseScriptTypePrecedence(node: any): Array<{ type: ScriptType; enabled: boolean }> {
        if (!node) { return this.defaultScriptTypePrecedence(); }
        const mappings: Record<string, ScriptType> = {
            CSharp: ScriptType.InlineCSharp,
            ExternalAssembly: ScriptType.ExternalAssembly,
            VbNet: ScriptType.InlineVbNet,
            JScript: ScriptType.InlineJScript,
            XsltCallTemplate: ScriptType.InlineXsltCallTemplate,
            Xslt: ScriptType.InlineXslt
        };
        return Object.keys(node)
            .filter(name => mappings[name] !== undefined)
            .map(name => ({
                type: mappings[name],
                enabled: node[name]?.['@_Enabled']?.toLowerCase() !== 'no'
            }));
    }

    private defaultScriptTypePrecedence(): Array<{ type: ScriptType; enabled: boolean }> {
        return [
            ScriptType.InlineCSharp,
            ScriptType.ExternalAssembly,
            ScriptType.InlineVbNet,
            ScriptType.InlineJScript,
            ScriptType.InlineXsltCallTemplate,
            ScriptType.InlineXslt
        ].map(type => ({ type, enabled: true }));
    }

    private scriptTypeElementName(type: ScriptType): string {
        switch (type) {
            case ScriptType.InlineCSharp: return 'CSharp';
            case ScriptType.ExternalAssembly: return 'ExternalAssembly';
            case ScriptType.InlineVbNet: return 'VbNet';
            case ScriptType.InlineJScript: return 'JScript';
            case ScriptType.InlineXsltCallTemplate: return 'XsltCallTemplate';
            case ScriptType.InlineXslt: return 'Xslt';
            default: return 'CSharp';
        }
    }

    private parseSchemaRef(tree: any, rawContent?: string, treeTag?: string): SchemaReference {
        if (!tree) {
            return { location: '' };
        }
        const ref = tree['Reference'] || tree['reference'];
        if (ref?.['@_Location']) {
            return {
                location: ref['@_Location'],
                rootName: tree['@_RootNode_Name'] || tree['@_RootNode'],
                namespace: tree['@_Namespace']
            };
        }

        // No Reference element — check for inline schema (aggregate schemas)
        if (rawContent && treeTag) {
            const tagRegex = new RegExp(`<${treeTag}[^>]*>([\\s\\S]*?)<\\/${treeTag}>`, 'i');
            const match = rawContent.match(tagRegex);
            if (match) {
                const inner = match[1].trim();
                // Check if it contains an xs:schema element
                if (inner.includes('<xs:schema') || inner.includes('<xsd:schema')) {
                    return {
                        location: '',
                        rootName: tree['@_RootNode_Name'] || tree['@_RootNode'],
                        namespace: tree['@_Namespace'],
                        inlineSchemaXml: inner
                    };
                }
            }
        }

        return {
            location: ref?.['@_Location'] || '',
            rootName: tree['@_RootNode_Name'] || tree['@_RootNode'],
            namespace: tree['@_Namespace']
        };
    }

    private parsePages(
        pagesNode: any,
        scriptTypePrecedence: Array<{ type: ScriptType; enabled: boolean }>
    ): MapPage[] {
        if (!pagesNode) {
            return [{ id: 'page1', name: 'Page 1', links: [], functoids: [] }];
        }

        const pageArray = Array.isArray(pagesNode['Page']) ? pagesNode['Page'] : [pagesNode['Page']];
        return pageArray.filter((p: any) => p).map((page: any, idx: number) => ({
            id: `page${idx + 1}`,
            name: page['@_Name'] || `Page ${idx + 1}`,
            links: this.parseLinks(page),
            functoids: this.parseFunctoids(page, scriptTypePrecedence)
        }));
    }

    private parseLinks(page: any): MapLink[] {
        // BizTalk format: Links are wrapped in <Links> element with LinkFrom/LinkTo attributes
        // Also support our own format with SourcePath/TargetPath
        let linksNode = page['Links'] || page['links'];
        let links: any;

        if (linksNode) {
            links = linksNode['Link'] || linksNode['link'];
        } else {
            links = page['Link'] || page['link'];
        }

        if (!links) { return []; }
        const linkArray = Array.isArray(links) ? links : [links];

        return linkArray.map((l: any) => {
            // Detect BizTalk native format (LinkFrom/LinkTo) vs our format (SourcePath/TargetPath)
            const linkFrom = l['@_LinkFrom'] || l['@_linkFrom'];
            const linkTo = l['@_LinkTo'] || l['@_linkTo'];

            if (linkFrom || linkTo) {
                // In BizTalk BTMs, a plain numeric value (e.g., "1") refers to a functoid ID
                const sourceIsFunctoid = this.isFunctoidReference(linkFrom);
                const targetIsFunctoid = this.isFunctoidReference(linkTo);

                const sourceId = sourceIsFunctoid ? (linkFrom || '') : this.parseBizTalkLinkPath(linkFrom);
                const targetId = targetIsFunctoid ? (linkTo || '') : this.parseBizTalkLinkPath(linkTo);

                return {
                    id: l['@_LinkID'] || l['@_linkID'] || this.generateId(),
                    sourceId: sourceId,
                    sourcePath: sourceIsFunctoid ? undefined : sourceId,
                    targetId: targetId,
                    targetPath: targetIsFunctoid ? undefined : targetId,
                    sourceType: sourceIsFunctoid ? LinkEndpointType.Functoid : LinkEndpointType.SchemaNode,
                    targetType: targetIsFunctoid ? LinkEndpointType.Functoid : LinkEndpointType.SchemaNode,
                    label: l['@_Label'] || '',
                    sourceLinkOption: this.parseSourceLinkOption(l['@_Compiler-Copy-Directive']),
                    targetLinkOption: this.parseTargetLinkOption(l['@_Compiler-Directive'])
                };
            }

            // Our serialized format
            return {
                id: l['@_LinkID'] || this.generateId(),
                sourceId: l['@_SourceID'] || l['@_SourcePath'] || '',
                sourcePath: l['@_SourcePath'] || l['@_SourceID'] || '',
                targetId: l['@_TargetID'] || l['@_TargetPath'] || '',
                targetPath: l['@_TargetPath'] || l['@_TargetID'] || '',
                sourceType: (l['@_SourceType'] as LinkEndpointType) || LinkEndpointType.SchemaNode,
                targetType: (l['@_TargetType'] as LinkEndpointType) || LinkEndpointType.SchemaNode,
                label: l['@_Label'] || '',
                sourceLinkOption: this.parseSourceLinkOption(l['@_Compiler-Copy-Directive']),
                targetLinkOption: this.parseTargetLinkOption(l['@_Compiler-Directive'])
            };
        });
    }

    private parseSourceLinkOption(value: string | undefined): SourceLinkOption {
        if (value === 'CopyName') { return SourceLinkOption.NameCopy; }
        if (value === 'CopyMixed') { return SourceLinkOption.MixedCopy; }
        return SourceLinkOption.ValueCopy;
    }

    private parseTargetLinkOption(value: string | undefined): TargetLinkOption {
        if (value === 'TopDown') { return TargetLinkOption.TopDown; }
        if (value === 'BottomUp') { return TargetLinkOption.BottomUp; }
        return TargetLinkOption.Flattening;
    }

    /**
     * Checks if a LinkFrom/LinkTo value is a functoid reference (plain number)
     * vs an XPath expression pointing to a schema node.
     */
    private isFunctoidReference(value: string | undefined): boolean {
        if (!value) { return false; }
        return /^\d+$/.test(value.trim());
    }

    /**
     * Parses BizTalk XPath-style link paths into simplified paths.
     * Input:  "/*[local-name()='<Schema>' and namespace-uri()='...']/*[local-name()='Root' and namespace-uri()='...']"
     * Output: "/Root"
     * Also handles: "/*[local-name()='Root']/@*[local-name()='Field']" → "/Root/@Field"
     */
    private parseBizTalkLinkPath(xpath: string | undefined): string {
        if (!xpath) { return ''; }

        const parts: string[] = [];
        // Match segments like /*[local-name()='Name' and namespace-uri()='...'] or /@*[local-name()='Name']
        const regex = /\/([@*]*)?\*\[local-name\(\)='([^']+)'(?:\s+and\s+namespace-uri\(\)='[^']*')?\]/g;
        let match;

        while ((match = regex.exec(xpath)) !== null) {
            const prefix = match[1] || '';
            const name = match[2];
            // Skip the <Schema> virtual root
            if (name === '<Schema>' || name === '&lt;Schema&gt;') { continue; }
            if (prefix.includes('@')) {
                parts.push(`/@${name}`);
            } else {
                parts.push(`/${name}`);
            }
        }

        return parts.join('') || xpath;
    }

    private parseFunctoids(
        page: any,
        scriptTypePrecedence: Array<{ type: ScriptType; enabled: boolean }>
    ): MapFunctoid[] {
        // BizTalk format: Functoids wrapped in <Functoids> element
        let functoidsNode = page['Functoids'] || page['functoids'];
        let functoids: any;

        if (functoidsNode) {
            functoids = functoidsNode['Functoid'] || functoidsNode['functoid'];
        } else {
            functoids = page['Functoid'] || page['functoid'];
        }

        if (!functoids) { return []; }
        const fArray = Array.isArray(functoids) ? functoids : [functoids];
        return fArray.map((f: any) => {
            // Support both real BizTalk attributes and our own serialization format
            // BizTalk native: Functoid-FID, Functoid-Name, X-Cell, Y-Cell
            // Our format: TypeID, Name, X, Y
            const functoidId = parseInt(
                f['@_Functoid-FID'] || f['@_TypeID'] || '0', 10
            );
            const rawName = f['@_Functoid-Name'] || f['@_Name'] || '';
            // If BTM doesn't include a name, look it up from the registry
            const name = rawName || this.lookupFunctoidName(functoidId);
            const rawX = parseFloat(f['@_X-Cell'] || f['@_X'] || '0');
            const rawY = parseFloat(f['@_Y-Cell'] || f['@_Y'] || '0');
            // BizTalk uses cell-grid coordinates (X: 0-100, Y: 0-420).
            // Convert to pixel space for the SVG canvas when loading from BTM format.
            const isCellCoords = !!(f['@_X-Cell'] || f['@_Y-Cell']);
            const x = isCellCoords ? (rawX - 48) * 14 + 150 : rawX;
            const y = isCellCoords ? (rawY - 205) * 12 + 40 : rawY;

            // Resolve category from the functoid registry if not provided directly
            let category = f['@_Category'] as FunctoidCategory;
            if (!category) {
                category = this.resolveFunctoidCategory(functoidId) || FunctoidCategory.String;
            }

            const selectedScript = this.selectScript(f, scriptTypePrecedence);
            const scriptType = selectedScript?.type || this.parseScriptType(f);
            const parameters = this.parseParameters(f);
            if (scriptType === ScriptType.ExternalAssembly) {
                const script = f['ScripterCode']?.['Script'];
                const externalScript = Array.isArray(script)
                    ? script.find((candidate: any) =>
                        candidate['@_Language']?.toLowerCase() === 'externalassembly')
                    : script;
                if (externalScript) {
                    parameters.push(
                        { index: parameters.length, value: ScriptType.ExternalAssembly, type: ParameterType.ScriptType },
                        {
                            index: parameters.length + 1,
                            value: externalScript['@_Assembly'] || externalScript['@_AssemblyPath'] || '',
                            type: ParameterType.AssemblyPath
                        },
                        {
                            index: parameters.length + 2,
                            value: externalScript['@_Class'] || '',
                            type: ParameterType.ClassName
                        },
                        {
                            index: parameters.length + 3,
                            value: externalScript['@_Function'] || '',
                            type: ParameterType.MethodName
                        }
                    );
                }
            }

            return {
                id: f['@_FunctoidID'] || this.generateId(),
                functoidId,
                category,
                name,
                x,
                y,
                inputLinks: [],
                outputLinks: [],
                parameters,
                scriptType,
                scriptContent: selectedScript?.content ?? this.parseScriptContent(f),
                scriptImplementations: this.parseScriptImplementations(f),
                tableLooping: this.parseTableLoopingData(f)
            };
        });
    }

    private parseTableLoopingData(functoid: any): MapFunctoid['tableLooping'] {
        const table = functoid['TableLoopingData'];
        if (!table) { return undefined; }
        const rawRows = table['Row'];
        const rows = (Array.isArray(rawRows) ? rawRows : rawRows ? [rawRows] : []).map((row: any) => {
            const rawColumns = row['Column'];
            return (Array.isArray(rawColumns) ? rawColumns : rawColumns ? [rawColumns] : [])
                .map((column: any) => column['@_Value'] || '');
        });
        return {
            columns: parseInt(table['@_Columns'] || '0', 10),
            gated: table['@_Gated'] === 'Yes',
            rows
        };
    }

    /**
     * Resolves the FunctoidCategory for a given BizTalk functoid ID.
     * Real BizTalk FIDs follow ranges that roughly indicate category.
     */
    private resolveFunctoidCategory(fid: number): FunctoidCategory | undefined {
        // Use the BIZTALK_FID_TO_CATEGORY map for known IDs
        return BIZTALK_FID_CATEGORY_MAP[fid];
    }

    /**
     * Looks up the functoid display name from the registry by FID.
     */
    private lookupFunctoidName(fid: number): string {
        try {
            const registry = FunctoidRegistry.getInstance();
            const def = registry.getFunctoid(fid);
            if (def) {
                return def.name;
            }
        } catch { /* registry not available */ }
        return `Functoid ${fid}`;
    }

    /**
     * Extracts script type from a BizTalk functoid element.
     * BizTalk format: <ScripterCode><Script Language="CSharp">...</Script></ScripterCode>
     * Our format: <Script Type="inline">...</Script>
     */
    private selectScript(
        f: any,
        precedence: Array<{ type: ScriptType; enabled: boolean }>
    ): { type: ScriptType; content?: string } | undefined {
        const scriptsValue = f['ScripterCode']?.['Script'];
        if (!scriptsValue) { return undefined; }
        const scripts = Array.isArray(scriptsValue) ? scriptsValue : [scriptsValue];
        for (const preference of precedence) {
            if (!preference.enabled) { continue; }
            const script = scripts.find((candidate: any) =>
                !!candidate['@_Language'] &&
                this.mapBizTalkScriptLanguage(candidate['@_Language']) === preference.type
            );
            if (script) {
                return {
                    type: preference.type,
                    content: this.extractTextContent(script)
                };
            }
        }
        return undefined;
    }

    private parseScriptImplementations(f: any): Array<{
        type: ScriptType;
        content?: string;
        assemblyReferences?: string[];
        assemblyPath?: string;
        className?: string;
        methodName?: string;
        parameterTypes?: string[];
        returnType?: string;
        isStatic?: boolean;
    }> | undefined {
        const scriptsValue = f['ScripterCode']?.['Script'];
        if (!scriptsValue) { return undefined; }
        const scripts = Array.isArray(scriptsValue) ? scriptsValue : [scriptsValue];
        const referencesValue = f['ScripterCode']?.['Reference'];
        const references = (Array.isArray(referencesValue) ? referencesValue : referencesValue ? [referencesValue] : [])
            .map((reference: any) => reference['@_Assembly'] || reference['@_Name'] || this.extractTextContent(reference))
            .filter((reference: string | undefined): reference is string => !!reference);
        return scripts
            .filter((script: any) => !!script['@_Language'])
            .map((script: any) => ({
                type: this.mapBizTalkScriptLanguage(script['@_Language']),
                content: this.extractTextContent(script),
                assemblyReferences: references.length > 0 ? references : undefined,
                assemblyPath: script['@_Assembly'] || script['@_AssemblyPath'],
                className: script['@_Class'],
                methodName: script['@_Function'],
                parameterTypes: script['@_ParameterTypes']?.split(';').filter(Boolean),
                returnType: script['@_ReturnType'],
                isStatic: script['@_IsStatic']
                    ? script['@_IsStatic'].toLowerCase() === 'yes'
                    : undefined
            }));
    }

    private parseScriptType(f: any): ScriptType | undefined {
        // BizTalk native format
        const scripterCode = f['ScripterCode'];
        if (scripterCode) {
            const scripts = scripterCode['Script'];
            const script = Array.isArray(scripts)
                ? scripts.find((candidate: any) =>
                    candidate['@_Language']?.toLowerCase() === 'externalassembly')
                    || scripts[0]
                : scripts;
            if (script) {
                const lang = script['@_Language'];
                if (lang) {
                    return this.mapBizTalkScriptLanguage(lang);
                }
            }
        }
        // Our format
        const ourType = f['Script']?.['@_Type'];
        return ourType as ScriptType | undefined;
    }

    private mapBizTalkScriptLanguage(lang: string): ScriptType {
        switch (lang.toLowerCase()) {
            case 'externalassembly': return ScriptType.ExternalAssembly;
            case 'csharp': return ScriptType.InlineCSharp;
            case 'vbnet': return ScriptType.InlineVbNet;
            case 'jscript': return ScriptType.InlineJScript;
            case 'xslt': return ScriptType.InlineXslt;
            case 'xsltcalltemplate': return ScriptType.InlineXsltCallTemplate;
            default: return ScriptType.InlineCSharp;
        }
    }

    /**
     * Extracts script content from a BizTalk functoid element.
     * BizTalk format: <ScripterCode><Script Language="CSharp"><![CDATA[...]]></Script></ScripterCode>
     * Our format: <Script Type="inline">content</Script>
     */
    private parseScriptContent(f: any): string | undefined {
        // BizTalk native format
        const scripterCode = f['ScripterCode'];
        if (scripterCode) {
            const scripts = scripterCode['Script'];
            const script = Array.isArray(scripts) ? scripts[0] : scripts;
            if (script) {
                return this.extractTextContent(script);
            }
        }
        // Our format
        const ourScript = f['Script'];
        if (ourScript) {
            return this.extractTextContent(ourScript);
        }
        return undefined;
    }

    /**
     * Extracts text content from a parsed XML node, handling various
     * fast-xml-parser output shapes (string, #text, array of #text).
     */
    private extractTextContent(node: any): string | undefined {
        if (typeof node === 'string') { return node; }
        const text = node['#text'];
        if (Array.isArray(text)) {
            // CDATA parsed as array of {#text: "..."} objects
            return text.map((t: any) => typeof t === 'object' ? t['#text'] : t).join('');
        }
        if (typeof text === 'string') { return text; }
        return undefined;
    }

    private parseParameters(functoid: any): Array<{
        index: number;
        value: string;
        type: ParameterType;
        guid?: string;
        defaultValue?: string;
    }> {
        // BizTalk native format: <Input-Parameters><Parameter Type="Link" Value="1" Guid="..."/></Input-Parameters>
        // Our format: <Parameter Index="0" Value="" Type="constant"/>
        let params = functoid['Parameter'];
        const inputParams = functoid['Input-Parameters'];
        if (inputParams) {
            params = inputParams['Parameter'];
        }

        if (!params) { return []; }
        const paramArray = Array.isArray(params) ? params : [params];
        return paramArray.map((p: any, idx: number) => ({
            index: parseInt(p['@_Index'] || String(idx), 10),
            value: p['@_Value'] || '',
            type: this.parseParameterType(p['@_Type']),
            guid: p['@_Guid'],
            defaultValue: p['@_DefaultValue'] ?? p['@_defaultValue']
        }));
    }

    /**
     * Maps BizTalk parameter type strings to our ParameterType enum.
     * BizTalk uses "Link", "Constant", etc. (capitalized).
     */
    private parseParameterType(typeStr: string | undefined): ParameterType {
        if (!typeStr) { return ParameterType.Constant; }
        const normalized = typeStr.toLowerCase();
        switch (normalized) {
            case 'link': return ParameterType.Link;
            case 'constant': return ParameterType.Constant;
            case 'scripttype': return ParameterType.ScriptType;
            case 'scriptbody': return ParameterType.ScriptBody;
            case 'assemblypath': return ParameterType.AssemblyPath;
            case 'classname': return ParameterType.ClassName;
            case 'methodname': return ParameterType.MethodName;
            default: return ParameterType.Constant;
        }
    }

    private generateId(): string {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
