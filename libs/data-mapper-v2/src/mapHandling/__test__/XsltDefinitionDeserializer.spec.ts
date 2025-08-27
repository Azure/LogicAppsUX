import { XsltDefinitionDeserializer } from '../XsltDefinitionDeserializer';
import type { FunctionData } from '../../models';
import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';

// Mock data for testing
const mockSourceSchema: SchemaExtended = {
  name: 'SourceSchema',
  type: SchemaType.Source,
  namespaces: {},
  schemaTreeRoot: {
    key: '/source',
    name: 'source',
    qName: 'source',
    type: 'object',
    properties: [],
    nodeProperties: [],
    children: [
      {
        key: '/source/customer',
        name: 'customer',
        qName: 'customer',
        type: 'object',
        properties: [],
        nodeProperties: [],
        children: [
          {
            key: '/source/customer/name',
            name: 'name',
            qName: 'name',
            type: 'string',
            properties: [],
            nodeProperties: [],
            children: [],
            parentKey: '/source/customer',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
        ],
        parentKey: '/source',
        arrayItemIndex: undefined,
        pathToRoot: [],
      },
    ],
    parentKey: undefined,
    arrayItemIndex: undefined,
    pathToRoot: [],
  } as SchemaNodeExtended,
};

const mockTargetSchema: SchemaExtended = {
  name: 'TargetSchema',
  type: SchemaType.Target,
  namespaces: {},
  schemaTreeRoot: {
    key: '/target',
    name: 'target',
    qName: 'target',
    type: 'object',
    properties: [],
    nodeProperties: [],
    children: [
      {
        key: '/target/person',
        name: 'person',
        qName: 'person',
        type: 'object',
        properties: [],
        nodeProperties: [],
        children: [
          {
            key: '/target/person/fullName',
            name: 'fullName',
            qName: 'fullName',
            type: 'string',
            properties: [],
            nodeProperties: [],
            children: [],
            parentKey: '/target/person',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
        ],
        parentKey: '/target',
        arrayItemIndex: undefined,
        pathToRoot: [],
      },
    ],
    parentKey: undefined,
    arrayItemIndex: undefined,
    pathToRoot: [],
  } as SchemaNodeExtended,
};

const mockFunctions: FunctionData[] = [];

describe('XsltDefinitionDeserializer', () => {
  describe('Basic XSLT Parsing', () => {
    it('should parse simple XSLT with value-of', () => {
      const xsltContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/source">
            <target>
              <person>
                <fullName>
                  <xsl:value-of select="customer/name"/>
                </fullName>
              </person>
            </target>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const deserializer = new XsltDefinitionDeserializer(xsltContent, mockSourceSchema, mockTargetSchema, mockFunctions);
      const connections = deserializer.convertFromXsltDefinition();

      expect(connections).toBeDefined();
      expect(Object.keys(connections).length).toBeGreaterThan(0);
    });

    it('should handle XSLT with for-each loops', () => {
      const xsltContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/source">
            <target>
              <xsl:for-each select="customer">
                <person>
                  <fullName>
                    <xsl:value-of select="name"/>
                  </fullName>
                </person>
              </xsl:for-each>
            </target>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const deserializer = new XsltDefinitionDeserializer(xsltContent, mockSourceSchema, mockTargetSchema, mockFunctions);
      const connections = deserializer.convertFromXsltDefinition();

      expect(connections).toBeDefined();
    });

    it('should handle XSLT with conditional logic', () => {
      const xsltContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/source">
            <target>
              <xsl:if test="customer/name">
                <person>
                  <fullName>
                    <xsl:value-of select="customer/name"/>
                  </fullName>
                </person>
              </xsl:if>
            </target>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const deserializer = new XsltDefinitionDeserializer(xsltContent, mockSourceSchema, mockTargetSchema, mockFunctions);
      const connections = deserializer.convertFromXsltDefinition();

      expect(connections).toBeDefined();
    });

    it('should handle invalid XSLT gracefully', () => {
      const invalidXslt = `
        <?xml version="1.0" encoding="UTF-8"?>
        <invalid-xsl>
          <not-valid/>
        </invalid-xsl>
      `;

      const deserializer = new XsltDefinitionDeserializer(invalidXslt, mockSourceSchema, mockTargetSchema, mockFunctions);
      const connections = deserializer.convertFromXsltDefinition();

      // Should return empty connections for invalid XSLT
      expect(connections).toBeDefined();
      expect(Object.keys(connections).length).toBe(0);
    });

    it('should handle empty XSLT', () => {
      const emptyXslt = '';

      const deserializer = new XsltDefinitionDeserializer(emptyXslt, mockSourceSchema, mockTargetSchema, mockFunctions);
      const connections = deserializer.convertFromXsltDefinition();

      expect(connections).toBeDefined();
      expect(Object.keys(connections).length).toBe(0);
    });
  });

  describe('Template Processing', () => {
    it('should extract templates correctly', () => {
      const xsltContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/source">
            <target/>
          </xsl:template>
          <xsl:template match="customer" mode="detail">
            <person/>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const deserializer = new XsltDefinitionDeserializer(xsltContent, mockSourceSchema, mockTargetSchema, mockFunctions);

      // Access private method through type assertion for testing
      const parseMethod = (deserializer as any).parseXsltTemplates;
      const templates = parseMethod.call(deserializer);

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed XML', () => {
      const malformedXml = '<xsl:stylesheet><unclosed-tag></xsl:stylesheet>';

      const deserializer = new XsltDefinitionDeserializer(malformedXml, mockSourceSchema, mockTargetSchema, mockFunctions);
      const connections = deserializer.convertFromXsltDefinition();

      expect(connections).toBeDefined();
    });

    it('should handle missing schemas', () => {
      const xsltContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/source">
            <xsl:value-of select="nonexistent/path"/>
          </xsl:template>
        </xsl:stylesheet>
      `;

      const deserializer = new XsltDefinitionDeserializer(xsltContent, mockSourceSchema, mockTargetSchema, mockFunctions);

      // Should not throw error even with non-existent paths
      expect(() => {
        const connections = deserializer.convertFromXsltDefinition();
        expect(connections).toBeDefined();
      }).not.toThrow();
    });
  });
});
