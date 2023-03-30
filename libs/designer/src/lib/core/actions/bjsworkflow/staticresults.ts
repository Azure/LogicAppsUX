export enum StaticResultOption {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}

export interface NodeStaticResults {
  name: string;
  staticResultOptions: StaticResultOption;
}
