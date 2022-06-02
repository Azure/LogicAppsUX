export const simpleMapDefExample =
  // 'sourceSchema: SrcOrders.xsd\ntargetSchema: CustomerOrders.xsd\nns0:CustomerOrders:\nns0:CustomerOrders:\n\t@OrderedItem: /ns0:Orders/@Item\n\tCustomer:\n\t\t@Name: /ns0:Orders/WebOrders/CustomerName\n\t\t@OrderNumber: /ns0:Orders/WebOrders/OrderNumber\n\t\t@OrderValue: /ns0:Orders/WebOrders/OrderValue\n\t\tShippingAddress:\n\t\t\tLine1: concat(/ns0:Orders/WebOrders/CustomerName , ‘ ’, /ns0:Orders/WebOrders/Address/Addr1)\n\t\t\tLine2: /ns0:Orders/WebOrders/Address/Addr2\n';
  `sourceSchema: SrcOrders.xsd
targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
ns0:CustomerOrders:
	@OrderedItem: /ns0:Orders/@Item
	Customer:
		@Name: /ns0:Orders/WebOrders/CustomerName
		@OrderNumber: /ns0:Orders/WebOrders/OrderNumber
		@OrderValue: /ns0:Orders/WebOrders/OrderValue
		ShippingAddress:
			Line1: concat(/ns0:Orders/WebOrders/CustomerName , ‘ ’, /ns0:Orders/WebOrders/Address/Addr1)
			Line2: /ns0:Orders/WebOrders/Address/Addr2`;
