export const forWithIndexAndValueMapDefinitionMock = `$sourceSchema: SrcOrders.xsd
$targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  $for(/ns0:Orders/WebOrders, index1):
    Customer:
      $value: SampleCustomer
      $@OrderNumber: /OrderNumber
      Name:
          $value: SampleName
          $@FirstName: CustomerFirstName
          $@LastName: CustomerLastName
  $@OrderValue: /OrderValue`;
