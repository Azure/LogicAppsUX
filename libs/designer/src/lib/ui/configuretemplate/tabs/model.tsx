import type { TemplateTabStatusType } from '@microsoft/designer-ui';
import type { Template } from '@microsoft/logic-apps-shared';

export interface TemplateWizardTabProps {
  disabled?: boolean;
  tabStatusIcon?: TemplateTabStatusType;
  onSave?: (newStatus?: Template.TemplateEnvironment) => void;
  status?: Template.TemplateEnvironment;
}
