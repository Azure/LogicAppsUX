import {
  parseXPath,
  xpathToSchemaPath,
  extractXsltNamespaces,
  isLoopingElement,
  isConditionalElement,
  validateXsltSyntax,
  extractTemplateMatches,
  getXsltCompatibleName,
} from '../Xslt.Utils';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty } from '@microsoft/logic-apps-shared';

describe('Xslt.Utils', () => {
  describe('parseXPath', () => {
    it('should parse simple XPath expressions', () => {
      const result = parseXPath('/customer/name');
      expect(result.path).toBe('/customer/name');
      expect(result.predicates).toEqual([]);
      expect(result.functions).toEqual([]);
      expect(result.variables).toEqual([]);
    });

    it('should parse XPath with predicates', () => {
      const result = parseXPath('/customer[id=1]/name');
      expect(result.path).toBe('/customer/name');
      expect(result.predicates).toContain('id=1');
    });

    it('should parse XPath with functions', () => {
      const result = parseXPath('/customer/count(orders)');
      expect(result.functions.length).toBeGreaterThan(0);
    });

    it('should parse XPath with variables', () => {
      const result = parseXPath('$customerName/text()');
      expect(result.variables).toContain('customerName');
    });
  });

  describe('xpathToSchemaPath', () => {
    it('should convert absolute XPath to schema path', () => {
      const result = xpathToSchemaPath('/customer/name');
      expect(result).toBe('customer/name');
    });

    it('should handle relative XPath expressions', () => {
      const result = xpathToSchemaPath('./name', 'customer');
      expect(result).toBe('customer/name');
    });

    it('should handle parent navigation', () => {
      const result = xpathToSchemaPath('../name', 'customer/orders');
      expect(result).toBe('customer/name');
    });
  });

  describe('extractXsltNamespaces', () => {
    it('should extract namespaces from XSLT', () => {
      const xslt = `
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                        xmlns:foo="http://example.com/foo">
        </xsl:stylesheet>
      `;

      const namespaces = extractXsltNamespaces(xslt);
      expect(namespaces.length).toBeGreaterThan(0);
      expect(namespaces.some((ns) => ns.prefix === 'foo')).toBe(true);
    });

    it('should handle XSLT without custom namespaces', () => {
      const xslt = `
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        </xsl:stylesheet>
      `;

      const namespaces = extractXsltNamespaces(xslt);
      expect(namespaces).toBeDefined();
    });

    it('should handle invalid XML gracefully', () => {
      const invalidXml = '<invalid><unclosed>';
      const namespaces = extractXsltNamespaces(invalidXml);
      expect(namespaces).toEqual([]);
    });
  });

  describe('isLoopingElement', () => {
    it('should identify for-each as looping element', () => {
      const element = document.createElement('xsl:for-each');
      expect(isLoopingElement(element)).toBe(true);
    });

    it('should not identify if as looping element', () => {
      const element = document.createElement('xsl:if');
      expect(isLoopingElement(element)).toBe(false);
    });
  });

  describe('isConditionalElement', () => {
    it('should identify if as conditional element', () => {
      const element = document.createElement('xsl:if');
      expect(isConditionalElement(element)).toBe(true);
    });

    it('should identify choose as conditional element', () => {
      const element = document.createElement('xsl:choose');
      expect(isConditionalElement(element)).toBe(true);
    });

    it('should identify when as conditional element', () => {
      const element = document.createElement('xsl:when');
      expect(isConditionalElement(element)).toBe(true);
    });

    it('should not identify for-each as conditional element', () => {
      const element = document.createElement('xsl:for-each');
      expect(isConditionalElement(element)).toBe(false);
    });
  });

  describe('validateXsltSyntax', () => {
    it('should validate correct XSLT syntax', () => {
      const validXslt = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/">
            <result/>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const result = validateXsltSyntax(validXslt);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid XML', () => {
      const invalidXml = '<xsl:stylesheet><unclosed-tag></xsl:stylesheet>';
      const result = validateXsltSyntax(invalidXml);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing XSLT root element', () => {
      const nonXslt = '<root><child/></root>';
      const result = validateXsltSyntax(nonXslt);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes('xsl:stylesheet'))).toBe(true);
    });
  });

  describe('extractTemplateMatches', () => {
    it('should extract template match patterns', () => {
      const xslt = `
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/root">
            <output/>
          </xsl:template>
          <xsl:template match="customer">
            <person/>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const matches = extractTemplateMatches(xslt);
      expect(matches).toContain('/root');
      expect(matches).toContain('customer');
    });

    it('should handle templates without match attribute', () => {
      const xslt = `
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template name="named-template">
            <output/>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const matches = extractTemplateMatches(xslt);
      expect(matches).toEqual([]);
    });
  });

  describe('getXsltCompatibleName', () => {
    it('should return qName for regular nodes', () => {
      const node: SchemaNodeExtended = {
        key: '/test',
        name: 'testNode',
        qName: 'test:node',
        type: 'string',
        nodeProperties: [],
        children: [],
        properties: [],
        parentKey: undefined,
        arrayItemIndex: undefined,
        pathToRoot: [],
      };

      const result = getXsltCompatibleName(node);
      expect(result).toBe('test:node');
    });

    it('should prefix @ for attribute nodes', () => {
      const node: SchemaNodeExtended = {
        key: '/test',
        name: 'testAttr',
        qName: 'testAttr',
        type: 'string',
        nodeProperties: [SchemaNodeProperty.Attribute],
        children: [],
        properties: [],
        parentKey: undefined,
        arrayItemIndex: undefined,
        pathToRoot: [],
      };

      const result = getXsltCompatibleName(node);
      expect(result).toBe('@testAttr');
    });

    it('should fallback to name if qName is not available', () => {
      const node: SchemaNodeExtended = {
        key: '/test',
        name: 'testNode',
        qName: '',
        type: 'string',
        nodeProperties: [],
        children: [],
        properties: [],
        parentKey: undefined,
        arrayItemIndex: undefined,
        pathToRoot: [],
      };

      const result = getXsltCompatibleName(node);
      expect(result).toBe('testNode');
    });
  });
});
