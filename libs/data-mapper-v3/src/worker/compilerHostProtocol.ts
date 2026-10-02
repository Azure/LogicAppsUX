import type { CompileResult, XsltCompiler } from '../compiler/xsltCompiler';
import type { MapDocument } from '../model';
import type { SchemaTree } from '../model/schemaModel';
import { SchemaParser } from '../schema/schemaParser';
import { resolveSchemaDependencies } from '../schema/schemaDependencyResolver';
import type { WorkerSchemaReference } from './compilerWorkerClient';
import * as fs from 'fs';
import * as path from 'path';

export interface CompileHostRequest {
  id: number;
  map: MapDocument;
  sourceSchema?: SchemaTree;
  targetSchema?: SchemaTree;
  sourceSchemaReference?: WorkerSchemaReference;
  targetSchemaReference?: WorkerSchemaReference;
}

function reviveSchema(schema?: SchemaTree): SchemaTree | undefined {
  if (!schema) {
    return undefined;
  }
  return {
    ...schema,
    namespaces: { ...schema.namespaces },
  };
}

async function loadSchema(reference?: WorkerSchemaReference): Promise<SchemaTree | undefined> {
  if (!reference) {
    return undefined;
  }
  const filePath = reference.filePath || 'inline.xsd';
  const schemaXml =
    reference.inlineSchemaXml || (reference.filePath && fs.existsSync(reference.filePath) ? readSchemaFile(reference.filePath) : undefined);
  if (!schemaXml) {
    throw new Error(`Schema file was not found: ${filePath}`);
  }
  const dependencies = await resolveSchemaDependencies(
    schemaXml,
    filePath,
    async (dependencyPath) => (fs.existsSync(dependencyPath) ? readSchemaFile(dependencyPath) : undefined),
    (currentFile, location) => path.resolve(path.dirname(currentFile), location)
  );
  return new SchemaParser().parseWithImports(schemaXml, filePath, dependencies, reference.rootName);
}

function readSchemaFile(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.from(buffer);
    for (let index = 0; index < swapped.length - 1; index += 2) {
      [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
    }
    return swapped.toString('utf16le').replace(/^\uFEFF/, '');
  }
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function referenceKey(reference?: WorkerSchemaReference): string | undefined {
  return reference
    ? JSON.stringify({
        filePath: reference.filePath || '',
        rootName: reference.rootName || '',
        inlineSchemaXml: reference.inlineSchemaXml || '',
      })
    : undefined;
}

export async function compileHostRequest(request: CompileHostRequest, compiler: XsltCompiler): Promise<CompileResult> {
  const sourceSchema = reviveSchema(request.sourceSchema) || (await loadSchema(request.sourceSchemaReference));
  const sameSchema =
    referenceKey(request.sourceSchemaReference) !== undefined &&
    referenceKey(request.sourceSchemaReference) === referenceKey(request.targetSchemaReference);
  const targetSchema = sameSchema ? sourceSchema : reviveSchema(request.targetSchema) || (await loadSchema(request.targetSchemaReference));
  return compiler.compile(request.map, sourceSchema, targetSchema);
}
