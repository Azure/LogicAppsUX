import { describe, it, expect, vi } from 'vitest';
import { DataMapperApiServiceInstance, InitDataMapperApiService } from '../dataMapperApiService';
import { DataMapperApiServiceOptions } from '../dataMapperApiService/DataMapperApiService';
import { IFileSysTreeItem } from '@microsoft/logic-apps-shared';

const options: DataMapperApiServiceOptions = {
  baseUrl: 'http://localhost',
  port: '8000',
  accessToken: '',
};

describe('dataMapperApiService', () => {
  InitDataMapperApiService(options);
  const service = DataMapperApiServiceInstance();

  it('generates correct URI for simple xsd schema', () => {
    const schemaName = 'Child1.xsd';
    const schemaFilePath = 'Child1.xsd';

    const uri = service.getSchemaFileUri(schemaName, schemaFilePath);
    expect(uri).toEqual('http://localhost:8000/runtime/webhooks/workflow/api/management/schemas/Child1/contents/schemaTree');
  });

  it('generates correct URI for nested xsd schema', () => {
    const schemaName = 'Child1.xsd';
    const schemaFilePath = 'nested/Child1.xsd';

    const uri = service.getSchemaFileUri(schemaName, schemaFilePath);
    expect(uri).toEqual(
      'http://localhost:8000/runtime/webhooks/workflow/api/management/schemas/Child1/contents/schemaTree?relativePath=nested/'
    );
  });
});

const exampleTree: IFileSysTreeItem[] = [
  { name: 'PersonOrigin.xsd', type: 'file', fullPath: 'PersonOrigin.xsd' },
  { name: 'PersonTarget.xsd', type: 'file', fullPath: 'PersonTarget.xsd' },
  { name: 'Source.xsd', type: 'file', fullPath: 'Source.xsd' },
  {
    name: 'SourceSchemaJson.json',
    type: 'file',
    fullPath: 'SourceSchemaJson.json',
  },
  {
    name: 'TargetSchemaJson.json',
    type: 'file',
    fullPath: 'TargetSchemaJson.json',
  },
  {
    name: 'X12_00401_856 Custom2.xsd',
    type: 'file',
    fullPath: 'X12_00401_856 Custom2.xsd',
  },
  {
    name: 'nested',
    type: 'directory',
    children: [
      {
        name: 'ASN SQL Data.xsd',
        type: 'file',
        fullPath: 'nested/ASN SQL Data.xsd',
      },
      { name: 'empty.xsd', type: 'file', fullPath: 'nested/empty.xsd' },
    ],
  },
  { name: 'sh.xsd', type: 'file', fullPath: 'sh.xsd' },
  { name: 'tryingto.json', type: 'file', fullPath: 'tryingto.json' },
];
