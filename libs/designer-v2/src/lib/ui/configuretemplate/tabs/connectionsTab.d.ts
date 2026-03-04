import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import type { TemplateWizardTabProps } from './model';
export declare const connectionsTab: (intl: IntlShape, resources: Record<string, string>, dispatch: AppDispatch, { disabled, tabStatusIcon }: TemplateWizardTabProps) => TemplateTabProps;
