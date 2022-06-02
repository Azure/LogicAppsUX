export const cbrInputRecordMapDefinitionMock =
  // 'sourceSchema: SrcInputRecord.xsd\ntargetSchema: CBRInputRecord.xsd\nns0:CBRInputRecord:\n\t@OrderedItem: /ns0:SrcInputRecord/@Item\n\tIdentity:\n\t\t@UserID: /ns0:SrcInputRecord/SrcInputRecord/ID\n\t\t@LastName: /ns0:SrcInputRecord/SrcInputRecord/LastName\n\t\t@FirstName: /ns0:SrcInputRecord/SrcInputRecord/FirstName\n\t\t@LastName: /ns0:SrcInputRecord/SrcInputRecord/LastName\n\t\t@Initial: /ns0:SrcInputRecord/SrcInputRecord/Initial\n\t\tAddress:\n\t\t\t/ns0:CBRInputRecord/Customer/Address/AddressLine1: concat(/ns0:SrcInputRecord/SrcInputRecord/Address/AddressLine1 , ‘ ’, /ns0:SrcInputRecord/SrcInputRecord/Address/AddressLine2)\n';
  `sourceSchema: SrcInputRecord.xsd
targetSchema: CBRInputRecord.xsd
ns0:CBRInputRecord:
	@OrderedItem: /ns0:SrcInputRecord/@Item
	Identity:
		@UserID: /ns0:SrcInputRecord/SrcInputRecord/ID
		@LastName: /ns0:SrcInputRecord/SrcInputRecord/LastName
		@FirstName: /ns0:SrcInputRecord/SrcInputRecord/FirstName
		@LastName: /ns0:SrcInputRecord/SrcInputRecord/LastName
		@Initial: /ns0:SrcInputRecord/SrcInputRecord/Initial
		Address:
			/ns0:CBRInputRecord/Customer/Address/AddressLine1: concat(/ns0:SrcInputRecord/SrcInputRecord/Address/AddressLine1 , ‘ ’, /ns0:SrcInputRecord/SrcInputRecord/Address/AddressLine2)`;
