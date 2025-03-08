export const comprehensiveMapDefinition = `
$version: 1.0
$input: XML
$output: XML
$sourceSchema: ComprehensiveSource.xsd
$targetSchema: ComprehensiveTarget.xsd
$sourceNamespaces:
  ns0: http://tempuri.org/ComprehensiveSource.xsd
  xs: http://www.w3.org/2001/XMLSchema
$targetNamespaces:
  ns0: http://tempuri.org/ComprehensiveTarget.xsd
  xs: http://www.w3.org/2001/XMLSchema
ns0:TargetSchemaRoot:
  DirectTranslation:
    FullName: /ns0:SourceSchemaRoot/DirectTranslation/SourceFullName
    NumCorgis: /ns0:SourceSchemaRoot/DirectTranslation/SourceNumCorgis
    $@IsTheNewGuy: /ns0:SourceSchemaRoot/DirectTranslation/@SourceIsTheNewGuy
  ContentEnrichment:
    Timestamp: current-date()
  Transformations:
    FullName: >-
      concat(/ns0:SourceSchemaRoot/Transformations/FirstName, " ",
      /ns0:SourceSchemaRoot/Transformations/LastName)
    NumCoffees: >-
      multiply(/ns0:SourceSchemaRoot/Transformations/AssignedTasks,
      /ns0:SourceSchemaRoot/Transformations/SleepDeprivationLevel)
  CustomValues:
    SuperSecretKey: "password"
    MOTD: concat("Welcome! Today's date is ", string(current-date()))
  Conditionals:
    $if(is-null(/ns0:SourceSchemaRoot/Conditionals/SourceObject)):
      Object:
        MiscProperty: /ns0:SourceSchemaRoot/Conditionals/SourceObject/SourceProperty
    $if(is-null(/ns0:SourceSchemaRoot/Conditionals/SourceObject/SourceProperty)):
      Property: /ns0:SourceSchemaRoot/Conditionals/SourceObject/SourceProperty
  Looping:
    OneToOne:
      $for(/ns0:SourceSchemaRoot/Looping/OneToOne/Simple):
        Simple:
          Direct: SourceDirect
          FunctionChain: substring(lower-case(SourceFunctionChain), 0, 5)
      $for(/ns0:SourceSchemaRoot/Looping/OneToOne/RelativePaths):
        RelativePaths:
          DirectRelativePaths:
            DotAccess: .
            Property: SourceProperty
            $@Attribute: ./@SourceAttribute
          InFunctionRelativePaths:
            DotAccess: string(.)
            Property: string(SourceProperty)
            $@Attribute: string(./@SourceAttribute)
      $for(/ns0:SourceSchemaRoot/Looping/OneToOne/Index, $a):
        Index:
          Direct: /ns0:SourceSchemaRoot/Looping/OneToOne/Index[$a]/SourceDirect
          FunctionChain: concat(SourceFunctionChain, $a)
      $for(/ns0:SourceSchemaRoot/Looping/OneToOne/Conditional):
        Conditional:
          $if(is-null(SourceDirect)):
            Direct: SourceDirect
      $for(/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest, $a):
        StressTest:
          $if(is-greater-than($a, 3)):
            Direct: /ns0:SourceSchemaRoot/Looping/OneToOne/StressTest[$a]/SourceDirect
          FunctionChain: concat(lower-case(string(current-date())), ./@SourceFunctionChain)
    ManyToOne:
      $for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple):
        $for(SourceSimpleChild):
          $for(SourceSimpleChildChild):
            Simple:
              Direct: SourceDirect
              FunctionChain: lower-case(SourceFunctionChain)
      $for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Index, $a):
        $for(SourceIndexChild, $b):
          $for(SourceIndexChildChild, $c):
            Index:
              Direct: /ns0:SourceSchemaRoot/Looping/ManyToOne/Index/SourceIndexChild[$b]/SourceIndexChildChild/SourceDirect
              FunctionChain: concat($c, SourceFunctionChain, $a)
      $for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Conditional):
        $for(SourceConditionalChild):
          $for(SourceConditionalChildChild):
            Conditional:
              $if(is-null(SourceDirect)):
                Direct: SourceDirect
    ManyToMany:
      $for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple):
        Simple:
          $for(SourceSimpleChild):
            SimpleChild:
              $for(SourceSimpleChildChild):
                SimpleChildChild:
                  Direct: SourceDirect
                  FunctionChain: lower-case(SourceFunctionChain)
      $for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Index, $a): # NOTE: Can test '$i/j/k' to confirm it's the variable itself being deserialized too
        Index:
          $for(SourceIndexChild, $b):
            IndexChild:
              $for(SourceIndexChildChild, $c):
                IndexChildChild:
                  Direct: /ns0:SourceSchemaRoot/Looping/ManyToMany/Index/SourceIndexChild/SourceIndexChildChild[$c]/SourceDirect
                  FunctionChain: concat($a, SourceFunctionChain, $b)
      $for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Conditional):
        Conditional:
          $for(SourceConditionalChild):
            ConditionalChild:
              $for(SourceConditionalChildChild):
                ConditionalChildChild:
                  $if(is-null(SourceDirect)):
                    Direct: SourceDirect
    LoopReduce:
      BestItemName: /ns0:SourceSchemaRoot/Looping/LoopReduce/ItemsList[3]/ItemName
    OneToMany:
      Simple:
        SimpleChild:
          $for(/ns0:SourceSchemaRoot/Looping/OneToMany/Simple):
            SimpleChildChild:
              Direct: SourceDirect
              FunctionChain: SourceFunctionChain
`;
