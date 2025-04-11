import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Divider, Text } from '@fluentui/react-components';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';

const SectionDividerItem: TemplatesSectionItem = {
  type: 'divider',
  value: undefined,
};

export const TemplateReviewList = () => {
  const intl = useIntl();
  const intlText = {
    TemplateDisplayName: intl.formatMessage({
      defaultMessage: 'Template display name',
      id: 'a7d1Dp',
      description: 'The aria label for the template display name',
    }),
    NoConnectionInTemplate: intl.formatMessage({
      defaultMessage: 'No connections in this template',
      id: 'oIRKrF',
      description: 'Text to show no connections present in the template.',
    }),
    NoParameterInTemplate: intl.formatMessage({
      defaultMessage: 'No parameters in this template',
      id: 'sMjDlb',
      description: 'Text to show no parameters present in the template.',
    }),
  };

  const resources = { ...useTemplatesStrings().resourceStrings, ...useResourceStrings(), ...intlText };
  const workflowsSectionItems = useWorkflowSectionItems(resources);
  const connectionsSectionItems: TemplatesSectionItem[] = useConnectionSectionItems(resources);
  const paramtersSectionItems: TemplatesSectionItem[] = useParameterSectionItems(resources);
  const profileSectionItems: TemplatesSectionItem[] = useProfileSectionItems(resources);
  const settingsSectionItems: TemplatesSectionItem[] = useSettingsSection(resources);

  return (
    <div>
      <Accordion multiple={true}>
        <AccordionItem value={'workflowId'} key={'workflowId'}>
          <AccordionHeader>
            <Text style={{ fontWeight: 'bold' }}>{resources.WorkflowsTabLabel}</Text>
          </AccordionHeader>
          <AccordionPanel>
            <TemplatesSection items={workflowsSectionItems} />
          </AccordionPanel>
        </AccordionItem>

        <Divider />

        <AccordionItem value={'connections'} key={'connections'}>
          <AccordionHeader>
            <Text style={{ fontWeight: 'bold' }}>{resources.ConnectionsTabLabel}</Text>
          </AccordionHeader>
          <AccordionPanel>
            {connectionsSectionItems?.length ? (
              <TemplatesSection items={connectionsSectionItems} />
            ) : (
              <Text>{resources.NoConnectionInTemplate}</Text>
            )}
          </AccordionPanel>
        </AccordionItem>

        <Divider />

        <AccordionItem value={'parameters'} key={'parameters'}>
          <AccordionHeader>
            <Text style={{ fontWeight: 'bold' }}>{resources.ParametersTabLabel}</Text>
          </AccordionHeader>
          <AccordionPanel>
            {paramtersSectionItems?.length ? (
              <TemplatesSection items={paramtersSectionItems} />
            ) : (
              <Text>{resources.NoParameterInTemplate}</Text>
            )}
          </AccordionPanel>
        </AccordionItem>

        <Divider />

        <AccordionItem value={'profile'} key={'profile'}>
          <AccordionHeader>
            <Text style={{ fontWeight: 'bold' }}>{resources.ProfileTabLabel}</Text>
          </AccordionHeader>
          <AccordionPanel>
            <TemplatesSection items={profileSectionItems} />
          </AccordionPanel>
        </AccordionItem>

        <Divider />

        <AccordionItem value={'settings'} key={'settings'}>
          <AccordionHeader>
            <Text style={{ fontWeight: 'bold' }}>{resources.SettingsTabLabel}</Text>
          </AccordionHeader>
          <AccordionPanel>
            <TemplatesSection items={settingsSectionItems} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

const useWorkflowSectionItems = (resources: Record<string, string>) => {
  const { workflows } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
  }));

  const workflowDatas = Object.values(workflows);
  return workflowDatas?.flatMap((workflow, index) => {
    const isLast = index === workflowDatas.length - 1;
    const thisWorkflowSectionItems: TemplatesSectionItem[] = [
      {
        label: resources.WORKFLOW_NAME,
        value: workflow.workflowName,
        type: 'text',
      },
      {
        label: resources.WorkflowDisplayName,
        value: workflow?.manifest?.title,
        type: 'text',
      },
      {
        label: resources.StateType,
        value: workflow?.manifest?.kinds?.join(', ') ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Summary,
        value: workflow?.manifest?.summary ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Description,
        value: workflow?.manifest?.description ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Prerequisites,
        value: workflow?.manifest?.prerequisites ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.LightModeImage,
        value: workflow?.manifest?.images?.light ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.DarkModeImage,
        value: workflow?.manifest?.images?.dark ?? resources.Placeholder,
        type: 'text',
      },
    ];

    if (!isLast) {
      thisWorkflowSectionItems.push(SectionDividerItem);
    }

    return thisWorkflowSectionItems;
  });
};

/// TODO: change this to use resources?
const useConnectionSectionItems = (_resources: Record<string, string>) => {
  const { connections } = useSelector((state: RootState) => ({
    connections: state.template.connections,
  }));

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
};

const useParameterSectionItems = (resources: Record<string, string>) => {
  const { parameterDefinitions } = useSelector((state: RootState) => ({
    parameterDefinitions: state.template.parameterDefinitions,
  }));

  const parameterValues = Object.values(parameterDefinitions);
  return parameterValues?.flatMap((parameter, index) => {
    const isLast = index === parameterValues.length - 1;
    const thisParameterSectionItems: TemplatesSectionItem[] = [
      {
        label: resources.ParameterName,
        value: parameter.name ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.ParameterDisplayName,
        value: parameter.displayName ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Type,
        value: parameter.type,
        type: 'text',
      },
      {
        label: resources.DefaultValue,
        value: parameter.default ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.AssociatedWorkflows,
        value:
          parameter.associatedWorkflows?.map((associatedWorkflow) => getResourceNameFromId(associatedWorkflow))?.join(', ') ??
          resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Description,
        value: parameter.description ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Required,
        value: parameter.required ? resources.RequiredOn : resources.RequiredOff,
        type: 'text',
      },
    ];

    if (!isLast) {
      thisParameterSectionItems.push(SectionDividerItem);
    }

    return thisParameterSectionItems;
  });
};

const useProfileSectionItems = (resources: Record<string, string>) => {
  const { templateManifest, workflows } = useSelector((state: RootState) => ({
    templateManifest: state.template.manifest,
    workflows: state.template.workflows,
  }));

  const items: TemplatesSectionItem[] = [
    {
      label: resources.TemplateDisplayName,
      value: templateManifest?.title ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.WorkflowType,
      value: Object.keys(workflows).length > 1 ? resources.ACCELERATOR : resources.WORKFLOW,
      type: 'text',
    },
    {
      label: resources.BY,
      value: templateManifest?.details?.By ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.Category,
      value: templateManifest?.details?.Category ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.FeaturedConnectors,
      value: templateManifest?.featuredConnectors?.join(', ') ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.Tags,
      value: templateManifest?.tags?.join(', ') ?? resources.Placeholder,
      type: 'text',
    },
  ];

  return items;
};

const useSettingsSection = (resources: Record<string, string>) => {
  const { manifest, environment, isPublished } = useSelector((state: RootState) => state.template);

  const items: TemplatesSectionItem[] = [
    {
      label: resources.Host,
      value: manifest?.skus?.join(', ') ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.Environment,
      value: environment ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.Status,
      value: isPublished ? resources.Published : resources.Unpublished,
      type: 'text',
    },
  ];

  return items;
};
