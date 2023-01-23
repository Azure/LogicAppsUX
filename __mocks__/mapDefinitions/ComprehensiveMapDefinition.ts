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
  Conditionals:
    $if(is-null(/ns0:SchemaRoot/Conditionals/Object)):
      Object:
        $if(is-null(/ns0:SchemaRoot/Conditionals/Object/Property)):
          Property: /ns0:SchemaRoot/Conditionals/Object/Property
  Looping:
    OneToOne:
      $for(/ns0:SchemaRoot/Looping/OneToOne/Simple):
        Simple:
          Direct: Direct
          FunctionChain: substring(lower-case(FunctionChain), 0, 5)
      $for(/ns0:SchemaRoot/Looping/OneToOne/RelativePaths):
        RelativePaths:
          Object(DotAccess): .
          Property: Property
          $@Attribute: ./@Attribute
    LoopReduce(Loop->Object):
      BestItemName: /ns0:SchemaRoot/Looping/LoopReduce(Loop->Object)/ItemsList[3]/ItemName
`;
