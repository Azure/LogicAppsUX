export const nestedLoopMapDefinition = `$version: 1
$input: XML
$output: XML
$sourceSchema: Source.xsd
$targetSchema: Target.xsd
$sourceNamespaces:
  ns0: http://tempuri.org/source.xsd
  xs: http://www.w3.org/2001/XMLSchema
$targetNamespaces:
  ns0: http://tempuri.org/Target.xsd
  td: http://tempuri.org/TypeDefinition.xsd
  xs: http://www.w3.org/2001/XMLSchema
ns0:Root:
  ManyToOne:
    $for(/ns0:Root/ManyToOne/Year/Month/Day):
      Date:
        DayName: Date
`;
