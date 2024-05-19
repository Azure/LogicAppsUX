/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultRoutePrefix } from '../../constants';
import { isObject, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { IBundleMetadata, IHostJsonV1, IHostJsonV2, IParsedHostJson } from '@microsoft/vscode-extension-logic-apps';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';

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

class ParsedHostJsonV1 implements IParsedHostJson {
  public data: IHostJsonV1;

  public constructor(data: unknown) {
    if (!isNullOrUndefined(data) && isObject(data)) {
      this.data = data as IHostJsonV1;
    } else {
      this.data = {};
    }
  }

  public get routePrefix(): string {
    if (this.data.http && this.data.http.routePrefix !== undefined) {
      return this.data.http.routePrefix;
    }
    return defaultRoutePrefix;
  }
}

export function parseHostJson(data: unknown, version: FuncVersion | undefined): IParsedHostJson {
  return version === FuncVersion.v1 ? new ParsedHostJsonV1(data) : new ParsedHostJsonV2(data);
}
