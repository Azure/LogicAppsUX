export const ifWithChildrenAndValueMapDefinitionMock = `$sourceSchema: SrcOrders.xsd
$targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  $for(/ns0:Orders/WebOrders):
    Customer:
      $if(not_equal(/CustomerName, '')):
        Name:
          $value: SampleName
          $@FirstName: CustomerFirstName
          $@LastName: CustomerLastName
      $@OrderNumber: /OrderNumber
  $@OrderValue: /OrderValue`;
