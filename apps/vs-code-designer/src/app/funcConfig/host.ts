/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FuncVersion, isObject } from '@microsoft-logic-apps/utils';

export interface IHostJsonV2 {
  version?: string;
  customHandler?: Record<string, any>;
  logging?: {
    applicationInsights?: {
      samplingSettings?: {
        isEnabled?: boolean;
        excludedTypes?: string;
      };
    };
  };
  managedDependency?: {
    enabled?: boolean;
  };
  extensionBundle?: IBundleMetadata;
  extensions?: {
    http?: {
      routePrefix?: string;
    };
  };
  concurrency?: {
    dynamicConcurrencyEnabled: boolean;
    snapshotPersistenceEnabled: boolean;
  };
}

export interface IBundleMetadata {
  id?: string;
  version?: string;
}

export interface IHostJsonV1 {
  http?: {
    routePrefix?: string;
  };
}

export interface IParsedHostJson {
  readonly routePrefix: string;
  readonly bundle?: IBundleMetadata;
}

const defaultRoutePrefix = 'api';

class ParsedHostJsonV2 implements IParsedHostJson {
  public data: IHostJsonV2;

  public constructor(data: unknown) {
    if (typeof data === 'object' && data !== null) {
      this.data = data as IHostJsonV2;
    } else {
      this.data = {};
    }
  }

  public get routePrefix(): string {
    if (this.data.extensions && this.data.extensions.http && this.data.extensions.http.routePrefix !== undefined) {
      return this.data.extensions.http.routePrefix;
    } else {
      return defaultRoutePrefix;
    }
  }

  public get bundle(): IBundleMetadata | undefined {
    return this.data.extensionBundle;
  }
}

class ParsedHostJsonV1 implements IParsedHostJson {
  public data: IHostJsonV1;

  public constructor(data: unknown) {
    if (isObject(data) && data !== null) {
      this.data = data as IHostJsonV1;
    } else {
      this.data = {};
    }
  }

  public get routePrefix(): string {
    // NOTE: Explicitly checking against undefined (an empty string _is_ a valid route prefix)
    if (this.data.http && this.data.http.routePrefix !== undefined) {
      return this.data.http.routePrefix;
    } else {
      return defaultRoutePrefix;
    }
  }
}

export function parseHostJson(data: unknown, version: FuncVersion | undefined): IParsedHostJson {
  return version === FuncVersion.v1 ? new ParsedHostJsonV1(data) : new ParsedHostJsonV2(data);
}
