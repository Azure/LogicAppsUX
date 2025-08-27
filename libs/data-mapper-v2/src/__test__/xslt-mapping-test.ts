import { XsltDefinitionDeserializer } from '../mapHandling/XsltDefinitionDeserializer';
import { convertToXsltDefinition } from '../mapHandling/XsltDefinitionSerializer';
import { convertXsltToConnections, convertConnectionsToXslt } from '../core/queries/datamap';
import type { FunctionData } from '../models';
import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test schemas matching the XSLT sample
export const createTestSourceSchema = (): SchemaExtended => ({
  name: 'SourceSchema',
  type: SchemaType.Source,
  namespaces: {},
  schemaTreeRoot: {
    key: '/SourceRoot',
    name: 'SourceRoot',
    qName: 'SourceRoot',
    type: 'object',
    properties: [],
    nodeProperties: [],
    children: [
      {
        key: '/SourceRoot/Customer',
        name: 'Customer',
        qName: 'Customer',
        type: 'object',
        properties: [],
        nodeProperties: [],
        children: [
          {
            key: '/SourceRoot/Customer/Name',
            name: 'Name',
            qName: 'Name',
            type: 'string',
            properties: [],
            nodeProperties: [],
            children: [],
            parentKey: '/SourceRoot/Customer',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
          {
            key: '/SourceRoot/Customer/Email',
            name: 'Email',
            qName: 'Email',
            type: 'string',
            properties: [],
            nodeProperties: [],
            children: [],
            parentKey: '/SourceRoot/Customer',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
          {
            key: '/SourceRoot/Customer/Orders',
            name: 'Orders',
            qName: 'Orders',
            type: 'object',
            properties: [],
            nodeProperties: [],
            children: [
              {
                key: '/SourceRoot/Customer/Orders/Order',
                name: 'Order',
                qName: 'Order',
                type: 'object',
                properties: [],
                nodeProperties: [SchemaNodeProperty.Repeating],
                children: [
                  {
                    key: '/SourceRoot/Customer/Orders/Order/@id',
                    name: 'id',
                    qName: 'id',
                    type: 'string',
                    properties: [],
                    nodeProperties: [SchemaNodeProperty.Attribute],
                    children: [],
                    parentKey: '/SourceRoot/Customer/Orders/Order',
                    arrayItemIndex: undefined,
                    pathToRoot: [],
                  },
                  {
                    key: '/SourceRoot/Customer/Orders/Order/ProductName',
                    name: 'ProductName',
                    qName: 'ProductName',
                    type: 'string',
                    properties: [],
                    nodeProperties: [],
                    children: [],
                    parentKey: '/SourceRoot/Customer/Orders/Order',
                    arrayItemIndex: undefined,
                    pathToRoot: [],
                  },
                  {
                    key: '/SourceRoot/Customer/Orders/Order/Quantity',
                    name: 'Quantity',
                    qName: 'Quantity',
                    type: 'number',
                    properties: [],
                    nodeProperties: [],
                    children: [],
                    parentKey: '/SourceRoot/Customer/Orders/Order',
                    arrayItemIndex: undefined,
                    pathToRoot: [],
                  },
                  {
                    key: '/SourceRoot/Customer/Orders/Order/Price',
                    name: 'Price',
                    qName: 'Price',
                    type: 'number',
                    properties: [],
                    nodeProperties: [],
                    children: [],
                    parentKey: '/SourceRoot/Customer/Orders/Order',
                    arrayItemIndex: undefined,
                    pathToRoot: [],
                  },
                ],
                parentKey: '/SourceRoot/Customer/Orders',
                arrayItemIndex: undefined,
                pathToRoot: [],
              },
            ],
            parentKey: '/SourceRoot/Customer',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
        ],
        parentKey: '/SourceRoot',
        arrayItemIndex: undefined,
        pathToRoot: [],
      },
    ],
    parentKey: undefined,
    arrayItemIndex: undefined,
    pathToRoot: [],
  } as SchemaNodeExtended,
});

export const createTestTargetSchema = (): SchemaExtended => ({
  name: 'TargetSchema',
  type: SchemaType.Target,
  namespaces: {},
  schemaTreeRoot: {
    key: '/TargetRoot',
    name: 'TargetRoot',
    qName: 'TargetRoot',
    type: 'object',
    properties: [],
    nodeProperties: [],
    children: [
      {
        key: '/TargetRoot/CustomerInfo',
        name: 'CustomerInfo',
        qName: 'CustomerInfo',
        type: 'object',
        properties: [],
        nodeProperties: [],
        children: [
          {
            key: '/TargetRoot/CustomerInfo/Name',
            name: 'Name',
            qName: 'Name',
            type: 'string',
            properties: [],
            nodeProperties: [],
            children: [],
            parentKey: '/TargetRoot/CustomerInfo',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
          {
            key: '/TargetRoot/CustomerInfo/Email',
            name: 'Email',
            qName: 'Email',
            type: 'string',
            properties: [],
            nodeProperties: [],
            children: [],
            parentKey: '/TargetRoot/CustomerInfo',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
        ],
        parentKey: '/TargetRoot',
        arrayItemIndex: undefined,
        pathToRoot: [],
      },
      {
        key: '/TargetRoot/Orders',
        name: 'Orders',
        qName: 'Orders',
        type: 'object',
        properties: [],
        nodeProperties: [],
        children: [
          {
            key: '/TargetRoot/Orders/OrderItem',
            name: 'OrderItem',
            qName: 'OrderItem',
            type: 'object',
            properties: [],
            nodeProperties: [SchemaNodeProperty.Repeating],
            children: [
              {
                key: '/TargetRoot/Orders/OrderItem/OrderId',
                name: 'OrderId',
                qName: 'OrderId',
                type: 'string',
                properties: [],
                nodeProperties: [],
                children: [],
                parentKey: '/TargetRoot/Orders/OrderItem',
                arrayItemIndex: undefined,
                pathToRoot: [],
              },
              {
                key: '/TargetRoot/Orders/OrderItem/Product',
                name: 'Product',
                qName: 'Product',
                type: 'string',
                properties: [],
                nodeProperties: [],
                children: [],
                parentKey: '/TargetRoot/Orders/OrderItem',
                arrayItemIndex: undefined,
                pathToRoot: [],
              },
              {
                key: '/TargetRoot/Orders/OrderItem/Quantity',
                name: 'Quantity',
                qName: 'Quantity',
                type: 'number',
                properties: [],
                nodeProperties: [],
                children: [],
                parentKey: '/TargetRoot/Orders/OrderItem',
                arrayItemIndex: undefined,
                pathToRoot: [],
              },
              {
                key: '/TargetRoot/Orders/OrderItem/HighValue',
                name: 'HighValue',
                qName: 'HighValue',
                type: 'boolean',
                properties: [],
                nodeProperties: [],
                children: [],
                parentKey: '/TargetRoot/Orders/OrderItem',
                arrayItemIndex: undefined,
                pathToRoot: [],
              },
            ],
            parentKey: '/TargetRoot/Orders',
            arrayItemIndex: undefined,
            pathToRoot: [],
          },
        ],
        parentKey: '/TargetRoot',
        arrayItemIndex: undefined,
        pathToRoot: [],
      },
      {
        key: '/TargetRoot/ProcessedDate',
        name: 'ProcessedDate',
        qName: 'ProcessedDate',
        type: 'string',
        properties: [],
        nodeProperties: [],
        children: [],
        parentKey: '/TargetRoot',
        arrayItemIndex: undefined,
        pathToRoot: [],
      },
    ],
    parentKey: undefined,
    arrayItemIndex: undefined,
    pathToRoot: [],
  } as SchemaNodeExtended,
});

/**
 * Test function to convert XSLT to visual mappings and display connections
 */
export async function testXsltToVisualMapping() {
  console.log('🧪 Testing XSLT to Visual Mapping...');

  // Load the sample XSLT
  const xsltPath = join(__dirname, 'sample-xslt-map.xslt');
  const xsltContent = readFileSync(xsltPath, 'utf8');

  // Create test schemas
  const sourceSchema = createTestSourceSchema();
  const targetSchema = createTestTargetSchema();
  const functions: FunctionData[] = [];

  try {
    // Convert XSLT to connections
    const connections = convertXsltToConnections(xsltContent, sourceSchema, targetSchema, functions);

    console.log('✅ Successfully converted XSLT to connections');
    console.log(`📊 Generated ${Object.keys(connections).length} connections:`);

    // Display connections
    Object.entries(connections).forEach(([key, connection]) => {
      console.log(`\n🔗 Connection: ${key}`);
      console.log(`   Target: ${connection.self.node.name || 'Unknown'}`);
      console.log(`   Inputs: ${connection.inputs.length}`);

      connection.inputs.forEach((input, index) => {
        if ('value' in input && input.isCustom) {
          console.log(`     Input ${index}: Custom value "${input.value}"`);
        } else if ('node' in input && input.isDefined) {
          console.log(`     Input ${index}: ${input.node.name || 'Unknown node'}`);
        } else {
          console.log(`     Input ${index}: Empty connection`);
        }
      });
    });

    return connections;
  } catch (error) {
    console.error('❌ Error converting XSLT to visual mapping:', error);
    throw error;
  }
}

/**
 * Test function to convert visual mappings back to XSLT
 */
export async function testVisualToXsltMapping(connections: any) {
  console.log('\n🧪 Testing Visual to XSLT Mapping...');

  const sourceSchema = createTestSourceSchema();
  const targetSchema = createTestTargetSchema();

  try {
    // Convert connections back to XSLT
    const generatedXslt = convertConnectionsToXslt(connections, sourceSchema, targetSchema);

    console.log('✅ Successfully converted visual mapping to XSLT');
    console.log('\n📝 Generated XSLT:');
    console.log('='.repeat(50));
    console.log(generatedXslt);
    console.log('='.repeat(50));

    return generatedXslt;
  } catch (error) {
    console.error('❌ Error converting visual mapping to XSLT:', error);
    throw error;
  }
}

/**
 * Full roundtrip test: XSLT → Visual → XSLT
 */
export async function testXsltRoundtrip() {
  console.log('🔄 Testing XSLT Roundtrip Conversion...\n');

  try {
    // Step 1: XSLT to Visual
    const connections = await testXsltToVisualMapping();

    // Step 2: Visual to XSLT
    const generatedXslt = await testVisualToXsltMapping(connections);

    console.log('\n🎉 Roundtrip test completed successfully!');
    return { connections, generatedXslt };
  } catch (error) {
    console.error('❌ Roundtrip test failed:', error);
    throw error;
  }
}

// Export test runner
export const runXsltMappingTests = async () => {
  try {
    await testXsltRoundtrip();
  } catch (error) {
    console.error('Test suite failed:', error);
  }
};
