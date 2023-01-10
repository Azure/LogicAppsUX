export const fullTranscriptMapDefinitionString = `
$version: 1.0
$input: XML
$output: XML
$sourceSchema: Source.xsd
$targetSchema: Target.xsd
# Same namespace prefix can be used in sourceNamespaces and targetNamespaces for eg: ns0 used in targetNode name in map code refer to ns0 in target namespace and ns0 used in selector refer to ns0 in target namespace.
$sourceNamespaces:
  ns0: http://tempuri.org/source.xsd
  xs: http://www.w3.org/2001/XMLSchema
$targetNamespaces:
  ns0: http://tempuri.org/Target.xsd
  xs: http://www.w3.org/2001/XMLSchema
  td: http://tempuri.org/TypeDefinition.xsd
# This map code includes example of map including schema with unqualified defaultFormElement and defaultFormAttribute.
ns0:Root:
  Looping:
    Trips:
      $for(/ns0:Root/Looping/VehicleTrips/Trips, $i):
        Trip:
          # VehicleRegistration: /ns0:Root/Looping/VehicleTrips/Vehicle[is-equal(VehicleID, /ns0:Root/Looping/VehicleTrips/Trips[$i]/VehicleId)]/VehicleRegistration
          Distance: /ns0:Root/Looping/VehicleTrips/Vehicle[$i]/VehicleRegistration
`;
