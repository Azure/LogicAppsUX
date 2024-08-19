import type { ConnectionDictionary } from '../../models/Connection';

export const isGreaterMockId = 'IsGreater-D013B355-BAD7-4BB0-8280-F0BF1F3CA69B';
export const sourceMockIdForIsGreater = 'source-/ns0:Root/DirectTranslation/EmployeeID';

export const setInputFunctionConnection: ConnectionDictionary = {
  isGreaterMockId: {
    self: {
      node: {
        key: 'IsGreater',
        maxNumberOfInputs: 2,
        functionName: 'is-greater-than',
        outputValueType: 'Any',
        inputs: [
          {
            name: 'Value 1',
            allowedTypes: ['Any'],
            isOptional: false,
            allowCustomInput: true,
            placeHolder: 'The value to check.',
            inputEntryType: 'NotSpecified',
          },
          {
            name: 'Value 2',
            allowedTypes: ['Any'],
            isOptional: false,
            allowCustomInput: true,
            placeHolder: 'The value to check.',
            inputEntryType: 'NotSpecified',
          },
        ],
        displayName: 'Greater',
        category: 'Logical',
        iconFileName: 'dm_category_logical.svg',
        description: 'Returns true or false based on whether the first value is greater than the second value.',
        children: [],
        position: {
          x: 415,
          y: 160,
        },
        isNewNode: true,
      },
      reactFlowKey: 'IsGreater-D013B355-BAD7-4BB0-8280-F0BF1F3CA69B',
    },
    inputs: {
      '0': [
        {
          reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeID',
          node: {
            key: '/ns0:Root/DirectTranslation/EmployeeID',
            name: 'EmployeeID',
            type: 'Decimal',
            properties: 'None',
            qName: 'EmployeeID',
            parentKey: '/ns0:Root/DirectTranslation',
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
                key: '/ns0:Root/DirectTranslation',
                name: 'DirectTranslation',
                qName: 'DirectTranslation',
                repeating: false,
              },
              {
                key: '/ns0:Root/DirectTranslation/EmployeeID',
                name: 'EmployeeID',
                qName: 'EmployeeID',
                repeating: false,
              },
            ],
          },
        },
      ],
      '1': [],
    },
    outputs: [],
  },
  sourceMockId: {
    self: {
      node: {
        key: '/ns0:Root/DirectTranslation/EmployeeID',
        name: 'EmployeeID',
        type: 'Decimal',
        properties: 'None',
        qName: 'EmployeeID',
        parentKey: '/ns0:Root/DirectTranslation',
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
            key: '/ns0:Root/DirectTranslation',
            name: 'DirectTranslation',
            qName: 'DirectTranslation',
            repeating: false,
          },
          {
            key: '/ns0:Root/DirectTranslation/EmployeeID',
            name: 'EmployeeID',
            qName: 'EmployeeID',
            repeating: false,
          },
        ],
      },
      reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeID',
    },
    inputs: {
      '0': [],
    },
    outputs: [
      {
        node: {
          key: 'IsGreater',
          maxNumberOfInputs: 2,
          functionName: 'is-greater-than',
          outputValueType: 'Any',
          inputs: [
            {
              name: 'Value 1',
              allowedTypes: ['Any'],
              isOptional: false,
              allowCustomInput: true,
              placeHolder: 'The value to check.',
              inputEntryType: 'NotSpecified',
            },
            {
              name: 'Value 2',
              allowedTypes: ['Any'],
              isOptional: false,
              allowCustomInput: true,
              placeHolder: 'The value to check.',
              inputEntryType: 'NotSpecified',
            },
          ],
          displayName: 'Greater',
          category: 'Logical',
          iconFileName: 'dm_category_logical.svg',
          description: 'Returns true or false based on whether the first value is greater than the second value.',
          children: [],
          position: {
            x: 415,
            y: 160,
          },
          isNewNode: true,
        },
        reactFlowKey: 'IsGreater-D013B355-BAD7-4BB0-8280-F0BF1F3CA69B',
        isRepeating: true,
      },
    ],
  },
} as any as ConnectionDictionary;

export const concatConnectionMockId = 'Concat-BB55726B-B2DE-4051-A321-B392383B13FB';
export const sourceMockIdForConcat = 'source-/ns0:Root/DirectTranslation/EmployeeName';

export const unlimitedFunctionInputConnection: ConnectionDictionary = {
  concatConnectionMockId: {
    self: {
      node: {
        key: 'Concat',
        maxNumberOfInputs: -1,
        functionName: 'concat',
        outputValueType: 'Any',
        inputs: [
          {
            name: '',
            allowedTypes: ['Any'],
            isOptional: false,
            allowCustomInput: true,
            placeHolder: '',
          },
        ],
        displayName: 'Concat',
        category: 'String',
        description: 'Combines two or more strings and returns the combined string.',
        children: [],
        position: {
          x: 460,
          y: 175,
        },
        isNewNode: true,
      },
      reactFlowKey: 'Concat-BB55726B-B2DE-4051-A321-B392383B13FB',
    },
    inputs: {
      '0': [
        {
          reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeID',
          node: {
            key: '/ns0:Root/DirectTranslation/EmployeeID',
            name: 'EmployeeID',
            type: 'Decimal',
            properties: 'None',
            qName: 'EmployeeID',
            parentKey: '/ns0:Root/DirectTranslation',
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
                key: '/ns0:Root/DirectTranslation',
                name: 'DirectTranslation',
                qName: 'DirectTranslation',
                repeating: false,
              },
              {
                key: '/ns0:Root/DirectTranslation/EmployeeID',
                name: 'EmployeeID',
                qName: 'EmployeeID',
                repeating: false,
              },
            ],
          },
        },
        {
          reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeName',
          node: {
            key: '/ns0:Root/DirectTranslation/EmployeeName',
            name: 'EmployeeName',
            type: 'String',
            properties: 'None',
            qName: 'EmployeeName',
            parentKey: '/ns0:Root/DirectTranslation',
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
                key: '/ns0:Root/DirectTranslation',
                name: 'DirectTranslation',
                qName: 'DirectTranslation',
                repeating: false,
              },
              {
                key: '/ns0:Root/DirectTranslation/EmployeeName',
                name: 'EmployeeName',
                qName: 'EmployeeName',
                repeating: false,
              },
            ],
          },
        },
        {
          reactFlowKey: 'source-/ns0:Root/DataTranslation/Employee/FirstName',
          node: {
            key: '/ns0:Root/DataTranslation/Employee/FirstName',
            name: 'FirstName',
            type: 'String',
            properties: 'None',
            qName: 'FirstName',
            parentKey: '/ns0:Root/DataTranslation/Employee',
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
                key: '/ns0:Root/DataTranslation',
                name: 'DataTranslation',
                qName: 'DataTranslation',
                repeating: false,
              },
              {
                key: '/ns0:Root/DataTranslation/Employee',
                name: 'Employee',
                qName: 'Employee',
                repeating: false,
              },
              {
                key: '/ns0:Root/DataTranslation/Employee/FirstName',
                name: 'FirstName',
                qName: 'FirstName',
                repeating: false,
              },
            ],
          },
        },
      ],
    },
    outputs: [],
  },
};
