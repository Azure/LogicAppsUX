/* eslint-disable no-param-reassign */
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary, NodeConnection } from '../models/Connection';
import { ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import { isNodeConnection, isCustomValueConnection, isEmptyConnection } from '../utils/Connection.Utils';
import { isFunctionData } from '../utils/Function.Utils';
import { isSchemaNodeExtended } from '../utils/Schema.Utils';
import { generateXPathFromSchemaNode, getXsltCompatibleName, isLoopableSchemaNode } from '../utils/Xslt.Utils';
import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty } from '@microsoft/logic-apps-shared';

export type MetaXsltDefinition = FailedXsltDefinition | SuccessfulXsltDefinition;

interface FailedXsltDefinition {
  isSuccess: false;
  errorNodes: [string, Connection][];
}

interface SuccessfulXsltDefinition {
  isSuccess: true;
  definition: string;
  warnings?: string[];
}

interface XsltTemplate {
  match: string;
  mode?: string;
  priority?: number;
  content: XsltElement[];
}

interface XsltElement {
  type: 'element' | 'attribute' | 'value-of' | 'for-each' | 'if' | 'text';
  name?: string;
  select?: string;
  test?: string;
  value?: string;
  children?: XsltElement[];
}

export const convertToXsltDefinition = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended | undefined,
  targetSchema: SchemaExtended | undefined,
  generateHeader = true
): MetaXsltDefinition => {
  if (sourceSchema && targetSchema) {
    const xsltContent = generateXsltFromConnections(connections, sourceSchema, targetSchema, generateHeader);
    return { isSuccess: true, definition: xsltContent };
  }

  return { isSuccess: false, errorNodes: [] };
};

const generateXsltFromConnections = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended,
  generateHeader: boolean
): string => {
  const templates = extractTemplatesFromConnections(connections, sourceSchema, targetSchema);

  let xsltContent = '';

  if (generateHeader) {
    xsltContent += generateXsltHeader(sourceSchema, targetSchema);
  }

  // Generate templates
  templates.forEach((template) => {
    xsltContent += generateXsltTemplate(template);
  });

  // Close stylesheet
  if (generateHeader) {
    xsltContent += '</xsl:stylesheet>';
  }

  return xsltContent;
};

const generateXsltHeader = (sourceSchema: SchemaExtended, targetSchema: SchemaExtended): string => {
  const namespaces = extractNamespaces(sourceSchema, targetSchema);
  let header = '<?xml version="1.0" encoding="UTF-8"?>\n';
  header += '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"';

  // Add schema namespaces
  namespaces.forEach((ns) => {
    header += ` ${ns.prefix}="${ns.uri}"`;
  });

  header += '>\n';
  header += '  <xsl:output method="xml" indent="yes"/>\n\n';

  return header;
};

const extractNamespaces = (sourceSchema: SchemaExtended, targetSchema: SchemaExtended): Array<{ prefix: string; uri: string }> => {
  const namespaces: Array<{ prefix: string; uri: string }> = [];

  // Add source schema namespaces
  if (sourceSchema.namespaces) {
    Object.entries(sourceSchema.namespaces).forEach(([prefix, uri]) => {
      namespaces.push({ prefix: `xmlns:${prefix}`, uri });
    });
  }

  // Add target schema namespaces
  if (targetSchema.namespaces) {
    Object.entries(targetSchema.namespaces).forEach(([prefix, uri]) => {
      const exists = namespaces.some((ns) => ns.uri === uri);
      if (!exists) {
        namespaces.push({ prefix: `xmlns:${prefix}`, uri });
      }
    });
  }

  return namespaces;
};

const extractTemplatesFromConnections = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): XsltTemplate[] => {
  const templates: XsltTemplate[] = [];

  // Get all target node connections
  const targetConnections = Object.entries(connections).filter(([key, connection]) => {
    return key.startsWith(targetPrefix) && isSchemaNodeExtended(connection.self.node);
  });

  // Group connections by root template
  const templateGroups = groupConnectionsByTemplate(targetConnections, targetSchema);

  // Generate templates for each group
  templateGroups.forEach((group) => {
    const template = generateTemplateFromGroup(group, connections, sourceSchema, targetSchema);
    if (template) {
      templates.push(template);
    }
  });

  return templates;
};

const groupConnectionsByTemplate = (
  connections: [string, Connection][],
  targetSchema: SchemaExtended
): Map<string, [string, Connection][]> => {
  const groups = new Map<string, [string, Connection][]>();

  connections.forEach(([key, connection]) => {
    const targetNode = connection.self.node as SchemaNodeExtended;

    // Determine template match pattern
    const matchPattern = getTemplateMatchPattern(targetNode, targetSchema);

    if (!groups.has(matchPattern)) {
      groups.set(matchPattern, []);
    }

    groups.get(matchPattern)!.push([key, connection]);
  });

  return groups;
};

const getTemplateMatchPattern = (targetNode: SchemaNodeExtended, targetSchema: SchemaExtended): string => {
  // Find the root element or highest level element for this node
  let rootNode = targetNode;

  while (rootNode.parentKey && rootNode.parentKey !== targetSchema.schemaTreeRoot.key) {
    const parent = findNodeInSchema(rootNode.parentKey, targetSchema.schemaTreeRoot);
    if (parent) {
      rootNode = parent;
    } else {
      break;
    }
  }

  return generateXPathFromSchemaNode(rootNode);
};

const findNodeInSchema = (key: string, root: SchemaNodeExtended): SchemaNodeExtended | null => {
  if (root.key === key) {
    return root;
  }

  if (root.children) {
    for (const child of root.children) {
      if (child && typeof child === 'object' && 'key' in child) {
        const found = findNodeInSchema(key, child as SchemaNodeExtended);
        if (found) {
          return found;
        }
      }
    }
  }

  return null;
};

const generateTemplateFromGroup = (
  group: [string, Connection][],
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): XsltTemplate | null => {
  if (group.length === 0) {
    return null;
  }

  // Get template match from first connection
  const firstConnection = group[0][1];
  const targetNode = firstConnection.self.node as SchemaNodeExtended;
  const matchPattern = getTemplateMatchPattern(targetNode, targetSchema);

  // Generate template content
  const content = generateTemplateContent(group, connections, sourceSchema, targetSchema);

  return {
    match: matchPattern,
    content,
  };
};

const generateTemplateContent = (
  group: [string, Connection][],
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): XsltElement[] => {
  const elements: XsltElement[] = [];

  // Sort connections by target node hierarchy
  const sortedGroup = group.sort(([_keyA, connectionA], [_keyB, connectionB]) => {
    const nodeA = connectionA.self.node as SchemaNodeExtended;
    const nodeB = connectionB.self.node as SchemaNodeExtended;
    return compareNodeHierarchy(nodeA, nodeB);
  });

  sortedGroup.forEach(([_key, connection]) => {
    const element = generateXsltElementFromConnection(connection, connections, sourceSchema, targetSchema);
    if (element) {
      elements.push(element);
    }
  });

  return elements;
};

const compareNodeHierarchy = (nodeA: SchemaNodeExtended, nodeB: SchemaNodeExtended): number => {
  // Simple comparison based on key depth
  const depthA = nodeA.key.split('/').length;
  const depthB = nodeB.key.split('/').length;
  return depthA - depthB;
};

const generateXsltElementFromConnection = (
  connection: Connection,
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): XsltElement | null => {
  const targetNode = connection.self.node as SchemaNodeExtended;
  const input = connection.inputs[0];

  if (!input || isEmptyConnection(input)) {
    return null;
  }

  // Handle different input types
  if (isCustomValueConnection(input)) {
    return generateTextElement(input.value);
  }

  if (isNodeConnection(input)) {
    return generateElementFromNodeConnection(input, targetNode, connections, sourceSchema, targetSchema);
  }

  return null;
};

const generateTextElement = (value: string): XsltElement => {
  return {
    type: 'text',
    value,
  };
};

const generateElementFromNodeConnection = (
  input: NodeConnection,
  targetNode: SchemaNodeExtended,
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): XsltElement | null => {
  if (isFunctionData(input.node)) {
    return generateFunctionElement(input, targetNode, connections, sourceSchema, targetSchema);
  }

  if (isSchemaNodeExtended(input.node)) {
    return generateSchemaNodeElement(input.node, targetNode, connections, sourceSchema, targetSchema);
  }

  return null;
};

const generateFunctionElement = (
  input: NodeConnection,
  targetNode: SchemaNodeExtended,
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): XsltElement | null => {
  const func = input.node;

  if (func.key.startsWith(ifPseudoFunctionKey)) {
    return generateConditionalElement(input, targetNode, connections, sourceSchema, targetSchema);
  }

  if (func.key.startsWith(indexPseudoFunctionKey)) {
    return generateLoopElement(input, targetNode, connections, sourceSchema, targetSchema);
  }

  // Handle other function types
  return generateGenericFunctionElement(input, targetNode, connections, sourceSchema, targetSchema);
};

const generateConditionalElement = (
  input: NodeConnection,
  targetNode: SchemaNodeExtended,
  connections: ConnectionDictionary,
  _sourceSchema: SchemaExtended,
  _targetSchema: SchemaExtended
): XsltElement | null => {
  const funcConnection = connections[input.reactFlowKey];
  if (!funcConnection) {
    return null;
  }

  // Extract condition from function inputs
  const conditionInput = funcConnection.inputs[0];
  if (!conditionInput || !isNodeConnection(conditionInput)) {
    return null;
  }

  const sourceNode = conditionInput.node as SchemaNodeExtended;
  const testExpression = generateXPathFromSchemaNode(sourceNode);

  return {
    type: 'if',
    test: testExpression,
    children: [generateTargetElement(targetNode)],
  };
};

const generateLoopElement = (
  input: NodeConnection,
  _targetNode: SchemaNodeExtended,
  connections: ConnectionDictionary,
  _sourceSchema: SchemaExtended,
  _targetSchema: SchemaExtended
): XsltElement | null => {
  const funcConnection = connections[input.reactFlowKey];
  if (!funcConnection) {
    return null;
  }

  // Find the source node for the loop
  const sourceInput = funcConnection.inputs[0];
  if (!sourceInput || !isNodeConnection(sourceInput)) {
    return null;
  }

  const sourceNode = sourceInput.node as SchemaNodeExtended;

  if (isLoopableSchemaNode(sourceNode)) {
    const selectExpression = generateXPathFromSchemaNode(sourceNode);

    return {
      type: 'for-each',
      select: selectExpression,
      children: [generateTargetElement(targetNode)],
    };
  }

  return null;
};

const generateGenericFunctionElement = (
  input: NodeConnection,
  _targetNode: SchemaNodeExtended,
  _connections: ConnectionDictionary,
  _sourceSchema: SchemaExtended,
  _targetSchema: SchemaExtended
): XsltElement | null => {
  // For now, treat as value-of with function call
  const func = input.node;
  return {
    type: 'value-of',
    select: `${func.functionName}()`, // Simplified function call
  };
};

const generateSchemaNodeElement = (
  sourceNode: SchemaNodeExtended,
  targetNode: SchemaNodeExtended,
  _connections: ConnectionDictionary,
  _sourceSchema: SchemaExtended,
  _targetSchema: SchemaExtended
): XsltElement | null => {
  const selectExpression = generateXPathFromSchemaNode(sourceNode);

  // Check if target is an attribute
  if (targetNode.nodeProperties.includes(SchemaNodeProperty.Attribute)) {
    return {
      type: 'attribute',
      name: getXsltCompatibleName(targetNode),
      children: [
        {
          type: 'value-of',
          select: selectExpression,
        },
      ],
    };
  }

  // Regular element with value-of
  return {
    type: 'element',
    name: getXsltCompatibleName(targetNode),
    children: [
      {
        type: 'value-of',
        select: selectExpression,
      },
    ],
  };
};

const generateTargetElement = (targetNode: SchemaNodeExtended): XsltElement => {
  return {
    type: 'element',
    name: getXsltCompatibleName(targetNode),
  };
};

const generateXsltTemplate = (template: XsltTemplate): string => {
  let templateStr = `  <xsl:template match="${template.match}"`;

  if (template.mode) {
    templateStr += ` mode="${template.mode}"`;
  }

  if (template.priority !== undefined) {
    templateStr += ` priority="${template.priority}"`;
  }

  templateStr += '>\n';

  // Generate template content
  template.content.forEach((element) => {
    templateStr += generateXsltElementString(element, 2);
  });

  templateStr += '  </xsl:template>\n\n';

  return templateStr;
};

const generateXsltElementString = (element: XsltElement, indentLevel: number): string => {
  const indent = '  '.repeat(indentLevel);
  let elementStr = '';

  switch (element.type) {
    case 'element': {
      elementStr += `${indent}<${element.name}`;
      if (element.children && element.children.length > 0) {
        elementStr += '>\n';
        element.children.forEach((child) => {
          elementStr += generateXsltElementString(child, indentLevel + 1);
        });
        elementStr += `${indent}</${element.name}>\n`;
      } else {
        elementStr += '/>\n';
      }
      break;
    }

    case 'attribute': {
      elementStr += `${indent}<xsl:attribute name="${element.name}"`;
      if (element.children && element.children.length > 0) {
        elementStr += '>\n';
        element.children.forEach((child) => {
          elementStr += generateXsltElementString(child, indentLevel + 1);
        });
        elementStr += `${indent}</xsl:attribute>\n`;
      } else {
        elementStr += '/>\n';
      }
      break;
    }

    case 'value-of':
      elementStr += `${indent}<xsl:value-of select="${element.select}"/>\n`;
      break;

    case 'for-each': {
      elementStr += `${indent}<xsl:for-each select="${element.select}">\n`;
      if (element.children) {
        element.children.forEach((child) => {
          elementStr += generateXsltElementString(child, indentLevel + 1);
        });
      }
      elementStr += `${indent}</xsl:for-each>\n`;
      break;
    }

    case 'if': {
      elementStr += `${indent}<xsl:if test="${element.test}">\n`;
      if (element.children) {
        element.children.forEach((child) => {
          elementStr += generateXsltElementString(child, indentLevel + 1);
        });
      }
      elementStr += `${indent}</xsl:if>\n`;
      break;
    }

    case 'text':
      if (element.value) {
        elementStr += `${indent}<xsl:text>${element.value}</xsl:text>\n`;
      }
      break;

    default:
      console.warn(`Unknown XSLT element type: ${element.type}`);
  }

  return elementStr;
};
