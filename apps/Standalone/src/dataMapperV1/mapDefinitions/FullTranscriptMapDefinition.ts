﻿export const fullTranscriptMapDefinitionString = `$version: 1
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
      ID: >-
        string(is-string(/ns0:Root/DirectTranslation/EmployeeID,
        /ns0:Root/DirectTranslation/EmployeeID))
      Name: >-
        string(is-string(/ns0:Root/DirectTranslation/EmployeeID,
        /ns0:Root/DirectTranslation/EmployeeID))
`;
