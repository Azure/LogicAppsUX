export interface ArmResource<TProperties> {
  id: string;
  type: string;
  name: string;
  location?: string;
  kind?: string;
  tags?: Record<string, string>;
  properties: TProperties;
  systemData?: {
    createdAt: string;
    createdBy: string;
    createdByType: string;
    lastModifiedAt: string;
    lastModifiedBy: string;
    lastModifiedByType: string;
  };
}

export interface ArmResources<TResource> {
  value: TResource[];
  nextLink?: string;
}
