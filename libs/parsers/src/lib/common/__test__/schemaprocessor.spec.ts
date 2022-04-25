import { SchemaProcessor } from '../schemaprocessor';

type SchemaObject = OpenAPIV2.SchemaObject;

describe('SchemaProcessor Tests', () => {
  for (const type of ['boolean', 'integer', 'null', 'number', 'string', 'object']) {
    it(`should return $ as the key for type ${type}.`, () => {
      const schema = {
        type,
      };

      const parameters = new SchemaProcessor().getSchemaProperties(schema);

      expect(parameters.length).toBe(1);

      const root = parameters[0];
      expect(root.key).toBe('$');
      expect(root.type).toBe(type);
    });
  }

  it('should expand oneof properties properly.', () => {
    const schema = {
      oneOf: [
        {
          'x-ms-oneof-title': 'address',
          'x-ms-oneof-unique-properties': ['address'],
          type: 'object',
          properties: {
            address: {
              type: 'string',
            },
          },
        },
        {
          'x-ms-oneof-title': 'people',
          'x-ms-oneof-unique-properties': ['people'],
          type: 'object',
          properties: {
            people: {
              type: 'string',
            },
          },
        },
      ],
    } as SchemaObject;

    const schemaProperties = new SchemaProcessor({ expandOneOf: true }).getSchemaProperties(schema);

    expect(schemaProperties.length).toBe(1);

    const address = schemaProperties[0];
    expect(address.key).toBe('$.address');
    expect(address.type).toBe('string');
  });

  it('should not expand oneof properties by default.', () => {
    const schema = {
      oneOf: [
        {
          'x-ms-oneof-title': 'address',
          'x-ms-oneof-unique-properties': ['address'],
          type: 'object',
          properties: {
            address: {
              type: 'string',
            },
          },
        },
        {
          'x-ms-oneof-title': 'people',
          'x-ms-oneof-unique-properties': ['people'],
          type: 'object',
          properties: {
            people: {
              type: 'string',
            },
          },
        },
      ],
    } as SchemaObject;

    const schemaProperties = new SchemaProcessor().getSchemaProperties(schema);

    expect(schemaProperties.length).toBe(1);

    const address = schemaProperties[0];
    expect(address.key).toBe('$');
    expect(address.type).toBe('any');
  });

  it('should return key correctly for type array when expanding array outputs.', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
          },
        },
      },
    } as SchemaObject;

    const parameters = new SchemaProcessor().getSchemaProperties(schema);

    expect(parameters.length).toBe(3);

    const foo = parameters[0];
    expect(foo.key).toBe('$.[*].foo');
    expect(foo.type).toBe('string');

    const root = parameters[1];
    expect(root.key).toBe('$');
    expect(root.type).toBe('array');

    const item = parameters[2];
    expect(item.key).toBe('$.[*]');
    expect(item.type).toBe('object');
  });

  it('should return key correctly for multiple levels nested array when expanding array outputs.', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'array',
        items: {
          type: 'number',
        },
      },
      title: 'Some array',
    } as SchemaObject;

    const parameters = new SchemaProcessor({
      expandArrayOutputs: true,
      expandArrayOutputsDepth: 1000,
    }).getSchemaProperties(schema);

    expect(parameters.length).toBe(3);

    const grandItem = parameters[0];
    expect(grandItem.key).toBe('$.[*].[*]');
    expect(grandItem.title).toBe('Some array Item');
    expect(grandItem.type).toBe('number');

    const root = parameters[1];
    expect(root.key).toBe('$');
    expect(root.title).toBe('Some array');
    expect(root.type).toBe('array');

    const childItem = parameters[2];
    expect(childItem.key).toBe('$.[*]');
    expect(childItem.title).toBe('Some array Item');
    expect(childItem.type).toBe('array');
  });

  it('should return key correctly for type array when items not specified.', () => {
    const schema = {
      type: 'array',
    } as SchemaObject;

    const parameters = new SchemaProcessor().getSchemaProperties(schema);

    expect(parameters.length).toBe(2);

    const root = parameters[0];
    expect(root.key).toBe('$');
    expect(root.type).toBe('array');

    const item = parameters[1];
    expect(item.key).toBe('$.[*]');
    expect(item.type).toBe('any');
  });

  it('should return key correctly for empty schema with only desciption.', () => {
    const schema = {
      description: 'foo',
    } as SchemaObject;

    const parameters = new SchemaProcessor().getSchemaProperties(schema);

    expect(parameters.length).toBe(1);

    const root = parameters[0];
    expect(root.key).toBe('$');
    expect(root.type).toBe('any');
  });

  it('should return key correctly for empty schema with object property schema missing type.', () => {
    const schema = {
      type: 'object',
      properties: {
        body: {},
      },
    } as SchemaObject;

    const parameters = new SchemaProcessor().getSchemaProperties(schema);

    expect(parameters.length).toBe(1);

    const root = parameters[0];
    expect(root.key).toBe('$.body');
    expect(root.type).toBe('any');
  });

  it('should return key correctly for type array when not expanding array outputs.', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'string',
      },
    };

    const options = {
      expandArrayOutputs: false,
    };
    const parameters = new SchemaProcessor(options).getSchemaProperties(schema);

    expect(parameters.length).toBe(1);

    const root = parameters[0];
    expect(root.key).toBe('$');
    expect(root.type).toBe('array');
  });

  it('should return key correctly for nested object when includeParentObject is true.', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        foo: {
          type: 'string',
        },
        bar: {
          type: 'integer',
        },
      },
      additionalProperties: true,
    };

    const options = {
      includeParentObject: true,
    };
    const parameters = new SchemaProcessor(options).getSchemaProperties(schema);

    expect(parameters.length).toBe(3);

    const foo = parameters[0];
    expect(foo.key).toBe('$.foo');
    expect(foo.type).toBe('string');

    const bar = parameters[1];
    expect(bar.key).toBe('$.bar');
    expect(bar.type).toBe('integer');

    const root = parameters[2];
    expect(root.key).toBe('$');
    expect(root.type).toBe('object');
  });

  it('should return key correctly for nested array when includeParentObject is true.', () => {
    const schema: SchemaObject = {
      type: 'array',
      items: {
        properties: {
          foo: {
            type: 'string',
          },
          bar: {
            type: 'integer',
          },
        },
        type: 'object',
      },
      additionalProperties: true,
    };

    const options = {
      includeParentObject: true,
      expandArrayOutputs: true,
      expandNestedArrayOutputs: true,
    };

    const parameters = new SchemaProcessor(options).getSchemaProperties(schema);

    expect(parameters.length).toBe(5);

    const foo = parameters[0];
    expect(foo.key).toBe('$.[*].foo');
    expect(foo.type).toBe('string');

    const bar = parameters[1];
    expect(bar.key).toBe('$.[*].bar');
    expect(bar.type).toBe('integer');

    const item = parameters[2];
    expect(item.key).toBe('$.[*]');
    expect(item.type).toBe('object');

    const root = parameters[3];
    expect(root.key).toBe('$');
    expect(root.type).toBe('array');

    const parent = parameters[4];
    expect(parent.key).toBe('$.[*]');
    expect(parent.type).toBe('object');
  });

  it('should return key correctly for nested object when includeParentObject is false.', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        foo: {
          type: 'string',
        },
        bar: {
          type: 'integer',
        },
      },
      additionalProperties: true,
    };

    const options = {
      includeParentObject: false,
    };
    const parameters = new SchemaProcessor(options).getSchemaProperties(schema);

    expect(parameters.length).toBe(2);

    const foo = parameters[0];
    expect(foo.key).toBe('$.foo');
    expect(foo.type).toBe('string');

    const bar = parameters[1];
    expect(bar.key).toBe('$.bar');
    expect(bar.type).toBe('integer');
  });

  it('should return correctly encoded key.', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        '~0.[*': {
          type: 'string',
        },
      },
    };

    const properties = new SchemaProcessor().getSchemaProperties(schema);

    expect(properties.length).toBe(1);

    const property = properties[0];
    expect(property.key).toBe('$.~00~1~2~3');
    expect(property.type).toBe('string');
  });

  it('should return correct title summary for object', () => {
    const schemaWithNestObject: SchemaObject = {
      type: 'object',
      properties: {
        Row: {
          type: 'object',
          properties: {
            AddressLine1: {
              title: 'Address Line 1',
              type: 'string',
            },
            FirmName: {
              type: 'string',
            },
          },
        },
      },
    };

    const schemaWithNestObjectSummary: SchemaObject = {
      type: 'object',
      properties: {
        Row: {
          type: 'object',
          'x-ms-summary': 'Summary for Row object',
          properties: {
            AddressLine1: {
              title: 'Address Line 1',
              type: 'string',
            },
            FirmName: {
              type: 'string',
            },
          },
        },
      },
    };

    const schemaWithGrandLevelObjectSummary: SchemaObject = {
      type: 'object',
      'x-ms-summary': 'Parent',
      properties: {
        signedDocumentInfo: {
          type: 'object',
          'x-ms-summary': 'Child',
          properties: {
            document: {
              description: 'A base64 encoded string of the signed document',
              type: 'string',
              'x-ms-summary': 'Grand child',
              'x-ms-visibility': 'important',
            },
          },
        },
      },
    };

    const schemaWithGrandLevelArrayWithSummary: SchemaObject = {
      type: 'object',
      'x-ms-summary': 'Parent',
      properties: {
        Row: {
          type: 'array',
          'x-ms-summary': 'Child',
          items: {
            type: 'object',
            properties: {
              AddressLine1: {
                title: 'Address Line 1',
                type: 'string',
              },
              FirmName: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const schemaWithNestArray: SchemaObject = {
      type: 'object',
      properties: {
        Row: {
          type: 'array',
          title: 'Array Title',
          items: {
            type: 'object',
            properties: {
              AddressLine1: {
                title: 'Address Line 1',
                type: 'string',
              },
              FirmName: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const schemaWithNestArrayTitle: SchemaObject = {
      type: 'object',
      title: 'Object',
      properties: {
        Row: {
          type: 'array',
          title: 'Array Title',
          items: {
            type: 'object',
            properties: {
              AddressLine1: {
                title: 'Address Line 1',
                type: 'string',
              },
              FirmName: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const schemaWithNestArrayItemTitle: SchemaObject = {
      type: 'object',
      title: 'Object',
      properties: {
        Row: {
          type: 'array',
          items: {
            title: 'Item Title',
            type: 'object',
            properties: {
              AddressLine1: {
                title: 'Address Line 1',
                type: 'string',
              },
              FirmName: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const schemaWithNestArrayBothTitle: SchemaObject = {
      type: 'object',
      title: 'Object',
      properties: {
        Row: {
          type: 'array',
          title: 'Array Title',
          items: {
            title: 'Item Title',
            type: 'object',
            properties: {
              AddressLine1: {
                title: 'Address Line 1',
                type: 'string',
              },
              FirmName: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const propertiesForSchemaWithNestObject = new SchemaProcessor().getSchemaProperties(schemaWithNestObject);
    expect(propertiesForSchemaWithNestObject.length).toBe(2);
    const addressLine1InObject = propertiesForSchemaWithNestObject[0];
    const firmNameInObject = propertiesForSchemaWithNestObject[1];

    expect(addressLine1InObject.key).toBe('$.Row.AddressLine1');
    expect(addressLine1InObject.name).toBe('Row.AddressLine1');
    expect(addressLine1InObject.title).toBe('Address Line 1');
    expect(addressLine1InObject.summary).toBe('');

    expect(firmNameInObject.key).toBe('$.Row.FirmName');
    expect(firmNameInObject.name).toBe('Row.FirmName');
    expect(firmNameInObject.title).toBe('FirmName');
    expect(firmNameInObject.summary).toBe('');

    const propertiesForSchemaWithNestObjectSummary = new SchemaProcessor().getSchemaProperties(schemaWithNestObjectSummary);
    expect(propertiesForSchemaWithNestObjectSummary.length).toBe(2);
    const addressLine1InObjectSummary = propertiesForSchemaWithNestObjectSummary[0];
    const firmNameInObjectSummary = propertiesForSchemaWithNestObjectSummary[1];

    expect(addressLine1InObjectSummary.key).toBe('$.Row.AddressLine1');
    expect(addressLine1InObjectSummary.name).toBe('Row.AddressLine1');
    expect(addressLine1InObjectSummary.title).toBe('Summary for Row object Address Line 1');
    expect(addressLine1InObjectSummary.summary).toBe('');

    expect(firmNameInObjectSummary.key).toBe('$.Row.FirmName');
    expect(firmNameInObjectSummary.name).toBe('Row.FirmName');
    expect(firmNameInObjectSummary.title).toBe('Summary for Row object FirmName');
    expect(firmNameInObjectSummary.summary).toBe('');

    const propertiesForSchemaWithNestArray = new SchemaProcessor().getSchemaProperties(schemaWithNestArray);
    expect(propertiesForSchemaWithNestArray.length).toBe(4);
    const addressLine1InArray = propertiesForSchemaWithNestArray[0];
    const firmNameInArray = propertiesForSchemaWithNestArray[1];
    const rowArray = propertiesForSchemaWithNestArray[2];
    const rowItemInArray = propertiesForSchemaWithNestArray[3];

    expect(addressLine1InArray.key).toBe('$.Row.[*].AddressLine1');
    expect(addressLine1InArray.name).toBe('AddressLine1');
    expect(addressLine1InArray.title).toBe('Array Title Address Line 1');
    expect(addressLine1InArray.summary).toBe('');

    expect(firmNameInArray.key).toBe('$.Row.[*].FirmName');
    expect(firmNameInArray.name).toBe('FirmName');
    expect(firmNameInArray.title).toBe('Array Title FirmName');
    expect(firmNameInArray.summary).toBe('');

    expect(rowArray.key).toBe('$.Row');
    expect(rowArray.name).toBe('Row');
    expect(rowArray.title).toBe('Array Title');
    expect(rowArray.summary).toBe('');
    expect(rowArray.type).toBe('array');

    expect(rowItemInArray.key).toBe('$.Row.[*]');
    expect(rowItemInArray.name).toBe('Row-key-item-output');
    expect(rowItemInArray.title).toBe('Array Title Item');
    expect(rowItemInArray.summary).toBe('');
    expect(rowItemInArray.type).toBe('object');

    const propertiesForSchemaWithNestArrayTitle = new SchemaProcessor().getSchemaProperties(schemaWithNestArrayTitle);
    expect(propertiesForSchemaWithNestArrayTitle.length).toBe(4);

    const addressLine1InArrayTitle = propertiesForSchemaWithNestArrayTitle[0];
    const firmNameInArrayTitle = propertiesForSchemaWithNestArrayTitle[1];
    const rowItemInArrayTitle = propertiesForSchemaWithNestArrayTitle[2];

    expect(addressLine1InArrayTitle.key).toBe('$.Row.[*].AddressLine1');
    expect(addressLine1InArrayTitle.name).toBe('AddressLine1');
    expect(addressLine1InArrayTitle.title).toBe('Object Array Title Address Line 1');
    expect(addressLine1InArrayTitle.summary).toBe('');

    expect(firmNameInArrayTitle.key).toBe('$.Row.[*].FirmName');
    expect(firmNameInArrayTitle.name).toBe('FirmName');
    expect(firmNameInArrayTitle.title).toBe('Object Array Title FirmName');
    expect(firmNameInArrayTitle.summary).toBe('');

    expect(rowItemInArrayTitle.key).toBe('$.Row');
    expect(rowItemInArrayTitle.name).toBe('Row');
    expect(rowItemInArrayTitle.title).toBe('Object Array Title');
    expect(rowItemInArrayTitle.summary).toBe('');
    expect(rowItemInArrayTitle.type).toBe('array');

    const propertiesForSchemaWithNestArrayItemTitle = new SchemaProcessor().getSchemaProperties(schemaWithNestArrayItemTitle);
    expect(propertiesForSchemaWithNestArrayItemTitle.length).toBe(4);

    const addressLine1InArrayItemTitle = propertiesForSchemaWithNestArrayItemTitle[0];
    const firmNameInArrayItemTitle = propertiesForSchemaWithNestArrayItemTitle[1];
    const rowItemInArrayItemTitle = propertiesForSchemaWithNestArrayItemTitle[2];

    expect(addressLine1InArrayItemTitle.key).toBe('$.Row.[*].AddressLine1');
    expect(addressLine1InArrayItemTitle.title).toBe('Object Item Title Address Line 1');

    expect(firmNameInArrayItemTitle.key).toBe('$.Row.[*].FirmName');
    expect(firmNameInArrayItemTitle.title).toBe('Object Item Title FirmName');

    expect(rowItemInArrayItemTitle.key).toBe('$.Row');
    expect(rowItemInArrayItemTitle.title).toBe('Object Row');
    expect(rowItemInArrayItemTitle.summary).toBe('');

    const propertiesForSchemaWithNestArrayBothTitle = new SchemaProcessor().getSchemaProperties(schemaWithNestArrayBothTitle);
    expect(propertiesForSchemaWithNestArrayBothTitle.length).toBe(4);

    const addressLine1InArrayBothTitle = propertiesForSchemaWithNestArrayBothTitle[0];
    const firmNameInArrayBothTitle = propertiesForSchemaWithNestArrayBothTitle[1];
    const rowItemInArrayBothTitle = propertiesForSchemaWithNestArrayBothTitle[2];

    expect(addressLine1InArrayBothTitle.key).toBe('$.Row.[*].AddressLine1');
    expect(addressLine1InArrayBothTitle.title).toBe('Object Item Title Address Line 1');

    expect(firmNameInArrayBothTitle.key).toBe('$.Row.[*].FirmName');
    expect(firmNameInArrayBothTitle.title).toBe('Object Item Title FirmName');

    expect(rowItemInArrayBothTitle.key).toBe('$.Row');
    expect(rowItemInArrayBothTitle.title).toBe('Object Array Title');
    expect(rowItemInArrayBothTitle.summary).toBe('');

    const propertiesForSchemaWithGrandLevelSchema = new SchemaProcessor().getSchemaProperties(schemaWithGrandLevelObjectSummary);
    expect(propertiesForSchemaWithGrandLevelSchema.length).toBe(1);
    const grandChildProperty = propertiesForSchemaWithGrandLevelSchema[0];

    expect(grandChildProperty.key).toBe('$.signedDocumentInfo.document');
    expect(grandChildProperty.summary).toBe('Parent Child Grand child');
    expect(grandChildProperty.title).toBe('Parent Child Grand child');

    const propertiesForSchemaWithGrandNestArray = new SchemaProcessor().getSchemaProperties(schemaWithGrandLevelArrayWithSummary);
    expect(propertiesForSchemaWithGrandNestArray.length).toBe(4);
    const addressLine1InGrantNestArray = propertiesForSchemaWithGrandNestArray[0];
    const firmNameInGrantNestArray = propertiesForSchemaWithGrandNestArray[1];
    const rowGrantNestArray = propertiesForSchemaWithGrandNestArray[2];
    const rowItemInGrantNestArray = propertiesForSchemaWithGrandNestArray[3];

    expect(addressLine1InGrantNestArray.key).toBe('$.Row.[*].AddressLine1');
    expect(addressLine1InGrantNestArray.name).toBe('AddressLine1');
    expect(addressLine1InGrantNestArray.title).toBe('Parent Child Address Line 1');
    expect(addressLine1InGrantNestArray.summary).toBe('');

    expect(firmNameInGrantNestArray.key).toBe('$.Row.[*].FirmName');
    expect(firmNameInGrantNestArray.name).toBe('FirmName');
    expect(firmNameInGrantNestArray.title).toBe('Parent Child FirmName');
    expect(firmNameInGrantNestArray.summary).toBe('');

    expect(rowGrantNestArray.key).toBe('$.Row');
    expect(rowGrantNestArray.name).toBe('Row');
    expect(rowGrantNestArray.title).toBe('Parent Child');
    expect(rowGrantNestArray.summary).toBe('Parent Child');
    expect(rowGrantNestArray.type).toBe('array');

    expect(rowItemInGrantNestArray.key).toBe('$.Row.[*]');
    expect(rowItemInGrantNestArray.name).toBe('Row-key-item-output');
    expect(rowItemInGrantNestArray.title).toBe('Parent Child Item');
    expect(rowItemInGrantNestArray.summary).toBe('');
    expect(rowItemInGrantNestArray.type).toBe('object');
  });

  it('should return correct title summary for primitive array items', () => {
    const processor = new SchemaProcessor({
      arrayOutputDepth: 0,
      currentKey: '[*]',
      expandArrayOutputs: false,
      expandArrayOutputsDepth: 0,
      isInputSchema: true,
      keyPrefix: 'body.$.labels.[*]',
      parentProperty: {
        arrayName: 'labels',
        isArray: true,
      },
      prefix: 'labels',
      titlePrefix: 'Labels',
      summaryPrefix: 'Labels',
    });

    const properties = processor.getSchemaProperties({ type: 'string' });

    expect(properties.length).toEqual(1);
    expect(properties[0]).toEqual(
      expect.objectContaining({
        key: 'body.$.labels.[*]',
        name: 'labels.[*]',
        parentArray: 'labels',
        isInsideArray: true,
        required: false,
        summary: '',
        title: 'Labels Item',
        type: 'string',
      })
    );
  });

  it('should not process complex internal array and object parameters further.', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        array: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              a1: {
                type: 'string',
              },
              a2: {
                type: 'boolean',
              },
            },
          },
          'x-ms-visibility': 'internal',
        },
        object: {
          type: 'object',
          properties: {
            p1: {
              type: 'string',
            },
            p2: {
              type: 'string',
              readOnly: true,
            },
          },
        },
        primitive: {
          type: 'string',
          'x-ms-visibility': 'internal',
        },
        complex: {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
            },
            bar: {
              type: 'integer',
            },
          },
          'x-ms-visibility': 'internal',
          default: {
            foo: 'FOO',
            bar: 123,
          },
        },
      },
    };

    const options = {
      expandArrayOutputs: false,
      isInputSchema: true,
      excludeInternal: false,
    };

    let parameters = new SchemaProcessor(options).getSchemaProperties(schema);

    expect(parameters.length).toBe(4);

    let array = parameters[0];
    expect(array.key).toBe('$.array');
    expect(array.type).toBe('array');

    let p1 = parameters[1];
    expect(p1.key).toBe('$.object.p1');
    expect(p1.type).toBe('string');

    let primitive = parameters[2];
    expect(primitive.key).toBe('$.primitive');
    expect(primitive.type).toBe('string');

    let complex = parameters[3];
    expect(complex.key).toBe('$.complex');
    expect(complex.type).toBe('object');
    expect(complex.default).toEqual({
      foo: 'FOO',
      bar: 123,
    });

    options.expandArrayOutputs = true;
    parameters = new SchemaProcessor(options).getSchemaProperties(schema);
    expect(parameters.length).toBe(4);

    array = parameters[0];
    expect(array.key).toBe('$.array');
    expect(array.type).toBe('array');

    p1 = parameters[1];
    expect(p1.key).toBe('$.object.p1');
    expect(p1.type).toBe('string');

    primitive = parameters[2];
    expect(primitive.key).toBe('$.primitive');
    expect(primitive.type).toBe('string');

    complex = parameters[3];
    expect(complex.key).toBe('$.complex');
    expect(complex.type).toBe('object');
    expect(complex.default).toEqual({
      foo: 'FOO',
      bar: 123,
    });
  });

  it('should not process complex array parameters which are read only', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        array: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              a1: {
                type: 'string',
              },
              a2: {
                type: 'boolean',
              },
            },
          },
          'x-ms-permission': 'read-only',
        },
        object: {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
            },
            bar: {
              type: 'integer',
            },
          },
          readOnly: true,
          default: {
            foo: 'FOO',
            bar: 123,
          },
        },
        normal: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              p1: {
                type: 'string',
              },
              p2: {
                type: 'boolean',
                readOnly: true,
              },
            },
          },
        },
      },
    };

    const options = {
      expandArrayOutputs: false,
      isInputSchema: true,
      excludeInternal: false,
    };

    let parameters = new SchemaProcessor(options).getSchemaProperties(schema);
    expect(parameters.length).toBe(1);

    let normal = parameters[0];
    expect(normal.key).toBe('$.normal');
    expect(normal.type).toBe('array');

    options.expandArrayOutputs = true;
    parameters = new SchemaProcessor(options).getSchemaProperties(schema);
    expect(parameters.length).toBe(3);

    const p1 = parameters[0];
    expect(p1.key).toBe('$.normal.[*].p1');
    expect(p1.type).toBe('string');

    normal = parameters[1];
    expect(normal.key).toBe('$.normal');
    expect(normal.type).toBe('array');

    const item = parameters[2];
    expect(item.key).toBe('$.normal.[*]');
    expect(item.type).toBe('object');
  });

  it('should populate output details correctly when processing complex array parameter.', () => {
    const schema: SchemaObject = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          a1: {
            type: 'string',
            title: 'A1',
          },
          a2: {
            type: 'boolean',
            title: 'A2',
          },
        },
      },
      'x-ms-permission': 'read-only',
    };

    const options = {
      expandArrayOutputsDepth: 100,
      required: true,
    };

    const parameters = new SchemaProcessor(options).getSchemaProperties(schema);
    expect(parameters.length).toBe(4);

    const arrayParameter = parameters[0];
    expect(arrayParameter.key).toBe('$');
    expect(arrayParameter.type).toBe('array');

    const itemParameter = parameters[1];
    expect(itemParameter.key).toBe('$.[*]');
    expect(itemParameter.type).toBe('object');

    const a1 = parameters[2];
    expect(a1.key).toBe('$.[*].a1');
    expect(a1.type).toBe('string');
    expect(a1.parentArray).toBe('key-body-output');
    expect(a1.isInsideArray).toBeTruthy();

    const a2 = parameters[3];
    expect(a2.key).toBe('$.[*].a2');
    expect(a2.type).toBe('boolean');
    expect(a2.parentArray).toBe('key-body-output');
    expect(a2.isInsideArray).toBeTruthy();
  });

  it('should return name correctly for type array when not expanding array outputs.', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'string',
      },
    };

    const options = {
      prefix: '',
      keyPrefix: 'body.$',
      isInputSchema: true,
      expandArrayOutputs: false,
    };
    const parameters = new SchemaProcessor(options).getSchemaProperties(schema);

    expect(parameters.length).toBe(1);

    const root = parameters[0];
    expect(root.key).toBe('body.$');
    expect(root.name).toBe('Body');
    expect(root.type).toBe('array');
  });

  it('should return name correctly for type array when expanding array outputs.', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          AddressLine1: {
            title: 'Address Line 1',
            type: 'string',
          },
          FirmName: {
            type: 'string',
          },
        },
      },
    };

    const options = {
      prefix: '',
      keyPrefix: 'body.$',
      isInputSchema: true,
      expandArrayOutputs: true,
    };
    const parameters = new SchemaProcessor(options).getSchemaProperties(schema);

    expect(parameters.length).toBe(4);
    expect(parameters[0]).toEqual(
      expect.objectContaining({
        key: 'body.$.[*].AddressLine1',
        isInsideArray: true,
        isNested: true,
        name: 'AddressLine1',
        required: false,
        title: 'Address Line 1',
        type: 'string',
      })
    );
    expect(parameters[1]).toEqual(
      expect.objectContaining({
        key: 'body.$.[*].FirmName',
        isInsideArray: true,
        isNested: true,
        name: 'FirmName',
        required: false,
        title: 'FirmName',
        type: 'string',
      })
    );
    expect(parameters[2]).toEqual(
      expect.objectContaining({
        key: 'body.$',
        name: 'Body',
        required: false,
        title: 'Body',
        type: 'array',
      })
    );
    expect(parameters[3]).toEqual(
      expect.objectContaining({
        key: 'body.$.[*]',
        isInsideArray: true,
        name: '[*]',
        required: false,
        type: 'object',
        title: 'Item',
      })
    );
  });
});
