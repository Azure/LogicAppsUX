import type { ValidationError } from '../../../ui/settings/validation/validation';

export const SettingSectionName  = {
  DATAHANDLING : 'datahandling',
  GENERAL : 'general',
  NETWORKING : 'networking',
  RUNAFTER : 'runafter',
  SECURITY : 'security',
  TRACKING : 'tracking',
} as const
export type SettingSectionName = typeof SettingSectionName[keyof typeof SettingSectionName];

export interface SettingsState {
  validationErrors: Record<string, ValidationError[]>;
  expandedSections: SettingSectionName[];
}
