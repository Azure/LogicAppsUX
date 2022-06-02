export const customerOrdersMapDefinitionMock =
  // `sourceSchema: SrcOrders.xsd
  // targetSchema: CustomerOrders.xsd
  // ns0:CustomerOrders:
  //   $@OrderedItem: /ns0:Orders/@Item
  //   ns0:CustomerOrderss: dkk
  //   $for(/ns0:Orders/WebOrders):
  //     Customer:
  //       $if(not_equal(/CustomerName, '')):
  //         $@Name: /CustomerName
  //       $@OrderNumber: /OrderNumber
  // 	  ns0:CustomerOrderss: dkk`;

  // `sourceSchema: SrcOrders.xsd
  // targetSchema: CustomerOrders.xsd
  // ns0:CustomerOrders:
  //   $@OrderedItem: /ns0:Orders/@Item
  //   ns0:CustomerOrderss: dkk
  //   $for(/ns0:Orders/WebOrders):
  //     Customer:
  //       $if(not_equal(/CustomerName, '')):
  //         $@Name: /CustomerName
  //       $@OrderNumber: /OrderNumber
  // 	  ns0:CustomerOrderss: dkk`;
  // `a: b
  // c:
  //   d:
  //     k: l
  //     m: o
  //   q: r`;

  `sourceSchema: SrcOrders.xsd
targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  for(/ns0:Orders/WebOrders):
  Customer:
    if(not_equal(/CustomerName, '')):
      $@Name: /CustomerName
    $@OrderNumber: /OrderNumber
    $@OrderValue: /OrderValue
    ShippingAddress:
      Line1: concat(/CustomerName , ‘ ’, /Address/Addr1)
      Line2: /Address/Addr2`;
