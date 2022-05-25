import type { JsonInputStyle } from '../utils/converters';

export const designdoc_test_input: JsonInputStyle = {
  srcSchemaName: 'SrcOrders.xsd',
  dstSchemaName: 'CustomerOrders.xsd',
  mappings: {
    targetNodeKey: '/ns0:CustomerOrders',
    children: [
      {
        targetNodeKey: '/ns0:CustomerOrders/@OrderedItem',
        targetValue: {
          value: '/ns0:Orders/@Item',
        },
      },
      {
        targetNodeKey: '/ns0:CustomerOrders/Customer',
        loopSource: {
          loopSource: '/ns0:Orders/WebOrders',
        },
        children: [
          {
            targetNodeKey: '/ns0:CustomerOrders/Customer/@Name',
            condition: {
              condition: "not_equal(/ns0:Orders/WebOrders/CustomerName, '')",
            },
            targetValue: {
              value: '/ns0:Orders/WebOrders/CustomerName',
            },
          },
          {
            targetNodeKey: '/ns0:CustomerOrders/Customer/@OrderNumber',
            targetValue: {
              value: '/ns0:Orders/WebOrders/OrderNumber',
            },
          },
          {
            targetNodeKey: '/ns0:CustomerOrders/Customer/@OrderValue',
            targetValue: {
              value: '/ns0:Orders/WebOrders/OrderValue',
            },
          },
          {
            targetNodeKey: '/ns0:CustomerOrders/Customer/ShippingAddress',
            children: [
              {
                targetNodeKey: '/ns0:CustomerOrders/Customer/ShippingAddress/Line1',
                targetValue: {
                  value: 'concat(/ns0:Orders/WebOrders/CustomerName , ‘ ’, /ns0:Orders/WebOrders/Address/Addr1)',
                },
              },
              {
                targetNodeKey: '/ns0:CustomerOrders/Customer/ShippingAddress/Line2',
                targetValue: {
                  value: '/ns0:Orders/WebOrders/Address/Addr2',
                },
              },
            ],
          },
        ],
      },
    ],
  },
};

export const designdoc_test_output =
  "sourceSchema: SrcOrders.xsd\ntargetSchema: CustomerOrders.xsd\nns0:CustomerOrders:\n\t@OrderedItem: ns0:Orders@Item\n\tfor(ns0:OrdersWebOrders):\n\t\tCustomer:\n\t\t\tif(not_equal(CustomerName, '')):\n\t\t\t\t@Name: CustomerName\n\t\t\t@OrderNumber: OrderNumber\n\t\t\t@OrderValue: OrderValue\n\t\t\tShippingAddress:\n\t\t\t\tLine1: concat(CustomerName , ‘ ’, Address/Addr1)\n\t\t\t\tLine2: Address/Addr2\n";
