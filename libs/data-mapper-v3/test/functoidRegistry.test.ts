/**
 * BizTalk Data Mapper - Unit Tests for Functoid Registry
 * Uses official BizTalk Server FIDs
 */

import { FunctoidRegistry } from '../src/functoids/functoidRegistry';
import { FunctoidCategory } from '../src/model';

describe('FunctoidRegistry', () => {
    let registry: FunctoidRegistry;

    beforeEach(() => {
        registry = FunctoidRegistry.getInstance();
    });

    test('should return all registered functoids', () => {
        const all = registry.getAllFunctoids();
        expect(all.length).toBeGreaterThan(20);
    });

    test('should have string functoids with correct BizTalk FIDs', () => {
        const stringFunctoids = registry.getFunctoidsByCategory(FunctoidCategory.String);
        expect(stringFunctoids.length).toBeGreaterThanOrEqual(10);
        expect(stringFunctoids.find(f => f.name === 'String Concatenate')).toBeDefined();
        expect(stringFunctoids.find(f => f.name === 'Uppercase')).toBeDefined();
        expect(stringFunctoids.find(f => f.name === 'Lowercase')).toBeDefined();
        expect(stringFunctoids.find(f => f.name === 'String Find')).toBeDefined();
    });

    test('should have math functoids', () => {
        const mathFunctoids = registry.getFunctoidsByCategory(FunctoidCategory.Math);
        expect(mathFunctoids.length).toBeGreaterThanOrEqual(8);
        expect(mathFunctoids.find(f => f.name === 'Addition')).toBeDefined();
        expect(mathFunctoids.find(f => f.name === 'Division')).toBeDefined();
    });

    test('should have logical functoids', () => {
        const logicalFunctoids = registry.getFunctoidsByCategory(FunctoidCategory.Logical);
        expect(logicalFunctoids.length).toBeGreaterThanOrEqual(8);
        expect(logicalFunctoids.find(f => f.name === 'Equal')).toBeDefined();
        expect(logicalFunctoids.find(f => f.name === 'Logical AND')).toBeDefined();
    });

    test('should generate correct XSLT for string concatenate (FID 107)', () => {
        const concat = registry.getFunctoid(107);
        expect(concat).toBeDefined();
        const xslt = concat!.generateXslt(['$input1', '$input2'], []);
        expect(xslt).toBe("concat($input1, $input2)");
    });

    test('should preserve a single String Concatenate input for legacy compatibility', () => {
        const concat = registry.getFunctoid(107);
        expect(concat?.minInputs).toBe(1);
        expect(concat?.generateXslt(['$input1'], [])).toBe('$input1');
    });

    test('should generate correct XSLT for addition (FID 118)', () => {
        const add = registry.getFunctoid(118);
        expect(add).toBeDefined();
        const xslt = add!.generateXslt(['price', 'tax'], []);
        expect(xslt).toBe('price + tax');
    });

    test('should generate correct XSLT for logical equal (FID 315)', () => {
        const eq = registry.getFunctoid(315);
        expect(eq).toBeDefined();
        const xslt = eq!.generateXslt(['status', "'active'"], []);
        expect(xslt).toBe("status = 'active'");
    });

    test('should get functoid by BizTalk FID', () => {
        const func = registry.getFunctoid(105);
        expect(func).toBeDefined();
        expect(func!.name).toBe('String Size');
        expect(func!.generateXslt(['$name'], [])).toBe('string-length($name)');
    });

    test('should have correct FIDs for key functoids', () => {
        // Verify the actual BizTalk FID assignments
        expect(registry.getFunctoid(260)!.name).toBe('Scripting');
        expect(registry.getFunctoid(424)!.name).toBe('Looping');
        expect(registry.getFunctoid(109)!.name).toBe('String Right Trim');
        expect(registry.getFunctoid(108)!.name).toBe('String Left Trim');
        expect(registry.getFunctoid(322)!.name).toBe('Record Count');
        expect(registry.getFunctoid(524)!.name).toBe('Database Lookup');
    });

    test('should return undefined for unknown ID', () => {
        expect(registry.getFunctoid(9999)).toBeUndefined();
    });
});
