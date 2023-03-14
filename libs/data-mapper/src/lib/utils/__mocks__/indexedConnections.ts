import { FunctionCategory, FunctionType } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';

export const indexedConnections: ConnectionDictionary = {
  'target-/ns0:Root/Looping/Person/Name': {
    self: {
      node: {
        key: '/ns0:Root/Looping/Person/Name',
        name: 'Name',
        type: 'String',
        properties: 'None',
        qName: 'Name',
        parentKey: '/ns0:Root/Looping/Person',
        nodeProperties: ['None'],
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
            key: '/ns0:Root/Looping/Person',
            name: 'Person',
            qName: 'Person',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Person/Name',
            name: 'Name',
            qName: 'Name',
            repeating: false,
          },
        ],
      },
      reactFlowKey: 'target-/ns0:Root/Looping/Person/Name',
    },
    inputs: {
      '0': [
        {
          node: {
            key: '/ns0:Root/Looping/Employee/TelephoneNumber',
            name: 'TelephoneNumber',
            type: 'String',
            properties: 'None',
            qName: 'TelephoneNumber',
            parentKey: '/ns0:Root/Looping/Employee',
            nodeProperties: ['None'],
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
          },
          reactFlowKey: 'source-/ns0:Root/Looping/Employee/TelephoneNumber',
        },
      ],
    },
    outputs: [],
  },
  'source-/ns0:Root/Looping/Employee/TelephoneNumber': {
    self: {
      node: {
        key: '/ns0:Root/Looping/Employee/TelephoneNumber',
        name: 'TelephoneNumber',
        type: 'String',
        properties: 'None',
        qName: 'TelephoneNumber',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['None'],
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
      },
      reactFlowKey: 'source-/ns0:Root/Looping/Employee/TelephoneNumber',
    },
    inputs: {
      '0': [],
    },
    outputs: [
      {
        node: {
          key: '/ns0:Root/Looping/Person/Name',
          name: 'Name',
          type: 'String',
          properties: 'None',
          qName: 'Name',
          parentKey: '/ns0:Root/Looping/Person',
          nodeProperties: ['None'],
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
              key: '/ns0:Root/Looping/Person',
              name: 'Person',
              qName: 'Person',
              repeating: true,
            },
            {
              key: '/ns0:Root/Looping/Person/Name',
              name: 'Name',
              qName: 'Name',
              repeating: false,
            },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/Looping/Person/Name',
      },
    ],
  },
  'target-/ns0:Root/Looping/Person': {
    self: {
      node: {
        key: '/ns0:Root/Looping/Person',
        name: 'Person',
        type: 'Complex',
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:Root/Looping/Person/Name',
            name: 'Name',
            type: 'String',
            properties: 'None',
            qName: 'Name',
            parentKey: '/ns0:Root/Looping/Person',
            nodeProperties: ['None'],
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
                key: '/ns0:Root/Looping/Person',
                name: 'Person',
                qName: 'Person',
                repeating: true,
              },
              {
                key: '/ns0:Root/Looping/Person/Name',
                name: 'Name',
                qName: 'Name',
                repeating: false,
              },
            ],
          },
          {
            key: '/ns0:Root/Looping/Person/Address',
            name: 'Address',
            type: 'String',
            properties: 'None',
            qName: 'Address',
            parentKey: '/ns0:Root/Looping/Person',
            nodeProperties: ['None'],
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
                key: '/ns0:Root/Looping/Person',
                name: 'Person',
                qName: 'Person',
                repeating: true,
              },
              {
                key: '/ns0:Root/Looping/Person/Address',
                name: 'Address',
                qName: 'Address',
                repeating: false,
              },
            ],
          },
          {
            key: '/ns0:Root/Looping/Person/Other',
            name: 'Other',
            type: 'String',
            properties: 'Optional',
            qName: 'Other',
            parentKey: '/ns0:Root/Looping/Person',
            nodeProperties: ['Optional'],
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
                key: '/ns0:Root/Looping/Person',
                name: 'Person',
                qName: 'Person',
                repeating: true,
              },
              {
                key: '/ns0:Root/Looping/Person/Other',
                name: 'Other',
                qName: 'Other',
                repeating: false,
              },
            ],
          },
        ],
        qName: 'Person',
        parentKey: '/ns0:Root/Looping',
        nodeProperties: ['Repeating'],
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
            key: '/ns0:Root/Looping/Person',
            name: 'Person',
            qName: 'Person',
            repeating: true,
          },
        ],
      },
      reactFlowKey: 'target-/ns0:Root/Looping/Person',
    },
    inputs: {
      '0': [
        {
          node: {
            key: 'index',
            maxNumberOfInputs: 1,
            type: FunctionType.PseudoFunction,
            functionName: '',
            outputValueType: 'Any',
            inputs: [
              {
                name: 'Loop',
                allowedTypes: ['Complex'],
                isOptional: false,
                allowCustomInput: false,
                placeHolder: 'The source loop.',
              },
            ],
            displayName: 'Index',
            category: FunctionCategory.Collection,
            description: 'Adds an index value to the loop',
            children: [],
          },
          reactFlowKey: 'index-97A0763A-D86A-4018-B128-1DC23B3A461E',
        },
      ],
    },
    outputs: [],
  },
  'source-/ns0:Root/Looping/Employee': {
    self: {
      node: {
        key: '/ns0:Root/Looping/Employee',
        name: 'Employee',
        type: 'Complex',
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:Root/Looping/Employee/TelephoneNumber',
            name: 'TelephoneNumber',
            type: 'String',
            properties: 'None',
            qName: 'TelephoneNumber',
            parentKey: '/ns0:Root/Looping/Employee',
            nodeProperties: ['None'],
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
          },
          {
            key: '/ns0:Root/Looping/Employee/Name',
            name: 'Name',
            type: 'String',
            properties: 'None',
            qName: 'Name',
            parentKey: '/ns0:Root/Looping/Employee',
            nodeProperties: ['None'],
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
          },
          {
            key: '/ns0:Root/Looping/Employee/Salary',
            name: 'Salary',
            type: 'Decimal',
            properties: 'None',
            qName: 'Salary',
            parentKey: '/ns0:Root/Looping/Employee',
            nodeProperties: ['None'],
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
          },
          {
            key: '/ns0:Root/Looping/Employee/Country',
            name: 'Country',
            type: 'String',
            properties: 'None',
            qName: 'Country',
            parentKey: '/ns0:Root/Looping/Employee',
            nodeProperties: ['None'],
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
          },
          {
            key: '/ns0:Root/Looping/Employee/Dat_of_Birth',
            name: 'Dat_of_Birth',
            type: 'DateTime',
            properties: 'None',
            qName: 'Dat_of_Birth',
            parentKey: '/ns0:Root/Looping/Employee',
            nodeProperties: ['None'],
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
          },
          {
            key: '/ns0:Root/Looping/Employee/Address',
            name: 'Address',
            type: 'String',
            properties: 'None',
            qName: 'Address',
            parentKey: '/ns0:Root/Looping/Employee',
            nodeProperties: ['None'],
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
          },
        ],
        qName: 'Employee',
        parentKey: '/ns0:Root/Looping',
        nodeProperties: ['Repeating'],
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
      },
      reactFlowKey: 'source-/ns0:Root/Looping/Employee',
    },
    inputs: {
      '0': [],
    },
    outputs: [
      {
        node: {
          key: 'index',
          maxNumberOfInputs: 1,
          type: FunctionType.PseudoFunction,
          functionName: '',
          outputValueType: 'Any',
          inputs: [
            {
              name: 'Loop',
              allowedTypes: ['Complex'],
              isOptional: false,
              allowCustomInput: false,
              placeHolder: 'The source loop.',
            },
          ],
          displayName: 'Index',
          category: FunctionCategory.Collection,
          description: 'Adds an index value to the loop',
          children: [],
        },
        reactFlowKey: 'index-97A0763A-D86A-4018-B128-1DC23B3A461E',
      },
    ],
  },
  'target-/ns0:Root/Looping/Person/Address': {
    self: {
      node: {
        key: '/ns0:Root/Looping/Person/Address',
        name: 'Address',
        type: 'String',
        properties: 'None',
        qName: 'Address',
        parentKey: '/ns0:Root/Looping/Person',
        nodeProperties: ['None'],
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
            key: '/ns0:Root/Looping/Person',
            name: 'Person',
            qName: 'Person',
            repeating: true,
          },
          {
            key: '/ns0:Root/Looping/Person/Address',
            name: 'Address',
            qName: 'Address',
            repeating: false,
          },
        ],
      },
      reactFlowKey: 'target-/ns0:Root/Looping/Person/Address',
    },
    inputs: {
      '0': [],
    },
    outputs: [],
  },
  'source-/ns0:Root/Looping/Employee/Name': {
    self: {
      node: {
        key: '/ns0:Root/Looping/Employee/Name',
        name: 'Name',
        type: 'String',
        properties: 'None',
        qName: 'Name',
        parentKey: '/ns0:Root/Looping/Employee',
        nodeProperties: ['None'],
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
      },
      reactFlowKey: 'source-/ns0:Root/Looping/Employee/Name',
    },
    inputs: {
      '0': [],
    },
    outputs: [],
  },
  'index-97A0763A-D86A-4018-B128-1DC23B3A461E': {
    self: {
      node: {
        key: 'index',
        maxNumberOfInputs: 1,
        type: FunctionType.PseudoFunction,
        functionName: '',
        outputValueType: 'Any',
        inputs: [
          {
            name: 'Loop',
            allowedTypes: ['Complex'],
            isOptional: false,
            allowCustomInput: false,
            placeHolder: 'The source loop.',
          },
        ],
        displayName: 'Index',
        category: FunctionCategory.Collection,
        description: 'Adds an index value to the loop',
        children: [],
      },
      reactFlowKey: 'index-97A0763A-D86A-4018-B128-1DC23B3A461E',
    },
    inputs: {
      '0': [
        {
          node: {
            key: '/ns0:Root/Looping/Employee',
            name: 'Employee',
            type: 'Complex',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:Root/Looping/Employee/TelephoneNumber',
                name: 'TelephoneNumber',
                type: 'String',
                properties: 'None',
                qName: 'TelephoneNumber',
                parentKey: '/ns0:Root/Looping/Employee',
                nodeProperties: ['None'],
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
              },
              {
                key: '/ns0:Root/Looping/Employee/Name',
                name: 'Name',
                type: 'String',
                properties: 'None',
                qName: 'Name',
                parentKey: '/ns0:Root/Looping/Employee',
                nodeProperties: ['None'],
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
              },
              {
                key: '/ns0:Root/Looping/Employee/Salary',
                name: 'Salary',
                type: 'Decimal',
                properties: 'None',
                qName: 'Salary',
                parentKey: '/ns0:Root/Looping/Employee',
                nodeProperties: ['None'],
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
              },
              {
                key: '/ns0:Root/Looping/Employee/Country',
                name: 'Country',
                type: 'String',
                properties: 'None',
                qName: 'Country',
                parentKey: '/ns0:Root/Looping/Employee',
                nodeProperties: ['None'],
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
              },
              {
                key: '/ns0:Root/Looping/Employee/Dat_of_Birth',
                name: 'Dat_of_Birth',
                type: 'DateTime',
                properties: 'None',
                qName: 'Dat_of_Birth',
                parentKey: '/ns0:Root/Looping/Employee',
                nodeProperties: ['None'],
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
              },
              {
                key: '/ns0:Root/Looping/Employee/Address',
                name: 'Address',
                type: 'String',
                properties: 'None',
                qName: 'Address',
                parentKey: '/ns0:Root/Looping/Employee',
                nodeProperties: ['None'],
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
              },
            ],
            qName: 'Employee',
            parentKey: '/ns0:Root/Looping',
            nodeProperties: ['Repeating'],
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
          },
          reactFlowKey: 'source-/ns0:Root/Looping/Employee',
        },
      ],
    },
    outputs: [
      {
        node: {
          key: '/ns0:Root/Looping/Person',
          name: 'Person',
          type: 'Complex',
          properties: 'Repeating',
          children: [
            {
              key: '/ns0:Root/Looping/Person/Name',
              name: 'Name',
              type: 'String',
              properties: 'None',
              qName: 'Name',
              parentKey: '/ns0:Root/Looping/Person',
              nodeProperties: ['None'],
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
                  key: '/ns0:Root/Looping/Person',
                  name: 'Person',
                  qName: 'Person',
                  repeating: true,
                },
                {
                  key: '/ns0:Root/Looping/Person/Name',
                  name: 'Name',
                  qName: 'Name',
                  repeating: false,
                },
              ],
            },
            {
              key: '/ns0:Root/Looping/Person/Address',
              name: 'Address',
              type: 'String',
              properties: 'None',
              qName: 'Address',
              parentKey: '/ns0:Root/Looping/Person',
              nodeProperties: ['None'],
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
                  key: '/ns0:Root/Looping/Person',
                  name: 'Person',
                  qName: 'Person',
                  repeating: true,
                },
                {
                  key: '/ns0:Root/Looping/Person/Address',
                  name: 'Address',
                  qName: 'Address',
                  repeating: false,
                },
              ],
            },
            {
              key: '/ns0:Root/Looping/Person/Other',
              name: 'Other',
              type: 'String',
              properties: 'Optional',
              qName: 'Other',
              parentKey: '/ns0:Root/Looping/Person',
              nodeProperties: ['Optional'],
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
                  key: '/ns0:Root/Looping/Person',
                  name: 'Person',
                  qName: 'Person',
                  repeating: true,
                },
                {
                  key: '/ns0:Root/Looping/Person/Other',
                  name: 'Other',
                  qName: 'Other',
                  repeating: false,
                },
              ],
            },
          ],
          qName: 'Person',
          parentKey: '/ns0:Root/Looping',
          nodeProperties: ['Repeating'],
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
              key: '/ns0:Root/Looping/Person',
              name: 'Person',
              qName: 'Person',
              repeating: true,
            },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/Looping/Person',
      },
    ],
  },
} as ConnectionDictionary;
