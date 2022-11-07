import { sourceMockSchema, targetMockSchema } from '../../__mocks__';
import { concatFunction, conditionalFunction, greaterThanFunction } from '../../__mocks__/FunctionMock';
import type { MapDefinitionEntry } from '../../models';
import type { ConnectionUnit } from '../../models/Connection';
import { convertFromMapDefinition, getSourceValueFromLoop } from '../DataMap.Utils';
import { convertSchemaToSchemaExtended } from '../Schema.Utils';

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
    //console.log(result['target-/ns0:Root/DirectTranslation/Employee/Name'].outputs);
    //console.log(result['source-/ns0:Root/DirectTranslation/EmployeeName'].outputs);
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
    console.log(JSON.stringify(result));
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
    const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, [greaterThanFunction, conditionalFunction]);
    console.log(JSON.stringify(result));
  });

  it('gets the source key from a looped target string', () => {
    const result = getSourceValueFromLoop('TelephoneNumber', '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name');
    console.log(result);
    expect(result).toEqual('/ns0:Root/Looping/Employee/TelephoneNumber');
  });

  it('gets the source key from a looped target string with a function', () => {
    const result = getSourceValueFromLoop('lower-case(TelephoneNumber)', '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name');
    console.log(result);
    expect(result).toEqual('lower-case(/ns0:Root/Looping/Employee/TelephoneNumber)');
  });
});
