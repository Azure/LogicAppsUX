/**
 * BizTalk Data Mapper - Schema Parser
 * Parses XSD schema files into SchemaTree structure
 */

import { SchemaTree, SchemaNode, SchemaNodeType, SchemaAttribute, SchemaRestriction } from '../model';
import { getOrderedXsdChildren, parseOrderedXsd } from './orderedXsdParser';

export class SchemaParser {
    public parse(xsdContent: string, filePath: string, rootName?: string): SchemaTree {
        return this.parseWithImports(xsdContent, filePath, new Map(), rootName);
    }

    /**
     * Parse an XSD schema with imported schema content available for ref resolution.
     * importedSchemas: Map from schemaLocation to parsed schema object
     */
    public parseWithImports(
        xsdContent: string,
        filePath: string,
        importedSchemas: Map<string, any>,
        rootName?: string
    ): SchemaTree {
        const parsed = parseOrderedXsd(xsdContent);
        const schema = parsed['xs:schema'] || parsed['xsd:schema'] || parsed['schema'];

        if (!schema) {
            throw new Error('Invalid XSD: no schema root element found');
        }

        const targetNamespace = schema['@_targetNamespace'] || '';
        const namespaces = this.extractNamespaces(schema);
        const elementFormDefault: 'qualified' | 'unqualified' =
            String(schema['@_elementFormDefault']).toLowerCase() === 'qualified'
                ? 'qualified'
                : 'unqualified';

        const rootElements = this.getArray(schema['xs:element'] || schema['xsd:element'] || schema['element']);
        if (rootElements.length === 0) {
            throw new Error('Invalid XSD: no root element found');
        }

        const selectedRoot = rootName
            ? rootElements.find(element => element['@_name'] === rootName)
            : rootElements[0];
        if (!selectedRoot) {
            throw new Error(`Invalid XSD: root element '${rootName}' was not found`);
        }
        const rootElement = this.parseElement(
            selectedRoot,
            '/',
            schema,
            namespaces,
            importedSchemas,
            new Set()
        );

        return {
            rootElement,
            targetNamespace,
            namespaces: Object.fromEntries(namespaces),
            filePath,
            elementFormDefault
        };
    }

    private parseElement(
        element: any,
        parentPath: string,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any> = new Map(),
        expansionStack: Set<string> = new Set()
    ): SchemaNode {
        let isSubstitutionHead =
            parentPath === '/' || element['#isGlobalRef'] === true;
        // Handle xs:element ref="..." by resolving to the global element definition
        const refName = element['@_ref'];
        if (refName && !element['@_name']) {
            const localRef = refName.includes(':') ? refName.split(':')[1] : refName;
            const refNamespace = this.resolveQNameNamespace(refName, schema, namespaces);
            const currentNamespace = schema['@_targetNamespace'] || '';
            let globalElement = refNamespace === currentNamespace
                ? this.findGlobalElement(localRef, schema)
                : undefined;
            
            // If not found locally, search imported schemas
            if (!globalElement && importedSchemas) {
                for (const importedSchema of importedSchemas.values()) {
                    if (!this.schemaMatchesNamespace(importedSchema, refNamespace)) {
                        continue;
                    }
                    globalElement = this.findGlobalElement(localRef, importedSchema);
                    if (globalElement) {
                        const elementKey = this.componentKey(
                            'element',
                            refName,
                            schema,
                            namespaces
                        );
                        // Parse with the imported schema as context for type resolution
                        const merged = {
                            ...globalElement,
                            '@_form': 'qualified',
                            '#isGlobalRef': true,
                            '#skipExpansion': expansionStack.has(elementKey)
                        };
                        if (element['@_minOccurs'] !== undefined) { merged['@_minOccurs'] = element['@_minOccurs']; }
                        if (element['@_maxOccurs'] !== undefined) { merged['@_maxOccurs'] = element['@_maxOccurs']; }
                        return this.parseElement(
                            merged,
                            parentPath,
                            importedSchema,
                            this.extractNamespaces(importedSchema),
                            importedSchemas,
                            new Set(expansionStack).add(elementKey)
                        );
                    }
                }
            }
            
            if (globalElement) {
                isSubstitutionHead = true;
                const elementKey = this.componentKey(
                    'element',
                    refName,
                    schema,
                    namespaces
                );
                // Merge attributes from the ref usage (minOccurs, maxOccurs) with the global definition
                const merged = {
                    ...globalElement,
                    '@_form': 'qualified',
                    '#isGlobalRef': true,
                    '#skipExpansion': expansionStack.has(elementKey)
                };
                if (element['@_minOccurs'] !== undefined) { merged['@_minOccurs'] = element['@_minOccurs']; }
                if (element['@_maxOccurs'] !== undefined) { merged['@_maxOccurs'] = element['@_maxOccurs']; }
                return this.parseElement(
                    merged,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    new Set(expansionStack).add(elementKey)
                );
            }
            // If the ref can't be resolved, use the ref name as the element name
            element = { ...element, '@_name': localRef };
        }

        const name = element['@_name'] || 'unknown';
        const path = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
        const type = element['@_type'];
        const minOccurs = element['@_minOccurs'];
        const maxOccurs = element['@_maxOccurs'];

        const node: SchemaNode = {
            name,
            path,
            type: SchemaNodeType.Element,
            dataType: type,
            dataTypeNamespace: this.resolveQNameNamespace(type, schema, namespaces),
            namespace: this.getElementNamespace(element, parentPath, schema),
            nillable: String(element['@_nillable']).toLowerCase() === 'true',
            defaultValue: this.optionalString(element['@_default']),
            fixedValue: this.optionalString(element['@_fixed']),
            children: [],
            attributes: [],
            minOccurs: minOccurs !== undefined ? Number(minOccurs) : undefined,
            maxOccurs: maxOccurs === 'unbounded' ? 'unbounded' : (maxOccurs !== undefined ? Number(maxOccurs) : undefined),
            isOptional: minOccurs !== undefined && Number(minOccurs) === 0,
            substitutionGroup: this.optionalString(element['@_substitutionGroup'])
        };

        // Parse annotation
        const annotation = element['xs:annotation'] || element['xsd:annotation'];
        if (annotation) {
            const doc = annotation['xs:documentation'] || annotation['xsd:documentation'];
            if (doc) {
                node.annotation = typeof doc === 'string' ? doc : doc['#text'];
            }
        }

        // Parse complex type (inline or referenced)
        const skipExpansion = element['#skipExpansion'] === true;
        const complexType = element['xs:complexType'] || element['xsd:complexType'];
        if (complexType && !skipExpansion) {
            this.parseComplexType(
                complexType,
                node,
                path,
                schema,
                namespaces,
                importedSchemas,
                expansionStack
            );
        } else if (type && !this.isBuiltInType(type) && !skipExpansion) {
            const namedComplexType = this.resolveComponent(
                type,
                'complexType',
                schema,
                namespaces,
                importedSchemas
            );
            const typeKey = this.componentKey('type', type, schema, namespaces);
            if (namedComplexType && !expansionStack.has(typeKey)) {
                const nestedStack = new Set(expansionStack).add(typeKey);
                this.parseComplexType(
                    namedComplexType.component,
                    node,
                    path,
                    namedComplexType.schema,
                    this.extractNamespaces(namedComplexType.schema),
                    importedSchemas,
                    nestedStack
                );
            } else {
                const namedSimpleType = this.resolveComponent(
                    type,
                    'simpleType',
                    schema,
                    namespaces,
                    importedSchemas
                );
                if (namedSimpleType) {
                    this.applySimpleType(
                        namedSimpleType.component,
                        node,
                        namedSimpleType.schema,
                        this.extractNamespaces(namedSimpleType.schema)
                    );
                }
            }
        }

        // Parse simple type restrictions
        const simpleType = element['xs:simpleType'] || element['xsd:simpleType'];
        if (simpleType && !skipExpansion) {
            this.applySimpleType(simpleType, node, schema, namespaces);
        }

        if (isSubstitutionHead) {
            node.substitutionMembers = this.findSubstitutionMembers(
                name,
                schema,
                importedSchemas
            );
            if (node.substitutionMembers.length === 0) {
                delete node.substitutionMembers;
            }
        }

        return node;
    }

    private parseComplexType(
        complexType: any,
        parentNode: SchemaNode,
        parentPath: string,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>,
        expansionStack: Set<string>
    ): void {
        this.parseAttributes(
            complexType,
            parentNode,
            schema,
            namespaces,
            importedSchemas,
            expansionStack
        );
        this.parseParticles(
            complexType,
            parentNode,
            parentPath,
            schema,
            namespaces,
            importedSchemas,
            expansionStack
        );

        for (const complexContent of this.getChildren(complexType, 'complexContent')) {
            for (const extension of this.getChildren(complexContent, 'extension')) {
                this.parseComplexDerivation(
                    extension,
                    true,
                    parentNode,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack
                );
            }
            for (const restriction of this.getChildren(complexContent, 'restriction')) {
                this.parseComplexDerivation(
                    restriction,
                    false,
                    parentNode,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack
                );
            }
        }

        for (const simpleContent of this.getChildren(complexType, 'simpleContent')) {
            const derivations = [
                ...this.getChildren(simpleContent, 'extension'),
                ...this.getChildren(simpleContent, 'restriction')
            ];
            for (const derivation of derivations) {
                const base = this.optionalString(derivation['@_base']);
                parentNode.baseType = base;
                this.applySimpleContentBase(
                    base,
                    parentNode,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack
                );
                if (this.getChildren(simpleContent, 'restriction').includes(derivation)) {
                    parentNode.restrictions = this.parseRestrictionFacets(derivation);
                }
                this.parseAttributes(
                    derivation,
                    parentNode,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack
                );
            }
        }
    }

    private parseComplexDerivation(
        derivation: any,
        includeBaseContent: boolean,
        parentNode: SchemaNode,
        parentPath: string,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>,
        expansionStack: Set<string>
    ): void {
        const base = this.optionalString(derivation['@_base']);
        parentNode.baseType = base;
        if (base) {
            const resolved = this.resolveComponent(
                base,
                'complexType',
                schema,
                namespaces,
                importedSchemas
            );
            const key = this.componentKey('type', base, schema, namespaces);
            if (resolved && !expansionStack.has(key)) {
                const baseNamespaces = this.extractNamespaces(resolved.schema);
                if (includeBaseContent) {
                    this.parseComplexType(
                        resolved.component,
                        parentNode,
                        parentPath,
                        resolved.schema,
                        baseNamespaces,
                        importedSchemas,
                        new Set(expansionStack).add(key)
                    );
                } else {
                    this.parseAttributes(
                        resolved.component,
                        parentNode,
                        resolved.schema,
                        baseNamespaces,
                        importedSchemas,
                        new Set(expansionStack).add(key)
                    );
                }
            }
        }
        this.parseAttributes(
            derivation,
            parentNode,
            schema,
            namespaces,
            importedSchemas,
            expansionStack
        );
        this.parseParticles(
            derivation,
            parentNode,
            parentPath,
            schema,
            namespaces,
            importedSchemas,
            expansionStack
        );
    }

    private applySimpleContentBase(
        base: string | undefined,
        parentNode: SchemaNode,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>,
        expansionStack: Set<string>
    ): void {
        if (!base) {
            return;
        }
        parentNode.dataType = base;
        parentNode.dataTypeNamespace = this.resolveQNameNamespace(
            base,
            schema,
            namespaces
        );
        if (this.isBuiltInType(base)) {
            return;
        }
        const simpleType = this.resolveComponent(
            base,
            'simpleType',
            schema,
            namespaces,
            importedSchemas
        );
        if (simpleType) {
            this.applySimpleType(
                simpleType.component,
                parentNode,
                simpleType.schema,
                this.extractNamespaces(simpleType.schema)
            );
            return;
        }
        const complexType = this.resolveComponent(
            base,
            'complexType',
            schema,
            namespaces,
            importedSchemas
        );
        const key = this.componentKey('type', base, schema, namespaces);
        if (!complexType || expansionStack.has(key)) {
            return;
        }
        const baseNamespaces = this.extractNamespaces(complexType.schema);
        const nestedStack = new Set(expansionStack).add(key);
        this.parseAttributes(
            complexType.component,
            parentNode,
            complexType.schema,
            baseNamespaces,
            importedSchemas,
            nestedStack
        );
        for (const simpleContent of this.getChildren(
            complexType.component,
            'simpleContent'
        )) {
            const derivation = [
                ...this.getChildren(simpleContent, 'extension'),
                ...this.getChildren(simpleContent, 'restriction')
            ][0];
            if (derivation) {
                this.applySimpleContentBase(
                    this.optionalString(derivation['@_base']),
                    parentNode,
                    complexType.schema,
                    baseNamespaces,
                    importedSchemas,
                    nestedStack
                );
                this.parseAttributes(
                    derivation,
                    parentNode,
                    complexType.schema,
                    baseNamespaces,
                    importedSchemas,
                    nestedStack
                );
            }
        }
    }

    private parseParticles(
        container: any,
        parentNode: SchemaNode,
        parentPath: string,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>,
        expansionStack: Set<string>
    ): void {
        for (const child of getOrderedXsdChildren(container)) {
            const localName = child.name.split(':').pop();
            if (localName === 'sequence' ||
                localName === 'choice' ||
                localName === 'all') {
                this.parseParticle(
                    child.value,
                    parentNode,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack,
                    localName === 'choice'
                );
            } else if (localName === 'group') {
                this.parseGroupReference(
                    child.value,
                    parentNode,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack
                );
            } else if (localName === 'any') {
                parentNode.children.push(this.parseWildcard(child.value, parentPath));
            }
        }
    }

    private parseParticle(
        particle: any,
        parentNode: SchemaNode,
        parentPath: string,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>,
        expansionStack: Set<string>,
        isChoice: boolean
    ): void {
        const startIndex = parentNode.children.length;
        for (const child of getOrderedXsdChildren(particle)) {
            const localName = child.name.split(':').pop();
            if (localName === 'element') {
                parentNode.children.push(this.parseElement(
                    child.value,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack
                ));
            } else if (localName === 'any') {
                parentNode.children.push(this.parseWildcard(child.value, parentPath));
            } else if (localName === 'group') {
                this.parseGroupReference(
                    child.value,
                    parentNode,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack
                );
            } else if (localName === 'sequence' ||
                localName === 'choice' ||
                localName === 'all') {
                this.parseParticle(
                    child.value,
                    parentNode,
                    parentPath,
                    schema,
                    namespaces,
                    importedSchemas,
                    expansionStack,
                    localName === 'choice'
                );
            }
        }

        if (isChoice) {
            const choiceGroup = `${parentPath}#choice${startIndex}`;
            for (const child of parentNode.children.slice(startIndex)) {
                child.isOptional = true;
                child.choiceGroup = choiceGroup;
            }
        }
    }

    private parseGroupReference(
        usage: any,
        parentNode: SchemaNode,
        parentPath: string,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>,
        expansionStack: Set<string>
    ): void {
        const reference = this.optionalString(usage['@_ref']);
        if (!reference) {
            this.parseParticles(
                usage,
                parentNode,
                parentPath,
                schema,
                namespaces,
                importedSchemas,
                expansionStack
            );
            return;
        }
        const key = this.componentKey('group', reference, schema, namespaces);
        if (expansionStack.has(key)) {
            return;
        }
        const resolved = this.resolveComponent(
            reference,
            'group',
            schema,
            namespaces,
            importedSchemas
        );
        if (!resolved) {
            return;
        }
        const startIndex = parentNode.children.length;
        this.parseParticles(
            resolved.component,
            parentNode,
            parentPath,
            resolved.schema,
            this.extractNamespaces(resolved.schema),
            importedSchemas,
            new Set(expansionStack).add(key)
        );
        const minOccurs = usage['@_minOccurs'];
        const maxOccurs = usage['@_maxOccurs'];
        for (const child of parentNode.children.slice(startIndex)) {
            if (minOccurs !== undefined) {
                const referenceMin = Number(minOccurs);
                child.minOccurs = referenceMin * (child.minOccurs ?? 1);
                child.isOptional = child.minOccurs === 0;
            }
            if (maxOccurs !== undefined) {
                const childMax = child.maxOccurs ?? 1;
                child.maxOccurs =
                    maxOccurs === 'unbounded' || childMax === 'unbounded'
                        ? 'unbounded'
                        : Number(maxOccurs) * childMax;
            }
        }
    }

    private parseWildcard(wildcard: any, parentPath: string): SchemaNode {
        const minOccurs = wildcard['@_minOccurs'];
        const maxOccurs = wildcard['@_maxOccurs'];
        return {
            name: '*',
            path: `${parentPath}/*`,
            type: SchemaNodeType.Any,
            dataType: 'xs:anyType',
            children: [],
            attributes: [],
            minOccurs: minOccurs !== undefined ? Number(minOccurs) : undefined,
            maxOccurs: maxOccurs === 'unbounded'
                ? 'unbounded'
                : (maxOccurs !== undefined ? Number(maxOccurs) : undefined),
            isOptional: minOccurs !== undefined && Number(minOccurs) === 0,
            wildcard: {
                namespaceConstraint: this.optionalString(wildcard['@_namespace']),
                processContents: this.parseProcessContents(wildcard['@_processContents'])
            }
        };
    }

    private parseAttributes(
        container: any,
        parentNode: SchemaNode,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>,
        expansionStack: Set<string>
    ): void {
        for (const attribute of this.getChildren(container, 'attribute')) {
            const parsed = this.parseAttribute(
                attribute,
                schema,
                namespaces,
                importedSchemas
            );
            if (attribute['@_use'] === 'prohibited') {
                const prohibitedName = parsed?.name ??
                    this.localName(String(
                        attribute['@_ref'] || attribute['@_name'] || ''
                    ));
                parentNode.attributes = parentNode.attributes.filter(
                    existing => existing.name !== prohibitedName
                );
            } else if (parsed) {
                const existingIndex = parentNode.attributes.findIndex(
                    existing => existing.name === parsed.name &&
                        existing.namespace === parsed.namespace
                );
                if (existingIndex >= 0) {
                    parentNode.attributes[existingIndex] = parsed;
                } else {
                    parentNode.attributes.push(parsed);
                }
            }
        }
        for (const groupUsage of this.getChildren(container, 'attributeGroup')) {
            const reference = this.optionalString(groupUsage['@_ref']);
            if (!reference) {
                continue;
            }
            const key = this.componentKey(
                'attributeGroup',
                reference,
                schema,
                namespaces
            );
            if (expansionStack.has(key)) {
                continue;
            }
            const resolved = this.resolveComponent(
                reference,
                'attributeGroup',
                schema,
                namespaces,
                importedSchemas
            );
            if (resolved) {
                this.parseAttributes(
                    resolved.component,
                    parentNode,
                    resolved.schema,
                    this.extractNamespaces(resolved.schema),
                    importedSchemas,
                    new Set(expansionStack).add(key)
                );
            }
        }
        for (const wildcard of this.getChildren(container, 'anyAttribute')) {
            parentNode.attributes.push({
                name: '*',
                type: 'xs:anyType',
                required: false,
                wildcard: {
                    namespaceConstraint: this.optionalString(wildcard['@_namespace']),
                    processContents: this.parseProcessContents(
                        wildcard['@_processContents']
                    )
                }
            });
        }
    }

    private parseAttribute(
        attribute: any,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>
    ): SchemaAttribute | undefined {
        let definition = attribute;
        let definitionSchema = schema;
        const reference = this.optionalString(attribute['@_ref']);
        if (reference && !attribute['@_name']) {
            const resolved = this.resolveComponent(
                reference,
                'attribute',
                schema,
                namespaces,
                importedSchemas
            );
            if (resolved) {
                definition = { ...resolved.component, ...attribute };
                definition['@_name'] = resolved.component['@_name'];
                definitionSchema = resolved.schema;
            } else {
                definition = { ...attribute, '@_name': this.localName(reference) };
            }
        }
        if (definition['@_use'] === 'prohibited') {
            return undefined;
        }
        const qualified = !!reference ||
            String(definition['@_form']).toLowerCase() === 'qualified' ||
            (!definition['@_form'] &&
                String(definitionSchema['@_attributeFormDefault']).toLowerCase() ===
                    'qualified');
        return {
            name: String(definition['@_name'] || ''),
            type: String(definition['@_type'] || 'xs:string'),
            required: definition['@_use'] === 'required',
            defaultValue: this.optionalString(definition['@_default']),
            fixedValue: this.optionalString(definition['@_fixed']),
            namespace: qualified
                ? this.optionalString(definitionSchema['@_targetNamespace'])
                : undefined
        };
    }

    private getElementNamespace(element: any, parentPath: string, schema: any): string | undefined {
        const targetNamespace = schema['@_targetNamespace'];
        const isGlobal = parentPath === '/';
        const qualified = isGlobal ||
            String(element['@_form']).toLowerCase() === 'qualified' ||
            (!element['@_form'] && String(schema['@_elementFormDefault']).toLowerCase() === 'qualified');
        return qualified ? targetNamespace : undefined;
    }

    private resolveQNameNamespace(
        qname: string | undefined,
        schema: any,
        namespaces: Map<string, string>
    ): string | undefined {
        if (!qname) { return undefined; }
        if (!qname.includes(':')) { return schema['@_targetNamespace']; }
        const prefix = qname.split(':')[0];
        return schema[`@_xmlns:${prefix}`] || namespaces.get(prefix);
    }

    private applySimpleType(
        simpleType: any,
        node: SchemaNode,
        schema: any,
        namespaces: Map<string, string>
    ): void {
        const restriction = this.getChildren(simpleType, 'restriction')[0];
        const list = this.getChildren(simpleType, 'list')[0];
        const union = this.getChildren(simpleType, 'union')[0];
        if (restriction) {
            node.dataType = this.optionalString(restriction['@_base']) ?? node.dataType;
            node.dataTypeNamespace = this.resolveQNameNamespace(
                node.dataType,
                schema,
                namespaces
            );
        } else if (list) {
            node.dataType = 'xs:list';
        } else if (union) {
            node.dataType = 'xs:union';
        }
        node.restrictions = this.parseRestrictions(simpleType);
    }

    private parseRestrictions(simpleType: any): SchemaRestriction {
        const restriction = this.getChildren(simpleType, 'restriction')[0];
        const list = this.getChildren(simpleType, 'list')[0];
        const union = this.getChildren(simpleType, 'union')[0];
        const result: SchemaRestriction = {};
        if (list) {
            result.listItemType = this.optionalString(list['@_itemType']) ??
                this.optionalString(this.getChildren(list, 'simpleType')[0]?.['@_name']);
        }
        if (union) {
            result.unionMemberTypes = [
                ...String(union['@_memberTypes'] || '').split(/\s+/).filter(Boolean),
                ...this.getChildren(union, 'simpleType').map(
                    (member, index) =>
                        this.optionalString(member['@_name']) ?? `#inline${index + 1}`
                )
            ];
        }
        if (!restriction) { return result; }

        result.baseType = this.optionalString(restriction['@_base']);
        result.length = this.numericFacet(restriction, 'length');
        result.minLength = this.numericFacet(restriction, 'minLength');
        result.maxLength = this.numericFacet(restriction, 'maxLength');
        result.minInclusive = this.numericFacet(restriction, 'minInclusive');
        result.maxInclusive = this.numericFacet(restriction, 'maxInclusive');
        result.minExclusive = this.numericFacet(restriction, 'minExclusive');
        result.maxExclusive = this.numericFacet(restriction, 'maxExclusive');
        result.totalDigits = this.numericFacet(restriction, 'totalDigits');
        result.fractionDigits = this.numericFacet(restriction, 'fractionDigits');
        result.pattern = this.optionalString(
            this.getChildren(restriction, 'pattern')[0]?.['@_value']
        );
        const whiteSpace = this.optionalString(
            this.getChildren(restriction, 'whiteSpace')[0]?.['@_value']
        );
        if (whiteSpace === 'preserve' ||
            whiteSpace === 'replace' ||
            whiteSpace === 'collapse') {
            result.whiteSpace = whiteSpace;
        }
        const enums = this.getChildren(restriction, 'enumeration');
        if (enums.length > 0) {
            result.enumeration = enums.map(item => String(item['@_value']));
        }
        return result;
    }

    private parseRestrictionFacets(restriction: any): SchemaRestriction {
        return this.parseRestrictions({ 'xs:restriction': restriction });
    }

    private findGlobalElement(name: string, schema: any): any | undefined {
        const elements = this.getArray(schema['xs:element'] || schema['xsd:element'] || schema['element']);
        return elements.find((el: any) => el['@_name'] === name);
    }

    private findSubstitutionMembers(
        headName: string,
        schema: any,
        importedSchemas: Map<string, any>
    ): NonNullable<SchemaNode['substitutionMembers']> {
        const namespace = schema['@_targetNamespace'] || '';
        const result: NonNullable<SchemaNode['substitutionMembers']> = [];
        const seen = new Set<string>();
        for (const candidateSchema of [schema, ...importedSchemas.values()]) {
            const candidateNamespaces = this.extractNamespaces(candidateSchema);
            for (const element of this.getChildren(candidateSchema, 'element')) {
                const group = this.optionalString(element['@_substitutionGroup']);
                if (!group ||
                    this.localName(group) !== headName ||
                    this.resolveQNameNamespace(
                        group,
                        candidateSchema,
                        candidateNamespaces
                    ) !== namespace) {
                    continue;
                }
                const memberNamespace = this.optionalString(
                    candidateSchema['@_targetNamespace']
                );
                const key = `${memberNamespace || ''}|${element['@_name']}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                result.push({
                    name: String(element['@_name']),
                    namespace: memberNamespace,
                    dataType: this.optionalString(element['@_type'])
                });
            }
        }
        return result;
    }

    private resolveComponent(
        qname: string,
        localKind: string,
        schema: any,
        namespaces: Map<string, string>,
        importedSchemas: Map<string, any>
    ): { component: any; schema: any } | undefined {
        const namespace = this.resolveQNameNamespace(qname, schema, namespaces) || '';
        const name = this.localName(qname);
        for (const candidateSchema of [schema, ...importedSchemas.values()]) {
            if (!this.schemaMatchesNamespace(candidateSchema, namespace)) {
                continue;
            }
            const component = this.getChildren(candidateSchema, localKind)
                .find(candidate => candidate['@_name'] === name);
            if (component) {
                return { component, schema: candidateSchema };
            }
        }
        return undefined;
    }

    private componentKey(
        kind: string,
        qname: string,
        schema: any,
        namespaces: Map<string, string>
    ): string {
        return `${kind}|${this.resolveQNameNamespace(qname, schema, namespaces) || ''}|${this.localName(qname)}`;
    }

    private getChildren(container: any, localName: string): any[] {
        if (!container || typeof container !== 'object') {
            return [];
        }
        return Object.entries(container)
            .filter(([name]) => name.split(':').pop() === localName)
            .flatMap(([, value]) => this.getArray(value));
    }

    private localName(qname: string): string {
        return qname.includes(':') ? qname.split(':').pop()! : qname;
    }

    private numericFacet(container: any, localName: string): number | undefined {
        const facet = this.getChildren(container, localName)[0];
        if (!facet || facet['@_value'] === undefined) {
            return undefined;
        }
        const value = Number(facet['@_value']);
        return Number.isFinite(value) ? value : undefined;
    }

    private parseProcessContents(value: unknown): 'strict' | 'lax' | 'skip' {
        return value === 'lax' || value === 'skip' ? value : 'strict';
    }

    private schemaMatchesNamespace(schema: any, namespace: string | undefined): boolean {
        return (schema['@_targetNamespace'] || '') === (namespace || '');
    }

    private isBuiltInType(type: string): boolean {
        const builtIns = [
            'xs:string', 'xs:int', 'xs:integer', 'xs:decimal', 'xs:float', 'xs:double',
            'xs:boolean', 'xs:date', 'xs:dateTime', 'xs:time', 'xs:duration',
            'xs:base64Binary', 'xs:hexBinary', 'xs:anyURI', 'xs:QName',
            'xsd:string', 'xsd:int', 'xsd:integer', 'xsd:decimal', 'xsd:float', 'xsd:double',
            'xsd:boolean', 'xsd:date', 'xsd:dateTime', 'xsd:time', 'xsd:duration',
            'string', 'int', 'integer', 'decimal', 'float', 'double', 'boolean', 'date', 'dateTime'
        ];
        return builtIns.includes(type);
    }

    private extractNamespaces(schema: any): Map<string, string> {
        const namespaces = new Map<string, string>();
        for (const key of Object.keys(schema)) {
            if (key.startsWith('@_xmlns:')) {
                const prefix = key.substring(8);
                namespaces.set(prefix, schema[key]);
            }
        }
        return namespaces;
    }

    private getArray(value: any): any[] {
        if (value === undefined) { return []; }
        if (value === null || value === '') { return [{}]; }
        return Array.isArray(value) ? value : [value];
    }

    private optionalString(value: unknown): string | undefined {
        return value === undefined || value === null ? undefined : String(value);
    }
}
