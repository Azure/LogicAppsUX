import type { RootState } from '../../../core/state/templates/store';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import type { WorkflowTemplateData } from '../../../core';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text, tokens } from '@fluentui/react-components';
import { ErrorCircle16Filled } from '@fluentui/react-icons';
import type { Template } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';
import { useIntl } from 'react-intl';
import { DescriptionWithLink, ErrorBar } from '../common';
import { useSelector } from 'react-redux';
import { workflowsHaveErrors } from '../../../core/configuretemplate/utils/errors';

export const CustomizeWorkflows = ({
  selectedWorkflowsList,
  updateWorkflowDataField,
  duplicateIds,
}: {
  selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
  updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
  duplicateIds: string[];
}) => {
  const intl = useIntl();
  const workflowEntries = Object.entries(selectedWorkflowsList);

  const resources = {
    DuplicateIdsErrorTitle: intl.formatMessage({
      defaultMessage: 'Workflow names must be unique. Duplicate workflow ids: ',
      id: 'v95bFR',
      description: 'Error message title for duplicate workflow ids',
    }),
  };

  const { workflows, apiErrors, saveError } = useSelector((state: RootState) => ({
    workflows: state.template.workflows ?? {},
    apiErrors: state.template.apiValidatationErrors?.workflows ?? {},
    saveError: state.template.apiValidatationErrors?.saveGeneral?.workflows,
  }));
  const hasErrors = useMemo(() => workflowsHaveErrors(apiErrors, workflows), [apiErrors, workflows]);

  return (
    <div className="msla-templates-tab msla-panel-no-description-tab">
      <DescriptionWithLink
        text={intl.formatMessage({
          defaultMessage: `Enter your workflow details. Your changes apply only to this template and won't affect the original workflow. Save your work anytime and pick up where you left off without having to publish. To publish your template, all fields must be completed.`,
          id: 'v3K85M',
          description: 'The description for customizing workflows tab',
        })}
      />
      {duplicateIds.length ? <ErrorBar title={resources.DuplicateIdsErrorTitle} errorMessage={duplicateIds.join(', ')} /> : null}
      {saveError ? <ErrorBar errorMessage={saveError} /> : null}

      {workflowEntries.length ? (
        workflowEntries.length > 1 ? (
          <Accordion multiple={true} defaultOpenItems={Object.keys(selectedWorkflowsList)}>
            {Object.entries(selectedWorkflowsList).map(([workflowId, workflowData]) => (
              <AccordionItem value={workflowId} key={workflowId}>
                <AccordionHeader>
                  <Text style={{ fontWeight: 'bold' }}>{workflowData.id}</Text>
                  {hasErrors ? <ErrorCircle16Filled style={{ paddingLeft: 6, color: tokens.colorPaletteRedForeground1 }} /> : null}
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
  const intl = useIntl();
  const customResourceStrings = useResourceStrings();
  const { resourceStrings, stateTypes } = useTemplatesStrings();
  const { errors, apiErrors } = useSelector((state: RootState) => ({
    errors: state.template.workflows?.[workflowId]?.errors,
    apiErrors: state.template.apiValidatationErrors?.workflows?.[workflowId],
  }));
  const hasErrors = useMemo(() => apiErrors?.general || errors?.general, [apiErrors?.general, errors?.general]);
  const ValidationErrorTitle = intl.formatMessage({
    defaultMessage: 'Validation failed : ',
    id: 'U6V60S',
    description: 'Error message title for workflow validation errors',
  });

  const defaultKindOptions = useMemo(
    () => [
      { id: WorkflowKind.STATEFUL, value: WorkflowKind.STATEFUL, label: stateTypes.STATEFUL },
      { id: WorkflowKind.STATELESS, value: WorkflowKind.STATELESS, label: stateTypes.STATELESS },
    ],
    [stateTypes]
  );

  const selectedKinds = workflow.manifest?.kinds || [];

  const kindValue = defaultKindOptions
    .filter((kind) => selectedKinds.includes(kind.value))
    .map((kind) => kind.label)
    .join(', ');

  const generalSectionItems: TemplatesSectionItem[] = useMemo(() => {
    const baseItems: TemplatesSectionItem[] = [
      {
        label: resourceStrings.WORKFLOW_NAME,
        value: workflow.id || '',
        hint: resourceStrings.WORKFLOW_NAME_DESCRIPTION,
        type: workflow.isManageWorkflow ? 'text' : 'textfield',
        required: true,
        onChange: (value: string) => {
          updateWorkflowDataField(workflowId, { id: value });
        },
        errorMessage: workflow.errors?.workflow,
      },
    ];
    if (isMultiWorkflowTemplate) {
      baseItems.push({
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
        errorMessage: apiErrors?.manifest?.title ?? workflow.errors?.manifest?.title,
      });
    }
    baseItems.push({
      label: customResourceStrings.State,
      value: kindValue,
      type: 'dropdown',
      multiselect: true,
      options: defaultKindOptions,
      selectedOptions: workflow.manifest?.kinds || [],
      errorMessage: apiErrors?.manifest?.allowedKinds ?? workflow.errors?.kind,
      onOptionSelect: (selectedOptions) => {
        updateWorkflowDataField(workflowId, {
          ...workflow,
          manifest: {
            ...workflow.manifest,
            kinds: selectedOptions,
          } as Template.WorkflowManifest,
        });
      },
    });
    baseItems.push({
      label: customResourceStrings.Trigger,
      value: workflow.triggerType,
      type: 'text',
    });
    return baseItems;
  }, [
    resourceStrings.WORKFLOW_NAME,
    resourceStrings.WORKFLOW_NAME_DESCRIPTION,
    workflow,
    isMultiWorkflowTemplate,
    customResourceStrings.State,
    customResourceStrings.Trigger,
    customResourceStrings.WorkflowDisplayName,
    kindValue,
    defaultKindOptions,
    apiErrors?.manifest?.allowedKinds,
    apiErrors?.manifest?.title,
    updateWorkflowDataField,
    workflowId,
  ]);

  const descriptionSectionItems: TemplatesSectionItem[] = useMemo(() => {
    const baseItems: TemplatesSectionItem[] = isMultiWorkflowTemplate
      ? [
          {
            label: customResourceStrings.Summary,
            value: workflow.manifest?.summary || '',
            type: 'textarea',
            onChange: (value: string) => {
              updateWorkflowDataField(workflowId, {
                ...workflow,
                manifest: {
                  ...workflow.manifest,
                  summary: value,
                } as Template.WorkflowManifest,
              });
            },
            errorMessage: apiErrors?.manifest?.summary ?? workflow.errors?.manifest?.summary,
          },
        ]
      : [];
    baseItems.push({
      label: resourceStrings.DESCRIPTION,
      value: workflow.manifest?.description || '',
      type: 'textarea',
      errorMessage: apiErrors?.manifest?.details ?? workflow.errors?.manifest?.description,
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
      type: 'textarea',
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
  }, [
    isMultiWorkflowTemplate,
    customResourceStrings.Summary,
    customResourceStrings.Prerequisites,
    workflow,
    apiErrors?.manifest?.summary,
    apiErrors?.manifest?.details,
    resourceStrings.DESCRIPTION,
    updateWorkflowDataField,
    workflowId,
  ]);

  const imageSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: customResourceStrings.LightModeImage,
        value: workflow.manifest?.images?.light || '',
        type: 'textfield',
        description: customResourceStrings.LightModeImageDescription,
        onChange: (value: string) => {
          updateWorkflowDataField(workflowId, {
            ...workflow,
            manifest: {
              ...workflow.manifest,
              images: {
                ...workflow.manifest?.images,
                light: value,
              },
            } as Template.WorkflowManifest,
          });
        },
        errorMessage: apiErrors?.manifest?.['images.light'] ?? workflow.errors?.manifest?.['images.light'],
      },
      {
        label: customResourceStrings.DarkModeImage,
        value: workflow.manifest?.images?.dark || '',
        type: 'textfield',
        description: customResourceStrings.DarkModeImageDescription,
        onChange: (value: string) => {
          updateWorkflowDataField(workflowId, {
            ...workflow,
            manifest: {
              ...workflow.manifest,
              images: {
                ...workflow.manifest?.images,
                dark: value,
              },
            } as Template.WorkflowManifest,
          });
        },
        errorMessage: apiErrors?.manifest?.['images.dark'] ?? workflow.errors?.manifest?.['images.dark'],
      },
    ];
  }, [
    customResourceStrings.LightModeImage,
    customResourceStrings.LightModeImageDescription,
    customResourceStrings.DarkModeImage,
    customResourceStrings.DarkModeImageDescription,
    workflow,
    apiErrors?.manifest,
    updateWorkflowDataField,
    workflowId,
  ]);

  return (
    <div>
      {hasErrors ? <ErrorBar title={ValidationErrorTitle} errorMessage={apiErrors?.general ?? errors?.general ?? ''} /> : null}
      <TemplatesSection
        title={isMultiWorkflowTemplate ? '' : customResourceStrings.General}
        titleHtmlFor={'generalSectionLabel'}
        items={generalSectionItems}
      />
      <TemplatesSection title={resourceStrings.DESCRIPTION} titleHtmlFor={'descriptionSectionLabel'} items={descriptionSectionItems} />
      <TemplatesSection
        title={customResourceStrings.WorkflowImages}
        description={customResourceStrings.WorkflowImagesDescription}
        titleHtmlFor={'imagesSectionLabel'}
        items={imageSectionItems}
      />
    </div>
  );
};
