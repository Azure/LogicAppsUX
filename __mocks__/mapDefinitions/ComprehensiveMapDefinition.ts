export const comprehensiveMapDefinition = `$version: 1
$version: 1
$input: XML
$output: XML
$sourceSchema: Source.xsd
$targetSchema: Target.xsd
$sourceNamespaces:
  ns0: http://tempuri.org/Source.xsd
  xs: http://www.w3.org/2001/XMLSchema
$targetNamespaces:
  ns0: http://tempuri.org/Target.xsd
  xs: http://www.w3.org/2001/XMLSchema
ns0:Root:
  $for(/ns0:Root/Year):
    Ano:
      $for(Month):
        Mes:
          Dia: Day
`;
