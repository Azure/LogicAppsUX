export const fullTranscriptMapDefinitionString = `$version: 1
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
      ID: string(/ns0:Root/DataTranslation/Employee)
      Name: >-
        concat(/ns0:Root/DataTranslation/Employee/LastName,
        /ns0:Root/DataTranslation/Employee/EmploymentStatus)
  DataTranslation:
    EmployeeName:
      $@RegularFulltime: >-
        avg(/ns0:Root/DataTranslation/Employee,
        /ns0:Root/DataTranslation/Employee/FirstName)
  ContentEnrich:
    DateOfDemo: string(/ns0:Root/DataTranslation/Employee/FirstName)
`;
