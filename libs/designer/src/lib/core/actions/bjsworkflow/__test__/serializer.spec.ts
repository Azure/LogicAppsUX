import type { SerializedParameter } from '../serializer';
import { constructInputValues } from '../serializer';

describe('constructInputValues', () => {
  const simpleArrayParametersBase = [
    {
      parameterKey: 'body.$.children.[*].name',
      parameterName: 'children.name',
      id: 'children.name',
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'name',
      required: false,
      showTokens: false,
      type: 'string',
    },
    {
      parameterKey: 'body.$.children.[*].id',
      parameterName: 'children.id',
      id: 'children.id',
      required: false,
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'id',
      type: 'number',
    },
  ];

  const rootArrayWithNestedObjectParametersBase = [
    {
      parameterKey: 'body.$.[*].items.firstlevel.tags.[*]',
      parameterName: 'items.firstlevel.tags.[*]',
      id: 'items.firstlevel.tags.[*]',
      info: {
        format: '',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'Body',
      required: false,
      showTokens: false,
      type: 'string',
    },
    {
      parameterKey: 'body.$.[*].items.firstlevel.secondlevel.title',
      parameterName: 'items.firstlevel.secondlevel.title',
      id: 'items.firstlevel.secondlevel.title',
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'title',
      required: false,
      showTokens: false,
      type: 'string',
    },
    {
      parameterKey: 'body.$.[*].items.firstlevel.secondlevel.thirdlevel.id',
      parameterName: 'items.firstlevel.secondlevel.thirdlevel.id',
      id: 'items.firstlevel.secondlevel.thirdlevel.id',
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'id',
      required: false,
      showTokens: false,
      type: 'number',
    },
    {
      parameterKey: 'body.$.[*].items.firstlevel.secondlevel.children.[*].lastname',
      parameterName: 'items.firstlevel.secondlevel.children.lastname',
      id: 'items.firstlevel.secondlevel.children.lastname',
      info: {
        format: '',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'lastname',
      required: false,
      showTokens: false,
      type: 'string',
    },
    {
      parameterKey: 'body.$.[*].items.firstlevel.name',
      parameterName: 'items.firstlevel.name',
      id: 'items.firstlevel.name',
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'name',
      required: false,
      showTokens: false,
      type: 'string',
    },
    {
      parameterKey: 'body.$.[*].items.firstlevel.desc',
      parameterName: 'items.firstlevel.desc',
      id: 'items.firstlevel.desc',
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'desc',
      required: false,
      showTokens: false,
      type: 'string',
    },
  ];

  const rootNestedArrayParametersBase = [
    {
      parameterKey: 'body.$.[*].name',
      parameterName: 'name',
      id: 'name',
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'name',
      required: true,
      showTokens: false,
      type: 'string',
    },
    {
      parameterKey: 'body.$.[*].id',
      parameterName: 'id',
      id: 'id',
      info: {
        format: '',
        in: 'body',
        isDynamic: false,
        parentProperty: {
          optional: true,
        },
      },
      label: 'id',
      required: true,
      showTokens: false,
      type: 'number',
    },
    {
      parameterKey: 'body.$.[*].children.[*].title',
      parameterName: 'children.title',
      id: 'children.title',
      info: {
        format: '',
        isDynamic: false,
        parentProperty: {
          optional: false,
        },
      },
      label: 'title',
      required: true,
      showTokens: false,
      type: 'string',
    },
    {
      parameterKey: 'body.$.[*].children.[*].age',
      parameterName: 'children.age',
      id: 'children.age',
      info: {
        format: '',
        isDynamic: false,
        parentProperty: {
          optional: false,
        },
      },
      label: 'age',
      required: true,
      showTokens: false,
      type: 'number',
    },
  ];

  let simpleArrayParameters: SerializedParameter[],
    rootNestedArrayParameters: SerializedParameter[],
    rootArrayWithNestedObjectParameters: SerializedParameter[];

  beforeEach(() => {
    simpleArrayParameters = [
      {
        ...simpleArrayParametersBase[0],
        value: 'original name',
      },
      {
        ...simpleArrayParametersBase[1],
        value: '99999',
      },
    ];

    rootNestedArrayParameters = [
      {
        ...rootNestedArrayParametersBase[0],
        value: 'original name',
      },
      {
        ...rootNestedArrayParametersBase[1],
        value: '99999',
      },
      {
        ...rootNestedArrayParametersBase[2],
        value: 'original title',
      },
      {
        ...rootNestedArrayParametersBase[3],
        value: '8888',
      },
    ];

    rootArrayWithNestedObjectParameters = [
      {
        ...rootArrayWithNestedObjectParametersBase[0],
        value: 'microsoft',
      },
      {
        ...rootArrayWithNestedObjectParametersBase[1],
        value: 'second level title',
      },
      {
        ...rootArrayWithNestedObjectParametersBase[2],
        value: '7777',
      },
      {
        ...rootArrayWithNestedObjectParametersBase[3],
        value: 'second children lastname',
      },
      {
        ...rootArrayWithNestedObjectParametersBase[4],
        value: 'original first level name',
      },
      {
        ...rootArrayWithNestedObjectParametersBase[5],
        value: 'original first level desc',
      },
    ];
  });

  it('should serialize the parameter value correctly for simple array case', () => {
    const inputPath = 'body.$.children';
    const parameters = simpleArrayParameters;

    expect(constructInputValues(inputPath, parameters, false)).toEqual([
      {
        name: 'original name',
        id: 99999,
      },
    ]);
  });

  it('should serialize the parameter value correctly for nested array case', () => {
    const inputPath = 'body.$';
    const parameters = rootNestedArrayParameters;

    expect(constructInputValues(inputPath, parameters, false)).toEqual([
      {
        children: [
          {
            age: 8888,
            title: 'original title',
          },
        ],
        id: 99999,
        name: 'original name',
      },
    ]);
  });

  it('should serialize the parameter value correctly for array with nested object case', () => {
    const inputPath = 'body.$';
    const parameters = rootArrayWithNestedObjectParameters;

    expect(constructInputValues(inputPath, parameters, false)).toEqual([
      {
        items: {
          firstlevel: {
            desc: 'original first level desc',
            name: 'original first level name',
            secondlevel: {
              children: [
                {
                  lastname: 'second children lastname',
                },
              ],
              thirdlevel: {
                id: 7777,
              },
              title: 'second level title',
            },
            tags: ['microsoft'],
          },
        },
      },
    ]);
  });

  it('should serialize the parameter value correctly when array contains internal properties with special characters.', () => {
    const inputPath = 'body.$.peopletonotify';
    const parameters: SerializedParameter[] = [
      {
        info: {},
        id: 'peopletonotify.@odata~1type',
        label: 'peopletonotify.@odata~1type',
        parameterKey: 'body.$.peopletonotify.[*].@odata~1type',
        parameterName: 'peopletonotify.@odata~1type',
        required: false,
        type: 'string',
        value: 'Default value',
      },
      {
        info: {},
        id: 'peopletonotify.Id',
        label: 'peopletonotify Id',
        parameterKey: 'body.$.peopletonotify.[*].Id',
        parameterName: 'peopletonotify.Id',
        required: false,
        type: 'integer',
        value: '1',
      },
    ];

    expect(constructInputValues(inputPath, parameters, false)).toEqual([
      {
        '@@odata.type': 'Default value',
        Id: 1,
      },
    ]);
  });

  it('should serialize the parameter value when only internal properties are filled in for array.', () => {
    const inputPath = 'body.$.peopletonotify';
    const parameters: SerializedParameter[] = [
      {
        info: {},
        id: 'peopletonotify.@odata~1type',
        label: 'peopletonotify.@odata~1type',
        parameterKey: 'body.$.peopletonotify.[*].@odata~1type',
        parameterName: 'peopletonotify.@odata~1type',
        required: false,
        type: 'string',
        value: 'Default value',
      },
      {
        info: {},
        id: 'peopletonotify.Id',
        label: 'peopletonotify Id',
        parameterKey: 'body.$.peopletonotify.[*].Id',
        parameterName: 'peopletonotify.Id',
        required: false,
        type: 'integer',
        value: '',
      },
    ];

    expect(constructInputValues(inputPath, parameters, false)).toEqual([
      {
        '@@odata.type': 'Default value',
        Id: '',
      },
    ]);
  });
});
