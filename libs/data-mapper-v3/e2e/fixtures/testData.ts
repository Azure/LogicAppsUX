import path from 'node:path';
import type { MapDocument, MapFunctoid, MapLink } from '../../src/model/mapModel';
import type { FunctoidSummary } from '../../src/protocol/mapEditorProtocol';
import type { SchemaNode, SchemaTree } from '../../src/model/schemaModel';
import { BtmSerializer } from '../../src/schema/btmSerializer';
import { resolveSchemaDependencies } from '../../src/schema/schemaDependencyResolver';
import { readTextFileSync, resolveSchemaFilePath } from '../../src/schema/schemaFileResolver';
import { SchemaParser } from '../../src/schema/schemaParser';

export type TestSchemaNode = SchemaNode;
export type TestSchema = SchemaTree;

function leaf(parentPath: string, name: string, dataType = 'xs:string'): SchemaNode {
  return { name, path: `${parentPath}/${name}`, type: 'element', dataType, isOptional: false, children: [], attributes: [] };
}

function parent(path: string, name: string, children: SchemaNode[]): SchemaNode {
  return { name, path, type: 'element', isOptional: false, children, attributes: [] };
}

export const paths = {
  source: {
    root: '/Order',
    orderId: '/Order/OrderId',
    customer: '/Order/Customer',
    customerName: '/Order/Customer/Name',
    customerEmail: '/Order/Customer/Email',
  },
  target: {
    root: '/Invoice',
    invoiceId: '/Invoice/InvoiceId',
    billTo: '/Invoice/BillTo',
    billToName: '/Invoice/BillTo/FullName',
    billToEmail: '/Invoice/BillTo/Email',
  },
} as const;

export function createSourceSchema(filePath = 'Schemas/Order.xsd'): TestSchema {
  return {
    filePath,
    targetNamespace: 'http://example.com/order',
    namespaces: {},
    rootElement: parent(paths.source.root, 'Order', [
      leaf(paths.source.root, 'OrderId'),
      parent(paths.source.customer, 'Customer', [leaf(paths.source.customer, 'Name'), leaf(paths.source.customer, 'Email')]),
    ]),
  };
}

export function createTargetSchema(filePath = 'Schemas/Invoice.xsd'): TestSchema {
  return {
    filePath,
    targetNamespace: 'http://example.com/invoice',
    namespaces: {},
    rootElement: parent(paths.target.root, 'Invoice', [
      leaf(paths.target.root, 'InvoiceId'),
      parent(paths.target.billTo, 'BillTo', [leaf(paths.target.billTo, 'FullName'), leaf(paths.target.billTo, 'Email')]),
    ]),
  };
}

export const functoids: FunctoidSummary[] = [
  {
    id: 107,
    name: 'String Concatenate',
    category: 'String',
    description: 'Concatenates a series of input strings.',
    minInputs: 2,
    maxInputs: 5,
    hasOutput: true,
    tooltip: 'Concatenate values',
  },
  {
    id: 110,
    name: 'String Uppercase',
    category: 'String',
    description: 'Converts a string to upper case.',
    minInputs: 1,
    maxInputs: 1,
    hasOutput: true,
    tooltip: 'Uppercase a value',
  },
  {
    id: 324,
    name: 'Cumulative Sum',
    category: 'Cumulative',
    description: 'Adds values across repeating records.',
    minInputs: 1,
    maxInputs: 1,
    hasOutput: true,
    tooltip: 'Sum repeating values',
  },
];

export function createMap(overrides: Partial<MapDocument> = {}): MapDocument {
  return {
    name: 'OrderToInvoice',
    version: '1.0',
    options: {
      omitXmlDeclaration: false,
      xsltVersion: '1.0',
      xsltEncoding: 'utf-8',
      preserveSequenceOrder: false,
      treatElementsAsRecords: false,
      optimizeValueMapping: false,
      generateDefaultFixedNodes: false,
      ignoreNamespacesForLinks: false,
      outputMethod: 'xml',
    },
    sourceSchema: { location: 'Schemas/Order.xsd' },
    targetSchema: { location: 'Schemas/Invoice.xsd' },
    pages: [{ id: 'page1', name: 'Page 1', links: [], functoids: [] }],
    ...overrides,
  };
}

export function createSchemaLink(id: string, sourcePath: string, targetPath: string): MapLink {
  return {
    id,
    sourceId: sourcePath,
    sourcePath,
    targetId: targetPath,
    targetPath,
    sourceType: 'schemaNode' as MapLink['sourceType'],
    targetType: 'schemaNode' as MapLink['targetType'],
  };
}

export function createMapFunctoid(id: string, overrides: Partial<MapFunctoid> = {}): MapFunctoid {
  return {
    id,
    functoidId: 107,
    category: 'String' as MapFunctoid['category'],
    name: 'String Concatenate',
    x: 240,
    y: 120,
    inputLinks: [],
    outputLinks: [],
    parameters: [],
    ...overrides,
  };
}

export interface InitPayload {
  map: MapDocument;
  sourceSchema: SchemaTree | null;
  targetSchema: SchemaTree | null;
  availableSchemas: string[];
  functoids: FunctoidSummary[];
  schemaErrors?: Record<string, { reference: string; message: string }>;
}

export function createInitPayload(overrides: Partial<InitPayload> = {}): InitPayload {
  return {
    map: createMap(),
    sourceSchema: createSourceSchema(),
    targetSchema: createTargetSchema(),
    availableSchemas: ['Schemas/Order.xsd', 'Schemas/Invoice.xsd', 'Schemas/Shipment.xsd'],
    functoids,
    ...overrides,
  };
}

export async function loadSampleMap(relativePath: string, serializedContent?: string): Promise<InitPayload> {
  const mapPath = path.resolve(__dirname, '../samples', relativePath);
  const content = serializedContent ?? readTextFileSync(mapPath);
  if (!content) {
    throw new Error(`Sample map not found: ${mapPath}`);
  }
  const map = new BtmSerializer().deserialize(content);
  const loadSchema = async (reference: MapDocument['sourceSchema']): Promise<SchemaTree | null> => {
    const schemaPath = reference.location ? resolveSchemaFilePath(path.dirname(mapPath), reference.location, reference.rootName) : mapPath;
    const schemaXml = reference.location ? readTextFileSync(schemaPath) : reference.inlineSchemaXml;
    if (!schemaXml) {
      throw new Error(`Sample schema not found: ${reference.location || mapPath}`);
    }
    const dependencies = await resolveSchemaDependencies(
      schemaXml,
      schemaPath,
      async (dependencyPath) => readTextFileSync(dependencyPath),
      (containingPath, location) => resolveSchemaFilePath(path.dirname(containingPath), location)
    );
    return new SchemaParser().parseWithImports(schemaXml, schemaPath, dependencies, reference.rootName);
  };
  const sourceSchema = await loadSchema(map.sourceSchema);
  const targetSchema = await loadSchema(map.targetSchema);
  return createInitPayload({ map, sourceSchema, targetSchema });
}
