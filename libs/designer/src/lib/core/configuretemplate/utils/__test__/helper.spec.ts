import { getParameterReferencesFromValue } from '../helper';
import { expect, describe, test } from 'vitest';

describe('ConfigureTemplateHelper', () => {
    describe('getParameterReferencesFromValue', () => {
        test('should return parameter name when value contains single parameter token', () => {
            const result = getParameterReferencesFromValue([{ id: '1', type: 'token', token: { tokenType: 'parameter', name: 'test' } as any, value: "parameters('test')" }]);
            expect(result).toEqual(['test']);
        });

        test('should return empty array when value doesnt contain any parameter references', () => {
            let result = getParameterReferencesFromValue([{ id: '1', type: 'literal', value: 'test' }]);
            expect(result.length).toBe(0);

            result = getParameterReferencesFromValue([
                { id: '1', type: 'token', token: { tokenType: 'outputs' } as any, value: 'triggerBody()' },
                { id: '2', type: 'literal', value: 'hello' },
                { id: '3', type: 'token', token: { tokenType: 'outputs', name: 'test' } as any, value: "triggerBody()['test']" }
            ]);
            expect(result.length).toBe(0);

            result = getParameterReferencesFromValue([{ id: '1', type: 'token', token: { tokenType: 'fx', expression: {
                type: 'Function',
                name: 'concat',
                arguments: [
                    { type: 'StringLiteral', value: 'abc' },
                    { type: 'Function', name: 'triggerBody', arguments: [] }
                ]
            }} as any, value: "concat('abc', triggerBody())" }]);
            expect(result.length).toBe(0);
        });

        test('should return all parameter references for complex fx tokens in value', () => {
            let result = getParameterReferencesFromValue([{ id: '1', type: 'token', token: { tokenType: 'fx', expression: {
                type: 'Function',
                name: 'concat',
                arguments: [
                    { type: 'StringLiteral', value: 'abc' },
                    { type: 'Function', name: 'triggerBody', arguments: [] },
                    { type: 'Function', name: 'parameters', arguments: [{ type: 'StringLiteral', value: 'param1' }] }
                ]
            }} as any, value: "concat('abc', triggerBody(), parameters('param1))" }]);
            expect(result).toEqual(['param1']);

            result = getParameterReferencesFromValue([
                { id: '1', type: 'token', token: { tokenType: 'fx', expression: {
                    type: 'Function',
                    name: 'concat',
                    arguments: [
                        { type: 'StringLiteral', value: 'abc' },
                        { type: 'Function', name: 'triggerBody', arguments: [] },
                        { type: 'Function', name: 'parameters', arguments: [{ type: 'StringLiteral', value: 'param1' }] }
                    ]
                }} as any, value: "concat('abc', triggerBody(), parameters('param1))" },
                { id: '2', type: 'token', token: { tokenType: 'parameter', name: 'param2' } as any, value: "parameters('param2')" }
            
            ]);
            expect(result).toEqual(expect.arrayContaining(['param1', 'param2']));
        });
    });
});