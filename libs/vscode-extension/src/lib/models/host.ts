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
    workflow?: {
      settings?: {
        'Runtime.IsInvokeFunctionActionEnabled': 'true';
      };
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
