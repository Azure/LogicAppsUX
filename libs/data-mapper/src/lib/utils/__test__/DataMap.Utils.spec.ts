import type { ConnectionDictionary } from '../../models/Connection';
import { hasEventualTarget } from '../DataMap.Utils';

describe('Data Map utils', () => {
  const dict: ConnectionDictionary = {
    'target-/ns0:Root/Looping/Person/Name': {
      sources: [
        {
          node: {
            key: '/ns0:Root/DirectTranslation/EmployeeName',
            name: 'EmployeeName',
            schemaNodeDataType: 'String',
            normalizedDataType: 'String',
            properties: 'NotSpecified',
            fullName: 'EmployeeName',
            parentKey: '/ns0:Root/DirectTranslation',
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                fullName: 'ns0:Root',
              },
              {
                key: '/ns0:Root/DirectTranslation',
                name: 'DirectTranslation',
                fullName: 'DirectTranslation',
              },
              {
                key: '/ns0:Root/DirectTranslation/EmployeeName',
                name: 'EmployeeName',
                fullName: 'EmployeeName',
              },
            ],
          },
          reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeName',
        },
      ],
      destination: {
        node: {
          key: '/ns0:Root/Looping/Person/Name',
          name: 'Name',
          schemaNodeDataType: 'String',
          normalizedDataType: 'String',
          properties: 'NotSpecified',
          fullName: 'Name',
          parentKey: '/ns0:Root/Looping/Person',
          children: [],
          pathToRoot: [
            {
              key: '/ns0:Root',
              name: 'Root',
              fullName: 'ns0:Root',
            },
            {
              key: '/ns0:Root/Looping',
              name: 'Looping',
              fullName: 'Looping',
            },
            {
              key: '/ns0:Root/Looping/Person',
              name: 'Person',
              fullName: 'Person',
            },
            {
              key: '/ns0:Root/Looping/Person/Name',
              name: 'Name',
              fullName: 'Name',
            },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/Looping/Person/Name',
      },
    },
    'target-/ns0:Root/Looping/Person/Address': {
      sources: [
        {
          node: {
            key: '/ns0:Root/Looping/Employee/Country',
            name: 'Country',
            schemaNodeDataType: 'String',
            normalizedDataType: 'String',
            properties: 'NotSpecified',
            fullName: 'Country',
            parentKey: '/ns0:Root/Looping/Employee',
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                fullName: 'ns0:Root',
              },
              {
                key: '/ns0:Root/Looping',
                name: 'Looping',
                fullName: 'Looping',
              },
              {
                key: '/ns0:Root/Looping/Employee',
                name: 'Employee',
                fullName: 'Employee',
              },
              {
                key: '/ns0:Root/Looping/Employee/Country',
                name: 'Country',
                fullName: 'Country',
              },
            ],
          },
          reactFlowKey: 'source-/ns0:Root/Looping/Employee/Country',
        },
      ],
      destination: {
        node: {
          key: '/ns0:Root/Looping/Person/Address',
          name: 'Address',
          schemaNodeDataType: 'String',
          normalizedDataType: 'String',
          properties: 'NotSpecified',
          fullName: 'Address',
          parentKey: '/ns0:Root/Looping/Person',
          children: [],
          pathToRoot: [
            {
              key: '/ns0:Root',
              name: 'Root',
              fullName: 'ns0:Root',
            },
            {
              key: '/ns0:Root/Looping',
              name: 'Looping',
              fullName: 'Looping',
            },
            {
              key: '/ns0:Root/Looping/Person',
              name: 'Person',
              fullName: 'Person',
            },
            {
              key: '/ns0:Root/Looping/Person/Address',
              name: 'Address',
              fullName: 'Address',
            },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/Looping/Person/Address',
      },
    },
    'target-/ns0:Root/Looping/Person': {
      sources: [
        {
          node: {
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
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                  },
                  {
                    key: '/ns0:Root/Looping',
                    name: 'Looping',
                    fullName: 'Looping',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee',
                    name: 'Employee',
                    fullName: 'Employee',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee/TelephoneNumber',
                    name: 'TelephoneNumber',
                    fullName: 'TelephoneNumber',
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
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                  },
                  {
                    key: '/ns0:Root/Looping',
                    name: 'Looping',
                    fullName: 'Looping',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee',
                    name: 'Employee',
                    fullName: 'Employee',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee/Name',
                    name: 'Name',
                    fullName: 'Name',
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
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                  },
                  {
                    key: '/ns0:Root/Looping',
                    name: 'Looping',
                    fullName: 'Looping',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee',
                    name: 'Employee',
                    fullName: 'Employee',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee/Salary',
                    name: 'Salary',
                    fullName: 'Salary',
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
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                  },
                  {
                    key: '/ns0:Root/Looping',
                    name: 'Looping',
                    fullName: 'Looping',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee',
                    name: 'Employee',
                    fullName: 'Employee',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee/Country',
                    name: 'Country',
                    fullName: 'Country',
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
                children: [],

                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                  },
                  {
                    key: '/ns0:Root/Looping',
                    name: 'Looping',
                    fullName: 'Looping',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee',
                    name: 'Employee',
                    fullName: 'Employee',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee/Dat_of_Birth',
                    name: 'Dat_of_Birth',
                    fullName: 'Dat_of_Birth',
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
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                  },
                  {
                    key: '/ns0:Root/Looping',
                    name: 'Looping',
                    fullName: 'Looping',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee',
                    name: 'Employee',
                    fullName: 'Employee',
                  },
                  {
                    key: '/ns0:Root/Looping/Employee/Address',
                    name: 'Address',
                    fullName: 'Address',
                  },
                ],
              },
            ],
            fullName: 'Employee',
            parentKey: '/ns0:Root/Looping',
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                fullName: 'ns0:Root',
              },
              {
                key: '/ns0:Root/Looping',
                name: 'Looping',
                fullName: 'Looping',
              },
              {
                key: '/ns0:Root/Looping/Employee',
                name: 'Employee',
                fullName: 'Employee',
              },
            ],
          },
          reactFlowKey: 'source-/ns0:Root/Looping/Employee',
        },
      ],
      destination: {
        node: {
          key: '/ns0:Root/Looping/Person',
          name: 'Person',
          schemaNodeDataType: 'None',
          normalizedDataType: 'ComplexType',
          properties: 'Repeating',
          children: [
            {
              key: '/ns0:Root/Looping/Person/Name',
              name: 'Name',
              schemaNodeDataType: 'String',
              normalizedDataType: 'String',
              properties: 'NotSpecified',
              fullName: 'Name',
              parentKey: '/ns0:Root/Looping/Person',
              children: [],
              pathToRoot: [
                {
                  key: '/ns0:Root',
                  name: 'Root',
                  fullName: 'ns0:Root',
                },
                {
                  key: '/ns0:Root/Looping',
                  name: 'Looping',
                  fullName: 'Looping',
                },
                {
                  key: '/ns0:Root/Looping/Person',
                  name: 'Person',
                  fullName: 'Person',
                },
                {
                  key: '/ns0:Root/Looping/Person/Name',
                  name: 'Name',
                  fullName: 'Name',
                },
              ],
            },
            {
              key: '/ns0:Root/Looping/Person/Address',
              name: 'Address',
              schemaNodeDataType: 'String',
              normalizedDataType: 'String',
              properties: 'NotSpecified',
              fullName: 'Address',
              parentKey: '/ns0:Root/Looping/Person',

              children: [],
              pathToRoot: [
                {
                  key: '/ns0:Root',
                  name: 'Root',
                  fullName: 'ns0:Root',
                },
                {
                  key: '/ns0:Root/Looping',
                  name: 'Looping',
                  fullName: 'Looping',
                },
                {
                  key: '/ns0:Root/Looping/Person',
                  name: 'Person',
                  fullName: 'Person',
                },
                {
                  key: '/ns0:Root/Looping/Person/Address',
                  name: 'Address',
                  fullName: 'Address',
                },
              ],
            },
            {
              key: '/ns0:Root/Looping/Person/Other',
              name: 'Other',
              schemaNodeDataType: 'String',
              normalizedDataType: 'String',
              properties: 'Optional',
              fullName: 'Other',
              parentKey: '/ns0:Root/Looping/Person',
              children: [],

              pathToRoot: [
                {
                  key: '/ns0:Root',
                  name: 'Root',
                  fullName: 'ns0:Root',
                },
                {
                  key: '/ns0:Root/Looping',
                  name: 'Looping',
                  fullName: 'Looping',
                },
                {
                  key: '/ns0:Root/Looping/Person',
                  name: 'Person',
                  fullName: 'Person',
                },
                {
                  key: '/ns0:Root/Looping/Person/Other',
                  name: 'Other',
                  fullName: 'Other',
                },
              ],
            },
          ],
          fullName: 'Person',
          parentKey: '/ns0:Root/Looping',
          pathToRoot: [
            {
              key: '/ns0:Root',
              name: 'Root',
              fullName: 'ns0:Root',
            },
            {
              key: '/ns0:Root/Looping',
              name: 'Looping',
              fullName: 'Looping',
            },
            {
              key: '/ns0:Root/Looping/Person',
              name: 'Person',
              fullName: 'Person',
            },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/Looping/Person',
      },
    },
  };
  it('determines if a node has a connection for a source', () => {
    console.log(dict);
    expect(hasEventualTarget('source-/ns0:Root/Looping/Employee/Country', dict)).toEqual(true);
  });
});
