import type { Schema } from '../runtime/schema/dataModels';

export async function getSchemaTreeFromFile(fileName: string): Promise<Schema | null> {
  // FileInfo fi = new FileInfo(fileName);
  // string type = fi.Extension.ToLower() == ".xsd" ? "XML" : "JSON";
  // string schemaLocation = Path.Combine("Schemas", type, fileName);
  // string schemaContent = await File.ReadAllTextAsync(schemaLocation);
  // return SchemaCompiler.GetSchemaTree(fileName, schemaContent);
  // return new Schema('', '', '', '', '',);
  return null;
}
