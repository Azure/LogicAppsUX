# Schema reference samples

Test files for how the mapper resolves schemas referenced from `.btm` files and from `.xsd` files (`xs:import`, `xs:include`, `xs:redefine`). Open each `.btm` with the Logic App Data Mapper custom editor and check that the source and target trees load.

Every map uses the same shape so results are easy to compare: source `/Order/{OrderId, CustomerName, ShipTo/{Street, City, PostalCode}, Total}`, target `/Invoice/{InvoiceId, Customer, BillTo/{Street, City, PostalCode}, Amount}`, with five schemaNode-to-schemaNode links (Aggregate maps use `/Root/msgOrder/Order/...` for the source paths).

## `.btm` schema reference forms

| Map | Reference form | Expected |
| --- | --- | --- |
| `01_FileRef_DotSlash` | `Location=".\file.xsd"` (path with backslash, relative to the .btm) | Loads. Source imports `.\Common.xsd`. |
| `02_FileRef_BareFilename` | `Location="file.xsd"` (no backslash; BizTalk treats it as a .NET name) | Loads via fallback to a file next to the .btm. |
| `03_FileRef_Subfolder` | `.\Shared\SubfolderOrder.xsd` | Loads. Schema imports `..\Common.xsd` and `.\Currency.xsd`. |
| `Maps/04_FileRef_ParentRelative` | `..\file.xsd` from a subfolder | Loads. |
| `05_DotNetName` | `Samples.Schemas.Import_Relative` (.NET type name) | Loads by short-name fallback. BizTalk would need the assembly/project. |
| `06_DotNetName_SchemaSuffix` | `Samples.Schemas.Import_BareFilenameSchema` | Loads by stripping the `Schema` suffix. |
| `07_RootNode_FileRef` | `RootNode_Name` on a multi-root file (`MultiRoot.xsd`) | Source shows only `Order`, target only `Invoice`. |
| `08_RootNode_DotNetName` | `RootNode_Name` with a .NET name | Same as 07. |
| `09_Inline_Source` | Full `xs:schema` embedded in `SrcTree` | Loads from the embedded schema. |
| `10_Inline_SourceAndTarget` | Embedded schema in both trees | Loads. |
| `11_Inline_Aggregate_FileParts` | Multi-part message: synthetic `Root`, one `xs:import` per part, `msgXxx` wrappers with `ref` | Source tree `Root > msgOrder > Order`, `Root > msgCustomer > Customer`. |
| `12_Inline_Aggregate_DotNetParts` | Same as 11 with .NET names in the part imports | Same as 11. |

## `.xsd` dependency forms

| Map (source xsd) | Form | Expected |
| --- | --- | --- |
| `13_Import_TransitiveTarget` | Import chain `Import_Transitive` > `Shared/Wrapper` > `..\Common`, `.\Currency`; target imports `.\Common.xsd` | Loads; `ShipTo` / `BillTo` resolve to `AddressType`. |
| `14_Import_DotNetSchemaLocation` | `schemaLocation="Samples.Schemas.Common"` | Loads via short name. |
| `15_Import_DotNetSchemaSuffixLocation` | `schemaLocation="Samples.Schemas.CommonSchema"` | Loads via suffix stripping. |
| `16_Import_NoSchemaLocation` | `<xs:import namespace="..."/>` with no `schemaLocation` | Valid XSD and BizTalk loads it. **Likely fails in v3 today** (resolver throws "does not specify schemaLocation"). |
| `17_Import_Diamond` | `Common.xsd` reachable directly and through `Wrapper.xsd` | Loads; `Common.xsd` processed once. |
| `18_Import_Circular` | `Circular_A` and `Circular_B` import each other | Loads; no infinite recursion. |
| `19_Include_SameNamespace` | `xs:include` of a same-namespace file | Loads. |
| `20_Include_Chameleon` | `xs:include` of a file with no `targetNamespace` | Loads; types adopt the includer's namespace. |
| `21_Redefine` | `xs:redefine` extending `AddressType` | BizTalk shows `Street`, `City`, `PostalCode`. **Likely incomplete in v3 today** (`xs:redefine` is not handled). |

## Negative cases

| Map | Form | Expected |
| --- | --- | --- |
| `22_Missing_SchemaReference` | `Reference` to a non-existent file | Clear error naming the missing file. |
| `23_Missing_ImportedSchema` | Source xsd imports a missing `.\NotThere.xsd` | Clear error naming the missing import. |

The two "likely" results come from reading the current resolver code, not from running these samples.
