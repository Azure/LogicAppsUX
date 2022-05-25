import { ParserView } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return (
    <ParserView
      input={JSON.stringify(
        {
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
        },
        null,
        '\t'
      )}
    />
  );
};
