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
  /** Names of all global root elements; set only when the schema declares more than one. */
  availableRoots?: string[];
}

export interface SchemaNode {
  name: string;
  path: string;
  /** TOM identity, including non-instance schema groups. */
  schemaPath?: string;
  structuralPath?: string;
  instancePath?: string;
  type: SchemaNodeType;
  dataType?: string;
  declaredDataType?: string;
  dataTypeNamespace?: string;
  namespace?: string;
  nillable?: boolean;
  defaultValue?: string;
  fixedValue?: string;
  choiceGroup?: string;
  choiceBranches?: Array<{ group: string; branch: number }>;
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

export const SchemaNodeType = {
  Element: 'element',
  ComplexType: 'complexType',
  Sequence: 'sequence',
  Choice: 'choice',
  All: 'all',
  Attribute: 'attribute',
  Group: 'group',
  Any: 'any',
} as const;
export type SchemaNodeType = (typeof SchemaNodeType)[keyof typeof SchemaNodeType];

export interface SchemaAttribute {
  name: string;
  schemaPath?: string;
  structuralPath?: string;
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
