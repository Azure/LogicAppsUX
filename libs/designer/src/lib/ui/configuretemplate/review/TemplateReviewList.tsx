import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Text } from '@fluentui/react-components';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/templates/store';
import { useMemo } from 'react';

const SectionDividerItem: TemplatesSectionItem = {
  type: 'divider',
  value: undefined,
};

export const TemplateReviewList = () => {
  const { workflows } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
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
      </Accordion>
    </div>
  );
};
