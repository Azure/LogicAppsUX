import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text } from '@fluentui/react-components';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/templates/store';
import { useMemo } from 'react';
// import { useIntl } from 'react-intl';

const SectionDividerItem: TemplatesSectionItem = {
  type: 'divider',
  value: undefined,
};

export const TemplateReviewList = () => {
  //   const intl = useIntl();
  //   const intlText = {
  //     TemplateDisplayName: intl.formatMessage({
  //       defaultMessage: 'Template display name',
  //       id: 'a7d1Dp',
  //       description: 'The aria label for the template display name',
  //     }),
  //   };

  const {
    workflows,
    connections,
    // parameterDefinitions, templateManifest
  } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
    connections: state.template.connections,
    parameterDefinitions: state.template.parameterDefinitions,
    templateManifest: state.template.manifest,
  }));

  const customResourceStrings = useResourceStrings();
  const { resourceStrings } = useTemplatesStrings();

  const workflowsSectionItems: TemplatesSectionItem[] = useMemo(() => {
    const workflowDatas = Object.values(workflows);
    return workflowDatas?.flatMap((workflow, index) => {
      const isLast = index === workflowDatas.length - 1;
      const thisWorkflowSectionItems: TemplatesSectionItem[] = [
        {
          label: resourceStrings.WORKFLOW_NAME,
          value: workflow.workflowName,
          type: 'text',
        },
        {
          label: customResourceStrings.WorkflowDisplayName,
          value: workflow?.manifest?.title,
          type: 'text',
        },
        {
          label: customResourceStrings.StateType,
          value: workflow?.manifest?.kinds?.join(', ') ?? customResourceStrings.Placeholder,
          type: 'text',
        },
        {
          label: customResourceStrings.Summary,
          value: workflow?.manifest?.summary ?? customResourceStrings.Placeholder,
          type: 'text',
        },
        {
          label: customResourceStrings.Description,
          value: workflow?.manifest?.description ?? customResourceStrings.Placeholder,
          type: 'text',
        },
        {
          label: customResourceStrings.Prerequisites,
          value: workflow?.manifest?.prerequisites ?? customResourceStrings.Placeholder,
          type: 'text',
        },
        {
          label: customResourceStrings.LightModeImage,
          value: workflow?.manifest?.images?.light ?? customResourceStrings.Placeholder,
          type: 'text',
        },
        {
          label: customResourceStrings.DarkModeImage,
          value: workflow?.manifest?.images?.dark ?? customResourceStrings.Placeholder,
          type: 'text',
        },
      ];

      if (!isLast) {
        thisWorkflowSectionItems.push(SectionDividerItem);
      }

      return thisWorkflowSectionItems;
    });
  }, [workflows, customResourceStrings, resourceStrings]);

  const connectionsSectionItems: TemplatesSectionItem[] = useMemo(() => {
    const connectionsValues = Object.values(connections);
    return connectionsValues?.flatMap((connection, index) => {
      const isLast = index === connectionsValues.length - 1;
      const thisParameterSectionItems: TemplatesSectionItem[] = [
        {
          label: 'ConnectorLabel',
          value: connection.connectorId,
          type: 'text',
        },
        {
          label: 'Kind',
          value: connection.kind,
          type: 'text',
        },
      ];

      if (!isLast) {
        thisParameterSectionItems.push(SectionDividerItem);
      }

      return thisParameterSectionItems;
    });
  }, [connections]);

  //   const paramtersSectionItems: TemplatesSectionItem[] = useMemo(() => {
  //     const parameterValues = Object.values(parameterDefinitions);
  //     return parameterValues?.flatMap((parameter, index) => {
  //       const isLast = index === parameterValues.length - 1;
  //       const thisParameterSectionItems: TemplatesSectionItem[] = [
  //         {
  //           label: customResourceStrings.ParameterName,
  //           value: parameter.name ?? customResourceStrings.Placeholder,
  //           type: 'text',
  //         },
  //         {
  //             label: customResourceStrings.ParameterDisplayName,
  //             value: parameter.displayName ?? customResourceStrings.Placeholder,
  //             type: 'text',
  //           },
  //           {
  //             label: customResourceStrings.Type,
  //             value: parameter.type,
  //             type: 'text',
  //           },
  //           {
  //             label: customResourceStrings.DefaultValue,
  //             value: parameter.default ?? customResourceStrings.Placeholder,
  //             type: 'text',
  //           },
  //           {
  //             label: customResourceStrings.AssociatedWorkflows,
  //             value: parameter.associatedWorkflows?.join(', ') ?? customResourceStrings.Placeholder,
  //             type: 'text',
  //           },
  //           {
  //             label: customResourceStrings.Description,
  //             value: parameter.description ?? customResourceStrings.Placeholder,
  //             type: 'text',
  //           },
  //           {
  //             label: customResourceStrings.Required,
  //             value: parameter.required ? customResourceStrings.RequiredOn : customResourceStrings.RequiredOff,
  //             type: 'text',
  //           },
  //       ];

  //       if (!isLast) {
  //         thisParameterSectionItems.push(SectionDividerItem);
  //       }

  //       return thisParameterSectionItems;
  //     });
  //   }, [parameterDefinitions, customResourceStrings]);

  //   const profileSectionItems: TemplatesSectionItem[] = useMemo(() => {
  //     const parameterValues = Object.values(parameterDefinitions);
  //     return parameterValues?.flatMap((parameter, index) => {
  //       const isLast = index === parameterValues.length - 1;
  //       const thisParameterSectionItems: TemplatesSectionItem[] = [
  //         {
  //           label: intlText.TemplateDisplayName,
  //           value: templateManifest?.title ?? customResourceStrings.Placeholder,
  //           type: 'text',
  //         },
  //         {
  //             label: customResourceStrings.WorkflowType,
  //             value: Object.keys(workflows).length > 1 ? 'Accelerator' : 'Workflow',  //TODO: intl this
  //             type: 'text',
  //           },
  //           {
  //             label: customResourceStrings.Host,
  //             value: 'TODO',
  //             type: 'text',
  //           },
  //         //   {
  //         //     label: resourceStrings.BY,
  //         //     value: parameter.default ?? customResourceStrings.Placeholder,
  //         //     type: 'text',
  //         //   },
  //         //   {
  //         //     label: customResourceStrings.AssociatedWorkflows,
  //         //     value: parameter.associatedWorkflows?.join(', ') ?? customResourceStrings.Placeholder,
  //         //     type: 'text',
  //         //   },
  //         //   {
  //         //     label: customResourceStrings.Description,
  //         //     value: parameter.description ?? customResourceStrings.Placeholder,
  //         //     type: 'text',
  //         //   },
  //         //   {
  //         //     label: customResourceStrings.Required,
  //         //     value: parameter.required ? customResourceStrings.RequiredOn : customResourceStrings.RequiredOff,
  //         //     type: 'text',
  //         //   },
  //       ];

  //       if (!isLast) {
  //         thisParameterSectionItems.push(SectionDividerItem);
  //       }

  //       return thisParameterSectionItems;
  //     });
  //   }, [parameterDefinitions, customResourceStrings]);

  return (
    <div>
      <Accordion multiple={true}>
        <AccordionItem value={'workflowId'} key={'workflowId'}>
          <AccordionHeader>
            <Text style={{ fontWeight: 'bold' }}>{resourceStrings.WORKFLOW_NAME}</Text>
          </AccordionHeader>
          <AccordionPanel>
            <TemplatesSection items={workflowsSectionItems} />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem value={'connection'} key={'connection'}>
          <AccordionHeader>
            <Text style={{ fontWeight: 'bold' }}>{resourceStrings.WORKFLOW_NAME}</Text>
          </AccordionHeader>
          <AccordionPanel>
            <TemplatesSection items={connectionsSectionItems} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
