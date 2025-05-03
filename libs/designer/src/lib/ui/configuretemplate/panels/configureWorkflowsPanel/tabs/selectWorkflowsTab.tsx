import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
import { SelectWorkflows } from '../../../workflows/selectWorkflows';

export const selectWorkflowsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    isSaving,
    isPrimaryButtonDisabled,
    selectedWorkflowsList,
    onWorkflowsSelected,
    onNextButtonClick,
  }: ConfigureWorkflowsTabProps & {
    onWorkflowsSelected: (normalizedWorkflowIds: string[]) => void;
    onNextButtonClick: () => Promise<void>;
  }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.SELECT_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Select workflows',
    id: 'vWOWFo',
    description: 'The tab label for the monitoring select workflows tab on the configure template wizard',
  }),
  disabled: isSaving,
  content: <SelectWorkflows selectedWorkflowsList={selectedWorkflowsList} onWorkflowsSelected={onWorkflowsSelected} />,
  footerContent: {
    buttonContents: [
      {
        type: 'button',
        text: intl.formatMessage({
          defaultMessage: 'Next',
          id: '0UfxUM',
          description: 'Button text for moving to the next tab in the create workflow panel',
        }),
        appreance: 'primary',
        onClick: () => {
          dispatch(selectPanelTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CUSTOMIZE_WORKFLOWS));
          onNextButtonClick();
        },
        disabled: isPrimaryButtonDisabled,
      },
      {
        type: 'button',
        text: intl.formatMessage({
          defaultMessage: 'Cancel',
          id: '75zXUl',
          description: 'Button text for closing the panel',
        }),
        onClick: () => {
          dispatch(closePanel());
        },
        disabled: isSaving,
      },
    ],
  },
});
