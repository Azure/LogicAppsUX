import { simpleMockSchema } from '../__mocks__';
import type { Connection } from '../models/Connection';
import type { Schema } from '../models/Schema';
import { convertToMapDefinition } from '../utils/DataMap.Utils';
import { convertSchemaToSchemaExtended } from '../utils/Schema.Utils';

describe('convertToMapDefinition', () => {
  const schema: Schema = simpleMockSchema;
  const extendedSchema = convertSchemaToSchemaExtended(schema);

  it('Test no connections', () => {
    const connections: { [key: string]: Connection } = {};

    const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
    expect(mapDefinition).toEqual('$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\n');
  });

  it('Test 1 connection', () => {
    const connections: { [key: string]: Connection } = {
      '/ns0:CBRInputRecord/Identity/UserID': {
        value: '/ns0:CBRInputRecord/Identity/UserID',
        reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/UserID',
        reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/UserID',
      },
    };

    const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
    expect(mapDefinition).toEqual(
      '$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    UserID: /ns0:CBRInputRecord/Identity/UserID'
    );
  });

  it('Test deep connection', () => {
    const connections: { [key: string]: Connection } = {
      '/ns0:CBRInputRecord/Identity/Name/FirstName': {
        value: '/ns0:CBRInputRecord/Identity/Name/FirstName',
        reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/Name/FirstName',
        reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/Name/FirstName',
      },
    };

    const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
    expect(mapDefinition).toEqual(
      '$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    Name:\n      FirstName: /ns0:CBRInputRecord/Identity/Name/FirstName'
    );
  });

  it('Test 2 connections', () => {
    const connections: { [key: string]: Connection } = {
      '/ns0:CBRInputRecord/Identity/Name/FirstName': {
        value: '/ns0:CBRInputRecord/Identity/Name/FirstName',
        reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/Name/FirstName',
        reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/Name/FirstName',
      },
      '/ns0:CBRInputRecord/Identity/Name/LastName': {
        value: '/ns0:CBRInputRecord/Identity/Name/LastName',
        reactFlowSource: 'input-/ns0:CBRInputRecord/Identity/Name/LastName',
        reactFlowDestination: 'output-/ns0:CBRInputRecord/Identity/Name/LastName',
      },
    };

    const mapDefinition = convertToMapDefinition(connections, extendedSchema, extendedSchema);
    expect(mapDefinition).toEqual(
      '$sourceSchema: CBRInputSchema.xsd\n$targetSchema: CBRInputSchema.xsd\nns0:CBRInputRecord:\n  Identity:\n    Name:\n      LastName: /ns0:CBRInputRecord/Identity/Name/LastName\n      FirstName: /ns0:CBRInputRecord/Identity/Name/FirstName'
    );
  });

  // TODO Tests for loops

  // TODO Tests for conditionals
});
