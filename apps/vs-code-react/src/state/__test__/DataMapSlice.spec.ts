import { describe, expect, it } from 'vitest';
import type { FunctionData } from '@microsoft/logic-apps-data-mapper';
import type { DataMapSchema, MapDefinitionEntry, MapMetadata } from '@microsoft/logic-apps-shared';
import reducer, {
  initialState,
  changeRuntimePort,
  changeArmToken,
  changeLoadingMethod,
  changeXsltFilename,
  changeXsltContent,
  changeMapDefinition,
  changeDataMapMetadata,
  changeSourceSchemaFilename,
  changeSourceSchema,
  changeTargetSchemaFilename,
  changeTargetSchema,
  changeSchemaList,
  changeCustomXsltPathList,
  changeFetchedFunctions,
  changeUseExpandedFunctionCards,
} from '../DataMapSlice';
import type { DataMapState } from '../DataMapSlice';

describe('dataMap slice reducers', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
        loadingMethod: 'file',
        xsltFilename: '',
        xsltContent: '',
        useExpandedFunctionCards: true,
      });
    });
  });

  describe('changeRuntimePort', () => {
    it('should set runtime port', () => {
      const port = '7071';
      const action = changeRuntimePort(port);
      const newState = reducer(initialState, action);

      expect(newState.runtimePort).toBe(port);
    });

    it('should update existing runtime port', () => {
      const stateWithPort: DataMapState = {
        ...initialState,
        runtimePort: '8080',
      };

      const newPort = '9090';
      const action = changeRuntimePort(newPort);
      const newState = reducer(stateWithPort, action);

      expect(newState.runtimePort).toBe(newPort);
    });

    it('should handle empty string port', () => {
      const action = changeRuntimePort('');
      const newState = reducer(initialState, action);

      expect(newState.runtimePort).toBe('');
    });
  });

  describe('changeArmToken', () => {
    it('should set ARM token', () => {
      const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...';
      const action = changeArmToken(token);
      const newState = reducer(initialState, action);

      expect(newState.armToken).toBe(token);
    });

    it('should update existing ARM token', () => {
      const stateWithToken: DataMapState = {
        ...initialState,
        armToken: 'old-token',
      };

      const newToken = 'new-token';
      const action = changeArmToken(newToken);
      const newState = reducer(stateWithToken, action);

      expect(newState.armToken).toBe(newToken);
    });

    it('should handle empty string token', () => {
      const action = changeArmToken('');
      const newState = reducer(initialState, action);

      expect(newState.armToken).toBe('');
    });
  });

  describe('changeLoadingMethod', () => {
    it('should change loading method to arm', () => {
      const action = changeLoadingMethod('arm');
      const newState = reducer(initialState, action);

      expect(newState.loadingMethod).toBe('arm');
    });

    it('should change loading method to file', () => {
      const stateWithArmMethod: DataMapState = {
        ...initialState,
        loadingMethod: 'arm',
      };

      const action = changeLoadingMethod('file');
      const newState = reducer(stateWithArmMethod, action);

      expect(newState.loadingMethod).toBe('file');
    });

    it('should maintain same loading method when set to same value', () => {
      const action = changeLoadingMethod('file');
      const newState = reducer(initialState, action);

      expect(newState.loadingMethod).toBe('file');
    });
  });

  describe('changeXsltFilename', () => {
    it('should set XSLT filename', () => {
      const filename = 'transform.xslt';
      const action = changeXsltFilename(filename);
      const newState = reducer(initialState, action);

      expect(newState.xsltFilename).toBe(filename);
    });

    it('should update existing XSLT filename', () => {
      const stateWithFilename: DataMapState = {
        ...initialState,
        xsltFilename: 'old-transform.xslt',
      };

      const newFilename = 'new-transform.xslt';
      const action = changeXsltFilename(newFilename);
      const newState = reducer(stateWithFilename, action);

      expect(newState.xsltFilename).toBe(newFilename);
    });

    it('should handle filename with path', () => {
      const filename = '/path/to/transforms/complex-transform.xslt';
      const action = changeXsltFilename(filename);
      const newState = reducer(initialState, action);

      expect(newState.xsltFilename).toBe(filename);
    });
  });

  describe('changeXsltContent', () => {
    it('should set XSLT content', () => {
      const content =
        '<?xml version="1.0"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
      const action = changeXsltContent(content);
      const newState = reducer(initialState, action);

      expect(newState.xsltContent).toBe(content);
    });

    it('should update existing XSLT content', () => {
      const stateWithContent: DataMapState = {
        ...initialState,
        xsltContent: 'old content',
      };

      const newContent = 'new XSLT content';
      const action = changeXsltContent(newContent);
      const newState = reducer(stateWithContent, action);

      expect(newState.xsltContent).toBe(newContent);
    });

    it('should handle empty XSLT content', () => {
      const action = changeXsltContent('');
      const newState = reducer(initialState, action);

      expect(newState.xsltContent).toBe('');
    });

    it('should handle large XSLT content', () => {
      const largeContent = 'a'.repeat(10000);
      const action = changeXsltContent(largeContent);
      const newState = reducer(initialState, action);

      expect(newState.xsltContent).toBe(largeContent);
      expect(newState.xsltContent).toHaveLength(10000);
    });
  });

  describe('changeMapDefinition', () => {
    it('should set map definition', () => {
      const mapDefinition: MapDefinitionEntry = {
        '$content-type': 'application/json',
        $content: '{"test": "definition"}',
      } as any;

      const action = changeMapDefinition(mapDefinition);
      const newState = reducer(initialState, action);

      expect(newState.mapDefinition).toBe(mapDefinition);
    });

    it('should update existing map definition', () => {
      const existingDefinition: MapDefinitionEntry = {
        '$content-type': 'application/json',
        $content: '{"old": "definition"}',
      } as any;

      const stateWithDefinition: DataMapState = {
        ...initialState,
        mapDefinition: existingDefinition,
      };

      const newDefinition: MapDefinitionEntry = {
        '$content-type': 'application/xml',
        $content: '<new>definition</new>',
      } as any;

      const action = changeMapDefinition(newDefinition);
      const newState = reducer(stateWithDefinition, action);

      expect(newState.mapDefinition).toBe(newDefinition);
      expect(newState.mapDefinition).not.toBe(existingDefinition);
    });
  });

  describe('changeDataMapMetadata', () => {
    it('should set data map metadata', () => {
      const metadata: MapMetadata = {
        sourceSchema: 'source.xsd',
        targetSchema: 'target.xsd',
      } as any;

      const action = changeDataMapMetadata(metadata);
      const newState = reducer(initialState, action);

      expect(newState.dataMapMetadata).toBe(metadata);
    });

    it('should update existing metadata', () => {
      const existingMetadata: MapMetadata = {
        sourceSchema: 'old-source.xsd',
        targetSchema: 'old-target.xsd',
      } as any;

      const stateWithMetadata: DataMapState = {
        ...initialState,
        dataMapMetadata: existingMetadata,
      };

      const newMetadata: MapMetadata = {
        sourceSchema: 'new-source.xsd',
        targetSchema: 'new-target.xsd',
      } as any;

      const action = changeDataMapMetadata(newMetadata);
      const newState = reducer(stateWithMetadata, action);

      expect(newState.dataMapMetadata).toBe(newMetadata);
      expect(newState.dataMapMetadata).not.toBe(existingMetadata);
    });

    it('should handle undefined metadata', () => {
      const stateWithMetadata: DataMapState = {
        ...initialState,
        dataMapMetadata: { sourceSchema: 'test.xsd' } as any,
      };

      const action = changeDataMapMetadata(undefined);
      const newState = reducer(stateWithMetadata, action);

      expect(newState.dataMapMetadata).toBeUndefined();
    });
  });

  describe('schema filename actions', () => {
    describe('changeSourceSchemaFilename', () => {
      it('should set source schema filename', () => {
        const filename = 'source-schema.xsd';
        const action = changeSourceSchemaFilename(filename);
        const newState = reducer(initialState, action);

        expect(newState.sourceSchemaFilename).toBe(filename);
      });

      it('should update existing source schema filename', () => {
        const stateWithFilename: DataMapState = {
          ...initialState,
          sourceSchemaFilename: 'old-source.xsd',
        };

        const newFilename = 'new-source.xsd';
        const action = changeSourceSchemaFilename(newFilename);
        const newState = reducer(stateWithFilename, action);

        expect(newState.sourceSchemaFilename).toBe(newFilename);
      });
    });

    describe('changeTargetSchemaFilename', () => {
      it('should set target schema filename', () => {
        const filename = 'target-schema.xsd';
        const action = changeTargetSchemaFilename(filename);
        const newState = reducer(initialState, action);

        expect(newState.targetSchemaFilename).toBe(filename);
      });

      it('should update existing target schema filename', () => {
        const stateWithFilename: DataMapState = {
          ...initialState,
          targetSchemaFilename: 'old-target.xsd',
        };

        const newFilename = 'new-target.xsd';
        const action = changeTargetSchemaFilename(newFilename);
        const newState = reducer(stateWithFilename, action);

        expect(newState.targetSchemaFilename).toBe(newFilename);
      });
    });
  });

  describe('schema data actions', () => {
    describe('changeSourceSchema', () => {
      it('should set source schema', () => {
        const schema: DataMapSchema = {
          name: 'SourceSchema',
          type: 'source',
        } as any;

        const action = changeSourceSchema(schema);
        const newState = reducer(initialState, action);

        expect(newState.sourceSchema).toBe(schema);
      });

      it('should update existing source schema', () => {
        const existingSchema: DataMapSchema = {
          name: 'OldSourceSchema',
          type: 'source',
        } as any;

        const stateWithSchema: DataMapState = {
          ...initialState,
          sourceSchema: existingSchema,
        };

        const newSchema: DataMapSchema = {
          name: 'NewSourceSchema',
          type: 'source',
        } as any;

        const action = changeSourceSchema(newSchema);
        const newState = reducer(stateWithSchema, action);

        expect(newState.sourceSchema).toBe(newSchema);
        expect(newState.sourceSchema).not.toBe(existingSchema);
      });
    });

    describe('changeTargetSchema', () => {
      it('should set target schema', () => {
        const schema: DataMapSchema = {
          name: 'TargetSchema',
          type: 'target',
        } as any;

        const action = changeTargetSchema(schema);
        const newState = reducer(initialState, action);

        expect(newState.targetSchema).toBe(schema);
      });

      it('should update existing target schema', () => {
        const existingSchema: DataMapSchema = {
          name: 'OldTargetSchema',
          type: 'target',
        } as any;

        const stateWithSchema: DataMapState = {
          ...initialState,
          targetSchema: existingSchema,
        };

        const newSchema: DataMapSchema = {
          name: 'NewTargetSchema',
          type: 'target',
        } as any;

        const action = changeTargetSchema(newSchema);
        const newState = reducer(stateWithSchema, action);

        expect(newState.targetSchema).toBe(newSchema);
        expect(newState.targetSchema).not.toBe(existingSchema);
      });
    });
  });

  describe('changeSchemaList', () => {
    it('should set schema list', () => {
      const schemaList = ['schema1.xsd', 'schema2.json', 'schema3.xml'];
      const action = changeSchemaList(schemaList);
      const newState = reducer(initialState, action);

      expect(newState.schemaFileList).toBe(schemaList);
      expect(newState.schemaFileList).toHaveLength(3);
    });

    it('should update existing schema list', () => {
      const existingList = ['old1.xsd', 'old2.json'];
      const stateWithList: DataMapState = {
        ...initialState,
        schemaFileList: existingList,
      };

      const newList = ['new1.xsd', 'new2.xml'];
      const action = changeSchemaList(newList);
      const newState = reducer(stateWithList, action);

      expect(newState.schemaFileList).toBe(newList);
      expect(newState.schemaFileList).not.toBe(existingList);
    });

    it('should handle empty schema list', () => {
      const action = changeSchemaList([]);
      const newState = reducer(initialState, action);

      expect(newState.schemaFileList).toEqual([]);
      expect(newState.schemaFileList).toHaveLength(0);
    });
  });

  describe('changeCustomXsltPathList', () => {
    it('should set custom XSLT path list', () => {
      const pathList = ['/path/to/custom1.xslt', '/path/to/custom2.xslt'];
      const action = changeCustomXsltPathList(pathList);
      const newState = reducer(initialState, action);

      expect(newState.customXsltPathsList).toBe(pathList);
      expect(newState.customXsltPathsList).toHaveLength(2);
    });

    it('should update existing custom XSLT path list', () => {
      const existingPaths = ['/old/path1.xslt'];
      const stateWithPaths: DataMapState = {
        ...initialState,
        customXsltPathsList: existingPaths,
      };

      const newPaths = ['/new/path1.xslt', '/new/path2.xslt'];
      const action = changeCustomXsltPathList(newPaths);
      const newState = reducer(stateWithPaths, action);

      expect(newState.customXsltPathsList).toBe(newPaths);
      expect(newState.customXsltPathsList).not.toBe(existingPaths);
    });

    it('should handle empty custom XSLT path list', () => {
      const action = changeCustomXsltPathList([]);
      const newState = reducer(initialState, action);

      expect(newState.customXsltPathsList).toEqual([]);
      expect(newState.customXsltPathsList).toHaveLength(0);
    });
  });

  describe('changeFetchedFunctions', () => {
    it('should set fetched functions', () => {
      const functions: FunctionData[] = [
        { name: 'concat', category: 'string' },
        { name: 'add', category: 'math' },
      ] as any;

      const action = changeFetchedFunctions(functions);
      const newState = reducer(initialState, action);

      expect(newState.fetchedFunctions).toBe(functions);
      expect(newState.fetchedFunctions).toHaveLength(2);
    });

    it('should update existing fetched functions', () => {
      const existingFunctions: FunctionData[] = [{ name: 'old-function', category: 'utility' }] as any;

      const stateWithFunctions: DataMapState = {
        ...initialState,
        fetchedFunctions: existingFunctions,
      };

      const newFunctions: FunctionData[] = [
        { name: 'new-function1', category: 'string' },
        { name: 'new-function2', category: 'math' },
      ] as any;

      const action = changeFetchedFunctions(newFunctions);
      const newState = reducer(stateWithFunctions, action);

      expect(newState.fetchedFunctions).toBe(newFunctions);
      expect(newState.fetchedFunctions).not.toBe(existingFunctions);
    });

    it('should handle empty functions array', () => {
      const action = changeFetchedFunctions([]);
      const newState = reducer(initialState, action);

      expect(newState.fetchedFunctions).toEqual([]);
      expect(newState.fetchedFunctions).toHaveLength(0);
    });
  });

  describe('changeUseExpandedFunctionCards', () => {
    it('should set use expanded function cards to false', () => {
      const action = changeUseExpandedFunctionCards(false);
      const newState = reducer(initialState, action);

      expect(newState.useExpandedFunctionCards).toBe(false);
    });

    it('should set use expanded function cards to true', () => {
      const stateWithCollapsed: DataMapState = {
        ...initialState,
        useExpandedFunctionCards: false,
      };

      const action = changeUseExpandedFunctionCards(true);
      const newState = reducer(stateWithCollapsed, action);

      expect(newState.useExpandedFunctionCards).toBe(true);
    });

    it('should toggle expanded function cards state', () => {
      let state = initialState;

      // Initial state is true
      expect(state.useExpandedFunctionCards).toBe(true);

      // Toggle to false
      state = reducer(state, changeUseExpandedFunctionCards(false));
      expect(state.useExpandedFunctionCards).toBe(false);

      // Toggle back to true
      state = reducer(state, changeUseExpandedFunctionCards(true));
      expect(state.useExpandedFunctionCards).toBe(true);
    });
  });

  describe('complex state management', () => {
    it('should handle multiple state changes in sequence', () => {
      let state = initialState;

      // Set runtime configuration
      state = reducer(state, changeRuntimePort('7071'));
      state = reducer(state, changeArmToken('token123'));
      state = reducer(state, changeLoadingMethod('arm'));

      expect(state.runtimePort).toBe('7071');
      expect(state.armToken).toBe('token123');
      expect(state.loadingMethod).toBe('arm');

      // Set schema information
      state = reducer(state, changeSourceSchemaFilename('source.xsd'));
      state = reducer(state, changeTargetSchemaFilename('target.xsd'));
      state = reducer(state, changeSchemaList(['source.xsd', 'target.xsd']));

      expect(state.sourceSchemaFilename).toBe('source.xsd');
      expect(state.targetSchemaFilename).toBe('target.xsd');
      expect(state.schemaFileList).toEqual(['source.xsd', 'target.xsd']);

      // Set XSLT information
      state = reducer(state, changeXsltFilename('transform.xslt'));
      state = reducer(state, changeXsltContent('<xsl:stylesheet></xsl:stylesheet>'));

      expect(state.xsltFilename).toBe('transform.xslt');
      expect(state.xsltContent).toBe('<xsl:stylesheet></xsl:stylesheet>');

      // Set function configuration
      state = reducer(state, changeUseExpandedFunctionCards(false));
      state = reducer(state, changeFetchedFunctions([{ name: 'test-func' } as any]));

      expect(state.useExpandedFunctionCards).toBe(false);
      expect(state.fetchedFunctions).toHaveLength(1);
    });

    it('should maintain immutability', () => {
      const originalState = initialState;
      const action = changeRuntimePort('8080');
      const newState = reducer(originalState, action);

      // Original state should not be modified
      expect(originalState.runtimePort).toBeUndefined();
      expect(newState.runtimePort).toBe('8080');
      expect(newState).not.toBe(originalState);
    });

    it('should preserve unrelated state when updating specific properties', () => {
      const complexState: DataMapState = {
        runtimePort: '7071',
        armToken: 'token123',
        loadingMethod: 'arm',
        sourceSchemaFilename: 'source.xsd',
        targetSchemaFilename: 'target.xsd',
        schemaFileList: ['source.xsd', 'target.xsd'],
        xsltFilename: 'transform.xslt',
        xsltContent: '<xsl:stylesheet></xsl:stylesheet>',
        useExpandedFunctionCards: false,
        fetchedFunctions: [{ name: 'concat' } as any],
      };

      const action = changeRuntimePort('9090');
      const newState = reducer(complexState, action);

      // Only runtimePort should change
      expect(newState.runtimePort).toBe('9090');
      expect(newState.armToken).toBe(complexState.armToken);
      expect(newState.loadingMethod).toBe(complexState.loadingMethod);
      expect(newState.sourceSchemaFilename).toBe(complexState.sourceSchemaFilename);
      expect(newState.targetSchemaFilename).toBe(complexState.targetSchemaFilename);
      expect(newState.schemaFileList).toBe(complexState.schemaFileList);
      expect(newState.xsltFilename).toBe(complexState.xsltFilename);
      expect(newState.xsltContent).toBe(complexState.xsltContent);
      expect(newState.useExpandedFunctionCards).toBe(complexState.useExpandedFunctionCards);
      expect(newState.fetchedFunctions).toBe(complexState.fetchedFunctions);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined state input gracefully', () => {
      const action = changeRuntimePort('7071');
      const newState = reducer(undefined as any, action);

      expect(newState.runtimePort).toBe('7071');
    });

    it('should handle large data structures', () => {
      const largeSchemaList = Array.from({ length: 1000 }, (_, i) => `schema${i}.xsd`);
      const action = changeSchemaList(largeSchemaList);
      const newState = reducer(initialState, action);

      expect(newState.schemaFileList).toBe(largeSchemaList);
      expect(newState.schemaFileList).toHaveLength(1000);
    });

    it('should handle special characters in filenames', () => {
      const specialFilename = 'schema with spaces & special chars (1).xsd';
      const action = changeSourceSchemaFilename(specialFilename);
      const newState = reducer(initialState, action);

      expect(newState.sourceSchemaFilename).toBe(specialFilename);
    });
  });
});
