import {
  layeredLoopSourceMockSchema,
  layeredLoopTargetMockSchema,
  simpleLoopSource,
  simpleLoopTarget,
  sourceMockSchema,
  targetMockSchema,
} from '../../__mocks__';
import { concatFunction, conditionalFunction, greaterThanFunction } from '../../__mocks__/FunctionMock';
import type { MapDefinitionEntry } from '../../models';
import { SchemaType } from '../../models';
import type { ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
import { addParentConnectionForRepeatingElementsNested, convertFromMapDefinition, getSourceValueFromLoop } from '../DataMap.Utils';
import { convertSchemaToSchemaExtended, flattenSchema } from '../Schema.Utils';
import { connection1, connection1Id, connection2, connection2Id } from '../__mocks__';

describe('utils/DataMap', () => {
  const simpleMap: MapDefinitionEntry = {
    $version: '1',
    $input: 'XML',
    $output: 'XML',
    $sourceSchema: 'demo-source.xsd',
    $targetSchema: 'demo-source.xsd',
    $sourceNamespaces: {
      ns0: 'http://tempuri.org/source.xsd',
      xs: 'http://www.w3.org/2001/XMLSchema',
    },
    $targetNamespaces: {},
    'ns0:Root': {
      DirectTranslation: {
        Employee: {
          Name: '/ns0:Root/DirectTranslation/EmployeeName',
        },
      },
    },
  };
  const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
  const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);

  it('creates a simple connection between one source and target node', () => {
    const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, [concatFunction]);
    expect(result['target-/ns0:Root/DirectTranslation/Employee/Name']).toBeTruthy();
    expect(result['source-/ns0:Root/DirectTranslation/EmployeeName']).toBeTruthy();
  });

  it('creates a simple connection between one source, one function and one target', () => {
    simpleMap['ns0:Root'] = {
      DirectTranslation: {
        Employee: {
          Name: 'concat(/ns0:Root/DirectTranslation/EmployeeName)',
        },
      },
    };
    const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, [concatFunction]);
    // target lists function as input
    const targetInput = result['target-/ns0:Root/DirectTranslation/Employee/Name'].inputs['0'][0] as ConnectionUnit;
    expect(targetInput.reactFlowKey).toContain('Concat');

    // source lists function as output
    const sourceOutput = result['source-/ns0:Root/DirectTranslation/EmployeeName'].outputs[0];
    expect(sourceOutput.reactFlowKey).toContain('Concat');

    // function lists source as input

    // function lists target as output

    expect(Object.keys(result).some((key) => key.includes('Concat')));
  });

  it('creates a conditional connection', () => {
    simpleMap['ns0:Root'] = {
      DirectTranslation: {
        Employee: {
          Name: '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))',
        },
      },
    };
    const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, [greaterThanFunction, conditionalFunction]);
    expect(result).toBeTruthy();
    // console.log(JSON.stringify(result));  // danielle need to find a way to better verify this
  });

  it('creates a loop connection', () => {
    simpleMap['ns0:Root'] = {
      Looping: {
        '$for(/ns0:Root/Looping/Employee)': {
          Person: {
            Name: 'TelephoneNumber',
          },
        },
      },
    };
    const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, []);
    expect(result).toBeTruthy();
    console.log(JSON.stringify(result)); // danielle need to find a way to better verify this
  });

  it('creates a nested loop connection', () => {
    const extendedLoopSource = convertSchemaToSchemaExtended(simpleLoopSource);
    const extendedLoopTarget = convertSchemaToSchemaExtended(simpleLoopTarget);
    simpleMap['ns0:Root'] = {
      Ano: {
        '$for(/ns0:Root/Year)': {
          Mes: {
            '$for(/ns0:Root/Year/Month)': {
              Dia: 'Day',
            },
          },
        },
      },
    };
    const result = convertFromMapDefinition(simpleMap, extendedLoopSource, extendedLoopTarget, []);
    expect(result).toBeTruthy();
    console.log(JSON.stringify(result));
  });

  describe('getSourceValueFromLoop', () => {
    it('gets the source key from a looped target string', () => {
      const result = getSourceValueFromLoop('TelephoneNumber', '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name');
      expect(result).toEqual('/ns0:Root/Looping/Employee/TelephoneNumber');
    });

    it('gets the source key from a looped target string with a function', () => {
      const result = getSourceValueFromLoop(
        'lower-case(TelephoneNumber)',
        '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name'
      );
      expect(result).toEqual('lower-case(/ns0:Root/Looping/Employee/TelephoneNumber)');
    });

    it('gets the source key from a nested looped target string', () => {
      const result = getSourceValueFromLoop('Day', '/ns0:Root/Ano/$for(/ns0:Root/Year)/Mes/$for(/ns0:Root/Year/Month)/Dia');
      expect(result).toEqual('/ns0:Root/Year/Month/Day');
    });
  });

  describe('addParentConnectionForRepeatingElementsNested', () => {
    const extendedLoopSource = convertSchemaToSchemaExtended(layeredLoopSourceMockSchema);
    const extendedLoopTarget = convertSchemaToSchemaExtended(layeredLoopTargetMockSchema);
    const flattenedLoopSource = flattenSchema(extendedLoopSource, SchemaType.Source);
    const flattenedLoopTarget = flattenSchema(extendedLoopTarget, SchemaType.Target);
    const sourceNodeParent = flattenedLoopSource['source-/ns0:Root/ManyToMany/Year/Month/Day'];
    const targetNodeParent = flattenedLoopTarget['target-/ns0:Root/ManyToMany/Year/Month/Day'];

    it('adds parent connections for nested loops', () => {
      const connectionsDict: ConnectionDictionary = { [connection1Id]: connection1, [connection2Id]: connection2 };
      addParentConnectionForRepeatingElementsNested(
        sourceNodeParent,
        targetNodeParent,
        flattenedLoopSource,
        flattenedLoopTarget,
        connectionsDict
      );
      console.log(JSON.stringify(connectionsDict));
      expect(Object.keys(connectionsDict).length).toEqual(8);
    });
  });
});
