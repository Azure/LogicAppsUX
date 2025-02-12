export const x12MapDefinitionString = `
$version: 1
$input: XML
$output: XML
$sourceSchema: X12_00401_856 Custom2.xsd
$targetSchema: X12_00401_856 Custom2.xsd
$sourceNamespaces:
  btsedi: http://schemas.microsoft.com/BizTalk/2005/EdiSchemaEditorExtension
  b: http://schemas.microsoft.com/BizTalk/2003
  ns0: http://schemas.microsoft.com/BizTalk/EDI/X12/2006
  xs: http://www.w3.org/2001/XMLSchema
$targetNamespaces:
  btsedi: http://schemas.microsoft.com/BizTalk/2005/EdiSchemaEditorExtension
  b: http://schemas.microsoft.com/BizTalk/2003
  ns0: http://schemas.microsoft.com/BizTalk/EDI/X12/2006
  xs: http://www.w3.org/2001/XMLSchema
ns0:X12_00401_856:
  ST:
    ST01: /ns0:X12_00401_856/ST/ST01
    ST02: /ns0:X12_00401_856/ST/ST02
  $for(/ns0:X12_00401_856/ns0:HL-SLoop):
    ns0:HL-SLoop:
      $for(ns0:HL):
        ns0:HL:
          HL01: HL01
      $for(ns0:HL):
        ns0:TD1:
          TD101: HL01`