import type { AppDispatch } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import { TemplatesSection, type TemplateTabProps, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { closePanel } from '../../../../../core/state/templates/panelSlice';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
import type { WorkflowTemplateData } from '../../../../../core';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text } from '@fluentui/react-components';
import type { Template } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useTemplatesStrings } from '../../../../templates/templatesStrings';
import { getWorkflownameFromWorkflowId } from '../../../../../core/actions/bjsworkflow/configuretemplate';

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
                  <Text style={{ fontWeight: 'bold' }}>{getWorkflownameFromWorkflowId(workflowId)}</Text>
                </AccordionHeader>
                <AccordionPanel>
                  <CustomizeWorkflowSection
                    normalizedWorkflowId={workflowId}
                    isMultiWorkflowTemplate={true}
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
            isMultiWorkflowTemplate={false}
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
  isMultiWorkflowTemplate,
  workflow,
  updateWorkflowDataField,
}: {
  normalizedWorkflowId: string;
  isMultiWorkflowTemplate: boolean;
  workflow: Partial<WorkflowTemplateData>;
  updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
}) => {
  const { resourceStrings } = useTemplatesStrings();
  const generalSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: resourceStrings.WORKFLOW_NAME,
        value: workflow.workflowName || '',
        type: 'textfield',
        required: true,
        onChange: (value: string) => {
          updateWorkflowDataField(normalizedWorkflowId, { workflowName: value });
        },
      },
      {
        label: resourceStrings.WORKFLOW_DISPLAY_NAME,
        value: workflow.manifest?.title || '',
        type: 'textfield',
        required: true,
        onChange: (value: string) => {
          updateWorkflowDataField(normalizedWorkflowId, {
            ...workflow,
            manifest: {
              ...workflow.manifest,
              title: value,
            } as Template.WorkflowManifest,
          });
        },
      },
      //TODO: add state type
    ];
  }, [normalizedWorkflowId, updateWorkflowDataField, workflow, resourceStrings]);

  const descriptionSectionItems: TemplatesSectionItem[] = useMemo(() => {
    const baseItems: TemplatesSectionItem[] = isMultiWorkflowTemplate
      ? [
          {
            label: resourceStrings.SUMMARY,
            value: workflow.manifest?.summary || '',
            type: 'textfield',
            onChange: (value: string) => {
              updateWorkflowDataField(normalizedWorkflowId, {
                ...workflow,
                manifest: {
                  ...workflow.manifest,
                  summary: value,
                } as Template.WorkflowManifest,
              });
            },
          },
        ]
      : [];
    baseItems.push({
      label: resourceStrings.DESCRIPTION,
      value: workflow.manifest?.description || '',
      type: 'textfield',
      onChange: (value: string) => {
        updateWorkflowDataField(normalizedWorkflowId, {
          ...workflow,
          manifest: {
            ...workflow.manifest,
            description: value,
          } as Template.WorkflowManifest,
        });
      },
    });
    baseItems.push({
      label: resourceStrings.PREREQUISITES,
      value: workflow.manifest?.prerequisites || '',
      type: 'textfield',
      onChange: (value: string) => {
        updateWorkflowDataField(normalizedWorkflowId, {
          ...workflow,
          manifest: {
            ...workflow.manifest,
            prerequisites: value,
          } as Template.WorkflowManifest,
        });
      },
    });
    return baseItems;
  }, [normalizedWorkflowId, updateWorkflowDataField, workflow, isMultiWorkflowTemplate, resourceStrings]);

  return (
    <div>
      <TemplatesSection
        title={isMultiWorkflowTemplate ? '' : resourceStrings.GENERAL}
        titleHtmlFor={'generalSectionLabel'}
        items={generalSectionItems}
      />
      <TemplatesSection title={resourceStrings.DESCRIPTION} titleHtmlFor={'descriptionSectionLabel'} items={descriptionSectionItems} />
    </div>
  );
};

export const customizeWorkflowsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    hasError,
    isSaving,
    isPrimaryButtonDisabled,
    disabled,
    selectedWorkflowsList,
    updateWorkflowDataField,
    onSaveChanges,
  }: ConfigureWorkflowsTabProps & {
    updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
    onSaveChanges: () => void;
  }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CUSTOMIZE_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Customize workflows',
    id: 'qnio+9',
    description: 'The tab label for the monitoring customize workflows tab on the configure template wizard',
  }),
  disabled: disabled,
  hasError: hasError,
  content: <CustomizeWorkflows selectedWorkflowsList={selectedWorkflowsList} updateWorkflowDataField={updateWorkflowDataField} />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Save changes',
      id: '3jqHdn',
      description: 'Button text for saving changes in the configure workflows panel',
    }),
    primaryButtonOnClick: () => {
      onSaveChanges();
      dispatch(closePanel());
    },
    primaryButtonDisabled: isPrimaryButtonDisabled,
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
