import * as path from 'path';
import { parseOrderedXsd } from './orderedXsdParser';

export type SchemaReader = (schemaPath: string) => Promise<string | undefined>;
export type SchemaPathResolver = (containingSchemaPath: string, schemaLocation: string) => string;

export async function resolveSchemaDependencies(
    schemaXml: string,
    schemaPath: string,
    readSchema: SchemaReader,
    resolvePath: SchemaPathResolver,
    visited: Set<string> = new Set(),
    effectiveTargetNamespace?: string
): Promise<Map<string, any>> {
    const importedSchemas = new Map<string, any>();
    visited.add(path.resolve(schemaPath).toLowerCase());
    const parsed = parseOrderedXsd(schemaXml);
    const schema = findSchemaRoot(parsed);
    if (!schema) {
        throw new Error(`Schema dependency '${schemaPath}' has no schema root element`);
    }
    if (!schema['@_targetNamespace'] && effectiveTargetNamespace !== undefined) {
        schema['@_targetNamespace'] = effectiveTargetNamespace;
    }

    const getArray = (value: any): any[] =>
        value ? (Array.isArray(value) ? value : [value]) : [];
    const getSchemaChildren = (localName: string): any[] =>
        Object.entries(schema)
            .filter(([name]) => name.split(':').pop() === localName)
            .flatMap(([, value]) => getArray(value));
    const dependencies = [
        ...getSchemaChildren('import').map(item => ({ item, include: false })),
        ...getSchemaChildren('include').map(item => ({ item, include: true }))
    ];

    for (const dependency of dependencies) {
        const schemaLocation = dependency.item?.['@_schemaLocation'];
        if (!schemaLocation) {
            throw new Error(
                `Schema dependency in '${schemaPath}' does not specify schemaLocation`
            );
        }
        const dependencyPath = resolvePath(schemaPath, schemaLocation);
        const normalizedDependencyPath = path.resolve(dependencyPath).toLowerCase();
        if (visited.has(normalizedDependencyPath)) { continue; }

        const content = await readSchema(dependencyPath);
        if (!content) {
            throw new Error(
                `Could not resolve schema dependency '${schemaLocation}' from '${schemaPath}'`
            );
        }
        const dependencySchema = findSchemaRoot(parseOrderedXsd(content));
        if (!dependencySchema) {
            throw new Error(`Schema dependency '${dependencyPath}' has no schema root element`);
        }
        if (dependency.include && !dependencySchema['@_targetNamespace']) {
            dependencySchema['@_targetNamespace'] = schema['@_targetNamespace'] || '';
        }

        visited.add(normalizedDependencyPath);
        importedSchemas.set(dependencyPath, dependencySchema);
        const nested = await resolveSchemaDependencies(
            content,
            dependencyPath,
            readSchema,
            resolvePath,
            visited,
            dependency.include
                ? dependencySchema['@_targetNamespace']
                : undefined
        );
        for (const [nestedPath, nestedSchema] of nested) {
            importedSchemas.set(nestedPath, nestedSchema);
        }
    }

    return importedSchemas;
}

function findSchemaRoot(parsed: any): any | undefined {
    if (!parsed || typeof parsed !== 'object') { return undefined; }
    return Object.entries(parsed).find(([name]) => name.split(':').pop() === 'schema')?.[1];
}
