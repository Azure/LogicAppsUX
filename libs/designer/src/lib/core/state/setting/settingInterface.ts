import type { ValidationError } from '../../../ui/settings/validation/validation';

export enum SettingSectionName {
  DATAHANDLING = 'datahandling',
  GENERAL = 'general',
  NETWORKING = 'networking',
  RUNAFTER = 'runafter',
  SECURITY = 'security',
  TRACKING = 'tracking',
}

export interface SettingsState {
  validationErrors: Record<string, ValidationError[]>;
  expandedSections: SettingSectionName[];
}
