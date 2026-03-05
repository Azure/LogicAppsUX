import { describe, expect, it } from 'vitest';
import { dereferenceJsonSchema } from '../dereferenceJsonSchema';

describe('dereferenceJsonSchema', () => {
  it('should return schema unchanged when no $defs or definitions exist', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    });
  });

  it('should resolve $ref using $defs (JSON Schema 2019-09+)', () => {
    const schema: any = {
      type: 'object',
      properties: {
        address: { $ref: '#/$defs/Address' },
      },
      $defs: {
        Address: {
          type: 'object',
          title: 'Mailing Address',
          description: 'A physical mailing address',
          properties: {
            street: { type: 'string', title: 'Street' },
            city: { type: 'string', title: 'City' },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.address).toEqual({
      type: 'object',
      title: 'Mailing Address',
      description: 'A physical mailing address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
      },
    });
    // $defs should be stripped from the output
    expect(result.$defs).toBeUndefined();
  });

  it('should resolve $ref using definitions (JSON Schema Draft 4/7)', () => {
    const schema: any = {
      type: 'object',
      properties: {
        user: { $ref: '#/definitions/User' },
      },
      definitions: {
        User: {
          type: 'object',
          title: 'User Profile',
          description: 'A user profile object',
          properties: {
            name: { type: 'string', title: 'Full Name' },
            email: { type: 'string', title: 'Email Address' },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.user).toEqual({
      type: 'object',
      title: 'User Profile',
      description: 'A user profile object',
      properties: {
        name: { type: 'string', title: 'Full Name' },
        email: { type: 'string', title: 'Email Address' },
      },
    });
    expect(result.definitions).toBeUndefined();
  });

  it('should resolve nested $refs (definition referencing another definition)', () => {
    const schema: any = {
      type: 'object',
      properties: {
        person: { $ref: '#/$defs/Person' },
      },
      $defs: {
        Person: {
          type: 'object',
          title: 'Person',
          properties: {
            name: { type: 'string' },
            address: { $ref: '#/$defs/Address' },
          },
        },
        Address: {
          type: 'object',
          title: 'Address',
          description: 'Postal address',
          properties: {
            street: { type: 'string' },
            zip: { type: 'string' },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.person.title).toBe('Person');
    expect(result.properties.person.properties.address.title).toBe('Address');
    expect(result.properties.person.properties.address.description).toBe('Postal address');
    expect(result.properties.person.properties.address.properties.street).toEqual({ type: 'string' });
  });

  it('should handle cyclical $refs without infinite loop', () => {
    const schema: any = {
      type: 'object',
      properties: {
        node: { $ref: '#/$defs/TreeNode' },
      },
      $defs: {
        TreeNode: {
          type: 'object',
          title: 'Tree Node',
          properties: {
            value: { type: 'string' },
            children: {
              type: 'array',
              items: { $ref: '#/$defs/TreeNode' },
            },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.node.title).toBe('Tree Node');
    expect(result.properties.node.properties.value).toEqual({ type: 'string' });
    // The cyclical $ref should be resolved to a safe fallback
    expect(result.properties.node.properties.children.items).toEqual({ type: 'object' });
  });

  it('should keep external URL $refs unchanged', () => {
    const schema: any = {
      type: 'object',
      properties: {
        external: { $ref: 'https://example.com/schemas/Foo.json' },
        local: { $ref: '#/$defs/Bar' },
      },
      $defs: {
        Bar: { type: 'string', title: 'Bar Type' },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.external.$ref).toBe('https://example.com/schemas/Foo.json');
    expect(result.properties.local.title).toBe('Bar Type');
  });

  it('should keep $ref when pointing to non-existent definition', () => {
    const schema: any = {
      type: 'object',
      properties: {
        item: { $ref: '#/$defs/DoesNotExist' },
      },
      $defs: {
        Other: { type: 'string' },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.item.$ref).toBe('#/$defs/DoesNotExist');
  });

  it('should preserve title and description from resolved definitions', () => {
    const schema: any = {
      type: 'object',
      properties: {
        status: { $ref: '#/$defs/StatusEnum' },
      },
      $defs: {
        StatusEnum: {
          type: 'string',
          title: 'Status Code',
          description: 'The current status of the request',
          enum: ['pending', 'active', 'completed'],
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.status.title).toBe('Status Code');
    expect(result.properties.status.description).toBe('The current status of the request');
    expect(result.properties.status.enum).toEqual(['pending', 'active', 'completed']);
    expect(result.properties.status.type).toBe('string');
  });

  it('should resolve multiple $refs in the same schema', () => {
    const schema: any = {
      type: 'object',
      properties: {
        billing: { $ref: '#/$defs/Address' },
        shipping: { $ref: '#/$defs/Address' },
        contact: { $ref: '#/$defs/ContactInfo' },
      },
      $defs: {
        Address: {
          type: 'object',
          title: 'Address',
          properties: {
            street: { type: 'string' },
          },
        },
        ContactInfo: {
          type: 'object',
          title: 'Contact Information',
          properties: {
            phone: { type: 'string' },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.billing.title).toBe('Address');
    expect(result.properties.shipping.title).toBe('Address');
    expect(result.properties.contact.title).toBe('Contact Information');
  });

  it('should handle $ref in array items', () => {
    const schema: any = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/$defs/Product' },
        },
      },
      $defs: {
        Product: {
          type: 'object',
          title: 'Product',
          description: 'A product in the catalog',
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.items.items.title).toBe('Product');
    expect(result.properties.items.items.description).toBe('A product in the catalog');
  });

  it('should resolve refs from both $defs and definitions in the same schema', () => {
    const schema: any = {
      type: 'object',
      properties: {
        address: { $ref: '#/$defs/Address' },
        user: { $ref: '#/definitions/User' },
      },
      $defs: {
        Address: {
          type: 'object',
          title: 'Mailing Address',
          properties: {
            street: { type: 'string' },
          },
        },
      },
      definitions: {
        User: {
          type: 'object',
          title: 'User Profile',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.address.title).toBe('Mailing Address');
    expect(result.properties.user.title).toBe('User Profile');
    expect(result.$defs).toBeUndefined();
    expect(result.definitions).toBeUndefined();
  });

  it('should return null/undefined/non-object values as-is', () => {
    expect(dereferenceJsonSchema(null as any)).toBeNull();
    expect(dereferenceJsonSchema(undefined as any)).toBeUndefined();
    expect(dereferenceJsonSchema('string' as any)).toBe('string');
  });

  it('should handle empty $defs gracefully', () => {
    const schema: any = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      $defs: {},
    };

    const result = dereferenceJsonSchema(schema) as any;
    // With empty $defs and no refs to resolve, the schema is returned as-is
    expect(result.type).toBe('object');
    expect(result.properties.name).toEqual({ type: 'string' });
  });

  it('should handle indirect cyclical $refs (A -> B -> A)', () => {
    const schema: any = {
      type: 'object',
      properties: {
        person: { $ref: '#/$defs/Person' },
      },
      $defs: {
        Person: {
          type: 'object',
          title: 'Person',
          properties: {
            name: { type: 'string' },
            employer: { $ref: '#/$defs/Company' },
          },
        },
        Company: {
          type: 'object',
          title: 'Company',
          properties: {
            name: { type: 'string' },
            ceo: { $ref: '#/$defs/Person' },
          },
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.person.title).toBe('Person');
    expect(result.properties.person.properties.employer.title).toBe('Company');
    // The cyclical back-reference to Person should be resolved to a safe fallback
    expect(result.properties.person.properties.employer.properties.ceo).toEqual({ type: 'object' });
  });

  it('should handle JSON Pointer encoding (~1 for / and ~0 for ~)', () => {
    const schema: any = {
      type: 'object',
      properties: {
        slashed: { $ref: '#/$defs/Type~1With~1Slashes' },
        tilded: { $ref: '#/$defs/Type~0With~0Tildes' },
      },
      $defs: {
        'Type/With/Slashes': {
          type: 'string',
          title: 'Slash Type',
        },
        'Type~With~Tildes': {
          type: 'number',
          title: 'Tilde Type',
        },
      },
    };

    const result = dereferenceJsonSchema(schema) as any;
    expect(result.properties.slashed.title).toBe('Slash Type');
    expect(result.properties.slashed.type).toBe('string');
    expect(result.properties.tilded.title).toBe('Tilde Type');
    expect(result.properties.tilded.type).toBe('number');
  });
});
