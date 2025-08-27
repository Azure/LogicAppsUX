import { testXsltRoundtrip, createTestSourceSchema, createTestTargetSchema } from './xslt-mapping-test';
import { XsltDefinitionDeserializer } from '../mapHandling/XsltDefinitionDeserializer';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('XSLT Mapping Integration Tests', () => {
  const sampleXsltContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes"/>
  
  <xsl:template match="/SourceRoot">
    <TargetRoot>
      <CustomerInfo>
        <Name>
          <xsl:value-of select="Customer/Name"/>
        </Name>
        <Email>
          <xsl:value-of select="Customer/Email"/>
        </Email>
      </CustomerInfo>
    </TargetRoot>
  </xsl:template>
</xsl:stylesheet>`;

  it('should convert XSLT to visual connections', () => {
    const sourceSchema = createTestSourceSchema();
    const targetSchema = createTestTargetSchema();

    const deserializer = new XsltDefinitionDeserializer(sampleXsltContent, sourceSchema, targetSchema, []);

    const connections = deserializer.convertFromXsltDefinition();

    expect(connections).toBeDefined();
    expect(Object.keys(connections).length).toBeGreaterThan(0);

    // Log connections for inspection
    console.log('Generated connections:', Object.keys(connections));
    Object.entries(connections).forEach(([key, connection]) => {
      console.log(`Connection ${key}:`, {
        target: connection.self.node.name,
        inputs: connection.inputs.length,
      });
    });
  });

  it('should handle complex XSLT with loops and conditions', () => {
    const complexXslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/SourceRoot">
    <TargetRoot>
      <Orders>
        <xsl:for-each select="Customer/Orders/Order">
          <OrderItem>
            <xsl:if test="Price > 100">
              <HighValue>true</HighValue>
            </xsl:if>
            <Product>
              <xsl:value-of select="ProductName"/>
            </Product>
          </OrderItem>
        </xsl:for-each>
      </Orders>
    </TargetRoot>
  </xsl:template>
</xsl:stylesheet>`;

    const sourceSchema = createTestSourceSchema();
    const targetSchema = createTestTargetSchema();

    const deserializer = new XsltDefinitionDeserializer(complexXslt, sourceSchema, targetSchema, []);

    const connections = deserializer.convertFromXsltDefinition();
    expect(connections).toBeDefined();
  });

  // This test might fail initially as it requires the file system
  it.skip('should run full roundtrip test', async () => {
    const result = await testXsltRoundtrip();
    expect(result.connections).toBeDefined();
    expect(result.generatedXslt).toBeDefined();
    expect(typeof result.generatedXslt).toBe('string');
  });
});
