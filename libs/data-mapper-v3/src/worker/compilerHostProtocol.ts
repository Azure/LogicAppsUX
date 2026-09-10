import { CompileResult, XsltCompiler } from '../compiler/xsltCompiler';
import { MapDocument } from '../model';
import { SchemaTree } from '../model/schemaModel';

export interface CompileHostRequest {
    id: number;
    map: MapDocument;
    sourceSchema?: SchemaTree;
    targetSchema?: SchemaTree;
}

function reviveSchema(schema?: SchemaTree): SchemaTree | undefined {
    if (!schema) { return undefined; }
    return {
        ...schema,
        namespaces: { ...schema.namespaces }
    };
}

export function compileHostRequest(
    request: CompileHostRequest,
    compiler: XsltCompiler
): CompileResult {
    return compiler.compile(
        request.map,
        reviveSchema(request.sourceSchema),
        reviveSchema(request.targetSchema)
    );
}
