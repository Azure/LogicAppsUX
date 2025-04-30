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
  dispatch: AppDispatch,
  {
    isSaving,
    isPrimaryButtonDisabled,
    disabled,
    selectedWorkflowsList,
    updateWorkflowDataField,
    onSave,
    duplicateIds,
  }: ConfigureWorkflowsTabProps & {
    duplicateIds: string[];
    updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
  }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CUSTOMIZE_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Customize workflows',
    id: 'qnio+9',
    description: 'The tab label for the monitoring customize workflows tab on the configure template wizard',
  }),
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
    primaryButtonText: isSaving ? (
      <Spinner size="tiny" />
    ) : (
      intl.formatMessage({
        defaultMessage: 'Save changes',
        id: '3jqHdn',
        description: 'Button text for saving changes in the configure workflows panel',
      })
    ),
    primaryButtonOnClick: () => {
      onSave?.();
      // dispatch(closePanel());
    },
    primaryButtonDisabled: isPrimaryButtonDisabled || isSaving,
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '75zXUl',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
    },
    secondaryButtonDisabled: isSaving,
  },
});
