import type { SourceSchemaNodeExtended } from '../../models';

export const sourceSchemaNodes: SourceSchemaNodeExtended[] = [
  {
    key: '/ns0:Root/Looping/Employee',
    name: 'Employee',
    schemaNodeDataType: 'None',
    normalizedDataType: 'ComplexType',
    properties: 'Repeating',
    children: [
      {
        key: '/ns0:Root/Looping/Employee/TelephoneNumber',
        name: 'TelephoneNumber',
        schemaNodeDataType: 'String',
        normalizedDataType: 'String',
        properties: 'NotSpecified',
        fullName: 'TelephoneNumber',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['NotSpecified'],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            fullName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            fullName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/TelephoneNumber',
            name: 'TelephoneNumber',
            fullName: 'TelephoneNumber',
            repeating: false,
          },
        ],
      },
      {
        key: '/ns0:Root/Looping/Employee/Name',
        name: 'Name',
        schemaNodeDataType: 'String',
        normalizedDataType: 'String',
        properties: 'NotSpecified',
        fullName: 'Name',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['NotSpecified'],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            fullName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            fullName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Name',
            name: 'Name',
            fullName: 'Name',
            repeating: false,
          },
        ],
      },
      {
        key: '/ns0:Root/Looping/Employee/Salary',
        name: 'Salary',
        schemaNodeDataType: 'Decimal',
        normalizedDataType: 'Decimal',
        properties: 'NotSpecified',
        fullName: 'Salary',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['NotSpecified'],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            fullName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            fullName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Salary',
            name: 'Salary',
            fullName: 'Salary',
            repeating: false,
          },
        ],
      },
      {
        key: '/ns0:Root/Looping/Employee/Country',
        name: 'Country',
        schemaNodeDataType: 'String',
        normalizedDataType: 'String',
        properties: 'NotSpecified',
        fullName: 'Country',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['NotSpecified'],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            fullName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            fullName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Country',
            name: 'Country',
            fullName: 'Country',
            repeating: false,
          },
        ],
      },
      {
        key: '/ns0:Root/Looping/Employee/Dat_of_Birth',
        name: 'Dat_of_Birth',
        schemaNodeDataType: 'Date',
        normalizedDataType: 'DateTime',
        properties: 'NotSpecified',
        fullName: 'Dat_of_Birth',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['NotSpecified'],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            fullName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            fullName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Dat_of_Birth',
            name: 'Dat_of_Birth',
            fullName: 'Dat_of_Birth',
            repeating: false,
          },
        ],
      },
      {
        key: '/ns0:Root/Looping/Employee/Address',
        name: 'Address',
        schemaNodeDataType: 'String',
        normalizedDataType: 'String',
        properties: 'NotSpecified',
        fullName: 'Address',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['NotSpecified'],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            fullName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            fullName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Address',
            name: 'Address',
            fullName: 'Address',
            repeating: false,
          },
        ],
      },
    ],
    fullName: 'Employee',
    parentKey: '/ns0:Root/Looping',
    nodeProperties: ['Repeating'],
    pathToRoot: [
      {
        key: '/ns0:Root',
        name: 'Root',
        fullName: 'ns0:Root',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping',
        name: 'Looping',
        fullName: 'Looping',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping/Employee',
        name: 'Employee',
        fullName: 'Employee',
        repeating: true,
      },
    ],
  },
  {
    key: '/ns0:Root/Looping/Employee/TelephoneNumber',
    name: 'TelephoneNumber',
    schemaNodeDataType: 'String',
    normalizedDataType: 'String',
    properties: 'NotSpecified',
    fullName: 'TelephoneNumber',
    parentKey: '/ns0:Root/Looping/Employee',
    nodeProperties: ['NotSpecified'],
    children: [],
    pathToRoot: [
      {
        key: '/ns0:Root',
        name: 'Root',
        fullName: 'ns0:Root',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping',
        name: 'Looping',
        fullName: 'Looping',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping/Employee',
        name: 'Employee',
        fullName: 'Employee',
        repeating: true,
      },
      {
        key: '/ns0:Root/Looping/Employee/TelephoneNumber',
        name: 'TelephoneNumber',
        fullName: 'TelephoneNumber',
        repeating: false,
      },
    ],
  },
] as SourceSchemaNodeExtended[];
