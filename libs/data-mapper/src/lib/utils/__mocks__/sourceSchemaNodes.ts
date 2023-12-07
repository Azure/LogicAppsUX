import type { SchemaNodeExtended } from '@microsoft/utils-logic-apps';
import { NormalizedDataType, SchemaNodeProperty } from '@microsoft/utils-logic-apps';

export const sourceSchemaNodes: SchemaNodeExtended[] = [
  {
    key: '/ns0:Root/Looping/Employee',
    name: 'Employee',
    type: NormalizedDataType.Complex,
    properties: 'Repeating',
    children: [
      {
        key: '/ns0:Root/Looping/Employee/TelephoneNumber',
        name: 'TelephoneNumber',
        type: NormalizedDataType.String,
        properties: 'None',
        qName: 'TelephoneNumber',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            qName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            qName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/TelephoneNumber',
            name: 'TelephoneNumber',
            qName: 'TelephoneNumber',
            repeating: false,
          },
        ],
        arrayItemIndex: undefined,
      },
      {
        key: '/ns0:Root/Looping/Employee/Name',
        name: 'Name',
        type: NormalizedDataType.String,
        properties: 'None',
        qName: 'Name',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            qName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            qName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Name',
            name: 'Name',
            qName: 'Name',
            repeating: false,
          },
        ],
        arrayItemIndex: undefined,
      },
      {
        key: '/ns0:Root/Looping/Employee/Salary',
        name: 'Salary',
        type: NormalizedDataType.Decimal,
        properties: 'None',
        qName: 'Salary',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            qName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            qName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Salary',
            name: 'Salary',
            qName: 'Salary',
            repeating: false,
          },
        ],
        arrayItemIndex: undefined,
      },
      {
        key: '/ns0:Root/Looping/Employee/Country',
        name: 'Country',
        type: NormalizedDataType.String,
        properties: 'None',
        qName: 'Country',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            qName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            qName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Country',
            name: 'Country',
            qName: 'Country',
            repeating: false,
          },
        ],
        arrayItemIndex: undefined,
      },
      {
        key: '/ns0:Root/Looping/Employee/Dat_of_Birth',
        name: 'Dat_of_Birth',
        type: NormalizedDataType.DateTime,
        properties: 'None',
        qName: 'Dat_of_Birth',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            qName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            qName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Dat_of_Birth',
            name: 'Dat_of_Birth',
            qName: 'Dat_of_Birth',
            repeating: false,
          },
        ],
        arrayItemIndex: undefined,
      },
      {
        key: '/ns0:Root/Looping/Employee/Address',
        name: 'Address',
        type: NormalizedDataType.String,
        properties: 'None',
        qName: 'Address',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping',
            name: 'Looping',
            qName: 'Looping',
            repeating: false,
          },
          {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            qName: 'Employee',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Employee/Address',
            name: 'Address',
            qName: 'Address',
            repeating: false,
          },
        ],
        arrayItemIndex: undefined,
      },
    ],
    qName: 'Employee',
    parentKey: '/ns0:Root/Looping',
    nodeProperties: [SchemaNodeProperty.Repeating],
    pathToRoot: [
      {
        key: '/ns0:Root',
        name: 'Root',
        qName: 'ns0:Root',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping',
        name: 'Looping',
        qName: 'Looping',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping/Employee',
        name: 'Employee',
        qName: 'Employee',
        repeating: true,
      },
    ],
    arrayItemIndex: undefined,
  },
  {
    key: '/ns0:Root/Looping/Employee/TelephoneNumber',
    name: 'TelephoneNumber',
    type: NormalizedDataType.String,
    properties: 'None',
    qName: 'TelephoneNumber',
    parentKey: '/ns0:Root/Looping/Employee',
    nodeProperties: [SchemaNodeProperty.None],
    children: [],
    pathToRoot: [
      {
        key: '/ns0:Root',
        name: 'Root',
        qName: 'ns0:Root',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping',
        name: 'Looping',
        qName: 'Looping',
        repeating: false,
      },
      {
        key: '/ns0:Root/Looping/Employee',
        name: 'Employee',
        qName: 'Employee',
        repeating: true,
      },
      {
        key: '/ns0:Root/Looping/Employee/TelephoneNumber',
        name: 'TelephoneNumber',
        qName: 'TelephoneNumber',
        repeating: false,
      },
    ],
    arrayItemIndex: undefined,
  },
];
