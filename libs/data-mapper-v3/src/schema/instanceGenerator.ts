/**
 * BizTalk Data Mapper - XML Instance Generator
 * Generates sample XML instances from XSD schema trees.
 * Based on BizTalk Server's CSchemaInstance.GenerateInstance / GenerateValueFromXSDTypeofTOMNode
 * (src/Common/DesignTools.XMLTools.source.TOM/SchemaInstance.cs)
 */

import { SchemaTree, SchemaNode, SchemaNodeType } from '../model';

export class InstanceGenerator {
    private loopIndex = 0;

    /**
     * Generates a sample XML instance from a schema tree.
     */
    public generate(schema: SchemaTree): string {
        this.loopIndex = 0;
        const root = schema.rootElement;
        const ns = schema.targetNamespace;
        const lines: string[] = [];

        // With elementFormDefault="unqualified" (the XSD default), only the root element
        // is namespace-qualified; locally-declared children carry no namespace. Emitting a
        // default "xmlns" on the root would wrongly place every child in the namespace,
        // which then fails to match the unqualified XPaths in the compiled XSLT (producing
        // empty output). To match BizTalk's SchemaInstance behaviour we prefix the root and
        // leave children bare. When qualified, all elements share the namespace via a
        // default xmlns declaration on the root.
        const qualified = schema.elementFormDefault === 'qualified';
        const rootPrefix = ns && !qualified ? 'ns0' : undefined;

        lines.push('<?xml version="1.0" encoding="utf-8"?>');
        this.generateElement(root, lines, 0, ns, true, qualified, rootPrefix);

        return lines.join('\n');
    }

    private generateElement(
        node: SchemaNode,
        lines: string[],
        indent: number,
        ns: string | undefined,
        isRoot: boolean,
        qualified: boolean,
        rootPrefix: string | undefined
    ): void {
        const pad = '  '.repeat(indent);
        // Only the root is prefixed in the unqualified case; children stay bare.
        const name = isRoot && rootPrefix ? `${rootPrefix}:${node.name}` : node.name;

        // Build opening tag
        let openTag = `${pad}<${name}`;

        // Add namespace on root element
        if (isRoot && ns) {
            openTag += rootPrefix ? ` xmlns:${rootPrefix}="${ns}"` : ` xmlns="${ns}"`;
        }

        // Add required attributes
        for (const attr of node.attributes) {
            if (attr.wildcard) {
                continue;
            }
            const val = this.escapeXml(this.getAttrValue(attr.name, attr.type, attr.defaultValue, attr.fixedValue));
            openTag += ` ${attr.name}="${val}"`;
        }

        // Get child elements (flatten structural nodes like sequence/choice/all)
        const childElements = this.getChildElements(node);

        if (childElements.length === 0) {
            // Leaf element — generate sample value based on type
            const value = this.escapeXml(this.generateValueFromType(node.name, node.dataType, node.restrictions));
            lines.push(`${openTag}>${value}</${name}>`);
        } else {
            lines.push(`${openTag}>`);
            for (const child of childElements) {
                const repeats = this.getCardinality(child);
                for (let i = 0; i < repeats; i++) {
                    this.loopIndex = i;
                    this.generateElement(child, lines, indent + 1, undefined, false, qualified, rootPrefix);
                }
            }
            lines.push(`${pad}</${name}>`);
        }
    }

    /**
     * BizTalk cardinality logic from GetCardinality():
     * - If minOccurs > 0: use minOccurs
     * - If minOccurs == 0 && maxOccurs > 3: use 3
     * - If minOccurs == 0 && maxOccurs <= 3: use maxOccurs
     * - unbounded with minOccurs=0: generate 3
     */
    private getCardinality(node: SchemaNode): number {
        const min = node.minOccurs ?? 1;
        let max = node.maxOccurs === 'unbounded' ? -1 : (node.maxOccurs ?? 1);

        if (max < 0) {
            // unbounded
            max = min + 3;
        }

        if (min > 0) {
            return Math.min(min, 5); // cap at 5 for safety
        } else {
            return max > 3 ? 3 : Math.max(max, 1);
        }
    }

    private getChildElements(node: SchemaNode): SchemaNode[] {
        const results: SchemaNode[] = [];
        for (const child of node.children) {
            if (child.type === SchemaNodeType.Element) {
                results.push(child);
            } else if (child.type === SchemaNodeType.Choice) {
                // BizTalk: for Choice, only emit the first child element
                const choiceChildren = this.getChildElements(child);
                if (choiceChildren.length > 0) {
                    results.push(choiceChildren[0]);
                }
            } else if (child.type === SchemaNodeType.Sequence ||
                       child.type === SchemaNodeType.All ||
                       child.type === SchemaNodeType.Group) {
                results.push(...this.getChildElements(child));
            }
        }
        return results;
    }

    /**
     * Generates sample value following BizTalk's GenerateValueFromXSDTypeofTOMNode pattern.
     * Uses XSD type name to produce spec-compliant sample values.
     */
    private generateValueFromType(elementName: string, dataType?: string, restrictions?: any): string {
        // Check for enumeration restrictions first (BizTalk uses first enum value)
        if (restrictions?.enumeration && restrictions.enumeration.length > 0) {
            return restrictions.enumeration[0];
        }

        const type = (dataType || '').replace(/^(xs:|xsd:)/, '');

        // XSD type-based values (from BizTalk SchemaInstance.cs:1075-1301)
        switch (type) {
            case 'string':
            case 'normalizedString':
            case 'token':
                return `${elementName}_${this.loopIndex}`;
            case 'byte':
            case 'unsignedByte':
                return '125';
            case 'base64Binary':
                return 'GpM7';
            case 'hexBinary':
                return '0FB7';
            case 'integer':
            case 'positiveInteger':
            case 'nonNegativeInteger':
            case 'int':
            case 'unsignedInt':
            case 'long':
            case 'unsignedLong':
            case 'short':
            case 'unsignedShort':
                return '10';
            case 'negativeInteger':
            case 'nonPositiveInteger':
                return '-10';
            case 'decimal':
                return '10.4';
            case 'float':
            case 'double':
                return '10';
            case 'boolean':
                return 'true';
            case 'time':
                return '13:20:00.000-05:00';
            case 'dateTime':
                return '1999-05-31T13:20:00.000-05:00';
            case 'duration':
                return 'P1Y2M3DT10H30M12.3S';
            case 'date':
                return '1999-05-31';
            case 'gMonth':
                return '--05--';
            case 'gYear':
                return '1999';
            case 'gYearMonth':
                return '1999-02';
            case 'gDay':
                return '---31';
            case 'gMonthDay':
                return '--05-31';
            case 'Name':
            case 'NCName':
            case 'ID':
            case 'IDREF':
            case 'ENTITY':
            case 'NOTATION':
            case 'NMTOKEN':
                return `${elementName}${this.loopIndex}`;
            case 'QName':
                return elementName;
            case 'IDREFS':
                return `${elementName}_ID1 ${elementName}_ID2`;
            case 'ENTITIES':
                return `${elementName}_ENTITY1 ${elementName}_ENTITY2`;
            case 'NMTOKENS':
                return `${elementName}_NMTOKEN1 ${elementName}_NMTOKEN2`;
            case 'anyURI':
                return 'http://www.example.com';
            case 'language':
                return 'en-US';
            default:
                // Fallback: use element name as BizTalk does
                return `${elementName}_${this.loopIndex}`;
        }
    }

    private getAttrValue(name: string, type: string, defaultValue?: string, fixedValue?: string): string {
        if (fixedValue) return fixedValue;
        if (defaultValue) return defaultValue;
        return this.generateValueFromType(name, type);
    }

    private escapeXml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
