import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty } from '@microsoft/logic-apps-shared';

/**
 * XSLT Processing Utilities
 * Provides helper functions for parsing and processing XSLT transformations
 */

export interface XPathExpression {
  path: string;
  predicates: string[];
  functions: string[];
  variables: string[];
}

export interface XsltNamespace {
  prefix: string;
  uri: string;
}

/**
 * Parses a simple XPath expression into components
 * @param xpath The XPath expression to parse
 * @returns Parsed XPath components
 */
export const parseXPath = (xpath: string): XPathExpression => {
  // Remove leading/trailing whitespace
  const cleanPath = xpath.trim();

  // Extract predicates (content in square brackets)
  const predicateRegex = /\[([^\]]+)\]/g;
  const predicates: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = predicateRegex.exec(cleanPath)) !== null) {
    predicates.push(match[1]);
  }

  // Remove predicates from path
  const pathWithoutPredicates = cleanPath.replace(predicateRegex, '');

  // Extract functions (anything with parentheses)
  const functionRegex = /(\w+\([^)]*\))/g;
  const functions: string[] = [];

  while ((match = functionRegex.exec(pathWithoutPredicates)) !== null) {
    functions.push(match[1]);
  }

  // Extract variables (starting with $)
  const variableRegex = /\$(\w+)/g;
  const variables: string[] = [];

  while ((match = variableRegex.exec(pathWithoutPredicates)) !== null) {
    variables.push(match[1]);
  }

  return {
    path: pathWithoutPredicates,
    predicates,
    functions,
    variables,
  };
};

/**
 * Converts XPath expression to schema node path
 * @param xpath XPath expression
 * @param contextPath Current context path for relative expressions
 * @returns Schema node path
 */
export const xpathToSchemaPath = (xpath: string, contextPath?: string): string => {
  const parsed = parseXPath(xpath);

  // Handle relative paths
  if (xpath.startsWith('./')) {
    if (contextPath) {
      return `${contextPath}/${parsed.path.substring(2)}`;
    }
    return parsed.path.substring(2);
  }

  // Handle parent paths
  if (xpath.startsWith('../')) {
    if (contextPath) {
      const contextParts = contextPath.split('/');
      const upLevels = (xpath.match(/\.\.\//g) || []).length;
      const newContextParts = contextParts.slice(0, -upLevels);
      const remainingPath = parsed.path.replace(/\.\.\//g, '');
      return `${newContextParts.join('/')}/${remainingPath}`;
    }
    return parsed.path.replace(/\.\.\//g, '');
  }

  // Handle absolute paths
  if (xpath.startsWith('/')) {
    return parsed.path.substring(1);
  }

  // Handle variables and functions
  if (parsed.variables.length > 0 || parsed.functions.length > 0) {
    return parsed.path;
  }

  return parsed.path;
};

/**
 * Extracts XSLT namespaces from stylesheet
 * @param xsltContent XSLT content
 * @returns Array of namespace declarations
 */
export const extractXsltNamespaces = (xsltContent: string): XsltNamespace[] => {
  const namespaces: XsltNamespace[] = [];

  try {
    const parser = new DOMParser();
    const xsltDoc = parser.parseFromString(xsltContent, 'text/xml');

    if (xsltDoc.documentElement) {
      const attributes = xsltDoc.documentElement.attributes;

      for (const attr of attributes) {
        if (attr.name.startsWith('xmlns:')) {
          const prefix = attr.name.substring(6); // Remove 'xmlns:'
          namespaces.push({
            prefix,
            uri: attr.value,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error extracting XSLT namespaces:', error);
  }

  return namespaces;
};

/**
 * Determines if an XSLT element creates a loop structure
 * @param element XSLT element
 * @returns True if element creates a loop (for-each)
 */
export const isLoopingElement = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return tagName === 'xsl:for-each';
};

/**
 * Determines if an XSLT element creates a conditional structure
 * @param element XSLT element
 * @returns True if element creates a condition (if, choose/when)
 */
export const isConditionalElement = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return tagName === 'xsl:if' || tagName === 'xsl:choose' || tagName === 'xsl:when' || tagName === 'xsl:otherwise';
};

/**
 * Extracts the select attribute value from an XSLT element
 * @param element XSLT element
 * @returns Select attribute value or null
 */
export const getSelectAttribute = (element: Element): string | null => {
  return element.getAttribute('select');
};

/**
 * Extracts the test attribute value from an XSLT conditional element
 * @param element XSLT element
 * @returns Test attribute value or null
 */
export const getTestAttribute = (element: Element): string | null => {
  return element.getAttribute('test');
};

/**
 * Finds schema nodes that match an XPath expression
 * @param xpath XPath expression
 * @param schemaRoot Schema root node
 * @param contextPath Current context path
 * @returns Array of matching schema nodes
 */
export const findSchemaNodesFromXPath = (xpath: string, schemaRoot: SchemaNodeExtended, contextPath?: string): SchemaNodeExtended[] => {
  const schemaPath = xpathToSchemaPath(xpath, contextPath);
  const nodes: SchemaNodeExtended[] = [];

  const findNodesRecursively = (node: SchemaNodeExtended, targetPath: string, currentPath = '') => {
    const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;

    // Check if current node matches target path
    if (nodePath.endsWith(targetPath) || node.key.endsWith(targetPath)) {
      nodes.push(node);
    }

    // Recursively search children
    if (node.children) {
      node.children.forEach((child) => {
        if (child && typeof child === 'object' && 'name' in child) {
          findNodesRecursively(child as SchemaNodeExtended, targetPath, nodePath);
        }
      });
    }
  };

  findNodesRecursively(schemaRoot, schemaPath);
  return nodes;
};

/**
 * Generates a simplified XPath from a schema node
 * @param node Schema node
 * @returns XPath expression
 */
export const generateXPathFromSchemaNode = (node: SchemaNodeExtended): string => {
  const pathParts: string[] = [];

  // Build path from node to root
  let currentNode: SchemaNodeExtended | undefined = node;
  while (currentNode) {
    pathParts.unshift(currentNode.name);
    currentNode = currentNode.parentKey ? findNodeByKey(currentNode.parentKey, node) : undefined;
  }

  return `/${pathParts.join('/')}`;
};

/**
 * Helper function to find a node by key
 * @param key Node key
 * @param rootNode Root node to search from
 * @returns Found node or undefined
 */
const findNodeByKey = (key: string, rootNode: SchemaNodeExtended): SchemaNodeExtended | undefined => {
  if (rootNode.key === key) {
    return rootNode;
  }

  if (rootNode.children) {
    for (const child of rootNode.children) {
      if (child && typeof child === 'object' && 'key' in child) {
        const found = findNodeByKey(key, child as SchemaNodeExtended);
        if (found) {
          return found;
        }
      }
    }
  }

  return undefined;
};

/**
 * Validates XSLT content for basic syntax errors
 * @param xsltContent XSLT content
 * @returns Validation result with errors if any
 */
export const validateXsltSyntax = (xsltContent: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  try {
    const parser = new DOMParser();
    const xsltDoc = parser.parseFromString(xsltContent, 'text/xml');

    const parserErrors = xsltDoc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      for (const error of parserErrors) {
        errors.push(error.textContent || 'Unknown parser error');
      }
    }

    // Check for required XSLT elements
    const stylesheetElement = xsltDoc.querySelector('xsl\\:stylesheet, stylesheet');
    const transformElement = xsltDoc.querySelector('xsl\\:transform, transform');

    if (!stylesheetElement && !transformElement) {
      errors.push('XSLT document must contain xsl:stylesheet or xsl:transform root element');
    }

    // Check for XSLT namespace
    if (stylesheetElement || transformElement) {
      const rootElement = stylesheetElement || transformElement;
      const xslNamespace = rootElement?.getAttribute('xmlns:xsl') || rootElement?.getAttribute('xmlns');

      if (
        !xslNamespace ||
        (!xslNamespace.includes('www.w3.org/1999/XSL/Transform') && !xslNamespace.includes('www.w3.org/XSL/Transform/1.0'))
      ) {
        errors.push('XSLT document must declare XSL namespace');
      }
    }
  } catch (error) {
    errors.push(`XSLT parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Extracts template match patterns from XSLT
 * @param xsltContent XSLT content
 * @returns Array of template match patterns
 */
export const extractTemplateMatches = (xsltContent: string): string[] => {
  const matches: string[] = [];

  try {
    const parser = new DOMParser();
    const xsltDoc = parser.parseFromString(xsltContent, 'text/xml');

    const templates = xsltDoc.querySelectorAll('xsl\\:template[match], template[match]');

    templates.forEach((template) => {
      const match = template.getAttribute('match');
      if (match) {
        matches.push(match);
      }
    });
  } catch (error) {
    console.error('Error extracting template matches:', error);
  }

  return matches;
};

/**
 * Checks if a schema node is suitable for looping operations
 * @param node Schema node
 * @returns True if node can be used in loops
 */
export const isLoopableSchemaNode = (node: SchemaNodeExtended): boolean => {
  return node.nodeProperties.includes(SchemaNodeProperty.Repeating) || node.nodeProperties.includes(SchemaNodeProperty.ArrayItem);
};

/**
 * Generates XSLT-compatible node name
 * @param node Schema node
 * @returns XSLT-compatible name
 */
export const getXsltCompatibleName = (node: SchemaNodeExtended): string => {
  // Remove namespace prefixes and special characters for XSLT compatibility
  let name = node.qName || node.name;

  // Handle attribute nodes
  if (node.nodeProperties.includes(SchemaNodeProperty.Attribute)) {
    name = `@${name}`;
  }

  return name;
};
