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
  DirectTranslation:
    Employee:
      ID: /ns0:Root/DirectTranslation/EmployeeID
      Name: /ns0:Root/DirectTranslation/EmployeeName
  DataTranslation:
    # Mapping value to element with attribute.
    EmployeeName:
      $@RegularFulltime: /ns0:Root/DataTranslation/Employee/EmploymentStatus
      $value: concat(/ns0:Root/DataTranslation/Employee/FirstName, " ", /ns0:Root/DataTranslation/Employee/LastName)
  ContentEnrich:
    DateOfDemo: current-date()
  CumulativeExpression:
    PopulationSummary:
      $for(/ns0:Root/CumulativeExpression/Population/State):
        State:
          Name: Name
          SexRatio: string(divide(count(County/Person/Sex/Male), count(County/Person/Sex/Female)))
  ConditionalMapping:
    ItemPrice: /ns0:Root/ConditionalMapping/ItemPrice
    ItemQuantity: /ns0:Root/ConditionalMapping/ItemQuantity
    $if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200)):
      ItemDiscount: multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)
  Looping:
    $for(/ns0:Root/Looping/Employee):
      Person:
        Name: Name
        Address: Address
        Other: Country
    Trips:
      $for(/ns0:Root/Looping/VehicleTrips/Trips, $i):
        Trip:
          VehicleRegistration: /ns0:Root/Looping/VehicleTrips/Vehicle[is-equal(VehicleId, /ns0:Root/Looping/VehicleTrips/Trips[$i]/VehicleId)]/VehicleRegistration
          Distance: Distance
          Duration: Duration
  ConditionalLooping:
    # Following loop with 3 $if can be coded alternatively by including complex expressions inside selector in $for statements for-example: Product[is-equal(substring(SKU, 1, 2), "11")].
    # This version is simplified to what Data Mapper front end will generate. Map code can be manually authored with complex selector expressions for optimization or ease of read.
    $for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product):
      CategorizedCatalog:
        $if(is-equal(substring(SKU, 1, 2), "11")):
          PetProduct:
            Name: Name
            SKU: SKU
            Price: Price
        $if(is-equal(substring(SKU, 1, 2), "22")):
          GroovyProduct:
            Name: Name
            SKU: SKU
            Price: Price
        $if(is-equal(substring(SKU, 1, 2), "33")):
          OfficeProduct:
            Name: Name
            SKU: SKU
            Price: Price
  LoopingWithIndex:
    WeatherSummary:
      Day1:
        Name: '"Day 1"'
        Pressure: /ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure
        WindSpeed: /ns0:Root/LoopingWithIndex/WeatherReport[1]/@WindSpeed
        Temperature: /ns0:Root/LoopingWithIndex/WeatherReport[1]/@Temperature
      Day2:
        Name: '"Day 2"'
        Pressure: /ns0:Root/LoopingWithIndex/WeatherReport[2]/@Pressure
        WindSpeed: /ns0:Root/LoopingWithIndex/WeatherReport[2]/@WindSpeed
        Temperature: /ns0:Root/LoopingWithIndex/WeatherReport[2]/@Temperature
      $for(/ns0:Root/LoopingWithIndex/WeatherReport, $i):
        $if(is-greater-than($i, 2)):
          Day:
            Name: concat("Day ", $i)
            Pressure: ./@Pressure # @ character is not allowed as the first character for value in YAML. './' can be used to map relative path with attributes inside $for.
            WindSpeed: ./@WindSpeed
            Temperature: ./@Temperature
  NameValueTransforms:
    FlatterCatalog:
      $for(/ns0:Root/NameValueTransforms/Catalog/Product):
        $for(Field):
          Price:
            $if(is-equal(Name, "Pen")):
              Pen: Value
            $if(is-equal(Name, "Pencil")):
              Pencil: Value
            $if(is-equal(Name, "Notebook")):
              NoteBook: Value
            $if(is-equal(Name, "Bag")):
              Bag: Value
            $if(is-equal(Name, "Others")):
              Others: Value
    PO_Status:
      ShipDate: /ns0:Root/NameValueTransforms/PurchaseOrderStatus/DateShipped
      ShippedVia: '"Air"'
      $for(/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem):
        Product:
          ProductIdentifier: ItemNumber
          $for(QuantityOrdered):
            OrderStatusQuantity:
              GlobalOrderQuantityTypeCode: '"Ordered"'
              ProductQuantity: . # . can be used to access the value of current node for eg: here ProductQuantity is mapped to text value of QuantityOrdered.
          $for(QuantityShipped):
            OrderStatusQuantity:
              GlobalOrderQuantityTypeCode: '"Shipped"'
              ProductQuantity: .
          $for(QuantityBackordered):
            OrderStatusQuantity:
              GlobalOrderQuantityTypeCode: '"Backordered"'
              ProductQuantity: .
          $for(QuantityCancelled):
            OrderStatusQuantity:
              GlobalOrderQuantityTypeCode: '"Cancelled"'
              ProductQuantity: .
        # Alternative map for OrderQuantity
        #$if(and(exists(QuantityOrdered), not(is-nil(QuantityOrdered)))):
        #  OrderStatusQuantity:
        #    GlobalOrderQuantityTypeCode: '"Ordered"'
        #    ProductQuantity: QuantityOrdered
        #$if(and(exists(QuantityShipped), not(is-nil(QuantityShipped)))):
        #  OrderStatusQuantity:
        #    GlobalOrderQuantityTypeCode: '"Shipped"'
        #    ProductQuantity: QuantityShipped
        #$if(and(exists(QuantityBackordered), not(is-nil(QuantityBackordered)))):
        #  OrderStatusQuantity:
        #    GlobalOrderQuantityTypeCode: '"Backordered"'
        #    ProductQuantity: QuantityBackordered
        #$if(and(exists(QuantityCancelled), not(is-nil(QuantityCancelled)))):
        #  OrderStatusQuantity:
        #    GlobalOrderQuantityTypeCode: '"Cancelled"'
        #    ProductQuantity: QuantityCancelled
`;
