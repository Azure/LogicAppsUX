export const customerOrderMapDefinition = `$version: '1.0'
$input: XML
$output: XML
$sourceSchema: BasicSourceSchema.xsd
$targetSchema: BasicTargetSchema.xsd
$sourceNamespaces:
  ns0: http://tempuri.org/source.xsd
  xs: http://www.w3.org/2001/XMLSchema
$targetNamespaces:
  ns0: http://tempuri.org/Target.xsd
  xs: http://www.w3.org/2001/XMLSchema
ns0:OutputRecord:
  Identity:
    UserID: concat(FirstName, LastName, string(Birthday), string(NumCoffees))
    Initial: /ns0:InputRecord/Identity/Initials
    FirstName: /ns0:InputRecord/Identity/FirstName
    LastName: /ns0:InputRecord/Identity/LastName
`;
