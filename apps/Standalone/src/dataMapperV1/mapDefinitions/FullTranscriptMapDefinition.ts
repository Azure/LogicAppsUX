﻿export const fullTranscriptMapDefinitionString = `
$version: 1
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
  DirectTranslation:
    Employee:
      ID: divide()
  DataTranslation:
    EmployeeName:
      $@RegularFulltime: is-equal()
  ContentEnrich:
    DateOfDemo: if-then-else()
  CumulativeExpression:
    PopulationSummary:
      State:
        Name: max()
        SexRatio: max()
  ConditionalMapping:
    ItemPrice: min()
    ItemDiscount: max(/ns0:Root/DataTranslation/Employee/FirstName)
  Looping:
    $for(/ns0:Root/CumulativeExpression/Population/State/County/Person):
      Person:
        Name: concat(Name, Age)
        Other: lower-case(Sex/Male)
`;
