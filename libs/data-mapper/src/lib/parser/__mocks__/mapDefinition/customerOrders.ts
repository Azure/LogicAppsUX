export const customerOrdersMapDefinitionMock =
  // "sourceSchema: SrcOrders.xsd\ntargetSchema: CustomerOrders.xsd\nns0:CustomerOrders:\n\t@OrderedItem: /ns0:Orders/@Item\n\tfor(/ns0:Orders/WebOrders):\n\t\tCustomer:\n\t\t\tif(not_equal(/CustomerName, '')):\n\t\t\t\t@Name: /CustomerName\n\t\t\t@OrderNumber: /OrderNumber\n\t\t\t@OrderValue: /OrderValue\n\t\t\tShippingAddress:\n\t\t\t\tLine1: concat(/CustomerName , ‘ ’, /Address/Addr1)\n\t\t\t\tLine2: /Address/Addr2\n";
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
