export const ifWithChildrenAndValueMapDefinitionMock = `$sourceSchema: SrcOrders.xsd
$targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  $for(/ns0:Orders/WebOrders):
    Customer:
      $if(not_equal(/CustomerName, '')):
        Name:
          $@FirstName: CustomerFirstName
          $@LastName: CustomerLastName
          $value: SampleName
      $@OrderNumber: /OrderNumber
  $@OrderValue: /OrderValue`;
