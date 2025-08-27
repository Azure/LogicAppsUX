import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import { SchemaType } from '@microsoft/logic-apps-shared';

/**
 * Test Schema Provider - Provides test schemas for the dropdown menu
 */
export class TestSchemaProvider {
  /**
   * Get test schemas formatted for the file tree dropdown
   */
  static getTestSchemas(): IFileSysTreeItem[] {
    return [
      {
        name: 'Test Schemas',
        type: 'directory',
        children: [
          {
            name: 'XSLT Sample Source Schema',
            type: 'file',
            fullPath: '/test-schemas/xslt-source-schema.xsd',
          },
          {
            name: 'XSLT Sample Target Schema',
            type: 'file',
            fullPath: '/test-schemas/xslt-target-schema.xsd',
          },
          {
            name: 'Customer Order Source (JSON)',
            type: 'file',
            fullPath: '/test-schemas/customer-order-source.json',
          },
          {
            name: 'Customer Order Target (JSON)',
            type: 'file',
            fullPath: '/test-schemas/customer-order-target.json',
          },
          {
            name: 'Simple Employee Source',
            type: 'file',
            fullPath: '/test-schemas/employee-source.xsd',
          },
          {
            name: 'Simple Employee Target',
            type: 'file',
            fullPath: '/test-schemas/employee-target.xsd',
          },
        ],
      },
    ];
  }

  /**
   * Get the actual schema content for a given path
   */
  static getSchemaContent(fullPath: string): string {
    const schemaMap: Record<string, string> = {
      '/test-schemas/xslt-source-schema.xsd': `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="SourceRoot" type="SourceRootType"/>
  
  <xs:complexType name="SourceRootType">
    <xs:sequence>
      <xs:element name="Customer" type="CustomerType"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="CustomerType">
    <xs:sequence>
      <xs:element name="Name" type="xs:string"/>
      <xs:element name="Email" type="xs:string"/>
      <xs:element name="Orders" type="OrdersType"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="OrdersType">
    <xs:sequence>
      <xs:element name="Order" type="OrderType" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="OrderType">
    <xs:sequence>
      <xs:element name="ProductName" type="xs:string"/>
      <xs:element name="Quantity" type="xs:int"/>
      <xs:element name="Price" type="xs:decimal"/>
    </xs:sequence>
    <xs:attribute name="id" type="xs:string" use="required"/>
  </xs:complexType>
</xs:schema>`,

      '/test-schemas/xslt-target-schema.xsd': `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="TargetRoot" type="TargetRootType"/>

  <xs:complexType name="TargetRootType">
    <xs:sequence>
      <xs:element name="CustomerInfo" type="CustomerInfoType"/>
      <xs:element name="Orders" type="TargetOrdersType"/>
      <xs:element name="ProcessedDate" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="CustomerInfoType">
    <xs:sequence>
      <xs:element name="Name" type="xs:string"/>
      <xs:element name="Email" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="TargetOrdersType">
    <xs:sequence>
      <xs:element name="OrderItem" type="OrderItemType" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="OrderItemType">
    <xs:sequence>
      <xs:element name="OrderId" type="xs:string"/>
      <xs:element name="Product" type="xs:string"/>
      <xs:element name="Quantity" type="xs:int"/>
      <xs:element name="HighValue" type="xs:boolean" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`,

      '/test-schemas/customer-order-source.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            SourceRoot: {
              type: 'object',
              properties: {
                Customer: {
                  type: 'object',
                  properties: {
                    Name: { type: 'string' },
                    Email: { type: 'string' },
                    Orders: {
                      type: 'object',
                      properties: {
                        Order: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              ProductName: { type: 'string' },
                              Quantity: { type: 'number' },
                              Price: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        null,
        2
      ),

      '/test-schemas/customer-order-target.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            TargetRoot: {
              type: 'object',
              properties: {
                CustomerInfo: {
                  type: 'object',
                  properties: {
                    Name: { type: 'string' },
                    Email: { type: 'string' },
                  },
                },
                Orders: {
                  type: 'object',
                  properties: {
                    OrderItem: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          OrderId: { type: 'string' },
                          Product: { type: 'string' },
                          Quantity: { type: 'number' },
                          HighValue: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
                ProcessedDate: { type: 'string' },
              },
            },
          },
        },
        null,
        2
      ),

      '/test-schemas/employee-source.xsd': `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="Employees">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Employee" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="FirstName" type="xs:string"/>
              <xs:element name="LastName" type="xs:string"/>
              <xs:element name="Department" type="xs:string"/>
              <xs:element name="Salary" type="xs:decimal"/>
            </xs:sequence>
            <xs:attribute name="id" type="xs:int"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`,

      '/test-schemas/employee-target.xsd': `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="Staff">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Person" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="FullName" type="xs:string"/>
              <xs:element name="Division" type="xs:string"/>
              <xs:element name="Compensation" type="xs:decimal"/>
              <xs:element name="EmployeeId" type="xs:int"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`,
    };

    return schemaMap[fullPath] || '';
  }

  /**
   * Determine schema type based on file path
   */
  static getSchemaType(fullPath: string): SchemaType {
    // This would typically be determined by context or user selection
    // For testing, we can infer from the name
    if (fullPath.includes('source') || fullPath.includes('Source')) {
      return SchemaType.Source;
    } else if (fullPath.includes('target') || fullPath.includes('Target')) {
      return SchemaType.Target;
    }

    // Default to source for unknown
    return SchemaType.Source;
  }
}
