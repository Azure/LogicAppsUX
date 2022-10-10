import type { ConnectionDictionary } from "../Connection";

export const mockConnectionsWithTwoConnections: ConnectionDictionary = {  // input node, connected to function, connected to output node
      'Average-5EB6992F-9D29-4657-9A8E-93FB4AF79393': {
        sources: [
          {
            node: {
              key: '/ns0:Root/DirectTranslation/EmployeeID',
              name: 'EmployeeID',
              schemaNodeDataType: 'Decimal',
              normalizedDataType: 'Decimal',
              properties: 'NotSpecified',
              fullName: 'EmployeeID',
              parentKey: '/ns0:Root/DirectTranslation',
              children: [],
              pathToRoot: [
                {
                  key: '/ns0:Root',
                  name: 'Root',
                  fullName: 'ns0:Root'
                },
                {
                  key: '/ns0:Root/DirectTranslation',
                  name: 'DirectTranslation',
                  fullName: 'DirectTranslation'
                },
                {
                  key: '/ns0:Root/DirectTranslation/EmployeeID',
                  name: 'EmployeeID',
                  fullName: 'EmployeeID'
                }
              ]
            },
            reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeID'
          }
        ],
        destination: {
          node: {
            key: 'Average',
            maxNumberOfInputs: 2,
            type: 'TransformationFunction',
            functionName: 'avg',
            outputValueType: 'Number',
            inputs: [
              {
                name: 'value',
                allowedTypes: [
                  'Number',
                  'Decimal',
                  'Integer'
                ],
                isOptional: false,
                allowCustomInput: false,
                displayName: 'Value',
                tooltip: 'The value to use',
                placeholder: 'The value'
              },
              {
                name: 'scope',
                allowedTypes: [
                  'Any'
                ],
                isOptional: true,
                allowCustomInput: false,
                displayName: 'Scope',
                tooltip: 'The scope to use',
                placeholder: 'The scope'
              }
            ],
            displayName: 'Average',
            category: 'math',
            description: 'The average between two numbers',
            tooltip: 'The average'
          },
          reactFlowKey: 'Average-5EB6992F-9D29-4657-9A8E-93FB4AF79393'
        }
      },
      'target-/ns0:Root/DirectTranslation/Employee/ID': {
        sources: [
          {
            node: {
              key: 'Average',
              maxNumberOfInputs: 2,
              type: 'TransformationFunction',
              functionName: 'avg',
              outputValueType: 'Number',
              inputs: [
                {
                  name: 'value',
                  allowedTypes: [
                    'Number',
                    'Decimal',
                    'Integer'
                  ],
                  isOptional: false,
                  allowCustomInput: false,
                  displayName: 'Value',
                  tooltip: 'The value to use',
                  placeholder: 'The value'
                },
                {
                  name: 'scope',
                  allowedTypes: [
                    'Any'
                  ],
                  isOptional: true,
                  allowCustomInput: false,
                  displayName: 'Scope',
                  tooltip: 'The scope to use',
                  placeholder: 'The scope'
                }
              ],
              displayName: 'Average',
              category: 'math',
              description: 'The average between two numbers',
              tooltip: 'The average'
            },
            reactFlowKey: 'Average-5EB6992F-9D29-4657-9A8E-93FB4AF79393'
          }
        ],
        destination: {
          node: {
            
            key: '/ns0:Root/DirectTranslation/Employee/ID',
            name: 'ID',
            schemaNodeDataType: 'Decimal',
            normalizedDataType: 'Decimal',
            properties: 'NotSpecified',
            fullName: 'ID',
            parentKey: '/ns0:Root/DirectTranslation/Employee',
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                fullName: 'ns0:Root'
              },
              {
                key: '/ns0:Root/DirectTranslation',
                name: 'DirectTranslation',
                fullName: 'DirectTranslation'
              },
              {
                key: '/ns0:Root/DirectTranslation/Employee',
                name: 'Employee',
                fullName: 'Employee'
              },
              {
                key: '/ns0:Root/DirectTranslation/Employee/ID',
                name: 'ID',
                fullName: 'ID'
              }
            ]
          },
          reactFlowKey: 'target-/ns0:Root/DirectTranslation/Employee/ID'
        }
      }
  }