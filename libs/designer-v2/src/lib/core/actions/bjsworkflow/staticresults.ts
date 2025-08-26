export const StaticResultOption = {
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
} as const;
export type StaticResultOption = (typeof StaticResultOption)[keyof typeof StaticResultOption];
export interface NodeStaticResults {
  name: string;
  staticResultOptions: StaticResultOption;
}
