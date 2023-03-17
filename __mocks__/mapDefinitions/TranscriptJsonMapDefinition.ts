export const transcriptJsonMapDefinitionString = `
$version: 1
$input: JSON
$output: JSON
$sourceSchema: SourceSchemaJson.json
$targetSchema: TargetSchemaJson.json
root:
  ComplexArray1:
    $for(/root/Nums/*):
      - $if(is-greater-than(20, 10)):
          F1: Num
`;
