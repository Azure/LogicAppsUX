import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel } from '../../../../../core/state/templates/panelSlice';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
import type { WorkflowTemplateData } from '../../../../../core';
import { CustomizeWorkflows } from '../../../workflows/customizeWorkflows';
import { Spinner } from '@fluentui/react-components';

export const customizeWorkflowsTab = (
  intl: IntlShape,
  resources: Record<string, string>,
  dispatch: AppDispatch,
  {
    isSaving,
    isPrimaryButtonDisabled,
    onTabClick,
    disabled,
    selectedWorkflowsList,
    updateWorkflowDataField,
    onSave,
    duplicateIds,
    onClose,
  }: ConfigureWorkflowsTabProps & {
    duplicateIds: string[];
    updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
  }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CUSTOMIZE_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Set up workflows',
    id: 'sQmPbe',
    description: 'The tab label for the monitoring setup workflows tab on the configure template wizard',
  }),
  onTabClick: onTabClick,
  disabled: disabled,
  tabStatusIcon: undefined,
  content: (
    <CustomizeWorkflows
      selectedWorkflowsList={selectedWorkflowsList}
      updateWorkflowDataField={updateWorkflowDataField}
      duplicateIds={duplicateIds}
    />
  ),
  footerContent: {
    buttonContents: [
      {
        type: 'action',
        text: isSaving ? (
          <Spinner size="tiny" />
        ) : (
          intl.formatMessage({
            defaultMessage: 'Save',
            id: 'hqrLAF',
            description: 'Button text for saving changes in the configure workflows panel',
          })
        ),
        onClick: () => onSave?.(),
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled || isSaving,
      },
      {
        type: 'action',
        text: intl.formatMessage({
          defaultMessage: 'Cancel',
          id: '75zXUl',
          description: 'Button text for closing the panel',
        }),
        onClick: () => {
          if (onClose) {
            onClose();
          } else {
            dispatch(closePanel());
          }
        },
        disabled: isSaving,
      },
    ],
  },
});
