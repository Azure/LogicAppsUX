/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultRoutePrefix } from '../../constants';
import { isObject, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { IBundleMetadata, IHostJsonV2, IParsedHostJson } from '@microsoft/vscode-extension-logic-apps';

class ParsedHostJsonV2 implements IParsedHostJson {
  public data: IHostJsonV2;

  public constructor(data: unknown) {
    if (!isNullOrUndefined(data) && isObject(data)) {
      this.data = data as IHostJsonV2;
    } else {
      this.data = {};
    }
  }

  public get routePrefix(): string {
    if (this.data.extensions && this.data.extensions.http && this.data.extensions.http.routePrefix !== undefined) {
      return this.data.extensions.http.routePrefix;
    }
    return defaultRoutePrefix;
  }

  public get bundle(): IBundleMetadata | undefined {
    return this.data.extensionBundle;
  }
}

export function parseHostJson(data: unknown): IParsedHostJson {
  return new ParsedHostJsonV2(data);
}
