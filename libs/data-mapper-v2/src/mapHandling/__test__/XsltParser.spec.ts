import { describe, it, expect, beforeAll } from 'vitest';
import { XsltParser, parseXslt, xsltToMapDefinition } from '../XsltParser';
import { JSDOM } from 'jsdom';

// Set up DOMParser for Node.js environment
beforeAll(() => {
  const dom = new JSDOM();
  global.DOMParser = dom.window.DOMParser;
  global.Node = dom.window.Node;
});

describe('XsltParser', () => {
  const simpleXslt = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Target>
      <Name><xsl:value-of select="/Source/Name" /></Name>
      <Value><xsl:value-of select="/Source/Value" /></Value>
    </Target>
  </xsl:template>
</xsl:stylesheet>`;

  const loopXslt = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Target>
      <Items>
        <xsl:for-each select="/Source/Items/Item">
          <Item>
            <Name><xsl:value-of select="Name" /></Name>
            <Price><xsl:value-of select="Price" /></Price>
          </Item>
        </xsl:for-each>
      </Items>
    </Target>
  </xsl:template>
</xsl:stylesheet>`;

  const conditionalXslt = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Target>
      <xsl:if test="/Source/IsActive = 'true'">
        <Status><xsl:value-of select="/Source/Status" /></Status>
      </xsl:if>
    </Target>
  </xsl:template>
</xsl:stylesheet>`;

  const functionXslt = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Target>
      <FullName><xsl:value-of select="concat(/Source/FirstName, ' ', /Source/LastName)" /></FullName>
      <UpperName><xsl:value-of select="upper-case(/Source/Name)" /></UpperName>
    </Target>
  </xsl:template>
</xsl:stylesheet>`;

  describe('parseXslt', () => {
    it('should parse simple XSLT with direct mappings', () => {
      const result = parseXslt(simpleXslt);

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.targetRoot).toBe('Target');

      // Check for Name mapping
      const nameMapping = result.mappings.find((m) => m.targetPath.endsWith('/Name'));
      expect(nameMapping).toBeDefined();
      expect(nameMapping?.sourceExpression).toBe('/Source/Name');
      expect(nameMapping?.isInLoop).toBe(false);

      // Check for Value mapping
      const valueMapping = result.mappings.find((m) => m.targetPath.endsWith('/Value'));
      expect(valueMapping).toBeDefined();
      expect(valueMapping?.sourceExpression).toBe('/Source/Value');
    });

    it('should parse XSLT with for-each loops', () => {
      const result = parseXslt(loopXslt);

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBeGreaterThan(0);

      // All mappings inside the loop should have isInLoop = true
      const loopMappings = result.mappings.filter((m) => m.isInLoop);
      expect(loopMappings.length).toBeGreaterThan(0);

      // Check loop source
      const nameMapping = loopMappings.find((m) => m.targetPath.includes('/Name'));
      expect(nameMapping?.loopSource).toBe('/Source/Items/Item');
    });

    it('should parse XSLT with conditionals', () => {
      const result = parseXslt(conditionalXslt);

      expect(result.success).toBe(true);

      // Find conditional mapping
      const conditionalMapping = result.mappings.find((m) => m.isConditional);
      expect(conditionalMapping).toBeDefined();
      expect(conditionalMapping?.condition).toBe("/Source/IsActive = 'true'");
    });

    it('should parse XSLT with function calls', () => {
      const result = parseXslt(functionXslt);

      expect(result.success).toBe(true);

      // Find concat function mapping
      const concatMapping = result.mappings.find((m) => m.sourceExpression.includes('concat'));
      expect(concatMapping).toBeDefined();
      expect(concatMapping?.sourceExpression).toContain('concat');
      expect(concatMapping?.sourceExpression).toContain('/Source/FirstName');
      expect(concatMapping?.sourceExpression).toContain('/Source/LastName');

      // Find upper-case function mapping
      const upperMapping = result.mappings.find((m) => m.sourceExpression.includes('upper-case'));
      expect(upperMapping).toBeDefined();
    });

    it('should return error for invalid XSLT', () => {
      const invalidXslt = '<not valid xml';
      const result = parseXslt(invalidXslt);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for XSLT without template', () => {
      const noTemplateXslt = `<?xml version="1.0"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
</xsl:stylesheet>`;
      const result = parseXslt(noTemplateXslt);

      expect(result.success).toBe(false);
      expect(result.error).toContain('template');
    });
  });

  describe('xsltToMapDefinition', () => {
    it('should convert simple XSLT to map definition', () => {
      const mapDef = xsltToMapDefinition(simpleXslt, 'Source.xsd', 'Target.xsd');

      expect(mapDef).not.toBeNull();
      expect(mapDef?.$sourceSchema).toBe('Source.xsd');
      expect(mapDef?.$targetSchema).toBe('Target.xsd');
    });

    it('should return null for invalid XSLT', () => {
      const mapDef = xsltToMapDefinition('<invalid>', 'Source.xsd', 'Target.xsd');

      expect(mapDef).toBeNull();
    });
  });

  describe('XsltParser class', () => {
    it('should create parser instance and parse', () => {
      const parser = new XsltParser(simpleXslt);
      const result = parser.parse();

      expect(result.success).toBe(true);
    });

    it('should convert to map definition', () => {
      const parser = new XsltParser(simpleXslt);
      const parseResult = parser.parse();
      const mapDef = parser.toMapDefinition(parseResult, 'Source.xsd', 'Target.xsd');

      expect(mapDef.$sourceSchema).toBe('Source.xsd');
      expect(mapDef.$targetSchema).toBe('Target.xsd');
    });
  });

  describe('nested elements', () => {
    const nestedXslt = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Order>
      <Customer>
        <Name><xsl:value-of select="/Order/Customer/Name" /></Name>
        <Address>
          <City><xsl:value-of select="/Order/Customer/Address/City" /></City>
          <Country><xsl:value-of select="/Order/Customer/Address/Country" /></Country>
        </Address>
      </Customer>
    </Order>
  </xsl:template>
</xsl:stylesheet>`;

    it('should handle deeply nested elements', () => {
      const result = parseXslt(nestedXslt);

      expect(result.success).toBe(true);

      // Check nested path
      const cityMapping = result.mappings.find((m) => m.targetPath.includes('/City'));
      expect(cityMapping).toBeDefined();
      expect(cityMapping?.targetPath).toContain('/Customer/Address/City');
    });
  });

  describe('multiple loops', () => {
    const multiLoopXslt = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <Root>
      <Categories>
        <xsl:for-each select="/Root/Categories/Category">
          <Category>
            <Name><xsl:value-of select="Name" /></Name>
            <Products>
              <xsl:for-each select="Products/Product">
                <Product>
                  <Title><xsl:value-of select="Title" /></Title>
                </Product>
              </xsl:for-each>
            </Products>
          </Category>
        </xsl:for-each>
      </Categories>
    </Root>
  </xsl:template>
</xsl:stylesheet>`;

    it('should handle nested loops', () => {
      const result = parseXslt(multiLoopXslt);

      expect(result.success).toBe(true);

      // All loop mappings should be marked
      const loopMappings = result.mappings.filter((m) => m.isInLoop);
      expect(loopMappings.length).toBeGreaterThan(0);
    });
  });

  describe('Data Mapper backend format', () => {
    // This is the actual format generated by the Data Mapper backend
    // Uses XSLT 3.0 text value templates {expression} and mode="azure.workflow.datamapper"
    const dataMapperXslt = `<xsl:stylesheet xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:math="http://www.w3.org/2005/xpath-functions/math" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:dm="http://azure.workflow.datamapper" xmlns:ef="http://azure.workflow.datamapper.extensions" exclude-result-prefixes="xsl xs math dm ef" version="3.0" expand-text="yes">
  <xsl:output indent="yes" media-type="text/xml" method="xml" />
  <xsl:template match="/">
    <xsl:apply-templates select="." mode="azure.workflow.datamapper" />
  </xsl:template>
  <xsl:template match="/" mode="azure.workflow.datamapper">
    <Person>
      <fullName>{concat(/Person/firstName, /Person/lastName)}</fullName>
    </Person>
  </xsl:template>
</xsl:stylesheet>`;

    it('should parse XSLT with azure.workflow.datamapper mode', () => {
      const result = parseXslt(dataMapperXslt);

      expect(result.success).toBe(true);
      expect(result.targetRoot).toBe('Person');
      expect(result.mappings.length).toBeGreaterThan(0);
    });

    it('should extract text value templates (curly brace expressions)', () => {
      const result = parseXslt(dataMapperXslt);

      expect(result.success).toBe(true);

      // Should find the concat function mapping
      const fullNameMapping = result.mappings.find((m) => m.targetPath.includes('/fullName'));
      expect(fullNameMapping).toBeDefined();
      expect(fullNameMapping?.sourceExpression).toBe('concat(/Person/firstName, /Person/lastName)');
    });

    it('should convert Data Mapper XSLT to map definition', () => {
      const mapDef = xsltToMapDefinition(dataMapperXslt, 'source.xsd', 'target.xsd');

      expect(mapDef).not.toBeNull();
      expect(mapDef?.$sourceSchema).toBe('source.xsd');
      expect(mapDef?.$targetSchema).toBe('target.xsd');

      // Check that the Person/fullName mapping exists
      expect(mapDef?.Person).toBeDefined();
    });

    // Test with direct field mappings (no function)
    const simpleDataMapperXslt = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" expand-text="yes">
  <xsl:output indent="yes" method="xml" />
  <xsl:template match="/">
    <xsl:apply-templates select="." mode="azure.workflow.datamapper" />
  </xsl:template>
  <xsl:template match="/" mode="azure.workflow.datamapper">
    <Target>
      <Name>{/Source/Name}</Name>
      <Value>{/Source/Value}</Value>
    </Target>
  </xsl:template>
</xsl:stylesheet>`;

    it('should parse simple direct mappings with text value templates', () => {
      const result = parseXslt(simpleDataMapperXslt);

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBe(2);

      const nameMapping = result.mappings.find((m) => m.targetPath.endsWith('/Name'));
      expect(nameMapping?.sourceExpression).toBe('/Source/Name');

      const valueMapping = result.mappings.find((m) => m.targetPath.endsWith('/Value'));
      expect(valueMapping?.sourceExpression).toBe('/Source/Value');
    });

    // Test with single-quoted string literals (should convert to double quotes for LML)
    const xsltWithStringLiterals = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" expand-text="yes">
  <xsl:output indent="yes" method="xml" />
  <xsl:template match="/">
    <xsl:apply-templates select="." mode="azure.workflow.datamapper" />
  </xsl:template>
  <xsl:template match="/" mode="azure.workflow.datamapper">
    <Person>
      <fullName>{concat(/Person/firstName, ' ', /Person/lastName)}</fullName>
    </Person>
  </xsl:template>
</xsl:stylesheet>`;

    it('should convert XPath single-quoted string literals to double quotes for LML compatibility', () => {
      const result = parseXslt(xsltWithStringLiterals);

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBe(1);

      const fullNameMapping = result.mappings.find((m) => m.targetPath.endsWith('/fullName'));
      expect(fullNameMapping).toBeDefined();
      // Single quotes in XPath should be converted to double quotes for LML
      expect(fullNameMapping?.sourceExpression).toBe('concat(/Person/firstName, " ", /Person/lastName)');
    });

    // Test with math expressions (infix operators should convert to function calls)
    const xsltWithMathExpressions = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" expand-text="yes">
  <xsl:output indent="yes" method="xml" />
  <xsl:template match="/">
    <xsl:apply-templates select="." mode="azure.workflow.datamapper" />
  </xsl:template>
  <xsl:template match="/" mode="azure.workflow.datamapper">
    <Person>
      <age>{(/Person/age) + (5)}</age>
      <discount>{(/Order/price) * (0.1)}</discount>
      <remaining>{(/Account/balance) - (/Account/spent)}</remaining>
      <multiAdd>{(/Person/age) + (6) + (8)}</multiAdd>
    </Person>
  </xsl:template>
</xsl:stylesheet>`;

    it('should convert XPath math expressions to function calls for LML compatibility', () => {
      const result = parseXslt(xsltWithMathExpressions);

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBe(4);

      // Addition: (/Person/age) + (5) -> add(/Person/age, 5)
      const ageMapping = result.mappings.find((m) => m.targetPath.endsWith('/age'));
      expect(ageMapping).toBeDefined();
      expect(ageMapping?.sourceExpression).toBe('add(/Person/age, 5)');

      // Multiplication: (/Order/price) * (0.1) -> multiply(/Order/price, 0.1)
      const discountMapping = result.mappings.find((m) => m.targetPath.endsWith('/discount'));
      expect(discountMapping).toBeDefined();
      expect(discountMapping?.sourceExpression).toBe('multiply(/Order/price, 0.1)');

      // Subtraction: (/Account/balance) - (/Account/spent) -> subtract(/Account/balance, /Account/spent)
      const remainingMapping = result.mappings.find((m) => m.targetPath.endsWith('/remaining'));
      expect(remainingMapping).toBeDefined();
      expect(remainingMapping?.sourceExpression).toBe('subtract(/Account/balance, /Account/spent)');

      // Multi-operand addition: (/Person/age) + (6) + (8) -> add(/Person/age, 6, 8) (flat, not nested)
      const multiAddMapping = result.mappings.find((m) => m.targetPath.endsWith('/multiAdd'));
      expect(multiAddMapping).toBeDefined();
      expect(multiAddMapping?.sourceExpression).toBe('add(/Person/age, 6, 8)');
    });

    // Test combined: concat with string literals + math expression
    const xsltWithCombinedExpressions = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" expand-text="yes">
  <xsl:output indent="yes" method="xml" />
  <xsl:template match="/">
    <xsl:apply-templates select="." mode="azure.workflow.datamapper" />
  </xsl:template>
  <xsl:template match="/" mode="azure.workflow.datamapper">
    <Person>
      <fullName>{concat(/Person/firstName, ' Middle ', /Person/lastName)}</fullName>
      <age>{(/Person/age) + (5)}</age>
    </Person>
  </xsl:template>
</xsl:stylesheet>`;

    it('should handle both string literals and math expressions together', () => {
      const result = parseXslt(xsltWithCombinedExpressions);

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBe(2);

      // String literals converted to double quotes
      const fullNameMapping = result.mappings.find((m) => m.targetPath.endsWith('/fullName'));
      expect(fullNameMapping).toBeDefined();
      expect(fullNameMapping?.sourceExpression).toBe('concat(/Person/firstName, " Middle ", /Person/lastName)');

      // Math expression converted to function call
      const ageMapping = result.mappings.find((m) => m.targetPath.endsWith('/age'));
      expect(ageMapping).toBeDefined();
      expect(ageMapping?.sourceExpression).toBe('add(/Person/age, 5)');
    });

    // Test with namespaced functions (namespace prefixes should be removed)
    const xsltWithNamespacedFunctions = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:math="http://www.w3.org/2005/xpath-functions/math" version="3.0" expand-text="yes">
  <xsl:output indent="yes" method="xml" />
  <xsl:template match="/">
    <xsl:apply-templates select="." mode="azure.workflow.datamapper" />
  </xsl:template>
  <xsl:template match="/" mode="azure.workflow.datamapper">
    <Result>
      <expValue>{math:exp(/Input/value)}</expValue>
      <sqrtValue>{math:sqrt(/Input/value)}</sqrtValue>
      <logValue>{math:log(/Input/value)}</logValue>
    </Result>
  </xsl:template>
</xsl:stylesheet>`;

    it('should remove namespace prefixes from function calls', () => {
      const result = parseXslt(xsltWithNamespacedFunctions);

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBe(3);

      // math:exp -> exp
      const expMapping = result.mappings.find((m) => m.targetPath.endsWith('/expValue'));
      expect(expMapping).toBeDefined();
      expect(expMapping?.sourceExpression).toBe('exp(/Input/value)');

      // math:sqrt -> sqrt
      const sqrtMapping = result.mappings.find((m) => m.targetPath.endsWith('/sqrtValue'));
      expect(sqrtMapping).toBeDefined();
      expect(sqrtMapping?.sourceExpression).toBe('sqrt(/Input/value)');

      // math:log -> log
      const logMapping = result.mappings.find((m) => m.targetPath.endsWith('/logValue'));
      expect(logMapping).toBeDefined();
      expect(logMapping?.sourceExpression).toBe('log(/Input/value)');
    });
  });
});
