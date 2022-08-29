export const simpleMapDefExampleMapDefinitionMock = `$sourceSchema: SrcOrders.xsd
$targetSchema: CustomerOrders.xsd
ns0:CustomerOrders:
  $@OrderedItem: /ns0:Orders/@Item
  Customer:
    $@Name: /ns0:Orders/WebOrders/CustomerName
    $@OrderNumber: /ns0:Orders/WebOrders/OrderNumber
    $@OrderValue: /ns0:Orders/WebOrders/OrderValue
    ShippingAddress:
      Line1: concat(/ns0:Orders/WebOrders/CustomerName , ' ', /ns0:Orders/WebOrders/Address/Addr1)
      Line2: /ns0:Orders/WebOrders/Address/Addr2`;

export const simpleMapDefExampleConnectionsMock = {
  'ns0:CustomerOrders/$@OrderedItem': {
    value: '/ns0:Orders/@Item',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/@Item',
    reactFlowDestination: 'output-ns0:CustomerOrders/$@OrderedItem',
  },
  'ns0:CustomerOrders/Customer/$@Name': {
    value: '/ns0:Orders/WebOrders/CustomerName',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/CustomerName',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/$@Name',
  },
  'ns0:CustomerOrders/Customer/$@OrderNumber': {
    value: '/ns0:Orders/WebOrders/OrderNumber',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/OrderNumber',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/$@OrderNumber',
  },
  'ns0:CustomerOrders/Customer/$@OrderValue': {
    value: '/ns0:Orders/WebOrders/OrderValue',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/OrderValue',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/$@OrderValue',
  },
  'ns0:CustomerOrders/Customer/ShippingAddress/Line1': {
    value: "concat(/ns0:Orders/WebOrders/CustomerName , ' ', /ns0:Orders/WebOrders/Address/Addr1)",
    loop: undefined,
    condition: undefined,
    reactFlowSource: "input-concat(/ns0:Orders/WebOrders/CustomerName , ' ', /ns0:Orders/WebOrders/Address/Addr1)",
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/ShippingAddress/Line1',
  },
  'ns0:CustomerOrders/Customer/ShippingAddress/Line2': {
    value: '/ns0:Orders/WebOrders/Address/Addr2',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/Address/Addr2',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/ShippingAddress/Line2',
  },
};
