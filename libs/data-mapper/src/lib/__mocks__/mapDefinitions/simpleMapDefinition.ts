import type { ConnectionDictionary } from '../../models/Connection';

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

export const simpleMapDefExampleConnectionsMock: ConnectionDictionary = {
  'ns0:CustomerOrders/$@OrderedItem': {
    destination: 'ns0:CustomerOrders/$@OrderedItem',
    sourceValue: '/ns0:Orders/@Item',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/@Item',
    reactFlowDestination: 'output-ns0:CustomerOrders/$@OrderedItem',
  },
  'ns0:CustomerOrders/Customer/$@Name': {
    destination: 'ns0:CustomerOrders/Customer/$@Name',
    sourceValue: '/ns0:Orders/WebOrders/CustomerName',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/CustomerName',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/$@Name',
  },
  'ns0:CustomerOrders/Customer/$@OrderNumber': {
    destination: 'ns0:CustomerOrders/Customer/$@OrderNumber',
    sourceValue: '/ns0:Orders/WebOrders/OrderNumber',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/OrderNumber',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/$@OrderNumber',
  },
  'ns0:CustomerOrders/Customer/$@OrderValue': {
    destination: 'ns0:CustomerOrders/Customer/$@OrderValue',
    sourceValue: '/ns0:Orders/WebOrders/OrderValue',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/OrderValue',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/$@OrderValue',
  },
  'ns0:CustomerOrders/Customer/ShippingAddress/Line1': {
    destination: 'ns0:CustomerOrders/Customer/ShippingAddress/Line1',
    sourceValue: "concat(/ns0:Orders/WebOrders/CustomerName , ' ', /ns0:Orders/WebOrders/Address/Addr1)",
    loop: undefined,
    condition: undefined,
    reactFlowSource: "input-concat(/ns0:Orders/WebOrders/CustomerName , ' ', /ns0:Orders/WebOrders/Address/Addr1)",
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/ShippingAddress/Line1',
  },
  'ns0:CustomerOrders/Customer/ShippingAddress/Line2': {
    destination: 'ns0:CustomerOrders/Customer/ShippingAddress/Line2',
    sourceValue: '/ns0:Orders/WebOrders/Address/Addr2',
    loop: undefined,
    condition: undefined,
    reactFlowSource: 'input-/ns0:Orders/WebOrders/Address/Addr2',
    reactFlowDestination: 'output-ns0:CustomerOrders/Customer/ShippingAddress/Line2',
  },
};
