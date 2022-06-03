export const simpleMapDefExample = `$sourceSchema: SrcOrders.xsd
$targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  Customer:
    $@Name: /ns0:Orders/WebOrders/CustomerName
    $@OrderNumber: /ns0:Orders/WebOrders/OrderNumber
    $@OrderValue: /ns0:Orders/WebOrders/OrderValue
    ShippingAddress:
      Line1: concat(/ns0:Orders/WebOrders/CustomerName , ‘ ’, /ns0:Orders/WebOrders/Address/Addr1)
      Line2: /ns0:Orders/WebOrders/Address/Addr2`;
