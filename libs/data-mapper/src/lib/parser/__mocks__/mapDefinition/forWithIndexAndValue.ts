export const forWithIndexAndValueMapDefinitionMock = `sourceSchema: SrcOrders.xsd
targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  $for(/ns0:Orders/WebOrders, index1):
    Customer:
      $@OrderNumber: /OrderNumber
      $value: SampleCustomer
      Name:
          $@FirstName: CustomerFirstName
          $@LastName: CustomerLastName
          $value: SampleName
  $@OrderValue: /OrderValue`;
