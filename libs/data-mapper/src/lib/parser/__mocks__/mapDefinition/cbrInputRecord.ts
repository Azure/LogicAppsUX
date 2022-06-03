export const cbrInputRecordMapDefinitionMock = `$sourceSchema: SrcInputRecord.xsd
$targetSchema: CBRInputRecord.xsd
ns0:CBRInputRecord:
	$@OrderedItem: /ns0:SrcInputRecord/@Item
	Identity:
		$@UserID: /ns0:SrcInputRecord/SrcInputRecord/ID
		$@FirstName: /ns0:SrcInputRecord/SrcInputRecord/FirstName
		$@LastName: /ns0:SrcInputRecord/SrcInputRecord/LastName
		$@Initial: /ns0:SrcInputRecord/SrcInputRecord/Initial
		Address:
			/ns0:CBRInputRecord/Customer/Address/AddressLine1: concat(/ns0:SrcInputRecord/SrcInputRecord/Address/AddressLine1 , ‘ ’, /ns0:SrcInputRecord/SrcInputRecord/Address/AddressLine2)`;
