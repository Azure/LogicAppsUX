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
ns0:SchemaRoot:
  DirectTranslation:
    FullName: /ns0:SchemaRoot/DirectTranslation/FullName
    NumCorgis: /ns0:SchemaRoot/DirectTranslation/NumCorgis
    $@IsTheNewGuy: /ns0:SchemaRoot/DirectTranslation/@IsTheNewGuy
  ContentEnrichment:
    Timestamp: current-date()
  Transformations:
    FullName: >-
      concat(/ns0:SchemaRoot/Transformations/FirstName, " ",
      /ns0:SchemaRoot/Transformations/LastName)
    NumCoffees: >-
      multiply(/ns0:SchemaRoot/Transformations/AssignedTasks,
      /ns0:SchemaRoot/Transformations/SleepDeprivationLevel)
  CustomValues:
    SuperSecretKey: "password"
    MOTD: concat("Welcome! Today's date is ", string(current-date()))
`;
