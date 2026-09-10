/**
 * BizTalk Data Mapper - Schema Model Types
 * Represents parsed XSD schema tree structure
 */

export interface SchemaTree {
    rootElement: SchemaNode;
    targetNamespace?: string;
    namespaces: Record<string, string>;
    filePath: string;
    /**
     * XSD elementFormDefault. Controls whether locally-declared child elements are
     * namespace-qualified. Defaults to 'unqualified' (the XSD default) when absent.
     */
    elementFormDefault?: 'qualified' | 'unqualified';
}

export interface SchemaNode {
    name: string;
    path: string;
    type: SchemaNodeType;
    dataType?: string;
    dataTypeNamespace?: string;
    namespace?: string;
    nillable?: boolean;
    defaultValue?: string;
    fixedValue?: string;
    choiceGroup?: string;
    baseType?: string;
    children: SchemaNode[];
    attributes: SchemaAttribute[];
    minOccurs?: number;
    maxOccurs?: number | 'unbounded';
    isOptional: boolean;
    annotation?: string;
    restrictions?: SchemaRestriction;
    wildcard?: SchemaWildcard;
    substitutionGroup?: string;
    substitutionMembers?: SchemaSubstitutionMember[];
}

export enum SchemaNodeType {
    Element = 'element',
    ComplexType = 'complexType',
    Sequence = 'sequence',
    Choice = 'choice',
    All = 'all',
    Attribute = 'attribute',
    Group = 'group',
    Any = 'any'
}

export interface SchemaAttribute {
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    fixedValue?: string;
    namespace?: string;
    wildcard?: SchemaWildcard;
}

export interface SchemaRestriction {
    baseType?: string;
    minLength?: number;
    maxLength?: number;
    length?: number;
    pattern?: string;
    enumeration?: string[];
    minInclusive?: number;
    maxInclusive?: number;
    minExclusive?: number;
    maxExclusive?: number;
    totalDigits?: number;
    fractionDigits?: number;
    whiteSpace?: 'preserve' | 'replace' | 'collapse';
    listItemType?: string;
    unionMemberTypes?: string[];
}

export interface SchemaWildcard {
    namespaceConstraint?: string;
    processContents: 'strict' | 'lax' | 'skip';
}

export interface SchemaSubstitutionMember {
    name: string;
    namespace?: string;
    dataType?: string;
}
