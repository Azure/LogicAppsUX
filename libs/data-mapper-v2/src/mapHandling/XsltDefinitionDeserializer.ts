import type { FunctionData } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { applyConnectionValue, createCustomInputConnection, createNodeConnection } from '../utils/Connection.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from '../utils/ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary, isSchemaNodeExtended } from '../utils/Schema.Utils';
import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';

interface XsltMappingContext {
  sourceNode?: SchemaNodeExtended;
  targetNode?: SchemaNodeExtended;
  condition?: string;
  isInLoop?: boolean;
  loopVariable?: string;
}

interface XsltTemplate {
  match: string;
  mode?: string;
  priority?: number;
  mappings: XsltMapping[];
}

interface XsltMapping {
  type: 'value-of' | 'copy-of' | 'text' | 'element' | 'attribute' | 'for-each' | 'if' | 'choose' | 'call-template';
  select?: string;
  test?: string;
  name?: string;
  value?: string;
  children?: XsltMapping[];
}

export class XsltDefinitionDeserializer {
  private readonly _xsltContent: string;
  private readonly _sourceSchema: SchemaExtended;
  private readonly _targetSchema: SchemaExtended;
  private readonly _functionsMetadata: FunctionData[];

  private readonly _sourceSchemaFlattened: SchemaNodeDictionary;
  private readonly _targetSchemaFlattened: SchemaNodeDictionary;
  private readonly _templates: XsltTemplate[];

  public constructor(xsltContent: string, sourceSchema: SchemaExtended, targetSchema: SchemaExtended, functions: FunctionData[]) {
    this._xsltContent = xsltContent;
    this._sourceSchema = sourceSchema;
    this._targetSchema = targetSchema;
    this._functionsMetadata = functions;

    this._sourceSchemaFlattened = flattenSchemaIntoDictionary(this._sourceSchema, SchemaType.Source);
    this._targetSchemaFlattened = flattenSchemaIntoDictionary(this._targetSchema, SchemaType.Target);

    this._templates = this.parseXsltTemplates();
  }

  public convertFromXsltDefinition = (): ConnectionDictionary => {
    const connections: ConnectionDictionary = {};

    // Process each template
    this._templates.forEach((template) => {
      this.processTemplate(template, connections);
    });

    return connections;
  };

  private parseXsltTemplates(): XsltTemplate[] {
    const templates: XsltTemplate[] = [];

    try {
      // Basic XSLT parsing using DOMParser
      const parser = new DOMParser();
      const xsltDoc = parser.parseFromString(this._xsltContent, 'text/xml');

      if (xsltDoc.getElementsByTagName('parsererror').length > 0) {
        console.error('XSLT parsing error:', xsltDoc.getElementsByTagName('parsererror')[0].textContent);
        return templates;
      }

      const templateElements = xsltDoc.getElementsByTagName('xsl:template');

      for (const templateElement of templateElements) {
        const template = this.parseTemplate(templateElement);
        if (template) {
          templates.push(template);
        }
      }
    } catch (error) {
      console.error('Error parsing XSLT:', error);
    }

    return templates;
  }

  private parseTemplate(templateElement: Element): XsltTemplate | null {
    const match = templateElement.getAttribute('match');
    if (!match) {
      return null;
    }

    const mode = templateElement.getAttribute('mode') || undefined;
    const priorityStr = templateElement.getAttribute('priority');
    const priority = priorityStr ? Number.parseInt(priorityStr, 10) : undefined;

    const mappings = this.parseTemplateContent(templateElement);

    return {
      match,
      mode,
      priority,
      mappings,
    };
  }

  private parseTemplateContent(element: Element): XsltMapping[] {
    const mappings: XsltMapping[] = [];

    for (const node of element.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const mapping = this.parseXsltElement(node as Element);
        if (mapping) {
          mappings.push(mapping);
        }
      }
    }

    return mappings;
  }

  private parseXsltElement(element: Element): XsltMapping | null {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'xsl:value-of':
        return {
          type: 'value-of',
          select: element.getAttribute('select') || undefined,
        };

      case 'xsl:copy-of':
        return {
          type: 'copy-of',
          select: element.getAttribute('select') || undefined,
        };

      case 'xsl:for-each':
        return {
          type: 'for-each',
          select: element.getAttribute('select') || undefined,
          children: this.parseTemplateContent(element),
        };

      case 'xsl:if':
        return {
          type: 'if',
          test: element.getAttribute('test') || undefined,
          children: this.parseTemplateContent(element),
        };

      case 'xsl:choose':
        return {
          type: 'choose',
          children: this.parseTemplateContent(element),
        };

      case 'xsl:element':
        return {
          type: 'element',
          name: element.getAttribute('name') || undefined,
          children: this.parseTemplateContent(element),
        };

      case 'xsl:attribute':
        return {
          type: 'attribute',
          name: element.getAttribute('name') || undefined,
          children: this.parseTemplateContent(element),
        };

      case 'xsl:call-template':
        return {
          type: 'call-template',
          name: element.getAttribute('name') || undefined,
        };

      default: {
        // Handle literal result elements
        if (!tagName.startsWith('xsl:')) {
          return {
            type: 'element',
            name: tagName,
            children: this.parseTemplateContent(element),
          };
        }
        return null;
      }
    }
  }

  private processTemplate(template: XsltTemplate, connections: ConnectionDictionary): void {
    // Find target node based on template match
    const targetNode = this.findTargetNodeFromMatch(template.match);

    if (targetNode) {
      template.mappings.forEach((mapping) => {
        this.processMapping(mapping, targetNode, connections, {
          targetNode,
        });
      });
    }
  }

  private processMapping(
    mapping: XsltMapping,
    targetNode: SchemaNodeExtended,
    connections: ConnectionDictionary,
    context: XsltMappingContext
  ): void {
    switch (mapping.type) {
      case 'value-of':
        this.processValueOf(mapping, targetNode, connections, context);
        break;

      case 'copy-of':
        this.processCopyOf(mapping, targetNode, connections, context);
        break;

      case 'for-each':
        this.processForEach(mapping, targetNode, connections, context);
        break;

      case 'if':
        this.processIf(mapping, targetNode, connections, context);
        break;

      case 'element':
        this.processElement(mapping, targetNode, connections, context);
        break;

      case 'attribute':
        this.processAttribute(mapping, targetNode, connections, context);
        break;

      default:
        console.warn(`Unsupported XSLT mapping type: ${mapping.type}`);
    }
  }

  private processValueOf(
    mapping: XsltMapping,
    targetNode: SchemaNodeExtended,
    connections: ConnectionDictionary,
    _context: XsltMappingContext
  ): void {
    if (!mapping.select) {
      return;
    }

    const sourceNode = this.findSourceNodeFromXPath(mapping.select);
    if (sourceNode) {
      applyConnectionValue(connections, {
        targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: createNodeConnection(sourceNode, addSourceReactFlowPrefix(sourceNode.key)),
      });
    } else {
      // Handle as custom value if not a schema node
      applyConnectionValue(connections, {
        targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: createCustomInputConnection(mapping.select),
      });
    }
  }

  private processCopyOf(
    mapping: XsltMapping,
    targetNode: SchemaNodeExtended,
    connections: ConnectionDictionary,
    context: XsltMappingContext
  ): void {
    // Similar to value-of but for copying entire elements
    this.processValueOf(mapping, targetNode, connections, context);
  }

  private processForEach(
    mapping: XsltMapping,
    targetNode: SchemaNodeExtended,
    connections: ConnectionDictionary,
    context: XsltMappingContext
  ): void {
    if (!mapping.select || !mapping.children) {
      return;
    }

    const sourceNode = this.findSourceNodeFromXPath(mapping.select);
    if (sourceNode && sourceNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
      // Create loop connection
      applyConnectionValue(connections, {
        targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: createNodeConnection(sourceNode, addSourceReactFlowPrefix(sourceNode.key)),
      });

      // Process children in loop context
      const loopContext: XsltMappingContext = {
        ...context,
        isInLoop: true,
        loopVariable: mapping.select,
        sourceNode,
      };

      mapping.children.forEach((child) => {
        this.processMapping(child, targetNode, connections, loopContext);
      });
    }
  }

  private processIf(
    mapping: XsltMapping,
    targetNode: SchemaNodeExtended,
    connections: ConnectionDictionary,
    context: XsltMappingContext
  ): void {
    if (!mapping.test || !mapping.children) {
      return;
    }

    // Create conditional function
    const ifFunction = this.createConditionalFunction(mapping.test, connections);
    if (ifFunction) {
      applyConnectionValue(connections, {
        targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: createNodeConnection(ifFunction, ifFunction.key),
      });

      // Process children in conditional context
      const conditionContext: XsltMappingContext = {
        ...context,
        condition: mapping.test,
      };

      mapping.children.forEach((child) => {
        this.processMapping(child, targetNode, connections, conditionContext);
      });
    }
  }

  private processElement(
    mapping: XsltMapping,
    targetNode: SchemaNodeExtended,
    connections: ConnectionDictionary,
    context: XsltMappingContext
  ): void {
    if (!mapping.name) {
      return;
    }

    // Find target node for the element
    const elementTargetNode = this.findTargetNodeByName(mapping.name, targetNode);
    if (elementTargetNode && mapping.children) {
      mapping.children.forEach((child) => {
        this.processMapping(child, elementTargetNode, connections, context);
      });
    }
  }

  private processAttribute(
    mapping: XsltMapping,
    targetNode: SchemaNodeExtended,
    connections: ConnectionDictionary,
    context: XsltMappingContext
  ): void {
    if (!mapping.name) {
      return;
    }

    // Find attribute target node
    const attributeTargetNode = this.findAttributeTargetNode(mapping.name, targetNode);
    if (attributeTargetNode && mapping.children) {
      mapping.children.forEach((child) => {
        this.processMapping(child, attributeTargetNode, connections, context);
      });
    }
  }

  private findTargetNodeFromMatch(match: string): SchemaNodeExtended | null {
    // Simple XPath to target node mapping
    // This is a simplified implementation - real XPath parsing would be more complex
    const cleanPath = match.replace(/^\/+/, '').replace(/\[.*?\]/g, '');
    const pathParts = cleanPath.split('/');

    // Try to find matching target node
    const targetKey = `/${pathParts.join('/')}`;
    return this.findNodeInSchema(targetKey, this._targetSchema.schemaTreeRoot) as SchemaNodeExtended | null;
  }

  private findSourceNodeFromXPath(xpath: string): SchemaNodeExtended | null {
    // Simple XPath to source node mapping
    const cleanPath = xpath
      .replace(/^\/+/, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\$\w+\//, '');

    // Try to find matching source node
    return this.findNodeInSchema(cleanPath, this._sourceSchema.schemaTreeRoot) as SchemaNodeExtended | null;
  }

  private findNodeInSchema(path: string, root: SchemaNodeExtended): SchemaNodeExtended | null {
    return findNodeForKey(path, root, false) as SchemaNodeExtended | null;
  }

  private findTargetNodeByName(name: string, parentNode: SchemaNodeExtended): SchemaNodeExtended | null {
    return parentNode.children.find(
      (child) => isSchemaNodeExtended(child) && (child.name === name || child.qName === name)
    ) as SchemaNodeExtended | null;
  }

  private findAttributeTargetNode(attributeName: string, parentNode: SchemaNodeExtended): SchemaNodeExtended | null {
    return parentNode.children.find(
      (child) =>
        isSchemaNodeExtended(child) &&
        child.nodeProperties.includes(SchemaNodeProperty.Attribute) &&
        (child.name === attributeName || child.qName === attributeName)
    ) as SchemaNodeExtended | null;
  }

  private createConditionalFunction(test: string, _connections: ConnectionDictionary): FunctionData | null {
    // Create a pseudo-function for conditional logic
    // This is a simplified implementation
    const conditionFunction: FunctionData = {
      key: `if-${Date.now()}`,
      functionName: 'if',
      displayName: 'If Condition',
      category: 'Logical',
      description: `Conditional: ${test}`,
      inputs: [
        {
          name: 'condition',
          allowedTypes: ['any'],
          isOptional: false,
          allowCustomInput: true,
          tooltip: test,
        },
      ],
      outputs: [
        {
          name: 'result',
          type: 'any',
        },
      ],
    };

    return conditionFunction;
  }
}
