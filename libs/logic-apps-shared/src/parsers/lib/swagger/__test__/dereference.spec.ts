import { describe, it, expect } from 'vitest';
import { dereferenceSwagger } from '../dereference';
import { Outlook } from './fixtures/outlook';
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

  describe('edge cases for local $refs', () => {
    it('should keep $ref when pointing to non-existent definition', () => {
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
                    $ref: '#/definitions/NonExistent',
                  },
                },
              },
            },
          },
        },
        definitions: {},
      };

      const result = dereferenceSwagger(swagger);

      // Non-existent $ref should remain unchanged
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.$ref).toBe('#/definitions/NonExistent');
    });

    it('should keep $ref when path is malformed (missing definition)', () => {
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
                    $ref: '#/definitions/Nested/TooDeep',
                  },
                },
              },
            },
          },
        },
        definitions: {
          Nested: {
            type: 'object',
          },
        },
      };

      const result = dereferenceSwagger(swagger);

      // Malformed path should remain unchanged
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.$ref).toBe('#/definitions/Nested/TooDeep');
    });

    it('should handle empty swagger document gracefully', () => {
      const swagger: OpenAPIV2.Document = {
        swagger: '2.0',
        info: {
          title: 'Empty API',
          version: '1.0',
        },
        paths: {},
      };

      const result = dereferenceSwagger(swagger);

      expect(result).toEqual(swagger);
      expect(result.$refs).toBeUndefined();
    });

    it('should decode JSON Pointer escape sequences per RFC 6901', () => {
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
                    $ref: '#/definitions/Type~1With~1Slashes',
                  },
                },
              },
            },
          },
        },
        definitions: {
          'Type/With/Slashes': {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const result = dereferenceSwagger(swagger);

      // ~1 should be decoded as /
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.type).toBe('object');
      expect((schema.properties as Record<string, unknown>).id).toEqual({ type: 'string' });
    });

    it('should decode tilde escape sequences (~0 → ~)', () => {
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
                    $ref: '#/definitions/Type~0With~0Tildes',
                  },
                },
              },
            },
          },
        },
        definitions: {
          'Type~With~Tildes': {
            type: 'string',
          },
        },
      };

      const result = dereferenceSwagger(swagger);

      // ~0 should be decoded as ~
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.type).toBe('string');
    });

    it('should handle complex escape sequence ~01 (encodes to ~1 which is /)', () => {
      // ~01 means: ~0 → ~ then literal 1, resulting in "~1" in the key
      // This is NOT the same as ~1 (which decodes to /)
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
                    $ref: '#/definitions/Type~01',
                  },
                },
              },
            },
          },
        },
        definitions: {
          'Type~1': {
            type: 'boolean',
          },
        },
      };

      const result = dereferenceSwagger(swagger);

      // ~01 decodes as: ~0→~, then 1 stays, so key is "Type~1"
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.type).toBe('boolean');
    });

    it('should keep $ref when referencing non-object intermediate path', () => {
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
                    $ref: '#/definitions/SimpleString/nested',
                  },
                },
              },
            },
          },
        },
        definitions: {
          SimpleString: 'just a string value' as unknown as OpenAPIV2.SchemaObject,
        },
      };

      const result = dereferenceSwagger(swagger);

      // Can't traverse into a string, should keep $ref
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.$ref).toBe('#/definitions/SimpleString/nested');
    });
  });

  describe('unsupported $ref types (intentionally not resolved)', () => {
    it('should NOT resolve external URL $refs - keeps them as-is', () => {
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
                    $ref: 'https://example.com/schemas/User.json',
                  },
                },
              },
            },
          },
        },
      };

      const result = dereferenceSwagger(swagger);

      // External URL $refs should remain unchanged
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.$ref).toBe('https://example.com/schemas/User.json');
    });

    it('should NOT resolve external file $refs - keeps them as-is', () => {
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
                    $ref: './schemas/User.json#/definitions/User',
                  },
                },
              },
            },
          },
        },
      };

      const result = dereferenceSwagger(swagger);

      // External file $refs should remain unchanged
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.$ref).toBe('./schemas/User.json#/definitions/User');
    });

    it('should NOT resolve relative file $refs without hash - keeps them as-is', () => {
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
                    $ref: 'common/definitions.yaml',
                  },
                },
              },
            },
          },
        },
      };

      const result = dereferenceSwagger(swagger);

      // Relative file $refs should remain unchanged
      const schema = result.paths['/test'].get?.responses['200'].schema as Record<string, unknown>;
      expect(schema.$ref).toBe('common/definitions.yaml');
    });
  });

  describe('integration tests with real-world OpenAPI documents', () => {
    it('should correctly dereference the Outlook connector swagger (224+ $refs)', () => {
      const startTime = performance.now();

      const result = dereferenceSwagger(Outlook as OpenAPIV2.Document);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete without errors
      expect(result).toBeDefined();
      expect(result.swagger).toBe('2.0');
      expect(result.info.title).toBe('Office 365 Outlook');

      // Should have resolved paths
      expect(result.paths).toBeDefined();
      expect(Object.keys(result.paths).length).toBeGreaterThan(0);

      // Verify a specific resolved $ref (CalendarGetTable returns TableMetadata)
      const calendarGetTable = result.paths['/{connectionId}/$metadata.json/datasets/calendars/tables/{table}'];
      expect(calendarGetTable).toBeDefined();
      const response200 = calendarGetTable.get?.responses['200'];
      expect(response200).toBeDefined();

      // The schema should be resolved (not a $ref anymore)
      const schema = response200.schema as Record<string, unknown>;
      expect(schema.$ref).toBeUndefined();
      expect(schema.type).toBe('object');
      expect(schema.description).toBe('Table metadata');

      // Performance check - should complete in reasonable time
      // Using 500ms to account for slower CI runners (locally ~20-50ms, CI can be 150-260ms)
      expect(duration).toBeLessThan(500);
    });

    it('should handle the Outlook swagger without memory issues', () => {
      // Run multiple times to check for memory leaks or accumulation issues
      for (let i = 0; i < 5; i++) {
        const result = dereferenceSwagger(Outlook as OpenAPIV2.Document);
        expect(result).toBeDefined();
      }
    });
  });
});
