import type { DataMapSchema } from '@microsoft/logic-apps-shared';

const ComprehensiveTargetSchema: DataMapSchema = {
  name: 'ComprehensiveTarget.xsd',
  type: 'XML',
  targetNamespace: 'http://tempuri.org/ComprehensiveTarget.xsd',
  namespaces: {
    ns0: 'http://tempuri.org/ComprehensiveTarget.xsd',
    xs: 'http://www.w3.org/2001/XMLSchema',
  },
  schemaTreeRoot: {
    key: '/ns0:TargetSchemaRoot',
    name: 'TargetSchemaRoot',
    qName: 'ns0:TargetSchemaRoot',
    type: 'Complex',
    properties: 'None',
    children: [
      {
        key: '/ns0:TargetSchemaRoot/DirectTranslation',
        name: 'DirectTranslation',
        qName: 'DirectTranslation',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:TargetSchemaRoot/DirectTranslation/FullName',
            name: 'FullName',
            qName: 'FullName',

            type: 'String',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:TargetSchemaRoot/DirectTranslation/NumCorgis',
            name: 'NumCorgis',
            qName: 'NumCorgis',

            type: 'Number',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:TargetSchemaRoot/DirectTranslation/@IsTheNewGuy',
            name: 'IsTheNewGuy',
            qName: '@IsTheNewGuy',

            type: 'Bool',
            properties: 'Attribute',
            children: [],
          },
        ],
      },
      {
        key: '/ns0:TargetSchemaRoot/ContentEnrichment',
        name: 'ContentEnrichment',
        qName: 'ContentEnrichment',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:TargetSchemaRoot/ContentEnrichment/Timestamp',
            name: 'Timestamp',
            qName: 'Timestamp',

            type: 'DateTime',
            properties: 'None',
            children: [],
          },
        ],
      },
      {
        key: '/ns0:TargetSchemaRoot/Transformations',
        name: 'Transformations',
        qName: 'Transformations',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:TargetSchemaRoot/Transformations/FullName',
            name: 'FullName',
            qName: 'FullName',

            type: 'String',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:TargetSchemaRoot/Transformations/NumCoffees',
            name: 'NumCoffees',
            qName: 'NumCoffees',

            type: 'Number',
            properties: 'None',
            children: [],
          },
        ],
      },
      {
        key: '/ns0:TargetSchemaRoot/CustomValues',
        name: 'CustomValues',
        qName: 'CustomValues',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:TargetSchemaRoot/CustomValues/SuperSecretKey',
            name: 'SuperSecretKey',
            qName: 'SuperSecretKey',

            type: 'String',
            properties: 'None',
            children: [],
          },
          {
            key: '/ns0:TargetSchemaRoot/CustomValues/MOTD',
            name: 'MOTD',
            qName: 'MOTD',

            type: 'String',
            properties: 'None',
            children: [],
          },
        ],
      },
      {
        key: '/ns0:TargetSchemaRoot/Conditionals',
        name: 'Conditionals',
        qName: 'Conditionals',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:TargetSchemaRoot/Conditionals/Object',
            name: 'Object',
            qName: 'Object',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:TargetSchemaRoot/Conditionals/Object/MiscProperty',
                name: 'MiscProperty',
                qName: 'MiscProperty',

                type: 'String',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:TargetSchemaRoot/Conditionals/Property',
            name: 'Property',
            qName: 'Property',

            type: 'String',
            properties: 'None',
            children: [],
          },
        ],
      },
      {
        key: '/ns0:TargetSchemaRoot/Looping',
        name: 'Looping',
        qName: 'Looping',

        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:TargetSchemaRoot/Looping/OneToOne',
            name: 'OneToOne',
            qName: 'OneToOne',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Simple/Direct',
                    name: 'Direct',
                    qName: 'Direct',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Simple/FunctionChain',
                    name: 'FunctionChain',
                    qName: 'FunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths',
                name: 'RelativePaths',
                qName: 'RelativePaths',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/DirectRelativePaths',
                    name: 'DirectRelativePaths',
                    qName: 'DirectRelativePaths',

                    type: 'Complex',
                    properties: 'None',
                    children: [
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/DirectRelativePaths/DotAccess',
                        name: 'DotAccess',
                        qName: 'DotAccess',

                        type: 'Any',
                        properties: 'None',
                        children: [],
                      },
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/DirectRelativePaths/Property',
                        name: 'Property',
                        qName: 'Property',

                        type: 'String',
                        properties: 'None',
                        children: [],
                      },
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/DirectRelativePaths/@Attribute',
                        name: 'Attribute',
                        qName: '@Attribute',

                        type: 'String',
                        properties: 'Attribute',
                        children: [],
                      },
                    ],
                  },
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/InFunctionRelativePaths',
                    name: 'InFunctionRelativePaths',
                    qName: 'InFunctionRelativePaths',

                    type: 'Complex',
                    properties: 'None',
                    children: [
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/InFunctionRelativePaths/DotAccess',
                        name: 'DotAccess',
                        qName: 'DotAccess',

                        type: 'Any',
                        properties: 'None',
                        children: [],
                      },
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/InFunctionRelativePaths/Property',
                        name: 'Property',
                        qName: 'Property',

                        type: 'String',
                        properties: 'None',
                        children: [],
                      },
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/OneToOne/RelativePaths/InFunctionRelativePaths/@Attribute',
                        name: 'Attribute',
                        qName: '@Attribute',

                        type: 'String',
                        properties: 'Attribute',
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Index/Direct',
                    name: 'Direct',
                    qName: 'Direct',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Index/FunctionChain',
                    name: 'FunctionChain',
                    qName: 'FunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/Conditional/Direct',
                    name: 'Direct',
                    qName: 'Direct',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToOne/StressTest',
                name: 'StressTest',
                qName: 'StressTest',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/StressTest/Direct',
                    name: 'Direct',
                    qName: 'Direct',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToOne/StressTest/FunctionChain',
                    name: 'FunctionChain',
                    qName: 'FunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            key: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
            name: 'ManyToOne',
            qName: 'ManyToOne',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct',
                    name: 'Direct',
                    qName: 'Direct',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/FunctionChain',
                    name: 'FunctionChain',
                    qName: 'FunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Index/Direct',
                    name: 'Direct',
                    qName: 'Direct',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Index/FunctionChain',
                    name: 'FunctionChain',
                    qName: 'FunctionChain',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Conditional/Direct',
                    name: 'Direct',
                    qName: 'Direct',

                    type: 'String',
                    properties: 'None',
                    children: [],
                  },
                ],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/TODOStressTest',
                name: 'TODOStressTest',
                qName: 'TODOStressTest',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:TargetSchemaRoot/Looping/OneToMany',
            name: 'OneToMany',
            qName: 'OneToMany',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToMany/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/OneToMany/Simple/SimpleChild',
                    name: 'SimpleChild',
                    qName: 'SimpleChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/OneToMany/Simple/SimpleChild/SimpleChildChild',
                        name: 'SimpleChildChild',
                        qName: 'SimpleChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:TargetSchemaRoot/Looping/OneToMany/Simple/SimpleChild/SimpleChildChild/Direct',
                            name: 'Direct',
                            qName: 'Direct',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                          {
                            key: '/ns0:TargetSchemaRoot/Looping/OneToMany/Simple/SimpleChild/SimpleChildChild/FunctionChain',
                            name: 'FunctionChain',
                            qName: 'FunctionChain',

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
                key: '/ns0:TargetSchemaRoot/Looping/OneToMany/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToMany/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/OneToMany/StressTest',
                name: 'StressTest',
                qName: 'StressTest',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:TargetSchemaRoot/Looping/ManyToMany',
            name: 'ManyToMany',
            qName: 'ManyToMany',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple',
                name: 'Simple',
                qName: 'Simple',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild',
                    name: 'SimpleChild',
                    qName: 'SimpleChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild',
                        name: 'SimpleChildChild',
                        qName: 'SimpleChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild/Direct',
                            name: 'Direct',
                            qName: 'Direct',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                          {
                            key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild/FunctionChain',
                            name: 'FunctionChain',
                            qName: 'FunctionChain',

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
                key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Index',
                name: 'Index',
                qName: 'Index',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Index/IndexChild',
                    name: 'IndexChild',
                    qName: 'IndexChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Index/IndexChild/IndexChildChild',
                        name: 'IndexChildChild',
                        qName: 'IndexChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Index/IndexChild/IndexChildChild/Direct',
                            name: 'Direct',
                            qName: 'Direct',

                            type: 'String',
                            properties: 'None',
                            children: [],
                          },
                          {
                            key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Index/IndexChild/IndexChildChild/FunctionChain',
                            name: 'FunctionChain',
                            qName: 'FunctionChain',

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
                key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Conditional',
                name: 'Conditional',
                qName: 'Conditional',

                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Conditional/ConditionalChild',
                    name: 'ConditionalChild',
                    qName: 'ConditionalChild',

                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Conditional/ConditionalChild/ConditionalChildChild',
                        name: 'ConditionalChildChild',
                        qName: 'ConditionalChildChild',

                        type: 'Complex',
                        properties: 'Repeating',
                        children: [
                          {
                            key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/Conditional/ConditionalChild/ConditionalChildChild/Direct',
                            name: 'Direct',
                            qName: 'Direct',

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
                key: '/ns0:TargetSchemaRoot/Looping/ManyToMany/TODOStressTest',
                name: 'TODOStressTest',
                qName: 'TODOStressTest',

                type: 'Complex',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:TargetSchemaRoot/Looping/LoopReduce',
            name: 'LoopReduce',
            qName: 'LoopReduce',

            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:TargetSchemaRoot/Looping/LoopReduce/BestItemName',
                name: 'BestItemName',
                qName: 'BestItemName',

                type: 'String',
                properties: 'None',
                children: [],
              },
            ],
          },
          {
            key: '/ns0:TargetSchemaRoot/Looping/TODOLoopMap',
            name: 'TODOLoopMap',
            qName: 'TODOLoopMap',

            type: 'Complex',
            properties: 'Repeating',
            children: [],
          },
        ],
      },
    ],
  },
};

export default ComprehensiveTargetSchema;
