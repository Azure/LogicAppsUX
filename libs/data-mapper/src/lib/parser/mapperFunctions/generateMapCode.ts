import type { Schema } from '../runtime/schema/dataModels';
import { InvalidRequestErrorCode, InvalidRequestException } from '../utils/exceptions/invalidRequestException';
import { getSchemaTreeFromFile } from '../utils/functions';

export async function generateMapCode(jsonInString: string): Promise<string> {
  const data = JSON.parse(jsonInString);
  const srcSchemaName = data.srcSchemaName;
  const dstSchemaName = data.dstSchemaName;
  if (!srcSchemaName || !dstSchemaName || !data.uiOm) {
    throw new InvalidRequestException(InvalidRequestErrorCode.GENERATE_MAP_CODE, InvalidRequestErrorCode.GENERATE_MAP_CODE);
  }
  // const sourceSchema: Schema = await getSchemaTreeFromFile(srcSchemaName);
  // const targetSchema: Schema = await getSchemaTreeFromFile(dstSchemaName);

  return '';
}
