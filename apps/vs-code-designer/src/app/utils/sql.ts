/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';

export async function validateSQLConnectionString(connectionString: string): Promise<string | undefined> {
  if (!connectionString) {
    return localize('emptySqlConnectionString', 'The SQL connection string value cannot be empty');
  }
  return undefined;
}
