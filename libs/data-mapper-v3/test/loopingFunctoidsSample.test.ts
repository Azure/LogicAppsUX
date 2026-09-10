import * as fs from 'fs';
import * as path from 'path';
import { XMLValidator } from 'fast-xml-parser';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { SchemaParser } from '../src/schema/schemaParser';

describe('Looping functoids sample', () => {
    const sampleDirectory = path.join(__dirname, '..', 'samples', 'LoopingFunctoids');

    test('loads and compiles every looping scenario', () => {
        const map = new BtmSerializer().deserialize(
            fs.readFileSync(path.join(sampleDirectory, 'LoopingFunctoids.btm'), 'utf8')
        );
        const schemaParser = new SchemaParser();
        const sourceSchema = schemaParser.parse(
            fs.readFileSync(path.join(sampleDirectory, 'LoopingSource.xsd'), 'utf8'),
            'LoopingSource.xsd'
        );
        const targetSchema = schemaParser.parse(
            fs.readFileSync(path.join(sampleDirectory, 'LoopingTarget.xsd'), 'utf8'),
            'LoopingTarget.xsd'
        );

        expect(map.pages.map(page => page.name)).toEqual([
            'Looping and Iteration',
            'Existence Looping',
            'Table Looping and Extractor'
        ]);
        expect(map.pages.flatMap(page => page.functoids.map(functoid => functoid.functoidId)))
            .toEqual(expect.arrayContaining([424, 474, 801, 703, 704]));

        const tableLooping = map.pages[2].functoids.find(functoid => functoid.functoidId === 703);
        expect(tableLooping?.tableLooping).toEqual({
            columns: 1,
            gated: false,
            rows: [
                ['{33333333-3333-3333-3333-333333333333}'],
                ['{44444444-4444-4444-4444-444444444444}']
            ]
        });

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);

        expect(result.success).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
        expect(result.xslt?.match(/<xsl:for-each/g)).toHaveLength(4);
        expect(result.xslt).toContain('position()');
        expect(result.xslt?.match(/<ns0:LoopLine>/g)).toHaveLength(1);
        expect(result.xslt?.match(/<ns0:ExistingLine>/g)).toHaveLength(1);
        expect(result.xslt?.match(/<ns0:TableLine>/g)).toHaveLength(2);
        expect(result.xslt).toContain("select=\"'Fixed table row'\"");
    });
});
