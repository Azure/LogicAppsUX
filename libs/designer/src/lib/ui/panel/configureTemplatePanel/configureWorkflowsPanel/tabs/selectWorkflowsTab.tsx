import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
import { Text } from '@fluentui/react-components';

export const SelectWorkflows = () => {
  return <Text>placeholder</Text>;
};

export const selectWorkflowsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { hasError, isSaving, onClosePanel }: ConfigureWorkflowsTabProps
): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.SELECT_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Select workflows',
    id: 'vWOWFo',
    description: 'The tab label for the monitoring select workflows tab on the configure template wizard',
  }),
  hasError: hasError,
  content: <SelectWorkflows />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(constants.TEMPLATE_TAB_NAMES.CUSTOMIZE_WORKFLOWS));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '75zXUl',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
      onClosePanel();

      //TODO: revert all changes
    },
    secondaryButtonDisabled: isSaving,
  },
});
