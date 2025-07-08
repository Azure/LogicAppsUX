import type { DataMapSchema } from '@microsoft/logic-apps-shared';

const ComprehensiveSourceSchema: DataMapSchema = {
  name: 'ComprehensiveSource.xsd',
  type: 'XML',
  targetNamespace: 'http://tempuri.org/ComprehensiveSource.xsd',
  namespaces: {
    ns0: 'http://tempuri.org/ComprehensiveSource.xsd',
    xs: 'http://www.w3.org/2001/XMLSchema',
  },
  schemaTreeRoot: {
    key: '/ns0:SourceSchemaRoot',
    name: 'SourceSchemaRoot',
    qName: 'ns0:SourceSchemaRoot',
    type: 'Complex',
    properties: 'None',
    children: [
      {
        key: '/ns0:SourceSchemaRoot/DirectTranslation',
        name: 'DirectTranslation',
        qName: 'DirectTranslation',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:SourceSchemaRoot/DirectTranslation/SourceFullName',
            name: 'SourceFullName',
            qName: 'SourceFullName',

            type: 'String',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:SourceSchemaRoot/DirectTranslation/SourceNumCorgis',
            name: 'SourceNumCorgis',
            qName: 'SourceNumCorgis',

            type: 'Number',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:SourceSchemaRoot/DirectTranslation/@SourceIsTheNewGuy',
            name: 'SourceIsTheNewGuy',
            qName: '@SourceIsTheNewGuy',

            type: 'Bool',
            properties: 'Attribute',
            children: [],
          },
        ],
      },
      {
        key: '/ns0:SourceSchemaRoot/Transformations',
        name: 'Transformations',
        qName: 'Transformations',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:SourceSchemaRoot/Transformations/FirstName',
            name: 'FirstName',
            qName: 'FirstName',

            type: 'String',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:SourceSchemaRoot/Transformations/LastName',
            name: 'LastName',
            qName: 'LastName',

            type: 'String',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:SourceSchemaRoot/Transformations/AssignedTasks',
            name: 'AssignedTasks',
            qName: 'AssignedTasks',

            type: 'Number',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:SourceSchemaRoot/Transformations/SleepDeprivationLevel',
            name: 'SleepDeprivationLevel',
            qName: 'SleepDeprivationLevel',

            type: 'Number',
            properties: 'None',
            children: [],
          },
        ],
      },
      {
        key: '/ns0:SourceSchemaRoot/Conditionals',
        name: 'Conditionals',
        qName: 'Conditionals',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:SourceSchemaRoot/Conditionals/SourceObject',
            name: 'SourceObject',
            qName: 'SourceObject',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Conditionals/SourceObject/SourceProperty',
                name: 'SourceProperty',
                qName: 'SourceProperty',

                type: 'String',
                properties: 'None',
                children: [],
              },
            ],
          },
        ],
      },
      {
        key: '/ns0:SourceSchemaRoot/Looping',
        name: 'Looping',
        qName: 'Looping',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:SourceSchemaRoot/Looping/OneToOne',
            name: 'OneToOne',
            qName: 'OneToOne',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Simple/SourceDirect',
                    name: 'SourceDirect',
                    qName: 'SourceDirect',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Simple/SourceFunctionChain',
                    name: 'SourceFunctionChain',
                    qName: 'SourceFunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToOne/RelativePaths',
                name: 'RelativePaths',
                qName: 'RelativePaths',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/RelativePaths/SourceProperty',
                    name: 'SourceProperty',
                    qName: 'SourceProperty',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/RelativePaths/@SourceAttribute',
                    name: 'SourceAttribute',
                    qName: '@SourceAttribute',

                    type: 'String',
                    properties: 'Attribute',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Index/SourceDirect',
                    name: 'SourceDirect',
                    qName: 'SourceDirect',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Index/SourceFunctionChain',
                    name: 'SourceFunctionChain',
                    qName: 'SourceFunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/Conditional/SourceDirect',
                    name: 'SourceDirect',
                    qName: 'SourceDirect',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest',
                name: 'StressTest',
                qName: 'StressTest',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest/SourceDirect',
                    name: 'SourceDirect',
                    qName: 'SourceDirect',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest/@SourceFunctionChain',
                    name: 'SourceFunctionChain',
                    qName: '@SourceFunctionChain',

                    type: 'String',
                    properties: 'Attribute',
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
            name: 'ManyToOne',
            qName: 'ManyToOne',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                    name: 'SourceSimpleChild',
                    qName: 'SourceSimpleChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                        name: 'SourceSimpleChildChild',
                        qName: 'SourceSimpleChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect',
                            name: 'SourceDirect',
                            qName: 'SourceDirect',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceFunctionChain',
                            name: 'SourceFunctionChain',
                            qName: 'SourceFunctionChain',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Index/SourceIndexChild',
                    name: 'SourceIndexChild',
                    qName: 'SourceIndexChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Index/SourceIndexChild/SourceIndexChildChild',
                        name: 'SourceIndexChildChild',
                        qName: 'SourceIndexChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Index/SourceIndexChild/SourceIndexChildChild/SourceDirect',
                            name: 'SourceDirect',
                            qName: 'SourceDirect',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Index/SourceIndexChild/SourceIndexChildChild/SourceFunctionChain',
                            name: 'SourceFunctionChain',
                            qName: 'SourceFunctionChain',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Conditional/SourceConditionalChild',
                    name: 'SourceConditionalChild',
                    qName: 'SourceConditionalChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Conditional/SourceConditionalChild/SourceConditionalChildChild',
                        name: 'SourceConditionalChildChild',
                        qName: 'SourceConditionalChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Conditional/SourceConditionalChild/SourceConditionalChildChild/SourceDirect',
                            name: 'SourceDirect',
                            qName: 'SourceDirect',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/StressTest',
                name: 'StressTest',
                qName: 'StressTest',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:SourceSchemaRoot/Looping/OneToMany',
            name: 'OneToMany',
            qName: 'OneToMany',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToMany/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToMany/Simple/SourceDirect',
                    name: 'SourceDirect',
                    qName: 'SourceDirect',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/OneToMany/Simple/SourceFunctionChain',
                    name: 'SourceFunctionChain',
                    qName: 'SourceFunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToMany/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToMany/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/OneToMany/StressTest',
                name: 'StressTest',
                qName: 'StressTest',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:SourceSchemaRoot/Looping/ManyToMany',
            name: 'ManyToMany',
            qName: 'ManyToMany',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild',
                    name: 'SourceSimpleChild',
                    qName: 'SourceSimpleChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild',
                        name: 'SourceSimpleChildChild',
                        qName: 'SourceSimpleChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect',
                            name: 'SourceDirect',
                            qName: 'SourceDirect',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceFunctionChain',
                            name: 'SourceFunctionChain',
                            qName: 'SourceFunctionChain',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Index/SourceIndexChild',
                    name: 'SourceIndexChild',
                    qName: 'SourceIndexChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Index/SourceIndexChild/SourceIndexChildChild',
                        name: 'SourceIndexChildChild',
                        qName: 'SourceIndexChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Index/SourceIndexChild/SourceIndexChildChild/SourceDirect',
                            name: 'SourceDirect',
                            qName: 'SourceDirect',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Index/SourceIndexChild/SourceIndexChildChild/SourceFunctionChain',
                            name: 'SourceFunctionChain',
                            qName: 'SourceFunctionChain',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Conditional/SourceConditionalChild',
                    name: 'SourceConditionalChild',
                    qName: 'SourceConditionalChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Conditional/SourceConditionalChild/SourceConditionalChildChild',
                        name: 'SourceConditionalChildChild',
                        qName: 'SourceConditionalChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/Conditional/SourceConditionalChild/SourceConditionalChildChild/SourceDirect',
                            name: 'SourceDirect',
                            qName: 'SourceDirect',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToMany/StressTest',
                name: 'StressTest',
                qName: 'StressTest',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:SourceSchemaRoot/Looping/LoopReduce',
            name: 'LoopReduce',
            qName: 'LoopReduce',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Looping/LoopReduce/ItemsList',
                name: 'ItemsList',
                qName: 'ItemsList',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/LoopReduce/ItemsList/ItemName',
                    name: 'ItemName',
                    qName: 'ItemName',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            key: '/ns0:SourceSchemaRoot/Looping/TODO-LoopMap',
            name: 'TODO-LoopMap',
            qName: 'TODO-LoopMap',

            type: 'Complex',
            properties: 'None',
            children: [],
          },
        ],
      },
    ],
  },
};

export default ComprehensiveSourceSchema;
