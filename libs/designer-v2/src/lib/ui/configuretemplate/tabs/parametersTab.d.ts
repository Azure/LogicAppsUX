import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { TemplateWizardTabProps } from './model';
export declare const parametersTab: (resources: Record<string, string>, dispatch: AppDispatch, { disabled, tabStatusIcon }: TemplateWizardTabProps) => TemplateTabProps;
