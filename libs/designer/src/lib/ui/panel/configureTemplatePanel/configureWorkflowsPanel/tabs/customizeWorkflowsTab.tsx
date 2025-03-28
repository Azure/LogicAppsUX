import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import { TemplatesSection, type TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel } from '../../../../../core/state/templates/panelSlice';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
import { initializeWorkflowsData } from '../../../../../core/actions/bjsworkflow/configuretemplate';
import type { WorkflowTemplateData } from '../../../../../core';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text } from '@fluentui/react-components';

export const CustomizeWorkflows = ({
  selectedWorkflowsList,
  updateWorkflowDataField,
}: {
  selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
  updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
}) => {
  const workflowEntries = Object.entries(selectedWorkflowsList);

  return (
    <div className="msla-templates-tab msla-panel-no-description-tab">
      {workflowEntries.length ? (
        workflowEntries.length > 1 ? (
          <Accordion multiple={true}>
            {Object.entries(selectedWorkflowsList).map(([workflowId, workflowData]) => (
              <AccordionItem value={workflowId} key={workflowId}>
                <AccordionHeader>
                  <Text style={{ fontWeight: 'bold' }}>{workflowId}</Text>
                </AccordionHeader>
                <AccordionPanel>
                  <CustomizeWorkflowSection
                    normalizedWorkflowId={workflowId}
                    workflow={workflowData}
                    updateWorkflowDataField={updateWorkflowDataField}
                  />
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <CustomizeWorkflowSection
            normalizedWorkflowId={workflowEntries[0][0]}
            workflow={workflowEntries[0][1]}
            updateWorkflowDataField={updateWorkflowDataField}
          />
        )
      ) : null}
    </div>
  );
};

const CustomizeWorkflowSection = ({
  normalizedWorkflowId,
  workflow,
  updateWorkflowDataField,
}: {
  normalizedWorkflowId: string;
  workflow: Partial<WorkflowTemplateData>;
  updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
}) => {
  return (
    <TemplatesSection
      title={'General'}
      // titleHtmlFor={'connectionsLabel'}
      items={[
        {
          label: 'Workflow name', //TODO: intl
          value: workflow.workflowName,
          type: 'textfield',
          onChange: (value: string) => {
            updateWorkflowDataField(normalizedWorkflowId, { workflowName: value });
          },
        },
        // {
        //   label: 'Workflow display name', //TODO: intl
        //   value: workflow.manifest?.title,
        //   type: 'textField',
        //   onChange: (value: string) => {
        //     updateWorkflowDataField(normalizedWorkflowId, {
        //       // ...workflow,
        //       manifest: {
        //       ...workflow.manifest,
        //       title: value,
        //     } });
        //   }
        // },
        // {
        //   label: 'Summary', //TODO: intl
        //   value: workflow.manifest?.summary,
        //   type: 'textField',
        //   onChange: (value: string) => {
        //     updateWorkflowDataField(normalizedWorkflowId, { workflowName: value });
        //   }
        // },
      ]}
    />
  );
};

export const customizeWorkflowsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    hasError,
    isSaving,
    onClosePanel,
    selectedWorkflowsList,
    updateWorkflowDataField,
  }: ConfigureWorkflowsTabProps & { updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CUSTOMIZE_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Customize workflows',
    id: 'qnio+9',
    description: 'The tab label for the monitoring customize workflows tab on the configure template wizard',
  }),
  hasError: hasError,
  content: <CustomizeWorkflows selectedWorkflowsList={selectedWorkflowsList} updateWorkflowDataField={updateWorkflowDataField} />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Save changes',
      id: '3jqHdn',
      description: 'Button text for saving changes in the configure workflows panel',
    }),
    primaryButtonOnClick: () => {
      //TODO: save changes
      dispatch(initializeWorkflowsData({}));

      dispatch(closePanel());
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
