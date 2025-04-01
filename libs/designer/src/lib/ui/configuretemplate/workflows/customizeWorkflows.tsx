import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import type { WorkflowTemplateData } from '../../../core';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text } from '@fluentui/react-components';
import { getResourceNameFromId, type Template } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';

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
                  <Text style={{ fontWeight: 'bold' }}>{getResourceNameFromId(workflowId)}</Text>
                </AccordionHeader>
                <AccordionPanel>
                  <CustomizeWorkflowSection
                    workflowId={workflowId}
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
            workflowId={workflowEntries[0][0]}
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
  workflowId,
  isMultiWorkflowTemplate,
  workflow,
  updateWorkflowDataField,
}: {
  workflowId: string;
  isMultiWorkflowTemplate: boolean;
  workflow: Partial<WorkflowTemplateData>;
  updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
}) => {
  const customResourceStrings = useResourceStrings();
  const { resourceStrings } = useTemplatesStrings();

  const generalSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: customResourceStrings.WorkflowName,
        value: workflow.workflowName || '',
        type: 'textfield',
        required: true,
        onChange: (value: string) => {
          updateWorkflowDataField(workflowId, { workflowName: value });
        },
      },
      {
        label: customResourceStrings.WorkflowDisplayName,
        value: workflow.manifest?.title || '',
        type: 'textfield',
        required: true,
        onChange: (value: string) => {
          updateWorkflowDataField(workflowId, {
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
  }, [workflowId, updateWorkflowDataField, workflow, customResourceStrings]);

  const descriptionSectionItems: TemplatesSectionItem[] = useMemo(() => {
    const baseItems: TemplatesSectionItem[] = isMultiWorkflowTemplate
      ? [
          {
            label: customResourceStrings.Summary,
            value: workflow.manifest?.summary || '',
            type: 'textfield',
            onChange: (value: string) => {
              updateWorkflowDataField(workflowId, {
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
        updateWorkflowDataField(workflowId, {
          ...workflow,
          manifest: {
            ...workflow.manifest,
            description: value,
          } as Template.WorkflowManifest,
        });
      },
    });
    baseItems.push({
      label: customResourceStrings.Prerequisites,
      value: workflow.manifest?.prerequisites || '',
      type: 'textfield',
      onChange: (value: string) => {
        updateWorkflowDataField(workflowId, {
          ...workflow,
          manifest: {
            ...workflow.manifest,
            prerequisites: value,
          } as Template.WorkflowManifest,
        });
      },
    });
    return baseItems;
  }, [workflowId, updateWorkflowDataField, workflow, isMultiWorkflowTemplate, resourceStrings, customResourceStrings]);

  return (
    <div>
      <TemplatesSection
        title={isMultiWorkflowTemplate ? '' : customResourceStrings.General}
        titleHtmlFor={'generalSectionLabel'}
        items={generalSectionItems}
      />
      <TemplatesSection title={resourceStrings.DESCRIPTION} titleHtmlFor={'descriptionSectionLabel'} items={descriptionSectionItems} />
    </div>
  );
};
