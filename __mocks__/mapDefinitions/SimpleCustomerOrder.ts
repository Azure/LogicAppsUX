export const simpleCustomerOrder = `$version: '1.0'
$input: XML
$output: XML
$sourceSchema: SourceSchema.xsd
$targetSchema: TargetSchema.xsd
$sourceNamespaces:
  ns0: http://SourceSchema
  xs: http://www.w3.org/2001/XMLSchema
$targetNamespaces:
  ns0: http://TargetSchema
  xs: http://www.w3.org/2001/XMLSchema
OutputRecord:
  Identity:
    UserID: /ns0:InputRecord/Address/AddressLine1
    LastName: /ns0:InputRecord/Address/AddressLine2`;
