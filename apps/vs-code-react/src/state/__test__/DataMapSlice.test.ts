import type { FunctionData } from '@microsoft/logic-apps-data-mapper';
import type { DataMapSchema, MapDefinitionEntry, MapMetadata } from '@microsoft/logic-apps-shared';
import { describe, expect, it } from 'vitest';
import dataMapReducer, {
  changeArmToken,
  changeCustomXsltPathList,
  changeDataMapMetadata,
  changeFetchedFunctions,
  changeLoadingMethod,
  changeMapDefinition,
  changeRuntimePort,
  changeSchemaList,
  changeSourceSchema,
  changeSourceSchemaFilename,
  changeTargetSchema,
  changeTargetSchemaFilename,
  changeUseExpandedFunctionCards,
  changeXsltContent,
  changeXsltFilename,
} from '../DataMapSlice';

describe('DataMapSlice', () => {
  function createSchema(name: string): DataMapSchema {
    return {
      name,
      schemaTreeRoot: {
        children: [],
        key: `${name}-root`,
        name: 'root',
        properties: '',
        qName: 'root',
        type: 'String',
      },
      targetNamespace: 'http://schemas.contoso.com',
      type: 'XML',
    };
  }

  it('returns the initial data map state', () => {
    expect(dataMapReducer(undefined, { type: 'unknown' })).toEqual({
      loadingMethod: 'file',
      useExpandedFunctionCards: true,
      xsltContent: '',
      xsltFilename: '',
    });
  });

  it('updates scalar reducer fields', () => {
    let state = dataMapReducer(undefined, changeRuntimePort('7071'));
    state = dataMapReducer(state, changeArmToken('token'));
    state = dataMapReducer(state, changeLoadingMethod('arm'));
    state = dataMapReducer(state, changeXsltFilename('map.xslt'));
    state = dataMapReducer(state, changeXsltContent('<xsl:stylesheet />'));
    state = dataMapReducer(state, changeSourceSchemaFilename('source.xsd'));
    state = dataMapReducer(state, changeTargetSchemaFilename('target.xsd'));
    state = dataMapReducer(state, changeSchemaList(['source.xsd', 'target.xsd']));
    state = dataMapReducer(state, changeCustomXsltPathList(['custom.xslt']));
    state = dataMapReducer(state, changeUseExpandedFunctionCards(false));

    expect(state.runtimePort).toBe('7071');
    expect(state.armToken).toBe('token');
    expect(state.loadingMethod).toBe('arm');
    expect(state.xsltFilename).toBe('map.xslt');
    expect(state.xsltContent).toBe('<xsl:stylesheet />');
    expect(state.sourceSchemaFilename).toBe('source.xsd');
    expect(state.targetSchemaFilename).toBe('target.xsd');
    expect(state.schemaFileList).toEqual(['source.xsd', 'target.xsd']);
    expect(state.customXsltPathsList).toEqual(['custom.xslt']);
    expect(state.useExpandedFunctionCards).toBe(false);
  });

  it('updates map definitions, metadata, schemas, and fetched functions', () => {
    const mapDefinition: MapDefinitionEntry = {
      Output: {
        Name: '/Root/Name',
      },
    };
    const dataMapMetadata: MapMetadata = {
      functionNodes: [
        {
          connectionShorthand: 'concat(name)',
          connections: [{ inputOrder: 0, name: 'Name' }],
          functionKey: 'concat',
          position: { x: 1, y: 2 },
          reactFlowGuid: 'function-1',
        },
      ],
    };
    const sourceSchema = createSchema('source');
    const targetSchema = createSchema('target');
    const fetchedFunctions: FunctionData[] = [
      {
        category: 'String',
        description: 'Concatenates values.',
        displayName: 'Concat',
        functionName: 'concat',
        inputs: [
          {
            allowCustomInput: true,
            allowedTypes: ['String'],
            isOptional: false,
            name: 'text',
            placeHolder: 'text',
          },
        ],
        key: 'concat',
        maxNumberOfInputs: -1,
        outputValueType: 'String',
      },
    ];

    let state = dataMapReducer(undefined, changeMapDefinition(mapDefinition));
    state = dataMapReducer(state, changeDataMapMetadata(dataMapMetadata));
    state = dataMapReducer(state, changeSourceSchema(sourceSchema));
    state = dataMapReducer(state, changeTargetSchema(targetSchema));
    state = dataMapReducer(state, changeFetchedFunctions(fetchedFunctions));

    expect(state.mapDefinition).toBe(mapDefinition);
    expect(state.dataMapMetadata).toBe(dataMapMetadata);
    expect(state.sourceSchema).toBe(sourceSchema);
    expect(state.targetSchema).toBe(targetSchema);
    expect(state.fetchedFunctions).toBe(fetchedFunctions);
  });

  it('clears data map metadata when the payload is undefined', () => {
    const stateWithMetadata = dataMapReducer(
      undefined,
      changeDataMapMetadata({
        functionNodes: [],
      })
    );

    const state = dataMapReducer(stateWithMetadata, changeDataMapMetadata(undefined));

    expect(state.dataMapMetadata).toBeUndefined();
  });
});
