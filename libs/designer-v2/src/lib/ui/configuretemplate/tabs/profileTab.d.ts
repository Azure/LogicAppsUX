import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { TemplateWizardTabProps } from './model';
import type { IntlShape } from 'react-intl';
export declare const profileTab: (intl: IntlShape, resources: Record<string, string>, dispatch: AppDispatch, { disabled, tabStatusIcon, onSave, isSaveButtonDisabled }: TemplateWizardTabProps & {
    isSaveButtonDisabled: boolean;
}) => TemplateTabProps;
