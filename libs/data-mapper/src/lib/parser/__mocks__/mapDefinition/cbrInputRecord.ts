export const cbrInputRecordMapDefinitionMock = `$sourceSchema: SrcInputRecord.xsd
$targetSchema: CBRInputRecord.xsd
ns0:CBRInputRecord:
  $@OrderedItem: /ns0:SrcInputRecord/@Item
  Identity:
    $@UserID: /ID
    $@FirstName: /FirstName
    $@LastName: /LastName
    $@Initial: /Initial
    Address: concat(/Address/AddressLine1 , ' ', /Address/AddressLine2)`;
