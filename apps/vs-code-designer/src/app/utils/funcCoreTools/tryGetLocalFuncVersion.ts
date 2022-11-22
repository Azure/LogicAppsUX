/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FuncVersion } from '@microsoft-logic-apps/utils';
import { tryParseFuncVersion } from './funcVersion';
import { getLocalFuncCoreToolsVersion } from './getLocalFuncCoreToolsVersion';

export async function tryGetLocalFuncVersion(): Promise<FuncVersion | undefined> {
    try {
        const version: string | null = await getLocalFuncCoreToolsVersion();
        if (version) {
            return tryParseFuncVersion(version);
        }
    } catch (err) {
        // swallow errors and return undefined
    }

    return undefined;
}
