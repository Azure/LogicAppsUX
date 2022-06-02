export const IfWithChildrenAndValueMapDefinitionMock =
  // "sourceSchema: SrcOrders.xsd\ntargetSchema: CustomerOrders.xsd\nns0:CustomerOrders:\n\t@OrderedItem: /ns0:Orders/@Item\n\tfor(/ns0:Orders/WebOrders):\n\t\tCustomer:\n\t\t\tif(not_equal(/CustomerName, '')):\n\t\t\t\t@Name:\n\t\t\t\t\t@FirstName: /CustomerFirstName\n\t\t\t\t\t@LastName: /CustomerLastName\n\t\t\t\t@Address:\n\t\t\t\t\t@Address1: /Line1\n\t\t\t\t\t@Address2: /Line2\n\t\t\t@OrderNumber: /OrderNumber\n\t@OrderValue: /OrderValue";
  `sourceSchema: SrcOrders.xsd
targetSchema: CustomerOrders.xsd
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
