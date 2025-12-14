import { describe, it, expect } from 'vitest';
import { dereferenceSwagger } from '../dereference';
import type { OpenAPIV2 } from '../../../../utils/src';

describe('dereferenceSwagger', () => {
  it('should return swagger document unchanged when no $refs exist', () => {
    const swagger: OpenAPIV2.Document = {
      swagger: '2.0',
      info: {
        title: 'Test API',
        version: '1.0',
      },
      paths: {
        '/test': {
          get: {
            operationId: 'getTest',
            responses: {
              '200': {
                description: 'OK',
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = dereferenceSwagger(swagger);

    expect(result).toEqual(swagger);
  });

  it('should resolve simple $ref to definition', () => {
    const swagger: OpenAPIV2.Document = {
      swagger: '2.0',
      info: {
        title: 'Test API',
        version: '1.0',
      },
      paths: {
        '/test': {
          get: {
            operationId: 'getTest',
            responses: {
              '200': {
                description: 'OK',
                schema: {
                  $ref: '#/definitions/User',
                },
              },
            },
          },
        },
      },
      definitions: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
        },
      },
    };

    const result = dereferenceSwagger(swagger);

    // The $ref should be replaced with the actual definition
    const schema = result.paths['/test'].get?.responses['200'].schema;
    expect(schema).toEqual({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    });
  });

  it('should resolve nested $refs (definition referencing another definition)', () => {
    const swagger: OpenAPIV2.Document = {
      swagger: '2.0',
      info: {
        title: 'Test API',
        version: '1.0',
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                description: 'OK',
                schema: {
                  $ref: '#/definitions/User',
                },
              },
            },
          },
        },
      },
      definitions: {
        User: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { $ref: '#/definitions/Address' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
        },
      },
    };

    const result = dereferenceSwagger(swagger);

    const schema = result.paths['/users'].get?.responses['200'].schema as Record<string, unknown>;
    expect(schema.type).toBe('object');

    const properties = schema.properties as Record<string, unknown>;
    expect(properties.name).toEqual({ type: 'string' });

    // Nested $ref should also be resolved
    expect(properties.address).toEqual({
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
      },
    });
  });

  it('should detect direct cyclical $refs and keep them as $ref with metadata', () => {
    const swagger: OpenAPIV2.Document = {
      swagger: '2.0',
      info: {
        title: 'Test API',
        version: '1.0',
      },
      paths: {
        '/nodes': {
          get: {
            operationId: 'getNodes',
            responses: {
              '200': {
                description: 'OK',
                schema: {
                  $ref: '#/definitions/TreeNode',
                },
              },
            },
          },
        },
      },
      definitions: {
        TreeNode: {
          type: 'object',
          properties: {
            value: { type: 'string' },
            children: {
              type: 'array',
              items: {
                $ref: '#/definitions/TreeNode', // Self-reference
              },
            },
          },
        },
      },
    };

    const result = dereferenceSwagger(swagger);

    // Should not throw stack overflow
    expect(result).toBeDefined();

    // The schema should be resolved
    const schema = result.paths['/nodes'].get?.responses['200'].schema as Record<string, unknown>;
    expect(schema.type).toBe('object');

    // The cyclical ref should remain as $ref (not infinitely expanded)
    const properties = schema.properties as Record<string, unknown>;
    const children = properties.children as Record<string, unknown>;
    expect(children.type).toBe('array');

    const items = children.items as Record<string, unknown>;
    expect(items.$ref).toBe('#/definitions/TreeNode');

    // Metadata should contain info about the cyclical ref
    expect(result.$refs).toBeDefined();
    expect(result.$refs?.['#/definitions/TreeNode']).toEqual({ type: 'object' });
  });

  it('should detect indirect cyclical $refs (A → B → A)', () => {
    const swagger: OpenAPIV2.Document = {
      swagger: '2.0',
      info: {
        title: 'Test API',
        version: '1.0',
      },
      paths: {
        '/people': {
          get: {
            operationId: 'getPeople',
            responses: {
              '200': {
                description: 'OK',
                schema: {
                  $ref: '#/definitions/Person',
                },
              },
            },
          },
        },
      },
      definitions: {
        Person: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { $ref: '#/definitions/Address' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            resident: { $ref: '#/definitions/Person' }, // Cycle back to Person
          },
        },
      },
    };

    const result = dereferenceSwagger(swagger);

    // Should not throw stack overflow
    expect(result).toBeDefined();

    // Person should be resolved
    const schema = result.paths['/people'].get?.responses['200'].schema as Record<string, unknown>;
    expect(schema.type).toBe('object');

    // Address should be resolved within Person
    const personProps = schema.properties as Record<string, unknown>;
    const address = personProps.address as Record<string, unknown>;
    expect(address.type).toBe('object');

    // But Person within Address should remain as $ref (cyclical)
    const addressProps = address.properties as Record<string, unknown>;
    const resident = addressProps.resident as Record<string, unknown>;
    expect(resident.$ref).toBe('#/definitions/Person');

    // Metadata should contain the cyclical ref
    expect(result.$refs?.['#/definitions/Person']).toEqual({ type: 'object' });
  });
});
