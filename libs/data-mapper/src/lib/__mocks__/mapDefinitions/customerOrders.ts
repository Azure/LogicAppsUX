export const customerOrdersMapDefinitionMock = `$sourceSchema: SrcOrders.xsd
$targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  $for(/ns0:Orders/WebOrders):
    Customer:
      $if(not_equals(CustomerName, '')):
        $@Name: upper-case(CustomerName)
      $@OrderNumber: OrderNumber
      $@OrderValue: OrderValue
      ShippingAddress:
        Line1: concat(upper-case(CustomerName), ' ', Address/Addr1)
        Line2: Address/Addr2`;
