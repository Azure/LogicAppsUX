import type { DataMapSchema } from '@microsoft/logic-apps-shared';

const TargetSchemaXsd: DataMapSchema = {
  name: 'Target.xsd',
  type: 'XML',
  targetNamespace: 'http://tempuri.org/Target.xsd',
  namespaces: {
    ns0: 'http://tempuri.org/Target.xsd',
    td: 'http://tempuri.org/TypeDefinition.xsd',
    xs: 'http://www.w3.org/2001/XMLSchema',
  },
  schemaTreeRoot: {
    key: '/ns0:Root',
    name: 'Root',
    type: 'Complex',
    properties: 'None',
    children: [
      {
        key: '/ns0:Root/DirectTranslation',
        name: 'DirectTranslation',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/DirectTranslation/Employee',
            name: 'Employee',
            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:Root/DirectTranslation/Employee/ID',
                name: 'ID',
                type: 'Decimal',
                properties: 'None',
                qName: 'ID',
                children: [],
              },
              {
                key: '/ns0:Root/DirectTranslation/Employee/Name',
                name: 'Name',
                type: 'String',
                properties: 'None',
                qName: 'Name',
                children: [],
              },
            ],
            qName: 'Employee',
          },
        ],
        qName: 'DirectTranslation',
      },
      {
        key: '/ns0:Root/DataTranslation',
        name: 'DataTranslation',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/DataTranslation/EmployeeName',
            name: 'EmployeeName',
            type: 'String',
            properties: 'Complex',
            children: [
              {
                key: '/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime',
                name: 'RegularFulltime',
                type: 'Bool',
                properties: 'Attribute',
                qName: '@RegularFulltime',
                children: [],
              },
              {
                key: '/ns0:Root/DataTranslation/EmployeeName/@<AnyAttribute>',
                name: '<AnyAttribute>',
                type: 'String',
                properties: 'Attribute',
                qName: '@<AnyAttribute>',
                children: [],
              },
            ],
            qName: 'EmployeeName',
          },
        ],
        qName: 'DataTranslation',
      },
      {
        key: '/ns0:Root/ContentEnrich',
        name: 'ContentEnrich',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/ContentEnrich/DateOfDemo',
            name: 'DateOfDemo',
            type: 'DateTime',
            properties: 'None',
            qName: 'DateOfDemo',
            children: [],
          },
        ],
        qName: 'ContentEnrich',
      },
      {
        key: '/ns0:Root/CumulativeExpression',
        name: 'CumulativeExpression',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/CumulativeExpression/PopulationSummary',
            name: 'PopulationSummary',
            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:Root/CumulativeExpression/PopulationSummary/State',
                name: 'State',
                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/CumulativeExpression/PopulationSummary/State/Name',
                    name: 'Name',
                    type: 'String',
                    properties: 'None',
                    qName: 'Name',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio',
                    name: 'SexRatio',
                    type: 'String',
                    properties: 'None',
                    qName: 'SexRatio',
                    children: [],
                  },
                ],
                qName: 'State',
              },
            ],
            qName: 'PopulationSummary',
          },
        ],
        qName: 'CumulativeExpression',
      },
      {
        key: '/ns0:Root/ConditionalMapping',
        name: 'ConditionalMapping',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/ConditionalMapping/ItemPrice',
            name: 'ItemPrice',
            type: 'Decimal',
            properties: 'None',
            qName: 'ItemPrice',
            children: [],
          },
          {
            key: '/ns0:Root/ConditionalMapping/ItemQuantity',
            name: 'ItemQuantity',
            type: 'Decimal',
            properties: 'None',
            qName: 'ItemQuantity',
            children: [],
          },
          {
            key: '/ns0:Root/ConditionalMapping/ItemDiscount',
            name: 'ItemDiscount',
            type: 'Decimal',
            properties: 'Optional',
            qName: 'ItemDiscount',
            children: [],
          },
        ],
        qName: 'ConditionalMapping',
      },
      {
        key: '/ns0:Root/Looping',
        name: 'Looping',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/Looping/Person',
            name: 'Person',
            type: 'Complex',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:Root/Looping/Person/Name',
                name: 'Name',
                type: 'String',
                properties: 'None',
                qName: 'Name',
                children: [],
              },
              {
                key: '/ns0:Root/Looping/Person/Address',
                name: 'Address',
                type: 'String',
                properties: 'None',
                qName: 'Address',
                children: [],
              },
              {
                key: '/ns0:Root/Looping/Person/Other',
                name: 'Other',
                type: 'String',
                properties: 'Optional',
                qName: 'Other',
                children: [],
              },
              {
                key: '/ns0:Root/Looping/Person/Publisher',
                name: 'Publisher',
                type: 'String',
                properties: 'Optional',
                qName: 'Publisher',
                children: [],
              },
            ],
            qName: 'Person',
          },
          {
            key: '/ns0:Root/Looping/Trips',
            name: 'Trips',
            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:Root/Looping/Trips/Trip',
                name: 'Trip',
                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/Looping/Trips/Trip/VehicleRegistration',
                    name: 'VehicleRegistration',
                    type: 'String',
                    properties: 'None',
                    qName: 'VehicleRegistration',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/Looping/Trips/Trip/Distance',
                    name: 'Distance',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Distance',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/Looping/Trips/Trip/Duration',
                    name: 'Duration',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Duration',
                    children: [],
                  },
                ],
                qName: 'Trip',
              },
            ],
            qName: 'Trips',
          },
        ],
        qName: 'Looping',
      },
      {
        key: '/ns0:Root/ConditionalLooping',
        name: 'ConditionalLooping',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/ConditionalLooping/CategorizedCatalog',
            name: 'CategorizedCatalog',
            type: 'Complex',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct',
                name: 'PetProduct',
                type: 'Complex',
                properties: 'Optional',
                children: [
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Name',
                    name: 'Name',
                    type: 'String',
                    properties: 'None',
                    qName: 'Name',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/SKU',
                    name: 'SKU',
                    type: 'String',
                    properties: 'None',
                    qName: 'SKU',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Price',
                    name: 'Price',
                    type: 'String',
                    properties: 'None',
                    qName: 'Price',
                    children: [],
                  },
                ],
                qName: 'PetProduct',
              },
              {
                key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct',
                name: 'GroovyProduct',
                type: 'Complex',
                properties: 'Optional',
                children: [
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct/Name',
                    name: 'Name',
                    type: 'String',
                    properties: 'None',
                    qName: 'Name',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct/SKU',
                    name: 'SKU',
                    type: 'String',
                    properties: 'None',
                    qName: 'SKU',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct/Price',
                    name: 'Price',
                    type: 'String',
                    properties: 'None',
                    qName: 'Price',
                    children: [],
                  },
                ],
                qName: 'GroovyProduct',
              },
              {
                key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct',
                name: 'OfficeProduct',
                type: 'Complex',
                properties: 'Optional',
                children: [
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct/Name',
                    name: 'Name',
                    type: 'String',
                    properties: 'None',
                    qName: 'Name',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct/SKU',
                    name: 'SKU',
                    type: 'String',
                    properties: 'None',
                    qName: 'SKU',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct/Price',
                    name: 'Price',
                    type: 'String',
                    properties: 'None',
                    qName: 'Price',
                    children: [],
                  },
                ],
                qName: 'OfficeProduct',
              },
            ],
            qName: 'CategorizedCatalog',
          },
        ],
        qName: 'ConditionalLooping',
      },
      {
        key: '/ns0:Root/LoopingWithIndex',
        name: 'LoopingWithIndex',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/LoopingWithIndex/WeatherSummary',
            name: 'WeatherSummary',
            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day1',
                name: 'Day1',
                type: 'Complex',
                properties: 'None',
                children: [
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Name',
                    name: 'Name',
                    type: 'String',
                    properties: 'None',
                    qName: 'Name',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure',
                    name: 'Pressure',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Pressure',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/WindSpeed',
                    name: 'WindSpeed',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'WindSpeed',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Temperature',
                    name: 'Temperature',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Temperature',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/<AnyElement>',
                    name: '<AnyElement>',
                    type: 'Complex',
                    properties: 'Optional',
                    qName: '<AnyElement>',
                    children: [],
                  },
                ],
                qName: 'Day1',
              },
              {
                key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day2',
                name: 'Day2',
                type: 'Complex',
                properties: 'None',
                children: [
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Name',
                    name: 'Name',
                    type: 'String',
                    properties: 'None',
                    qName: 'Name',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Pressure',
                    name: 'Pressure',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Pressure',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/WindSpeed',
                    name: 'WindSpeed',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'WindSpeed',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature',
                    name: 'Temperature',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Temperature',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/<AnyElement>',
                    name: '<AnyElement>',
                    type: 'Complex',
                    properties: 'Optional',
                    qName: '<AnyElement>',
                    children: [],
                  },
                ],
                qName: 'Day2',
              },
              {
                key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day',
                name: 'Day',
                type: 'Complex',
                properties: 'Optional, Repeating',
                children: [
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Name',
                    name: 'Name',
                    type: 'String',
                    properties: 'None',
                    qName: 'Name',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Pressure',
                    name: 'Pressure',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Pressure',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day/WindSpeed',
                    name: 'WindSpeed',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'WindSpeed',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Temperature',
                    name: 'Temperature',
                    type: 'Decimal',
                    properties: 'None',
                    qName: 'Temperature',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/LoopingWithIndex/WeatherSummary/Day/<AnyElement>',
                    name: '<AnyElement>',
                    type: 'Complex',
                    properties: 'Optional',
                    qName: '<AnyElement>',
                    children: [],
                  },
                ],
                qName: 'Day',
              },
            ],
            qName: 'WeatherSummary',
          },
        ],
        qName: 'LoopingWithIndex',
      },
      {
        key: '/ns0:Root/NameValueTransforms',
        name: 'NameValueTransforms',
        type: 'Complex',
        properties: 'None',
        children: [
          {
            key: '/ns0:Root/NameValueTransforms/FlatterCatalog',
            name: 'FlatterCatalog',
            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:Root/NameValueTransforms/FlatterCatalog/Price',
                name: 'Price',
                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Pen',
                    name: 'Pen',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'Pen',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Pencil',
                    name: 'Pencil',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'Pencil',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/NameValueTransforms/FlatterCatalog/Price/NoteBook',
                    name: 'NoteBook',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'NoteBook',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Bag',
                    name: 'Bag',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'Bag',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Others',
                    name: 'Others',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'Others',
                    children: [],
                  },
                ],
                qName: 'Price',
              },
            ],
            qName: 'FlatterCatalog',
          },
          {
            key: '/ns0:Root/NameValueTransforms/PO_Status',
            name: 'PO_Status',
            type: 'Complex',
            properties: 'None',
            children: [
              {
                key: '/ns0:Root/NameValueTransforms/PO_Status/ShipDate',
                name: 'ShipDate',
                type: 'String',
                properties: 'None',
                qName: 'ShipDate',
                children: [],
              },
              {
                key: '/ns0:Root/NameValueTransforms/PO_Status/ShippedVia',
                name: 'ShippedVia',
                type: 'String',
                properties: 'None',
                qName: 'ShippedVia',
                children: [],
              },
              {
                key: '/ns0:Root/NameValueTransforms/PO_Status/Product',
                name: 'Product',
                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/NameValueTransforms/PO_Status/Product/ProductIdentifier',
                    name: 'ProductIdentifier',
                    type: 'String',
                    properties: 'None',
                    qName: 'ProductIdentifier',
                    children: [],
                  },
                  {
                    key: '/ns0:Root/NameValueTransforms/PO_Status/Product/OrderStatusQuantity',
                    name: 'OrderStatusQuantity',
                    type: 'Complex',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:Root/NameValueTransforms/PO_Status/Product/OrderStatusQuantity/GlobalOrderQuantityTypeCode',
                        name: 'GlobalOrderQuantityTypeCode',
                        type: 'String',
                        properties: 'None',
                        qName: 'GlobalOrderQuantityTypeCode',
                        children: [],
                      },
                      {
                        key: '/ns0:Root/NameValueTransforms/PO_Status/Product/OrderStatusQuantity/ProductQuantity',
                        name: 'ProductQuantity',
                        type: 'String',
                        properties: 'None',
                        qName: 'ProductQuantity',
                        children: [],
                      },
                    ],
                    qName: 'OrderStatusQuantity',
                  },
                ],
                qName: 'Product',
              },
            ],
            qName: 'PO_Status',
          },
        ],
        qName: 'NameValueTransforms',
      },
    ],
    qName: 'ns0:Root',
  },
};

export default TargetSchemaXsd;
