/**
 * BizTalk Data Mapper - Functoid category integration tests.
 *
 * Each fixture BTM maps FunctoidSource.xsd -> FunctoidDest.xsd exercising a distinct
 * functoid category. These tests deserialize the map, parse the referenced schemas and
 * compile to XSLT, asserting the compile succeeds, the generated XSLT is well-formed XML
 * and contains the expected functoid signatures. This locks in the elementFormDefault
 * namespace fix and the Scientific/Conversion/Advanced functoid support.
 */

import * as fs from 'fs';
import * as path from 'path';
import { XMLValidator } from 'fast-xml-parser';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { SchemaParser } from '../src/schema/schemaParser';
import { XsltCompiler } from '../src/compiler/xsltCompiler';

const fixtures = path.join(__dirname, 'fixtures', 'functoids');

// XSD fixtures may be stored as UTF-16; detect the BOM and decode accordingly.
function read(file: string): string {
    const buf = fs.readFileSync(path.join(fixtures, file));
    if (buf[0] === 0xFF && buf[1] === 0xFE) { return buf.toString('utf16le'); }
    return buf.toString('utf8');
}

interface Case { btm: string; expect: string[]; }

const cases: Case[] = [
    { btm: 'Functoid_Math', expect: ['userCSharp:MathAdd', 'userCSharp:MathSubtract', 'userCSharp:MathMultiply', 'userCSharp:MathDivide', 'userCSharp:MathMod'] },
    { btm: 'Functoid_Logical', expect: ['<ns0:IsGreater', '<ns0:AreEqual', '<ns0:BothPositive', '<ns0:Picked'] },
    { btm: 'Functoid_Cumulative', expect: ['<ns0:Total', '<ns0:Average'] },
    { btm: 'Functoid_String', expect: ['concat(', 'translate('] },
    { btm: 'Functoid_Scientific', expect: ['userCSharp:MathSin', 'userCSharp:MathPow', 'userCSharp:MathLogn', 'msxsl:script'] },
    { btm: 'Functoid_Conversion', expect: ['userCSharp:ConvertChr', 'userCSharp:ConvertAsc', 'userCSharp:ConvertHex', 'userCSharp:ConvertOct'] },
    { btm: 'Functoid_DateTime', expect: ['userCSharp:DateAddDays'] },
    { btm: 'Functoid_Advanced', expect: ['count(', 'xsl:for-each'] },
];

describe('Functoid category compilation', () => {
    const serializer = new BtmSerializer();
    const parser = new SchemaParser();

    test.each(cases)('$btm compiles to well-formed XSLT', ({ btm, expect: expected }) => {
        const map = serializer.deserialize(read(btm + '.btm'));
        const src = parser.parse(read(map.sourceSchema.location.replace(/^\.[\\/]?/, '')), 'src');
        const tgt = parser.parse(read(map.targetSchema.location.replace(/^\.[\\/]?/, '')), 'tgt');

        const result = new XsltCompiler().compile(map, src, tgt);

        expect(result.success).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.xslt).toBeDefined();
        // Generated XSLT must itself be well-formed XML.
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
        for (const fragment of expected) {
            expect(result.xslt).toContain(fragment);
        }
    });
});
