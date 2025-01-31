import {
  describe,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  it,
  test,
  expect,
} from "vitest";
import {
  applyValueAtPath,
  createNewPathItems,
  createYamlFromMap,
  createYamlFromMapV2,
  findKeyInMap,
  sortConnectionsToTargetNodes,
} from "../MapDefinitionSerializer";
import {
  MapDefinitionEntry,
  MapDefinitionEntryV2,
  SchemaNode,
  SchemaNodeExtended,
} from "@microsoft/logic-apps-shared";
import YAML from "yaml";
import {
  Connection,
  ConnectionDictionary,
  InputConnection,
} from "../../models/Connection";

describe("serialization helpers", () => {
  describe("createYamlFromMap", () => {
    it("try array", () => {
      const mapDefinition = {
        $version: "1.0",
        $input: "XML",
        $output: "XML",
        $sourceSchema: "Source.xsd",
        $targetSchema: "Target.xsd",
        $sourceNamespaces: {
          ns0: "http://tempuri.org/source.xsd",
          xs: "http://www.w3.org/2001/XMLSchema",
        },
        $targetNamespaces: {
          ns0: "http://tempuri.org/Target.xsd",
          td: "http://tempuri.org/TypeDefinition.xsd",
          xs: "http://www.w3.org/2001/XMLSchema",
        },
        "ns0:Root": {
          DirectTranslation: {
            Employee: {
              Name: "/ns0:Root/DirectTranslation/EmployeeID",
              Name1: "/ns0:Root/DirectTranslation/EmployeeName",
            },
          },
        },
      };
      const map = createYamlFromMap(
        mapDefinition as any as MapDefinitionEntry,
        targetSchemaSortArray
      );
      console.log(map);
    });
  });

  describe("findKeyInMap", () => {
    it("finds key for if", () => {
      const mapSegment = {
        Employee: {
          "$if(/ns0:Root/DirectTranslation/EmployeeID)": {
            ID: "/ns0:Root/DirectTranslation/EmployeeName",
          },
          Name: "/ns0:Root/DirectTranslation/EmployeeName",
        },
      };
      const key = "$if(/ns0:Root/DirectTranslation/EmployeeID)";

      const keyResult = findKeyInMap(mapSegment, key);
      expect(keyResult).toEqual("ID");
    });

    it("test YAML", () => {
      const set1 = new Set();
      set1.add({ one: "one" });
      set1.add({ two: "two" });

      const map1 = new Map();
      map1.set("one", "one");
      map1.set("two", "two");

      const sampleMap = {
        outer: "outer",
        set: set1,
        map: map1,
      };

      let yamlStr = YAML.stringify(sampleMap);
      yamlStr = yamlStr.replaceAll("  -", " ");
      console.log(yamlStr);
    });
  });

  describe("applyValueAtPath", () => {
    it("apply", () => {
      const blankMapDefinition = {
        $version: "1.0",
        $input: "XML",
        $output: "XML",
        $sourceSchema: "Source.xsd",
        $targetSchema: "Target.xsd",
        $sourceNamespaces: {
          ns0: "http://tempuri.org/source.xsd",
          xs: "http://www.w3.org/2001/XMLSchema",
        },
        $targetNamespaces: {
          ns0: "http://tempuri.org/Target.xsd",
          td: "http://tempuri.org/TypeDefinition.xsd",
          xs: "http://www.w3.org/2001/XMLSchema",
        },
      };
      const path = [
        { key: "ns0:Root" },
        { key: "DirectTranslation" },
        { key: "Employee" },
        { key: "ID", value: "/ns0:Root/DirectTranslation/EmployeeID" },
      ];

      applyValueAtPath(blankMapDefinition, path);

      const result = {
        $version: "1.0",
        $input: "XML",
        $output: "XML",
        $sourceSchema: "Source.xsd",
        $targetSchema: "Target.xsd",
        $sourceNamespaces: {
          ns0: "http://tempuri.org/source.xsd",
          xs: "http://www.w3.org/2001/XMLSchema",
        },
        $targetNamespaces: {
          ns0: "http://tempuri.org/Target.xsd",
          td: "http://tempuri.org/TypeDefinition.xsd",
          xs: "http://www.w3.org/2001/XMLSchema",
        },
        "ns0:Root": {
          DirectTranslation: {
            Employee: { ID: "/ns0:Root/DirectTranslation/EmployeeID" },
          },
        },
      };
      expect(blankMapDefinition).toEqual(result);
    });
  });

  describe("sortConnectionsToTargetNodes", () => {
    it("sorts connections to target nodes", () => {
      const sorted = sortConnectionsToTargetNodes(
        partialTargetSchemaConnections as [string, Connection][],
        targetSchemaSortArray
      );
      expect(sorted).toEqual([
        ["target-/ns0:Root/DirectTranslation/Employee", {}],
        ["target-/ns0:Root/DirectTranslation/Employee/ID", {}],
        ["target-/ns0:Root/DirectTranslation/Employee/Name", {}],
        ["target-/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime", {}],
        [
          "target-/ns0:Root/CumulativeExpression/PopulationSummary/State/Name",
          {},
        ],
      ]);
    });
  });
  describe("createNewPathItems", () => {
    it("creates new path item", () => {
      const result: MapDefinitionEntryV2 = [];
      createNewPathItems(input, schemaNode, connectionsSimple, result);
      console.log(result);
      expect(result).toEqual([
        {
          key: "ns0:Root",
          value: [
            {
              key: "DirectTranslation",
              value: [
                {
                  key: "Employee",
                  value: [
                    {
                      key: "ID",
                      value: "/ns0:Root/DirectTranslation/EmployeeID",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
      const yamlStr = createYamlFromMapV2(result);
      console.log(yamlStr);
    });
  });
});

const input: InputConnection = {
  isDefined: true,
  isCustom: false,
  node: {
    key: "/ns0:Root/DirectTranslation/EmployeeID",
    name: "EmployeeID",
    type: "Decimal",
    properties: "None",
    qName: "EmployeeID",
    parentKey: "/ns0:Root/DirectTranslation",
    nodeProperties: ["None"],
    children: [],
    pathToRoot: [
      { key: "/ns0:Root", name: "Root", qName: "ns0:Root", repeating: false },
      {
        key: "/ns0:Root/DirectTranslation",
        name: "DirectTranslation",
        qName: "DirectTranslation",
        repeating: false,
      },
      {
        key: "/ns0:Root/DirectTranslation/EmployeeID",
        name: "EmployeeID",
        qName: "EmployeeID",
        repeating: false,
      },
    ],
  },
  reactFlowKey: "source-/ns0:Root/DirectTranslation/EmployeeID",
};

const schemaNode: SchemaNodeExtended = {
  key: "/ns0:Root/DirectTranslation/Employee/ID",
  name: "ID",
  type: "Decimal",
  properties: "None",
  qName: "ID",
  parentKey: "/ns0:Root/DirectTranslation/Employee",
  nodeProperties: ["None"],
  children: [],
  pathToRoot: [
    { key: "/ns0:Root", name: "Root", qName: "ns0:Root", repeating: false },
    {
      key: "/ns0:Root/DirectTranslation",
      name: "DirectTranslation",
      qName: "DirectTranslation",
      repeating: false,
    },
    {
      key: "/ns0:Root/DirectTranslation/Employee",
      name: "Employee",
      qName: "Employee",
      repeating: false,
    },
    {
      key: "/ns0:Root/DirectTranslation/Employee/ID",
      name: "ID",
      qName: "ID",
      repeating: false,
    },
  ],
};

const connectionsSimple: ConnectionDictionary = {
  "target-/ns0:Root/DirectTranslation/Employee/ID": {
    self: {
      node: {
        key: "/ns0:Root/DirectTranslation/Employee/ID",
        name: "ID",
        type: "Decimal",
        properties: "None",
        qName: "ID",
        parentKey: "/ns0:Root/DirectTranslation/Employee",
        nodeProperties: ["None"],
        children: [],
        pathToRoot: [
          {
            key: "/ns0:Root",
            name: "Root",
            qName: "ns0:Root",
            repeating: false,
          },
          {
            key: "/ns0:Root/DirectTranslation",
            name: "DirectTranslation",
            qName: "DirectTranslation",
            repeating: false,
          },
          {
            key: "/ns0:Root/DirectTranslation/Employee",
            name: "Employee",
            qName: "Employee",
            repeating: false,
          },
          {
            key: "/ns0:Root/DirectTranslation/Employee/ID",
            name: "ID",
            qName: "ID",
            repeating: false,
          },
        ],
      },
      reactFlowKey: "target-/ns0:Root/DirectTranslation/Employee/ID",
      isDefined: true,
      isCustom: false,
    },
    inputs: [
      {
        isDefined: true,
        isCustom: false,
        node: {
          key: "/ns0:Root/DirectTranslation/EmployeeID",
          name: "EmployeeID",
          type: "Decimal",
          properties: "None",
          qName: "EmployeeID",
          parentKey: "/ns0:Root/DirectTranslation",
          nodeProperties: ["None"],
          children: [],
          pathToRoot: [
            {
              key: "/ns0:Root",
              name: "Root",
              qName: "ns0:Root",
              repeating: false,
            },
            {
              key: "/ns0:Root/DirectTranslation",
              name: "DirectTranslation",
              qName: "DirectTranslation",
              repeating: false,
            },
            {
              key: "/ns0:Root/DirectTranslation/EmployeeID",
              name: "EmployeeID",
              qName: "EmployeeID",
              repeating: false,
            },
          ],
        },
        reactFlowKey: "source-/ns0:Root/DirectTranslation/EmployeeID",
      },
    ],
    outputs: [],
  },
  "source-/ns0:Root/DirectTranslation/EmployeeID": {
    self: {
      node: {
        key: "/ns0:Root/DirectTranslation/EmployeeID",
        name: "EmployeeID",
        type: "Decimal",
        properties: "None",
        qName: "EmployeeID",
        parentKey: "/ns0:Root/DirectTranslation",
        nodeProperties: ["None"],
        children: [],
        pathToRoot: [
          {
            key: "/ns0:Root",
            name: "Root",
            qName: "ns0:Root",
            repeating: false,
          },
          {
            key: "/ns0:Root/DirectTranslation",
            name: "DirectTranslation",
            qName: "DirectTranslation",
            repeating: false,
          },
          {
            key: "/ns0:Root/DirectTranslation/EmployeeID",
            name: "EmployeeID",
            qName: "EmployeeID",
            repeating: false,
          },
        ],
      },
      reactFlowKey: "source-/ns0:Root/DirectTranslation/EmployeeID",
      isDefined: true,
      isCustom: false,
    },
    inputs: [{ isDefined: false, isCustom: false }],
    outputs: [
      {
        node: {
          key: "/ns0:Root/DirectTranslation/Employee/ID",
          name: "ID",
          type: "Decimal",
          properties: "None",
          qName: "ID",
          parentKey: "/ns0:Root/DirectTranslation/Employee",
          nodeProperties: ["None"],
          children: [],
          pathToRoot: [
            {
              key: "/ns0:Root",
              name: "Root",
              qName: "ns0:Root",
              repeating: false,
            },
            {
              key: "/ns0:Root/DirectTranslation",
              name: "DirectTranslation",
              qName: "DirectTranslation",
              repeating: false,
            },
            {
              key: "/ns0:Root/DirectTranslation/Employee",
              name: "Employee",
              qName: "Employee",
              repeating: false,
            },
            {
              key: "/ns0:Root/DirectTranslation/Employee/ID",
              name: "ID",
              qName: "ID",
              repeating: false,
            },
          ],
        },
        reactFlowKey: "target-/ns0:Root/DirectTranslation/Employee/ID",
        isCustom: false,
        isDefined: true,
      },
    ],
  },
};

const partialTargetSchemaConnections = [
  ["target-/ns0:Root/DirectTranslation/Employee", {}],
  ["target-/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime", {}],
  ["target-/ns0:Root/DirectTranslation/Employee/ID", {}],
  ["target-/ns0:Root/DirectTranslation/Employee/Name", {}],
  ["target-/ns0:Root/CumulativeExpression/PopulationSummary/State/Name", {}],
];

const targetSchemaSortArray = [
  "/ns0:Root",
  "/ns0:Root/DirectTranslation",
  "/ns0:Root/DirectTranslation/Employee",
  "/ns0:Root/DirectTranslation/Employee/ID",
  "/ns0:Root/DirectTranslation/Employee/Name",
  "/ns0:Root/DataTranslation",
  "/ns0:Root/DataTranslation/EmployeeName",
  "/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime",
  "/ns0:Root/DataTranslation/EmployeeName/@<AnyAttribute>",
  "/ns0:Root/ContentEnrich",
  "/ns0:Root/ContentEnrich/DateOfDemo",
  "/ns0:Root/CumulativeExpression",
  "/ns0:Root/CumulativeExpression/PopulationSummary",
  "/ns0:Root/CumulativeExpression/PopulationSummary/State",
  "/ns0:Root/CumulativeExpression/PopulationSummary/State/Name",
  "/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio",
  "/ns0:Root/ConditionalMapping",
  "/ns0:Root/ConditionalMapping/ItemPrice",
  "/ns0:Root/ConditionalMapping/ItemQuantity",
  "/ns0:Root/ConditionalMapping/ItemDiscount",
  "/ns0:Root/Looping",
  "/ns0:Root/Looping/Person",
  "/ns0:Root/Looping/Person/Name",
  "/ns0:Root/Looping/Person/Address",
  "/ns0:Root/Looping/Person/Other",
  "/ns0:Root/Looping/Person/Publisher",
  "/ns0:Root/Looping/Trips",
  "/ns0:Root/Looping/Trips/Trip",
  "/ns0:Root/Looping/Trips/Trip/VehicleRegistration",
  "/ns0:Root/Looping/Trips/Trip/Distance",
  "/ns0:Root/Looping/Trips/Trip/Duration",
  "/ns0:Root/ConditionalLooping",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Name",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/SKU",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Price",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct/Name",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct/SKU",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/GroovyProduct/Price",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct/Name",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct/SKU",
  "/ns0:Root/ConditionalLooping/CategorizedCatalog/OfficeProduct/Price",
  "/ns0:Root/LoopingWithIndex",
  "/ns0:Root/LoopingWithIndex/WeatherSummary",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day1",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Name",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/WindSpeed",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Temperature",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/<AnyElement>",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day2",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Name",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Pressure",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/WindSpeed",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/<AnyElement>",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Name",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Pressure",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day/WindSpeed",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Temperature",
  "/ns0:Root/LoopingWithIndex/WeatherSummary/Day/<AnyElement>",
  "/ns0:Root/NameValueTransforms",
  "/ns0:Root/NameValueTransforms/FlatterCatalog",
  "/ns0:Root/NameValueTransforms/FlatterCatalog/Price",
  "/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Pen",
  "/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Pencil",
  "/ns0:Root/NameValueTransforms/FlatterCatalog/Price/NoteBook",
  "/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Bag",
  "/ns0:Root/NameValueTransforms/FlatterCatalog/Price/Others",
  "/ns0:Root/NameValueTransforms/PO_Status",
  "/ns0:Root/NameValueTransforms/PO_Status/ShipDate",
  "/ns0:Root/NameValueTransforms/PO_Status/ShippedVia",
  "/ns0:Root/NameValueTransforms/PO_Status/Product",
  "/ns0:Root/NameValueTransforms/PO_Status/Product/ProductIdentifier",
  "/ns0:Root/NameValueTransforms/PO_Status/Product/OrderStatusQuantity",
  "/ns0:Root/NameValueTransforms/PO_Status/Product/OrderStatusQuantity/GlobalOrderQuantityTypeCode",
  "/ns0:Root/NameValueTransforms/PO_Status/Product/OrderStatusQuantity/ProductQuantity",
];
