export const transcriptJsonMapDefinitionString = `
$version: "1.0"
$input: "json"
$output: "json"
$sourceSchema: "SourceSchemaJson.json"
$targetSchema: "TargetSchemaJson.json"
$root:
  String1: /root/flowVars/username
  Object1:
    String1: /root/customerNumber
    Num1: /root/Count
  Array1: 
  - /root/Count
  - /root/Count1
  - /root/Num
  ComplexArray1: # Array of objects
    - F1: /root/Num
      F2: /root/Count
    - F1: /root/Count
      F2: /root/Num
  ComplexArray2: # Array of arrays
    - 
      - /root/Count
      - /root/Num
    - 
      - /root/Count
      - /root/Num
  Constants:
    String1: "Good String"
    String2: "Hello world!"
    Num: 12
    Decimal: 12.334
    Bool: $true
    Null: $null
  ConstantArray:
  - 12
  - 23
  ExpWithSourceNodes1: concat(/root/customerNumber, "Good enough", /root/Count) 
  #NodeWithAttributes:
  #  $@org: /root/salesOrg
  #  $@OrderNo: /root/OrderNo
  #  $value: concat(/root/customerNumber, "Good enough", /root/flowVars/username)
  #NodeWithoutValue:
  #  $@org: /root/salesOrg
  #  $@OrderNo: /root/OrderNo
  #NodeWithoutSource:
  #  $@org: /root/salesOrg
  #  $@OrderNo: /root/OrderNo
  #  $value: concat("$1", "Good enough", "$2")
  #NodeAttrWithStatement:
    #$if(/root/salesOrg):
    #  $@org: /root/salesOrg
    #$if(/root/Count):
    #  $@OrderNo: /root/OrderNo
    #$value: concat("$1", "Good enough", "$2")
  IfStatement-OK:
    $if(is-greater-than(/root/Num, 10)): "Good"
    #$elseif(/root/Num <= 10): "Bad"
    #$else: "OK"
  IfStatement-Bad:
    $if(is-greater-than(/root/Num1, 10)): 
      Good: "Good"
    $if(is-less-than-equal(/root/Num1, 10)): 
      Bad: "Bad"
    #$else: 
    #  OK: "OK"
  $if(is-less-than-equal(/root/Num2, 10)):
    T1: /root/Num2
  #$else: 
  #  T3: "Default"
  $if(/root/Count):
    T2: /root/Count
  ForLoop: # <ForLoop><row><T_COUNTRY/><TEL_NUMBER/></row><row><T_COUNTRY/><TEL_NUMBER/></row></ForLoop>
    $for(/root/generalData/address/telephone/*, $i):
      prop1: 
        TEL_NUMBER: number
        TEL_EXTENS: extension
        Index: subtract($i, 1)
      prop2: 
        TEL_Country: country
`;
