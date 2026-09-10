import * as fs from 'fs';
import * as path from 'path';
import { XMLValidator } from 'fast-xml-parser';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { resolveSchemaDependencies } from '../src/schema/schemaDependencyResolver';
import { SchemaParser } from '../src/schema/schemaParser';

const fixtures = path.join(__dirname, 'fixtures', 'bts2020testManualTests');

function filesUnder(directory: string, extension: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory()
            ? filesUnder(fullPath, extension)
            : entry.name.toLowerCase().endsWith(extension) ? [fullPath] : [];
    });
}

function readText(filePath: string): string {
    const bytes = fs.readFileSync(filePath);
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return bytes.subarray(2).toString('utf16le');
    }
    return bytes.toString('utf8').replace(/^\uFEFF/, '');
}

const schemaPaths = filesUnder(fixtures, '.xsd');

function resolveSchemaPath(containingPath: string, location: string): string {
    const localPath = path.resolve(path.dirname(containingPath), location);
    if (fs.existsSync(localPath)) {
        return localPath;
    }

    const parts = location.split('.');
    const schemaName = `${parts.pop()}.xsd`;
    const projectName = parts.join('.').toLowerCase();
    const candidates = schemaPaths.filter(candidate =>
        path.basename(candidate).toLowerCase() === schemaName.toLowerCase()
    );
    return candidates.find(candidate =>
        path.basename(path.dirname(candidate)).toLowerCase() === projectName
    ) || candidates[0] || localPath;
}

async function loadSchema(
    btmPath: string,
    reference: { location: string; rootName?: string }
) {
    const schemaPath = resolveSchemaPath(btmPath, reference.location);
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema '${reference.location}' was not found for ${btmPath}`);
    }
    const schemaXml = readText(schemaPath);
    const dependencies = await resolveSchemaDependencies(
        schemaXml,
        schemaPath,
        async dependencyPath =>
            fs.existsSync(dependencyPath) ? readText(dependencyPath) : undefined,
        resolveSchemaPath
    );
    return new SchemaParser().parseWithImports(
        schemaXml,
        schemaPath,
        dependencies,
        reference.rootName
    );
}

const maps = filesUnder(fixtures, '.btm').map(mapPath => [
    path.relative(fixtures, mapPath),
    mapPath
] as const);

const expectedDiagnostics: Array<[RegExp, RegExp]> = [
    [/CSDMain143844[\\/]DateMap2Input\.btm$/, /Date requires 0 input\(s\), but received 2/],
    [/CSDMain143844[\\/]TimeMap2Input\.btm$/, /Time requires 0 input\(s\), but received 2/],
    [/CSDMain143844[\\/]DateTimeMap2Input\.btm$/, /Date and Time requires 0 input\(s\), but received 2/],
    [
        /FineFoods\.Customers\.C1702[\\/]Map C1702Order To FineFoods Order\.btm$/,
        /Unknown functoid: 8936/
    ]
];

describe('bts2020test Mapper manual maps', () => {
    test('imports all Mapper ManualTests maps from bts2020test', () => {
        expect(maps).toHaveLength(13);
    });

    test.each(maps)('%s has expected compiler behavior', async (_relativePath, mapPath) => {
        const map = new BtmSerializer().deserialize(readText(mapPath));
        const sourceSchema = await loadSchema(mapPath, map.sourceSchema);
        const targetSchema = await loadSchema(mapPath, map.targetSchema);

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);
        const expectedDiagnostic = expectedDiagnostics.find(([mapPattern]) =>
            mapPattern.test(_relativePath)
        )?.[1];

        expect(map.pages.length).toBeGreaterThan(0);
        if (expectedDiagnostic) {
            expect(result.success).toBe(false);
            expect(result.errors.map(error => error.message).join('\n'))
                .toMatch(expectedDiagnostic);
            return;
        }

        expect(result.errors).toEqual([]);
        expect(result.success).toBe(true);
        expect(result.xslt).toBeDefined();
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
    });
});
